#!/usr/bin/env python3
"""
Scraper Orchestrator - Worker Fleet Manager

Manages distributed scraper workers:
- Monitors worker health via HTTP endpoints
- Detects rate limit events from Supabase
- Triggers IP rotation via Vultr API
- Deploys scripts to new instances via SSH
- Spawns new workers to maintain target count

Usage:
  python orchestrator.py                    # Run continuously
  python orchestrator.py --status           # Show fleet status
  python orchestrator.py --spawn worker-03  # Manually spawn worker

Environment Variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key
  VULTR_API_KEY         - Vultr API key
  TAVILY_API_KEY        - Tavily API key (for workers)
  TARGET_WORKERS        - Target number of workers (default: 2)
"""

import argparse
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta
from typing import Optional

import requests

from config import (
    TARGET_WORKERS,
    ORCHESTRATOR_CHECK_INTERVAL,
    HEARTBEAT_TIMEOUT,
    ROTATION_THRESHOLD,
    STALE_CLAIM_THRESHOLD_MINUTES,
    HEALTH_SERVER_PORT,
    VULTR_LABEL_PREFIX,
)
from db import (
    get_supabase_client,
    get_fleet_status,
    update_worker_status,
    release_stale_claims,
    log_orchestrator_action,
    get_queue_stats,
    Worker,
)
from vultr_api import (
    VultrAPI,
    VultrInstance,
    create_worker_instance,
    destroy_worker_instance,
    wait_for_worker_ready,
    get_worker_instances,
)
from deploy import deploy_worker, stop_worker

logger = logging.getLogger(__name__)


class Orchestrator:
    """Manages scraper worker fleet."""

    def __init__(self, target_workers: int = None):
        self.target_workers = target_workers or TARGET_WORKERS
        self.supabase = get_supabase_client()
        self.vultr = VultrAPI()
        self.shutdown_requested = False

        # Track workers we're currently rotating (to avoid double-rotation)
        self.rotating_workers: set[str] = set()

    def run(self):
        """Main orchestrator loop."""
        logger.info(f"Starting orchestrator with target_workers={self.target_workers}")

        while not self.shutdown_requested:
            try:
                self._check_cycle()
            except Exception as e:
                logger.error(f"Error in check cycle: {e}")

            time.sleep(ORCHESTRATOR_CHECK_INTERVAL)

        logger.info("Orchestrator shutting down")

    def _check_cycle(self):
        """One check cycle."""
        # 1. Get current fleet status from Supabase
        workers = get_fleet_status(self.supabase)
        active_workers = [w for w in workers if w.status == "active"]

        logger.debug(f"Fleet status: {len(active_workers)} active, {len(workers)} total")

        # 2. Check each worker's health
        for worker in active_workers:
            self._check_worker_health(worker)

        # 3. Release stale claims from dead workers
        released_artists, released_cities = release_stale_claims(
            self.supabase,
            STALE_CLAIM_THRESHOLD_MINUTES,
        )
        if released_artists > 0 or released_cities > 0:
            logger.info(f"Released stale claims: {released_artists} artists, {released_cities} cities")

        # 4. Spawn new workers if below target
        active_count = len([w for w in workers if w.status in ("active", "provisioning")])
        if active_count < self.target_workers:
            workers_needed = self.target_workers - active_count
            logger.info(f"Need to spawn {workers_needed} workers")

            for i in range(workers_needed):
                self._spawn_worker()

    def _check_worker_health(self, worker: Worker):
        """Check worker health and trigger rotation if needed."""
        # Skip if already rotating
        if worker.id in self.rotating_workers:
            return

        # Check HTTP health endpoint
        is_healthy = self._ping_worker(worker)

        if not is_healthy:
            # Worker unresponsive - check heartbeat
            if worker.last_heartbeat_at:
                last_heartbeat = datetime.fromisoformat(
                    worker.last_heartbeat_at.replace("Z", "+00:00")
                )
                age = (datetime.now(last_heartbeat.tzinfo) - last_heartbeat).total_seconds()

                if age > HEARTBEAT_TIMEOUT:
                    logger.warning(f"Worker {worker.worker_name} unresponsive for {age:.0f}s")
                    self._rotate_worker(worker, "heartbeat_timeout")
                    return

        # Check rate limit threshold
        if worker.consecutive_401s >= ROTATION_THRESHOLD:
            logger.warning(
                f"Worker {worker.worker_name} hit rate limit threshold "
                f"({worker.consecutive_401s} consecutive 401s)"
            )
            self._rotate_worker(worker, "rate_limit_threshold")

    def _ping_worker(self, worker: Worker) -> bool:
        """Ping worker health endpoint."""
        if not worker.ip_address:
            return False

        try:
            response = requests.get(
                f"http://{worker.ip_address}:{HEALTH_SERVER_PORT}/health",
                timeout=5,
            )
            return response.ok and response.json().get("status") == "ok"
        except:
            return False

    def _rotate_worker(self, worker: Worker, reason: str):
        """Rotate a worker to get a fresh IP."""
        logger.info(f"Rotating worker {worker.worker_name} (reason: {reason})")

        self.rotating_workers.add(worker.id)

        try:
            # 1. Mark as rotating
            update_worker_status(self.supabase, worker.id, "rotating")

            # 2. Try graceful shutdown
            if worker.ip_address and worker.vultr_instance_id:
                # First try HTTP shutdown
                try:
                    requests.post(
                        f"http://{worker.ip_address}:{HEALTH_SERVER_PORT}/shutdown",
                        timeout=5,
                    )
                    time.sleep(30)  # Wait for graceful shutdown
                except:
                    pass

                # Get instance password for SSH
                instance = self.vultr.get_instance(worker.vultr_instance_id)
                if instance and instance.default_password:
                    stop_worker(worker.ip_address, instance.default_password)

            # 3. Destroy old instance
            if worker.vultr_instance_id:
                destroy_worker_instance(worker.vultr_instance_id)

            # 4. Mark old worker as terminated
            update_worker_status(self.supabase, worker.id, "terminated")

            # 5. Log action
            log_orchestrator_action(
                self.supabase,
                action="worker_rotate",
                worker_id=worker.id,
                worker_name=worker.worker_name,
                old_instance_id=worker.vultr_instance_id,
                old_ip=str(worker.ip_address) if worker.ip_address else None,
                reason=reason,
            )

            # 6. Spawn replacement (will get new name like worker-N+1)
            # Actually, let the next check cycle spawn it to avoid confusion
            logger.info(f"Worker {worker.worker_name} rotated, replacement will spawn in next cycle")

        except Exception as e:
            logger.error(f"Failed to rotate worker {worker.worker_name}: {e}")
        finally:
            self.rotating_workers.discard(worker.id)

    def _spawn_worker(self):
        """Spawn a new worker instance."""
        # Generate worker name
        worker_name = self._generate_worker_name()
        logger.info(f"Spawning new worker: {worker_name}")

        try:
            # 1. Create Vultr instance
            instance = create_worker_instance(worker_name)
            logger.info(f"Created instance {instance.id}")

            # 2. Wait for it to become active
            instance = wait_for_worker_ready(instance.id)
            logger.info(f"Instance ready: {instance.ip_address}")

            # 3. Deploy worker scripts
            if not instance.default_password:
                raise Exception("No default password available")

            deploy_worker(
                instance.ip_address,
                instance.default_password,
                worker_name,
            )

            # 4. Log action
            log_orchestrator_action(
                self.supabase,
                action="worker_spawn",
                worker_name=worker_name,
                new_instance_id=instance.id,
                new_ip=instance.ip_address,
                reason="maintain_target_count",
            )

            logger.info(f"Worker {worker_name} spawned successfully at {instance.ip_address}")

        except Exception as e:
            logger.error(f"Failed to spawn worker {worker_name}: {e}")

            # Log failed action
            log_orchestrator_action(
                self.supabase,
                action="worker_spawn_failed",
                worker_name=worker_name,
                reason=str(e)[:500],
            )

    def _generate_worker_name(self) -> str:
        """Generate unique worker name."""
        # Get existing workers
        workers = get_fleet_status(self.supabase)
        existing_names = {w.worker_name for w in workers}

        # Find next available number
        for i in range(1, 100):
            name = f"worker-{i:02d}"
            if name not in existing_names:
                return name

        # Fallback with timestamp
        return f"worker-{int(time.time())}"

    def status(self):
        """Print fleet status."""
        workers = get_fleet_status(self.supabase)
        stats = get_queue_stats(self.supabase)

        print("\n=== Fleet Status ===")
        print(f"Target workers: {self.target_workers}")
        print(f"Active workers: {len([w for w in workers if w.status == 'active'])}")
        print()

        if workers:
            print(f"{'Name':<12} {'IP':<16} {'Status':<12} {'401s':<6} {'Artists':<8} {'Uptime':<10}")
            print("-" * 70)

            for w in workers:
                uptime = ""
                if w.uptime_seconds:
                    hours = w.uptime_seconds // 3600
                    mins = (w.uptime_seconds % 3600) // 60
                    uptime = f"{hours}h {mins}m"

                print(
                    f"{w.worker_name:<12} "
                    f"{str(w.ip_address or '-'):<16} "
                    f"{w.status:<12} "
                    f"{w.consecutive_401s:<6} "
                    f"{w.artists_processed:<8} "
                    f"{uptime:<10}"
                )

        print("\n=== Queue Status ===")
        print(f"Cities pending: {stats.get('cities_pending', 0)}")
        print(f"Cities in progress: {stats.get('cities_in_progress', 0)}")
        print(f"Cities completed: {stats.get('cities_completed', 0)}")
        print(f"Artists pending: {stats.get('artists_pending', 0)}")
        print(f"Artists completed: {stats.get('artists_completed', 0)}")
        print(f"Total images: {stats.get('total_images_scraped', 0):,}")
        print()

    def spawn_worker_manually(self, worker_name: str):
        """Manually spawn a specific worker."""
        logger.info(f"Manually spawning worker: {worker_name}")

        try:
            instance = create_worker_instance(worker_name)
            logger.info(f"Created instance {instance.id}")

            instance = wait_for_worker_ready(instance.id)
            logger.info(f"Instance ready: {instance.ip_address}")

            if not instance.default_password:
                raise Exception("No default password available")

            deploy_worker(
                instance.ip_address,
                instance.default_password,
                worker_name,
            )

            print(f"\nWorker spawned successfully!")
            print(f"  Name: {worker_name}")
            print(f"  IP: {instance.ip_address}")
            print(f"  Instance ID: {instance.id}")

        except Exception as e:
            print(f"Failed to spawn worker: {e}")
            sys.exit(1)


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Scraper orchestrator")
    parser.add_argument("--status", action="store_true", help="Show fleet status")
    parser.add_argument("--spawn", metavar="NAME", help="Manually spawn a worker")
    parser.add_argument("--target", type=int, help="Target number of workers")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    target = args.target or int(os.environ.get("TARGET_WORKERS", TARGET_WORKERS))
    orchestrator = Orchestrator(target_workers=target)

    if args.status:
        orchestrator.status()
        return

    if args.spawn:
        orchestrator.spawn_worker_manually(args.spawn)
        return

    # Handle signals
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal...")
        orchestrator.shutdown_requested = True

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run
    orchestrator.run()


if __name__ == "__main__":
    main()
