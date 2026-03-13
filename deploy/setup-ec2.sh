#!/bin/bash
# ──────────────────────────────────────────────────────────────
# EC2 Initial Setup Script — BCSE 3D Lab Manager
# Run ONCE on a fresh Ubuntu EC2 instance:
#   chmod +x setup-ec2.sh && sudo bash setup-ec2.sh
# ──────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/ubuntu/bcse-3d-lab"
DATA_DIR="/home/ubuntu/bcse-3d-lab-data"

echo "══════════════════════════════════════════"
echo "  BCSE 3D Lab — EC2 Setup"
echo "══════════════════════════════════════════"

# 1. System update
echo "→ Updating system..."
apt-get update -y && apt-get upgrade -y

# 2. Install Node.js 20 LTS
echo "→ Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node -v) | npm: $(npm -v)"

# 3. Install build tools (needed for better-sqlite3)
echo "→ Installing build essentials..."
apt-get install -y build-essential python3

# 4. Install PM2 globally
echo "→ Installing PM2..."
npm install -g pm2

# 5. Install Nginx
echo "→ Installing Nginx..."
apt-get install -y nginx

# 6. Configure Nginx reverse proxy
echo "→ Configuring Nginx..."
cat > /etc/nginx/sites-available/bcse-3d-lab <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/bcse-3d-lab /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# 7. Create app & data directories
echo "→ Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/printer-images"
chown -R ubuntu:ubuntu "$APP_DIR" "$DATA_DIR"

# 8. Create .env file (template)
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<ENV
PORT=3000
NODE_ENV=production
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
DATA_DIR=$DATA_DIR
ALLOWED_ORIGINS=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_EC2_IP")
LOG_LEVEL=info
ENV
  chown ubuntu:ubuntu "$APP_DIR/.env"
  echo "  Created .env with generated JWT_SECRET"
fi

# 9. PM2 startup (auto-start on reboot)
echo "→ Setting up PM2 startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 10. Firewall
echo "→ Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  App dir:  $APP_DIR"
echo "  Data dir: $DATA_DIR"
echo "  .env:     $APP_DIR/.env"
echo ""
echo "  Next: push to GitHub main branch"
echo "  and CI/CD will deploy automatically."
echo "══════════════════════════════════════════"
