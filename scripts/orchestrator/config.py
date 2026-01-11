#!/usr/bin/env python3
"""
Orchestrator Configuration

All timing, thresholds, and Vultr settings in one place.
"""

import os

# =============================================================================
# Worker Configuration
# =============================================================================

TARGET_WORKERS = int(os.environ.get("TARGET_WORKERS", "2"))  # Start with 2, scale to 5
DELAY_BETWEEN_ARTISTS = 120  # 2 minutes - conservative to avoid rate limits
DELAY_BETWEEN_CITIES = 300   # 5 minutes between cities
IMAGES_PER_ARTIST = 12       # How many images to scrape per artist

# =============================================================================
# Orchestrator Configuration
# =============================================================================

ORCHESTRATOR_CHECK_INTERVAL = 30      # Seconds between health checks
HEARTBEAT_TIMEOUT = 120               # Seconds before worker considered dead
ROTATION_THRESHOLD = 3                # Consecutive 401s before IP rotation
STALE_CLAIM_THRESHOLD_MINUTES = 10    # Minutes before releasing stale claims
HEALTH_SERVER_PORT = 8080             # Worker health endpoint port

# =============================================================================
# Vultr API Configuration
# =============================================================================

VULTR_API_BASE = "https://api.vultr.com/v2"
VULTR_REGION = "lax"                  # Los Angeles
VULTR_PLAN = "vc2-1c-1gb"             # $5/mo: 1 vCPU, 1GB RAM, 25GB SSD
VULTR_OS_ID = 1743                    # Ubuntu 22.04 LTS x64
VULTR_LABEL_PREFIX = "inkdex-scraper"

# Instance boot timeout
VULTR_BOOT_TIMEOUT = 300              # 5 minutes
VULTR_BOOT_POLL_INTERVAL = 10         # 10 seconds

# SSH connection
SSH_CONNECT_TIMEOUT = 30              # Seconds to wait for SSH
SSH_COMMAND_TIMEOUT = 60              # Seconds per SSH command

# =============================================================================
# Tavily Configuration
# =============================================================================

TAVILY_DELAY_BETWEEN_QUERIES = 2      # Seconds between Tavily API calls
TAVILY_MAX_RESULTS = 10               # Results per query

# =============================================================================
# Style and Query Templates (same as international_miner.py)
# =============================================================================

QUERY_TEMPLATES = [
    "{style} tattoo artist {city} Instagram",
    "best tattoo artist {city} Instagram",
    "top tattoo artists {city}",
    "tattoo studio {city} Instagram",
    "custom tattoo {city}",
]

STYLES = [
    "fine line", "traditional", "geometric", "realism", "black and grey",
    "japanese", "watercolor", "minimalist", "blackwork", "dotwork",
    "neo traditional", "illustrative", "portrait", "floral", "tribal",
]

# =============================================================================
# Environment Variable Names
# =============================================================================

ENV_SUPABASE_URL = "SUPABASE_URL"
ENV_SUPABASE_KEY = "SUPABASE_SERVICE_KEY"
ENV_VULTR_API_KEY = "VULTR_API_KEY"
ENV_TAVILY_API_KEY = "TAVILY_API_KEY"
ENV_WORKER_NAME = "WORKER_NAME"
ENV_HEALTH_AUTH_TOKEN = "HEALTH_AUTH_TOKEN"
