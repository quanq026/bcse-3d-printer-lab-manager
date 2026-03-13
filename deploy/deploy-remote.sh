#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Remote Deploy Script — runs ON the EC2 instance
# Called by GitHub Actions after scp
# ──────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/ubuntu/bcse-3d-lab"

echo "→ Extracting package..."
cd "$APP_DIR"
tar -xzf /tmp/deploy-package.tar.gz --overwrite
rm -f /tmp/deploy-package.tar.gz

echo "→ Installing production dependencies..."
npm ci --omit=dev

echo "→ Restarting app with PM2..."
if pm2 describe bcse-3d-lab &>/dev/null; then
  pm2 restart bcse-3d-lab
else
  pm2 start pm2.config.cjs --env production
fi

pm2 save

echo "✅ Deploy complete! App running on port 3000"
