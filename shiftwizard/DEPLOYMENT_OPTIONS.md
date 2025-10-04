# Roster86 - Serverless Deployment Guide

## Option 1: Supabase + Netlify (RECOMMENDED)

### Step 1: Setup Supabase (Free Database + Auth)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your API URL and anon key
4. Import your database schema

### Step 2: Update Frontend for Supabase
```bash
npm install @supabase/supabase-js
```

### Step 3: Deploy to Netlify
1. Push code to GitHub
2. Connect to Netlify
3. Set environment variables
4. Auto-deploys on git push

### Benefits:
- ✅ $0/month to start (generous free tiers)
- ✅ Scales automatically 
- ✅ No server maintenance
- ✅ Built-in authentication
- ✅ Real-time subscriptions
- ✅ File storage included
- ✅ Edge functions for custom logic

## Option 2: Keep Current Backend + Railway/Render
- Deploy your Node.js backend to Railway or Render
- Frontend to Netlify/Vercel
- Simple, works with current code

## Recommendation:
**Go with Supabase + Netlify** - it's the modern, maintainable approach that will last years without hassle.