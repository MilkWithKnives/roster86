#!/bin/bash

# ShiftWizard - Vultr Production Deployment Script
# ==================================================

set -e  # Exit on any error

echo "🚀 Starting ShiftWizard deployment to Vultr..."

# Configuration
DOMAIN=${DOMAIN:-"your-domain.com"}
SERVER_IP=${SERVER_IP:-"YOUR_VULTR_SERVER_IP"}
DB_HOST=${DB_HOST:-"your-vultr-db-host.vultr-prod.com"}
DB_NAME=${DB_NAME:-"shiftwizard_prod"}
DB_USER=${DB_USER:-"shiftwizard_user"}
OPENAI_API_KEY=${OPENAI_API_KEY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check required environment variables
check_env() {
    log "Checking environment variables..."
    
    if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "YOUR_VULTR_SERVER_IP" ]; then
        error "SERVER_IP environment variable is required. Set it to your Vultr server IP."
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        warn "OPENAI_API_KEY not set. AI suggestions will not work."
    fi
    
    log "Environment check complete ✅"
}

# Install dependencies
install_dependencies() {
    log "Installing npm dependencies..."
    
    # Frontend dependencies
    npm install
    log "Frontend dependencies installed ✅"
    
    # Backend dependencies
    cd backend
    npm install
    
    # Install PostgreSQL client
    npm install pg
    
    log "Backend dependencies installed ✅"
    cd ..
}

# Build frontend
build_frontend() {
    log "Building React frontend for production..."
    
    # Set production environment variables
    export VITE_API_BASE_URL="https://$DOMAIN/api"
    
    npm run build
    
    if [ ! -d "dist" ]; then
        error "Frontend build failed - dist directory not found"
    fi
    
    log "Frontend build complete ✅"
}

# Create production environment file
create_production_env() {
    log "Creating production environment configuration..."
    
    cat > backend/.env.production << EOF
# Production Environment - Vultr Deployment
NODE_ENV=production
PORT=3001

# Database Configuration (Vultr Managed Database)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# SSL Configuration
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=20

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# OpenAI Configuration
OPENAI_API_KEY=$OPENAI_API_KEY

# CORS Configuration
FRONTEND_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket Configuration
SOCKET_CORS_ORIGIN=https://$DOMAIN

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# Monitoring
LOG_LEVEL=info
HEALTH_CHECK_ENABLED=true

# Feature Flags
AI_SUGGESTIONS_ENABLED=true
REAL_TIME_UPDATES_ENABLED=true
MULTI_ORG_SUPPORT_ENABLED=true
EOF

    log "Production environment file created ✅"
}

# Create Docker Compose for production
create_docker_compose() {
    log "Creating production Docker Compose configuration..."
    
    cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  shiftwizard-app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - backend/.env.production
    volumes:
      - ./backend/uploads:/app/backend/uploads
      - ./backend/logs:/app/backend/logs
    restart: unless-stopped
    depends_on:
      - redis
    networks:
      - shiftwizard-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - shiftwizard-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./dist:/usr/share/nginx/html
      - ./ssl:/etc/ssl/certs
    depends_on:
      - shiftwizard-app
    restart: unless-stopped
    networks:
      - shiftwizard-network

volumes:
  redis-data:

networks:
  shiftwizard-network:
    driver: bridge
EOF

    log "Docker Compose configuration created ✅"
}

# Create production Dockerfile
create_dockerfile() {
    log "Creating production Dockerfile..."
    
    cat > Dockerfile.prod << EOF
FROM node:18-alpine

# Install Python and system dependencies
RUN apk add --no-cache python3 py3-pip build-base

# Install Python dependencies
COPY backend/requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install Node.js dependencies
RUN npm ci --production
RUN cd backend && npm ci --production

# Copy source code
COPY . .

# Copy pre-built frontend
COPY dist ./backend/public

# Create necessary directories
RUN mkdir -p backend/uploads backend/logs

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/scripts/health-check.js

# Start the application
CMD ["node", "backend/server.js"]
EOF

    log "Production Dockerfile created ✅"
}

# Create Nginx configuration
create_nginx_config() {
    log "Creating Nginx configuration..."
    
    cat > nginx.prod.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    
    upstream backend {
        server shiftwizard-app:3001;
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        return 301 https://\$server_name\$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;
        
        # SSL Configuration
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        
        # Frontend static files
        location / {
            root /usr/share/nginx/html;
            try_files \$uri \$uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # WebSocket support for real-time updates
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Health check
        location /health {
            proxy_pass http://backend;
            access_log off;
        }
    }
}
EOF

    log "Nginx configuration created ✅"
}

# Create health check script
create_health_check() {
    log "Creating health check script..."
    
    mkdir -p backend/scripts
    
    cat > backend/scripts/health-check.js << EOF
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    timeout: 3000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        console.error(\`Health check failed with status: \${res.statusCode}\`);
        process.exit(1);
    }
});

req.on('error', (err) => {
    console.error(\`Health check error: \${err.message}\`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('Health check timeout');
    req.destroy();
    process.exit(1);
});

req.end();
EOF

    chmod +x backend/scripts/health-check.js
    log "Health check script created ✅"
}

# Deploy to server
deploy_to_server() {
    log "Deploying to Vultr server at $SERVER_IP..."
    
    # Create deployment archive
    tar -czf shiftwizard-deploy.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=backend/node_modules \
        --exclude=backend/data \
        --exclude="*.log" \
        .
    
    # Copy files to server
    scp shiftwizard-deploy.tar.gz root@$SERVER_IP:/root/
    
    # Deploy on server
    ssh root@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /root
        
        # Extract deployment
        tar -xzf shiftwizard-deploy.tar.gz
        
        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl enable docker
            systemctl start docker
        fi
        
        # Install Docker Compose if not present
        if ! command -v docker-compose &> /dev/null; then
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # Stop existing containers
        docker-compose -f docker-compose.prod.yml down || true
        
        # Build and start new containers
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Clean up
        rm shiftwizard-deploy.tar.gz
        
        echo "✅ Deployment complete!"
        docker-compose -f docker-compose.prod.yml ps
REMOTE_SCRIPT
    
    # Clean up local files
    rm shiftwizard-deploy.tar.gz
    
    log "Deployment complete! ✅"
    log "Your application should be available at: https://$DOMAIN"
}

# Main deployment function
main() {
    log "🚀 ShiftWizard Vultr Deployment Started"
    log "======================================"
    
    check_env
    install_dependencies
    build_frontend
    create_production_env
    create_docker_compose
    create_dockerfile
    create_nginx_config
    create_health_check
    
    if [ "$1" = "--deploy" ]; then
        deploy_to_server
    else
        log "Deployment files prepared. Run with --deploy flag to deploy to server."
        log "Make sure to:"
        log "1. Set your DB_PASSWORD environment variable"
        log "2. Configure your SSL certificates"
        log "3. Update DNS to point to $SERVER_IP"
    fi
    
    log "🎉 Setup complete!"
}

# Run main function
main "$@"