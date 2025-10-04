# Roster86 - Enterprise Scheduling SaaS

## 🚀 Overview
Roster86 is a premium React-based employee scheduling application with a comprehensive backend API and enterprise-grade deployment infrastructure.

## 🏗️ Architecture
- **Frontend:** React 18 + Vite + Tailwind CSS + Shadcn/ui
- **Backend:** Node.js + Express + SQLite
- **Deployment:** Docker + Nginx + Cloud-Init
- **Design:** Glass-morphism premium UI

## 📁 Project Structure
```
roster86/
├── src/                    # React frontend
├── backend/               # Node.js API server
├── components/            # UI components
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Multi-service setup
├── cloud-init.yaml       # Automated deployment
└── deploy-vultr.sh       # Manual deployment script
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install
cd backend && npm install

# Start backend
cd backend && node server.js

# Start frontend (new terminal)
npm run dev
```

### Production Deployment
```bash
# Option 1: Cloud-Init (Recommended)
# Use cloud-init.yaml with Vultr VPS

# Option 2: Manual Deployment
./deploy-vultr.sh
```

## 🔐 Default Credentials
- **Admin:** admin@roster86.com / admin123

## 📚 Documentation
- [Cloud-Init Deployment Guide](CLOUD_INIT_GUIDE.md)
- [Deployment Options](DEPLOYMENT_OPTIONS.md)
- [Copilot Instructions](.github/copilot-instructions.md)

## 🌟 Features
- Employee management and scheduling
- Shift templates and coverage checking
- Real-time updates and notifications
- Premium glass-morphism design
- Enterprise authentication and security
- Automated backups and monitoring

## 📊 Tech Stack
- React 18, Express.js, SQLite
- Docker, Nginx, SSL/HTTPS
- Tailwind CSS, Lucide Icons
- JWT Authentication, Rate Limiting

---

**Roster86** - Professional scheduling made simple. 🎯