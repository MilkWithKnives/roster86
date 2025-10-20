# 🔐 SSH Connection Troubleshooting for Vultr

## Quick SSH Test

Set your server IP and run the test script:

```bash
# Set your Vultr server IP
export SERVER_IP="your.vultr.server.ip"

# Run the SSH connection test
./scripts/test-ssh.sh
```

## Common SSH Issues & Solutions

### 1. **Permission Denied (publickey)**

**Problem**: Your SSH key isn't on the server or has wrong permissions.

**Solutions**:
```bash
# Check if you have SSH keys
ls -la ~/.ssh/

# If no keys exist, generate one:
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy your public key to clipboard (macOS):
pbcopy < ~/.ssh/id_ed25519.pub

# Then add it to your Vultr server:
# 1. Go to Vultr control panel
# 2. Server Settings > SSH Keys
# 3. Add the public key
```

### 2. **Connection Timeout**

**Problem**: Can't reach the server.

**Check**:
```bash
# Test if server responds to ping
ping your.server.ip

# Check if SSH port is open
nc -zv your.server.ip 22
```

**Solutions**:
- Verify server IP is correct
- Check Vultr firewall settings
- Ensure server isn't suspended

### 3. **Connection Refused**

**Problem**: SSH daemon not running on server.

**Check via Vultr Console**:
1. Login to Vultr control panel
2. Click on your server 
3. Use "View Console" 
4. Login and run:
```bash
sudo systemctl status ssh
sudo systemctl start ssh
```

### 4. **Wrong Username**

**Try different usernames**:
```bash
# Most common for Vultr:
ssh root@your.server.ip

# Ubuntu servers sometimes use:
ssh ubuntu@your.server.ip

# CentOS/RHEL might use:
ssh centos@your.server.ip
```

### 5. **Force Password Authentication**

If keys aren't working, try password:
```bash
ssh -o PreferredAuthentications=password root@your.server.ip
```

### 6. **Verbose Debug Mode**

Get detailed connection info:
```bash
ssh -vvv root@your.server.ip
```

## Vultr-Specific Solutions

### Reset SSH Access
1. **Vultr Control Panel** → Your Server
2. **Settings** → **SSH Keys**
3. Add your public key
4. **Server Settings** → **Enable SSH**

### Rebuild Server (Last Resort)
If nothing works:
1. **Vultr Control Panel** → Your Server
2. **Settings** → **Reinstall**
3. Choose your OS and add SSH key during setup

### Firewall Issues
Via Vultr console:
```bash
# Check firewall status
sudo ufw status

# Allow SSH if blocked
sudo ufw allow 22

# Or disable firewall temporarily
sudo ufw disable
```

## Test Commands

Once you can SSH, test these:

```bash
# Basic connection
ssh root@your.server.ip "echo 'Connection works!'"

# System info
ssh root@your.server.ip "uname -a && uptime"

# Check available resources
ssh root@your.server.ip "df -h && free -h"
```

## Next Steps

Once SSH is working, you can:

1. **Deploy your database**:
```bash
export SERVER_IP="your.server.ip"
export DB_PASSWORD="your-secure-password"
./scripts/deploy-vultr.sh --deploy
```

2. **Set up PostgreSQL manually**:
```bash
ssh root@$SERVER_IP
apt update
apt install postgresql postgresql-contrib
```

## SSH Key Generation (If Needed)

```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -C "shiftwizard-$(date +%Y%m%d)"

# Display public key (copy this to Vultr)
cat ~/.ssh/id_ed25519.pub

# Test the new key
ssh -i ~/.ssh/id_ed25519 root@your.server.ip
```

## Quick Checklist

- [ ] Server IP is correct
- [ ] Server is running (check Vultr dashboard)
- [ ] SSH keys are generated locally
- [ ] Public key is added to Vultr server
- [ ] Firewall allows SSH (port 22)
- [ ] Using correct username (usually `root` for Vultr)

Need help? Run the test script first:
```bash
export SERVER_IP="your.server.ip"
./scripts/test-ssh.sh
```