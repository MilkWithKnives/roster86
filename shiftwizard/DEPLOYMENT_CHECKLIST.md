# 🚀 Roster86 Server Deployment Checklist

## Pre-Deployment Setup

### 1. Server Requirements ✅
- [ ] Ubuntu 20.04+ or CentOS 8+
- [ ] 2GB+ RAM (4GB recommended)
- [ ] 20GB+ SSD storage
- [ ] Public IP address
- [ ] Ports 80, 443 open

### 2. Domain Setup (Optional)
- [ ] Domain name registered
- [ ] DNS A record pointing to server IP
- [ ] SSL certificate ready (Let's Encrypt)

### 3. Stripe Account Setup (REQUIRED)
- [ ] Stripe account created
- [ ] Products and prices created in Stripe Dashboard
- [ ] Webhook endpoint configured
- [ ] API keys obtained

---

## Quick Deployment (5 minutes)

### Option 1: Automated Script
```bash
# On your server
wget https://raw.githubusercontent.com/yourusername/roster86/main/shiftwizard/deploy-production.sh
chmod +x deploy-production.sh
./deploy-production.sh
```

### Option 2: Manual Steps
```bash
# 1. Clone repository
git clone https://github.com/yourusername/roster86.git
cd roster86/shiftwizard

# 2. Run deployment script
chmod +x deploy-production.sh
./deploy-production.sh

# 3. Update Stripe keys
nano .env
# Edit STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.

# 4. Restart application
pm2 restart roster86-api
```

---

## Post-Deployment Configuration

### 1. Stripe Configuration (CRITICAL)
```bash
# Edit .env file
nano .env

# Update these values:
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# Update price IDs from Stripe Dashboard
STRIPE_STARTER_PRICE_ID=price_1234567890
STRIPE_PROFESSIONAL_PRICE_ID=price_0987654321
STRIPE_ENTERPRISE_PRICE_ID=price_1111111111
```

### 2. Domain & SSL Setup
```bash
# If you have a domain
sudo certbot --nginx -d yourdomain.com

# Update FRONTEND_URL in .env
nano .env
# Change: FRONTEND_URL=https://yourdomain.com
```

### 3. Security Hardening
```bash
# Change admin password
# Login to app and change password in settings

# Update JWT secret (if needed)
nano .env
# Generate new: openssl rand -hex 32
```

---

## Testing Your Deployment

### 1. Health Checks
```bash
# Test backend
curl http://your-server-ip/api/health

# Test frontend
curl http://your-server-ip

# Test database
sqlite3 backend/database.sqlite "SELECT COUNT(*) FROM users;"
```

### 2. Payment Testing
1. Go to http://your-server-ip/purchase
2. Select a plan
3. Use Stripe test card: 4242 4242 4242 4242
4. Verify webhook receives events

### 3. User Flow Testing
1. Register new account
2. Login to dashboard
3. Create employee
4. Set up business hours
5. Create schedule

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Application running: `pm2 status`
- [ ] Disk space: `df -h`
- [ ] Memory usage: `free -h`
- [ ] Error logs: `pm2 logs roster86-api --lines 50`

### Weekly Tasks
- [ ] Check backups: `ls -la backups/`
- [ ] Update system: `sudo apt update && sudo apt upgrade`
- [ ] Review logs for errors
- [ ] Test payment flow

### Monthly Tasks
- [ ] Security updates
- [ ] Database optimization
- [ ] Performance review
- [ ] Backup verification

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs roster86-api

# Check environment
cat .env

# Restart
pm2 restart roster86-api
```

### Database Issues
```bash
# Check database
sqlite3 backend/database.sqlite ".tables"

# Recreate if needed
cd backend
node scripts/init-db.js
node scripts/seed-db.js
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx
```

### Payment Issues
```bash
# Check Stripe webhook logs
tail -f logs/combined.log | grep webhook

# Verify environment variables
grep STRIPE .env
```

---

## Emergency Procedures

### Complete Restore
```bash
# Stop application
pm2 stop roster86-api

# Restore from backup
cd /home/user/backups
tar -xzf roster86_YYYYMMDD_HHMMSS.tar.gz -C /home/user/roster86/

# Restart
pm2 start roster86-api
```

### Database Recovery
```bash
# Stop application
pm2 stop roster86-api

# Restore database
cp backups/database_YYYYMMDD_HHMMSS.sqlite backend/database.sqlite

# Start application
pm2 start roster86-api
```

---

## Success Indicators ✅

Your deployment is successful when:
- [ ] Frontend loads at http://your-server-ip
- [ ] API responds at http://your-server-ip/api/health
- [ ] Admin can login (admin@roster86.com / admin123)
- [ ] Payment page loads at http://your-server-ip/purchase
- [ ] Stripe webhooks are working
- [ ] Database has initial data
- [ ] PM2 shows application as "online"

---

## Support Commands

```bash
# Application status
pm2 status

# View logs
pm2 logs roster86-api

# Restart application
pm2 restart roster86-api

# Stop application
pm2 stop roster86-api

# Start application
pm2 start roster86-api

# View system resources
htop

# Check disk space
df -h

# Check memory
free -h

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test SSL (if configured)
curl -I https://yourdomain.com
```

---

## 🎉 You're Ready!

Once all items are checked, your Roster86 application is production-ready and can start accepting paying customers!

**Next Steps:**
1. Share your application URL with potential customers
2. Set up monitoring and alerts
3. Plan your marketing strategy
4. Consider scaling as you grow

**Congratulations! 🚀**
