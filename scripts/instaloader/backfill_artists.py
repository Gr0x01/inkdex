#!/usr/bin/env python3
"""
Backfill Artists - Images + Followers

Fills in missing data for existing artists:
1. Fetch profile via Instaloader → get follower_count
2. Scrape images → download → resize to WebP → upload to Supabase Storage
3. Insert portfolio_images with storage URL + Instagram URL (for attribution)
4. Update artists.follower_count

Usage:
  python backfill_artists.py                    # Run continuously
  python backfill_artists.py --limit 100        # Process 100 artists
  python backfill_artists.py --dry-run          # Preview what would be processed
  python backfill_artists.py --stats            # Show statistics
  python backfill_artists.py --followers-only   # Only update follower counts
  python backfill_artists.py --images-only      # Only scrape images

Environment Variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key

Cost: FREE (uses Instaloader, no Apify/Tavily)
"""

import argparse
import hashlib
import io
import logging
import os
import signal
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

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

DELAY_BETWEEN_ARTISTS = 120  # 2 minutes - be very nice to Instagram
IMAGES_PER_ARTIST = 12       # How many images to scrape
RATE_LIMIT_WAIT = 900        # 15 minutes when rate limited

# Local database for tracking progress
LOCAL_DB_PATH = Path(__file__).parent / "backfill_state.db"

# ============================================================================
# Logging
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Graceful shutdown flag
shutdown_requested = False

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
            artist_id TEXT PRIMARY KEY,
            instagram_handle TEXT,
            processed_at TEXT,
            images_uploaded INTEGER DEFAULT 0,
            follower_count INTEGER,
            status TEXT DEFAULT 'pending'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_processed INTEGER DEFAULT 0,
            total_images INTEGER DEFAULT 0,
            total_skipped INTEGER DEFAULT 0,
            total_failed INTEGER DEFAULT 0,
            last_updated TEXT
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO stats (id) VALUES (1)")

    conn.commit()
    return conn

def is_artist_processed(conn: sqlite3.Connection, artist_id: str) -> bool:
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM processed_artists WHERE artist_id = ?", (artist_id,))
    return cursor.fetchone() is not None

def mark_artist_processed(
    conn: sqlite3.Connection,
    artist_id: str,
    handle: str,
    images: int,
    followers: int,
    status: str = "complete"
):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO processed_artists
        (artist_id, instagram_handle, processed_at, images_uploaded, follower_count, status)
        VALUES (?, ?, datetime('now'), ?, ?, ?)
    """, (artist_id, handle, images, followers, status))
    conn.commit()

def update_stats(conn: sqlite3.Connection, processed: int = 0, images: int = 0, skipped: int = 0, failed: int = 0):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE stats SET
            total_processed = total_processed + ?,
            total_images = total_images + ?,
            total_skipped = total_skipped + ?,
            total_failed = total_failed + ?,
            last_updated = datetime('now')
        WHERE id = 1
    """, (processed, images, skipped, failed))
    conn.commit()

def get_stats(conn: sqlite3.Connection) -> dict:
    cursor = conn.cursor()
    cursor.execute("SELECT total_processed, total_images, total_skipped, total_failed, last_updated FROM stats WHERE id = 1")
    row = cursor.fetchone()
    return {
        "total_processed": row[0] or 0,
        "total_images": row[1] or 0,
        "total_skipped": row[2] or 0,
        "total_failed": row[3] or 0,
        "last_updated": row[4],
    }

# ============================================================================
# Instaloader - Profile & Image Scraping
# ============================================================================

def create_instaloader() -> instaloader.Instaloader:
    """Create instaloader instance for public profile scraping."""
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
    )
    return L

def scrape_artist_profile(loader: instaloader.Instaloader, handle: str, max_images: int = 12) -> dict:
    """
    Scrape profile data and images from an artist's public profile.
    Returns dict with {images: list, follower_count: int, is_private: bool, exists: bool}.
    """
    result = {
        "images": [],
        "follower_count": 0,
        "is_private": False,
        "exists": True,
        "error": None,
    }

    try:
        profile = instaloader.Profile.from_username(loader.context, handle)

        # Check private
        if profile.is_private:
            result["is_private"] = True
            result["follower_count"] = profile.followers or 0
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
            time.sleep(0.5)

    except instaloader.exceptions.ProfileNotExistsException:
        result["exists"] = False
        result["error"] = "Profile does not exist"
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        result["is_private"] = True
        result["error"] = "Private profile"
    except instaloader.exceptions.TooManyRequestsException:
        result["error"] = "Rate limited"
        logger.warning(f"Rate limited! Waiting {RATE_LIMIT_WAIT // 60} minutes...")
        time.sleep(RATE_LIMIT_WAIT)
    except Exception as e:
        error_str = str(e)
        result["error"] = error_str
        # Check for 401 unauthorized (Instagram soft rate limit)
        if "401" in error_str or "Unauthorized" in error_str or "wait a few minutes" in error_str.lower():
            result["error"] = "Rate limited"
            logger.warning(f"Soft rate limited (401)! Waiting {RATE_LIMIT_WAIT // 60} minutes...")
            time.sleep(RATE_LIMIT_WAIT)
        else:
            logger.warning(f"Error scraping @{handle}: {e}")

    return result

# ============================================================================
# Image Processing & Upload (reused from international_miner)
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

def get_artists_needing_work(supabase: Client, limit: int = 100, images_only: bool = False, followers_only: bool = False) -> list:
    """
    Get artists that need backfill work.
    Returns list of {id, instagram_handle, follower_count, image_count}.
    """
    # Build query based on mode
    if followers_only:
        # Only get artists missing followers (regardless of images)
        query = """
            SELECT a.id, a.instagram_handle, a.follower_count, 0 as image_count
            FROM artists a
            WHERE a.follower_count IS NULL
            ORDER BY a.created_at DESC
            LIMIT %s
        """ % limit
    elif images_only:
        # Only get artists missing images (regardless of followers)
        query = """
            SELECT a.id, a.instagram_handle, a.follower_count, COUNT(pi.id) as image_count
            FROM artists a
            LEFT JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active'
            GROUP BY a.id, a.instagram_handle, a.follower_count
            HAVING COUNT(pi.id) = 0
            ORDER BY a.created_at DESC
            LIMIT %s
        """ % limit
    else:
        # Get artists missing either followers OR images
        query = """
            SELECT a.id, a.instagram_handle, a.follower_count, COUNT(pi.id) as image_count
            FROM artists a
            LEFT JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active'
            GROUP BY a.id, a.instagram_handle, a.follower_count
            HAVING a.follower_count IS NULL OR COUNT(pi.id) = 0
            ORDER BY a.created_at DESC
            LIMIT %s
        """ % limit

    result = supabase.rpc('exec_sql', {'query': query}).execute()

    # Fallback: use direct query if RPC not available
    if not result.data:
        # Use simpler approach - query artists table and count images separately
        artists_result = supabase.table("artists").select("id, instagram_handle, follower_count").is_("follower_count", "null").limit(limit).execute()
        return [{"id": a["id"], "instagram_handle": a["instagram_handle"], "follower_count": a["follower_count"], "image_count": 0} for a in (artists_result.data or [])]

    return result.data or []

def get_artists_needing_work_simple(supabase: Client, limit: int = 100) -> list:
    """
    Simpler approach: get artists missing followers.
    Returns list of {id, instagram_handle, follower_count}.
    """
    result = supabase.table("artists")\
        .select("id, instagram_handle, follower_count")\
        .is_("follower_count", "null")\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()

    return result.data or []

def update_artist_follower_count(supabase: Client, artist_id: str, follower_count: int) -> bool:
    """Update artist's follower count."""
    try:
        supabase.table("artists").update({
            "follower_count": follower_count
        }).eq("id", artist_id).execute()
        return True
    except Exception as e:
        logger.warning(f"Failed to update follower count: {e}")
        return False

def create_portfolio_image(supabase: Client, artist_id: str, storage_url: str, shortcode: str) -> bool:
    """Create portfolio_images record."""
    try:
        supabase.table("portfolio_images").insert({
            "artist_id": artist_id,
            "instagram_post_id": shortcode,
            "instagram_url": f"https://instagram.com/p/{shortcode}/",
            "storage_thumb_640": storage_url,
            "import_source": "backfill",
            "status": "active",
        }).execute()
        return True
    except Exception as e:
        if "duplicate" not in str(e).lower():
            logger.warning(f"Failed to create image record: {e}")
        return False

def get_existing_image_shortcodes(supabase: Client, artist_id: str) -> set:
    """Get set of existing instagram_post_id values for an artist."""
    try:
        result = supabase.table("portfolio_images")\
            .select("instagram_post_id")\
            .eq("artist_id", artist_id)\
            .execute()
        return {img["instagram_post_id"] for img in (result.data or []) if img.get("instagram_post_id")}
    except:
        return set()

# ============================================================================
# Main Pipeline
# ============================================================================

def process_artist(
    loader: instaloader.Instaloader,
    supabase: Client,
    local_db: sqlite3.Connection,
    artist: dict,
    images_only: bool = False,
    followers_only: bool = False,
) -> dict:
    """
    Process one artist:
    1. Scrape profile (followers + images)
    2. Upload images to Supabase Storage
    3. Update DB records

    Returns {success: bool, images_uploaded: int, follower_count: int}.
    """
    artist_id = artist["id"]
    handle = artist["instagram_handle"]
    current_followers = artist.get("follower_count")

    result = {"success": False, "images_uploaded": 0, "follower_count": 0, "status": "pending"}

    # Skip if already processed locally
    if is_artist_processed(local_db, artist_id):
        logger.info(f"  @{handle} already processed locally, skipping")
        result["status"] = "skipped"
        return result

    # Scrape profile
    logger.info(f"  Scraping @{handle}...")
    profile_data = scrape_artist_profile(loader, handle, max_images=IMAGES_PER_ARTIST)

    # Handle errors
    if profile_data["error"]:
        if profile_data["error"] == "Rate limited":
            result["status"] = "rate_limited"
            return result
        elif not profile_data["exists"]:
            mark_artist_processed(local_db, artist_id, handle, 0, 0, "not_found")
            update_stats(local_db, skipped=1)
            result["status"] = "not_found"
            return result
        elif profile_data["is_private"]:
            # Still update follower count if we got it
            if profile_data["follower_count"] and not followers_only:
                update_artist_follower_count(supabase, artist_id, profile_data["follower_count"])
            mark_artist_processed(local_db, artist_id, handle, 0, profile_data["follower_count"], "private")
            update_stats(local_db, skipped=1)
            result["status"] = "private"
            result["follower_count"] = profile_data["follower_count"]
            return result

    follower_count = profile_data["follower_count"]
    result["follower_count"] = follower_count

    # Update follower count if needed
    if not images_only and (current_followers is None or current_followers == 0):
        if follower_count > 0:
            update_artist_follower_count(supabase, artist_id, follower_count)
            logger.info(f"  Updated follower count: {follower_count:,}")

    # Skip images if followers_only mode
    if followers_only:
        mark_artist_processed(local_db, artist_id, handle, 0, follower_count, "complete")
        update_stats(local_db, processed=1)
        result["success"] = True
        result["status"] = "complete"
        return result

    # Get existing images to avoid duplicates
    existing_shortcodes = get_existing_image_shortcodes(supabase, artist_id)

    # Process images
    images = profile_data["images"]
    if not images:
        logger.info(f"  No images found for @{handle}")
        mark_artist_processed(local_db, artist_id, handle, 0, follower_count, "no_images")
        update_stats(local_db, processed=1)
        result["success"] = True
        result["status"] = "no_images"
        return result

    uploaded_count = 0
    for img in images:
        shortcode = img["shortcode"]

        # Skip if already exists
        if shortcode in existing_shortcodes:
            continue

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
        if create_portfolio_image(supabase, artist_id, storage_url, shortcode):
            uploaded_count += 1

    result["images_uploaded"] = uploaded_count
    result["success"] = True
    result["status"] = "complete"

    mark_artist_processed(local_db, artist_id, handle, uploaded_count, follower_count, "complete")
    update_stats(local_db, processed=1, images=uploaded_count)

    logger.info(f"  @{handle}: {uploaded_count} images uploaded, {follower_count:,} followers")
    return result

def run_backfill(
    limit: int = 0,
    dry_run: bool = False,
    images_only: bool = False,
    followers_only: bool = False,
):
    """Run the backfill process."""
    global shutdown_requested

    logger.info("Starting backfill process...")
    logger.info(f"  Mode: {'dry-run' if dry_run else 'live'}")
    logger.info(f"  Limit: {limit if limit > 0 else 'unlimited'}")
    logger.info(f"  Images only: {images_only}")
    logger.info(f"  Followers only: {followers_only}")

    # Initialize
    local_db = init_local_db(LOCAL_DB_PATH)
    supabase = get_supabase_client()
    loader = create_instaloader()

    processed = 0
    batch_size = 50  # Fetch 50 artists at a time

    try:
        while not shutdown_requested:
            # Fetch artists needing work
            artists = get_artists_needing_work_simple(supabase, batch_size)

            if not artists:
                logger.info("No more artists to process!")
                break

            logger.info(f"\nFetched {len(artists)} artists to process")

            for i, artist in enumerate(artists):
                if shutdown_requested:
                    logger.info("Shutdown requested, stopping...")
                    break

                if limit > 0 and processed >= limit:
                    logger.info(f"Reached limit of {limit} artists")
                    return

                handle = artist["instagram_handle"]
                logger.info(f"\n[{processed + 1}{'/' + str(limit) if limit > 0 else ''}] Processing @{handle}...")

                if dry_run:
                    logger.info(f"  [DRY RUN] Would process @{handle}")
                    processed += 1
                    continue

                result = process_artist(
                    loader, supabase, local_db, artist,
                    images_only=images_only,
                    followers_only=followers_only
                )

                processed += 1

                # Handle rate limiting
                if result["status"] == "rate_limited":
                    logger.warning("Rate limited, waiting 5 minutes...")
                    time.sleep(300)
                    continue

                # Delay between artists
                if i < len(artists) - 1:
                    time.sleep(DELAY_BETWEEN_ARTISTS)

            # Log stats
            stats = get_stats(local_db)
            logger.info(f"\n=== Progress ===")
            logger.info(f"  Processed: {stats['total_processed']}")
            logger.info(f"  Images: {stats['total_images']}")
            logger.info(f"  Skipped: {stats['total_skipped']}")
            logger.info(f"  Failed: {stats['total_failed']}")

    except KeyboardInterrupt:
        logger.info("\nShutting down...")
    finally:
        local_db.close()

# ============================================================================
# CLI
# ============================================================================

def main():
    global shutdown_requested

    parser = argparse.ArgumentParser(description="Backfill artist images and followers")
    parser.add_argument("--limit", type=int, default=0, help="Maximum artists to process (0 = unlimited)")
    parser.add_argument("--dry-run", action="store_true", help="Preview what would be processed")
    parser.add_argument("--stats", action="store_true", help="Show statistics and exit")
    parser.add_argument("--images-only", action="store_true", help="Only scrape images (skip follower updates)")
    parser.add_argument("--followers-only", action="store_true", help="Only update follower counts (skip images)")
    args = parser.parse_args()

    # Stats mode
    if args.stats:
        local_db = init_local_db(LOCAL_DB_PATH)
        stats = get_stats(local_db)
        print(f"\n=== Backfill Stats ===")
        print(f"Total processed: {stats['total_processed']:,}")
        print(f"Total images: {stats['total_images']:,}")
        print(f"Total skipped: {stats['total_skipped']:,}")
        print(f"Total failed: {stats['total_failed']:,}")
        print(f"Last updated: {stats['last_updated'] or 'Never'}")

        # Also show DB stats
        try:
            supabase = get_supabase_client()
            result = supabase.table("artists").select("id", count="exact").is_("follower_count", "null").execute()
            print(f"\nDB: {result.count:,} artists still missing follower counts")
        except:
            pass

        local_db.close()
        return

    # Handle signals
    def signal_handler(sig, frame):
        global shutdown_requested
        logger.info("Received shutdown signal...")
        shutdown_requested = True

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run backfill
    run_backfill(
        limit=args.limit,
        dry_run=args.dry_run,
        images_only=args.images_only,
        followers_only=args.followers_only,
    )

if __name__ == "__main__":
    main()
