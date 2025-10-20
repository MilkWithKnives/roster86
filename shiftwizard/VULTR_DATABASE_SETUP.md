# 🚀 ShiftWizard Production Backend Setup with Vultr Managed Database

## Overview

This guide will walk you through setting up your production backend with Vultr's managed PostgreSQL database.

---

## 📋 Prerequisites

Before you begin, make sure you have:

1. ✅ **Vultr Managed Database** (PostgreSQL) created
2. ✅ **Vultr VPS Server** for your backend application
3. ✅ **SSH access** to your Vultr VPS
4. ✅ **Domain name** (optional but recommended)

---

## Step 1: Get Your Vultr Database Credentials

### 1.1 Login to Vultr Dashboard
Go to: https://my.vultr.com/

### 1.2 Navigate to Databases
Click on **Products** → **Databases** → Select your PostgreSQL database

### 1.3 Copy Database Connection Details
You'll need these details (found on the database overview page):

```
Host: [your-database-host].vultr-prod.com
Port: 16751 (or your specific port)
Database: defaultdb (or your custom database name)
Username: vultradmin (or your custom username)
Password: [your-secure-password]
```

**Example:**
```
Host: postgres-12345-vultr-prod.vultr-prod.com
Port: 16751
Database: shiftwizard_prod
Username: shiftwizard_user
Password: SecureP@ssw0rd!xyz123
```

### 1.4 Configure Trusted Sources (Important!)
In Vultr Dashboard → Your Database → **Settings** → **Trusted Sources**

Add your VPS server's IP address to allow connections:
```
YOUR_VPS_IP_ADDRESS/32
```

---

## Step 2: Set Up Backend Environment Variables

### 2.1 SSH into Your Vultr VPS

```bash
ssh root@YOUR_VPS_IP
# or
ssh deploy@YOUR_VPS_IP
```

### 2.2 Create Production Environment File

Navigate to your backend directory:
```bash
cd /var/www/shiftwizard/backend
# or wherever you'll deploy your app
```

Create `.env` file:
```bash
nano .env
```

### 2.3 Configure Environment Variables

Paste the following configuration (replace with YOUR actual values):

```bash
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=production
PORT=3001

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
# Use your actual domain or server IP
FRONTEND_URL=https://yourdomain.com
# or FRONTEND_URL=http://YOUR_VPS_IP:5173

# ==========================================
# JWT SECURITY
# ==========================================
# Generate a secure secret with: openssl rand -hex 32
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_HERE_CHANGE_THIS
JWT_EXPIRES_IN=24h

# ==========================================
# VULTR MANAGED DATABASE (PostgreSQL)
# ==========================================
# Option 1: Individual parameters (Recommended)
DB_HOST=postgres-12345-vultr-prod.vultr-prod.com
DB_PORT=16751
DB_NAME=shiftwizard_prod
DB_USER=shiftwizard_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD_HERE

# Option 2: Connection string (Alternative)
# DATABASE_URL=postgresql://shiftwizard_user:YOUR_PASSWORD@postgres-12345-vultr-prod.vultr-prod.com:16751/shiftwizard_prod

# Database settings
DATABASE_MAX_CONNECTIONS=20

# ==========================================
# OPTIONAL INTEGRATIONS
# ==========================================
# OpenAI API (for AI-powered scheduling suggestions)
# OPENAI_API_KEY=sk-your-openai-api-key-here

# Stripe (for payments)
# STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
# STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email (for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# File uploads
UPLOAD_DIR=/var/www/shiftwizard/uploads
MAX_FILE_SIZE=10485760
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 2.4 Generate Secure JWT Secret

```bash
# Generate a random 32-byte hex string
openssl rand -hex 32
```

Copy the output and replace `YOUR_SUPER_SECURE_JWT_SECRET_HERE_CHANGE_THIS` in your `.env` file.

---

## Step 3: Verify Database Connection

### 3.1 Test Connection from Your VPS

Install PostgreSQL client:
```bash
sudo apt update
sudo apt install postgresql-client -y
```

Test connection:
```bash
psql "postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/YOUR_DATABASE?sslmode=require"
```

**Example:**
```bash
psql "postgresql://shiftwizard_user:SecureP@ssw0rd!xyz123@postgres-12345-vultr-prod.vultr-prod.com:16751/shiftwizard_prod?sslmode=require"
```

If connected successfully, you'll see:
```
psql (12.x)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

shiftwizard_prod=>
```

Type `\q` to exit.

---

## Step 4: Deploy Your Backend Application

### 4.1 Install Dependencies

```bash
cd /var/www/shiftwizard/backend
npm install --production
```

### 4.2 Initialize Database Schema

The backend will automatically:
- ✅ Detect PostgreSQL from environment variables
- ✅ Create all required tables
- ✅ Run migrations
- ✅ Set up indexes

Just start the server:
```bash
node server.js
```

You should see:
```
🗄️ Database: postgresql (postgres-12345-vultr-prod.vultr-prod.com:16751/shiftwizard_prod)
🔌 Connecting to PostgreSQL database...
📍 Host: postgres-12345-vultr-prod.vultr-prod.com:16751
🗄️ Database: shiftwizard_prod
✅ PostgreSQL connection established successfully
🏗️ Initializing database schema...
✅ Database initialized successfully
🚀 ShiftWizard Backend running on port 3001
```

### 4.3 Seed Initial Data (Optional)

Create an admin user and sample data:
```bash
node scripts/seed-db.js
```

---

## Step 5: Set Up PM2 for Production (Recommended)

### 5.1 Install PM2

```bash
sudo npm install -g pm2
```

### 5.2 Start Backend with PM2

```bash
cd /var/www/shiftwizard/backend
pm2 start server.js --name shiftwizard-backend
```

### 5.3 Configure PM2 to Start on Boot

```bash
pm2 startup
pm2 save
```

### 5.4 Useful PM2 Commands

```bash
pm2 status                    # Check status
pm2 logs shiftwizard-backend  # View logs
pm2 restart shiftwizard-backend  # Restart
pm2 stop shiftwizard-backend    # Stop
pm2 delete shiftwizard-backend  # Remove from PM2
```

---

## Step 6: Configure Nginx Reverse Proxy (Optional)

If you want to serve your backend on port 80/443 instead of 3001:

### 6.1 Install Nginx

```bash
sudo apt install nginx -y
```

### 6.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/shiftwizard
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # or your VPS IP

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

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
```

### 6.3 Enable Site and Restart Nginx

```bash
sudo ln -s /etc/nginx/sites-available/shiftwizard /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

## Step 7: Verify Everything Works

### 7.1 Test Health Endpoint

```bash
curl http://localhost:3001/health
# Should return: {"status":"OK","timestamp":"...","version":"1.0.0"}
```

If using Nginx:
```bash
curl http://yourdomain.com/health
```

### 7.2 Test Database Connection

Check PM2 logs:
```bash
pm2 logs shiftwizard-backend --lines 50
```

Look for:
```
✅ PostgreSQL connection established successfully
✅ Database initialized successfully
🚀 ShiftWizard Backend running on port 3001
```

### 7.3 Test API Endpoints

```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User"
  }'
```

---

## 🔒 Security Checklist

- [ ] **Changed JWT_SECRET** to a secure random string
- [ ] **Database password** is strong and unique
- [ ] **Vultr firewall** configured to only allow your VPS IP
- [ ] **Environment variables** are not committed to git
- [ ] **SSH key authentication** enabled (disable password auth)
- [ ] **Firewall configured** on VPS (ufw or iptables)
- [ ] **SSL certificate** installed (use Let's Encrypt/Certbot)
- [ ] **Regular backups** configured in Vultr dashboard

---

## 🔧 Troubleshooting

### Issue: "Connection refused" or "timeout"

**Solution:**
1. Check Vultr Database → Trusted Sources includes your VPS IP
2. Verify firewall allows outbound connections on database port
3. Test connection with `psql` command from Step 3

### Issue: "Authentication failed for user"

**Solution:**
1. Double-check username and password in `.env`
2. Ensure no extra spaces in credentials
3. Try wrapping password in quotes if it contains special characters

### Issue: "SSL connection required"

**Solution:**
Add to your connection string or config:
```bash
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

Or in individual parameters, the code already handles SSL for production.

### Issue: "Too many connections"

**Solution:**
Reduce `DATABASE_MAX_CONNECTIONS` in `.env`:
```bash
DATABASE_MAX_CONNECTIONS=10
```

---

## 📊 Monitoring Your Database

### Vultr Dashboard Metrics

Monitor in Vultr Dashboard → Your Database → Metrics:
- Connection count
- CPU usage
- Memory usage
- Disk I/O

### Application-Level Monitoring

Check active connections:
```sql
SELECT count(*) FROM pg_stat_activity;
```

View current database size:
```sql
SELECT pg_size_pretty(pg_database_size('shiftwizard_prod'));
```

---

## 🎉 Success!

Your production backend is now running with:

✅ **Vultr Managed PostgreSQL Database**
✅ **Secure SSL connections**
✅ **Production-ready environment**
✅ **PM2 process management**
✅ **Nginx reverse proxy (optional)**

### Next Steps:

1. **Deploy Frontend**: Point your frontend to the backend URL
2. **Set up SSL**: Use Certbot for Let's Encrypt certificate
3. **Configure Backups**: Enable automatic backups in Vultr
4. **Set up Monitoring**: Use PM2 monitoring or services like New Relic
5. **Create Admin User**: Seed database or register via API

---

## 📞 Need Help?

Common resources:
- **Vultr Docs**: https://www.vultr.com/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/usage/quick-start/

Your backend is production-ready! 🚀
