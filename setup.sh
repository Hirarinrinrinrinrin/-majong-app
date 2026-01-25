#!/bin/bash

# MAJONG APP SETUP SCRIPT
# This script sets up a production environment for Next.js + SQLite on Ubuntu.
# Run as root.

set -e

# --- CONFIGURATION (Change if needed) ---
APP_DIR="/var/www/majong-app"
DATA_DIR="/var/www/majong-data"
DOMAIN="jyotomahjongclub.com"
NODE_VERSION="20" # LTS
# ----------------------------------------

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo bash setup.sh)"
  exit 1
fi

echo ">>> 1. Updating System..."
apt update && apt upgrade -y

echo ">>> 2. Installing Dependencies (Curl, Git, Build Tools)..."
apt install -y curl git build-essential nginx certbot python3-certbot-nginx sqlite3

echo ">>> 3. Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

echo ">>> 4. Installing Global NPM Packages (PM2)..."
npm install -g pm2

echo ">>> 5. Configuring Directories..."
# Create data directory if not exists (Persistent storage)
mkdir -p "$DATA_DIR"
# Create app directory
mkdir -p "$APP_DIR"

# Set permissions (Assume user is root for now, or create a 'web' user? 
# For simplicity in this guide, we run as root. For stricter security, use a dedicated user.)
# We'll stick to root for setup simplicity as requested "easiest way".

echo ">>> 6. Configuring Firewall (UFW)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# Enable UFW if not enabled (Caution: don't lock out SSH)
# ufw --force enable 
# (Commented out safety: user should enable manually or confirm)

echo ">>> 7. Creating Nginx Configuration..."
echo "Setting up Nginx for domain: $DOMAIN"

cat > /etc/nginx/sites-available/majong <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/majong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and Reload Nginx
nginx -t
systemctl reload nginx

echo ">>> 8. Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Upload your code to $APP_DIR"
echo "   (Exclude .next, node_modules, .git)"
echo "2. Inside $APP_DIR, run: npm install"
echo "3. Run database setup if needed (sqlite3)"
echo "   * IMPORTANT: Ensure DB path in .env points to $DATA_DIR/majong.db"
echo "4. Build app: npm run build"
echo "5. Start with PM2: pm2 start npm --name 'majong' -- start"
echo "6. Save PM2 list: pm2 save && pm2 startup"
echo "7. (Optional) Run Certbot for SSL: certbot --nginx -d $DOMAIN"
echo ""
