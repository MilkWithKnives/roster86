#!/bin/bash

# ShiftWizard Production Deployment Script for Vultr
# WITH VULTR MANAGED POSTGRESQL DATABASE SUPPORT
# Run this on your Vultr VPS

set -e

echo "🚀 ShiftWizard Production Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please don't run this script as root. Run as a regular user with sudo privileges.${NC}"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo -e "${BLUE}Detected server IP: $SERVER_IP${NC}"

# Prompt for database credentials
echo ""
echo -e "${YELLOW}📋 Please provide your Vultr Managed Database credentials:${NC}"
read -p "Database Host (e.g., postgres-xxx.vultr-prod.com): " DB_HOST
read -p "Database Port (default 16751): " DB_PORT
DB_PORT=${DB_PORT:-16751}
read -p "Database Name (default defaultdb): " DB_NAME
DB_NAME=${DB_NAME:-defaultdb}
read -p "Database User (default vultradmin): " DB_USER
DB_USER=${DB_USER:-vultradmin}
read -sp "Database Password: " DB_PASSWORD
echo ""

# Test database connection
echo -e "${YELLOW}🔌 Testing database connection...${NC}"
if command -v psql &> /dev/null; then
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✅ Database connection successful!${NC}"
    else
        echo -e "${RED}❌ Database connection failed!${NC}"
        echo -e "${YELLOW}Make sure your VPS IP ($SERVER_IP) is added to Vultr Database Trusted Sources${NC}"
        read -p "Do you want to continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not installed yet. Will install it.${NC}"
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo -e "${YELLOW}🔧 Installing essential tools...${NC}"
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx postgresql-client

# Install Node.js 20
echo -e "${YELLOW}📦 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo -e "${YELLOW}⚙️ Installing PM2...${NC}"
sudo npm install -g pm2

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
sudo mkdir -p /var/www/shiftwizard
sudo chown -R $USER:$USER /var/www/shiftwizard
cd /var/www/shiftwizard

# Check if code already exists
if [ -d ".git" ]; then
    echo -e "${YELLOW}📂 Updating existing code...${NC}"
    git pull
else
    echo -e "${YELLOW}📂 Cloning repository...${NC}"
    echo "Please provide your Git repository URL (or press Enter to skip):"
    read -p "Repository URL: " REPO_URL
    if [ ! -z "$REPO_URL" ]; then
        git clone $REPO_URL .
    else
        echo -e "${YELLOW}⚠️  No repository URL provided. Make sure to upload your code to /var/www/shiftwizard${NC}"
        echo "You can use: rsync -avz --exclude 'node_modules' . user@$SERVER_IP:/var/www/shiftwizard/"
        read -p "Press Enter when code is uploaded..."
    fi
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
cd backend && npm install && cd ..

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}🔑 Generated JWT Secret${NC}"

# Create environment file
echo -e "${YELLOW}⚙️ Setting up environment...${NC}"
cat > backend/.env << EOF
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=production
PORT=3001

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
FRONTEND_URL=http://$SERVER_IP

# ==========================================
# JWT SECURITY (Auto-generated)
# ==========================================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# ==========================================
# VULTR MANAGED DATABASE (PostgreSQL)
# ==========================================
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Database connection pool
DATABASE_MAX_CONNECTIONS=20

# ==========================================
# OPTIONAL: ADVANCED FEATURES
# ==========================================
# Uncomment and add if you want AI scheduling features
# OPENAI_API_KEY=sk-your-openai-api-key-here

# Uncomment if you want Stripe payments
# STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
# STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
# STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key

# File uploads
UPLOAD_DIR=/var/www/shiftwizard/uploads
MAX_FILE_SIZE=10485760
EOF

echo -e "${GREEN}✅ Created backend/.env file${NC}"

# Create frontend environment file
cat > .env << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
EOF

echo -e "${GREEN}✅ Created frontend .env file${NC}"

# Build frontend
echo -e "${YELLOW}🏗️ Building frontend...${NC}"
npm run build

# Test database connection again with new PostgreSQL client
echo -e "${YELLOW}🔌 Verifying database connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection verified!${NC}"
else
    echo -e "${RED}❌ Warning: Cannot connect to database${NC}"
    echo -e "${YELLOW}Your app will try to connect anyway. Check logs if it fails.${NC}"
fi

# Create uploads directory
mkdir -p /var/www/shiftwizard/uploads
sudo chown -R $USER:$USER /var/www/shiftwizard/uploads

# Create PM2 ecosystem file
echo -e "${YELLOW}⚙️ Setting up PM2...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'shiftwizard-backend',
    script: 'backend/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
echo -e "${YELLOW}🚀 Starting backend with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 startup
echo -e "${YELLOW}Run the command above if shown, then press Enter...${NC}"
read -p "Press Enter to continue..."
pm2 save

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/shiftwizard > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP _;

    # Frontend (React app)
    root /var/www/shiftwizard/dist;
    index index.html;

    # Serve frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket Support for Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/shiftwizard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 10

# Test application
echo -e "${YELLOW}🧪 Testing application...${NC}"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running!${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check logs: pm2 logs shiftwizard-backend${NC}"
fi

if curl -f http://$SERVER_IP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible!${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may not be accessible yet. Check Nginx: sudo systemctl status nginx${NC}"
fi

# Display results
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📍 Application URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://$SERVER_IP${NC}"
echo -e "   API: ${GREEN}http://$SERVER_IP/api${NC}"
echo -e "   Health: ${GREEN}http://$SERVER_IP/health${NC}"
echo ""
echo -e "${BLUE}💾 Database:${NC}"
echo -e "   Type: ${GREEN}PostgreSQL (Vultr Managed)${NC}"
echo -e "   Host: ${GREEN}$DB_HOST:$DB_PORT${NC}"
echo -e "   Database: ${GREEN}$DB_NAME${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. Visit http://$SERVER_IP and create your admin account"
echo "2. Update environment variables if needed: nano /var/www/shiftwizard/backend/.env"
echo "3. Point your domain to this server IP: $SERVER_IP"
echo "4. Get SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "5. Update FRONTEND_URL in backend/.env to your domain"
echo "6. Rebuild frontend: cd /var/www/shiftwizard && npm run build"
echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "   View logs: ${GREEN}pm2 logs shiftwizard-backend${NC}"
echo "   Restart: ${GREEN}pm2 restart shiftwizard-backend${NC}"
echo "   Status: ${GREEN}pm2 status${NC}"
echo "   Stop: ${GREEN}pm2 stop shiftwizard-backend${NC}"
echo "   Update code: ${GREEN}cd /var/www/shiftwizard && git pull && npm run build && pm2 restart shiftwizard-backend${NC}"
echo ""
echo -e "${GREEN}Your ShiftWizard application is now running with PostgreSQL! 🚀${NC}"
