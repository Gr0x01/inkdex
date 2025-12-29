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
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from apify_client import ApifyClient
from openai import AsyncOpenAI

# Load environment variables
load_dotenv('.env.local')

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
TEMP_DIR = Path('/tmp/instagram')

# Apify Actor ID for Instagram Profile Scraper
APIFY_ACTOR = 'apify/instagram-profile-scraper'
MAX_POSTS = 50

# GPT-5-nano classification settings
BATCH_SIZE = 5000  # Max concurrent requests (Tier 5 supports 30k RPM)

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

    # Add LIMIT for testing
    if limit:
        query += f" LIMIT {limit}"

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
            return 0, "No images downloaded"

        print(f"   ✅ Downloaded {len(downloaded_images)} images")

        # PHASE 2: Classify all images in parallel using GPT-5-nano Flex
        print(f"   🤖 Classifying images with GPT-5-nano (Flex tier)...")
        image_paths = [img['temp_path'] for img in downloaded_images]
        classifications = asyncio.run(batch_classify_images(image_paths))

        # PHASE 3: Filter and finalize based on classifications
        print(f"   🗂️  Filtering results...")
        metadata_list = []
        tattoo_count = 0
        skipped_count = 0

        for img_info, is_tattoo in zip(downloaded_images, classifications):
            temp_path = img_info['temp_path']
            post_id = img_info['post_id']

            if is_tattoo:
                # Rename temp → final (it's a tattoo!)
                final_path = artist_dir / f"{post_id}.jpg"
                temp_path.rename(final_path)
                metadata_list.append(img_info['metadata'])
                tattoo_count += 1
            else:
                # Delete non-tattoo image
                temp_path.unlink()
                skipped_count += 1

        # Save consolidated metadata (only tattoos)
        metadata_file = artist_dir / 'metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(metadata_list, f, indent=2)

        print(f"   ✅ Saved {tattoo_count} tattoo images")
        if skipped_count > 0:
            print(f"   ⏭️  Skipped {skipped_count} non-tattoo images")
        print(f"   📊 Total processed: {len(downloaded_images)} posts")

        return tattoo_count, None

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

        # Get pending artists (LIMIT 2 FOR TESTING)
        print("📋 Finding artists to scrape...")
        TEST_LIMIT = 2  # Change to None for full production run
        artists = get_pending_artists(conn, limit=TEST_LIMIT)
        if TEST_LIMIT:
            print(f"⚠️  TEST MODE: Limited to {TEST_LIMIT} artists")

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
