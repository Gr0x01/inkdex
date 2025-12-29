#!/usr/bin/env python3
"""
Instagram Portfolio Scraper using Apify
Downloads Instagram posts for tattoo artists with resumability
"""

import psycopg2
import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from apify_client import ApifyClient

# Load environment variables
load_dotenv('.env.local')

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
TEMP_DIR = Path('/tmp/instagram')

# Apify Actor ID for Instagram Profile Scraper
APIFY_ACTOR = 'apify/instagram-profile-scraper'
MAX_POSTS = 50

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

def get_pending_artists(conn):
    """Get artists that haven't been scraped yet"""
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.instagram_handle, a.name
        FROM artists a
        WHERE a.instagram_private != TRUE
        AND a.id NOT IN (
            SELECT artist_id
            FROM scraping_jobs
            WHERE status = 'completed'
        )
        ORDER BY a.created_at
    """

    cursor.execute(query)
    artists = cursor.fetchall()
    cursor.close()

    return artists

def create_scraping_job(conn, artist_id):
    """Create a scraping job entry"""
    cursor = conn.cursor()

    query = """
        INSERT INTO scraping_jobs (artist_id, status, started_at)
        VALUES (%s, 'running', NOW())
        RETURNING id
    """

    cursor.execute(query, (artist_id,))
    job_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()

    return job_id

def update_scraping_job(conn, job_id, status, images_scraped=0, error_message=None):
    """Update scraping job status"""
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
    conn.commit()
    cursor.close()

def scrape_artist_profile(apify_client, instagram_handle, artist_id):
    """Scrape an artist's Instagram profile using Apify"""
    try:
        # Validate handle
        if not validate_instagram_handle(instagram_handle):
            return 0, f"Invalid Instagram handle format: {instagram_handle}"

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
            return 0, "No posts found (private or invalid profile)"

        # Extract profile data and latestPosts
        profile = results[0]
        posts = profile.get('latestPosts', [])

        if not posts:
            return 0, "No posts found in profile"

        print(f"   📸 Processing {len(posts)} posts...")

        # Process posts and save metadata
        metadata_list = []
        post_count = 0

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

                # Download image
                import requests
                response = requests.get(image_url, timeout=30)
                if response.status_code == 200:
                    # Save image
                    image_path = artist_dir / f"{post_id}.jpg"
                    with open(image_path, 'wb') as f:
                        f.write(response.content)

                    # Save metadata (use correct field names from latestPosts)
                    metadata = {
                        'post_id': post_id,
                        'post_url': item.get('url', f'https://instagram.com/p/{post_id}/'),
                        'caption': item.get('caption', ''),
                        'timestamp': item.get('timestamp', datetime.now().isoformat()),
                        'likes': item.get('likesCount', 0),
                        'is_video': False,
                    }

                    metadata_list.append(metadata)
                    post_count += 1

                    if post_count % 10 == 0:
                        print(f"      {post_count} images downloaded...")

            except Exception as e:
                print(f"      ⚠️  Failed to download post: {e}")
                continue

        # Save consolidated metadata
        metadata_file = artist_dir / 'metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(metadata_list, f, indent=2)

        print(f"   ✅ Downloaded {post_count} posts")
        return post_count, None

    except Exception as e:
        return 0, str(e)

def main():
    """Main scraping workflow"""
    print("🤖 Instagram Portfolio Scraper (Apify)\n")

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
    try:
        conn = connect_db()
        print("✅ Connected\n")

        # Get pending artists
        print("📋 Finding artists to scrape...")
        artists = get_pending_artists(conn)

        if not artists:
            print("✅ No artists to scrape (all completed)")
            return

        print(f"Found {len(artists)} artists to scrape\n")

        # Process each artist
        for index, (artist_id, instagram_handle, artist_name) in enumerate(artists, 1):
            print(f"[{index}/{len(artists)}] {artist_name} (@{instagram_handle})")

            # Create scraping job
            job_id = create_scraping_job(conn, artist_id)

            try:
                # Scrape profile
                images_scraped, error = scrape_artist_profile(apify_client, instagram_handle, artist_id)

                if error:
                    print(f"   ⚠️  Error: {error}")
                    update_scraping_job(conn, job_id, 'failed', images_scraped, error)
                else:
                    update_scraping_job(conn, job_id, 'completed', images_scraped)

                # Progress
                percentage = (index / len(artists)) * 100
                print(f"   📊 Progress: {percentage:.1f}% ({index}/{len(artists)})\n")

            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted by user")
                update_scraping_job(conn, job_id, 'failed', 0, 'Interrupted by user')
                break
            except Exception as e:
                print(f"   ❌ Unexpected error: {e}")
                update_scraping_job(conn, job_id, 'failed', 0, str(e))

        # Summary
        print("\n✅ Scraping session complete!")
        print(f"📁 Images saved to: {TEMP_DIR}")
        print("\n📋 Next steps:")
        print("   1. Process and upload images: npm run process-images")
        print("   2. Validate results: npm run validate-scraped-images")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("✅ Database connection closed")

if __name__ == '__main__':
    main()
