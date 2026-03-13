#!/bin/bash
# ──────────────────────────────────────────────────────────────
# EC2 Initial Setup Script — BCSE 3D Lab Manager
# For Amazon Linux 2023
# Run ONCE on a fresh EC2 instance:
#   chmod +x setup-ec2.sh && sudo bash setup-ec2.sh
# ──────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/ec2-user/bcse-3d-lab"
DATA_DIR="/home/ec2-user/bcse-3d-lab-data"

echo "══════════════════════════════════════════"
echo "  BCSE 3D Lab — EC2 Setup (AL2023)"
echo "══════════════════════════════════════════"

# 1. System update
echo "→ Updating system..."
dnf update -y

# 2. Install Node.js 20 LTS
echo "→ Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  dnf install -y nodejs20 nodejs20-npm
  # If not available via dnf, use nvm
  if ! command -v node &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  fi
fi
echo "  Node: $(node -v) | npm: $(npm -v)"

# 3. Install build tools (needed for better-sqlite3 native compilation)
echo "→ Installing build essentials..."
dnf groupinstall -y "Development Tools"
dnf install -y python3 make gcc gcc-c++

# 4. Install PM2 globally
echo "→ Installing PM2..."
npm install -g pm2

# 5. Install Nginx
echo "→ Installing Nginx..."
dnf install -y nginx

# 6. Configure Nginx reverse proxy
echo "→ Configuring Nginx..."
cat > /etc/nginx/conf.d/bcse-3d-lab.conf <<'NGINX'
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

nginx -t && systemctl restart nginx
systemctl enable nginx

# 7. Create app & data directories
echo "→ Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/printer-images"
chown -R ec2-user:ec2-user "$APP_DIR" "$DATA_DIR"

# 8. Create .env file (template)
if [ ! -f "$APP_DIR/.env" ]; then
  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_EC2_IP")
  cat > "$APP_DIR/.env" <<ENV
PORT=3000
NODE_ENV=production
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
DATA_DIR=$DATA_DIR
ALLOWED_ORIGINS=http://$PUBLIC_IP
LOG_LEVEL=info
ENV
  chown ec2-user:ec2-user "$APP_DIR/.env"
  echo "  Created .env with generated JWT_SECRET"
fi

# 9. PM2 startup (auto-start on reboot)
echo "→ Setting up PM2 startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 10. Install git if not present
dnf install -y git

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
