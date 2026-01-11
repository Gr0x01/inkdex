#!/usr/bin/env python3
"""
Supabase Database Operations for Orchestrator/Workers

Replaces SQLite local state with Supabase shared state.
All workers coordinate through these functions.
"""

import logging
import os
from typing import Optional
from dataclasses import dataclass

from supabase import create_client, Client

from config import ENV_SUPABASE_URL, ENV_SUPABASE_KEY

logger = logging.getLogger(__name__)


@dataclass
class City:
    """City from scraper_city_queue."""
    id: str
    city_slug: str
    city_name: str
    region: Optional[str]
    country_code: str
    priority: int


@dataclass
class Artist:
    """Artist from scraper_artist_queue."""
    id: str
    instagram_handle: str
    city_slug: str
    retry_count: int


@dataclass
class Worker:
    """Worker from scraper_workers."""
    id: str
    worker_name: str
    vultr_instance_id: Optional[str]
    ip_address: Optional[str]
    status: str
    last_heartbeat_at: Optional[str]
    started_at: Optional[str]
    current_city_slug: Optional[str]
    current_artist_handle: Optional[str]
    artists_processed: int
    images_processed: int
    consecutive_401s: int
    total_401s_lifetime: int
    last_error: Optional[str]
    uptime_seconds: Optional[int]


def get_supabase_client() -> Client:
    """Create Supabase client from environment variables."""
    url = os.environ.get(ENV_SUPABASE_URL)
    key = os.environ.get(ENV_SUPABASE_KEY)
    if not url or not key:
        raise ValueError(f"Missing {ENV_SUPABASE_URL} or {ENV_SUPABASE_KEY}")
    return create_client(url, key)


# =============================================================================
# Worker Operations
# =============================================================================

def register_worker(
    supabase: Client,
    worker_name: str,
    vultr_instance_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    """
    Register a new worker or update existing one.
    Returns worker_id.
    """
    result = supabase.rpc("register_worker", {
        "p_worker_name": worker_name,
        "p_vultr_instance_id": vultr_instance_id,
        "p_ip_address": ip_address,
    }).execute()

    return result.data


def worker_heartbeat(
    supabase: Client,
    worker_id: str,
    current_city_slug: Optional[str] = None,
    current_artist_handle: Optional[str] = None,
    artists_processed: Optional[int] = None,
    images_processed: Optional[int] = None,
) -> None:
    """Update worker heartbeat and current status."""
    supabase.rpc("worker_heartbeat", {
        "p_worker_id": worker_id,
        "p_current_city_slug": current_city_slug,
        "p_current_artist_handle": current_artist_handle,
        "p_artists_processed": artists_processed,
        "p_images_processed": images_processed,
    }).execute()


def update_worker_status(supabase: Client, worker_id: str, status: str) -> None:
    """Update worker status (active, rotating, offline, terminated)."""
    supabase.table("scraper_workers").update({
        "status": status,
    }).eq("id", worker_id).execute()


def get_fleet_status(supabase: Client) -> list[Worker]:
    """Get status of all workers for monitoring."""
    result = supabase.rpc("get_fleet_status").execute()

    return [Worker(
        id=row["id"],
        worker_name=row["worker_name"],
        vultr_instance_id=row.get("vultr_instance_id"),
        ip_address=row.get("ip_address"),
        status=row["status"],
        last_heartbeat_at=row.get("last_heartbeat_at"),
        started_at=row.get("started_at"),
        current_city_slug=row.get("current_city_slug"),
        current_artist_handle=row.get("current_artist_handle"),
        artists_processed=row.get("artists_processed", 0),
        images_processed=row.get("images_processed", 0),
        consecutive_401s=row.get("consecutive_401s", 0),
        total_401s_lifetime=row.get("total_401s_lifetime", 0),
        last_error=row.get("last_error"),
        uptime_seconds=row.get("uptime_seconds"),
    ) for row in result.data]


# =============================================================================
# City Queue Operations
# =============================================================================

def claim_next_city(supabase: Client, worker_id: str) -> Optional[City]:
    """
    Atomically claim the next available city.
    Returns City or None if no cities available.
    """
    result = supabase.rpc("claim_next_city", {
        "p_worker_id": worker_id,
    }).execute()

    if not result.data or len(result.data) == 0:
        return None

    row = result.data[0]
    return City(
        id=row["id"],
        city_slug=row["city_slug"],
        city_name=row["city_name"],
        region=row.get("region"),
        country_code=row["country_code"],
        priority=row.get("priority", 0),
    )


def complete_city(supabase: Client, city_slug: str, artists_discovered: int) -> None:
    """Mark city as completed."""
    supabase.table("scraper_city_queue").update({
        "status": "completed",
        "completed_at": "now()",
        "artists_discovered": artists_discovered,
    }).eq("city_slug", city_slug).execute()


def release_city(supabase: Client, city_slug: str) -> None:
    """Release city back to pending (e.g., on worker shutdown)."""
    supabase.table("scraper_city_queue").update({
        "status": "pending",
        "claimed_by_worker_id": None,
        "claimed_at": None,
    }).eq("city_slug", city_slug).execute()


# =============================================================================
# Artist Queue Operations
# =============================================================================

def add_artists_to_queue(
    supabase: Client,
    city_slug: str,
    handles: list[str],
) -> int:
    """
    Add discovered artists to the queue.
    Returns number added (duplicates are skipped).
    """
    if not handles:
        return 0

    # Prepare rows
    rows = [
        {"instagram_handle": h.lower(), "city_slug": city_slug}
        for h in handles
    ]

    # Use upsert to skip duplicates
    try:
        result = supabase.table("scraper_artist_queue").upsert(
            rows,
            on_conflict="instagram_handle,city_slug",
        ).execute()
        return len(result.data) if result.data else 0
    except Exception as e:
        # Some duplicates may cause issues, log and continue
        logger.warning(f"Error adding artists to queue: {e}")
        return 0


def claim_next_artist(supabase: Client, worker_id: str, city_slug: str) -> Optional[Artist]:
    """
    Atomically claim the next artist in a city.
    Returns Artist or None if no artists remaining.
    """
    result = supabase.rpc("claim_next_artist", {
        "p_worker_id": worker_id,
        "p_city_slug": city_slug,
    }).execute()

    if not result.data or len(result.data) == 0:
        return None

    row = result.data[0]
    return Artist(
        id=row["id"],
        instagram_handle=row["instagram_handle"],
        city_slug=row["city_slug"],
        retry_count=row.get("retry_count", 0),
    )


def complete_artist(
    supabase: Client,
    artist_queue_id: str,
    status: str,
    images_scraped: int = 0,
    follower_count: Optional[int] = None,
    artist_id: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """Mark artist as completed/failed with results."""
    supabase.rpc("complete_artist", {
        "p_artist_queue_id": artist_queue_id,
        "p_status": status,
        "p_images_scraped": images_scraped,
        "p_follower_count": follower_count,
        "p_artist_id": artist_id,
        "p_error_message": error_message,
    }).execute()


# =============================================================================
# Rate Limit Operations
# =============================================================================

def report_rate_limit(
    supabase: Client,
    worker_id: str,
    error_code: str,
    error_message: Optional[str] = None,
    artist_handle: Optional[str] = None,
) -> int:
    """
    Report a rate limit event.
    Returns new consecutive_401s count.
    """
    result = supabase.rpc("report_rate_limit", {
        "p_worker_id": worker_id,
        "p_error_code": error_code,
        "p_error_message": error_message,
        "p_artist_handle": artist_handle,
    }).execute()

    return result.data or 0


def reset_rate_limit_counter(supabase: Client, worker_id: str) -> None:
    """Reset consecutive 401 counter after successful scrape."""
    supabase.rpc("reset_rate_limit_counter", {
        "p_worker_id": worker_id,
    }).execute()


def get_recent_rate_limits(supabase: Client, limit: int = 50) -> list[dict]:
    """Get recent rate limit events for admin panel."""
    result = supabase.table("scraper_rate_limit_events").select(
        "id, worker_id, ip_address, error_code, error_message, artist_handle, created_at"
    ).order("created_at", desc=True).limit(limit).execute()

    return result.data or []


# =============================================================================
# Orchestrator Operations
# =============================================================================

def release_stale_claims(supabase: Client, threshold_minutes: int = 10) -> tuple[int, int]:
    """
    Release claims from dead/stale workers.
    Returns (released_artists, released_cities).
    """
    result = supabase.rpc("release_stale_claims", {
        "p_stale_threshold_minutes": threshold_minutes,
    }).execute()

    if result.data and len(result.data) > 0:
        row = result.data[0]
        return row.get("released_artists", 0), row.get("released_cities", 0)
    return 0, 0


def log_orchestrator_action(
    supabase: Client,
    action: str,
    worker_id: Optional[str] = None,
    worker_name: Optional[str] = None,
    old_instance_id: Optional[str] = None,
    new_instance_id: Optional[str] = None,
    old_ip: Optional[str] = None,
    new_ip: Optional[str] = None,
    reason: Optional[str] = None,
    details: Optional[dict] = None,
) -> str:
    """Log an orchestrator action. Returns log_id."""
    result = supabase.rpc("log_orchestrator_action", {
        "p_action": action,
        "p_worker_id": worker_id,
        "p_worker_name": worker_name,
        "p_old_instance_id": old_instance_id,
        "p_new_instance_id": new_instance_id,
        "p_old_ip": old_ip,
        "p_new_ip": new_ip,
        "p_reason": reason,
        "p_details": details,
    }).execute()

    return result.data


def get_orchestrator_history(supabase: Client, limit: int = 50) -> list[dict]:
    """Get orchestrator action history for admin panel."""
    result = supabase.table("scraper_orchestrator_log").select(
        "*"
    ).order("created_at", desc=True).limit(limit).execute()

    return result.data or []


def get_queue_stats(supabase: Client) -> dict:
    """Get queue statistics for admin panel."""
    result = supabase.rpc("get_queue_stats").execute()

    if result.data and len(result.data) > 0:
        return result.data[0]
    return {}
