#!/usr/bin/env python3
"""
Scrape ONLY the 213 Google Ads artists - not the full backlog.
"""

import psycopg2
import os
import sys
import json
import asyncio
import aiohttp
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from apify_client import ApifyClient

load_dotenv('.env.local')

DATABASE_URL = os.getenv('DATABASE_URL')
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')
TEMP_DIR = Path('/tmp/instagram')

APIFY_ACTOR = 'apify/instagram-profile-scraper'
MAX_POSTS = 12
PROFILES_PER_BATCH = 25

# The 9 Google Ads cities
GOOGLE_ADS_CITIES = [
    'Lubbock', 'Amarillo', 'Fort Collins', 'Syracuse', 'Albany',
    'Duluth', 'Huntsville', 'Lawrence', 'Norman'
]


def connect_db():
    return psycopg2.connect(DATABASE_URL)


def get_google_ads_artists(conn):
    """Get ONLY Google Ads artists that need scraping"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.instagram_handle, a.name
        FROM artists a
        JOIN artist_locations al ON a.id = al.artist_id AND al.is_primary = true
        WHERE al.city IN %s
        AND a.instagram_handle IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM portfolio_images pi WHERE pi.artist_id = a.id
        )
        ORDER BY a.created_at
    """, (tuple(GOOGLE_ADS_CITIES),))
    artists = cursor.fetchall()
    cursor.close()
    return artists


async def download_image(session, url, dest_path):
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                content = await response.read()
                with open(dest_path, 'wb') as f:
                    f.write(content)
                return True
    except Exception as e:
        print(f"      ⚠️  Download failed: {e}")
    return False


async def download_images_parallel(downloads):
    connector = aiohttp.TCPConnector(limit=20)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [download_image(session, url, path) for url, path in downloads]
        return await asyncio.gather(*tasks)


def scrape_batch(apify_client, artists):
    """Scrape a batch of artists via Apify"""
    usernames = [h.lower().strip() for _, h, _ in artists if h]
    handle_map = {h.lower().strip(): (aid, name) for aid, h, name in artists}

    print(f"\n📦 Scraping {len(usernames)} profiles...")

    run_input = {
        "usernames": usernames,
        "resultsLimit": MAX_POSTS,
        "resultsType": "posts",
        "searchType": "user",
        "searchLimit": len(usernames),
    }

    try:
        run = apify_client.actor(APIFY_ACTOR).call(run_input=run_input, timeout_secs=900)
        results = list(apify_client.dataset(run["defaultDatasetId"]).iterate_items())
        print(f"   ✅ Got {len(results)} profile results")
        return results, handle_map
    except Exception as e:
        print(f"   ❌ Apify error: {e}")
        return [], handle_map


def process_results(results, handle_map, conn):
    """Download images and save to temp dir"""
    downloads = []
    artist_data = {}

    for profile in results:
        username = profile.get('username', '').lower()
        if username not in handle_map:
            continue

        artist_id, name = handle_map[username]
        posts = profile.get('latestPosts', [])

        artist_dir = TEMP_DIR / artist_id
        artist_dir.mkdir(parents=True, exist_ok=True)

        metadata = []
        for post in posts:
            if post.get('type') == 'Video':
                continue
            image_url = post.get('displayUrl')
            post_id = post.get('shortCode')
            if not image_url or not post_id:
                continue

            dest_path = artist_dir / f"{post_id}.jpg"
            downloads.append((image_url, dest_path))
            metadata.append({
                'post_id': post_id,
                'post_url': f'https://instagram.com/p/{post_id}/',
                'caption': post.get('caption', ''),
                'timestamp': post.get('timestamp', datetime.now().isoformat()),
                'likes': post.get('likesCount', 0),
            })

        artist_data[artist_id] = {
            'name': name,
            'username': username,
            'dir': artist_dir,
            'metadata': metadata,
            'profile_pic': profile.get('profilePicUrlHD') or profile.get('profilePicUrl'),
            'followers': profile.get('followersCount', 0),
        }

    if downloads:
        print(f"\n📥 Downloading {len(downloads)} images...")
        results = asyncio.run(download_images_parallel(downloads))
        successful = sum(1 for r in results if r)
        print(f"   ✅ Downloaded {successful}/{len(downloads)}")

    # Save metadata and update DB
    cursor = conn.cursor()
    images_total = 0

    for artist_id, data in artist_data.items():
        if data['metadata']:
            # Save metadata
            with open(data['dir'] / 'metadata.json', 'w') as f:
                json.dump(data['metadata'], f)
            (data['dir'] / '.complete').touch()

            # Update scraping job
            cursor.execute("""
                UPDATE scraping_jobs
                SET status = 'completed', images_scraped = %s, completed_at = NOW()
                WHERE artist_id = %s AND status = 'pending'
            """, (len(data['metadata']), artist_id))

            # Update profile metadata
            cursor.execute("""
                UPDATE artists SET profile_image_url = %s, follower_count = %s
                WHERE id = %s
            """, (data['profile_pic'], data['followers'], artist_id))

            images_total += len(data['metadata'])
            print(f"   ✅ {data['name']} (@{data['username']}): {len(data['metadata'])} images")

    conn.commit()
    cursor.close()
    return images_total


def main():
    print("🎯 Google Ads Artists Scraper")
    print("=" * 60)

    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN")
        sys.exit(1)

    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    apify_client = ApifyClient(APIFY_API_TOKEN)
    conn = connect_db()

    # Get ONLY Google Ads artists
    artists = get_google_ads_artists(conn)
    print(f"Found {len(artists)} Google Ads artists to scrape")
    print(f"Cities: {', '.join(GOOGLE_ADS_CITIES)}\n")

    if not artists:
        print("✅ All Google Ads artists already scraped!")
        return

    total_images = 0

    # Process in batches
    for i in range(0, len(artists), PROFILES_PER_BATCH):
        batch = artists[i:i + PROFILES_PER_BATCH]
        batch_num = i // PROFILES_PER_BATCH + 1
        total_batches = (len(artists) + PROFILES_PER_BATCH - 1) // PROFILES_PER_BATCH

        print(f"\n{'='*60}")
        print(f"📦 BATCH {batch_num}/{total_batches}")
        print(f"{'='*60}")

        results, handle_map = scrape_batch(apify_client, batch)
        if results:
            images = process_results(results, handle_map, conn)
            total_images += images

        print(f"\n📊 Progress: {min(i + PROFILES_PER_BATCH, len(artists))}/{len(artists)}")

    conn.close()

    print(f"\n{'='*60}")
    print("✅ SCRAPING COMPLETE")
    print(f"{'='*60}")
    print(f"Total images: {total_images}")
    print(f"\nNext: Run process-batch to upload images:")
    print(f"  npm run process-batch")


if __name__ == '__main__':
    main()
