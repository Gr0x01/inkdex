#!/usr/bin/env python3
"""
Test script to verify profile metadata extraction works correctly
Scrapes just 1 artist and verifies profile photo + follower count are saved
"""

import psycopg2
import os
import sys
from dotenv import load_dotenv
from apify_client import ApifyClient

# Load environment variables
load_dotenv('.env.local')

DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')

def test_profile_metadata():
    """Test profile metadata extraction for one artist"""

    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN in .env.local")
        sys.exit(1)

    # Connect to database
    print("🔌 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Get one artist without profile metadata
    cursor.execute("""
        SELECT id, instagram_handle, name
        FROM artists
        WHERE profile_image_url IS NULL
        LIMIT 1
    """)

    artist = cursor.fetchone()
    if not artist:
        print("✅ All artists already have profile metadata!")
        return

    artist_id, instagram_handle, artist_name = artist
    print(f"\n🎯 Testing with: {artist_name} (@{instagram_handle})\n")

    # Initialize Apify client
    apify_client = ApifyClient(APIFY_API_TOKEN)

    # Scrape profile
    print("📥 Scraping Instagram profile...")
    run_input = {
        "usernames": [instagram_handle],
        "resultsLimit": 5,  # Just a few posts for testing
        "resultsType": "posts",
        "searchType": "user",
        "searchLimit": 1,
        "addParentData": False
    }

    run = apify_client.actor('apify/instagram-profile-scraper').call(
        run_input=run_input,
        timeout_secs=300
    )

    # Fetch results
    results = []
    for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
        results.append(item)

    if not results:
        print("❌ No results from Apify")
        return

    # Extract profile metadata
    profile = results[0]
    profile_pic_url = profile.get('profilePicUrlHD') or profile.get('profilePicUrl')
    follower_count = profile.get('followersCount', 0)

    print(f"\n✅ Extracted profile metadata:")
    print(f"   📷 Profile photo: {profile_pic_url[:80] if profile_pic_url else 'None'}...")
    print(f"   👥 Followers: {follower_count:,}")

    # Save to database
    print(f"\n💾 Saving to database...")
    cursor.execute("""
        UPDATE artists
        SET profile_image_url = %s,
            follower_count = %s,
            last_scraped_at = NOW()
        WHERE id = %s
    """, (profile_pic_url, follower_count, artist_id))

    conn.commit()

    # Verify it was saved
    cursor.execute("""
        SELECT profile_image_url, follower_count
        FROM artists
        WHERE id = %s
    """, (artist_id,))

    saved_pic, saved_followers = cursor.fetchone()

    print(f"\n✅ Verified in database:")
    print(f"   📷 Profile photo: {saved_pic[:80] if saved_pic else 'None'}...")
    print(f"   👥 Followers: {saved_followers:,}")

    if profile_pic_url and saved_pic and follower_count == saved_followers:
        print(f"\n🎉 SUCCESS! Profile metadata extraction and saving works correctly!")
    else:
        print(f"\n⚠️  Warning: Data mismatch between extraction and database")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    test_profile_metadata()
