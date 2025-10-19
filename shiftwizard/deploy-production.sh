#!/bin/bash

# Roster86 Production Deployment Script
# Run this on your server to deploy Roster86

set -e

echo "🚀 Roster86 Production Deployment Starting..."

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

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo -e "${YELLOW}🔧 Installing essential tools...${NC}"
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx sqlite3

# Install Node.js 18
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python and pip for scheduling algorithm
echo -e "${YELLOW}🐍 Installing Python for scheduling engine...${NC}"
sudo apt install -y python3 python3-pip
pip3 install ortools pandas numpy

# Install PM2
echo -e "${YELLOW}⚙️ Installing PM2...${NC}"
sudo npm install -g pm2

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
mkdir -p /home/$USER/roster86
cd /home/$USER/roster86

# Check if code already exists
if [ -d "shiftwizard" ]; then
    echo -e "${YELLOW}📂 Updating existing code...${NC}"
    cd shiftwizard
    git pull
else
    echo -e "${YELLOW}📂 Cloning repository...${NC}"
    # Replace with your actual repository URL
    echo "Please provide your Git repository URL:"
    read -p "Repository URL: " REPO_URL
    git clone $REPO_URL .
    cd shiftwizard
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
cd backend && npm install && cd ..

# Build frontend
echo -e "${YELLOW}🏗️ Building frontend...${NC}"
npm run build

# Create environment file
echo -e "${YELLOW}⚙️ Setting up environment...${NC}"
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://$SERVER_IP

# Database
DATABASE_URL=./database.sqlite

# JWT Security (Generated)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=24h

# OpenAI Configuration (REQUIRED for AI suggestions)
OPENAI_API_KEY=your_openai_api_key_here

# WebSocket Configuration
REAL_TIME_UPDATES_ENABLED=true

# Stripe Configuration (REQUIRED - Update these!)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (Get from Stripe Dashboard)
STRIPE_STARTER_PRICE_ID=price_starter_monthly
STRIPE_STARTER_YEARLY_PRICE_ID=price_starter_yearly
STRIPE_PROFESSIONAL_PRICE_ID=price_professional_monthly
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_professional_yearly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_enterprise_yearly
EOF
    echo -e "${GREEN}✅ Created .env file with generated JWT secret${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Update the following in backend/.env file:${NC}"
    echo -e "${YELLOW}   - OPENAI_API_KEY (for AI scheduling suggestions)${NC}"
    echo -e "${YELLOW}   - Stripe keys for payment processing${NC}"
fi

# Initialize database
echo -e "${YELLOW}💾 Initializing database...${NC}"
cd backend
node scripts/init-db.js
node scripts/seed-db.js
cd ..

# Create PM2 ecosystem file
echo -e "${YELLOW}⚙️ Setting up PM2...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'roster86-api',
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
    max_memory_restart: '1G'
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
echo -e "${YELLOW}🚀 Starting application...${NC}"
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/roster86 > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    # Frontend
    location / {
        root /home/$USER/roster86/shiftwizard/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API
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
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Webhooks
    location /api/webhooks {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/roster86 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup backup script
echo -e "${YELLOW}💾 Setting up backup script...${NC}"
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp backend/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup application (excluding node_modules)
tar -czf $BACKUP_DIR/roster86_$DATE.tar.gz --exclude=node_modules --exclude=.git --exclude=dist .

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/roster86_$DATE.tar.gz"
EOF

chmod +x backup.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/roster86/shiftwizard/backup.sh") | crontab -

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 10

# Test application
echo -e "${YELLOW}🧪 Testing application...${NC}"
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running!${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check logs: pm2 logs roster86-api${NC}"
fi

if curl -f http://$SERVER_IP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible!${NC}"
else
    echo -e "${RED}❌ Frontend failed to start. Check Nginx: sudo systemctl status nginx${NC}"
fi

# Display results
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📍 Application URLs:${NC}"
echo -e "   Frontend: http://$SERVER_IP"
echo -e "   API: http://$SERVER_IP/api"
echo -e "   Health: http://$SERVER_IP/api/health"
echo ""
echo -e "${BLUE}🔐 Default Admin Login:${NC}"
echo -e "   Email: admin@roster86.com"
echo -e "   Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. Update Stripe keys in .env file"
echo "2. Change admin password"
echo "3. Point your domain to this server IP"
echo "4. Get SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "   View logs: pm2 logs roster86-api"
echo "   Restart: pm2 restart roster86-api"
echo "   Status: pm2 status"
echo "   Stop: pm2 stop roster86-api"
echo "   Backup: ./backup.sh"
echo ""
echo -e "${GREEN}Your Roster86 application is now running! 🚀${NC}"
