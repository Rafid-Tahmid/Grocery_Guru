# Email Setup for Forgot Password Feature

## The Problem
The "Forgot Password" feature requires sending emails, but Railway doesn't have your email credentials configured.

## Quick Check
Visit your Railway app at: `https://your-app.railway.app/check-email-config`

This will show:
- ✅ EMAIL_USER is set
- ✅ EMAIL_PASS is set
- ❌ NOT SET (if missing)

## Solution: Set Up Gmail App Password in Railway

### Step 1: Generate Gmail App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** (left sidebar)
3. Enable **2-Step Verification** (if not already enabled)
4. After enabling 2FA, go back to **Security**
5. Click **App passwords** (under "2-Step Verification")
6. Select app: **Mail**
7. Select device: **Other (Custom name)** → Enter "GroceryGuru Railway"
8. Click **Generate**
9. **Copy the 16-character password** (remove spaces)

### Step 2: Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your **Grocery Guru** service
3. Go to the **Variables** tab
4. Click **+ New Variable**
5. Add these two variables:

```
EMAIL_USER = your-email@gmail.com
EMAIL_PASS = your16characterapppassword
```

**Important:**
- Use the **actual email address** (e.g., `rafid200220@gmail.com`)
- Use the **16-character app password** from Google (no spaces)
- Do NOT use your regular Gmail password

### Step 3: Redeploy

Railway will automatically redeploy when you add environment variables.

Or manually trigger deployment:
1. Go to **Deployments** tab
2. Click **Deploy** on the latest deployment
3. Or push a new commit to trigger deployment

### Step 4: Test Email

After deployment, test the email:

1. Visit: `https://your-app.railway.app/test-email-quick`
2. You should see: ✅ "Email Test SUCCESS!"
3. Check your inbox (and spam folder)

If successful, the forgot password feature will work!

## Alternative: Use Console Logging (For Testing)

If you don't want to set up email right now, the password reset URL is logged to Railway logs when someone requests a reset. You can:

1. User requests password reset
2. Check Railway logs: `railway logs`
3. Look for: `PASSWORD RESET URL (for testing):`
4. Copy the URL and send it to the user manually

This is already implemented in the code as a fallback!

## Troubleshooting

### "Invalid credentials" Error
- Double-check the app password (no spaces, exactly 16 characters)
- Make sure 2FA is enabled on your Google account
- Generate a new app password and try again

### "Timeout" Error
- Gmail might be blocking Railway's IP temporarily
- Try again in a few minutes
- Or use a different email service (SendGrid, Mailgun, etc.)

### Email Sent but Not Received
- Check spam/junk folder
- Make sure the email address is correct
- Check Railway logs for the actual email sent

## Environment Variables Format

```bash
# In Railway Dashboard → Variables tab
EMAIL_USER=rafid200220@gmail.com
EMAIL_PASS=abcdEFGH1234ijkl
```

**Do NOT** include quotes, spaces, or any other characters.

## Check If It's Working

### Method 1: Visit Debug Page
`https://your-app.railway.app/check-email-config`

Should show:
```
EMAIL_USER: rafid200220@gmail.com ✓
EMAIL_PASS: ✓ Set (16 characters)
```

### Method 2: Check Railway Logs
```bash
railway logs --follow
```

When someone tries to reset password, you'll see:
```
📧 Password reset requested for: user@email.com
👤 User found: 123 John
🔑 Reset token stored in database
📧 Attempting to send email to: user@email.com
✓ Using EMAIL_USER: Set ✓
✓ Using EMAIL_PASS: Set ✓
✅ Email sent successfully!
```

OR (if email config missing):
```
✗ Using EMAIL_USER: NOT SET ✗
✗ Using EMAIL_PASS: NOT SET ✗
📧 Email sending error: Invalid credentials
*********************
PASSWORD RESET URL (for testing):
https://your-app.railway.app/reset-password.html?token=abc123...
*********************
```

## Need Help?

1. Check Railway logs: `railway logs`
2. Visit: `/check-email-config` endpoint
3. Try: `/test-email-quick` endpoint

---

**Quick Summary:**
1. Enable 2FA on Google Account
2. Generate App Password
3. Add EMAIL_USER and EMAIL_PASS to Railway Variables
4. Redeploy
5. Test at `/test-email-quick`

