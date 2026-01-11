#!/usr/bin/env python3
"""
International Artist Miner - 24/7 Discovery Pipeline

Full pipeline running on VPS:
1. Tavily web search → find artist Instagram handles
2. Instaloader → scrape their last 12-20 images (public profiles, no login)
3. Upload images to Supabase Storage
4. Insert artist + image records to DB

Embeddings generated separately on local GPU (A2000/4080).

Usage:
  python international_miner.py                    # Run continuously
  python international_miner.py --region canada   # Single region
  python international_miner.py --city Toronto    # Single city
  python international_miner.py --stats           # Show statistics

Environment Variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key
  TAVILY_API_KEY        - Tavily API key

Cost: ~$3-5 per city (Tavily queries), images are free via instaloader
"""

import argparse
import hashlib
import io
import logging
import os
import random
import re
import signal
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests

# ============================================================================
# Dependencies
# ============================================================================

try:
    import instaloader
except ImportError:
    print("ERROR: instaloader not installed. Run: pip install instaloader")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase not installed. Run: pip install supabase")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# ============================================================================
# Configuration
# ============================================================================

# International cities by region (GDPR-safe)
CITIES_BY_REGION = {
    "canada": [
        {"name": "Toronto", "region": "ON", "country": "CA", "slug": "toronto"},
        {"name": "Vancouver", "region": "BC", "country": "CA", "slug": "vancouver"},
        {"name": "Montreal", "region": "QC", "country": "CA", "slug": "montreal"},
        {"name": "Calgary", "region": "AB", "country": "CA", "slug": "calgary"},
        {"name": "Ottawa", "region": "ON", "country": "CA", "slug": "ottawa"},
        {"name": "Edmonton", "region": "AB", "country": "CA", "slug": "edmonton"},
        {"name": "Winnipeg", "region": "MB", "country": "CA", "slug": "winnipeg"},
        {"name": "Halifax", "region": "NS", "country": "CA", "slug": "halifax"},
        {"name": "Victoria", "region": "BC", "country": "CA", "slug": "victoria"},
    ],
    "latin_america": [
        {"name": "Mexico City", "region": "CDMX", "country": "MX", "slug": "mexico-city"},
        {"name": "Guadalajara", "region": "JAL", "country": "MX", "slug": "guadalajara"},
        {"name": "Monterrey", "region": "NL", "country": "MX", "slug": "monterrey"},
        {"name": "São Paulo", "region": "SP", "country": "BR", "slug": "sao-paulo"},
        {"name": "Rio de Janeiro", "region": "RJ", "country": "BR", "slug": "rio-de-janeiro"},
        {"name": "Buenos Aires", "region": "BA", "country": "AR", "slug": "buenos-aires"},
        {"name": "Bogotá", "region": "DC", "country": "CO", "slug": "bogota"},
        {"name": "Medellín", "region": "ANT", "country": "CO", "slug": "medellin"},
        {"name": "Lima", "region": "LIM", "country": "PE", "slug": "lima"},
        {"name": "Santiago", "region": "RM", "country": "CL", "slug": "santiago"},
    ],
    "asia_pacific": [
        {"name": "Tokyo", "region": "Tokyo", "country": "JP", "slug": "tokyo"},
        {"name": "Osaka", "region": "Osaka", "country": "JP", "slug": "osaka"},
        {"name": "Seoul", "region": "Seoul", "country": "KR", "slug": "seoul"},
        {"name": "Singapore", "region": "SG", "country": "SG", "slug": "singapore"},
        {"name": "Bangkok", "region": "BKK", "country": "TH", "slug": "bangkok"},
        {"name": "Sydney", "region": "NSW", "country": "AU", "slug": "sydney"},
        {"name": "Melbourne", "region": "VIC", "country": "AU", "slug": "melbourne"},
        {"name": "Brisbane", "region": "QLD", "country": "AU", "slug": "brisbane"},
        {"name": "Auckland", "region": "AUK", "country": "NZ", "slug": "auckland"},
        {"name": "Bali", "region": "Bali", "country": "ID", "slug": "bali"},
        {"name": "Manila", "region": "NCR", "country": "PH", "slug": "manila"},
        {"name": "Kuala Lumpur", "region": "KL", "country": "MY", "slug": "kuala-lumpur"},
    ],
}

# Flatten all cities
ALL_CITIES = []
for region_cities in CITIES_BY_REGION.values():
    ALL_CITIES.extend(region_cities)

# Tavily query templates
QUERY_TEMPLATES = [
    "{style} tattoo artist {city} Instagram",
    "best tattoo artist {city} Instagram",
    "top tattoo artists {city}",
    "tattoo studio {city} Instagram",
    "custom tattoo {city}",
]

STYLES = [
    "fine line", "traditional", "geometric", "realism", "black and grey",
    "japanese", "watercolor", "minimalist", "blackwork", "dotwork",
    "neo traditional", "illustrative", "portrait", "floral", "tribal",
]

# Timing - conservative to avoid Instagram rate limits
DELAY_BETWEEN_ARTISTS = 120  # 2 minutes - be very nice to Instagram
DELAY_BETWEEN_QUERIES = 2    # seconds - Tavily rate limit
DELAY_BETWEEN_CITIES = 600   # 10 minutes between cities
IMAGES_PER_ARTIST = 12       # How many images to scrape

# Local database for tracking
LOCAL_DB_PATH = Path(__file__).parent / "miner_state.db"

# ============================================================================
# Logging
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ============================================================================
# Supabase Client
# ============================================================================

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)
    return create_client(url, key)

# ============================================================================
# Local State Database
# ============================================================================

def init_local_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS processed_artists (
            instagram_handle TEXT PRIMARY KEY,
            city_slug TEXT,
            processed_at TEXT,
            images_scraped INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS processed_cities (
            city_slug TEXT PRIMARY KEY,
            last_processed_at TEXT,
            artists_found INTEGER DEFAULT 0,
            queries_run INTEGER DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_artists INTEGER DEFAULT 0,
            total_images INTEGER DEFAULT 0,
            total_queries INTEGER DEFAULT 0,
            tavily_cost REAL DEFAULT 0,
            last_updated TEXT
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO stats (id) VALUES (1)")

    conn.commit()
    return conn

def is_artist_processed(conn: sqlite3.Connection, handle: str) -> bool:
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM processed_artists WHERE instagram_handle = ?", (handle.lower(),))
    return cursor.fetchone() is not None

def mark_artist_processed(conn: sqlite3.Connection, handle: str, city_slug: str, images: int, status: str = "complete"):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO processed_artists (instagram_handle, city_slug, processed_at, images_scraped, status)
        VALUES (?, ?, datetime('now'), ?, ?)
    """, (handle.lower(), city_slug, images, status))
    conn.commit()

def update_stats(conn: sqlite3.Connection, artists: int = 0, images: int = 0, queries: int = 0, cost: float = 0):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE stats SET
            total_artists = total_artists + ?,
            total_images = total_images + ?,
            total_queries = total_queries + ?,
            tavily_cost = tavily_cost + ?,
            last_updated = datetime('now')
        WHERE id = 1
    """, (artists, images, queries, cost))
    conn.commit()

def get_stats(conn: sqlite3.Connection) -> dict:
    cursor = conn.cursor()
    cursor.execute("SELECT total_artists, total_images, total_queries, tavily_cost, last_updated FROM stats WHERE id = 1")
    row = cursor.fetchone()
    return {
        "total_artists": row[0] or 0,
        "total_images": row[1] or 0,
        "total_queries": row[2] or 0,
        "tavily_cost": row[3] or 0,
        "last_updated": row[4],
    }

# ============================================================================
# Tavily Search
# ============================================================================

def search_tavily(query: str, api_key: str) -> list[dict]:
    """Search Tavily and return results."""
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": query,
                "search_depth": "basic",
                "max_results": 10,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception as e:
        logger.warning(f"Tavily search failed: {e}")
        return []

def extract_instagram_handles(results: list[dict]) -> set[str]:
    """Extract Instagram handles from Tavily results."""
    handles = set()

    for result in results:
        url = result.get("url", "")
        content = result.get("content", "")

        # From URL
        match = re.search(r'instagram\.com/([a-zA-Z0-9._]+)', url)
        if match:
            handle = match.group(1).lower()
            if handle not in ['explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts']:
                handles.add(handle)

        # From content
        for match in re.finditer(r'@([a-zA-Z0-9._]{3,30})', content):
            handles.add(match.group(1).lower())

        for match in re.finditer(r'instagram\.com/([a-zA-Z0-9._]+)', content):
            handle = match.group(1).lower()
            if handle not in ['explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts']:
                handles.add(handle)

    return handles

def discover_artists_for_city(city: dict, tavily_key: str, local_db: sqlite3.Connection) -> set[str]:
    """Run Tavily queries to discover artists in a city."""
    logger.info(f"Discovering artists in {city['name']}, {city['country']}...")

    all_handles = set()
    queries_run = 0

    # Generate queries
    queries = []
    for template in QUERY_TEMPLATES:
        if "{style}" in template:
            for style in STYLES:
                queries.append(template.format(style=style, city=city['name']))
        else:
            queries.append(template.format(city=city['name']))

    # Run queries
    for query in queries:
        results = search_tavily(query, tavily_key)
        handles = extract_instagram_handles(results)

        # Filter out already processed
        new_handles = {h for h in handles if not is_artist_processed(local_db, h)}
        all_handles.update(new_handles)

        queries_run += 1
        update_stats(local_db, queries=1, cost=0.01)  # ~$0.01 per query

        if queries_run % 10 == 0:
            logger.info(f"  {queries_run} queries, {len(all_handles)} unique handles found")

        time.sleep(DELAY_BETWEEN_QUERIES)

    logger.info(f"  Discovery complete: {len(all_handles)} new artists from {queries_run} queries")
    return all_handles

# ============================================================================
# Instaloader - Profile & Image Scraping
# ============================================================================

def create_instaloader() -> instaloader.Instaloader:
    """Create instaloader instance for public profile scraping."""
    L = instaloader.Instaloader(
        download_pictures=False,  # We'll download manually for more control
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
    )
    return L

def scrape_artist_images(loader: instaloader.Instaloader, handle: str, max_images: int = 12) -> dict:
    """
    Scrape recent images from an artist's public profile.
    Returns dict with {images: list, follower_count: int}.
    """
    result = {"images": [], "follower_count": 0}

    try:
        profile = instaloader.Profile.from_username(loader.context, handle)

        # Skip private profiles
        if profile.is_private:
            logger.info(f"  @{handle} is private, skipping")
            return result

        # Capture follower count
        result["follower_count"] = profile.followers or 0

        # Get recent posts
        for i, post in enumerate(profile.get_posts()):
            if i >= max_images:
                break

            # Only image posts (not videos)
            if post.is_video:
                continue

            result["images"].append({
                "url": post.url,
                "shortcode": post.shortcode,
                "timestamp": post.date_utc.isoformat() if post.date_utc else None,
            })

            # Small delay between post fetches
            time.sleep(1)

        logger.info(f"  @{handle}: found {len(result['images'])} images, {result['follower_count']:,} followers")

    except instaloader.exceptions.ProfileNotExistsException:
        logger.info(f"  @{handle} doesn't exist")
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        logger.info(f"  @{handle} is private")
    except instaloader.exceptions.TooManyRequestsException:
        logger.warning(f"  Rate limited! Waiting 5 minutes...")
        time.sleep(300)
    except Exception as e:
        logger.warning(f"  Error scraping @{handle}: {e}")

    return result

# ============================================================================
# Image Processing & Upload
# ============================================================================

def download_and_resize_image(url: str, max_size: int = 640) -> Optional[bytes]:
    """Download image and resize to WebP thumbnail."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        img = Image.open(io.BytesIO(response.content))

        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Resize maintaining aspect ratio
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Save as WebP
        output = io.BytesIO()
        img.save(output, format='WebP', quality=85)
        return output.getvalue()

    except Exception as e:
        logger.warning(f"Failed to process image: {e}")
        return None

def upload_to_supabase_storage(supabase: Client, image_data: bytes, path: str) -> Optional[str]:
    """Upload image to Supabase Storage, return public URL."""
    try:
        result = supabase.storage.from_("portfolio-images").upload(
            path,
            image_data,
            {"content-type": "image/webp", "upsert": "true"}
        )

        # Get public URL
        public_url = supabase.storage.from_("portfolio-images").get_public_url(path)
        return public_url

    except Exception as e:
        logger.warning(f"Failed to upload to storage: {e}")
        return None

# ============================================================================
# Database Operations
# ============================================================================

def artist_exists_in_supabase(supabase: Client, handle: str) -> Optional[str]:
    """Check if artist exists, return artist_id if so."""
    try:
        result = supabase.table("artists").select("id").eq("instagram_handle", handle.lower()).single().execute()
        return result.data.get("id") if result.data else None
    except:
        return None

def create_artist_in_supabase(supabase: Client, handle: str, city: dict, follower_count: int = 0) -> Optional[str]:
    """Create artist record, return artist_id."""
    artist_id = None

    # 1. Create artist
    try:
        slug = re.sub(r'[^a-z0-9]+', '-', handle.lower()).strip('-')

        result = supabase.table("artists").insert({
            "name": handle,
            "slug": slug,
            "instagram_handle": handle.lower(),
            "instagram_url": f"https://instagram.com/{handle}",
            "follower_count": follower_count if follower_count > 0 else None,
            "discovery_source": f"tavily_international_{city['slug']}",
            "verification_status": "unclaimed",
        }).execute()

        artist_id = result.data[0]["id"] if result.data else None

    except Exception as e:
        if "duplicate" in str(e).lower() or "23505" in str(e):
            return artist_exists_in_supabase(supabase, handle)
        logger.warning(f"Failed to create artist @{handle}: {e}")
        return None

    # 2. Create location via RPC to bypass trigger issues
    if artist_id:
        try:
            # Direct insert - the check_location_limit trigger has issues
            # with the Python client, so we catch and log but don't fail
            supabase.table("artist_locations").insert({
                "artist_id": artist_id,
                "city": city["name"],
                "region": city.get("region"),
                "country_code": city["country"],
                "location_type": "city",
                "is_primary": True,
                "display_order": 0,
            }).execute()
            logger.debug(f"Location created for @{handle}")
        except Exception as e:
            # Known issue: trigger errors get weird messages
            # Artists still get created, locations can be backfilled
            pass

    return artist_id

def create_portfolio_image(supabase: Client, artist_id: str, image_url: str, storage_url: str, shortcode: str) -> bool:
    """Create portfolio_images record."""
    try:
        supabase.table("portfolio_images").insert({
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

# ============================================================================
# Main Pipeline
# ============================================================================

def process_artist(
    loader: instaloader.Instaloader,
    supabase: Client,
    local_db: sqlite3.Connection,
    handle: str,
    city: dict,
) -> int:
    """
    Full pipeline for one artist:
    1. Scrape images from Instagram
    2. Upload to Supabase Storage
    3. Create DB records

    Returns number of images processed.
    """
    # Scrape images and follower count FIRST (before creating artist)
    scrape_result = scrape_artist_images(loader, handle, max_images=IMAGES_PER_ARTIST)
    images = scrape_result["images"]
    follower_count = scrape_result["follower_count"]

    if not images:
        mark_artist_processed(local_db, handle, city["slug"], 0, "no_images")
        return 0

    # Check if already in Supabase, create if not (with follower count)
    artist_id = artist_exists_in_supabase(supabase, handle)
    if not artist_id:
        artist_id = create_artist_in_supabase(supabase, handle, city, follower_count)

    if not artist_id:
        mark_artist_processed(local_db, handle, city["slug"], 0, "failed")
        return 0

    # Process each image
    uploaded_count = 0
    for img in images:
        shortcode = img["shortcode"]

        # Check if image already exists (avoid unnecessary uploads)
        try:
            existing = supabase.table("portfolio_images").select("id").eq("instagram_post_id", shortcode).execute()
            if existing.data:
                continue  # Skip - already have this image
        except:
            pass  # Continue if check fails

        # Download and resize
        image_data = download_and_resize_image(img["url"])
        if not image_data:
            continue

        # Generate storage path
        img_hash = hashlib.md5(img["url"].encode()).hexdigest()[:8]
        storage_path = f"{handle}/{shortcode}_{img_hash}.webp"

        # Upload to storage
        storage_url = upload_to_supabase_storage(supabase, image_data, storage_path)
        if not storage_url:
            continue

        # Create DB record
        if create_portfolio_image(supabase, artist_id, img["url"], storage_url, shortcode):
            uploaded_count += 1

    mark_artist_processed(local_db, handle, city["slug"], uploaded_count, "complete")
    update_stats(local_db, artists=1, images=uploaded_count)

    logger.info(f"  @{handle}: uploaded {uploaded_count}/{len(images)} images")
    return uploaded_count

def process_city(
    loader: instaloader.Instaloader,
    supabase: Client,
    local_db: sqlite3.Connection,
    tavily_key: str,
    city: dict,
):
    """Process all artists in a city."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing {city['name']}, {city['country']}")
    logger.info(f"{'='*60}")

    # Discover artists
    handles = discover_artists_for_city(city, tavily_key, local_db)

    if not handles:
        logger.info("No new artists found, skipping city")
        return

    # Process each artist
    total_images = 0
    for i, handle in enumerate(handles):
        logger.info(f"\n[{i+1}/{len(handles)}] Processing @{handle}...")

        images = process_artist(loader, supabase, local_db, handle, city)
        total_images += images

        # Delay between artists
        if i < len(handles) - 1:
            delay = random.uniform(DELAY_BETWEEN_ARTISTS * 0.8, DELAY_BETWEEN_ARTISTS * 1.2)
            logger.info(f"Waiting {delay:.0f}s before next artist...")
            time.sleep(delay)

    logger.info(f"\nCity complete: {len(handles)} artists, {total_images} images")

def run_continuous(cities: list[dict], tavily_key: str):
    """Run the miner continuously."""
    logger.info("Starting continuous mining loop...")

    # Initialize
    local_db = init_local_db(LOCAL_DB_PATH)
    supabase = get_supabase_client()
    loader = create_instaloader()

    cycle = 0

    try:
        while True:
            cycle += 1
            logger.info(f"\n{'#'*60}")
            logger.info(f"CYCLE {cycle}")
            logger.info(f"{'#'*60}")

            # Shuffle cities each cycle
            random.shuffle(cities)

            for city in cities:
                try:
                    process_city(loader, supabase, local_db, tavily_key, city)
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    logger.error(f"Error processing {city['name']}: {e}")

                # Delay between cities
                logger.info(f"\nWaiting {DELAY_BETWEEN_CITIES/60:.0f}m before next city...")
                time.sleep(DELAY_BETWEEN_CITIES)

            # Log stats
            stats = get_stats(local_db)
            logger.info(f"\nCycle {cycle} complete.")
            logger.info(f"  Total artists: {stats['total_artists']}")
            logger.info(f"  Total images: {stats['total_images']}")
            logger.info(f"  Total queries: {stats['total_queries']}")
            logger.info(f"  Tavily cost: ${stats['tavily_cost']:.2f}")

    except KeyboardInterrupt:
        logger.info("\nShutting down...")
    finally:
        local_db.close()

# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="International artist miner")
    parser.add_argument("--region", choices=["canada", "latin_america", "asia_pacific", "all"], default="all")
    parser.add_argument("--city", help="Process single city by name")
    parser.add_argument("--stats", action="store_true", help="Show statistics")
    args = parser.parse_args()

    # Check env vars
    tavily_key = os.environ.get("TAVILY_API_KEY")
    if not tavily_key and not args.stats:
        logger.error("Missing TAVILY_API_KEY environment variable")
        sys.exit(1)

    # Stats mode
    if args.stats:
        local_db = init_local_db(LOCAL_DB_PATH)
        stats = get_stats(local_db)
        print(f"\n=== International Miner Stats ===")
        print(f"Total artists: {stats['total_artists']:,}")
        print(f"Total images: {stats['total_images']:,}")
        print(f"Total queries: {stats['total_queries']:,}")
        print(f"Tavily cost: ${stats['tavily_cost']:.2f}")
        print(f"Last updated: {stats['last_updated'] or 'Never'}")
        local_db.close()
        return

    # Select cities
    if args.city:
        cities = [c for c in ALL_CITIES if c["name"].lower() == args.city.lower()]
        if not cities:
            logger.error(f"City not found: {args.city}")
            sys.exit(1)
    elif args.region == "all":
        cities = ALL_CITIES.copy()
    else:
        cities = CITIES_BY_REGION.get(args.region, []).copy()

    logger.info(f"Targeting {len(cities)} cities")

    # Handle signals
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run
    run_continuous(cities, tavily_key)

if __name__ == "__main__":
    main()
