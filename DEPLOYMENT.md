# Roster86 Deployment Guide

This guide covers deploying the Roster86 application to production using the automated deployment script.

## Quick Start

```bash
# Full production deployment
./deploy.sh

# Deploy to staging
./deploy.sh --environment staging

# Backend only with Docker
./deploy.sh --backend-only --docker
```

## Prerequisites

### System Requirements

- **Node.js**: v18 or higher
- **npm**: Latest version
- **Python**: v3.11 or higher
- **pip3**: Latest version
- **Git**: Any recent version
- **Docker** (optional): For containerized deployment
- **PM2** (optional): For process management

### Installation

```bash
# Install Node.js 18+
# Visit: https://nodejs.org/

# Install Python 3.11+
# Visit: https://www.python.org/downloads/

# Install PM2 (optional but recommended)
npm install -g pm2

# Install Vercel CLI (for frontend deployment)
npm install -g vercel

# Install Docker (optional)
# Visit: https://docs.docker.com/get-docker/
```

## Configuration

### 1. Backend Environment Setup

```bash
# Copy the example environment file
cp shiftwizard/backend/.env.production.example shiftwizard/backend/.env.production

# Edit the configuration
nano shiftwizard/backend/.env.production
```

**Critical Settings to Configure:**

```env
# REQUIRED: Change this to a secure random string
JWT_SECRET=your-secure-random-string-here

# Database (PostgreSQL for production recommended)
DATABASE_URL=postgresql://user:password@host:5432/roster86
# OR use SQLite for simple deployments
# DB_PATH=./database.sqlite

# Server Configuration
NODE_ENV=production
PORT=3001

# CORS (Set to your frontend domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (optional, for job queues)
REDIS_URL=redis://localhost:6379

# Sentry (optional, for error tracking)
SENTRY_DSN=https://...@sentry.io/...
```

### 2. Generate Secure JWT Secret

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Frontend Environment (Optional)

If your frontend needs environment variables:

```bash
# Create frontend .env
echo "VITE_API_URL=https://api.yourdomain.com" > shiftwizard/.env.production
```

## Deployment Methods

### Method 1: Traditional Deployment (Recommended)

This method deploys the backend using PM2 and frontend to Vercel.

```bash
# Full deployment
./deploy.sh

# Backend only
./deploy.sh --backend-only

# Frontend only
./deploy.sh --frontend-only
```

**What happens:**
1. Validates system requirements
2. Checks environment configuration
3. Backs up database
4. Installs dependencies
5. Runs tests
6. Builds frontend
7. Initializes/migrates database
8. Starts backend with PM2
9. Deploys frontend to Vercel
10. Verifies deployment

### Method 2: Docker Deployment

Containerized deployment for better isolation and portability.

```bash
# Deploy with Docker
./deploy.sh --docker

# Backend only with Docker
./deploy.sh --backend-only --docker
```

**What happens:**
1. Builds Docker image
2. Stops existing container
3. Starts new container with proper volumes
4. Health check verification

### Method 3: Manual Deployment

For custom setups or troubleshooting.

#### Backend

```bash
cd shiftwizard/backend

# Install dependencies
npm ci --production

# Install Python dependencies
pip3 install ortools numpy

# Initialize database
node scripts/init-db.js

# Start server
NODE_ENV=production node server.js

# OR with PM2
pm2 start server.js --name roster86-backend --env production
```

#### Frontend

```bash
cd shiftwizard

# Install dependencies
npm ci

# Build
npm run build

# Deploy to Vercel
vercel --prod

# OR serve with nginx/apache
# Copy dist/ to your web server
```

## Deployment Options

### Command-Line Flags

```bash
# Environment selection
./deploy.sh --environment production  # or staging, development

# Skip tests (for quick deployments)
./deploy.sh --skip-tests

# Skip database backup
./deploy.sh --skip-backup

# Component selection
./deploy.sh --frontend-only
./deploy.sh --backend-only

# Docker deployment
./deploy.sh --docker

# Show help
./deploy.sh --help
```

### Environment Variables

```bash
# Alternative to command-line flags
ENVIRONMENT=production \
SKIP_TESTS=false \
DEPLOY_FRONTEND=true \
DEPLOY_BACKEND=true \
DOCKER_DEPLOY=false \
./deploy.sh
```

## Post-Deployment

### Verify Deployment

```bash
# Check backend health
curl http://localhost:3001/api/health

# Detailed health check
curl http://localhost:3001/api/health/detailed

# Test API
curl http://localhost:3001/api/test
```

### Monitor Application

```bash
# PM2 status
pm2 status

# PM2 logs (real-time)
pm2 logs roster86-backend

# PM2 monitoring dashboard
pm2 monit

# Docker logs
docker logs roster86-backend -f

# Application logs
tail -f shiftwizard/backend/logs/combined.log
tail -f shiftwizard/backend/logs/error.log
```

### Common PM2 Commands

```bash
# Restart application
pm2 restart roster86-backend

# Stop application
pm2 stop roster86-backend

# Delete application
pm2 delete roster86-backend

# Save PM2 config (auto-start on reboot)
pm2 save
pm2 startup
```

## Troubleshooting

### Deployment Failed

The script automatically rolls back on failure. Check the error messages:

```bash
# Check logs
tail -f shiftwizard/backend/logs/error.log

# Check PM2 logs
pm2 logs roster86-backend --err

# Verify environment
cd shiftwizard/backend
node -e "console.log(require('./config/production.js'))"
```

### Health Check Failed

```bash
# Check if server is running
pm2 status

# Check server logs
pm2 logs roster86-backend

# Check environment variables
pm2 env roster86-backend

# Test manually
cd shiftwizard/backend
NODE_ENV=production node server.js
```

### Database Issues

```bash
# Check database file permissions
ls -la shiftwizard/backend/database.sqlite

# Restore from backup
cp shiftwizard/backend/backups/database_YYYYMMDD_HHMMSS.sqlite \
   shiftwizard/backend/database.sqlite

# Re-initialize database
cd shiftwizard/backend
node scripts/init-db.js
```

### Python/OR-Tools Issues

```bash
# Verify Python installation
python3 --version

# Verify OR-Tools installation
python3 -c "from ortools.sat.python import cp_model; print('OK')"

# Reinstall OR-Tools
pip3 install --upgrade ortools

# Check scheduling scripts
ls -la shiftwizard/backend/*.py
chmod +x shiftwizard/backend/*.py
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env.production
PORT=3002
```

## Database Management

### Backup Database

```bash
# Automatic backups are created during deployment
# Manual backup:
cp shiftwizard/backend/database.sqlite \
   shiftwizard/backend/backups/database_$(date +%Y%m%d_%H%M%S).sqlite
```

### Restore Database

```bash
# List backups
ls -lt shiftwizard/backend/backups/

# Restore from backup
cp shiftwizard/backend/backups/database_YYYYMMDD_HHMMSS.sqlite \
   shiftwizard/backend/database.sqlite

# Restart application
pm2 restart roster86-backend
```

### Migrate to PostgreSQL

For production, PostgreSQL is recommended:

```bash
# 1. Set up PostgreSQL database
createdb roster86

# 2. Update .env.production
DATABASE_URL=postgresql://user:password@localhost:5432/roster86

# 3. Run migrations
cd shiftwizard/backend
node scripts/migrate-to-postgres.js

# 4. Deploy
./deploy.sh
```

## Scaling

### Horizontal Scaling

```bash
# Run multiple instances with PM2
pm2 start server.js -i max --name roster86-backend

# Or specify number of instances
pm2 start server.js -i 4 --name roster86-backend
```

### Load Balancing

Use nginx as reverse proxy:

```nginx
upstream roster86_backend {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://roster86_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Checklist

- [ ] Changed JWT_SECRET from default
- [ ] Configured CORS_ORIGINS to your domain only
- [ ] Enabled HTTPS (use Cloudflare/nginx)
- [ ] Set up firewall (allow only ports 80, 443, 22)
- [ ] Configured rate limiting
- [ ] Enabled security headers (helmet.js)
- [ ] Set up automated backups
- [ ] Configured error tracking (Sentry)
- [ ] Set up monitoring/alerts
- [ ] Reviewed and secured environment variables
- [ ] Disabled directory listing on web server
- [ ] Implemented proper authentication
- [ ] Set up audit logging

## Monitoring & Alerts

### Health Check Endpoints

- **Basic Health**: `GET /api/health`
- **Detailed Health**: `GET /api/health/detailed`
- **Kubernetes Liveness**: `GET /api/health/live`
- **Kubernetes Readiness**: `GET /api/health/ready`

### Set Up Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure Sentry (optional)
# Add SENTRY_DSN to .env.production

# Set up external monitoring
# - UptimeRobot: https://uptimerobot.com/
# - Pingdom: https://www.pingdom.com/
```

## Rollback

If something goes wrong:

```bash
# Automatic rollback (built into deploy.sh)
# Happens automatically on deployment failure

# Manual rollback
cd shiftwizard/backend

# 1. Stop current version
pm2 stop roster86-backend

# 2. Restore database
cp backups/database_YYYYMMDD_HHMMSS.sqlite database.sqlite

# 3. Checkout previous version
git checkout HEAD~1

# 4. Install dependencies
npm ci --production

# 5. Restart
pm2 restart roster86-backend
```

## Production Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backed up
- [ ] SSL/HTTPS configured
- [ ] DNS configured
- [ ] Firewall rules set
- [ ] Monitoring configured
- [ ] Error tracking set up
- [ ] Backups automated
- [ ] Rollback plan tested
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Documentation updated

## Support

### Logs Location

- **Application Logs**: `shiftwizard/backend/logs/`
- **PM2 Logs**: `~/.pm2/logs/`
- **Docker Logs**: `docker logs roster86-backend`

### Get Help

- **Documentation**: See `PRODUCTION_READY_CHECKLIST.md`
- **Deployment Guide**: See `shiftwizard/DEPLOYMENT_INSTRUCTIONS.md`
- **API Documentation**: See `shiftwizard/backend/README.md`

### Common Issues

See the existing deployment documentation:
- `shiftwizard/DEPLOYMENT_INSTRUCTIONS.md`
- `shiftwizard/PRODUCTION_DEPLOYMENT_GUIDE.md`
- `PRODUCTION_READY_CHECKLIST.md`

## Next Steps

After successful deployment:

1. Test all functionality in production
2. Set up monitoring and alerts
3. Configure automated backups
4. Set up CI/CD pipeline (optional)
5. Performance tuning
6. Security hardening
7. Load testing

---

**Ready to deploy? Run:**

```bash
./deploy.sh
```

For help:

```bash
./deploy.sh --help
```
