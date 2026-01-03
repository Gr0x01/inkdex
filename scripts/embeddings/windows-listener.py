#!/usr/bin/env python3
"""
Windows GPU Embedding Listener Service (Secured)

Listens for HTTP requests to start embedding generation on Windows 4080 GPU.
Runs as a background service that the Mac orchestrator can trigger.

Security Features:
- API key authentication (Bearer token)
- Rate limiting (10 requests/minute per IP)
- Request validation
- IP whitelist support (optional)

Usage:
    python windows-listener.py --port 5000 --api-key YOUR_SECRET_KEY

On Windows, run this in PowerShell:
    cd C:\tattoo-embeddings
    .\venv\Scripts\activate
    python windows-listener.py --api-key YOUR_SECRET_KEY

Environment Variables:
    WINDOWS_GPU_API_KEY - API key for authentication (alternative to --api-key)
    ALLOWED_IPS - Comma-separated list of allowed IPs (optional, e.g., "10.2.20.21,1.2.3.4")
"""

import subprocess
import sys
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self, max_requests=10, window_minutes=1):
        self.max_requests = max_requests
        self.window_seconds = window_minutes * 60
        self.requests = defaultdict(list)

    def is_allowed(self, client_ip):
        """Check if request is allowed based on rate limit"""
        now = time.time()

        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window_seconds
        ]

        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            return False

        # Add current request
        self.requests[client_ip].append(now)
        return True


# Job tracking state for /status endpoint
# Allows orchestrator to poll and wait for job completion
current_job = {
    'status': 'idle',  # idle, running, completed, error
    'progress': {'processed': 0, 'total': 0, 'failed': 0},
    'started_at': None,
    'completed_at': None,
    'error': None
}
job_lock = threading.Lock()


class EmbeddingRequestHandler(BaseHTTPRequestHandler):
    """Handle HTTP requests to trigger embedding generation"""

    # Class variables (set by server)
    api_key = None
    rate_limiter = None
    allowed_ips = None

    def _check_auth(self):
        """Verify API key authentication"""
        if not self.api_key:
            return True  # No auth required if API key not set

        auth_header = self.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return False

        token = auth_header[7:]  # Remove "Bearer " prefix
        return token == self.api_key

    def _check_ip_whitelist(self):
        """Verify IP is in whitelist (if configured)"""
        if not self.allowed_ips:
            return True  # No whitelist configured

        client_ip = self.client_address[0]
        return client_ip in self.allowed_ips

    def _check_rate_limit(self):
        """Verify request doesn't exceed rate limit"""
        if not self.rate_limiter:
            return True

        client_ip = self.client_address[0]
        return self.rate_limiter.is_allowed(client_ip)

    def do_POST(self):
        """Handle POST request to start embedding job"""
        if self.path != '/trigger':
            self.send_response(404)
            self.end_headers()
            return

        # Check IP whitelist
        if not self._check_ip_whitelist():
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "IP not allowed"}')
            return

        # Check authentication
        if not self._check_auth():
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Invalid API key"}')
            return

        # Check rate limit
        if not self._check_rate_limit():
            self.send_response(429)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Rate limit exceeded"}')
            return

        # Parse request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            params = json.loads(body.decode('utf-8')) if body else {}
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Invalid JSON"}')
            return

        # Validate and extract parameters
        try:
            offset = int(params.get('offset', 0))
            max_batches = int(params.get('max_batches', 100))
            parallel = int(params.get('parallel', 6))
            batch_size = int(params.get('batch_size', 100))
            pipeline_run_id = params.get('pipeline_run_id')

            # Validation
            if offset < 0 or offset > 1000000:
                raise ValueError("offset must be between 0 and 1,000,000")
            if max_batches < 1 or max_batches > 1000:
                raise ValueError("max_batches must be between 1 and 1,000")
            if parallel < 1 or parallel > 16:
                raise ValueError("parallel must be between 1 and 16")
            if batch_size < 1 or batch_size > 500:
                raise ValueError("batch_size must be between 1 and 500")

        except (ValueError, TypeError) as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_msg = json.dumps({"error": f"Invalid parameters: {str(e)}"})
            self.wfile.write(error_msg.encode('utf-8'))
            return

        # Start embedding job in background thread
        def run_embedding_job():
            global current_job

            # Initialize job status
            with job_lock:
                current_job = {
                    'status': 'running',
                    'progress': {
                        'processed': 0,
                        'total': max_batches * batch_size,
                        'failed': 0
                    },
                    'started_at': datetime.utcnow().isoformat() + 'Z',
                    'completed_at': None,
                    'error': None
                }

            # Use venv Python to ensure dependencies are available
            venv_dir = os.path.join(os.getcwd(), 'venv')
            if os.name == 'nt':  # Windows
                python_exe = os.path.join(venv_dir, 'Scripts', 'python.exe')
            else:  # Unix/Mac
                python_exe = os.path.join(venv_dir, 'bin', 'python')

            # Fallback to current Python if venv not found
            if not os.path.exists(python_exe):
                python_exe = sys.executable

            # Build absolute path to script
            script_path = os.path.join(os.getcwd(), 'local_batch_embeddings.py')

            # Validate paths exist
            if not os.path.exists(python_exe):
                print(f"❌ Error: Python executable not found: {python_exe}")
                with job_lock:
                    current_job['status'] = 'error'
                    current_job['error'] = f'Python executable not found: {python_exe}'
                    current_job['completed_at'] = datetime.utcnow().isoformat() + 'Z'
                return

            if not os.path.exists(script_path):
                print(f"❌ Error: Script not found: {script_path}")
                with job_lock:
                    current_job['status'] = 'error'
                    current_job['error'] = f'Script not found: {script_path}'
                    current_job['completed_at'] = datetime.utcnow().isoformat() + 'Z'
                return

            cmd = [
                python_exe,
                script_path,
                '--parallel', str(parallel),
                '--offset', str(offset),
                '--max-batches', str(max_batches),
                '--batch-size', str(batch_size)
            ]

            env = os.environ.copy()
            if pipeline_run_id:
                env['PIPELINE_RUN_ID'] = pipeline_run_id

            print(f"🚀 Starting embedding job: {' '.join(cmd)}")

            try:
                result = subprocess.run(
                    cmd,
                    env=env,
                    capture_output=True,
                    text=True,
                    encoding='utf-8',  # Explicitly use UTF-8
                    errors='replace',  # Replace decode errors instead of crashing
                    timeout=7200  # 2 hour timeout
                )

                with job_lock:
                    current_job['completed_at'] = datetime.utcnow().isoformat() + 'Z'
                    if result.returncode == 0:
                        current_job['status'] = 'completed'
                        print(f"✅ Embedding job completed successfully")
                    else:
                        current_job['status'] = 'error'
                        current_job['error'] = result.stderr[:500] if result.stderr else 'Unknown error'
                        print(f"❌ Embedding job failed: {result.stderr}")

            except subprocess.TimeoutExpired:
                with job_lock:
                    current_job['status'] = 'error'
                    current_job['error'] = 'Job timed out after 2 hours'
                    current_job['completed_at'] = datetime.utcnow().isoformat() + 'Z'
                print(f"⏰ Embedding job timed out after 2 hours")

            except Exception as e:
                with job_lock:
                    current_job['status'] = 'error'
                    current_job['error'] = str(e)[:500]
                    current_job['completed_at'] = datetime.utcnow().isoformat() + 'Z'
                print(f"❌ Error running embedding job: {e}")

        # Start in background thread
        thread = threading.Thread(target=run_embedding_job, daemon=True)
        thread.start()

        # Send immediate response
        self.send_response(202)  # 202 Accepted
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = {
            'status': 'started',
            'message': f'Embedding job started with offset={offset}, max_batches={max_batches}',
            'parameters': {
                'offset': offset,
                'max_batches': max_batches,
                'parallel': parallel,
                'batch_size': batch_size
            }
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_GET(self):
        """Handle health check and status endpoints"""
        if self.path == '/health':
            # Health check doesn't require auth
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            health_data = {
                "status": "ok",
                "gpu": "RTX 4080",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "auth_required": self.api_key is not None,
                "rate_limit": f"{self.rate_limiter.max_requests}/min" if self.rate_limiter else "none"
            }
            self.wfile.write(json.dumps(health_data).encode('utf-8'))

        elif self.path == '/status':
            # Job status endpoint - allows orchestrator to poll for completion
            # Check authentication (if configured)
            if not self._check_auth():
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid API key"}')
                return

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with job_lock:
                self.wfile.write(json.dumps(current_job).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    parser = argparse.ArgumentParser(description="Windows GPU embedding listener service (secured)")
    parser.add_argument('--port', type=int, default=5000, help='Port to listen on (default: 5000)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--api-key', type=str, help='API key for authentication (or set WINDOWS_GPU_API_KEY env var)')
    parser.add_argument('--rate-limit', type=int, default=10, help='Max requests per minute per IP (default: 10)')
    parser.add_argument('--allowed-ips', type=str, help='Comma-separated list of allowed IPs (or set ALLOWED_IPS env var)')
    args = parser.parse_args()

    # Get API key from args or environment
    api_key = args.api_key or os.getenv('WINDOWS_GPU_API_KEY')

    # Get allowed IPs from args or environment
    allowed_ips_str = args.allowed_ips or os.getenv('ALLOWED_IPS')
    allowed_ips = set(allowed_ips_str.split(',')) if allowed_ips_str else None

    # Set up rate limiter
    rate_limiter = RateLimiter(max_requests=args.rate_limit, window_minutes=1)

    # Configure handler class variables
    EmbeddingRequestHandler.api_key = api_key
    EmbeddingRequestHandler.rate_limiter = rate_limiter
    EmbeddingRequestHandler.allowed_ips = allowed_ips

    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, EmbeddingRequestHandler)

    print("="*60)
    print("🖥️  Windows GPU Embedding Listener (SECURED)")
    print("="*60)
    print(f"GPU: RTX 4080")
    print(f"Listening on: http://{args.host}:{args.port}")
    print(f"Health check: http://{args.host}:{args.port}/health")
    print(f"Trigger endpoint: POST http://{args.host}:{args.port}/trigger")
    print("="*60)
    print("🔒 Security Configuration:")
    print(f"   API Key: {'✅ Required' if api_key else '⚠️  Not set (INSECURE!)'}")
    print(f"   Rate Limit: {args.rate_limit} requests/minute per IP")
    print(f"   IP Whitelist: {'✅ Enabled (' + str(len(allowed_ips)) + ' IPs)' if allowed_ips else '⚠️  Disabled (all IPs allowed)'}")
    if allowed_ips:
        print(f"   Allowed IPs: {', '.join(sorted(allowed_ips))}")
    print("="*60)

    if not api_key:
        print("\n⚠️  WARNING: No API key set! This service is INSECURE.")
        print("   Set --api-key or WINDOWS_GPU_API_KEY environment variable")
        print("   Example: python windows-listener.py --api-key YOUR_SECRET_KEY\n")

    print("Ready to receive embedding jobs...")
    print("Press Ctrl+C to stop\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down listener...")
        httpd.shutdown()

if __name__ == '__main__':
    main()
