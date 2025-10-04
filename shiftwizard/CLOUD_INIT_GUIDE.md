# Roster86 Cloud-Init Deployment Guide

## 🚀 One-Click Enterprise SaaS Deployment

This cloud-init script automatically deploys Roster86 when your Vultr server boots up. **Zero manual intervention required!**

## 📋 Prerequisites

1. **Update the cloud-init.yaml file:**
   ```yaml
   # Line 18: Add your SSH public key
   ssh_authorized_keys:
     - ssh-rsa YOUR_ACTUAL_SSH_PUBLIC_KEY_HERE
   
   # Line 85: Update with your GitHub repo URL
   git clone https://github.com/YOURUSERNAME/roster86.git app
   
   # Line 31: Update with your domain
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Get your SSH public key:**
   ```bash
   cat ~/.ssh/id_rsa.pub
   # Copy this entire line into the cloud-init.yaml
   ```

## 🖥️ Vultr Deployment Steps

### 1. Create Server with Cloud-Init

1. **Go to Vultr Console** → Deploy New Server
2. **Choose Location:** Closest to your users
3. **Server Image:** Ubuntu 25.04 x64
4. **Server Size:** 
   - **Starter:** $12/month (2GB RAM, 1 vCPU)
   - **Recommended:** $24/month (4GB RAM, 2 vCPU)
5. **Cloud-Init User-Data:** Paste the contents of `cloud-init.yaml`
6. **SSH Keys:** Add your SSH key (same as in cloud-init file)
7. **Server Label:** "Roster86 Production"
8. **Deploy Server**

### 2. Automatic Deployment

⏱️ **Deployment Time:** 5-10 minutes

The server will automatically:
- ✅ Install Docker and dependencies
- ✅ Setup firewall and security
- ✅ Clone your Roster86 repository
- ✅ Build and start all services
- ✅ Initialize database with sample data
- ✅ Generate SSL certificates
- ✅ Setup automatic backups

### 3. Verify Deployment

```bash
# SSH into your server
ssh roster86@YOUR_SERVER_IP

# Check if services are running
docker compose ps

# View deployment logs
sudo tail -f /var/log/cloud-init-output.log
```

## 🌐 Access Your SaaS

- **Frontend:** `https://YOUR_SERVER_IP`
- **API:** `https://YOUR_SERVER_IP/api`
- **Admin Login:** admin@roster86.com / admin123

## 🔧 Post-Deployment

### 1. Domain Setup
```bash
# Point your domain to the server IP
# Update CORS_ORIGIN in .env file
nano /home/roster86/app/.env
docker compose restart
```

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get real SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is already configured
```

### 3. Change Admin Password
```bash
# SSH to server and update admin password
cd /home/roster86/app
# Use your app's admin interface or database tools
```

## 🛠️ Management Commands

```bash
# View logs
docker compose logs -f

# Restart services  
docker compose restart

# Update application
git pull
docker compose up -d --build

# Backup database
/home/roster86/backup.sh

# Monitor resources
htop
```

## 🔥 Why Cloud-Init is Superior

### vs Manual Deployment:
- ✅ **Zero human error** - fully automated
- ✅ **Consistent deployments** - same every time
- ✅ **Version controlled** - infrastructure as code
- ✅ **Faster** - no SSH, no manual steps

### vs Marketplace Apps:
- ✅ **Latest packages** - always up-to-date
- ✅ **Custom configuration** - exactly what you need
- ✅ **Enterprise security** - proper firewall, SSL, backups
- ✅ **Scalable architecture** - Docker containers

## 📊 Cost Breakdown

| Component | Cost/Month |
|-----------|------------|
| Vultr VPS (4GB) | $24 |
| Domain (optional) | $12 |
| **Total** | **$36/month** |

Compare to AWS/Azure: $200-500/month for similar setup!

## 🚀 Ready to Deploy?

1. Update `cloud-init.yaml` with your details
2. Create Vultr server with the cloud-init script
3. Wait 10 minutes
4. Your enterprise SaaS is LIVE! 🎉