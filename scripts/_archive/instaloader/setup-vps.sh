#!/bin/bash
# ============================================================================
# Vultr VPS Setup Script for Instaloader Mining
# ============================================================================
#
# Run this on a fresh Ubuntu 22.04+ VPS:
#   curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/instaloader/setup-vps.sh | bash
#
# Or copy/paste sections manually.
#
# After setup, the miner runs as a systemd service that:
# - Starts automatically on boot
# - Restarts on failure
# - Logs to journalctl
# ============================================================================

set -e

echo "=== Instaloader Mining VPS Setup ==="

# ============================================================================
# 1. System Updates
# ============================================================================
echo "[1/5] Updating system..."
apt-get update && apt-get upgrade -y

# ============================================================================
# 2. Install Python 3.11+
# ============================================================================
echo "[2/5] Installing Python..."
apt-get install -y python3 python3-pip python3-venv git

# ============================================================================
# 3. Create dedicated user
# ============================================================================
echo "[3/5] Creating miner user..."
useradd -m -s /bin/bash miner || true
mkdir -p /home/miner/instaloader
chown -R miner:miner /home/miner

# ============================================================================
# 4. Setup Python environment
# ============================================================================
echo "[4/5] Setting up Python environment..."
sudo -u miner bash << 'EOF'
cd /home/miner/instaloader
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install instaloader supabase
EOF

# ============================================================================
# 5. Create systemd service
# ============================================================================
echo "[5/5] Creating systemd service..."

cat > /etc/systemd/system/instaloader-miner.service << 'EOF'
[Unit]
Description=Instaloader Hashtag Miner
After=network.target

[Service]
Type=simple
User=miner
WorkingDirectory=/home/miner/instaloader
Environment=SUPABASE_URL=YOUR_SUPABASE_URL
Environment=SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
ExecStart=/home/miner/instaloader/venv/bin/python slow_hashtag_miner.py
Restart=always
RestartSec=60

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=instaloader-miner

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Copy the miner script to the VPS:"
echo "   scp slow_hashtag_miner.py root@YOUR_VPS_IP:/home/miner/instaloader/"
echo ""
echo "2. Edit the service file with your Supabase credentials:"
echo "   nano /etc/systemd/system/instaloader-miner.service"
echo "   # Replace YOUR_SUPABASE_URL and YOUR_SERVICE_KEY"
echo ""
echo "3. Start the service:"
echo "   systemctl enable instaloader-miner"
echo "   systemctl start instaloader-miner"
echo ""
echo "4. Check logs:"
echo "   journalctl -u instaloader-miner -f"
echo ""
echo "5. Check stats (SSH in as miner):"
echo "   cd /home/miner/instaloader"
echo "   source venv/bin/activate"
echo "   python slow_hashtag_miner.py --stats"
echo ""
