#!/usr/bin/env python3
"""
Update Profile Metadata Script
Fetches Instagram profile photos and follower counts for artists missing this data
"""

import psycopg2
import os
import sys
from dotenv import load_dotenv
from apify_client import ApifyClient
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Load environment variables
load_dotenv('.env.local')

DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
APIFY_ACTOR = 'apify/instagram-profile-scraper'

# Parallel processing
CONCURRENT_REQUESTS = 8
db_lock = Lock()

def connect_db():
    """Connect to PostgreSQL database"""
    if not DATABASE_URL:
        print("❌ Missing DATABASE_URL in .env.local")
        sys.exit(1)

    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

def get_artists_without_metadata(conn):
    """Get artists missing profile metadata"""
    cursor = conn.cursor()

    query = """
        SELECT id, instagram_handle, name
        FROM artists
        WHERE instagram_private != TRUE
        AND (profile_image_url IS NULL OR follower_count IS NULL)
        ORDER BY created_at
    """

    cursor.execute(query)
    artists = cursor.fetchall()
    cursor.close()

    return artists

def update_artist_metadata(conn, artist_id, profile_pic_url, follower_count):
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

        cursor.execute(query, (profile_pic_url, follower_count, artist_id))
        conn.commit()
        cursor.close()

def fetch_profile_metadata(apify_client, instagram_handle):
    """Fetch profile metadata from Instagram via Apify"""
    try:
        # Normalize handle
        instagram_handle = instagram_handle.lower().strip()

        # Prepare Apify input (only fetch profile, no posts needed)
        run_input = {
            "usernames": [instagram_handle],
            "resultsLimit": 1,  # Minimal posts just to get profile data
            "resultsType": "posts",
            "searchType": "user",
            "searchLimit": 1,
            "addParentData": False
        }

        # Run Apify actor
        run = apify_client.actor(APIFY_ACTOR).call(
            run_input=run_input,
            timeout_secs=120  # Shorter timeout since we only need profile
        )

        # Fetch results
        results = []
        for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)

        if not results:
            return None, None, "No profile data returned"

        # Extract profile metadata
        profile = results[0]
        profile_pic_url = profile.get('profilePicUrlHD') or profile.get('profilePicUrl')
        follower_count = profile.get('followersCount', 0)

        return profile_pic_url, follower_count, None

    except Exception as e:
        return None, None, str(e)

def process_artist(artist_data, apify_client, conn):
    """Process a single artist (thread-safe)"""
    artist_id, instagram_handle, artist_name, index, total = artist_data

    try:
        print(f"[{index}/{total}] {artist_name} (@{instagram_handle})")

        # Fetch metadata
        profile_pic_url, follower_count, error = fetch_profile_metadata(
            apify_client,
            instagram_handle
        )

        if error:
            print(f"   ⚠️  Error: {error}")
            return {'success': False, 'artist_id': artist_id}

        # Display results
        print(f"   👤 Followers: {follower_count:,}" if follower_count else "   👤 Followers: 0")
        if profile_pic_url:
            print(f"   📷 Photo: {profile_pic_url[:60]}...")

        # Save to database
        update_artist_metadata(conn, artist_id, profile_pic_url, follower_count)
        print(f"   ✅ Saved")

        return {
            'success': True,
            'artist_id': artist_id,
            'followers': follower_count
        }

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return {'success': False, 'artist_id': artist_id}

def main():
    """Main execution"""
    print("🤖 Instagram Profile Metadata Updater\n")

    # Check for Apify token
    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN in .env.local")
        sys.exit(1)

    # Initialize Apify client
    apify_client = ApifyClient(APIFY_API_TOKEN)

    # Connect to database
    print("🔌 Connecting to database...")
    conn = connect_db()
    print("✅ Connected\n")

    # Get artists without metadata
    print("📋 Finding artists without profile metadata...")
    artists = get_artists_without_metadata(conn)

    if not artists:
        print("✅ All artists already have profile metadata!")
        conn.close()
        return

    print(f"Found {len(artists)} artists needing metadata\n")
    print(f"🚀 Processing {CONCURRENT_REQUESTS} artists in parallel\n")

    # Prepare artist data with indices
    artist_data_list = [
        (artist_id, instagram_handle, artist_name, index, len(artists))
        for index, (artist_id, instagram_handle, artist_name) in enumerate(artists, 1)
    ]

    # Process in parallel
    successful = 0
    failed = 0
    total_followers = 0

    try:
        with ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
            # Submit all tasks
            futures = {
                executor.submit(process_artist, artist_data, apify_client, conn): artist_data
                for artist_data in artist_data_list
            }

            # Process results as they complete
            for future in as_completed(futures):
                try:
                    result = future.result()

                    if result['success']:
                        successful += 1
                        total_followers += result.get('followers', 0)
                    else:
                        failed += 1

                    # Progress update
                    completed = successful + failed
                    percentage = (completed / len(artists)) * 100
                    print(f"   📊 Progress: {percentage:.1f}% ({completed}/{len(artists)})\n")

                except Exception as e:
                    print(f"   ❌ Future error: {e}")
                    failed += 1

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        executor.shutdown(wait=False, cancel_futures=True)

    # Summary
    print("\n" + "="*60)
    print("✅ Profile Metadata Update Complete!")
    print("="*60)
    print(f"   ✅ Successful: {successful}")
    print(f"   ⚠️  Failed: {failed}")
    print(f"   👥 Total followers collected: {total_followers:,}")
    print(f"   📊 Average followers: {total_followers // successful if successful > 0 else 0:,}")
    print("="*60)

    conn.close()

if __name__ == '__main__':
    main()
