#!/usr/bin/env python3
"""
Local GPU Batch Embedding Generation with Modal Fallback

Generates CLIP embeddings for portfolio images using local A2000 GPU as primary,
with automatic failover to Modal.com for reliability.

Usage:
    python scripts/embeddings/local_batch_embeddings.py --parallel 4 --batch-size 100
    python scripts/embeddings/local_batch_embeddings.py --parallel 8  # Higher concurrency
    python scripts/embeddings/local_batch_embeddings.py --city "Austin, TX"  # Specific city only

Features:
    - Async parallelization (4-8 images concurrently recommended for A2000)
    - Automatic failover (local → Modal on timeout/error)
    - Resume capability (processes only images with status='pending')
    - Statistics tracking (local vs Modal usage)
    - Progress reporting

Requirements:
    pip install aiohttp asyncio supabase python-dotenv
"""

import os
import sys
import asyncio
import aiohttp
import base64
import time
import re
import argparse
import requests
from typing import Optional, Dict, List
from dotenv import load_dotenv
from supabase import create_client, Client

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

# Load environment variables
# Load .env.local first (Next.js convention), then .env as fallback
load_dotenv('.env.local')
load_dotenv()  # Fallback to .env if .env.local doesn't exist

# Configuration
LOCAL_CLIP_URL = os.getenv("LOCAL_CLIP_URL", "https://clip.inkdex.io")
CLIP_API_KEY = os.getenv("CLIP_API_KEY")
MODAL_FUNCTION_URL = os.getenv("MODAL_FUNCTION_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
LOCAL_TIMEOUT = int(os.getenv("LOCAL_CLIP_TIMEOUT", "10"))

class BatchEmbeddingGenerator:
    """Generate embeddings in parallel with automatic failover"""

    def __init__(self, parallel: int = 4, prefer_local: bool = True):
        """
        Args:
            parallel: Number of concurrent requests (4-8 recommended for A2000)
            prefer_local: Try local GPU first before Modal
        """
        self.parallel = parallel
        self.prefer_local = prefer_local
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get pipeline run ID from environment for progress tracking
        # Validate UUID format to prevent SQL injection
        pipeline_run_id = os.getenv("PIPELINE_RUN_ID")
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if pipeline_run_id and not re.match(uuid_pattern, pipeline_run_id, re.IGNORECASE):
            print("⚠️  Invalid PIPELINE_RUN_ID format, progress tracking disabled")
            pipeline_run_id = None
        self.pipeline_run_id = pipeline_run_id

        # Statistics
        self.stats = {
            "local_count": 0,
            "modal_count": 0,
            "errors": 0,
            "total_processed": 0,
            "local_times": [],
            "modal_times": []
        }

    def check_local_health(self) -> bool:
        """Check if local GPU is available"""
        try:
            headers = {}
            if CLIP_API_KEY:
                headers['Authorization'] = f'Bearer {CLIP_API_KEY}'

            response = requests.get(f"{LOCAL_CLIP_URL}/health", headers=headers, timeout=2)
            if response.ok:
                data = response.json()
                return data.get("status") == "ok" and data.get("gpu_available", True)
        except Exception:
            return False
        return False

    def increment_pipeline_progress(self, processed_delta: int, failed_delta: int):
        """Atomically increment pipeline progress (safe for parallel execution)"""
        if not self.pipeline_run_id:
            return

        try:
            # Use RPC function for atomic increment
            self.supabase.rpc('increment_pipeline_progress', {
                'run_id': self.pipeline_run_id,
                'processed_delta': processed_delta,
                'failed_delta': failed_delta
            }).execute()
        except Exception as e:
            # Don't fail the job if progress update fails
            print(f"Warning: Failed to update pipeline progress: {e}")

    async def generate_embedding_async(
        self,
        session: aiohttp.ClientSession,
        image_id: str,
        image_url: str
    ) -> Optional[Dict]:
        """
        Generate embedding for a single image with failover

        Returns:
            Dict with image_id, embedding, and source, or None on error
        """

        # Download image
        try:
            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    print(f"  ✗ Download failed for {image_id}: HTTP {response.status}")
                    self.stats["errors"] += 1
                    return None

                image_bytes = await response.read()
        except Exception as e:
            print(f"  ✗ Download failed for {image_id}: {e}")
            self.stats["errors"] += 1
            return None

        # Convert to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        # Try local GPU first
        if self.prefer_local:
            start = time.time()
            try:
                headers = {}
                if CLIP_API_KEY:
                    headers['Authorization'] = f'Bearer {CLIP_API_KEY}'

                async with session.post(
                    f"{LOCAL_CLIP_URL}/generate_single_embedding",
                    json={"image_data": base64_image},
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=LOCAL_TIMEOUT)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        embedding = data["embedding"]

                        if len(embedding) == 768:
                            latency = time.time() - start
                            self.stats["local_count"] += 1
                            self.stats["local_times"].append(latency)
                            return {
                                "image_id": image_id,
                                "embedding": embedding,
                                "source": "local"
                            }
            except asyncio.TimeoutError:
                print(f"  ⚠️  Local GPU timeout for {image_id}, trying Modal...")
            except Exception as e:
                print(f"  ⚠️  Local GPU failed for {image_id}: {e}, trying Modal...")

        # Fallback to Modal
        if not MODAL_FUNCTION_URL:
            print(f"  ✗ Modal fallback not configured, skipping {image_id}")
            self.stats["errors"] += 1
            return None

        start = time.time()
        try:
            async with session.post(
                f"{MODAL_FUNCTION_URL}/generate_single_embedding",
                json={"image_data": base64_image},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    embedding = data["embedding"]

                    latency = time.time() - start
                    self.stats["modal_count"] += 1
                    self.stats["modal_times"].append(latency)
                    return {
                        "image_id": image_id,
                        "embedding": embedding,
                        "source": "modal"
                    }
                else:
                    error_text = await response.text()
                    print(f"  ✗ Modal failed for {image_id}: HTTP {response.status} - {error_text}")
        except Exception as e:
            print(f"  ✗ Modal failed for {image_id}: {e}")

        self.stats["errors"] += 1
        return None

    async def process_batch_async(self, images: List[Dict]):
        """Process a batch of images in parallel"""

        async with aiohttp.ClientSession() as session:
            # Process in chunks to avoid overwhelming GPU
            chunk_size = self.parallel

            for i in range(0, len(images), chunk_size):
                chunk = images[i:i+chunk_size]
                chunk_start = time.time()

                print(f"\n  Processing chunk {i//chunk_size + 1}/{(len(images)-1)//chunk_size + 1} ({len(chunk)} images)...")

                # Generate embeddings in parallel
                tasks = []
                for img in chunk:
                    storage_path = img["storage_original_path"]
                    # Construct public URL
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/portfolio-images/{storage_path}"

                    task = self.generate_embedding_async(session, img["id"], public_url)
                    tasks.append(task)

                # Wait for all tasks in chunk
                results = await asyncio.gather(*tasks)

                # Update database for successful embeddings
                for result in results:
                    if result:
                        embedding = result["embedding"]
                        image_id = result["image_id"]
                        source = result["source"]

                        try:
                            # Format embedding as PostgreSQL array string
                            embedding_str = f"[{','.join(map(str, embedding))}]"

                            self.supabase.table("portfolio_images").update({
                                "embedding": embedding_str,
                                "status": "active"
                            }).eq("id", image_id).execute()

                            self.stats["total_processed"] += 1

                            # Log source
                            emoji = "✅" if source == "local" else "🔄"
                            print(f"    {emoji} {image_id[:8]}... ({source})")

                        except Exception as e:
                            print(f"  ✗ DB update failed for {image_id}: {e}")
                            self.stats["errors"] += 1

                chunk_time = time.time() - chunk_start
                print(f"  ✓ Chunk completed in {chunk_time:.1f}s")

                # Update progress after each chunk - increment by successful count
                if self.pipeline_run_id:
                    # Count successful and failed in this chunk
                    successful_in_chunk = sum(1 for r in results if r is not None)
                    failed_in_chunk = len(results) - successful_in_chunk
                    self.increment_pipeline_progress(successful_in_chunk, failed_in_chunk)

    def fetch_pending_images(self, batch_size: int, offset: int, city: Optional[str] = None) -> List[Dict]:
        """Fetch images that need embeddings"""

        query = self.supabase.table("portfolio_images") \
            .select("id, storage_original_path, artist_id") \
            .is_("embedding", "null") \
            .eq("status", "pending")

        # Optional city filter
        if city:
            # Get artist IDs in this city
            artists = self.supabase.table("artists") \
                .select("id") \
                .eq("city", city) \
                .execute()

            artist_ids = [a["id"] for a in artists.data]
            if not artist_ids:
                return []

            # Filter images by artist IDs
            query = query.in_("artist_id", artist_ids)

        query = query.limit(batch_size).offset(offset)
        response = query.execute()

        return response.data

    def process_batch(self, batch_size: int = 100, offset: int = 0, city: Optional[str] = None):
        """Fetch and process a batch of images"""

        # Fetch images
        images = self.fetch_pending_images(batch_size, offset, city)

        if not images:
            return 0

        city_str = f" in {city}" if city else ""
        print(f"\n📸 Processing {len(images)} images{city_str} with {self.parallel} parallel workers")

        # Run async processing
        asyncio.run(self.process_batch_async(images))

        return len(images)

    def print_stats(self):
        """Print processing statistics"""
        print("\n" + "="*60)
        print("📊 BATCH PROCESSING STATISTICS")
        print("="*60)
        print(f"Total processed:   {self.stats['total_processed']} embeddings")
        print(f"Local GPU:         {self.stats['local_count']} ({self._percentage('local_count')}%)")
        print(f"Modal.com:         {self.stats['modal_count']} ({self._percentage('modal_count')}%)")
        print(f"Errors:            {self.stats['errors']}")

        if self.stats['local_times']:
            avg = sum(self.stats['local_times']) / len(self.stats['local_times'])
            print(f"Avg Local Time:    {avg:.2f}s per image")

        if self.stats['modal_times']:
            avg = sum(self.stats['modal_times']) / len(self.stats['modal_times'])
            print(f"Avg Modal Time:    {avg:.2f}s per image")

        print("="*60)

    def _percentage(self, key: str) -> int:
        """Calculate percentage for a stat key"""
        total = self.stats['local_count'] + self.stats['modal_count']
        if total == 0:
            return 0
        return int((self.stats[key] / total) * 100)

def main():
    parser = argparse.ArgumentParser(description="Batch embedding generation with local GPU + Modal fallback")
    parser.add_argument("--batch-size", type=int, default=100, help="Images per batch (default: 100)")
    parser.add_argument("--parallel", type=int, default=4, help="Concurrent requests (4-8 recommended for A2000)")
    parser.add_argument("--offset", type=int, default=0, help="Starting offset")
    parser.add_argument("--max-batches", type=int, default=100, help="Maximum batches to process")
    parser.add_argument("--city", type=str, help="Filter by city (e.g., 'Austin, TX')")
    parser.add_argument("--modal-only", action="store_true", help="Skip local GPU, use Modal only")
    args = parser.parse_args()

    # Validate configuration
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Supabase credentials not configured")
        print("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        return 1

    # Initialize generator
    prefer_local = not args.modal_only
    generator = BatchEmbeddingGenerator(parallel=args.parallel, prefer_local=prefer_local)

    # Check health
    print("🔍 Checking services...")
    local_healthy = generator.check_local_health()

    if local_healthy:
        print(f"✅ Local GPU ready at {LOCAL_CLIP_URL}")
    else:
        print(f"⚠️  Local GPU not available at {LOCAL_CLIP_URL}")
        if prefer_local:
            print("   Will use Modal fallback for all requests")

    if MODAL_FUNCTION_URL:
        print(f"✅ Modal configured at {MODAL_FUNCTION_URL}")
    else:
        if not local_healthy:
            print("❌ Error: Neither local GPU nor Modal is available")
            return 1

    # Get total count of pending images for progress tracking
    total_query = generator.supabase.table("portfolio_images") \
        .select("id", count="exact") \
        .is_("embedding", "null") \
        .eq("status", "pending")

    if args.city:
        artists = generator.supabase.table("artists") \
            .select("id") \
            .eq("city", args.city) \
            .execute()
        artist_ids = [a["id"] for a in artists.data]
        if artist_ids:
            total_query = total_query.in_("artist_id", artist_ids)

    total_count_result = total_query.execute()
    total_pending = total_count_result.count if total_count_result.count else 0

    # Initialize pipeline progress - set total_items ONCE
    if generator.pipeline_run_id:
        try:
            generator.supabase.table("pipeline_runs").update({
                "total_items": total_pending,
                "processed_items": 0,
                "failed_items": 0,
            }).eq("id", generator.pipeline_run_id).execute()
        except Exception as e:
            print(f"Warning: Failed to initialize pipeline progress: {e}")

    # Process batches
    total_processed = 0
    batch_num = 0
    overall_start = time.time()

    while batch_num < args.max_batches:
        batch_offset = args.offset + (batch_num * args.batch_size)

        count = generator.process_batch(
            batch_size=args.batch_size,
            offset=batch_offset,
            city=args.city
        )

        if count == 0:
            print("\n✅ No more pending images to process")
            break

        total_processed += count
        batch_num += 1

    overall_time = time.time() - overall_start

    # Final statistics
    generator.print_stats()
    print(f"\n🎉 Total processed: {total_processed} images in {overall_time:.1f}s")
    print(f"   Average: {overall_time/max(total_processed, 1):.2f}s per image")

    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
