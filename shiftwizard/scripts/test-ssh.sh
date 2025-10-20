#!/bin/bash

# SSH Connection Test Script for Vultr Server
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP=${SERVER_IP:-"YOUR_VULTR_SERVER_IP"}
SSH_USER=${SSH_USER:-"root"}
SSH_PORT=${SSH_PORT:-"22"}

echo -e "${BLUE}🔐 SSH Connection Test to Vultr Server${NC}\n"

# Check if SERVER_IP is set
if [ "$SERVER_IP" = "YOUR_VULTR_SERVER_IP" ]; then
    echo -e "${RED}❌ SERVER_IP not set!${NC}"
    echo "Please set your Vultr server IP:"
    echo "export SERVER_IP='your.server.ip.address'"
    echo ""
    exit 1
fi

echo "📍 Server IP: $SERVER_IP"
echo "👤 SSH User: $SSH_USER" 
echo "🔌 SSH Port: $SSH_PORT"
echo ""

# Test 1: Check if server is reachable
echo -e "${BLUE}🔍 Test 1: Checking server connectivity...${NC}"
if ping -c 3 -W 5000 $SERVER_IP >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is reachable via ping${NC}"
else
    echo -e "${RED}❌ Server is not reachable via ping${NC}"
    echo "This could mean:"
    echo "- Server is down"
    echo "- Firewall is blocking ping"
    echo "- IP address is incorrect"
    echo ""
fi

# Test 2: Check if SSH port is open
echo -e "${BLUE}🔍 Test 2: Checking SSH port accessibility...${NC}"
if command -v nc >/dev/null 2>&1; then
    if nc -z -w 5 $SERVER_IP $SSH_PORT 2>/dev/null; then
        echo -e "${GREEN}✅ SSH port $SSH_PORT is open${NC}"
    else
        echo -e "${RED}❌ SSH port $SSH_PORT is not accessible${NC}"
        echo "This could mean:"
        echo "- SSH daemon is not running"
        echo "- Firewall is blocking the port"
        echo "- Wrong port number"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️ netcat (nc) not found, skipping port check${NC}"
fi

# Test 3: SSH key checking
echo -e "${BLUE}🔍 Test 3: Checking SSH keys...${NC}"

# Check for SSH keys
if [ -f ~/.ssh/id_rsa ]; then
    echo -e "${GREEN}✅ Found RSA private key: ~/.ssh/id_rsa${NC}"
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo -e "${GREEN}✅ Found ED25519 private key: ~/.ssh/id_ed25519${NC}"
else
    echo -e "${YELLOW}⚠️ No SSH keys found in ~/.ssh/${NC}"
    echo "You might need to:"
    echo "1. Generate SSH keys: ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "2. Or use password authentication"
    echo ""
fi

# Check known_hosts
if [ -f ~/.ssh/known_hosts ]; then
    if grep -q "$SERVER_IP" ~/.ssh/known_hosts; then
        echo -e "${GREEN}✅ Server is in known_hosts${NC}"
    else
        echo -e "${YELLOW}⚠️ Server not in known_hosts (first connection)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No known_hosts file found${NC}"
fi

echo ""

# Test 4: Attempt SSH connection
echo -e "${BLUE}🔍 Test 4: Attempting SSH connection...${NC}"

# SSH connection options
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "Trying SSH connection (this may prompt for password)..."
echo "Command: ssh $SSH_OPTS $SSH_USER@$SERVER_IP"
echo ""

if ssh $SSH_OPTS $SSH_USER@$SERVER_IP "echo 'SSH connection successful! 🎉'; uname -a; uptime" 2>/dev/null; then
    echo -e "\n${GREEN}✅ SSH connection successful!${NC}"
else
    echo -e "\n${RED}❌ SSH connection failed${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting steps:${NC}"
    echo ""
    
    echo "1. Check if you can SSH with verbose output:"
    echo "   ssh -vvv $SSH_USER@$SERVER_IP"
    echo ""
    
    echo "2. Try different authentication methods:"
    echo "   # With password:"
    echo "   ssh -o PreferredAuthentications=password $SSH_USER@$SERVER_IP"
    echo ""
    echo "   # With key:"
    echo "   ssh -i ~/.ssh/id_rsa $SSH_USER@$SERVER_IP"
    echo ""
    
    echo "3. Check Vultr console:"
    echo "   - Login to Vultr control panel"
    echo "   - Use web console to check if server is running"
    echo "   - Verify SSH daemon is running: systemctl status ssh"
    echo ""
    
    echo "4. Check firewall rules:"
    echo "   sudo ufw status"
    echo "   # If needed: sudo ufw allow 22"
    echo ""
    
    echo "5. Reset SSH keys in Vultr:"
    echo "   - Go to server settings in Vultr"
    echo "   - Add your public key"
    echo "   - Rebuild server if necessary"
    echo ""
fi

echo -e "\n${BLUE}📋 Summary:${NC}"
echo "If SSH connection failed, try these commands manually:"
echo ""
echo -e "${GREEN}# Basic connection test:${NC}"
echo "ssh $SSH_USER@$SERVER_IP"
echo ""
echo -e "${GREEN}# Verbose connection (for debugging):${NC}"
echo "ssh -vvv $SSH_USER@$SERVER_IP"
echo ""
echo -e "${GREEN}# Force password auth:${NC}"
echo "ssh -o PreferredAuthentications=password $SSH_USER@$SERVER_IP"
echo ""
echo -e "${GREEN}# Use specific key:${NC}"
echo "ssh -i ~/.ssh/your_key $SSH_USER@$SERVER_IP"
echo ""

# Generate SSH key if none exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    echo -e "${BLUE}🔑 No SSH keys found. Generate one?${NC} (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Generating SSH key..."
        ssh-keygen -t ed25519 -C "shiftwizard-$(date +%Y%m%d)" -f ~/.ssh/id_ed25519
        echo ""
        echo -e "${GREEN}✅ SSH key generated!${NC}"
        echo "Public key (add this to your Vultr server):"
        cat ~/.ssh/id_ed25519.pub
        echo ""
    fi
fi