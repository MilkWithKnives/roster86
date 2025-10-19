#!/bin/bash

# ShiftWizard Server Setup Script
# ==============================
# Run this script on a fresh Ubuntu 20.04+ server to prepare it for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 ShiftWizard Server Setup"
echo "=========================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "Don't run this script as root. Create and use a deploy user."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    fail2ban \
    ufw \
    htop \
    nginx \
    certbot \
    python3-certbot-nginx \
    sqlite3 \
    python3 \
    python3-pip

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    print_success "Docker installed successfully"
else
    print_success "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose already installed"
fi

# Install Node.js 18
print_status "Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js $(node --version) installed"
else
    print_success "Node.js $(node --version) already installed"
fi

# Install PM2
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup
    print_success "PM2 installed successfully"
else
    print_success "PM2 already installed"
fi

# Install Python packages for scheduling
print_status "Installing Python packages for scheduling engine..."
pip3 install --user ortools pandas numpy

# Setup directories
print_status "Setting up directory structure..."
sudo mkdir -p /var/www/shiftwizard
sudo mkdir -p /var/log/shiftwizard
sudo mkdir -p /var/backups/shiftwizard
sudo mkdir -p /etc/shiftwizard
sudo mkdir -p /etc/ssl/shiftwizard

# Set permissions
sudo chown -R $USER:$USER /var/www/shiftwizard
sudo chown -R $USER:$USER /var/log/shiftwizard
sudo chown -R $USER:$USER /var/backups/shiftwizard

print_success "Directories created successfully"

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
print_success "Firewall configured"

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_success "fail2ban configured"

# Setup logrotate
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/shiftwizard << EOF > /dev/null
/var/log/shiftwizard/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
        pm2 reload shiftwizard > /dev/null 2>&1 || true
    endscript
}
EOF
print_success "Log rotation configured"

# Create environment template
print_status "Creating environment template..."
cat > /etc/shiftwizard/.env.production.template << EOF
# ShiftWizard Production Configuration
# Copy this to .env.production and update the values

# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Database Configuration
DATABASE_URL=./database.sqlite

# JWT Security (Generate new secrets!)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# OpenAI Configuration (REQUIRED for AI suggestions)
OPENAI_API_KEY=sk-your-openai-api-key-here

# WebSocket Configuration
REAL_TIME_UPDATES_ENABLED=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=info
HEALTH_CHECK_ENABLED=true

# Feature Flags
AI_SUGGESTIONS_ENABLED=true
MULTI_ORG_SUPPORT_ENABLED=true
EOF

sudo chown $USER:$USER /etc/shiftwizard/.env.production.template
print_success "Environment template created at /etc/shiftwizard/.env.production.template"

# Setup monitoring script
print_status "Setting up monitoring script..."
cat > /usr/local/bin/shiftwizard-monitor.sh << 'EOF'
#!/bin/bash
# ShiftWizard Health Monitor

LOG_FILE="/var/log/shiftwizard/monitor.log"
DEPLOY_DIR="/var/www/shiftwizard"
HEALTH_URL="http://localhost:3001/health"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check if application is responding
if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    log_message "ALERT: Application health check failed"
    
    # Try to restart with PM2
    if command -v pm2 &> /dev/null; then
        log_message "Attempting to restart application with PM2"
        pm2 restart shiftwizard
        sleep 10
        
        if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
            log_message "SUCCESS: Application restarted successfully"
        else
            log_message "ERROR: Application restart failed"
        fi
    fi
else
    log_message "OK: Application is healthy"
fi

# Check disk space
DISK_USAGE=$(df /var/www | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_message "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Clean old logs
find /var/log/shiftwizard -name "*.log" -mtime +7 -delete 2>/dev/null

# Clean old backups
find /var/backups/shiftwizard -name "backup_*" -mtime +30 -delete 2>/dev/null
EOF

sudo chmod +x /usr/local/bin/shiftwizard-monitor.sh
print_success "Monitoring script created"

# Setup cron job for monitoring
print_status "Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/shiftwizard-monitor.sh") | crontab -
print_success "Monitoring cron job configured"

# Create deployment user if needed
if ! id "deploy" &>/dev/null; then
    print_status "Creating deploy user..."
    sudo useradd -m -s /bin/bash deploy
    sudo usermod -aG sudo deploy
    sudo usermod -aG docker deploy
    
    # Setup SSH key for deploy user
    sudo mkdir -p /home/deploy/.ssh
    print_warning "Add your SSH public key to /home/deploy/.ssh/authorized_keys"
    print_warning "Then run: sudo chown -R deploy:deploy /home/deploy/.ssh"
    print_warning "And: sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys"
fi

# Get server information
print_status "Gathering server information..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip)
CPU_INFO=$(lscpu | grep "Model name" | cut -d':' -f2 | xargs)
MEMORY_INFO=$(free -h | grep "Mem:" | awk '{print $2}')
DISK_INFO=$(df -h / | tail -1 | awk '{print $2}')

# Create README for the server
cat > /home/$USER/DEPLOYMENT_README.md << EOF
# ShiftWizard Server Setup Complete

## Server Information
- **IP Address**: $SERVER_IP
- **CPU**: $CPU_INFO
- **Memory**: $MEMORY_INFO
- **Disk**: $DISK_INFO
- **OS**: $(lsb_release -d | cut -d':' -f2 | xargs)

## Next Steps

### 1. Configure Environment
Copy and edit the environment file:
\`\`\`bash
sudo cp /etc/shiftwizard/.env.production.template /etc/shiftwizard/.env.production
sudo nano /etc/shiftwizard/.env.production
\`\`\`

### 2. Setup SSL Certificate
For production, get a real SSL certificate:
\`\`\`bash
sudo certbot --nginx -d your-domain.com
\`\`\`

### 3. Configure GitHub Secrets
Add these secrets to your GitHub repository:
- \`PRODUCTION_HOST\`: $SERVER_IP
- \`PRODUCTION_USER\`: $USER
- \`PRODUCTION_SSH_KEY\`: Your private SSH key
- \`PRODUCTION_URL\`: https://your-domain.com

### 4. Update DNS
Point your domain to this server: $SERVER_IP

### 5. Deploy Application
Push to main branch or run manual deployment from GitHub Actions

## Useful Commands
- View logs: \`tail -f /var/log/shiftwizard/*.log\`
- Check PM2 status: \`pm2 status\`
- Restart app: \`pm2 restart shiftwizard\`
- Check health: \`curl http://localhost:3001/health\`
- View monitoring: \`tail -f /var/log/shiftwizard/monitor.log\`

## Security Checklist
- [ ] Change default SSH port
- [ ] Setup SSH key authentication only
- [ ] Configure proper SSL certificates
- [ ] Update all default passwords
- [ ] Enable automatic security updates
- [ ] Setup backup strategy
- [ ] Configure monitoring alerts

EOF

print_success "Server setup completed successfully!"
echo ""
echo "======================================"
echo "🎉 ShiftWizard Server Ready!"
echo "======================================"
echo ""
echo "📋 Next steps:"
echo "1. Configure environment: /etc/shiftwizard/.env.production"
echo "2. Setup SSL certificate with certbot"
echo "3. Configure GitHub Actions secrets"
echo "4. Update DNS to point to: $SERVER_IP"
echo "5. Deploy your application!"
echo ""
echo "📄 Full instructions: /home/$USER/DEPLOYMENT_README.md"
echo ""
print_warning "IMPORTANT: Configure your environment variables before deploying!"
print_warning "Set your OpenAI API key and other secrets in the .env file"