#!/usr/bin/env python3
"""
Re-classify existing images in database using improved prompt
Removes non-portfolio images (personal photos, lifestyle content, etc.)
"""

import os
import sys
import asyncio
import json
import time
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from openai import AsyncOpenAI
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
CLASSIFICATION_BATCH_SIZE = 100  # OpenAI parallel requests (reduced to avoid download timeouts)
DB_FETCH_SIZE = 1000  # Fetch from Supabase in chunks (gentle on micro instance)
DB_DELETE_CHUNK = 50  # Delete in smaller chunks to avoid overwhelming Supabase

# Cities to re-classify (all 8 cities)
TARGET_CITIES = ['Austin', 'Atlanta', 'Los Angeles', 'New York', 'Chicago', 'Portland', 'Seattle', 'Miami']

# Dry run mode (set via command line arg --dry-run)
DRY_RUN = '--dry-run' in sys.argv

# Limit mode for testing (set via --limit=N)
LIMIT = None
for arg in sys.argv:
    if arg.startswith('--limit='):
        LIMIT = int(arg.split('=')[1])

async def classify_image_url(client: AsyncOpenAI, image_url: str, image_id: str) -> tuple[str, bool]:
    """
    Classify a single image using improved GPT-5-nano prompt.
    Returns (image_id, is_portfolio).
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-5-mini",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo (finished or in-progress).

Answer 'YES' if:
- Shows a completed tattoo on someone's body (any angle or quality)
- Shows a tattoo being worked on (in-progress shop photo)
- The main subject is the tattoo artwork itself

Answer 'NO' if:
- Personal selfie/portrait where tattoos are just visible but not the focus
- Lifestyle photos (beach, family gatherings, parties) where person happens to have tattoos
- Promotional graphics (text announcements, flyers, event posters)
- Holiday/celebration posts without tattoo focus
- Photos where tattoos are purely incidental background elements

Answer only 'yes' or 'no'."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url,
                            "detail": "low"
                        }
                    }
                ]
            }],
            max_completion_tokens=500
        )

        result = response.choices[0].message.content
        is_portfolio = result.strip().lower() == 'yes' if result else False
        return (image_id, is_portfolio)

    except Exception as e:
        print(f"   ⚠️  Classification error for {image_id}: {e}")
        return (image_id, True)  # Keep on error (conservative)

async def batch_classify(client: AsyncOpenAI, images: list[dict]) -> dict[str, bool]:
    """
    Classify a batch of images in parallel.
    Returns dict mapping image_id → is_portfolio.
    """
    tasks = [
        classify_image_url(
            client,
            f"{SUPABASE_URL}/storage/v1/object/public/portfolio-images/{img['storage_thumb_640']}",
            img['id']
        )
        for img in images
    ]

    results = await asyncio.gather(*tasks)
    return {img_id: is_portfolio for img_id, is_portfolio in results}

def main():
    """Main re-classification workflow"""
    print("🔄 Re-classifying existing images with improved prompt\n")

    # Validate environment
    if not all([OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
        print("❌ Missing environment variables")
        print("   Required: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # Initialize clients
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Simpler approach: fetch directly with SQL-style filtering
    print(f"📋 Fetching images from {len(TARGET_CITIES)} cities...")
    if LIMIT:
        print(f"✅ Limiting to first {LIMIT} images (--limit={LIMIT})\n")
        total_to_fetch = LIMIT
    else:
        print(f"✅ Will process all images from target cities\n")
        total_to_fetch = 100000  # High number, will stop when no more images

    # Fetch and classify in chunks (gentle on Supabase, aggressive on OpenAI)
    print(f"🤖 Starting re-classification...")
    print(f"   DB fetch size: {DB_FETCH_SIZE} (gentle on Supabase micro)")
    print(f"   OpenAI batch size: {CLASSIFICATION_BATCH_SIZE} (Tier 5 can handle it)")
    print()

    all_results = {}
    all_images = []
    offset = 0

    while offset < total_to_fetch:
        # Fetch chunk from database (include ALL storage columns for deletion)
        # Using artists.city filter directly (PostgREST will handle the JOIN)
        fetch_limit = min(DB_FETCH_SIZE, total_to_fetch - offset)
        print(f"📥 Fetching images {offset}-{offset+fetch_limit}...")

        response = supabase.table('portfolio_images').select(
            'id, artist_id, instagram_url, storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path, artists!inner(city, name, instagram_handle)'
        ).in_('artists.city', TARGET_CITIES).range(offset, offset+fetch_limit-1).execute()

        chunk_images = response.data

        # Break if no more images
        if not chunk_images:
            print(f"   No more images found (fetched {len(all_images)} total)\n")
            break

        all_images.extend(chunk_images)

        # Classify this chunk in sub-batches (OpenAI parallel)
        for i in range(0, len(chunk_images), CLASSIFICATION_BATCH_SIZE):
            batch = chunk_images[i:i+CLASSIFICATION_BATCH_SIZE]
            batch_num = (offset + i)//CLASSIFICATION_BATCH_SIZE + 1
            total_batches = (total_to_fetch + CLASSIFICATION_BATCH_SIZE - 1) // CLASSIFICATION_BATCH_SIZE

            print(f"🔍 Classifying batch {batch_num}/{total_batches} ({len(batch)} images in parallel)...")

            batch_results = asyncio.run(batch_classify(openai_client, batch))
            all_results.update(batch_results)

            portfolio_count = sum(1 for is_portfolio in batch_results.values() if is_portfolio)
            print(f"✅ Batch {batch_num}: {portfolio_count}/{len(batch)} are portfolio ({100*portfolio_count/len(batch):.1f}%)\n")

            # No pausing needed with Flex tier - slow responses naturally rate-limit us

        offset += DB_FETCH_SIZE

    images = all_images

    # Calculate deletion stats
    to_delete = [img_id for img_id, is_portfolio in all_results.items() if not is_portfolio]
    to_keep = [img_id for img_id, is_portfolio in all_results.items() if is_portfolio]

    print(f"\n📊 Classification Results:")
    print(f"   Total images: {len(images)}")
    print(f"   Portfolio images (keep): {len(to_keep)} ({100*len(to_keep)/len(images):.1f}%)")
    print(f"   Non-portfolio (delete): {len(to_delete)} ({100*len(to_delete)/len(images):.1f}%)")

    if not to_delete:
        print("\n✅ All images passed! Nothing to delete.")
        return

    # Create audit log BEFORE deletion
    audit_log = {
        'timestamp': datetime.now().isoformat(),
        'script_version': '1.0',
        'cities': TARGET_CITIES,
        'total_classified': len(images),
        'portfolio_count': len(to_keep),
        'non_portfolio_count': len(to_delete),
        'deleted_ids': to_delete,
        'dry_run': DRY_RUN,
    }

    audit_filename = f"deletion_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(audit_filename, 'w') as f:
        json.dump(audit_log, f, indent=2)
    print(f"\n💾 Audit log saved: {audit_filename}")

    # Show some examples of what will be deleted
    print(f"\n🔍 Sample deletions (first 10):")
    sample_count = 0
    for img in images:
        if img['id'] in to_delete and sample_count < 10:
            artist = img['artists']
            print(f"   ❌ @{artist['instagram_handle']} ({artist['city']}): {img['instagram_url']}")
            sample_count += 1

    # Dry run mode
    if DRY_RUN:
        print(f"\n🔵 DRY RUN MODE - No deletions will be performed")
        print(f"   Would delete {len(to_delete)} images")
        print(f"   Audit log saved to: {audit_filename}")
        print(f"\n   To perform actual deletion, run without --dry-run flag")
        return

    # Confirm deletion
    print(f"\n⚠️  This will DELETE {len(to_delete)} images from:")
    print(f"   - Database (portfolio_images table)")
    print(f"   - Supabase Storage (all thumbnail sizes)")
    print(f"\n💾 Audit log saved to: {audit_filename}")
    print(f"   (Can be used for recovery if needed)")
    response = input(f"\nContinue? (yes/no): ")

    if response.lower() != 'yes':
        print("❌ Cancelled")
        return

    # Delete from database
    print(f"\n🗑️  Deleting {len(to_delete)} images from database...")

    # Delete in smaller chunks (gentle on Supabase micro)
    for i in range(0, len(to_delete), DB_DELETE_CHUNK):
        chunk = to_delete[i:i+DB_DELETE_CHUNK]
        supabase.table('portfolio_images').delete().in_('id', chunk).execute()
        print(f"   Deleted {min(i+DB_DELETE_CHUNK, len(to_delete))}/{len(to_delete)} from database")

    # Delete from storage FIRST (safer - orphaned storage is less harmful than orphaned DB records)
    print(f"\n🗑️  Deleting images from Supabase Storage...")
    deleted_storage_count = 0
    failed_storage_count = 0
    storage_errors = []

    for img in images:
        if img['id'] in to_delete:
            try:
                # Use paths directly from database columns (CRITICAL: don't reconstruct!)
                paths_to_delete = []
                if img.get('storage_thumb_320'):
                    paths_to_delete.append(img['storage_thumb_320'])
                if img.get('storage_thumb_640'):
                    paths_to_delete.append(img['storage_thumb_640'])
                if img.get('storage_thumb_1280'):
                    paths_to_delete.append(img['storage_thumb_1280'])
                if img.get('storage_original_path'):
                    paths_to_delete.append(img['storage_original_path'])

                for path in paths_to_delete:
                    try:
                        supabase.storage.from_('portfolio-images').remove([path])
                        time.sleep(0.02)  # 20ms delay to avoid rate limits
                    except Exception as e:
                        # Only ignore "not found" errors
                        error_str = str(e).lower()
                        if 'not found' not in error_str and '404' not in error_str:
                            storage_errors.append({'path': path, 'error': str(e)})
                            if len(storage_errors) <= 5:
                                print(f"   ⚠️  Storage delete failed for {path}: {e}")

                deleted_storage_count += 1

            except Exception as e:
                print(f"   ⚠️  Failed to delete storage for {img['id']}: {e}")
                failed_storage_count += 1

    print(f"✅ Deleted {deleted_storage_count} from storage")
    if failed_storage_count > 0:
        print(f"⚠️  {failed_storage_count} storage deletions failed")

    # Report storage errors if any
    if storage_errors:
        print(f"\n⚠️  {len(storage_errors)} storage deletion errors occurred:")
        error_summary = f"storage_errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(error_summary, 'w') as f:
            json.dump(storage_errors, f, indent=2)
        print(f"   Error details saved to: {error_summary}")

    # Final summary
    print(f"\n✅ Re-classification complete!")
    print(f"   Kept: {len(to_keep)} portfolio images")
    print(f"   Deleted: {len(to_delete)} non-portfolio images")
    print(f"   Audit log: {audit_filename}")
    if storage_errors:
        print(f"   Storage errors: {len(storage_errors)} (see {error_summary})")
    print(f"\n📋 Next steps:")
    print(f"   1. Verify deletion: Check artist profiles")
    print(f"   2. Update embeddings: Some artists may need re-embedding if all images deleted")
    print(f"   3. Rebuild vector index if needed: npx tsx scripts/embeddings/create-vector-index.ts")

if __name__ == '__main__':
    main()
