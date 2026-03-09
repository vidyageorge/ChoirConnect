# ChoirMate Deployment Guide 🚀

This guide explains how to deploy ChoirMate to various hosting platforms.

## Quick Deploy Options

### Option 1: Render.com (Recommended - FREE!) ⭐

**Why Render?**
- ✅ Free tier available
- ✅ Supports SQLite database
- ✅ Easy to set up
- ✅ Automatic deployments from Git

**Steps:**

1. **Prepare Your Code**
   ```bash
   # Make sure you have a GitHub account
   # Initialize git if you haven't already
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create a new repository on GitHub
   # Then push your code
   git remote add origin https://github.com/YOUR_USERNAME/ChoirMate.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Sign up/Login with GitHub
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `choirmate` (or any name you like)
     - **Environment**: `Node`
     - **Build Command**: `npm install && cd client && npm install && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free
   - Click **"Create Web Service"**
   - Wait 3-5 minutes for deployment
   - Your app will be live at: `https://choirmate.onrender.com` (or your chosen name)

**Important Note**: Render free tier databases reset periodically. For persistent data, upgrade to paid tier ($7/month).

---

### Option 2: Railway.app (Easy & Fast) 🚄

**Why Railway?**
- ✅ $5 free credit monthly
- ✅ SQLite works great
- ✅ Very simple deployment
- ✅ Fast performance

**Steps:**

1. **Push to GitHub** (same as Option 1)

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click **"Start a New Project"**
   - Choose **"Deploy from GitHub repo"**
   - Select your ChoirMate repository
   - Railway automatically detects it's a Node.js app
   - Click **"Deploy"**
   - Wait 2-3 minutes
   - Your app will be live!

3. **Get Your URL**
   - Go to Settings → Generate Domain
   - Your app will be at: `https://YOUR_APP.up.railway.app`

---

### Option 3: Heroku (Classic Choice) 🟣

**Why Heroku?**
- ✅ Reliable and popular
- ✅ Free dyno hours available
- ✅ Easy to manage

**Steps:**

1. **Install Heroku CLI**
   ```bash
   # Download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Deploy**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create a new app
   heroku create choirmate
   
   # Push to Heroku
   git push heroku main
   
   # Open your app
   heroku open
   ```

**Note**: Heroku's free tier was discontinued. You'll need the Eco plan ($5/month).

---

### Option 4: Docker + Any Cloud Provider 🐳

**Why Docker?**
- ✅ Works everywhere
- ✅ Consistent environment
- ✅ Easy to scale

**Steps:**

1. **Build Docker Image**
   ```bash
   docker build -t choirmate .
   ```

2. **Run Locally to Test**
   ```bash
   docker run -p 3000:3000 choirmate
   # Visit http://localhost:3000
   ```

3. **Deploy to Any Platform**
   - AWS ECS
   - Google Cloud Run
   - Azure Container Instances
   - DigitalOcean App Platform

---

## Platform Comparison

| Platform | Cost | Setup Time | SQLite Support | Best For |
|----------|------|------------|----------------|----------|
| **Render** | Free/$7/mo | 5 min | ✅ Yes | Personal/Small teams |
| **Railway** | $5 credit/mo | 2 min | ✅ Yes | Quick deploys |
| **Heroku** | $5/mo | 5 min | ✅ Yes | Traditional hosting |
| **Vercel** | Free | 3 min | ⚠️ Limited | Frontend-focused |
| **Docker** | Varies | 10 min | ✅ Yes | Custom deployment |

---

## Important Configuration

### Environment Variables

For production, you may want to set:
- `NODE_ENV=production` (automatically set by most platforms)
- `PORT` (automatically provided by hosting platforms)

### Database Persistence

**⚠️ IMPORTANT**: SQLite databases are stored as files. On some platforms:
- Free tiers may not persist files between restarts
- You may need to upgrade to a paid tier for persistent storage
- Consider backing up your database regularly

### Backup Your Database

```bash
# Backup locally (run this periodically)
# The database file is: choir.db in your project root

# Download from your hosted server
scp user@your-server:/path/to/choir.db ./backup-choir.db
```

---

## Post-Deployment Checklist

✅ Test all features:
- [ ] Members page loads
- [ ] Can add/edit members
- [ ] Attendance tracking works
- [ ] Dashboard displays correctly
- [ ] Expenses can be added
- [ ] Birthday reminders appear

✅ Security:
- [ ] Keep your database backed up
- [ ] Don't expose sensitive data
- [ ] Monitor usage

✅ Performance:
- [ ] App loads in under 3 seconds
- [ ] All pages are responsive

---

## Troubleshooting

### "Cannot find module" errors
```bash
# Make sure build command includes:
npm install && cd client && npm install && npm run build
```

### Database resets after restart
- Upgrade to paid tier for persistent storage
- Or use a dedicated database service

### API calls fail
- Check that `client/src/api.ts` uses relative URLs in production
- Verify CORS settings if API and frontend are separate

### App crashes on startup
- Check logs: `heroku logs --tail` (Heroku) or platform-specific log viewer
- Ensure `PORT` environment variable is used

---

## Need Help?

1. Check platform-specific documentation
2. Review error logs in your hosting dashboard
3. Test locally first with `npm run build && NODE_ENV=production npm start`

---

## Recommended: Start with Render.com

For most users, **Render.com** is the easiest and most cost-effective option:
1. Free tier available
2. Easy GitHub integration
3. Automatic deploys on push
4. Good documentation

Follow the Render instructions above to get started! 🎵
