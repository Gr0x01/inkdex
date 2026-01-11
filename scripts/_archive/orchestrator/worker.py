#!/usr/bin/env python3
"""
Scraper Worker - Distributed Instagram Artist Miner

Adapted from international_miner.py for distributed operation:
- Uses Supabase for state instead of SQLite
- Reports health to orchestrator via HTTP
- Reports rate limit events to Supabase
- Graceful shutdown on SIGTERM

Usage:
  python worker.py                    # Run with WORKER_NAME from env
  python worker.py --name worker-01   # Explicit name

Environment Variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key
  TAVILY_API_KEY        - Tavily API key
  WORKER_NAME           - Worker name (required)
"""

import argparse
import hashlib
import io
import logging
import os
import random
import re
import signal
import sys
import time
from datetime import datetime
from typing import Optional

import requests

# Dependencies
try:
    import instaloader
except ImportError:
    print("ERROR: instaloader not installed. Run: pip install instaloader")
    sys.exit(1)

try:
    from supabase import Client
except ImportError:
    print("ERROR: supabase not installed. Run: pip install supabase")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# Local imports
from config import (
    DELAY_BETWEEN_ARTISTS,
    DELAY_BETWEEN_CITIES,
    IMAGES_PER_ARTIST,
    HEALTH_SERVER_PORT,
    QUERY_TEMPLATES,
    STYLES,
    TAVILY_DELAY_BETWEEN_QUERIES,
    TAVILY_MAX_RESULTS,
    ENV_TAVILY_API_KEY,
    ENV_WORKER_NAME,
)
from db import (
    get_supabase_client,
    register_worker,
    worker_heartbeat,
    update_worker_status,
    claim_next_city,
    complete_city,
    release_city,
    add_artists_to_queue,
    claim_next_artist,
    complete_artist,
    report_rate_limit,
    reset_rate_limit_counter,
)
from health_server import start_health_server

# =============================================================================
# Logging
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Instagram handle validation
# Valid handles: 1-30 chars, alphanumeric + underscores + periods, no consecutive periods
INSTAGRAM_HANDLE_PATTERN = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$|^[a-zA-Z0-9]$')
INSTAGRAM_RESERVED_HANDLES = frozenset([
    'explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts',
    'about', 'api', 'blog', 'developer', 'help', 'legal', 'privacy',
    'terms', 'press', 'instagram', 'direct', 'web', 'nametag',
])


def is_valid_instagram_handle(handle: str) -> bool:
    """
    Validate an Instagram handle.

    Rules:
    - 1-30 characters
    - Alphanumeric, underscores, and periods only
    - Cannot start or end with period
    - No consecutive periods
    - Not a reserved Instagram path
    """
    if not handle or len(handle) > 30:
        return False

    handle_lower = handle.lower()

    # Check reserved names
    if handle_lower in INSTAGRAM_RESERVED_HANDLES:
        return False

    # Check pattern
    if not INSTAGRAM_HANDLE_PATTERN.match(handle):
        return False

    # No consecutive periods
    if '..' in handle:
        return False

    return True


# =============================================================================
# Scraper Worker Class
# =============================================================================

class ScraperWorker:
    """Distributed scraper worker."""

    def __init__(self, worker_name: str, tavily_key: str):
        self.worker_name = worker_name
        self.tavily_key = tavily_key

        # State
        self.worker_id: Optional[str] = None
        self.supabase: Optional[Client] = None
        self.loader: Optional[instaloader.Instaloader] = None

        # Current work
        self.current_city: Optional[str] = None
        self.current_artist: Optional[str] = None

        # Metrics
        self.artists_processed = 0
        self.images_processed = 0
        self.consecutive_401s = 0

        # Control
        self.shutdown_requested = False
        self.start_time: Optional[float] = None

    def run(self):
        """Main worker loop."""
        logger.info(f"Starting worker: {self.worker_name}")
        self.start_time = time.time()

        # Initialize
        self.supabase = get_supabase_client()
        self.loader = self._create_instaloader()

        # Get our external IP for registration
        ip_address = self._get_external_ip()

        # Register with orchestrator
        self.worker_id = register_worker(
            self.supabase,
            self.worker_name,
            ip_address=ip_address,
        )
        logger.info(f"Registered as worker_id: {self.worker_id}")

        # Start health server
        start_health_server(self, port=HEALTH_SERVER_PORT)

        # Start heartbeat thread
        self._start_heartbeat_thread()

        # Main loop
        try:
            while not self.shutdown_requested:
                self._process_next_city()
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt, shutting down...")
        finally:
            self._cleanup()

    def _process_next_city(self):
        """Claim and process the next available city."""
        # Claim a city
        city = claim_next_city(self.supabase, self.worker_id)

        if not city:
            logger.info("No cities available, waiting...")
            time.sleep(60)  # Wait 1 minute before checking again
            return

        self.current_city = city.city_slug
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing {city.city_name}, {city.country_code}")
        logger.info(f"{'='*60}")

        try:
            # Discover artists via Tavily
            handles = self._discover_artists(city)

            if handles:
                # Add to queue
                added = add_artists_to_queue(self.supabase, city.city_slug, handles)
                logger.info(f"Added {added} artists to queue")

            # Process artists in queue for this city
            artists_processed = 0
            while not self.shutdown_requested:
                artist = claim_next_artist(self.supabase, self.worker_id, city.city_slug)

                if not artist:
                    break  # No more artists in this city

                self.current_artist = artist.instagram_handle
                logger.info(f"\n[{artists_processed + 1}] Processing @{artist.instagram_handle}...")

                self._process_artist(artist, city)
                artists_processed += 1

                # Delay between artists
                if not self.shutdown_requested:
                    delay = random.uniform(
                        DELAY_BETWEEN_ARTISTS * 0.8,
                        DELAY_BETWEEN_ARTISTS * 1.2,
                    )
                    logger.info(f"Waiting {delay:.0f}s before next artist...")
                    time.sleep(delay)

            # Mark city as completed
            if not self.shutdown_requested:
                complete_city(self.supabase, city.city_slug, len(handles) if handles else 0)
                logger.info(f"\nCity complete: {artists_processed} artists processed")

                # Delay between cities
                logger.info(f"Waiting {DELAY_BETWEEN_CITIES/60:.0f}m before next city...")
                time.sleep(DELAY_BETWEEN_CITIES)

        except Exception as e:
            logger.error(f"Error processing city {city.city_name}: {e}")
            # Release city back to queue on error
            release_city(self.supabase, city.city_slug)

        finally:
            self.current_city = None
            self.current_artist = None

    def _discover_artists(self, city) -> list[str]:
        """Run Tavily queries to discover artists in a city."""
        logger.info(f"Discovering artists in {city.city_name}...")

        all_handles = set()
        queries_run = 0

        # Generate queries
        queries = []
        for template in QUERY_TEMPLATES:
            if "{style}" in template:
                for style in STYLES:
                    queries.append(template.format(style=style, city=city.city_name))
            else:
                queries.append(template.format(city=city.city_name))

        # Run queries
        for query in queries:
            if self.shutdown_requested:
                break

            results = self._search_tavily(query)
            handles = self._extract_instagram_handles(results)
            all_handles.update(handles)

            queries_run += 1
            if queries_run % 10 == 0:
                logger.info(f"  {queries_run} queries, {len(all_handles)} unique handles found")

            time.sleep(TAVILY_DELAY_BETWEEN_QUERIES)

        logger.info(f"  Discovery complete: {len(all_handles)} artists from {queries_run} queries")
        return list(all_handles)

    def _search_tavily(self, query: str) -> list[dict]:
        """Search Tavily and return results."""
        try:
            response = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": self.tavily_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": TAVILY_MAX_RESULTS,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except Exception as e:
            logger.warning(f"Tavily search failed: {e}")
            return []

    def _extract_instagram_handles(self, results: list[dict]) -> set[str]:
        """Extract and validate Instagram handles from Tavily results."""
        handles = set()

        for result in results:
            url = result.get("url", "")
            content = result.get("content", "")

            # From URL
            match = re.search(r'instagram\.com/([a-zA-Z0-9._]+)', url)
            if match:
                handle = match.group(1).lower()
                if is_valid_instagram_handle(handle):
                    handles.add(handle)

            # From content (@ mentions)
            for match in re.finditer(r'@([a-zA-Z0-9._]{1,30})', content):
                handle = match.group(1).lower()
                if is_valid_instagram_handle(handle):
                    handles.add(handle)

            # From content (instagram.com links)
            for match in re.finditer(r'instagram\.com/([a-zA-Z0-9._]+)', content):
                handle = match.group(1).lower()
                if is_valid_instagram_handle(handle):
                    handles.add(handle)

        return handles

    def _process_artist(self, artist, city):
        """Process a single artist."""
        try:
            # Scrape images
            scrape_result = self._scrape_artist_images(artist.instagram_handle)
            images = scrape_result["images"]
            follower_count = scrape_result["follower_count"]

            if not images:
                complete_artist(
                    self.supabase,
                    artist.id,
                    "skipped",
                    error_message="No images found",
                )
                return

            # Create artist in main DB if not exists
            artist_id = self._ensure_artist_exists(
                artist.instagram_handle,
                city,
                follower_count,
            )

            if not artist_id:
                complete_artist(
                    self.supabase,
                    artist.id,
                    "failed",
                    error_message="Failed to create artist record",
                )
                return

            # Upload images
            uploaded_count = 0
            for img in images:
                if self._upload_image(artist_id, artist.instagram_handle, img):
                    uploaded_count += 1

            # Update metrics
            self.artists_processed += 1
            self.images_processed += uploaded_count

            # Mark complete
            complete_artist(
                self.supabase,
                artist.id,
                "completed",
                images_scraped=uploaded_count,
                follower_count=follower_count,
                artist_id=artist_id,
            )

            # Reset rate limit counter on success
            reset_rate_limit_counter(self.supabase, self.worker_id)

            logger.info(f"  @{artist.instagram_handle}: uploaded {uploaded_count}/{len(images)} images")

        except Exception as e:
            error_str = str(e).lower()

            # Check for rate limit
            if "401" in error_str or "429" in error_str or "too many" in error_str:
                self._handle_rate_limit(error_str, artist.instagram_handle)

                complete_artist(
                    self.supabase,
                    artist.id,
                    "failed",
                    error_message=f"Rate limited: {e}",
                )
            else:
                complete_artist(
                    self.supabase,
                    artist.id,
                    "failed",
                    error_message=str(e)[:500],
                )
                logger.error(f"Error processing @{artist.instagram_handle}: {e}")

    def _scrape_artist_images(self, handle: str) -> dict:
        """Scrape recent images from an artist's public profile."""
        result = {"images": [], "follower_count": 0}

        try:
            profile = instaloader.Profile.from_username(self.loader.context, handle)

            if profile.is_private:
                logger.info(f"  @{handle} is private, skipping")
                return result

            result["follower_count"] = profile.followers or 0

            for i, post in enumerate(profile.get_posts()):
                if i >= IMAGES_PER_ARTIST:
                    break

                if post.is_video:
                    continue

                result["images"].append({
                    "url": post.url,
                    "shortcode": post.shortcode,
                    "timestamp": post.date_utc.isoformat() if post.date_utc else None,
                })

                time.sleep(1)

            logger.info(f"  @{handle}: found {len(result['images'])} images, {result['follower_count']:,} followers")

        except instaloader.exceptions.ProfileNotExistsException:
            logger.info(f"  @{handle} doesn't exist")
        except instaloader.exceptions.PrivateProfileNotFollowedException:
            logger.info(f"  @{handle} is private")
        except instaloader.exceptions.TooManyRequestsException as e:
            raise Exception(f"TooManyRequests: {e}")
        except Exception as e:
            error_str = str(e).lower()
            if "401" in error_str or "429" in error_str:
                raise  # Re-raise to trigger rate limit handling
            logger.warning(f"  Error scraping @{handle}: {e}")

        return result

    def _handle_rate_limit(self, error_message: str, artist_handle: str):
        """Handle rate limit by reporting to Supabase."""
        error_code = "401" if "401" in error_message else "429"

        self.consecutive_401s = report_rate_limit(
            self.supabase,
            self.worker_id,
            error_code,
            error_message[:500],
            artist_handle,
        )

        logger.warning(f"Rate limited! consecutive_401s={self.consecutive_401s}")

        # Wait before continuing (orchestrator may rotate us)
        wait_time = 300  # 5 minutes
        logger.info(f"Waiting {wait_time/60:.0f} minutes...")
        time.sleep(wait_time)

    def _ensure_artist_exists(self, handle: str, city, follower_count: int) -> Optional[str]:
        """Ensure artist exists in main DB, create if not."""
        # Check if exists
        try:
            result = self.supabase.table("artists").select("id").eq(
                "instagram_handle", handle.lower()
            ).single().execute()
            if result.data:
                return result.data.get("id")
        except:
            pass

        # Create artist
        try:
            slug = re.sub(r'[^a-z0-9]+', '-', handle.lower()).strip('-')

            result = self.supabase.table("artists").insert({
                "name": handle,
                "slug": slug,
                "instagram_handle": handle.lower(),
                "instagram_url": f"https://instagram.com/{handle}",
                "follower_count": follower_count if follower_count > 0 else None,
                "discovery_source": f"orchestrator_{city.city_slug}",
                "verification_status": "unclaimed",
            }).execute()

            artist_id = result.data[0]["id"] if result.data else None

            # Create location
            if artist_id:
                try:
                    self.supabase.table("artist_locations").insert({
                        "artist_id": artist_id,
                        "city": city.city_name,
                        "region": city.region,
                        "country_code": city.country_code,
                        "location_type": "city",
                        "is_primary": True,
                        "display_order": 0,
                    }).execute()
                except:
                    pass  # Location trigger issues, continue

            return artist_id

        except Exception as e:
            if "duplicate" in str(e).lower() or "23505" in str(e):
                # Race condition - another worker created it
                try:
                    result = self.supabase.table("artists").select("id").eq(
                        "instagram_handle", handle.lower()
                    ).single().execute()
                    return result.data.get("id") if result.data else None
                except:
                    return None
            logger.warning(f"Failed to create artist @{handle}: {e}")
            return None

    def _upload_image(self, artist_id: str, handle: str, img: dict) -> bool:
        """Download, resize, and upload image."""
        shortcode = img["shortcode"]

        # Check if already exists
        try:
            existing = self.supabase.table("portfolio_images").select("id").eq(
                "instagram_post_id", shortcode
            ).execute()
            if existing.data:
                return False  # Already have this image
        except:
            pass

        # Download and resize
        try:
            response = requests.get(img["url"], timeout=30)
            response.raise_for_status()

            pil_img = Image.open(io.BytesIO(response.content))
            if pil_img.mode in ('RGBA', 'P'):
                pil_img = pil_img.convert('RGB')

            pil_img.thumbnail((640, 640), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            pil_img.save(output, format='WebP', quality=85)
            image_data = output.getvalue()

        except Exception as e:
            logger.warning(f"Failed to process image: {e}")
            return False

        # Upload to storage
        try:
            img_hash = hashlib.md5(img["url"].encode()).hexdigest()[:8]
            storage_path = f"{handle}/{shortcode}_{img_hash}.webp"

            self.supabase.storage.from_("portfolio-images").upload(
                storage_path,
                image_data,
                {"content-type": "image/webp", "upsert": "true"}
            )

            storage_url = self.supabase.storage.from_("portfolio-images").get_public_url(storage_path)

        except Exception as e:
            logger.warning(f"Failed to upload to storage: {e}")
            return False

        # Create DB record
        try:
            self.supabase.table("portfolio_images").insert({
                "artist_id": artist_id,
                "instagram_post_id": shortcode,
                "instagram_url": f"https://instagram.com/p/{shortcode}/",
                "storage_thumb_640": storage_url,
                "import_source": "scrape",
                "status": "active",
            }).execute()
            return True
        except Exception as e:
            if "duplicate" not in str(e).lower():
                logger.warning(f"Failed to create image record: {e}")
            return False

    def _create_instaloader(self) -> instaloader.Instaloader:
        """Create instaloader instance."""
        return instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
        )

    def _get_external_ip(self) -> Optional[str]:
        """Get external IP address."""
        try:
            response = requests.get("https://api.ipify.org", timeout=5)
            return response.text.strip()
        except:
            return None

    def _start_heartbeat_thread(self):
        """Start background thread for heartbeats."""
        import threading

        def heartbeat_loop():
            while not self.shutdown_requested:
                try:
                    worker_heartbeat(
                        self.supabase,
                        self.worker_id,
                        current_city_slug=self.current_city,
                        current_artist_handle=self.current_artist,
                        artists_processed=self.artists_processed,
                        images_processed=self.images_processed,
                    )
                except Exception as e:
                    logger.warning(f"Heartbeat failed: {e}")

                time.sleep(30)

        thread = threading.Thread(target=heartbeat_loop, name="Heartbeat", daemon=True)
        thread.start()
        logger.info("Heartbeat thread started")

    def _cleanup(self):
        """Clean up on shutdown."""
        logger.info("Cleaning up...")

        try:
            # Release current city if any
            if self.current_city:
                release_city(self.supabase, self.current_city)
                logger.info(f"Released city: {self.current_city}")

            # Update status
            update_worker_status(self.supabase, self.worker_id, "offline")
            logger.info("Marked as offline")

        except Exception as e:
            logger.error(f"Cleanup error: {e}")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Scraper worker")
    parser.add_argument("--name", help="Worker name (overrides WORKER_NAME env)")
    args = parser.parse_args()

    # Get worker name
    worker_name = args.name or os.environ.get(ENV_WORKER_NAME)
    if not worker_name:
        logger.error(f"Missing worker name. Set {ENV_WORKER_NAME} or use --name")
        sys.exit(1)

    # Get Tavily key
    tavily_key = os.environ.get(ENV_TAVILY_API_KEY)
    if not tavily_key:
        logger.error(f"Missing {ENV_TAVILY_API_KEY}")
        sys.exit(1)

    # Handle signals
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal...")
        worker.shutdown_requested = True

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run worker
    worker = ScraperWorker(worker_name, tavily_key)
    worker.run()


if __name__ == "__main__":
    main()
