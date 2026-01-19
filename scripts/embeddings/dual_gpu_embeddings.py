#!/usr/bin/env python3
"""
Dual-GPU Embedding Orchestrator

Coordinates embedding generation across two GPUs:
- RTX 4080 (Windows, 10.2.0.10:5000) - 60% of work
- A2000 (Linux/Mac, local) - 40% of work

Automatically splits work based on GPU performance and triggers both in parallel.

Usage:
    python scripts/embeddings/dual_gpu_embeddings.py
    python scripts/embeddings/dual_gpu_embeddings.py --city "Austin, TX"

Requirements:
    - Windows listener running: python windows-listener.py
    - Network access to Windows machine at 10.2.0.10:5000
"""

import os
import sys
import argparse
import requests
from typing import Optional
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
WINDOWS_GPU_URL = os.getenv("WINDOWS_GPU_URL", "http://10.2.0.10:5000")
WINDOWS_GPU_API_KEY = os.getenv("WINDOWS_GPU_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PIPELINE_RUN_ID = os.getenv("PIPELINE_RUN_ID")

# GPU performance ratios (based on benchmarks)
GPU_4080_RATIO = 0.60  # 4080 processes 60% of work (faster)
GPU_A2000_RATIO = 0.40  # A2000 processes 40% of work

class DualGPUOrchestrator:
    """Coordinate embedding generation across two GPUs"""

    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    def count_pending_images(self, city: Optional[str] = None) -> int:
        """Count images that need embeddings"""

        query = self.supabase.table("portfolio_images") \
            .select("id", count="exact") \
            .is_("embedding", "null") \
            .eq("status", "pending")

        if city:
            artists = self.supabase.table("artists") \
                .select("id") \
                .eq("city", city) \
                .execute()
            artist_ids = [a["id"] for a in artists.data]
            if artist_ids:
                query = query.in_("artist_id", artist_ids)

        result = query.execute()
        return result.count or 0

    def check_windows_gpu(self) -> bool:
        """Check if Windows GPU listener is available"""
        try:
            headers = {}
            # Health check doesn't require auth, but include it if available
            if WINDOWS_GPU_API_KEY:
                headers['Authorization'] = f'Bearer {WINDOWS_GPU_API_KEY}'

            response = requests.get(f"{WINDOWS_GPU_URL}/health", headers=headers, timeout=2)
            if response.ok:
                data = response.json()
                if data.get("auth_required") and not WINDOWS_GPU_API_KEY:
                    print(f"⚠️  Windows GPU requires API key but WINDOWS_GPU_API_KEY not set")
                    return False
                return data.get("status") == "ok"
        except Exception as e:
            print(f"⚠️  Windows GPU not available: {e}")
            return False
        return False

    def trigger_windows_gpu(self, offset: int, max_batches: int, parallel: int = 6) -> bool:
        """Trigger embedding job on Windows GPU via HTTP"""
        try:
            payload = {
                "offset": offset,
                "max_batches": max_batches,
                "parallel": parallel,
                "batch_size": 100,
                "pipeline_run_id": PIPELINE_RUN_ID
            }

            headers = {'Content-Type': 'application/json'}
            if WINDOWS_GPU_API_KEY:
                headers['Authorization'] = f'Bearer {WINDOWS_GPU_API_KEY}'

            print(f"🚀 Triggering Windows GPU (4080)...")
            print(f"   Offset: {offset}, Batches: {max_batches}")

            response = requests.post(
                f"{WINDOWS_GPU_URL}/trigger",
                json=payload,
                headers=headers,
                timeout=5
            )

            if response.status_code == 202:
                print(f"✅ Windows GPU started successfully")
                return True
            elif response.status_code == 401:
                print(f"❌ Windows GPU trigger failed: Invalid API key")
                return False
            elif response.status_code == 429:
                print(f"❌ Windows GPU trigger failed: Rate limit exceeded")
                return False
            else:
                print(f"❌ Windows GPU trigger failed: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                except:
                    pass
                return False

        except Exception as e:
            print(f"❌ Failed to trigger Windows GPU: {e}")
            return False

    def run_local_gpu(self, offset: int, max_batches: int, parallel: int = 4):
        """Run embedding generation on local A2000 GPU"""
        import subprocess

        # Build absolute path to script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(script_dir, 'local_batch_embeddings.py')

        # Use platform-appropriate Python command
        python_cmd = 'python' if sys.platform == 'win32' else 'python3'

        cmd = [
            python_cmd,
            script_path,
            '--parallel', str(parallel),
            '--offset', str(offset),
            '--max-batches', str(max_batches),
            '--batch-size', '100'
        ]

        env = os.environ.copy()
        if PIPELINE_RUN_ID:
            env['PIPELINE_RUN_ID'] = PIPELINE_RUN_ID

        print(f"\n🚀 Starting Local GPU (A2000)...")
        print(f"   Offset: {offset}, Batches: {max_batches}")

        try:
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=False,  # Show output in real-time
                text=True
            )

            if result.returncode == 0:
                print(f"\n✅ Local GPU completed successfully")
            else:
                print(f"\n❌ Local GPU failed with exit code {result.returncode}")
                sys.exit(result.returncode)

        except Exception as e:
            print(f"\n❌ Local GPU error: {e}")
            sys.exit(1)

    def wait_for_windows_gpu(self, check_interval: int = 10, timeout: int = 7200) -> bool:
        """Poll Windows GPU /status endpoint until job completes or times out

        Args:
            check_interval: Seconds between status checks (default 10)
            timeout: Maximum wait time in seconds (default 2 hours)

        Returns:
            True if job completed successfully, False if failed/timed out
        """
        import time
        print(f"\n⏳ Waiting for Windows GPU to complete...")
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                headers = {}
                if WINDOWS_GPU_API_KEY:
                    headers['Authorization'] = f'Bearer {WINDOWS_GPU_API_KEY}'

                response = requests.get(
                    f"{WINDOWS_GPU_URL}/status",
                    headers=headers,
                    timeout=5
                )

                if response.ok:
                    data = response.json()
                    status = data.get('status')
                    progress = data.get('progress', {})

                    if status == 'idle' or status == 'completed':
                        print(f"\n✅ Windows GPU completed")
                        return True
                    elif status == 'running':
                        processed = progress.get('processed', 0)
                        total = progress.get('total', 0)
                        elapsed = int(time.time() - start_time)
                        print(f"   Windows GPU: {processed}/{total} ({elapsed}s elapsed)    ", end='\r')
                    elif status == 'error':
                        error_msg = data.get('error', 'Unknown error')
                        print(f"\n❌ Windows GPU failed: {error_msg}")
                        return False

                time.sleep(check_interval)

            except requests.exceptions.RequestException as e:
                # Network error - Windows GPU may be unreachable
                print(f"\n⚠️  Failed to check Windows GPU status: {e}")
                time.sleep(check_interval)
            except Exception as e:
                print(f"\n⚠️  Unexpected error checking Windows GPU: {e}")
                time.sleep(check_interval)

        print(f"\n⚠️  Windows GPU polling timed out after {timeout}s")
        return False


def main():
    parser = argparse.ArgumentParser(description="Dual-GPU embedding orchestrator")
    parser.add_argument('--city', type=str, help='Filter by city')
    parser.add_argument('--force-single', action='store_true', help='Use only A2000 (skip Windows GPU)')
    args = parser.parse_args()

    # Validate configuration
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Supabase credentials not configured")
        print(f"   SUPABASE_URL: {SUPABASE_URL}")
        print(f"   SERVICE_ROLE_KEY: {'set' if SUPABASE_SERVICE_ROLE_KEY else 'missing'}")
        return 1

    orchestrator = DualGPUOrchestrator()

    print("="*60)
    print("🎯 DUAL-GPU EMBEDDING ORCHESTRATOR")
    print("="*60)

    # Count pending images
    total_pending = orchestrator.count_pending_images(args.city)
    print(f"📊 Total pending images: {total_pending:,}")

    # Initialize pipeline progress with REAL total at start
    if PIPELINE_RUN_ID:
        try:
            orchestrator.supabase.table("pipeline_jobs").update({
                "total_items": total_pending,
                "processed_items": 0,
                "failed_items": 0,
            }).eq("id", PIPELINE_RUN_ID).execute()
            print(f"✅ Pipeline progress initialized: 0/{total_pending}")
        except Exception as e:
            print(f"⚠️  Warning: Could not initialize pipeline progress: {e}")

    if total_pending == 0:
        print("✅ No pending images to process")
        return 0

    # Check Windows GPU availability
    windows_available = False if args.force_single else orchestrator.check_windows_gpu()

    if windows_available:
        print(f"✅ Windows GPU (4080) available at {WINDOWS_GPU_URL}")
        print(f"\n📋 Work Distribution:")
        print(f"   RTX 4080: {int(total_pending * GPU_4080_RATIO):,} images ({int(GPU_4080_RATIO * 100)}%)")
        print(f"   A2000:    {int(total_pending * GPU_A2000_RATIO):,} images ({int(GPU_A2000_RATIO * 100)}%)")

        # Calculate offsets and batches
        images_4080 = int(total_pending * GPU_4080_RATIO)
        batches_4080 = (images_4080 + 99) // 100  # Round up

        images_a2000 = total_pending - images_4080
        batches_a2000 = (images_a2000 + 99) // 100  # Round up

        # Trigger Windows GPU (4080 processes images 0 to images_4080)
        windows_started = orchestrator.trigger_windows_gpu(
            offset=0,
            max_batches=batches_4080,
            parallel=6
        )

        if not windows_started:
            print("\n⚠️  Windows GPU failed to start, falling back to A2000 only")
            windows_available = False
        else:
            # Run local GPU (A2000 processes images images_4080 to end)
            print(f"\n" + "="*60)
            orchestrator.run_local_gpu(
                offset=images_4080,
                max_batches=batches_a2000,
                parallel=2  # Reduced from 4 to lower laptop CPU/network load
            )

            # Wait for Windows GPU to complete before exiting
            # This ensures the pipeline job doesn't mark complete prematurely
            windows_success = orchestrator.wait_for_windows_gpu()
            if not windows_success:
                print("⚠️  Windows GPU may not have completed successfully")
                # Don't exit with error - local GPU portion completed fine
    else:
        print(f"⚠️  Windows GPU not available, using A2000 only")

    # If Windows GPU not available, process all images on A2000
    if not windows_available:
        print(f"\n📋 Work Distribution:")
        print(f"   A2000: {total_pending:,} images (100%)")

        batches_all = (total_pending + 99) // 100
        orchestrator.run_local_gpu(
            offset=0,
            max_batches=batches_all,
            parallel=2  # Reduced from 4 to lower laptop CPU/network load
        )

    print("\n" + "="*60)
    print("🎉 DUAL-GPU ORCHESTRATION COMPLETE")
    print("="*60)

    return 0

if __name__ == "__main__":
    sys.exit(main())
