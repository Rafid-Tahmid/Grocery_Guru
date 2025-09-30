# Grocery Guru - Deployment Guide

This guide will help you deploy Grocery Guru online. We'll cover the changes needed and deployment to cloud platforms.

---

## 📋 Pre-Deployment Checklist

### Required Changes Made:
- ✅ Updated `package.json` with production-ready configuration
- ✅ Created `.env.example` for environment variable template
- ✅ Added `.gitignore` to protect sensitive data
- ✅ Changed start script to use `app.js` directly (for cloud platforms)

### What You Need Before Deploying:
1. A **GitHub account** (to host your code)
2. A **Gmail account** (for password reset emails)
3. Choose a **deployment platform** (recommendations below)

---

## 🚀 Recommended Deployment Platforms

### Option 1: Railway (Recommended - Easiest)
**Pros:**
- Free tier: $5 credit per month
- One-click MySQL database
- Automatic deployments from GitHub
- Easy environment variable setup
- Great for beginners

**Cons:**
- Limited free tier (good for learning/demo)

### Option 2: Render
**Pros:**
- Free tier available
- Supports PostgreSQL/MySQL
- Automatic HTTPS
- Good documentation

**Cons:**
- Free tier has limitations (slower)
- Services sleep after inactivity

### Option 3: Heroku
**Pros:**
- Well-documented
- Many add-ons available
- Industry standard

**Cons:**
- No free tier anymore ($7/month minimum)

---

## 📝 Step-by-Step Deployment (Using Railway)

### Step 1: Prepare Your Code

1. **Create a `.env` file locally** (for testing):
```bash
cp .env.example .env
```

2. **Edit `.env` with your local settings** (don't commit this file!):
```bash
# Use your local MySQL credentials for testing
DB_HOST=localhost
DB_USER=appuser
DB_PASSWORD=securepassword
DB_NAME=wdc
SESSION_SECRET=generate-a-random-string-here
NODE_ENV=development
PORT=8080
```

3. **Push your code to GitHub**:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Set Up Railway

1. **Go to [Railway.app](https://railway.app)** and sign up with GitHub

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `Grocery_Guru` repository

3. **Add a MySQL database**:
   - In your Railway project, click "+ New"
   - Select "Database" → "MySQL"
   - Railway will provision a MySQL database

### Step 3: Configure Environment Variables

1. **Click on your Node.js service** in Railway

2. **Go to "Variables" tab** and add these:

```bash
# Database (Copy these from your MySQL service in Railway)
DB_HOST=<from Railway MySQL service>
DB_USER=<from Railway MySQL service>
DB_PASSWORD=<from Railway MySQL service>
DB_NAME=<from Railway MySQL service>

# Generate a random secret (use: openssl rand -base64 32)
SESSION_SECRET=your-super-secret-random-string-here

# Email (Get Gmail app password from: https://support.google.com/accounts/answer/185833)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Application
NODE_ENV=production
PORT=8080
```

### Step 4: Import Database Schema

You need to import your database structure into Railway's MySQL:

1. **Get Railway MySQL connection details**:
   - Click on MySQL service
   - Copy the connection details (host, port, user, password, database)

2. **Connect to Railway MySQL** from your local machine:
```bash
mysql -h <railway-mysql-host> -P <port> -u <user> -p<password> <database>
```

3. **Import the schema**:
```bash
mysql -h <railway-mysql-host> -P <port> -u <user> -p<password> <database> < Main_Project/wdc.sql
```

4. **Import ingredient data** (if needed):
```bash
# You'll need to upload the CSV to the database
# Or use Railway's built-in tools to import data
```

### Step 5: Deploy

1. Railway will **automatically deploy** when you push to GitHub
2. Wait for the deployment to complete (check the logs)
3. Click on the **generated URL** to view your live site!

---

## 🔧 Alternative: Manual Deployment with Render

### Step 1: Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: grocery-guru
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Create Database
1. Click "New +" → "PostgreSQL" (Free tier)
   - Note: You'll need to convert your app to use PostgreSQL instead of MySQL, OR
   - Use an external MySQL service like [PlanetScale](https://planetscale.com/) or [Railway](https://railway.app)

### Step 4: Set Environment Variables
Add the same variables as in Railway (in the "Environment" tab)

---

## ⚠️ Important Production Changes Needed

### 1. Database Initialization
The current `setup.js` assumes local MySQL with sudo access. For production, you need to:

**Option A**: Import schema manually (recommended for first deployment)
- Use the Railway/Render database console to run `wdc.sql`

**Option B**: Create a production-safe setup script (advanced)

### 2. Session Configuration
The app is already configured to use secure cookies in production (see `app.js` line 41):
```javascript
secure: process.env.NODE_ENV === 'production'
```

### 3. CORS Configuration
Current CORS settings allow all origins. For production, update in `app.js`:
```javascript
app.use(cors({
  origin: process.env.BASE_URL || 'https://your-domain.com',
  credentials: true
}));
```

---

## 🔍 Testing Your Deployment

After deployment, test these features:
- [ ] Home page loads
- [ ] User registration works
- [ ] User login works
- [ ] Recipe search works (TheMealDB API)
- [ ] Saving recipes works
- [ ] Meal planner works
- [ ] Shopping list generates correctly
- [ ] Password reset email sends

---

## 🐛 Common Issues & Solutions

### Issue: "Database connection failed"
**Solution**: Check that environment variables match your database credentials exactly

### Issue: "Session not persisting"
**Solution**: Ensure `SESSION_SECRET` is set and `secure: true` is configured for HTTPS

### Issue: "Cannot connect to MySQL"
**Solution**: Make sure your database is running and accessible from your app

### Issue: "CSV data not importing"
**Solution**: For production, you may need to import CSV data differently:
1. Use database console to import
2. Or create an admin endpoint to trigger import
3. Or manually upload data through SQL

---

## 📊 Database Options Comparison

| Service | Type | Free Tier | Best For |
|---------|------|-----------|----------|
| Railway MySQL | MySQL | $5/month credit | Easy setup, what you're using |
| PlanetScale | MySQL | Yes | Scalable MySQL |
| Render PostgreSQL | PostgreSQL | Yes (limited) | Budget-friendly |
| AWS RDS | MySQL/PostgreSQL | No | Production apps |

---

## 🎯 Quick Start Command Summary

```bash
# 1. Create environment file
cp .env.example .env

# 2. Edit .env with your production values

# 3. Commit and push
git add .
git commit -m "Ready for deployment"
git push origin main

# 4. Deploy to Railway/Render
# Follow the platform-specific steps above

# 5. Import database
mysql -h <host> -u <user> -p<password> <database> < Main_Project/wdc.sql
```

---

## 🔐 Security Checklist

Before going live:
- [ ] `.env` file is in `.gitignore`
- [ ] `SESSION_SECRET` is a strong random string
- [ ] Database credentials are secure
- [ ] Email credentials use app password (not account password)
- [ ] CORS is configured for your domain only
- [ ] HTTPS is enabled (automatic on Railway/Render)

---

## 📞 Getting Help

If you encounter issues:
1. Check the deployment platform logs
2. Verify environment variables are set correctly
3. Test database connection separately
4. Review Railway/Render documentation
5. Check application logs for errors

---

## 🎉 You're Ready!

Once deployed, your Grocery Guru app will be accessible at:
- **Railway**: `https://your-app-name.up.railway.app`
- **Render**: `https://your-app-name.onrender.com`

Share the link and enjoy your deployed application! 🚀
