#!/usr/bin/env python3
"""
Batch Image Classifier using GPT-5-nano
Classifies ALL downloaded images in one massive parallel batch
Filters out non-tattoo images after classification completes
"""

import os
import sys
import json
import asyncio
import base64
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables
load_dotenv('.env.local')

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
TEMP_DIR = Path('/tmp/instagram')
BATCH_SIZE = 5000  # Max concurrent requests (Tier 5 supports 30k RPM)

async def classify_image_async(client: AsyncOpenAI, image_path: Path) -> tuple[Path, bool]:
    """
    Classify a single image using GPT-5-nano vision (Flex tier).
    Returns (image_path, is_tattoo).
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
        is_tattoo = result.strip().lower() == 'yes' if result else False
        return (image_path, is_tattoo)

    except Exception as e:
        print(f"   ⚠️  Classification error for {image_path.name}: {e}")
        return (image_path, False)  # Conservative: skip on error

async def batch_classify_all_images(image_paths: list[Path]) -> dict[Path, bool]:
    """
    Classify ALL images in parallel using GPT-5-nano Flex tier.
    Returns dict mapping image_path → is_tattoo.
    """
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set in .env.local")
        sys.exit(1)

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    results = {}

    # Process in batches of BATCH_SIZE (5000) to respect rate limits
    for i in range(0, len(image_paths), BATCH_SIZE):
        batch = image_paths[i:i+BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        total_batches = (len(image_paths) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"🔍 Classifying batch {batch_num}/{total_batches} ({len(batch)} images)...")

        # Submit all classifications in parallel
        tasks = [classify_image_async(client, path) for path in batch]
        batch_results = await asyncio.gather(*tasks)

        # Update results dict
        for path, is_tattoo in batch_results:
            results[path] = is_tattoo

        tattoo_count = sum(1 for _, is_tattoo in batch_results if is_tattoo)
        print(f"✅ Batch {batch_num}/{total_batches} complete: {tattoo_count}/{len(batch)} are tattoos ({100*tattoo_count/len(batch):.1f}%)")

    return results

def main():
    """Main batch classification workflow"""
    print("🤖 Batch Image Classifier (GPT-5-nano)\n")

    # Check temp directory exists
    if not TEMP_DIR.exists():
        print(f"❌ Temp directory not found: {TEMP_DIR}")
        print("   Run the scraper first: python3 scripts/scraping/apify-scraper.py")
        sys.exit(1)

    # Get all artist directories
    artist_dirs = [d for d in TEMP_DIR.iterdir() if d.is_dir()]
    if not artist_dirs:
        print("❌ No artist directories found")
        sys.exit(1)

    print(f"📂 Found {len(artist_dirs)} artists\n")

    # Collect ALL image paths
    print("📋 Collecting image paths...")
    all_image_paths = []
    for artist_dir in artist_dirs:
        images = list(artist_dir.glob("*.jpg"))
        all_image_paths.extend(images)

    print(f"✅ Found {len(all_image_paths)} total images to classify\n")

    if not all_image_paths:
        print("❌ No images found")
        sys.exit(1)

    # Classify ALL images in one massive batch
    print(f"🚀 Starting batch classification of {len(all_image_paths)} images...")
    print(f"   Using GPT-5-nano Flex tier (batches of {BATCH_SIZE})\n")

    classifications = asyncio.run(batch_classify_all_images(all_image_paths))

    # Filter images per artist based on classifications
    print(f"\n🗂️  Filtering non-tattoo images per artist...")
    total_deleted = 0
    total_kept = 0

    for artist_dir in artist_dirs:
        metadata_file = artist_dir / 'metadata.json'

        # Read current metadata
        try:
            with open(metadata_file, 'r') as f:
                all_metadata = json.load(f)
        except Exception as e:
            print(f"   ⚠️  Skipping {artist_dir.name}: {e}")
            continue

        # Filter metadata and delete non-tattoo images
        filtered_metadata = []
        deleted_count = 0

        for meta in all_metadata:
            post_id = meta['post_id']
            image_path = artist_dir / f"{post_id}.jpg"

            if image_path in classifications and classifications[image_path]:
                # Keep tattoo image
                filtered_metadata.append(meta)
                total_kept += 1
            else:
                # Delete non-tattoo image
                if image_path.exists():
                    image_path.unlink()
                deleted_count += 1
                total_deleted += 1

        # Update metadata file with only tattoo images
        with open(metadata_file, 'w') as f:
            json.dump(filtered_metadata, f, indent=2)

        if deleted_count > 0:
            print(f"   🗑️  {artist_dir.name}: kept {len(filtered_metadata)}, deleted {deleted_count}")

    # Summary
    print(f"\n✅ Classification complete!")
    print(f"   Total images classified: {len(all_image_paths)}")
    print(f"   Tattoo images kept: {total_kept} ({100*total_kept/len(all_image_paths):.1f}%)")
    print(f"   Non-tattoo images deleted: {total_deleted} ({100*total_deleted/len(all_image_paths):.1f}%)")
    print(f"\n📋 Next steps:")
    print(f"   1. Process and upload images: npm run process-images")
    print(f"   2. Validate results: npm run validate-scraped-images")

if __name__ == '__main__':
    main()
