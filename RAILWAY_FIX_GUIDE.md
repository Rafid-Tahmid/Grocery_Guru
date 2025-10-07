# Railway Login/Signup Fix Guide

## Problem
Login and signup were not working on Railway because the app was using **in-memory sessions**, which don't persist when the app restarts or when Railway scales to multiple instances.

## Solution
We've implemented a **MySQL-based session store** that persists sessions in your Railway MySQL database.

## What Changed

### 1. Added MySQL Session Store Package
- Added `express-mysql-session` to `package.json`
- This stores sessions in a MySQL table instead of memory

### 2. Updated Session Configuration
- Sessions now persist in MySQL database
- Cookie security settings optimized for Railway
- Auto-creates `sessions` table in database

### 3. Added Debug Endpoints
- `/api/session-check` - Check if sessions are working
- Enhanced logging in authentication routes

## Deployment Steps

### Step 1: Install New Dependencies
On Railway, this will happen automatically when you push. If testing locally:
```bash
npm install
```

### Step 2: Push to Railway
```bash
git add .
git commit -m "Fix login/signup with MySQL session store"
git push origin main
```

Railway will automatically:
1. Install the new `express-mysql-session` package
2. Create the `sessions` table in your MySQL database
3. Restart your app with the new configuration

### Step 3: Verify It Works

#### Test Sessions Endpoint
Visit: `https://your-app.railway.app/api/session-check`

You should see:
```json
{
  "hasSession": true,
  "sessionID": "some-session-id",
  "userId": "Not logged in",
  "cookie": { ... },
  "environment": {
    "isProduction": true
  }
}
```

#### Test Login/Signup
1. Go to your login page
2. Try signing up with a new account
3. Check Railway logs for:
   - `✅ Signup successful for user: ...`
   - `✅ Login successful! Session ID: ...`

#### Check Railway Logs
```bash
railway logs
```

Look for:
- ✅ Green checkmarks = success
- ❌ Red X marks = errors
- 🔐 Lock icons = authentication events

### Step 4: Verify Sessions Table
After first login, check that the `sessions` table was created:

1. Go to Railway dashboard
2. Open your MySQL service
3. Click "Data" tab
4. You should see a `sessions` table with entries

## Troubleshooting

### Issue: "Session save error"
**Cause**: Database connection issue
**Fix**: 
- Verify MySQL service is linked to your app in Railway
- Check environment variables are set (MYSQLHOST, MYSQLUSER, etc.)

### Issue: "Still can't login after deploy"
**Checks**:
1. Clear browser cookies and try again
2. Check Railway logs for error messages
3. Visit `/api/session-check` to verify session configuration
4. Ensure MySQL database is running (Railway dashboard)

### Issue: "Invalid credentials" but password is correct
**Cause**: User might not exist or email mismatch
**Fix**:
- Try signing up again
- Check if email matches exactly (case-sensitive)
- Check Railway logs to see if user was found in database

### Issue: Sessions still not persisting
**Checks**:
1. Verify `sessions` table exists in MySQL
2. Check Railway logs for MySQL connection errors
3. Ensure only ONE instance is running (Railway dashboard → Settings → Instances)

## Environment Variables (Railway)

Make sure these are set in Railway:

### MySQL (Auto-set when you add MySQL service)
- `MYSQLHOST` - MySQL hostname
- `MYSQLPORT` - MySQL port (usually 3306)
- `MYSQLUSER` - MySQL username
- `MYSQLPASSWORD` - MySQL password
- `MYSQLDATABASE` - Database name

### Optional (Recommended)
- `SESSION_SECRET` - Secret for session encryption (auto-generated if not set)
- `NODE_ENV` - Set to `production` for better security

## How It Works Now

1. **User logs in** → Credentials verified → Session created in MySQL
2. **Session stored** in MySQL `sessions` table with expiration time
3. **Cookie sent** to browser with session ID
4. **Future requests** → Cookie sent → Session retrieved from MySQL → User authenticated
5. **Session persists** even if app restarts or scales

## Benefits

✅ Sessions persist across app restarts
✅ Works with Railway's auto-scaling
✅ Session data stored securely in MySQL
✅ Better debugging with enhanced logging
✅ Auto-cleanup of expired sessions

## Testing Checklist

- [ ] Push code to Railway
- [ ] Wait for deployment to complete
- [ ] Visit `/api/session-check` and verify response
- [ ] Try signing up with new account
- [ ] Verify you see "Signup successful" message
- [ ] Try logging in with new account
- [ ] Verify you're redirected to home page
- [ ] Check Railway logs for ✅ success messages
- [ ] Verify `sessions` table exists in MySQL
- [ ] Test that you stay logged in after page refresh

## Need Help?

Check Railway logs:
```bash
railway logs --follow
```

Look for these indicators:
- 🔐 Authentication events
- ✅ Success messages
- ❌ Error messages with details
- 👤 User found/not found
- 🔑 Password verification

---

**Note**: The MySQL session store will automatically create the `sessions` table on first use. No manual database setup required!

