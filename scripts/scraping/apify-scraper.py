#!/usr/bin/env python3
"""
Instagram Portfolio Scraper using Apify
Downloads Instagram posts for tattoo artists with resumability
Filters non-tattoo images using GPT-5-nano vision classification
"""

import psycopg2
import os
import sys
import json
import re
import asyncio
import base64
from datetime import datetime, timezone
from pathlib import Path
import threading
from dotenv import load_dotenv
from apify_client import ApifyClient
from openai import AsyncOpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from typing import List, Dict
import subprocess
import time
import signal
import argparse

# Use threading.Event for proper thread synchronization
shutdown_event = threading.Event()
_signal_count = 0

def handle_shutdown_signal(signum, frame):
    """Handle SIGTERM/SIGINT for graceful shutdown"""
    global _signal_count
    _signal_count += 1
    signal_name = "SIGTERM" if signum == signal.SIGTERM else "SIGINT"

    if _signal_count == 1:
        print(f"\n⚠️  {signal_name} received, finishing current batch...")
        shutdown_event.set()
    else:
        print(f"\n❌ {signal_name} received {_signal_count} times - forcing exit")
        sys.exit(1)

# Register signal handlers
signal.signal(signal.SIGTERM, handle_shutdown_signal)
signal.signal(signal.SIGINT, handle_shutdown_signal)

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

# GPT-5-nano classification settings
BATCH_SIZE = 5000  # Max concurrent requests (Tier 5 supports 30k RPM)

# Parallel scraping settings
CONCURRENT_APIFY_CALLS = 30  # Limited by Apify account memory (32GB / ~1GB per actor)
db_lock = Lock()  # Thread-safe database operations

# Get project root (2 levels up from this script)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class BackgroundProcessManager:
    """Manages non-blocking subprocess execution with concurrent process limits"""

    def __init__(self, max_concurrent: int = 2):
        self.active_processes: List[Dict] = []
        self.max_concurrent = max_concurrent
        self.completed_processes: List[Dict] = []

    def launch_process(
        self,
        command_args: List[str],
        name: str,
        timeout: int = 600
    ) -> None:
        """Launch subprocess in background, blocking if too many running"""
        # Validate input type
        if not isinstance(command_args, list):
            raise TypeError(f"command_args must be a list, got {type(command_args)}")

        if not command_args:
            raise ValueError("command_args cannot be empty")

        if not all(isinstance(arg, str) for arg in command_args):
            raise TypeError("All command arguments must be strings")

        # Wait for available slot
        while len(self.active_processes) >= self.max_concurrent:
            self._cleanup_finished()
            if len(self.active_processes) >= self.max_concurrent:
                time.sleep(2)  # Check every 2 seconds

        # Launch non-blocking process (redirect to DEVNULL to prevent pipe deadlock)
        process = subprocess.Popen(
            command_args,
            cwd=str(PROJECT_ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        self.active_processes.append({
            'process': process,
            'name': name,
            'start_time': time.time(),
            'timeout': timeout
        })

        print(f"   🔄 Launched background: {name}")

    def _cleanup_finished(self) -> None:
        """Remove completed processes from active list"""
        still_running = []
        for p_info in self.active_processes:
            returncode = p_info['process'].poll()

            # Check timeout
            elapsed = time.time() - p_info['start_time']
            if elapsed > p_info['timeout'] and returncode is None:
                p_info['process'].kill()
                p_info['process'].wait()  # Reap zombie process
                duration = time.time() - p_info['start_time']
                print(f"   ⚠️  {p_info['name']} timed out after {duration:.1f}s")
                self.completed_processes.append(p_info)
            elif returncode is not None:
                # Process finished - reap zombie
                p_info['process'].wait()
                duration = time.time() - p_info['start_time']
                if returncode == 0:
                    print(f"   ✅ {p_info['name']} completed in {duration:.1f}s")
                else:
                    print(f"   ❌ {p_info['name']} failed after {duration:.1f}s (exit code {returncode})")
                self.completed_processes.append(p_info)
            else:
                # Still running
                still_running.append(p_info)

        self.active_processes = still_running

    def wait_all(self, timeout: int = 3600) -> Dict[str, int]:
        """Wait for all background processes to complete, return stats"""
        start_wait = time.time()

        while self.active_processes:
            self._cleanup_finished()

            if time.time() - start_wait > timeout:
                # Force kill remaining
                for p_info in self.active_processes:
                    p_info['process'].kill()
                    print(f"   ⚠️  Force killed {p_info['name']} (global timeout)")
                self.active_processes = []
                break

            time.sleep(2)

        # Return stats
        successful = sum(1 for p in self.completed_processes if p['process'].returncode == 0)
        failed = len(self.completed_processes) - successful

        return {
            'total': len(self.completed_processes),
            'successful': successful,
            'failed': failed
        }


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

    # Exit after this many consecutive failures (5 failures = 2.5 min of no heartbeats)
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
                self.failure_count = 0  # Reset on success
                self.success_count += 1
            except Exception as e:
                self.failure_count += 1
                print(f"⚠️  Heartbeat failed ({self.failure_count}/{self.MAX_CONSECUTIVE_FAILURES}): {e}")

                if self.failure_count >= self.MAX_CONSECUTIVE_FAILURES:
                    print(f"❌ Too many consecutive heartbeat failures - job will be marked stale")
                    print(f"   Total successful heartbeats: {self.success_count}")
                    # Don't force exit - let the job continue and be auto-cancelled
                    # This is safer than os._exit() which could corrupt state
                    self.stop_event.set()
                    return

    def start(self):
        """Start the heartbeat thread"""
        if not self.pipeline_run_id:
            return

        # Send initial heartbeat immediately
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
            self.thread.join(timeout=30)  # Increased timeout for graceful shutdown
            if self.thread.is_alive():
                print("⚠️  Heartbeat thread didn't stop cleanly")
            else:
                print(f"💓 Heartbeat thread stopped (sent {self.success_count} heartbeats)")


def validate_instagram_handle(handle: str) -> bool:
    """Validate Instagram handle format"""
    if not handle or len(handle) > 30:
        return False
    return bool(re.match(r'^[a-zA-Z0-9._]+$', handle))

def sanitize_artist_id(artist_id: str) -> str:
    """Sanitize artist ID to prevent path traversal"""
    # UUID format: lowercase hex + hyphens
    if not re.match(r'^[a-f0-9\-]{36}$', artist_id):
        raise ValueError(f"Invalid artist_id format: {artist_id}")
    return artist_id

def connect_db():
    """Connect to PostgreSQL database"""
    if not DATABASE_URL:
        print("❌ Missing DATABASE_URL in .env.local")
        print("   Add: DATABASE_URL=postgresql://...")
        sys.exit(1)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

def get_pending_artists(conn, limit=None):
    """Get artists that need scraping (no portfolio images yet)

    This query matches the dashboard's 'Need Scraping' count exactly:
    - Artists without any portfolio_images are included
    - Artists WITH images are excluded (already scraped successfully)
    - Failed scraping_jobs are retryable if artist still has no images
    """
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.instagram_handle, a.name
        FROM artists a
        WHERE a.instagram_private != TRUE
        AND (a.scraping_blacklisted IS NULL OR a.scraping_blacklisted = FALSE)
        AND a.deleted_at IS NULL
        AND a.instagram_handle IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM portfolio_images pi WHERE pi.artist_id = a.id
        )
        ORDER BY a.created_at
    """

    # Add LIMIT using parameterized query to prevent SQL injection
    if limit is not None:
        if not isinstance(limit, int) or limit < 0:
            raise ValueError(f"Invalid limit value: {limit}")
        query += " LIMIT %s"
        cursor.execute(query, (limit,))
    else:
        cursor.execute(query)

    artists = cursor.fetchall()
    cursor.close()

    return artists

def get_artists_needing_profile_images(conn, limit=None):
    """Get artists that need profile image scraping (profile_storage_path is NULL)

    Used for --profile-only mode to backfill profile images without re-scraping portfolio.
    """
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.instagram_handle, a.name
        FROM artists a
        WHERE a.instagram_private != TRUE
        AND (a.scraping_blacklisted IS NULL OR a.scraping_blacklisted = FALSE)
        AND a.deleted_at IS NULL
        AND a.instagram_handle IS NOT NULL
        AND a.profile_storage_path IS NULL
        ORDER BY a.created_at
    """

    # Add LIMIT using parameterized query to prevent SQL injection
    if limit is not None:
        if not isinstance(limit, int) or limit < 0:
            raise ValueError(f"Invalid limit value: {limit}")
        query += " LIMIT %s"
        cursor.execute(query, (limit,))
    else:
        cursor.execute(query)

    artists = cursor.fetchall()
    cursor.close()

    return artists

def create_scraping_job(conn, artist_id):
    """Create a scraping job entry (thread-safe)"""
    with db_lock:
        cursor = conn.cursor()

        query = """
            INSERT INTO scraping_jobs (artist_id, status, started_at)
            VALUES (%s, 'running', NOW())
            RETURNING id
        """

        cursor.execute(query, (artist_id,))
        job_id = cursor.fetchone()[0]

        # Update artist pipeline status
        cursor.execute(
            "UPDATE artists SET pipeline_status = 'scraping' WHERE id = %s",
            (artist_id,)
        )

        conn.commit()
        cursor.close()

        return job_id

def update_scraping_job(conn, job_id, status, images_scraped=0, error_message=None, artist_id=None):
    """Update scraping job status (thread-safe)"""
    with db_lock:
        cursor = conn.cursor()

        query = """
            UPDATE scraping_jobs
            SET status = %s,
                images_scraped = %s,
                error_message = %s,
                completed_at = CASE WHEN %s = 'completed' THEN NOW() ELSE completed_at END
            WHERE id = %s
        """

        cursor.execute(query, (status, images_scraped, error_message, status, job_id))

        # Update artist pipeline status if artist_id provided
        if artist_id:
            if status == 'completed':
                cursor.execute(
                    "UPDATE artists SET pipeline_status = 'pending_embeddings' WHERE id = %s",
                    (artist_id,)
                )
            elif status == 'failed':
                cursor.execute(
                    "UPDATE artists SET pipeline_status = 'failed' WHERE id = %s",
                    (artist_id,)
                )

        conn.commit()
        cursor.close()

def update_artist_profile_metadata(conn, artist_id, profile_image_url, follower_count):
    """Update artist profile metadata (thread-safe)"""
    with db_lock:
        cursor = conn.cursor()

        query = """
            UPDATE artists
            SET profile_image_url = %s,
                follower_count = %s,
                last_scraped_at = NOW()
            WHERE id = %s
        """

        cursor.execute(query, (profile_image_url, follower_count, artist_id))
        conn.commit()
        cursor.close()

async def classify_image_async(client: AsyncOpenAI, image_path: Path) -> bool:
    """
    Classify a single image using GPT-5-nano vision (Flex tier).
    Returns True if image is a tattoo, False otherwise.
    """
    try:
        # Read and encode image
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()

        # Call GPT-5-nano with Flex tier
        response = await client.chat.completions.create(
            model="gpt-5-nano",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Is this a photo of a tattoo (ink on someone's body)? Answer only 'yes' or 'no'."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}",
                            "detail": "low"
                        }
                    }
                ]
            }],
            max_completion_tokens=500,  # Allow for reasoning tokens + output
            service_tier="flex"  # Use Flex tier (1-5 min latency, 50% discount)
        )

        # Parse response
        result = response.choices[0].message.content
        if result:
            return result.strip().lower() == 'yes'
        return False

    except Exception as e:
        print(f"      ⚠️  Classification error for {image_path.name}: {e}")
        return False  # Conservative: skip on error

async def batch_classify_images(image_paths: list[Path]) -> list[bool]:
    """
    Classify multiple images in parallel using GPT-5-nano Flex tier.
    Returns list of booleans (True = tattoo, False = not tattoo).
    """
    if not OPENAI_API_KEY:
        print("   ⚠️  OPENAI_API_KEY not set, skipping classification")
        return [True] * len(image_paths)  # Assume all are tattoos if no API key

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Process in batches of BATCH_SIZE (5000) to respect rate limits
    all_results = []

    for i in range(0, len(image_paths), BATCH_SIZE):
        batch = image_paths[i:i+BATCH_SIZE]
        print(f"      🔍 Classifying batch {i//BATCH_SIZE + 1} ({len(batch)} images)...")

        # Submit all classifications in parallel
        tasks = [classify_image_async(client, path) for path in batch]
        results = await asyncio.gather(*tasks)
        all_results.extend(results)

        print(f"      ✅ Batch {i//BATCH_SIZE + 1} complete")

    return all_results

def scrape_profile_image_only(apify_client, instagram_handle, artist_id):
    """Scrape only the profile image (no portfolio posts) - for --profile-only mode"""
    try:
        # Validate handle
        if not validate_instagram_handle(instagram_handle):
            return False, f"Invalid Instagram handle format: {instagram_handle}", None

        # Normalize to lowercase
        instagram_handle = instagram_handle.lower().strip()

        # Sanitize artist_id
        safe_artist_id = sanitize_artist_id(artist_id)
        artist_dir = TEMP_DIR / safe_artist_id
        artist_dir.mkdir(parents=True, exist_ok=True)

        print(f"   📥 Fetching profile for @{instagram_handle}...")

        # Prepare Apify actor input - only need profile data, not posts
        run_input = {
            "usernames": [instagram_handle],
            "resultsLimit": 1,  # Only need profile, not posts
            "resultsType": "posts",
            "searchType": "user",
            "searchLimit": 1,
            "addParentData": False
        }

        # Run the Actor
        run = apify_client.actor(APIFY_ACTOR).call(run_input=run_input, timeout_secs=120)

        # Fetch results
        results = []
        for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)
            break  # Only need first result

        if not results:
            return False, "Profile not found (private or invalid)", None

        profile = results[0]

        # Extract and download profile image
        profile_pic_url = profile.get('profilePicUrlHD') or profile.get('profilePicUrl')
        if not profile_pic_url:
            return False, "No profile image URL found", None

        print(f"   📷 Downloading profile image...")
        try:
            import requests
            MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

            response = requests.get(profile_pic_url, timeout=30, stream=True)
            if response.status_code == 200:
                # Validate Content-Type
                content_type = response.headers.get('Content-Type', '')
                if not content_type.startswith('image/'):
                    return False, f"Invalid content type: {content_type}", None

                # Check Content-Length header if present
                content_length = response.headers.get('Content-Length')
                if content_length and int(content_length) > MAX_PROFILE_IMAGE_SIZE:
                    return False, f"Image too large: {content_length} bytes", None

                # Stream download with size check
                profile_path = artist_dir / f"{safe_artist_id}_profile.jpg"
                downloaded = 0
                with open(profile_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        downloaded += len(chunk)
                        if downloaded > MAX_PROFILE_IMAGE_SIZE:
                            f.close()
                            profile_path.unlink()  # Delete partial file
                            return False, "Image exceeds size limit", None
                        f.write(chunk)

                # Validate it's actually an image (check magic bytes)
                with open(profile_path, 'rb') as f:
                    header = f.read(12)  # Read enough bytes for all formats
                    is_jpeg = header.startswith(b'\xff\xd8\xff')
                    is_png = header.startswith(b'\x89PNG\r\n\x1a\n')
                    is_gif = header.startswith(b'GIF87a') or header.startswith(b'GIF89a')
                    if not (is_jpeg or is_png or is_gif):
                        profile_path.unlink()
                        return False, "Downloaded file is not a valid image", None

                # Create .complete marker for process-and-upload.ts
                lock_file = artist_dir / '.complete'
                lock_file.touch()

                print(f"   ✅ Downloaded profile image ({downloaded} bytes)")
                return True, None, profile_pic_url
            else:
                return False, f"Failed to download: HTTP {response.status_code}", None
        except Exception as e:
            return False, f"Download failed: {e}", None

    except Exception as e:
        return False, str(e), None

def scrape_artist_profile(apify_client, instagram_handle, artist_id):
    """Scrape an artist's Instagram profile using Apify"""
    try:
        # Validate handle
        if not validate_instagram_handle(instagram_handle):
            return 0, f"Invalid Instagram handle format: {instagram_handle}", None, None

        # Normalize to lowercase
        instagram_handle = instagram_handle.lower().strip()

        # Sanitize artist_id
        safe_artist_id = sanitize_artist_id(artist_id)
        artist_dir = TEMP_DIR / safe_artist_id
        artist_dir.mkdir(parents=True, exist_ok=True)

        print(f"   📥 Scraping @{instagram_handle} via Apify...")

        # Prepare Apify actor input
        run_input = {
            "usernames": [instagram_handle],
            "resultsLimit": MAX_POSTS,
            "resultsType": "posts",
            "searchType": "user",
            "searchLimit": 1,
            "addParentData": False
        }

        # Run the Actor and wait for it to finish
        print(f"   ⏳ Running Apify actor...")
        run = apify_client.actor(APIFY_ACTOR).call(run_input=run_input, timeout_secs=300)

        # Fetch results from the run's dataset
        results = []
        for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)

        if not results:
            return 0, "No posts found (private or invalid profile)", None, None

        # Extract profile data and latestPosts
        profile = results[0]
        posts = profile.get('latestPosts', [])

        # Extract profile metadata
        profile_pic_url = profile.get('profilePicUrlHD') or profile.get('profilePicUrl')
        follower_count = profile.get('followersCount', 0)

        print(f"   👤 Profile: {follower_count:,} followers")

        # Download profile image to temp directory for later processing
        profile_image_downloaded = False
        MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
        if profile_pic_url:
            print(f"   📷 Profile photo: {profile_pic_url[:60]}...")
            try:
                import requests
                response = requests.get(profile_pic_url, timeout=30, stream=True)
                if response.status_code == 200:
                    # Validate Content-Type
                    content_type = response.headers.get('Content-Type', '')
                    if not content_type.startswith('image/'):
                        print(f"   ⚠️  Invalid content type: {content_type}")
                    else:
                        # Check Content-Length header if present
                        content_length = response.headers.get('Content-Length')
                        if content_length and int(content_length) > MAX_PROFILE_IMAGE_SIZE:
                            print(f"   ⚠️  Profile image too large: {content_length} bytes")
                        else:
                            # Stream download with size check
                            profile_path = artist_dir / f"{safe_artist_id}_profile.jpg"
                            downloaded = 0
                            valid = True
                            with open(profile_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    downloaded += len(chunk)
                                    if downloaded > MAX_PROFILE_IMAGE_SIZE:
                                        valid = False
                                        break
                                    f.write(chunk)

                            if not valid:
                                profile_path.unlink()
                                print(f"   ⚠️  Profile image exceeds size limit")
                            else:
                                # Validate magic bytes (read enough for all formats)
                                with open(profile_path, 'rb') as f:
                                    header = f.read(12)
                                    is_jpeg = header.startswith(b'\xff\xd8\xff')
                                    is_png = header.startswith(b'\x89PNG\r\n\x1a\n')
                                    is_gif = header.startswith(b'GIF87a') or header.startswith(b'GIF89a')
                                    if not (is_jpeg or is_png or is_gif):
                                        profile_path.unlink()
                                        print(f"   ⚠️  Downloaded file is not a valid image")
                                    else:
                                        profile_image_downloaded = True
                                        print(f"   ✅ Downloaded profile image ({downloaded} bytes)")
                else:
                    print(f"   ⚠️  Failed to download profile image: HTTP {response.status_code}")
            except Exception as e:
                print(f"   ⚠️  Failed to download profile image: {e}")

        if not posts:
            return 0, "No posts found in profile", profile_pic_url, follower_count

        print(f"   📸 Processing {len(posts)} posts...")

        # PHASE 1: Download all images to temp paths
        print(f"   📥 Downloading {len(posts)} images...")
        downloaded_images = []

        for item in posts:
            try:
                # Skip videos
                if item.get('type') == 'Video':
                    continue

                # Get image URL from displayUrl field
                image_url = item.get('displayUrl')
                if not image_url:
                    continue

                post_id = item.get('shortCode')
                if not post_id:
                    print(f"      ⚠️  Skipping post without shortCode")
                    continue

                # Download image to temporary path
                import requests
                response = requests.get(image_url, timeout=30)
                if response.status_code == 200:
                    # Save to temp path (will rename later if tattoo)
                    temp_path = artist_dir / f"{post_id}_temp.jpg"
                    with open(temp_path, 'wb') as f:
                        f.write(response.content)

                    # Store image info for classification
                    downloaded_images.append({
                        'temp_path': temp_path,
                        'post_id': post_id,
                        'metadata': {
                            'post_id': post_id,
                            'post_url': item.get('url', f'https://instagram.com/p/{post_id}/'),
                            'caption': item.get('caption', ''),
                            'timestamp': item.get('timestamp', datetime.now().isoformat()),
                            'likes': item.get('likesCount', 0),
                            'is_video': False,
                        }
                    })

                    if len(downloaded_images) % 10 == 0:
                        print(f"      {len(downloaded_images)} images downloaded...")

            except Exception as e:
                print(f"      ⚠️  Failed to download post: {e}")
                continue

        if not downloaded_images:
            return 0, "No images downloaded", None, None

        print(f"   ✅ Downloaded {len(downloaded_images)} images")

        # PHASE 2: Save all images (NO inline classification - will batch classify later)
        print(f"   💾 Saving all images (classification will happen in batch later)...")
        metadata_list = []

        for img_info in downloaded_images:
            temp_path = img_info['temp_path']
            post_id = img_info['post_id']

            # Rename temp → final (save everything for now)
            final_path = artist_dir / f"{post_id}.jpg"
            temp_path.rename(final_path)
            metadata_list.append(img_info['metadata'])

        # Save consolidated metadata (all images)
        metadata_file = artist_dir / 'metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(metadata_list, f, indent=2)

        # Create lock file to signal completion (prevents race condition with process-batch.ts)
        lock_file = artist_dir / '.complete'
        lock_file.touch()

        print(f"   ✅ Saved {len(downloaded_images)} images")
        print(f"   📊 Total downloaded: {len(downloaded_images)} posts")

        return len(downloaded_images), None, profile_pic_url, follower_count

    except Exception as e:
        return 0, str(e), None, None

def process_single_artist(artist_data, apify_client, conn):
    """Process a single artist (thread-safe wrapper)"""
    artist_id, instagram_handle, artist_name, index, total = artist_data

    try:
        print(f"[{index}/{total}] {artist_name} (@{instagram_handle})")

        # Create scraping job
        job_id = create_scraping_job(conn, artist_id)

        try:
            # Scrape profile
            images_scraped, error, profile_pic_url, follower_count = scrape_artist_profile(apify_client, instagram_handle, artist_id)

            if error:
                print(f"   ⚠️  Error: {error}")
                update_scraping_job(conn, job_id, 'failed', images_scraped, error, artist_id)

                # Still save profile metadata if available (even on error)
                if profile_pic_url or follower_count:
                    update_artist_profile_metadata(conn, artist_id, profile_pic_url, follower_count)
                    print(f"   ✅ Saved profile metadata despite error")

                return {'success': False, 'artist_id': artist_id, 'images': 0}
            else:
                update_scraping_job(conn, job_id, 'completed', images_scraped, None, artist_id)

                # Save profile metadata
                update_artist_profile_metadata(conn, artist_id, profile_pic_url, follower_count)
                print(f"   ✅ Saved profile metadata")

                return {'success': True, 'artist_id': artist_id, 'images': images_scraped}

        except Exception as e:
            print(f"   ❌ Unexpected error for {artist_name}: {e}")
            update_scraping_job(conn, job_id, 'failed', 0, str(e), artist_id)
            return {'success': False, 'artist_id': artist_id, 'images': 0}

    except Exception as e:
        print(f"   ❌ Fatal error for {artist_name}: {e}")
        return {'success': False, 'artist_id': artist_id, 'images': 0}

def process_profile_only_artist(artist_data, apify_client, conn):
    """Process a single artist for profile image only (--profile-only mode)"""
    artist_id, instagram_handle, artist_name, index, total = artist_data

    try:
        print(f"[{index}/{total}] {artist_name} (@{instagram_handle})")

        success, error, profile_pic_url = scrape_profile_image_only(apify_client, instagram_handle, artist_id)

        if error:
            print(f"   ⚠️  Error: {error}")
            return {'success': False, 'artist_id': artist_id}
        else:
            # Update legacy profile_image_url field too
            if profile_pic_url:
                update_artist_profile_metadata(conn, artist_id, profile_pic_url, None)
            return {'success': True, 'artist_id': artist_id}

    except Exception as e:
        print(f"   ❌ Fatal error for {artist_name}: {e}")
        return {'success': False, 'artist_id': artist_id}

def main():
    """Main scraping workflow (incremental processing)"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Instagram Portfolio Scraper')
    parser.add_argument('--profile-only', action='store_true',
                        help='Only scrape profile images (no portfolio posts) for artists missing profile_storage_path')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limit number of artists to process (for testing)')
    args = parser.parse_args()

    if args.profile_only:
        print("🤖 Instagram Profile Image Scraper (Profile-Only Mode)\n")
    else:
        print("🤖 Instagram Portfolio Scraper (Apify - Incremental)\n")

    # Check for Apify token
    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN in .env.local")
        print("   1. Sign up at https://apify.com")
        print("   2. Get API token from Settings → Integrations")
        print("   3. Add to .env.local: APIFY_API_TOKEN=apify_api_xxx")
        sys.exit(1)

    # Initialize Apify client
    apify_client = ApifyClient(APIFY_API_TOKEN)

    # Create temp directory
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Connect to database
    print("🔌 Connecting to database...")
    conn = None
    heartbeat = None  # Initialize here so it's accessible in finally block
    try:
        conn = connect_db()
        print("✅ Connected\n")

        # Get pipeline run ID for progress tracking
        # Validate UUID format to prevent SQL injection
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

                    # Initialize pipeline progress with 0 items (will update after counting artists)
                    try:
                        supabase_client.table("pipeline_runs").update({
                            "total_items": 0,
                            "processed_items": 0,
                            "failed_items": 0,
                        }).eq("id", pipeline_run_id).execute()
                        print(f"✅ Pipeline progress initialized for run {pipeline_run_id[:8]}...\n")
                    except Exception as e:
                        print(f"⚠️  Could not initialize pipeline progress: {e}\n")
                else:
                    print("⚠️  Progress tracking disabled (missing Supabase credentials)\n")
            except Exception as e:
                print(f"⚠️  Progress tracking disabled: {e}\n")

        # Get pending artists
        print("📋 Finding artists to scrape...")
        limit = args.limit  # Use command-line limit if provided

        if args.profile_only:
            # Profile-only mode: get artists missing profile_storage_path
            artists = get_artists_needing_profile_images(conn, limit=limit)
            if not artists:
                print("✅ No artists need profile images (all have profile_storage_path)")
                return
            print(f"Found {len(artists)} artists needing profile images\n")
        else:
            # Normal mode: get artists without portfolio images
            artists = get_pending_artists(conn, limit=limit)
            if limit:
                print(f"⚠️  TEST MODE: Limited to {limit} artists")
            if not artists:
                print("✅ No artists to scrape (all completed)")
                return
            print(f"Found {len(artists)} artists to scrape\n")

        # Update progress tracking with actual artist count
        if supabase_client and pipeline_run_id:
            try:
                # Update with actual artist count now that we know it
                supabase_client.table("pipeline_runs").update({
                    "total_items": len(artists),
                }).eq("id", pipeline_run_id).execute()
                print(f"✅ Pipeline total set to {len(artists)} artists\n")
            except Exception as e:
                print(f"⚠️  Could not update pipeline total: {e}\n")

            # Initialize progress counters
            update_pipeline_progress(supabase_client, pipeline_run_id, len(artists), 0, 0)

        # Start heartbeat thread (sends heartbeat every 30s for stale job detection)
        heartbeat = None
        if supabase_client and pipeline_run_id:
            heartbeat = HeartbeatThread(supabase_client, pipeline_run_id, interval=30)
            heartbeat.start()

        # Prepare artist data with indices
        artist_data_list = [
            (artist_id, instagram_handle, artist_name, index, len(artists))
            for index, (artist_id, instagram_handle, artist_name) in enumerate(artists, 1)
        ]

        # Profile-only mode: simpler processing without portfolio images
        if args.profile_only:
            print(f"🚀 Running {CONCURRENT_APIFY_CALLS} artists in parallel (profile-only mode)\n")

            total_success = 0
            total_errors = 0
            completed_count = 0

            try:
                with ThreadPoolExecutor(max_workers=CONCURRENT_APIFY_CALLS) as executor:
                    futures = {
                        executor.submit(process_profile_only_artist, artist_data, apify_client, conn): artist_data
                        for artist_data in artist_data_list
                    }

                    for future in as_completed(futures):
                        try:
                            result = future.result()
                            completed_count += 1

                            if result['success']:
                                total_success += 1
                            else:
                                total_errors += 1

                            percentage = (completed_count / len(artists)) * 100
                            print(f"   📊 Progress: {percentage:.1f}% ({completed_count}/{len(artists)}) - {total_success} profiles downloaded\n")

                            # Update pipeline progress
                            if supabase_client and pipeline_run_id:
                                with db_lock:
                                    update_pipeline_progress(
                                        supabase_client, pipeline_run_id,
                                        len(artists), total_success, total_errors
                                    )

                            # Process profile images every 50 artists
                            if completed_count % 50 == 0:
                                print(f"   🔄 Running process-and-upload for profile images...")
                                subprocess.run(["npm", "run", "process-batch"], check=False, capture_output=True)

                        except Exception as e:
                            print(f"   ❌ Error processing result: {e}")
                            total_errors += 1

            finally:
                # Final process-and-upload run
                print(f"\n🔄 Final processing of profile images...")
                subprocess.run(["npm", "run", "process-batch"], check=False)

            # Summary
            print(f"\n📊 Profile-Only Scraping Summary:")
            print(f"   ✅ Successful: {total_success}")
            print(f"   ❌ Failed: {total_errors}")
            print(f"\n📋 Next steps:")
            print(f"   Run: npm run process-batch (to upload profile images to storage)")
            return

        # Normal mode: full portfolio scraping
        print(f"🚀 Running {CONCURRENT_APIFY_CALLS} artists in parallel\n")
        print(f"📦 Incremental processing:")
        print(f"   - Process/upload every 10 artists")
        print(f"   - Generate embeddings every 50 artists\n")

        # Incremental processing settings
        PROCESS_BATCH_SIZE = 10   # Process/upload every 10 artists
        EMBED_BATCH_SIZE = 50      # Generate embeddings every 50 artists

        # Process artists in parallel using ThreadPoolExecutor
        total_images = 0
        total_errors = 0
        completed_count = 0

        # Initialize background process manager for concurrent processing
        process_manager = BackgroundProcessManager(max_concurrent=2)

        try:
            with ThreadPoolExecutor(max_workers=CONCURRENT_APIFY_CALLS) as executor:
                # Submit all tasks
                futures = {
                    executor.submit(process_single_artist, artist_data, apify_client, conn): artist_data
                    for artist_data in artist_data_list
                }

                # Process results as they complete
                for future in as_completed(futures):
                    try:
                        result = future.result()
                        completed_count += 1

                        if result['success']:
                            total_images += result['images']
                        else:
                            total_errors += 1

                        # Progress update
                        percentage = (completed_count / len(artists)) * 100
                        print(f"   📊 Progress: {percentage:.1f}% ({completed_count}/{len(artists)}) - {total_images} images total\n")

                        # Update pipeline progress (thread-safe with lock)
                        if supabase_client and pipeline_run_id:
                            with db_lock:
                                successful_count = completed_count - total_errors
                                update_pipeline_progress(
                                    supabase_client,
                                    pipeline_run_id,
                                    len(artists),
                                    successful_count,
                                    total_errors
                                )

                        # INCREMENTAL PROCESSING: Process and upload every 10 artists (NON-BLOCKING)
                        if completed_count % PROCESS_BATCH_SIZE == 0:
                            process_manager.launch_process(
                                ["npm", "run", "process-batch"],
                                name=f"Process batch (artists {completed_count-9}-{completed_count})",
                                timeout=600
                            )

                        # INCREMENTAL PROCESSING: Generate embeddings every 50 artists (NON-BLOCKING)
                        if completed_count % EMBED_BATCH_SIZE == 0:
                            process_manager.launch_process(
                                ["npm", "run", "generate-embeddings-batch"],
                                name=f"Embed batch (artists 1-{completed_count})",
                                timeout=1200
                            )

                        # Check for graceful shutdown request
                        if shutdown_event.is_set():
                            print("\n🛑 Shutdown requested - stopping after current batch")
                            # Cancel only pending futures (not running/completed)
                            for future in futures.keys():
                                if not future.done():
                                    future.cancel()
                            break

                    except Exception as e:
                        print(f"   ❌ Future execution error: {e}")
                        total_errors += 1

        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user - canceling pending work...")
            # Cancel pending futures for faster shutdown
            for future in futures.keys():
                if not future.done():
                    future.cancel()
            # Context manager will wait for running futures to complete

        # Report canceled work if shutdown was requested
        if shutdown_event.is_set():
            canceled_count = len(artists) - completed_count
            if canceled_count > 0:
                print(f"⚠️  {canceled_count} artists were not processed due to shutdown")

            # Update final progress
            if supabase_client and pipeline_run_id:
                update_pipeline_progress(
                    supabase_client,
                    pipeline_run_id,
                    len(artists),
                    completed_count - total_errors,
                    total_errors
                )

        # Wait for all background processes to finish
        print("\n⏳ Waiting for background processes to complete...")
        stats = process_manager.wait_all(timeout=3600)  # 1 hour max
        print(f"   Background processes: {stats['successful']}/{stats['total']} successful\n")

        # Final cleanup: process remaining artists
        print("🖼️  Processing final batch...")
        try:
            subprocess.run(
                ["npm", "run", "process-batch"],
                check=True,
                cwd=str(PROJECT_ROOT),
                timeout=600
            )
            print("✅ Final batch processed\n")
        except subprocess.TimeoutExpired:
            print(f"❌ Final batch processing timed out\n")
        except subprocess.CalledProcessError as e:
            print(f"❌ Final batch processing failed: {e}\n")

        # Skip final embeddings - run separately via admin panel to avoid timeout
        print("⏭️  Skipping final embeddings (run separately via admin panel)\n")
        print("   To generate embeddings: Admin Panel → Pipeline → Generate Embeddings\n")

        # Summary
        print("\n✅ Incremental scraping complete!")
        print(f"📁 Images saved to: {TEMP_DIR}")
        print(f"📊 Total images downloaded: {total_images}")
        print(f"✅ Successful: {completed_count - total_errors}")
        print(f"⚠️  Errors: {total_errors}")
        print("\n📋 Next steps:")
        print("   1. Rebuild vector index: npx tsx scripts/embeddings/create-vector-index.ts")
        print("   2. Validate results: npm run validate-scraped-images")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Stop heartbeat thread
        if heartbeat:
            heartbeat.stop()
        if conn:
            conn.close()
            print("✅ Database connection closed")

if __name__ == '__main__':
    main()
