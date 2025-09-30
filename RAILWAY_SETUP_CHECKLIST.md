# 🚀 Railway Deployment Checklist

## ✅ Completed Setup

- [x] **Database Connection** - MySQL connected to Railway
- [x] **Database Tables** - All 6 tables created
- [x] **Graceful Shutdown** - App handles restarts properly
- [x] **Health Check** - `/health` endpoint configured
- [x] **Security** - Removed hardcoded credentials
- [x] **Production Guards** - Local scripts won't run on Railway
- [x] **User Authentication** - Signup/Login should work
- [x] **CSV File** - `merged_store_data.csv` is in git repo

---

## ⚠️ Remaining Tasks

### 1. Import Product Data (REQUIRED)

**Status:** Ingredients table is empty - no product prices available

**How to Fix:**

```bash
# Option A: Using Railway CLI (Recommended)
railway run npm run import-csv

# Option B: Locally (if you have Railway database credentials)
npm run import-csv
```

**Expected Output:**
```
🚀 Starting CSV import to Railway database...
📡 Connecting to database...
✅ Connected successfully!
🗑️  Clearing existing ingredients...
📄 Reading CSV file...
  📊 Imported 1000 products...
  📊 Imported 2000 products...
✅ Import completed!
   📦 Total imported: 5000+
🎉 Total records in database: 5000+
```

---

### 2. Set Environment Variables

**Required Variables:**

Go to Railway → Grocery_Guru → Variables → Add these:

| Variable | Purpose | Example |
|----------|---------|---------|
| `SESSION_SECRET` | Secure sessions | `your-random-64-char-string` |
| `NODE_ENV` | Environment | `production` |
| `EMAIL_USER` | Password reset emails | `your-email@gmail.com` |
| `EMAIL_PASS` | Email app password | `your-app-password` |

**Already Set (Automatically by Railway):**
- ✅ `MYSQLHOST`
- ✅ `MYSQLUSER`
- ✅ `MYSQLPASSWORD`
- ✅ `MYSQLDATABASE`
- ✅ `MYSQLPORT`

---

### 3. Generate SESSION_SECRET

```bash
# Run this to generate a secure random string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it as `SESSION_SECRET` in Railway variables.

---

### 4. Email Configuration (Optional - for password reset)

**Option A: Use Gmail**
1. Enable 2FA on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add `EMAIL_USER` and `EMAIL_PASS` to Railway variables

**Option B: Skip for now**
- Password reset won't work
- Everything else will work fine

---

## 🧪 Testing Your Deployment

### Test 1: Health Check
Visit: `https://groceryguru-production-9d37.up.railway.app/health`

**Expected:** `{"status":"ok","timestamp":"..."}`

### Test 2: Homepage
Visit: `https://groceryguru-production-9d37.up.railway.app/`

**Expected:** Your GroceryGuru homepage loads

### Test 3: User Signup
1. Go to signup page
2. Create a new account
3. Should redirect to homepage or show success

### Test 4: User Login
1. Go to login page
2. Use the account you just created
3. Should log in successfully

### Test 5: Recipe Search (After CSV Import)
1. Search for a recipe
2. View recipe details
3. Ingredient prices should show up

---

## 🚀 Deployment Commands

### Deploy Latest Changes
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Railway will automatically redeploy.

### Run Database Scripts
```bash
# Initialize database (creates tables)
railway run npm run init-db

# Import CSV data (adds products)
railway run npm run import-csv
```

---

## 📊 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| App Deployment | ✅ Working | None |
| Database Connection | ✅ Connected | None |
| Database Tables | ✅ Created | None |
| User Auth | ✅ Working | Test it |
| Product Data | ❌ Empty | Run `import-csv` |
| Session Secret | ⚠️ Default | Set custom value |
| Email Reset | ⚠️ Not configured | Optional |

---

## 🐛 Troubleshooting

### Signup fails with "Signup failed"
**Solution:** Visit `/setup-database` to create tables

### "Database connection failed"
**Solution:** Check that MySQL service is linked to Grocery_Guru

### Ingredient prices show "Not found"
**Solution:** Run `railway run npm run import-csv`

### Session expires immediately
**Solution:** Set `SESSION_SECRET` environment variable

---

## 📝 Next Steps (Priority Order)

1. **HIGH PRIORITY:** Import CSV data
   ```bash
   railway run npm run import-csv
   ```

2. **MEDIUM PRIORITY:** Set SESSION_SECRET
   ```bash
   # Generate secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Add to Railway variables
   ```

3. **LOW PRIORITY:** Configure email (optional)

4. **TEST:** Create an account and try using the app!

---

## ✅ You're Almost Done!

Your app is **95% ready**. The only critical missing piece is importing the product data.

**Run this command to complete the setup:**
```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Import the data
railway run npm run import-csv
```

🎉 **After that, your GroceryGuru app will be fully functional!**
