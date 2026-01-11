#!/usr/bin/env python3
"""
Deploy Worker to VPS

SSH-based deployment of worker scripts to a fresh Vultr instance.
"""

import logging
import os
import secrets
import time
from pathlib import Path
from typing import Optional

import paramiko

from config import (
    SSH_CONNECT_TIMEOUT,
    SSH_COMMAND_TIMEOUT,
    HEALTH_SERVER_PORT,
    ENV_SUPABASE_URL,
    ENV_SUPABASE_KEY,
    ENV_TAVILY_API_KEY,
)

logger = logging.getLogger(__name__)

# Files to deploy (relative to scripts/orchestrator/)
WORKER_FILES = [
    "config.py",
    "db.py",
    "health_server.py",
    "worker.py",
]

# Python packages to install
PYTHON_PACKAGES = [
    "supabase",
    "instaloader",
    "Pillow",
    "requests",
    "paramiko",
]

# Systemd service template - uses EnvironmentFile for secrets (chmod 600)
SYSTEMD_SERVICE_TEMPLATE = """[Unit]
Description=Inkdex Scraper Worker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/worker
EnvironmentFile=/root/worker/.env
ExecStart=/root/worker/venv/bin/python worker.py
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""

# Environment file template - written to /root/worker/.env with chmod 600
ENV_FILE_TEMPLATE = """SUPABASE_URL={supabase_url}
SUPABASE_SERVICE_KEY={supabase_key}
TAVILY_API_KEY={tavily_key}
WORKER_NAME={worker_name}
HEALTH_AUTH_TOKEN={health_token}
"""


class DeploymentError(Exception):
    """Deployment failed."""
    pass


def wait_for_ssh(
    ip_address: str,
    password: str,
    timeout: int = 300,
    poll_interval: int = 10,
) -> paramiko.SSHClient:
    """
    Wait for SSH to become available.

    Args:
        ip_address: Server IP
        password: Root password
        timeout: Max seconds to wait
        poll_interval: Seconds between attempts

    Returns:
        Connected SSHClient
    """
    start_time = time.time()
    logger.info(f"Waiting for SSH on {ip_address}...")

    while time.time() - start_time < timeout:
        try:
            client = paramiko.SSHClient()
            # AutoAddPolicy is intentional for ephemeral Vultr instances
            # that get new host keys on each creation. We verify identity
            # via the Vultr API returning instance IP, not host keys.
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                ip_address,
                username="root",
                password=password,
                timeout=SSH_CONNECT_TIMEOUT,
            )
            logger.info("SSH connection established")
            return client

        except Exception as e:
            logger.debug(f"SSH not ready: {e}")
            time.sleep(poll_interval)

    raise DeploymentError(f"SSH not available on {ip_address} after {timeout}s")


def run_ssh_command(
    client: paramiko.SSHClient,
    command: str,
    timeout: int = None,
) -> tuple[int, str, str]:
    """
    Run SSH command and return results.

    Args:
        client: Connected SSHClient
        command: Command to run
        timeout: Command timeout

    Returns:
        (exit_code, stdout, stderr)
    """
    timeout = timeout or SSH_COMMAND_TIMEOUT

    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()

    return exit_code, stdout.read().decode(), stderr.read().decode()


def upload_file(
    client: paramiko.SSHClient,
    local_path: Path,
    remote_path: str,
) -> None:
    """Upload file via SFTP."""
    sftp = client.open_sftp()
    try:
        sftp.put(str(local_path), remote_path)
    finally:
        sftp.close()


def upload_content(
    client: paramiko.SSHClient,
    content: str,
    remote_path: str,
) -> None:
    """Upload string content as file via SFTP."""
    sftp = client.open_sftp()
    try:
        with sftp.file(remote_path, 'w') as f:
            f.write(content)
    finally:
        sftp.close()


def deploy_worker(
    ip_address: str,
    password: str,
    worker_name: str,
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None,
    tavily_key: Optional[str] = None,
) -> bool:
    """
    Deploy worker to a fresh VPS.

    Args:
        ip_address: Server IP
        password: Root password
        worker_name: Worker name (e.g., "worker-01")
        supabase_url: Supabase URL (or from env)
        supabase_key: Supabase service key (or from env)
        tavily_key: Tavily API key (or from env)

    Returns:
        True if deployment succeeded
    """
    # Get env vars
    supabase_url = supabase_url or os.environ.get(ENV_SUPABASE_URL)
    supabase_key = supabase_key or os.environ.get(ENV_SUPABASE_KEY)
    tavily_key = tavily_key or os.environ.get(ENV_TAVILY_API_KEY)

    if not all([supabase_url, supabase_key, tavily_key]):
        raise DeploymentError("Missing environment variables")

    # Get local script directory
    script_dir = Path(__file__).parent

    try:
        # Connect
        client = wait_for_ssh(ip_address, password)

        try:
            # 1. System updates
            logger.info("Installing system packages...")
            exit_code, _, stderr = run_ssh_command(
                client,
                "apt-get update && apt-get install -y python3 python3-pip python3-venv",
                timeout=300,
            )
            if exit_code != 0:
                raise DeploymentError(f"System package install failed: {stderr}")

            # 2. Create worker directory
            logger.info("Creating worker directory...")
            run_ssh_command(client, "mkdir -p /root/worker")

            # 3. Upload worker files
            logger.info("Uploading worker files...")
            for filename in WORKER_FILES:
                local_path = script_dir / filename
                if not local_path.exists():
                    raise DeploymentError(f"Missing file: {local_path}")
                upload_file(client, local_path, f"/root/worker/{filename}")

            # 4. Create virtualenv
            logger.info("Creating Python virtualenv...")
            exit_code, _, stderr = run_ssh_command(
                client,
                "cd /root/worker && python3 -m venv venv",
                timeout=60,
            )
            if exit_code != 0:
                raise DeploymentError(f"Venv creation failed: {stderr}")

            # 5. Install Python packages
            logger.info("Installing Python packages...")
            packages = " ".join(PYTHON_PACKAGES)
            exit_code, _, stderr = run_ssh_command(
                client,
                f"cd /root/worker && ./venv/bin/pip install {packages}",
                timeout=300,
            )
            if exit_code != 0:
                raise DeploymentError(f"Package install failed: {stderr}")

            # 6. Create environment file with secrets (chmod 600)
            logger.info("Creating environment file...")
            health_token = secrets.token_urlsafe(32)
            env_content = ENV_FILE_TEMPLATE.format(
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                tavily_key=tavily_key,
                worker_name=worker_name,
                health_token=health_token,
            )
            upload_content(client, env_content, "/root/worker/.env")
            run_ssh_command(client, "chmod 600 /root/worker/.env")

            # 7. Create systemd service
            logger.info("Creating systemd service...")
            upload_content(client, SYSTEMD_SERVICE_TEMPLATE, "/etc/systemd/system/scraper-worker.service")

            # 8. Enable and start service
            logger.info("Starting worker service...")
            run_ssh_command(client, "systemctl daemon-reload")
            run_ssh_command(client, "systemctl enable scraper-worker")
            exit_code, _, stderr = run_ssh_command(client, "systemctl start scraper-worker")
            if exit_code != 0:
                raise DeploymentError(f"Service start failed: {stderr}")

            # 9. Verify service is running
            time.sleep(5)
            exit_code, stdout, _ = run_ssh_command(client, "systemctl is-active scraper-worker")
            if stdout.strip() != "active":
                raise DeploymentError(f"Service not active: {stdout}")

            logger.info(f"Worker deployed successfully: {worker_name} @ {ip_address}")
            return True

        finally:
            client.close()

    except DeploymentError:
        raise
    except Exception as e:
        raise DeploymentError(f"Deployment failed: {e}")


def stop_worker(ip_address: str, password: str) -> bool:
    """Stop worker service via SSH."""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip_address, username="root", password=password, timeout=SSH_CONNECT_TIMEOUT)

        try:
            run_ssh_command(client, "systemctl stop scraper-worker")
            logger.info(f"Worker stopped: {ip_address}")
            return True
        finally:
            client.close()

    except Exception as e:
        logger.error(f"Failed to stop worker: {e}")
        return False


def restart_worker(ip_address: str, password: str) -> bool:
    """Restart worker service via SSH."""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip_address, username="root", password=password, timeout=SSH_CONNECT_TIMEOUT)

        try:
            run_ssh_command(client, "systemctl restart scraper-worker")
            logger.info(f"Worker restarted: {ip_address}")
            return True
        finally:
            client.close()

    except Exception as e:
        logger.error(f"Failed to restart worker: {e}")
        return False


def get_worker_logs(ip_address: str, password: str, lines: int = 100) -> str:
    """Get recent worker logs via SSH."""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(ip_address, username="root", password=password, timeout=SSH_CONNECT_TIMEOUT)

        try:
            _, stdout, _ = run_ssh_command(
                client,
                f"journalctl -u scraper-worker -n {lines} --no-pager",
            )
            return stdout
        finally:
            client.close()

    except Exception as e:
        return f"Failed to get logs: {e}"


# =============================================================================
# CLI for testing
# =============================================================================

if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Deploy worker to VPS")
    parser.add_argument("--ip", required=True, help="Server IP address")
    parser.add_argument("--password", required=True, help="Root password")
    parser.add_argument("--name", required=True, help="Worker name")
    args = parser.parse_args()

    try:
        deploy_worker(args.ip, args.password, args.name)
        print("Deployment successful!")
    except DeploymentError as e:
        print(f"Deployment failed: {e}")
        exit(1)
