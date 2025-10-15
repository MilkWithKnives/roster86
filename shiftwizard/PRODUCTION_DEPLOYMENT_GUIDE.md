# Roster86 Production Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: One-Click VPS Deployment (Recommended)
Use your existing Vultr deployment script:

```bash
# On your VPS server
git clone https://github.com/yourusername/roster86.git
cd roster86/shiftwizard
chmod +x deploy-vultr.sh
./deploy-vultr.sh
```

### Option 2: Docker Compose (Local/Cloud)
```bash
# Build and deploy
docker compose up -d --build
```

### Option 3: Manual Server Setup
Follow the detailed steps below.

---

## 📋 Pre-Deployment Checklist

### 1. Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ SSD
- **CPU**: 2+ cores
- **Network**: Public IP with ports 80, 443 open

### 2. Domain Setup
- Point your domain to server IP
- SSL certificate (Let's Encrypt recommended)
- DNS records configured

### 3. Environment Variables
Create `.env` file with production values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=./database.sqlite

# JWT Security
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
JWT_EXPIRES_IN=24h

# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# Stripe Price IDs (Get from Stripe Dashboard)
STRIPE_STARTER_PRICE_ID=price_starter_monthly
STRIPE_STARTER_YEARLY_PRICE_ID=price_starter_yearly
STRIPE_PROFESSIONAL_PRICE_ID=price_professional_monthly
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_professional_yearly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_enterprise_yearly

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn_here
```

---

## 🛠️ Step-by-Step Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 2: Application Setup

```bash
# Clone repository
git clone https://github.com/yourusername/roster86.git
cd roster86/shiftwizard

# Install dependencies
npm install
cd backend && npm install && cd ..

# Build frontend
npm run build

# Set up environment
cp .env.example .env
# Edit .env with your production values
nano .env
```

### Step 3: Database Setup

```bash
# Initialize database
cd backend
node scripts/init-db.js
node scripts/seed-db.js
cd ..
```

### Step 4: Nginx Configuration

Create `/etc/nginx/sites-available/roster86`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend
    location / {
        root /path/to/roster86/shiftwizard/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Webhooks
    location /api/webhooks {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/roster86 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 6: Start Application

```bash
# Start with PM2
pm2 start backend/server.js --name "roster86-api"
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs roster86-api
```

### Step 7: Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🔧 Production Optimizations

### 1. Database Optimization

```bash
# Enable WAL mode for better performance
sqlite3 backend/database.sqlite "PRAGMA journal_mode=WAL;"
sqlite3 backend/database.sqlite "PRAGMA synchronous=NORMAL;"
sqlite3 backend/database.sqlite "PRAGMA cache_size=1000;"
sqlite3 backend/database.sqlite "PRAGMA temp_store=MEMORY;"
```

### 2. Process Management

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'roster86-api',
    script: 'backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 3. Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🔒 Security Hardening

### 1. Server Security

```bash
# Update system regularly
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 2. Application Security

```bash
# Set secure file permissions
chmod 600 .env
chmod 600 backend/database.sqlite
chown -R www-data:www-data dist/
```

### 3. Database Security

```bash
# Backup database regularly
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

## 📊 Monitoring & Maintenance

### 1. Health Checks

```bash
# Check application status
curl https://yourdomain.com/api/health

# Check database
sqlite3 backend/database.sqlite "SELECT COUNT(*) FROM users;"

# Check logs
pm2 logs roster86-api --lines 100
```

### 2. Performance Monitoring

```bash
# Monitor system resources
htop
df -h
free -h

# Monitor application
pm2 monit
```

### 3. Backup Strategy

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp backend/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup application
tar -czf $BACKUP_DIR/roster86_$DATE.tar.gz --exclude=node_modules --exclude=.git .

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/roster86_$DATE.tar.gz s3://your-backup-bucket/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **Application won't start**
   ```bash
   pm2 logs roster86-api
   # Check for missing environment variables
   ```

2. **Database errors**
   ```bash
   sqlite3 backend/database.sqlite ".tables"
   # Recreate database if needed
   ```

3. **Nginx errors**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **SSL issues**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

---

## 📞 Support

- **Logs**: `pm2 logs roster86-api`
- **Status**: `pm2 status`
- **Restart**: `pm2 restart roster86-api`
- **Update**: `git pull && pm2 restart roster86-api`

Your Roster86 application is now production-ready! 🎉
