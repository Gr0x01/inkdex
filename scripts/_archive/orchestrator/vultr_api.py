#!/usr/bin/env python3
"""
Vultr API Wrapper

Manage VPS instances for scraper workers.
"""

import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

import requests

from config import (
    VULTR_API_BASE,
    VULTR_REGION,
    VULTR_PLAN,
    VULTR_OS_ID,
    VULTR_LABEL_PREFIX,
    VULTR_BOOT_TIMEOUT,
    VULTR_BOOT_POLL_INTERVAL,
    ENV_VULTR_API_KEY,
)

logger = logging.getLogger(__name__)


@dataclass
class VultrInstance:
    """Vultr instance data."""
    id: str
    label: str
    ip_address: Optional[str]
    status: str  # "pending", "active", "stopped", etc.
    region: str
    plan: str
    os: str
    default_password: Optional[str]
    created_at: str


class VultrAPIError(Exception):
    """Vultr API error."""
    pass


class VultrAPI:
    """Vultr API client."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get(ENV_VULTR_API_KEY)
        if not self.api_key:
            raise ValueError(f"Missing {ENV_VULTR_API_KEY}")

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _request(
        self,
        method: str,
        endpoint: str,
        json: dict = None,
        timeout: int = 30,
    ) -> dict:
        """Make API request."""
        url = f"{VULTR_API_BASE}{endpoint}"

        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                json=json,
                timeout=timeout,
            )

            if response.status_code == 204:
                return {}  # No content (e.g., DELETE)

            if not response.ok:
                error = response.json().get("error", response.text)
                raise VultrAPIError(f"Vultr API error ({response.status_code}): {error}")

            return response.json()

        except requests.RequestException as e:
            raise VultrAPIError(f"Request failed: {e}")

    def create_instance(
        self,
        label: str,
        region: str = None,
        plan: str = None,
        os_id: int = None,
    ) -> VultrInstance:
        """
        Create a new VPS instance.

        Args:
            label: Instance label (e.g., "inkdex-scraper-worker-01")
            region: Vultr region code (default: lax)
            plan: Vultr plan ID (default: vc2-1c-1gb)
            os_id: OS ID (default: Ubuntu 22.04)

        Returns:
            VultrInstance with pending status
        """
        data = {
            "region": region or VULTR_REGION,
            "plan": plan or VULTR_PLAN,
            "os_id": os_id or VULTR_OS_ID,
            "label": label,
            "enable_ipv6": False,
            "backups": "disabled",
            "hostname": label,
        }

        logger.info(f"Creating Vultr instance: {label}")
        response = self._request("POST", "/instances", json=data)

        instance_data = response.get("instance", {})
        return self._parse_instance(instance_data)

    def get_instance(self, instance_id: str) -> Optional[VultrInstance]:
        """Get instance details."""
        try:
            response = self._request("GET", f"/instances/{instance_id}")
            instance_data = response.get("instance", {})
            return self._parse_instance(instance_data)
        except VultrAPIError as e:
            if "404" in str(e):
                return None
            raise

    def list_instances(self, label_filter: str = None) -> list[VultrInstance]:
        """
        List all instances, optionally filtered by label prefix.

        Args:
            label_filter: Only return instances with labels starting with this

        Returns:
            List of VultrInstance
        """
        response = self._request("GET", "/instances")
        instances = []

        for data in response.get("instances", []):
            instance = self._parse_instance(data)
            if label_filter is None or instance.label.startswith(label_filter):
                instances.append(instance)

        return instances

    def destroy_instance(self, instance_id: str) -> bool:
        """
        Destroy (delete) an instance.

        Args:
            instance_id: Vultr instance ID

        Returns:
            True if destroyed successfully
        """
        logger.info(f"Destroying Vultr instance: {instance_id}")
        try:
            self._request("DELETE", f"/instances/{instance_id}")
            return True
        except VultrAPIError as e:
            logger.error(f"Failed to destroy instance: {e}")
            return False

    def wait_for_active(
        self,
        instance_id: str,
        timeout: int = None,
        poll_interval: int = None,
    ) -> VultrInstance:
        """
        Wait for instance to become active with an IP address.

        Args:
            instance_id: Vultr instance ID
            timeout: Max seconds to wait (default: 300)
            poll_interval: Seconds between status checks (default: 10)

        Returns:
            VultrInstance with active status

        Raises:
            TimeoutError if instance doesn't become active
        """
        timeout = timeout or VULTR_BOOT_TIMEOUT
        poll_interval = poll_interval or VULTR_BOOT_POLL_INTERVAL

        start_time = time.time()
        logger.info(f"Waiting for instance {instance_id} to become active...")

        while time.time() - start_time < timeout:
            instance = self.get_instance(instance_id)

            if not instance:
                raise VultrAPIError(f"Instance {instance_id} not found")

            if instance.status == "active" and instance.ip_address:
                logger.info(f"Instance active: {instance.ip_address}")
                return instance

            logger.debug(f"Instance status: {instance.status}, IP: {instance.ip_address}")
            time.sleep(poll_interval)

        raise TimeoutError(f"Instance {instance_id} did not become active within {timeout}s")

    def reboot_instance(self, instance_id: str) -> bool:
        """Reboot an instance."""
        try:
            self._request("POST", f"/instances/{instance_id}/reboot")
            return True
        except VultrAPIError as e:
            logger.error(f"Failed to reboot instance: {e}")
            return False

    def halt_instance(self, instance_id: str) -> bool:
        """Halt (stop) an instance."""
        try:
            self._request("POST", f"/instances/{instance_id}/halt")
            return True
        except VultrAPIError as e:
            logger.error(f"Failed to halt instance: {e}")
            return False

    def start_instance(self, instance_id: str) -> bool:
        """Start a halted instance."""
        try:
            self._request("POST", f"/instances/{instance_id}/start")
            return True
        except VultrAPIError as e:
            logger.error(f"Failed to start instance: {e}")
            return False

    def _parse_instance(self, data: dict) -> VultrInstance:
        """Parse API response into VultrInstance."""
        return VultrInstance(
            id=data.get("id", ""),
            label=data.get("label", ""),
            ip_address=data.get("main_ip") or None,
            status=data.get("status", "unknown"),
            region=data.get("region", ""),
            plan=data.get("plan", ""),
            os=data.get("os", ""),
            default_password=data.get("default_password"),
            created_at=data.get("date_created", ""),
        )


# =============================================================================
# Convenience Functions
# =============================================================================

def create_worker_instance(worker_name: str) -> VultrInstance:
    """
    Create a new worker instance.

    Args:
        worker_name: Worker name (e.g., "worker-01")

    Returns:
        VultrInstance (pending, no IP yet)
    """
    api = VultrAPI()
    label = f"{VULTR_LABEL_PREFIX}-{worker_name}"
    return api.create_instance(label)


def destroy_worker_instance(instance_id: str) -> bool:
    """Destroy a worker instance."""
    api = VultrAPI()
    return api.destroy_instance(instance_id)


def get_worker_instances() -> list[VultrInstance]:
    """Get all worker instances."""
    api = VultrAPI()
    return api.list_instances(label_filter=VULTR_LABEL_PREFIX)


def wait_for_worker_ready(instance_id: str) -> VultrInstance:
    """Wait for worker instance to be ready."""
    api = VultrAPI()
    return api.wait_for_active(instance_id)
