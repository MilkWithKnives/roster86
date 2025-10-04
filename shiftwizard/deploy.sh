#!/bin/bash

# Roster86 Production Deployment Script

echo "🚀 Building Roster86 for production..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Create deployment directory
rm -rf deploy
mkdir -p deploy/frontend
mkdir -p deploy/backend

# Copy frontend build
echo "📁 Copying frontend build..."
cp -r dist/* deploy/frontend/

# Copy backend files
echo "📁 Copying backend files..."
cp -r backend/* deploy/backend/
cp backend/.env.production deploy/backend/.env

# Copy package files
cp package.json deploy/
cp backend/package.json deploy/backend/

echo "✅ Deployment package created in ./deploy/"
echo ""
echo "📋 Next steps:"
echo "1. Upload ./deploy/frontend/ to your web server's public directory"
echo "2. Upload ./deploy/backend/ to your server and run 'npm install'"
echo "3. Start backend with 'NODE_ENV=production node server.js'"
echo "4. Make sure your domain points to the frontend directory"
echo ""
echo "🔧 Configuration:"
echo "- Update CORS_ORIGIN in backend/.env to your domain"
echo "- Update VITE_API_BASE_URL to your backend URL"