# 🚀 Quick Deployment Guide

The fastest way to get Grocery Guru online!

## Option 1: Railway (Recommended - 5 minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Railway
1. Go to **[railway.app](https://railway.app)** → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `Grocery_Guru` repository
4. Click **"+ New"** → **"Database"** → **"MySQL"**

### 3. Set Environment Variables
Click on your app service → **Variables** → Add these:

**From MySQL Service (click MySQL service to copy):**
- `DB_HOST` = (copy from MySQL service)
- `DB_USER` = (copy from MySQL service)  
- `DB_PASSWORD` = (copy from MySQL service)
- `DB_NAME` = (copy from MySQL service)

**Generate a Session Secret:**
```bash
# Run this in your terminal to generate a random secret:
openssl rand -base64 32
```
Then add:
- `SESSION_SECRET` = (paste the generated string)

**Email Setup (for password reset):**
1. Go to https://myaccount.google.com/apppasswords
2. Create an app password for "Mail"
3. Add these variables:
   - `EMAIL_USER` = your-email@gmail.com
   - `EMAIL_PASS` = (the 16-character app password)

**App Settings:**
- `NODE_ENV` = production
- `PORT` = 8080

### 4. Import Database

**Option A: Using Local MySQL Client**
```bash
# Get Railway MySQL connection details from the MySQL service
# Then run:
mysql -h <RAILWAY_HOST> -P <PORT> -u <USER> -p<PASSWORD> <DATABASE> < Main_Project/wdc.sql
```

**Option B: Using Railway CLI** (easier)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Import database
railway run mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < Main_Project/wdc.sql
```

### 5. Done! 🎉
- Your app will be live at: `https://your-app.up.railway.app`
- Railway auto-deploys when you push to GitHub

---

## Option 2: Render (Free Tier)

### 1. Create Render Account
Go to **[render.com](https://render.com)** → Sign up with GitHub

### 2. Deploy Database
1. Click **"New +"** → **"PostgreSQL"**
2. Name: `grocery-guru-db`
3. Plan: **Free**
4. Create Database

⚠️ **Important**: Render's free tier uses PostgreSQL, not MySQL. You'll need to either:
- Use a different MySQL provider (like PlanetScale)
- OR modify your app to use PostgreSQL

**For MySQL, use PlanetScale (Free):**
1. Go to **[planetscale.com](https://planetscale.com)**
2. Create a free MySQL database
3. Get connection details

### 3. Deploy Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Settings:
   - **Name**: grocery-guru
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 4. Add Environment Variables
In the **Environment** tab, add all the variables from Option 1 above

### 5. Import Database Schema
Connect to your database and run the `wdc.sql` file

---

## ⚡ Super Quick Test

After deployment, test your site:

1. **Registration**: Create a new account
2. **Login**: Sign in with your account
3. **Recipe Search**: Search for a recipe (e.g., "pasta")
4. **Save Recipe**: Click the heart icon
5. **Meal Planner**: Add a recipe to your weekly plan
6. **Shopping List**: Generate a shopping list

---

## 🐛 Troubleshooting

### "Database connection failed"
✅ Check that all DB environment variables are correct
✅ Make sure the database is running
✅ Verify the host/port are correct

### "App won't start"
✅ Check deployment logs in Railway/Render
✅ Verify `npm start` works locally
✅ Check that all environment variables are set

### "Session not working"
✅ Make sure `SESSION_SECRET` is set
✅ Verify your deployment platform supports HTTPS

---

## 📊 Cost Breakdown

| Platform | Free Tier | Cost After Free |
|----------|-----------|-----------------|
| **Railway** | $5 credit/month | ~$10-20/month |
| **Render** | Limited free tier | $7/month minimum |
| **PlanetScale** | 1 database free | $29/month |
| **Heroku** | None | $7/month minimum |

**Recommendation**: Start with Railway ($5 credit) for testing/demo. Upgrade when needed.

---

## 🎯 What Happens Next?

After deployment:
1. Your app is live 24/7 ✅
2. Auto-deploys when you push to GitHub ✅
3. HTTPS enabled automatically ✅
4. Can share URL with anyone ✅

**Your URL will be something like:**
- Railway: `https://grocery-guru-production.up.railway.app`
- Render: `https://grocery-guru.onrender.com`

---

## 🔗 Useful Links

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **Railway CLI**: https://docs.railway.app/develop/cli

---

## Need More Help?

See the detailed `DEPLOYMENT.md` file for:
- Step-by-step screenshots
- Advanced configuration
- Production optimization
- Security best practices
- Database migration guides

Good luck! 🚀
