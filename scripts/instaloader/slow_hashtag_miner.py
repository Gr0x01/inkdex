#!/usr/bin/env python3
"""
Slow Hashtag Miner - 24/7 International Artist Discovery

A slow, persistent Instagram scraper designed to run continuously without
getting rate-limited or banned. Uses instaloader, pushes directly to Supabase.

Architecture:
- Scrapes hashtag feeds (no login required for public posts)
- 1 request per 20-60 seconds (randomized)
- Extracts usernames from posts
- Pushes directly to Supabase mining_candidates table
- Rotates through hashtags to avoid pattern detection

Target Regions (GDPR-safe):
- Canada: Toronto, Vancouver, Montreal, Calgary
- Latin America: Mexico City, Sao Paulo, Buenos Aires, Bogota
- Asia-Pacific: Tokyo, Seoul, Singapore, Bangkok, Sydney, Melbourne

Usage:
  python slow_hashtag_miner.py                    # Run with defaults
  python slow_hashtag_miner.py --region canada    # Only Canada hashtags
  python slow_hashtag_miner.py --min-delay 30 --max-delay 90
  python slow_hashtag_miner.py --stats            # Show statistics

Environment Variables (required):
  SUPABASE_URL          - Your Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key (not anon key)
"""

import argparse
import logging
import os
import random
import signal
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

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

# ============================================================================
# Configuration
# ============================================================================

# Target hashtags by region (GDPR-safe countries only)
HASHTAGS_BY_REGION = {
    "canada": [
        # Major cities
        "torontotattoo", "torontotattooartist", "torontoink",
        "vancouvertattoo", "vancouvertattooartist", "yvrtattoo",
        "montrealtattoo", "montrealtattooartist", "mtltattoo",
        "calgarytattoo", "calgarytattooartist",
        "ottawatattoo", "edmontontattoo", "winnipegtattoo",
        # General Canada
        "canadatattoo", "canadatattooartist", "canadiantattooist",
    ],
    "latin_america": [
        # Mexico
        "mexicotattoo", "cdmxtattoo", "mexicocitytattoo", "tatuajemexico",
        "guadalajaratattoo", "monterreytattoo",
        # Brazil
        "braziltattoo", "saopaulotattoo", "riotattoo", "tatuagembrasil",
        # Argentina
        "argentinatattoo", "buenosairestattoo", "tatuajeargentina",
        # Colombia
        "colombiatattoo", "bogotatattoo", "medellintattoo",
        # Chile
        "chiletattoo", "santiagotattoo",
        # Peru
        "perutattoo", "limatattoo",
    ],
    "asia_pacific": [
        # Japan
        "tokyotattoo", "japantattoo", "japanesetattooartist",
        "osakatattoo", "kyototattoo",
        # South Korea
        "seoultattoo", "koreatattoo", "koreantattoo", "koreantattooist",
        # Singapore
        "singaporetattoo", "sgtattoo", "singaporetattooartist",
        # Thailand
        "bangkoktattoo", "thailandtattoo", "thaitattoo",
        # Australia
        "sydneytattoo", "sydneytattooartist", "melbournetattoo",
        "australiatattoo", "brisbanetattoo", "perthtattoo",
        # New Zealand
        "nztattoo", "aucklandtattoo", "newzealandtattoo",
        # Malaysia
        "malaysiatattoo", "kltattoo",
        # Philippines
        "philippinestattoo", "manilatattoo",
        # Indonesia
        "balitattoo", "indonesiatattoo", "jakartatattoo",
    ],
}

# Flatten all hashtags for default mode
ALL_HASHTAGS = []
for region_tags in HASHTAGS_BY_REGION.values():
    ALL_HASHTAGS.extend(region_tags)

# Default timing (conservative to avoid bans)
DEFAULT_MIN_DELAY = 20  # seconds
DEFAULT_MAX_DELAY = 60  # seconds

# How many posts to fetch per hashtag before rotating
POSTS_PER_HASHTAG = 50

# Local SQLite for deduplication (avoids hitting Supabase for every check)
LOCAL_DB_PATH = Path(__file__).parent / "local_seen.db"

# ============================================================================
# Logging Setup
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
    """Create Supabase client from environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        sys.exit(1)

    return create_client(url, key)

# ============================================================================
# Local Deduplication Cache (SQLite)
# ============================================================================

def init_local_db(db_path: Path) -> sqlite3.Connection:
    """Initialize local SQLite for deduplication."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Simple seen usernames table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS seen_usernames (
            username TEXT PRIMARY KEY,
            first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Stats tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_posts INTEGER DEFAULT 0,
            total_users INTEGER DEFAULT 0,
            new_users INTEGER DEFAULT 0,
            last_updated TEXT
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO stats (id) VALUES (1)")

    conn.commit()
    return conn

def is_seen_locally(conn: sqlite3.Connection, username: str) -> bool:
    """Check if username was already seen (local cache)."""
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_usernames WHERE username = ?", (username.lower(),))
    return cursor.fetchone() is not None

def mark_seen_locally(conn: sqlite3.Connection, username: str):
    """Mark username as seen in local cache."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO seen_usernames (username) VALUES (?)",
        (username.lower(),)
    )
    conn.commit()

def update_local_stats(conn: sqlite3.Connection, posts: int, users: int, new_users: int):
    """Update local stats."""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE stats SET
            total_posts = total_posts + ?,
            total_users = total_users + ?,
            new_users = new_users + ?,
            last_updated = datetime('now')
        WHERE id = 1
    """, (posts, users, new_users))
    conn.commit()

def get_local_stats(conn: sqlite3.Connection) -> dict:
    """Get local statistics."""
    cursor = conn.cursor()
    cursor.execute("SELECT total_posts, total_users, new_users, last_updated FROM stats WHERE id = 1")
    row = cursor.fetchone()
    cursor.execute("SELECT COUNT(*) FROM seen_usernames")
    seen_count = cursor.fetchone()[0]
    return {
        "total_posts": row[0] or 0,
        "total_users": row[1] or 0,
        "new_users": row[2] or 0,
        "last_updated": row[3],
        "seen_cache_size": seen_count,
    }

# ============================================================================
# Supabase Operations
# ============================================================================

def push_candidate_to_supabase(
    supabase: Client,
    username: str,
    hashtag: str,
    region: str,
) -> bool:
    """
    Push a candidate to Supabase mining_candidates table.
    Returns True if inserted (new), False if already exists.
    """
    try:
        result = supabase.table("mining_candidates").insert({
            "instagram_handle": username.lower(),
            "source_type": "hashtag",
            "source_id": f"instaloader_{hashtag}",
            "bio_filter_passed": None,  # Pending classification
            "image_filter_passed": None,
            "extracted_city": None,
            "extracted_state": None,
        }).execute()

        return True

    except Exception as e:
        error_msg = str(e)
        # Duplicate key = already exists, not an error
        if "duplicate key" in error_msg.lower() or "23505" in error_msg:
            return False
        logger.warning(f"Supabase insert error for @{username}: {error_msg}")
        return False

def get_supabase_stats(supabase: Client) -> dict:
    """Get mining stats from Supabase."""
    try:
        # Total candidates from instaloader
        result = supabase.table("mining_candidates")\
            .select("*", count="exact")\
            .like("source_id", "instaloader_%")\
            .execute()
        total = result.count or 0

        # Pending classification
        result = supabase.table("mining_candidates")\
            .select("*", count="exact")\
            .like("source_id", "instaloader_%")\
            .is_("bio_filter_passed", "null")\
            .execute()
        pending = result.count or 0

        return {
            "total_candidates": total,
            "pending_classification": pending,
        }
    except Exception as e:
        logger.error(f"Error fetching Supabase stats: {e}")
        return {"total_candidates": 0, "pending_classification": 0}

# ============================================================================
# Instaloader Setup
# ============================================================================

def create_loader() -> instaloader.Instaloader:
    """Create configured instaloader instance."""
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

# ============================================================================
# Scraping Logic
# ============================================================================

def scrape_hashtag(
    loader: instaloader.Instaloader,
    supabase: Client,
    local_db: sqlite3.Connection,
    hashtag: str,
    region: str,
    max_posts: int = POSTS_PER_HASHTAG,
    min_delay: int = DEFAULT_MIN_DELAY,
    max_delay: int = DEFAULT_MAX_DELAY,
) -> tuple[int, int, int]:
    """
    Scrape posts from a hashtag and push new usernames to Supabase.

    Returns: (posts_scraped, users_found, new_users)
    """
    posts_scraped = 0
    users_found = 0
    new_users = 0
    seen_this_run = set()

    logger.info(f"Scraping #{hashtag} (max {max_posts} posts)...")

    try:
        hashtag_obj = instaloader.Hashtag.from_name(loader.context, hashtag)

        for post in hashtag_obj.get_posts():
            if posts_scraped >= max_posts:
                break

            posts_scraped += 1

            # Extract username
            try:
                username = post.owner_username
                if not username:
                    continue

                username_lower = username.lower()

                # Skip if seen this run
                if username_lower in seen_this_run:
                    continue
                seen_this_run.add(username_lower)

                users_found += 1

                # Check local cache first (fast)
                if is_seen_locally(local_db, username):
                    continue

                # Push to Supabase
                if push_candidate_to_supabase(supabase, username, hashtag, region):
                    new_users += 1
                    logger.info(f"  New: @{username}")

                # Mark as seen locally (even if Supabase had it)
                mark_seen_locally(local_db, username)

            except Exception as e:
                logger.warning(f"  Error processing post: {e}")

            # Random delay between posts
            delay = random.uniform(min_delay, max_delay)
            time.sleep(delay)

    except instaloader.exceptions.QueryReturnedNotFoundException:
        logger.warning(f"Hashtag #{hashtag} not found")
    except instaloader.exceptions.TooManyRequestsException:
        logger.error(f"Rate limited! Waiting 15 minutes...")
        time.sleep(15 * 60)
    except instaloader.exceptions.ConnectionException as e:
        logger.error(f"Connection error on #{hashtag}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error on #{hashtag}: {e}")

    # Update local stats
    update_local_stats(local_db, posts_scraped, users_found, new_users)

    logger.info(f"#{hashtag}: {posts_scraped} posts, {users_found} users, {new_users} new")
    return posts_scraped, users_found, new_users

def run_mining_loop(
    loader: instaloader.Instaloader,
    supabase: Client,
    local_db: sqlite3.Connection,
    hashtags: list[str],
    region: str,
    min_delay: int,
    max_delay: int,
):
    """Main mining loop - runs continuously."""

    logger.info(f"Starting mining loop with {len(hashtags)} hashtags")
    logger.info(f"Delay between requests: {min_delay}-{max_delay}s")

    session_posts = 0
    session_users = 0
    session_new = 0
    cycle_count = 0

    try:
        while True:
            cycle_count += 1
            logger.info(f"=== Starting cycle {cycle_count} ===")

            # Shuffle hashtags each cycle to avoid patterns
            random.shuffle(hashtags)

            for hashtag in hashtags:
                try:
                    posts, users, new = scrape_hashtag(
                        loader, supabase, local_db, hashtag, region,
                        min_delay=min_delay, max_delay=max_delay
                    )
                    session_posts += posts
                    session_users += users
                    session_new += new

                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    logger.error(f"Error processing #{hashtag}: {e}")

                # Extra delay between hashtags (1-3 minutes)
                between_delay = random.uniform(60, 180)
                logger.info(f"Next hashtag in {between_delay:.0f}s...")
                time.sleep(between_delay)

            # Log cycle stats
            local_stats = get_local_stats(local_db)
            logger.info(f"Cycle {cycle_count} complete.")
            logger.info(f"  Session: {session_posts} posts, {session_users} users, {session_new} new")
            logger.info(f"  All-time: {local_stats['total_posts']} posts, {local_stats['new_users']} new users")
            logger.info(f"  Local cache: {local_stats['seen_cache_size']} usernames")

            # Longer delay between full cycles (5-10 minutes)
            cycle_delay = random.uniform(300, 600)
            logger.info(f"Next cycle in {cycle_delay/60:.1f} minutes...")
            time.sleep(cycle_delay)

    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    finally:
        logger.info(f"Final session stats: {session_posts} posts, {session_users} users, {session_new} new")

# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Slow hashtag miner for international artist discovery"
    )
    parser.add_argument(
        "--region",
        choices=["canada", "latin_america", "asia_pacific", "all"],
        default="all",
        help="Region to target (default: all)",
    )
    parser.add_argument(
        "--min-delay",
        type=int,
        default=DEFAULT_MIN_DELAY,
        help=f"Minimum delay between requests in seconds (default: {DEFAULT_MIN_DELAY})",
    )
    parser.add_argument(
        "--max-delay",
        type=int,
        default=DEFAULT_MAX_DELAY,
        help=f"Maximum delay between requests in seconds (default: {DEFAULT_MAX_DELAY})",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics and exit",
    )

    args = parser.parse_args()

    # Initialize local DB
    local_db = init_local_db(LOCAL_DB_PATH)
    logger.info(f"Local cache: {LOCAL_DB_PATH}")

    # Initialize Supabase
    supabase = get_supabase_client()
    logger.info("Connected to Supabase")

    # Stats mode
    if args.stats:
        local_stats = get_local_stats(local_db)
        supabase_stats = get_supabase_stats(supabase)

        print(f"\n=== Instaloader Mining Stats ===")
        print(f"\nLocal Cache:")
        print(f"  Total posts scraped: {local_stats['total_posts']:,}")
        print(f"  Total users found: {local_stats['total_users']:,}")
        print(f"  New users pushed: {local_stats['new_users']:,}")
        print(f"  Cache size: {local_stats['seen_cache_size']:,} usernames")
        print(f"  Last updated: {local_stats['last_updated'] or 'Never'}")

        print(f"\nSupabase:")
        print(f"  Total candidates (instaloader): {supabase_stats['total_candidates']:,}")
        print(f"  Pending classification: {supabase_stats['pending_classification']:,}")

        local_db.close()
        return

    # Select hashtags
    if args.region == "all":
        hashtags = ALL_HASHTAGS.copy()
        region = "all"
    else:
        hashtags = HASHTAGS_BY_REGION.get(args.region, []).copy()
        region = args.region

    if not hashtags:
        logger.error(f"No hashtags found for region: {args.region}")
        sys.exit(1)

    logger.info(f"Region: {region} ({len(hashtags)} hashtags)")

    # Create loader
    loader = create_loader()

    # Handle graceful shutdown
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run mining loop
    try:
        run_mining_loop(
            loader, supabase, local_db, hashtags, region,
            min_delay=args.min_delay, max_delay=args.max_delay
        )
    finally:
        local_db.close()

if __name__ == "__main__":
    main()
