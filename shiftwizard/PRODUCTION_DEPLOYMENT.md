# ShiftWizard Production Deployment Guide

## 🎯 Overview

This guide will help you deploy ShiftWizard with all its intelligent scheduling features to production:

✅ **Real-time Metrics Dashboard** with WebSocket connections  
✅ **Python Scheduling Algorithm** with OR-Tools optimization  
✅ **AI-Powered Suggestions** using OpenAI GPT-4  
✅ **Secure Production Environment** with automated monitoring  

## 🚀 Quick Start

### Step 1: Get a Server

Choose any cloud provider:
- **Vultr** (recommended): $6/month VPS
- **DigitalOcean**: $6/month droplet
- **AWS**: t3.micro or t3.small
- **Linode**: $5/month nanode

**Requirements:**
- Ubuntu 20.04+ LTS
- Minimum 1GB RAM
- 25GB+ storage
- Root access

### Step 2: Run Server Setup

SSH into your server and run:

```bash
# Create deploy user (recommended)
adduser deploy
usermod -aG sudo deploy
su deploy

# Download and run setup script
wget https://raw.githubusercontent.com/your-repo/shiftwizard/main/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

This script will:
- Install Node.js 18, Python 3, Docker, Nginx
- Configure firewall and security
- Set up monitoring and logging
- Create directory structure
- Generate environment templates

### Step 3: Configure Environment

```bash
# Copy and edit environment file
sudo cp /etc/shiftwizard/.env.production.template /etc/shiftwizard/.env.production
sudo nano /etc/shiftwizard/.env.production
```

**Required Settings:**
```bash
# Your domain
FRONTEND_URL=https://yourdomain.com

# OpenAI API Key (REQUIRED for AI suggestions)
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Email settings (for notifications)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 4: Setup SSL Certificate

```bash
# Install Let's Encrypt certificate
sudo certbot --nginx -d yourdomain.com
```

### Step 5: Configure GitHub Actions

In your GitHub repository, add these secrets:

**Repository Settings → Secrets and Variables → Actions:**

- `PRODUCTION_HOST`: Your server IP address
- `PRODUCTION_USER`: `deploy` (or your username)
- `PRODUCTION_SSH_KEY`: Your private SSH key content
- `PRODUCTION_URL`: `https://yourdomain.com`

### Step 6: Deploy

Push to your main branch, and GitHub Actions will automatically deploy!

```bash
git add .
git commit -m "Deploy ShiftWizard with AI scheduling"
git push origin main
```

---

## 🔧 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Clone repository
cd /var/www/shiftwizard
git clone https://github.com/your-repo/shiftwizard.git .

# Install dependencies
npm ci
cd backend && npm ci && cd ..

# Build frontend
npm run build

# Copy environment
sudo cp /etc/shiftwizard/.env.production backend/.env

# Initialize database
cd backend && node scripts/init-db.js && node scripts/seed-db.js

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## 🏥 Health Checks

After deployment, verify everything works:

```bash
# Check application health
curl https://yourdomain.com/health

# Check WebSocket connection
curl -H "Upgrade: websocket" https://yourdomain.com/socket.io/

# Test AI suggestions (requires auth)
# Login to your app and check the scheduling features
```

---

## 📊 Features Verification Checklist

### ✅ Real-time Dashboard
- [ ] Dashboard shows live metrics
- [ ] Coverage percentages update in real-time
- [ ] WebSocket connection indicator shows "Live Data"
- [ ] Multiple users see updates simultaneously

### ✅ Intelligent Scheduling
- [ ] "Generate Schedule" button works
- [ ] Python algorithm executes successfully
- [ ] Progress updates appear in real-time
- [ ] Coverage gaps are detected and displayed

### ✅ AI-Powered Suggestions
- [ ] When gaps exist, AI suggestions generate automatically
- [ ] Suggestions show cost analysis and confidence scores
- [ ] "Apply Suggestion" buttons work
- [ ] Manager can rate suggestions

### ✅ Production Environment
- [ ] SSL certificate is valid
- [ ] Application runs on port 443 (HTTPS)
- [ ] Database persists data between restarts
- [ ] Logs are being written to `/var/log/shiftwizard/`
- [ ] Monitoring script runs every 5 minutes

---

## 🔐 Security Checklist

- [ ] SSH key authentication only (disable password auth)
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Fail2ban enabled for brute-force protection
- [ ] SSL certificate installed and auto-renewing
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Regular backups configured

---

## 📈 Monitoring & Maintenance

### Log Files
```bash
# Application logs
tail -f /var/log/shiftwizard/app.log

# Nginx logs
tail -f /var/log/nginx/access.log

# Monitoring logs
tail -f /var/log/shiftwizard/monitor.log
```

### PM2 Commands
```bash
pm2 status          # Check application status
pm2 logs shiftwizard # View application logs
pm2 restart shiftwizard # Restart application
pm2 reload shiftwizard  # Zero-downtime restart
```

### Health Monitoring
The system automatically:
- Checks health every 5 minutes
- Restarts app if it becomes unresponsive
- Cleans old logs and backups
- Monitors disk space usage

---

## 🚨 Troubleshooting

### Common Issues

**🔴 "AI suggestions not working"**
- Check OpenAI API key in environment file
- Verify API key has credits and correct permissions
- Check logs: `tail -f /var/log/shiftwizard/app.log`

**🔴 "WebSocket connection failed"**
- Verify Nginx configuration includes WebSocket proxy
- Check firewall allows connections on port 443
- Test with: `curl -H "Upgrade: websocket" https://yourdomain.com/socket.io/`

**🔴 "Python scheduling algorithm errors"**
- Check Python packages: `pip3 list | grep ortools`
- Verify Python path in application logs
- Test manually: `cd backend && python3 workforce_scheduling_engine.py`

**🔴 "Database connection issues"**
- Check file permissions on database file
- Verify database initialization: `ls -la backend/data/`
- Re-run init: `cd backend && node scripts/init-db.js`

### Performance Optimization

For high-traffic deployments:

1. **Enable PostgreSQL** (instead of SQLite)
2. **Add Redis** for session storage
3. **Use Docker Compose** for scaling
4. **Enable CDN** for static assets
5. **Add load balancer** for multiple instances

---

## 🎉 Success!

Your ShiftWizard application is now running in production with:

- **Intelligent scheduling** powered by Python + OR-Tools
- **AI suggestions** using OpenAI GPT-4
- **Real-time updates** via WebSocket connections
- **Secure, monitored environment** with automatic restarts

**Test your deployment:**
1. Visit `https://yourdomain.com`
2. Create an account and organization
3. Add employees and shift templates
4. Generate a schedule and watch the AI suggestions!

**Default admin credentials** (change immediately):
- Email: `admin@shiftwizard.com`
- Password: `admin123`

---

## 📞 Support

If you encounter issues:

1. Check the logs first
2. Verify all environment variables are set
3. Ensure OpenAI API key has credits
4. Test individual components (database, Python, Node.js)

The system is designed to be resilient and self-healing, with automatic restarts and health monitoring built-in.