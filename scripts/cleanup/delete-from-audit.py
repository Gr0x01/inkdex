#!/usr/bin/env python3
"""
Delete images based on existing audit log
Uses the deletion list from a previous classification run
"""

import os
import sys
import json
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
DB_DELETE_CHUNK = 50

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 delete-from-audit.py <audit_log.json>")
        sys.exit(1)

    audit_file = sys.argv[1]

    # Load audit log
    print(f"📋 Loading audit log: {audit_file}")
    with open(audit_file, 'r') as f:
        audit = json.load(f)

    to_delete = audit['deleted_ids']

    print(f"\n📊 Audit Log Summary:")
    print(f"   Total classified: {audit['total_classified']}")
    print(f"   Portfolio (kept): {audit['portfolio_count']}")
    print(f"   Non-portfolio (to delete): {audit['non_portfolio_count']}")
    print(f"   Cities: {', '.join(audit['cities'])}")

    if not to_delete:
        print("\n✅ No images to delete!")
        return

    # Confirm via command line arg
    print(f"\n⚠️  Will DELETE {len(to_delete)} images from:")
    print(f"   - Database (portfolio_images table)")
    print(f"   - Supabase Storage (all thumbnail sizes)")

    if '--confirm' not in sys.argv:
        print(f"\n❌ Add --confirm flag to proceed with deletion")
        return

    print(f"\n✅ Proceeding with deletion...")

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Get image details for storage deletion
    print(f"\n📥 Fetching image storage paths...")
    all_images = []
    for i in range(0, len(to_delete), 100):
        chunk = to_delete[i:i+100]
        response = supabase.table('portfolio_images').select(
            'id, artist_id, storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path'
        ).in_('id', chunk).execute()
        all_images.extend(response.data)

    print(f"✅ Fetched {len(all_images)} image records")

    # Delete from storage FIRST
    print(f"\n🗑️  Deleting from Supabase Storage...")
    deleted_storage_count = 0
    failed_storage_count = 0
    storage_errors = []

    for img in all_images:
        try:
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
                    time.sleep(0.02)  # 20ms delay
                except Exception as e:
                    error_str = str(e).lower()
                    if 'not found' not in error_str and '404' not in error_str:
                        storage_errors.append({'path': path, 'error': str(e)})
                        if len(storage_errors) <= 5:
                            print(f"   ⚠️  Storage delete failed for {path}: {e}")

            deleted_storage_count += 1
            if deleted_storage_count % 100 == 0:
                print(f"   Deleted {deleted_storage_count}/{len(all_images)} from storage")

        except Exception as e:
            print(f"   ⚠️  Failed to delete storage for {img['id']}: {e}")
            failed_storage_count += 1

    print(f"✅ Deleted {deleted_storage_count} images from storage")
    if failed_storage_count > 0:
        print(f"⚠️  {failed_storage_count} storage deletions failed")

    # Delete from database
    print(f"\n🗑️  Deleting {len(to_delete)} images from database...")

    for i in range(0, len(to_delete), DB_DELETE_CHUNK):
        chunk = to_delete[i:i+DB_DELETE_CHUNK]
        supabase.table('portfolio_images').delete().in_('id', chunk).execute()
        print(f"   Deleted {min(i+DB_DELETE_CHUNK, len(to_delete))}/{len(to_delete)} from database")

    # Report storage errors if any
    if storage_errors:
        print(f"\n⚠️  {len(storage_errors)} storage deletion errors occurred:")
        from datetime import datetime
        error_summary = f"storage_errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(error_summary, 'w') as f:
            json.dump(storage_errors, f, indent=2)
        print(f"   Error details saved to: {error_summary}")

    # Final summary
    print(f"\n✅ Deletion complete!")
    print(f"   Deleted: {len(to_delete)} non-portfolio images")
    if storage_errors:
        print(f"   Storage errors: {len(storage_errors)}")

if __name__ == '__main__':
    main()
