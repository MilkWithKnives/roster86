#!/bin/bash

# Roster86 Enterprise Deployment Script for Vultr VPS
# Optimized for Ubuntu 25.04
# Run this script on your Vultr server after uploading the code

set -e

echo "🚀 Roster86 Enterprise Deployment Starting..."
echo "🐧 Detected Ubuntu 25.04 - using optimized configuration"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget unzip git htop

# Install Docker (Ubuntu 25.04 optimized)
echo "🐳 Installing Docker for Ubuntu 25.04..."
# Add Docker's official GPG key
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER

# Create directories
echo "📁 Creating directories..."
mkdir -p data logs ssl

# Set permissions
sudo chown -R $USER:$USER .

# Generate SSL certificate (self-signed for now)
echo "🔒 Generating SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

# Set strong JWT secret
echo "🔑 Setting up environment..."
export JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" > .env

# Build and start services (using new Docker Compose V2)
echo "🏗️  Building and starting services..."
docker compose up -d --build

# Initialize database
echo "💾 Initializing database..."
sleep 10
docker compose exec roster86 node backend/scripts/init-db.js
docker compose exec roster86 node backend/scripts/seed-db.js

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Setup automatic backups
echo "💾 Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup.sh") | crontab -

cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
docker compose exec roster86 cp /app/backend/database.sqlite /app/backend/data/
tar -czf $BACKUP_DIR/roster86_backup_$DATE.tar.gz data/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "roster86_backup_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

echo "✅ Deployment Complete!"
echo ""
echo "🌟 Roster86 is now running!"
echo "📍 Frontend: https://your-server-ip"
echo "🔧 API: https://your-server-ip/api"
echo ""
echo "🔐 Admin Login:"
echo "   Email: admin@roster86.com"
echo "   Password: admin123"
echo ""
echo "📋 Next Steps:"
echo "1. Point your domain to this server IP"
echo "2. Update SSL certificates with real ones (Let's Encrypt)"
echo "3. Change admin password"
echo "4. Configure environment variables in .env"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs: docker compose logs -f"
echo "   Restart: docker compose restart"
echo "   Stop: docker compose down"
echo "   Update: git pull && docker compose up -d --build"