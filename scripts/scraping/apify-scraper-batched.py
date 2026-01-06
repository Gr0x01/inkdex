#!/usr/bin/env python3
"""
Instagram Portfolio Scraper using Apify - BATCHED VERSION
Optimized for Starter plan (1-2 concurrent runs) by batching multiple profiles per run.

Key optimization: Instead of 1 actor run per artist, we batch 20-50 artists per run.
This reduces actor spin-up overhead from 100x to 2-5x.
"""

import psycopg2
import os
import sys
import json
import re
import asyncio
import aiohttp
import base64
from datetime import datetime, timezone
from pathlib import Path
import threading
from dotenv import load_dotenv
from apify_client import ApifyClient
from openai import AsyncOpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from typing import List, Dict, Tuple, Optional
import subprocess
import time

# Load environment variables
load_dotenv('.env.local')

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
TEMP_DIR = Path('/tmp/instagram')

# Import Supabase for progress tracking
from supabase import create_client, Client

# Apify Actor ID for Instagram Profile Scraper
APIFY_ACTOR = 'apify/instagram-profile-scraper'
MAX_POSTS = 12  # Instagram's public API only exposes ~12 recent posts without auth

# BATCHING SETTINGS - Optimized for Starter plan
PROFILES_PER_BATCH = 25  # Batch 25 profiles per Apify run (balance speed vs timeout risk)
APIFY_TIMEOUT_SECS = 900  # 15 min timeout for batch (longer than single profile)
CONCURRENT_APIFY_RUNS = 1  # Starter plan: only 1 concurrent run realistically

# Image download concurrency
IMAGE_DOWNLOAD_CONCURRENCY = 20  # Parallel image downloads per batch

db_lock = Lock()  # Thread-safe database operations

# Get project root (2 levels up from this script)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def update_pipeline_progress(
    supabase_client: Client,
    pipeline_run_id: str,
    total_items: int,
    processed_items: int,
    failed_items: int
):
    """Update pipeline_runs table with progress"""
    if not pipeline_run_id:
        return

    try:
        supabase_client.table("pipeline_runs").update({
            "total_items": total_items,
            "processed_items": processed_items,
            "failed_items": failed_items,
        }).eq("id", pipeline_run_id).execute()
    except Exception as e:
        print(f"⚠️  Warning: Failed to update pipeline progress: {e}")


class HeartbeatThread:
    """Background thread that sends heartbeat every 30 seconds to detect stale jobs"""

    MAX_CONSECUTIVE_FAILURES = 5

    def __init__(self, supabase_client: Client, pipeline_run_id: str, interval: int = 30):
        self.supabase_client = supabase_client
        self.pipeline_run_id = pipeline_run_id
        self.interval = interval
        self.stop_event = threading.Event()
        self.thread = None
        self.failure_count = 0
        self.success_count = 0

    def _heartbeat_loop(self):
        """Send heartbeat every interval seconds until stopped"""
        while not self.stop_event.wait(self.interval):
            try:
                self.supabase_client.table("pipeline_runs").update({
                    "last_heartbeat_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", self.pipeline_run_id).execute()
                self.failure_count = 0
                self.success_count += 1
            except Exception as e:
                self.failure_count += 1
                print(f"⚠️  Heartbeat failed ({self.failure_count}/{self.MAX_CONSECUTIVE_FAILURES}): {e}")

                if self.failure_count >= self.MAX_CONSECUTIVE_FAILURES:
                    print(f"❌ Too many consecutive heartbeat failures")
                    self.stop_event.set()
                    return

    def start(self):
        """Start the heartbeat thread"""
        if not self.pipeline_run_id:
            return

        try:
            self.supabase_client.table("pipeline_runs").update({
                "last_heartbeat_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", self.pipeline_run_id).execute()
            print("💓 Heartbeat thread started (30s interval)")
        except Exception as e:
            print(f"⚠️  Initial heartbeat failed: {e}")
            return

        self.thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.thread.start()

    def stop(self):
        """Stop the heartbeat thread"""
        if self.thread:
            self.stop_event.set()
            self.thread.join(timeout=30)
            print(f"💓 Heartbeat thread stopped (sent {self.success_count} heartbeats)")


def validate_instagram_handle(handle: str) -> bool:
    """Validate Instagram handle format"""
    if not handle or len(handle) > 30:
        return False
    return bool(re.match(r'^[a-zA-Z0-9._]+$', handle))


def sanitize_artist_id(artist_id: str) -> str:
    """Sanitize artist ID to prevent path traversal"""
    if not re.match(r'^[a-f0-9\-]{36}$', artist_id):
        raise ValueError(f"Invalid artist_id format: {artist_id}")
    return artist_id


def connect_db():
    """Connect to PostgreSQL database"""
    if not DATABASE_URL:
        print("❌ Missing DATABASE_URL in .env.local")
        sys.exit(1)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)


def get_pending_artists(conn, limit=None):
    """Get artists that need scraping (no portfolio images yet)
    Uses artist_pipeline_state for blacklist checks.
    """
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.instagram_handle, a.name
        FROM artists a
        LEFT JOIN artist_pipeline_state ps ON ps.artist_id = a.id
        WHERE a.instagram_private != TRUE
        AND (ps.scraping_blacklisted IS NULL OR ps.scraping_blacklisted = FALSE)
        AND a.deleted_at IS NULL
        AND a.instagram_handle IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM portfolio_images pi WHERE pi.artist_id = a.id
        )
        ORDER BY a.created_at
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    artists = cursor.fetchall()
    cursor.close()

    return artists


def create_scraping_jobs_batch(conn, artist_ids: List[str]) -> Dict[str, str]:
    """Create scraping jobs for multiple artists, return mapping of artist_id -> job_id"""
    with db_lock:
        cursor = conn.cursor()
        job_mapping = {}

        for artist_id in artist_ids:
            cursor.execute("""
                INSERT INTO scraping_jobs (artist_id, status, started_at)
                VALUES (%s, 'running', NOW())
                RETURNING id
            """, (artist_id,))
            job_id = cursor.fetchone()[0]
            job_mapping[artist_id] = job_id

            # Update pipeline status in artist_pipeline_state (upsert)
            cursor.execute("""
                INSERT INTO artist_pipeline_state (artist_id, pipeline_status, updated_at)
                VALUES (%s, 'scraping', NOW())
                ON CONFLICT (artist_id) DO UPDATE SET
                    pipeline_status = 'scraping',
                    updated_at = NOW()
            """, (artist_id,))

        conn.commit()
        cursor.close()

        return job_mapping


def update_scraping_job(conn, job_id, status, images_scraped=0, error_message=None, artist_id=None):
    """Update scraping job status (thread-safe)"""
    with db_lock:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE scraping_jobs
            SET status = %s,
                images_scraped = %s,
                error_message = %s,
                completed_at = CASE WHEN %s = 'completed' THEN NOW() ELSE completed_at END
            WHERE id = %s
        """, (status, images_scraped, error_message, status, job_id))

        # Update pipeline status in artist_pipeline_state if artist_id provided
        if artist_id:
            if status == 'completed':
                cursor.execute("""
                    INSERT INTO artist_pipeline_state (artist_id, pipeline_status, updated_at)
                    VALUES (%s, 'pending_embeddings', NOW())
                    ON CONFLICT (artist_id) DO UPDATE SET
                        pipeline_status = 'pending_embeddings',
                        updated_at = NOW()
                """, (artist_id,))
            elif status == 'failed':
                cursor.execute("""
                    INSERT INTO artist_pipeline_state (artist_id, pipeline_status, updated_at)
                    VALUES (%s, 'failed', NOW())
                    ON CONFLICT (artist_id) DO UPDATE SET
                        pipeline_status = 'failed',
                        updated_at = NOW()
                """, (artist_id,))

        conn.commit()
        cursor.close()


def update_artist_profile_metadata(conn, artist_id, profile_image_url, follower_count):
    """Update artist profile metadata (thread-safe)"""
    with db_lock:
        cursor = conn.cursor()

        # Update profile metadata on artists table
        cursor.execute("""
            UPDATE artists
            SET profile_image_url = %s,
                follower_count = %s
            WHERE id = %s
        """, (profile_image_url, follower_count, artist_id))

        # Update last_scraped_at in artist_pipeline_state (upsert)
        # NOTE: pipeline_status is intentionally NOT updated here -
        # it's managed by create_scraping_jobs_batch/update_scraping_job
        cursor.execute("""
            INSERT INTO artist_pipeline_state (artist_id, last_scraped_at, updated_at)
            VALUES (%s, NOW(), NOW())
            ON CONFLICT (artist_id) DO UPDATE SET
                last_scraped_at = NOW(),
                updated_at = NOW()
        """, (artist_id,))

        conn.commit()
        cursor.close()


async def download_image_async(
    session: aiohttp.ClientSession,
    url: str,
    dest_path: Path,
    timeout: int = 30
) -> bool:
    """Download a single image asynchronously"""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
            if response.status == 200:
                content = await response.read()
                with open(dest_path, 'wb') as f:
                    f.write(content)
                return True
    except Exception as e:
        print(f"      ⚠️  Download failed for {dest_path.name}: {e}")
    return False


async def download_images_parallel(
    downloads: List[Tuple[str, Path]],
    concurrency: int = IMAGE_DOWNLOAD_CONCURRENCY
) -> Dict[Path, bool]:
    """Download multiple images in parallel, return success status for each"""
    connector = aiohttp.TCPConnector(limit=concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            download_image_async(session, url, path)
            for url, path in downloads
        ]
        results = await asyncio.gather(*tasks)
        return {path: success for (_, path), success in zip(downloads, results)}


def scrape_batch_profiles(
    apify_client: ApifyClient,
    artists: List[Tuple[str, str, str]],  # (artist_id, handle, name)
) -> Dict[str, Dict]:
    """
    Scrape multiple Instagram profiles in a SINGLE Apify actor run.
    Returns dict mapping artist_id -> result data
    """
    # Validate and normalize handles
    valid_artists = []
    handle_to_artist = {}  # Map handle -> (artist_id, name)

    for artist_id, handle, name in artists:
        if validate_instagram_handle(handle):
            normalized = handle.lower().strip()
            valid_artists.append((artist_id, normalized, name))
            handle_to_artist[normalized] = (artist_id, name)
        else:
            print(f"   ⚠️  Invalid handle: {handle}")

    if not valid_artists:
        return {}

    usernames = [h for _, h, _ in valid_artists]
    print(f"\n📦 BATCH SCRAPE: {len(usernames)} profiles in single Apify run")
    print(f"   Profiles: {', '.join(usernames[:5])}{'...' if len(usernames) > 5 else ''}")

    # Prepare Apify actor input with ALL usernames
    run_input = {
        "usernames": usernames,
        "resultsLimit": MAX_POSTS,
        "resultsType": "posts",
        "searchType": "user",
        "searchLimit": len(usernames),
        "addParentData": False
    }

    try:
        # Run the Actor with extended timeout for batch
        print(f"   ⏳ Running Apify actor (timeout: {APIFY_TIMEOUT_SECS}s)...")
        start_time = time.time()
        run = apify_client.actor(APIFY_ACTOR).call(
            run_input=run_input,
            timeout_secs=APIFY_TIMEOUT_SECS
        )
        elapsed = time.time() - start_time
        print(f"   ✅ Apify run completed in {elapsed:.1f}s")

        # Fetch results from the run's dataset
        results = []
        for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)

        print(f"   📊 Got {len(results)} profile results")

        # Process each profile result
        batch_results = {}

        for profile in results:
            # Match result to artist by username
            username = profile.get('username', '').lower()
            if username not in handle_to_artist:
                print(f"      ⚠️  Unknown username in results: {username}")
                continue

            artist_id, name = handle_to_artist[username]

            # Extract profile metadata
            profile_pic_url = profile.get('profilePicUrlHD') or profile.get('profilePicUrl')
            follower_count = profile.get('followersCount', 0)
            posts = profile.get('latestPosts', [])

            batch_results[artist_id] = {
                'username': username,
                'name': name,
                'profile_pic_url': profile_pic_url,
                'follower_count': follower_count,
                'posts': posts,
                'error': None
            }

        # Mark missing profiles as failed
        for artist_id, handle, name in valid_artists:
            if artist_id not in batch_results:
                batch_results[artist_id] = {
                    'username': handle,
                    'name': name,
                    'profile_pic_url': None,
                    'follower_count': 0,
                    'posts': [],
                    'error': 'No data returned (private or invalid profile)'
                }

        return batch_results

    except Exception as e:
        print(f"   ❌ Apify batch run failed: {e}")
        # Return all as failed
        return {
            artist_id: {
                'username': handle,
                'name': name,
                'profile_pic_url': None,
                'follower_count': 0,
                'posts': [],
                'error': str(e)
            }
            for artist_id, handle, name in valid_artists
        }


def process_batch_results(
    batch_results: Dict[str, Dict],
    conn,
    job_mapping: Dict[str, str]
) -> Tuple[int, int, int]:
    """
    Process results from a batch scrape:
    - Download images in parallel
    - Save to temp directories
    - Update database

    Returns (total_images, successful_artists, failed_artists)
    """
    total_images = 0
    successful = 0
    failed = 0

    # Collect all image downloads across all artists
    all_downloads: List[Tuple[str, Path, str, Dict]] = []  # (url, path, artist_id, metadata)

    print(f"\n📥 Processing {len(batch_results)} artist results...")

    for artist_id, data in batch_results.items():
        job_id = job_mapping.get(artist_id)

        if data['error']:
            print(f"   ❌ {data['name']} (@{data['username']}): {data['error']}")
            if job_id:
                update_scraping_job(conn, job_id, 'failed', 0, data['error'], artist_id)
            failed += 1
            continue

        # Update profile metadata
        update_artist_profile_metadata(
            conn, artist_id,
            data['profile_pic_url'],
            data['follower_count']
        )

        # Prepare artist directory
        safe_artist_id = sanitize_artist_id(artist_id)
        artist_dir = TEMP_DIR / safe_artist_id
        artist_dir.mkdir(parents=True, exist_ok=True)

        # Queue image downloads
        posts = data['posts']
        artist_metadata = []

        for post in posts:
            # Skip videos
            if post.get('type') == 'Video':
                continue

            image_url = post.get('displayUrl')
            post_id = post.get('shortCode')

            if not image_url or not post_id:
                continue

            dest_path = artist_dir / f"{post_id}.jpg"

            metadata = {
                'post_id': post_id,
                'post_url': post.get('url', f'https://instagram.com/p/{post_id}/'),
                'caption': post.get('caption', ''),
                'timestamp': post.get('timestamp', datetime.now().isoformat()),
                'likes': post.get('likesCount', 0),
            }

            all_downloads.append((image_url, dest_path, artist_id, metadata))
            artist_metadata.append(metadata)

        # Store metadata reference for this artist
        batch_results[artist_id]['_metadata'] = artist_metadata
        batch_results[artist_id]['_dir'] = artist_dir

    # Download ALL images in parallel
    if all_downloads:
        print(f"\n📥 Downloading {len(all_downloads)} images in parallel...")
        start_time = time.time()

        # Create download list (url, path) tuples
        download_list = [(url, path) for url, path, _, _ in all_downloads]

        # Run async downloads
        download_results = asyncio.run(download_images_parallel(download_list))

        elapsed = time.time() - start_time
        successful_downloads = sum(1 for v in download_results.values() if v)
        print(f"   ✅ Downloaded {successful_downloads}/{len(all_downloads)} images in {elapsed:.1f}s")

        # Build mapping of artist_id -> successful downloads
        artist_successful_posts = {}
        for url, path, artist_id, metadata in all_downloads:
            if download_results.get(path, False):
                if artist_id not in artist_successful_posts:
                    artist_successful_posts[artist_id] = []
                artist_successful_posts[artist_id].append(metadata)

        # Finalize each artist
        for artist_id, data in batch_results.items():
            if data.get('error'):
                continue

            job_id = job_mapping.get(artist_id)
            artist_dir = data.get('_dir')

            if not artist_dir:
                continue

            successful_metadata = artist_successful_posts.get(artist_id, [])

            if successful_metadata:
                # Save metadata file
                metadata_file = artist_dir / 'metadata.json'
                with open(metadata_file, 'w') as f:
                    json.dump(successful_metadata, f, indent=2)

                # Create completion lock file
                lock_file = artist_dir / '.complete'
                lock_file.touch()

                images_count = len(successful_metadata)
                total_images += images_count
                successful += 1

                print(f"   ✅ {data['name']} (@{data['username']}): {images_count} images")

                if job_id:
                    update_scraping_job(conn, job_id, 'completed', images_count, None, artist_id)
            else:
                failed += 1
                print(f"   ❌ {data['name']} (@{data['username']}): No images downloaded")

                if job_id:
                    update_scraping_job(conn, job_id, 'failed', 0, 'No images downloaded', artist_id)
    else:
        # No downloads queued
        for artist_id, data in batch_results.items():
            if not data.get('error'):
                failed += 1
                job_id = job_mapping.get(artist_id)
                if job_id:
                    update_scraping_job(conn, job_id, 'failed', 0, 'No posts found', artist_id)

    return total_images, successful, failed


def main():
    """Main scraping workflow - BATCHED for Starter plan efficiency"""
    print("🤖 Instagram Portfolio Scraper (Apify - BATCHED)\n")
    print(f"⚡ Optimized for Starter plan: {PROFILES_PER_BATCH} profiles per Apify run\n")

    # Check for Apify token
    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN in .env.local")
        sys.exit(1)

    # Initialize Apify client
    apify_client = ApifyClient(APIFY_API_TOKEN)

    # Create temp directory
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Connect to database
    print("🔌 Connecting to database...")
    conn = None
    heartbeat = None

    try:
        conn = connect_db()
        print("✅ Connected\n")

        # Get pipeline run ID for progress tracking
        pipeline_run_id = os.getenv("PIPELINE_RUN_ID")
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if pipeline_run_id and not re.match(uuid_pattern, pipeline_run_id, re.IGNORECASE):
            print("⚠️  Invalid PIPELINE_RUN_ID format, progress tracking disabled\n")
            pipeline_run_id = None

        # Initialize Supabase client for progress tracking
        supabase_client = None
        if pipeline_run_id:
            try:
                SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
                SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

                if SUPABASE_URL and SUPABASE_SERVICE_KEY:
                    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
                    print(f"✅ Progress tracking enabled (run ID: {pipeline_run_id[:8]}...)")
            except Exception as e:
                print(f"⚠️  Progress tracking disabled: {e}\n")

        # Get pending artists
        print("📋 Finding artists to scrape...")
        TEST_LIMIT = None  # Set to integer for testing (e.g., 50)
        artists = get_pending_artists(conn, limit=TEST_LIMIT)

        if not artists:
            print("✅ No artists to scrape (all completed)")
            return

        print(f"Found {len(artists)} artists to scrape")
        num_batches = (len(artists) + PROFILES_PER_BATCH - 1) // PROFILES_PER_BATCH
        print(f"Will process in {num_batches} batches of {PROFILES_PER_BATCH}\n")

        # Update progress tracking
        if supabase_client and pipeline_run_id:
            update_pipeline_progress(supabase_client, pipeline_run_id, len(artists), 0, 0)

        # Start heartbeat
        if supabase_client and pipeline_run_id:
            heartbeat = HeartbeatThread(supabase_client, pipeline_run_id, interval=30)
            heartbeat.start()

        # Process in batches
        total_images = 0
        total_successful = 0
        total_failed = 0

        for batch_idx in range(0, len(artists), PROFILES_PER_BATCH):
            batch = artists[batch_idx:batch_idx + PROFILES_PER_BATCH]
            batch_num = batch_idx // PROFILES_PER_BATCH + 1

            print(f"\n{'='*60}")
            print(f"📦 BATCH {batch_num}/{num_batches} ({len(batch)} artists)")
            print(f"{'='*60}")

            # Create scraping jobs for this batch
            artist_ids = [a[0] for a in batch]
            job_mapping = create_scraping_jobs_batch(conn, artist_ids)

            # Scrape batch via single Apify run
            batch_results = scrape_batch_profiles(apify_client, batch)

            # Process results (download images, save to disk)
            images, successful, failed = process_batch_results(batch_results, conn, job_mapping)

            total_images += images
            total_successful += successful
            total_failed += failed

            # Progress update
            processed = batch_idx + len(batch)
            percentage = (processed / len(artists)) * 100
            print(f"\n📊 Overall Progress: {percentage:.1f}% ({processed}/{len(artists)})")
            print(f"   Images: {total_images} | Success: {total_successful} | Failed: {total_failed}")

            # Update pipeline progress
            if supabase_client and pipeline_run_id:
                update_pipeline_progress(
                    supabase_client, pipeline_run_id,
                    len(artists), total_successful, total_failed
                )

            # Process uploaded images (thumbnails, DB insert)
            print("\n🖼️  Processing batch images...")
            try:
                subprocess.run(
                    ["npm", "run", "process-batch"],
                    check=True,
                    cwd=str(PROJECT_ROOT),
                    timeout=300,
                    capture_output=True
                )
                print("   ✅ Batch images processed")
            except subprocess.TimeoutExpired:
                print("   ⚠️  Image processing timed out")
            except subprocess.CalledProcessError as e:
                print(f"   ⚠️  Image processing error: {e}")

        # Final summary
        print(f"\n{'='*60}")
        print("✅ SCRAPING COMPLETE")
        print(f"{'='*60}")
        print(f"📊 Total images: {total_images}")
        print(f"✅ Successful artists: {total_successful}")
        print(f"❌ Failed artists: {total_failed}")
        print(f"\n📋 Next steps:")
        print(f"   1. Generate embeddings: python3 scripts/embeddings/local_batch_embeddings.py")
        print(f"   2. Rebuild vector index: npx tsx scripts/embeddings/create-vector-index.ts")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if heartbeat:
            heartbeat.stop()
        if conn:
            conn.close()
            print("✅ Database connection closed")


if __name__ == '__main__':
    main()
