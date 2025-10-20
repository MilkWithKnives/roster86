# 🚀 ShiftWizard Production Deployment - Complete Instructions

**Follow these steps exactly to deploy your backend to Vultr with managed PostgreSQL database.**

---

## 📦 What You'll Deploy

- ✅ **Backend API** (Node.js/Express) on Vultr VPS
- ✅ **PostgreSQL Database** (Vultr Managed Database)
- ✅ **Frontend** (React/Vite) served via Nginx or Vercel
- ✅ **WebSocket** for real-time updates
- ✅ **SSL Certificate** for HTTPS

---

# PART 1: VULTR DATABASE SETUP

## Step 1: Create Vultr Managed Database

### 1.1 Login to Vultr
Go to: https://my.vultr.com/

### 1.2 Create Database
1. Click **Products** → **Databases** → **Deploy Database**
2. Choose:
   - **Type:** PostgreSQL
   - **Version:** 15 or 16 (latest stable)
   - **Server Location:** Choose closest to your users
   - **Plan:** Start with $15/month (25GB storage, 1GB RAM)
3. **Database Label:** `shiftwizard-production`
4. Click **Deploy Now**

**Wait 3-5 minutes for deployment to complete.**

### 1.3 Get Database Credentials

Once deployed, click on your database name. You'll see:

```
┌─────────────────────────────────────────┐
│ Connection Details                      │
├─────────────────────────────────────────┤
│ Host:     postgres-xxx.vultr-prod.com   │
│ Port:     16751                         │
│ User:     vultradmin                    │
│ Password: ••••••••••••••••              │
│ Database: defaultdb                     │
└─────────────────────────────────────────┘
```

**Click "Show" on password and SAVE THESE DETAILS!**

### 1.4 Configure Trusted Sources (CRITICAL!)

1. In database dashboard, click **Settings** tab
2. Scroll to **Trusted Sources**
3. Add your VPS IP address:
   ```
   YOUR_VPS_IP_ADDRESS/32
   ```
   (We'll get your VPS IP in the next section)

4. Click **Add Source**

**Without this step, your VPS cannot connect to the database!**

---

# PART 2: VULTR VPS SERVER SETUP

## Step 2: Create Vultr VPS Server

### 2.1 Deploy New Server
1. Vultr Dashboard → **Products** → **Compute** → **Deploy Server**
2. Choose:
   - **Server Type:** Cloud Compute - Shared CPU
   - **Location:** Same as your database
   - **Server Image:** Ubuntu 22.04 LTS x64
   - **Server Size:** $6/month (1 CPU, 1GB RAM, 25GB SSD)
   - **Additional Features:** ✅ Enable IPv6 (recommended)
3. **Server Hostname:** `shiftwizard-api`
4. Click **Deploy Now**

### 2.2 Note Your Server IP

Once deployed, you'll see:
```
Server: shiftwizard-api
IP Address: 123.45.67.89  ← SAVE THIS!
```

### 2.3 Go Back and Add IP to Database Trusted Sources

Now that you have your VPS IP:
1. Go back to **Databases** → Your database → **Settings**
2. **Trusted Sources** → Add:
   ```
   123.45.67.89/32
   ```
   (Replace with YOUR actual VPS IP)

---

## Step 3: Initial Server Configuration

### 3.1 SSH into Your Server

Open terminal on your Mac:

```bash
ssh root@123.45.67.89
# Replace with YOUR VPS IP
```

Type `yes` when asked about fingerprint, then enter the root password from Vultr.

### 3.2 Update System

```bash
apt update && apt upgrade -y
```

### 3.3 Create Deploy User (Recommended for security)

```bash
# Create user
adduser deploy
# Enter password when prompted, remember it!

# Add to sudo group
usermod -aG sudo deploy

# Switch to deploy user
su deploy
cd ~
```

### 3.4 Install Node.js 20

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show v10.x.x
```

### 3.5 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 3.6 Install PostgreSQL Client (for testing)

```bash
sudo apt install -y postgresql-client
```

### 3.7 Install Git

```bash
sudo apt install -y git
```

---

## Step 4: Test Database Connection

Before deploying your app, let's verify the database works:

```bash
psql "postgresql://vultradmin:YOUR_PASSWORD@postgres-xxx.vultr-prod.com:16751/defaultdb?sslmode=require"
```

**Replace:**
- `YOUR_PASSWORD` with your actual database password
- `postgres-xxx.vultr-prod.com` with your actual host
- `16751` with your actual port

**If successful, you'll see:**
```
psql (14.x, server 15.x)
SSL connection (protocol: TLSv1.3, ...)
Type "help" for help.

defaultdb=>
```

Type `\q` to exit.

✅ **Database connection works!**

---

# PART 3: DEPLOY BACKEND APPLICATION

## Step 5: Deploy Your Code

### 5.1 Create Application Directory

```bash
sudo mkdir -p /var/www/shiftwizard
sudo chown -R deploy:deploy /var/www/shiftwizard
cd /var/www/shiftwizard
```

### 5.2 Clone Your Repository

**Option A: If your code is on GitHub:**
```bash
git clone https://github.com/YOUR_USERNAME/shiftwizard.git .
```

**Option B: Upload from your local machine:**

On your Mac terminal (NEW terminal window, not SSH):
```bash
cd /Users/papichulo/roster86/shiftwizard
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  . deploy@123.45.67.89:/var/www/shiftwizard/
```
(Replace `123.45.67.89` with your VPS IP)

### 5.3 Install Dependencies

Back in your SSH session:
```bash
cd /var/www/shiftwizard

# Install root dependencies (for frontend build)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Step 6: Configure Environment Variables

### 6.1 Generate JWT Secret

```bash
openssl rand -hex 32
```

**Copy the output** - you'll need it in the next step.

### 6.2 Create Backend Environment File

```bash
cd /var/www/shiftwizard/backend
nano .env
```

### 6.3 Paste Configuration

**Copy this template and replace ALL values with YOUR actual credentials:**

```bash
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=production
PORT=3001

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
# Replace with your domain OR VPS IP
FRONTEND_URL=http://123.45.67.89
# Later change to: FRONTEND_URL=https://yourdomain.com

# ==========================================
# JWT SECURITY - REPLACE WITH YOUR GENERATED SECRET!
# ==========================================
JWT_SECRET=YOUR_GENERATED_SECRET_FROM_STEP_6.1
JWT_EXPIRES_IN=24h

# ==========================================
# VULTR MANAGED DATABASE - REPLACE ALL VALUES!
# ==========================================
DB_HOST=postgres-xxx.vultr-prod.com
DB_PORT=16751
DB_NAME=defaultdb
DB_USER=vultradmin
DB_PASSWORD=your_database_password_here

# Database connection pool
DATABASE_MAX_CONNECTIONS=20

# ==========================================
# OPTIONAL: ADVANCED FEATURES
# ==========================================
# Uncomment and add if you want AI scheduling features
# OPENAI_API_KEY=sk-your-openai-api-key-here

# Uncomment if you want email notifications
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

### 6.4 Verify Environment File

```bash
cat .env | grep -v PASSWORD
# This shows your config without showing sensitive passwords
```

Make sure:
- ✅ `NODE_ENV=production`
- ✅ `DB_HOST` matches your Vultr database host
- ✅ `JWT_SECRET` is the random string you generated
- ✅ No spaces before or after `=` signs

---

## Step 7: Start the Backend

### 7.1 Test Backend Manually First

```bash
cd /var/www/shiftwizard/backend
node server.js
```

**You should see:**
```
🗄️ Database: postgresql (postgres-xxx.vultr-prod.com:16751/defaultdb)
🔌 Connecting to PostgreSQL database...
📍 Host: postgres-xxx.vultr-prod.com:16751
🗄️ Database: defaultdb
✅ PostgreSQL connection established successfully
🏗️ Initializing database schema...
✅ Database tables created successfully
✅ Database migrations completed successfully
✅ Database indexes created successfully
✅ Database initialized successfully
🚀 ShiftWizard Backend running on port 3001
📊 Health check: http://localhost:3001/health
🔌 WebSocket server enabled
```

✅ **Success! Press `Ctrl + C` to stop.**

❌ **If you see errors:**
- Check database credentials in `.env`
- Verify VPS IP is in database Trusted Sources
- Test database connection with `psql` command from Step 4

### 7.2 Start with PM2 (Production Mode)

```bash
cd /var/www/shiftwizard/backend
pm2 start server.js --name shiftwizard-backend
```

### 7.3 Configure PM2 Auto-Start on Reboot

```bash
pm2 startup
# Copy and run the command it gives you (starts with sudo)

pm2 save
```

### 7.4 Verify Backend is Running

```bash
pm2 status
```

You should see:
```
┌────┬────────────────────┬─────────┬─────────┬───────┐
│ id │ name               │ status  │ restart │ cpu   │
├────┼────────────────────┼─────────┼─────────┼───────┤
│ 0  │ shiftwizard-backend│ online  │ 0       │ 0%    │
└────┴────────────────────┴─────────┴─────────┴───────┘
```

✅ Status should be **"online"**

### 7.5 Test API Endpoint

```bash
curl http://localhost:3001/health
```

**Should return:**
```json
{"status":"OK","timestamp":"2025-10-20T...","version":"1.0.0"}
```

✅ **Backend is working!**

---

# PART 4: DEPLOY FRONTEND

## Step 8: Build Frontend

### 8.1 Configure Frontend Environment

```bash
cd /var/www/shiftwizard
nano .env
```

Add:
```bash
VITE_API_BASE_URL=http://123.45.67.89:3001/api
# Later change to: VITE_API_BASE_URL=https://yourdomain.com/api
```

Save: `Ctrl + X`, `Y`, `Enter`

### 8.2 Build Frontend

```bash
cd /var/www/shiftwizard
npm run build
```

**You should see:**
```
✓ built in 1.35s
dist/index.html                   0.48 kB
dist/assets/index-xxx.css        91.73 kB
dist/assets/index-xxx.js        769.96 kB
```

✅ **Frontend built successfully!**

---

## Step 9: Install & Configure Nginx

### 9.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 9.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/shiftwizard
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name 123.45.67.89;  # Replace with YOUR VPS IP or domain

    # Frontend (React app)
    root /var/www/shiftwizard/dist;
    index index.html;

    # Serve frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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

Save: `Ctrl + X`, `Y`, `Enter`

### 9.3 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/shiftwizard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
```

### 9.4 Test Nginx Configuration

```bash
sudo nginx -t
```

**Should say:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 9.5 Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx  # Auto-start on boot
```

---

# PART 5: TEST YOUR DEPLOYMENT

## Step 10: Verify Everything Works

### 10.1 Test from Your Mac

Open browser and go to:
```
http://123.45.67.89
```
(Replace with YOUR VPS IP)

You should see your **ShiftWizard login page!** 🎉

### 10.2 Create Test Account

1. Click **Sign up**
2. Register with:
   - Email: `admin@test.com`
   - Password: `TestPass123!`
   - Full Name: `Test Admin`

3. Login and verify the dashboard loads

### 10.3 Check Backend Logs

```bash
pm2 logs shiftwizard-backend
```

You should see successful API requests.

---

# PART 6: CONFIGURE FIREWALL (SECURITY)

## Step 11: Setup UFW Firewall

### 11.1 Install and Configure UFW

```bash
# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
# Type 'y' to confirm

# Check status
sudo ufw status
```

**Should show:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

✅ **Firewall configured!**

---

# PART 7: ADD SSL CERTIFICATE (OPTIONAL - RECOMMENDED)

## Step 12: Setup HTTPS with Let's Encrypt

### 12.1 Point Domain to Server (If you have a domain)

In your domain registrar (Namecheap, GoDaddy, etc.):
1. Add **A Record**:
   - Name: `@`
   - Value: `123.45.67.89` (your VPS IP)

2. Add **A Record** for www:
   - Name: `www`
   - Value: `123.45.67.89`

**Wait 5-10 minutes for DNS to propagate.**

### 12.2 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 12.3 Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS: **Yes (2)**

### 12.4 Update Frontend Environment

```bash
cd /var/www/shiftwizard
nano .env
```

Change to:
```bash
VITE_API_BASE_URL=https://yourdomain.com/api
```

### 12.5 Update Backend Environment

```bash
cd /var/www/shiftwizard/backend
nano .env
```

Change to:
```bash
FRONTEND_URL=https://yourdomain.com
```

### 12.6 Rebuild and Restart

```bash
cd /var/www/shiftwizard
npm run build

pm2 restart shiftwizard-backend
```

Now access your app at: **https://yourdomain.com** 🎉

---

# PART 8: USEFUL COMMANDS

## PM2 Commands

```bash
pm2 status                      # Check status
pm2 logs shiftwizard-backend    # View logs
pm2 restart shiftwizard-backend # Restart app
pm2 stop shiftwizard-backend    # Stop app
pm2 delete shiftwizard-backend  # Remove from PM2
pm2 monit                       # Real-time monitoring
```

## View Logs

```bash
# Backend logs
pm2 logs shiftwizard-backend

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

## Update Code (After Changes)

```bash
cd /var/www/shiftwizard

# Pull latest code
git pull origin main

# Install new dependencies
npm install
cd backend && npm install && cd ..

# Rebuild frontend
npm run build

# Restart backend
pm2 restart shiftwizard-backend
```

---

# TROUBLESHOOTING

## Backend won't start

```bash
# Check logs
pm2 logs shiftwizard-backend --lines 50

# Test manually
cd /var/www/shiftwizard/backend
node server.js
```

Common issues:
- ❌ Database connection: Check Vultr Trusted Sources
- ❌ Port in use: `sudo lsof -i :3001`
- ❌ Environment variables: `cat .env | grep DB_`

## Frontend shows blank page

```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify build exists
ls -la /var/www/shiftwizard/dist

# Rebuild if needed
cd /var/www/shiftwizard
npm run build
```

## Database connection errors

```bash
# Test connection directly
psql "postgresql://USER:PASS@HOST:PORT/DB?sslmode=require"

# Check Vultr dashboard Trusted Sources
# Make sure YOUR_VPS_IP/32 is added
```

---

# ✅ DEPLOYMENT COMPLETE!

Your ShiftWizard application is now running in production! 🎉

**What you have:**
- ✅ Backend API running on PM2
- ✅ PostgreSQL database (Vultr managed)
- ✅ Frontend served by Nginx
- ✅ WebSocket real-time updates
- ✅ Automatic restart on crashes
- ✅ Firewall configured
- ✅ (Optional) SSL certificate for HTTPS

**Access your app:**
- **Without SSL:** `http://123.45.67.89`
- **With SSL:** `https://yourdomain.com`

**Next steps:**
1. Create your admin account
2. Add employees and shift templates
3. Generate schedules
4. Set up automatic backups in Vultr dashboard

Need help? Check logs with `pm2 logs shiftwizard-backend`
