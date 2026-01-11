#!/usr/bin/env python3
"""
Health Server - HTTP endpoint for worker monitoring

Runs in each worker, provides health/status endpoints for orchestrator.

Endpoints:
  GET /health   -> Quick health check
  GET /status   -> Detailed status
  POST /shutdown -> Trigger graceful shutdown (requires auth token)
"""

import json
import logging
import os
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional, TYPE_CHECKING

from config import ENV_HEALTH_AUTH_TOKEN

if TYPE_CHECKING:
    from worker import ScraperWorker

logger = logging.getLogger(__name__)


class HealthHandler(BaseHTTPRequestHandler):
    """HTTP request handler for health endpoints."""

    # Class-level reference to worker (set by start_server)
    worker: Optional["ScraperWorker"] = None
    # Auth token for protected endpoints (set by start_server)
    auth_token: Optional[str] = None

    def log_message(self, format, *args):
        """Suppress default logging to avoid spam."""
        pass

    def _check_auth(self) -> bool:
        """Check Authorization header for valid token."""
        if not self.auth_token:
            # No token configured - allow all (dev mode)
            return True

        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            return token == self.auth_token

        return False

    def _send_json(self, data: dict, status: int = 200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/health":
            self._handle_health()
        elif self.path == "/status":
            self._handle_status()
        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        """Handle POST requests."""
        if self.path == "/shutdown":
            self._handle_shutdown()
        else:
            self.send_error(404, "Not found")

    def _handle_health(self):
        """
        Quick health check.

        Response:
        {
            "status": "ok",
            "worker_name": "worker-01",
            "consecutive_401s": 0
        }
        """
        if not self.worker:
            self._send_json({"status": "error", "message": "Worker not initialized"}, 500)
            return

        self._send_json({
            "status": "ok" if not self.worker.shutdown_requested else "shutting_down",
            "worker_name": self.worker.worker_name,
            "consecutive_401s": self.worker.consecutive_401s,
        })

    def _handle_status(self):
        """
        Detailed status with all metrics.

        Response:
        {
            "status": "ok",
            "worker_name": "worker-01",
            "worker_id": "uuid",
            "current_city": "toronto",
            "current_artist": "@someartist",
            "consecutive_401s": 0,
            "artists_processed": 150,
            "images_processed": 1200,
            "uptime_seconds": 3600,
            "shutdown_requested": false
        }
        """
        if not self.worker:
            self._send_json({"status": "error", "message": "Worker not initialized"}, 500)
            return

        uptime = int(time.time() - self.worker.start_time) if self.worker.start_time else 0

        self._send_json({
            "status": "ok" if not self.worker.shutdown_requested else "shutting_down",
            "worker_name": self.worker.worker_name,
            "worker_id": self.worker.worker_id,
            "current_city": self.worker.current_city,
            "current_artist": self.worker.current_artist,
            "consecutive_401s": self.worker.consecutive_401s,
            "artists_processed": self.worker.artists_processed,
            "images_processed": self.worker.images_processed,
            "uptime_seconds": uptime,
            "shutdown_requested": self.worker.shutdown_requested,
        })

    def _handle_shutdown(self):
        """
        Trigger graceful shutdown.

        Requires Authorization: Bearer <token> header.
        The worker will finish processing the current artist,
        then exit the main loop.
        """
        # Require auth for shutdown
        if not self._check_auth():
            self._send_json({"status": "error", "message": "Unauthorized"}, 401)
            return

        if not self.worker:
            self._send_json({"status": "error", "message": "Worker not initialized"}, 500)
            return

        logger.info("Shutdown requested via HTTP")
        self.worker.shutdown_requested = True

        self._send_json({
            "status": "ok",
            "message": "Shutdown initiated, finishing current artist",
        })


def start_health_server(worker: "ScraperWorker", port: int = 8080) -> HTTPServer:
    """
    Start health server in background thread.

    Args:
        worker: ScraperWorker instance to monitor
        port: Port to listen on (default 8080)

    Returns:
        HTTPServer instance (for shutdown if needed)
    """
    HealthHandler.worker = worker
    HealthHandler.auth_token = os.environ.get(ENV_HEALTH_AUTH_TOKEN)

    if not HealthHandler.auth_token:
        logger.warning("HEALTH_AUTH_TOKEN not set - shutdown endpoint is unprotected!")

    server = HTTPServer(("0.0.0.0", port), HealthHandler)

    thread = threading.Thread(
        target=server.serve_forever,
        name="HealthServer",
        daemon=True,  # Dies with main thread
    )
    thread.start()

    logger.info(f"Health server started on port {port}")
    return server
