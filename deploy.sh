#!/bin/bash
set -e

echo "========================================="
echo " LMS Portal - Automated Deployment"
echo "========================================="

DOMAIN="digitalstudyacademy.com"
REPO="https://github.com/rahuldv006/llms.git"
APP_DIR="/var/www/llms"

# ── 1. System Update ─────────────────────────────────────
echo "[1/8] Updating system..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install Node.js 20 ────────────────────────────────
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# ── 3. Install PM2 & Nginx ───────────────────────────────
echo "[3/8] Installing PM2 and Nginx..."
npm install -g pm2
apt-get install -y nginx

# ── 4. Clone / Pull Repo ─────────────────────────────────
echo "[4/8] Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
  cd $APP_DIR && git pull origin main
else
  rm -rf $APP_DIR
  git clone $REPO $APP_DIR
  cd $APP_DIR
fi

# ── 5. Set up env & install server deps ──────────────────
echo "[5/8] Setting up server..."
cd $APP_DIR/server
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudycluster.tkpcaax.mongodb.net/?appName=DigitalStudyCluster
JWT_SECRET=LmsDeploy@d3b64c5eSecure!
EOF
npm install --production

# ── 6. Build React client ────────────────────────────────
echo "[6/8] Building React frontend..."
cd $APP_DIR/client
npm install
npm run build

# ── 7. Start server with PM2 ─────────────────────────────
echo "[7/8] Starting server with PM2..."
pm2 delete llms 2>/dev/null || true
pm2 start $APP_DIR/server/server.js --name llms --env production
pm2 save
pm2 startup systemd -u root --hp /root | grep "^sudo" | bash || true

# ── 8. Configure Nginx ───────────────────────────────────
echo "[8/8] Configuring Nginx..."
cat > /etc/nginx/sites-available/lms << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50m;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx && systemctl enable nginx

# ── 9. SSL with Let's Encrypt ────────────────────────────
echo "[SSL] Setting up HTTPS..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN -d www.$DOMAIN \
  --non-interactive --agree-tos \
  --email digitalstudy5555@gmail.com \
  --redirect || echo "NOTE: SSL skipped - ensure DNS is pointed to this server first"

echo ""
echo "========================================="
echo " DEPLOYMENT COMPLETE!"
echo " Site: http://$DOMAIN (https after DNS)"
echo " Health: http://143.110.183.139/api/health"
echo "========================================="
pm2 status
