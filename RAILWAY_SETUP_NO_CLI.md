# 🚂 Railway Setup Without CLI

## Method 1: Use Railway's Database Query Console (Recommended ✅)

This is the **easiest way** - no CLI needed!

### Step 1: Open Your MySQL Service

1. Go to your Railway dashboard
2. Click on your **MySQL_DATABASE** service (the one showing the MySQL icon)
3. Click on the **"Query"** tab at the top

### Step 2: Copy the SQL Setup File

1. Open the file **`railway-setup.sql`** in this folder
2. **Select ALL the content** (Cmd+A / Ctrl+A)
3. **Copy it** (Cmd+C / Ctrl+C)

### Step 3: Run the Setup

1. **Paste** the SQL into Railway's Query console
2. Click the **"Run"** button (or press Cmd+Enter)
3. You should see: "Query executed successfully"
4. At the bottom, you'll see a list of all created tables

### Step 4: Verify Tables Were Created

You should see 6 tables listed:
- ✅ users
- ✅ saved_recipes
- ✅ recipe_ingredients
- ✅ ingredients
- ✅ meal_plan
- ✅ reset_tokens

### Step 5: Done! 🎉

Your database is now ready! Go check your Grocery_Guru app URL.

---

## Method 2: Use TablePlus or MySQL Workbench

If you prefer a desktop database client:

### Step 1: Get Connection Details

From your Railway MySQL service, copy:
- Host: `containers-us-west-xxx.railway.app`
- Port: `12216` (from MYSQL_PUBLIC_URL)
- Username: `root`
- Password: `eBcOHwdXomkahLYqBRsEBXyKqdn!mwMk`
- Database: `railway`

### Step 2: Connect

1. Download **TablePlus** (free): https://tableplus.com
   OR **MySQL Workbench**: https://dev.mysql.com/downloads/workbench/

2. Create a new connection with the details above

3. Click "Connect"

### Step 3: Run the SQL

1. Open **`railway-setup.sql`**
2. Copy all the content
3. Paste into your database client's query window
4. Execute the query

---

## Method 3: Direct MySQL Command (If You Have MySQL Installed)

If you have MySQL client installed on your computer:

```bash
# Connect to Railway MySQL
mysql -h containers-us-west-xxx.railway.app \
      -P 12216 \
      -u root \
      -peBcOHwdXomkahLYqBRsEBXyKqdn!mwMk \
      railway < railway-setup.sql
```

Replace the host and port with your actual values from `MYSQL_PUBLIC_URL`.

---

## 🔍 How to Check if Database is Set Up

### Option A: Railway Query Console
Run this query in Railway's Query tab:
```sql
SHOW TABLES;
```

You should see 6 tables.

### Option B: Check Your App
1. Go to your Grocery_Guru deployment URL
2. Click on "Deployments" tab
3. Click the latest deployment
4. Check the logs

You should see:
```
Connected to MySQL database
Server started successfully
```

---

## 🚨 Troubleshooting

### "Table already exists" error
✅ This is fine! It means the table is already created. Ignore the error.

### "Foreign key constraint fails"
❌ Run the queries in order (users table must be created first)

### "Access denied"
❌ Check your MySQL password is correct

### Can't find the Query tab
- Make sure you clicked on the **MySQL service**, not the Grocery_Guru service
- Look for tabs: Overview, Metrics, **Query**, Variables, Settings

---

## ✅ After Database Setup

Once your database is set up:

1. **Check your app deployment**
   - Go to Grocery_Guru service → Deployments
   - Latest deployment should show "Success"

2. **Visit your app URL**
   - Click on your Grocery_Guru service
   - Click "Settings" → you'll see a public URL
   - Open that URL in your browser

3. **Test registration**
   - Try creating a new account
   - If registration works, your database is connected! 🎉

---

## 📞 Still Having Issues?

If the database setup doesn't work:

1. **Share the error message** you see
2. **Check Railway logs**:
   - Grocery_Guru service → Deployments → Click latest → View logs
3. **Verify environment variables**:
   - Grocery_Guru service → Variables
   - Make sure all 7 variables are set (see RAILWAY_ENV_VARIABLES.txt)

---

## 🎯 Quick Summary

**Easiest Method:**
1. Open Railway → MySQL service → Query tab
2. Copy content from `railway-setup.sql`
3. Paste and click "Run"
4. Done! ✅

**That's it!** No CLI, no npm, no complicated setup. Just copy-paste SQL! 🚀
