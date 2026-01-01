# Vercel Environment Variables Setup Guide

## Issue
The error shows that SMTP environment variables are missing in Vercel:
```
Missing required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
```

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: `africa-patreon`
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Add All Required Variables

Add these **7 environment variables**:

#### 1. SMTP_HOST
- **Name**: `SMTP_HOST`
- **Value**: `smtp.gmail.com`
- **Environment**: Production, Preview, Development (select all)

#### 2. SMTP_PORT
- **Name**: `SMTP_PORT`
- **Value**: `465`
- **Environment**: Production, Preview, Development (select all)

#### 3. SMTP_SECURE
- **Name**: `SMTP_SECURE`
- **Value**: `true`
- **Environment**: Production, Preview, Development (select all)

#### 4. SMTP_USER
- **Name**: `SMTP_USER`
- **Value**: `yourgmail@gmail.com` (your actual Gmail address)
- **Environment**: Production, Preview, Development (select all)
- **Example**: `kariukithomas34@gmail.com`

#### 5. SMTP_PASSWORD
- **Name**: `SMTP_PASSWORD`
- **Value**: `your_16_char_app_password` (Gmail App Password - see below)
- **Environment**: Production, Preview, Development (select all)
- **Important**: This is NOT your regular Gmail password!

#### 6. SMTP_FROM
- **Name**: `SMTP_FROM`
- **Value**: `yourgmail@gmail.com` (MUST be the same as SMTP_USER)
- **Environment**: Production, Preview, Development (select all)
- **Example**: `kariukithomas34@gmail.com`
- **Critical**: Must match `SMTP_USER` exactly!

#### 7. NEXTAUTH_URL
- **Name**: `NEXTAUTH_URL`
- **Value**: `https://africa-patreon.vercel.app` (your production URL)
- **Environment**: Production, Preview, Development (select all)

### Step 3: Get Gmail App Password

**You cannot use your regular Gmail password!** You need an App Password:

1. **Enable 2-Step Verification** (if not already enabled):
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter name: "Africa Patreon"
   - Click "Generate"
   - **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - Remove spaces when pasting into Vercel: `abcdefghijklmnop`

### Step 4: Redeploy

After adding all variables:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### Step 5: Verify

After redeploying, test the password reset:
1. Go to `/forgot-password`
2. Enter your email
3. Check Vercel function logs
4. You should see: `✅ Email sent successfully` instead of the error

## Quick Checklist

- [ ] `SMTP_HOST` = `smtp.gmail.com`
- [ ] `SMTP_PORT` = `465`
- [ ] `SMTP_SECURE` = `true`
- [ ] `SMTP_USER` = Your Gmail address
- [ ] `SMTP_PASSWORD` = Gmail App Password (16 chars, no spaces)
- [ ] `SMTP_FROM` = Same as `SMTP_USER` (exact match!)
- [ ] `NEXTAUTH_URL` = Your production URL
- [ ] All variables set for Production environment
- [ ] Redeployed after adding variables

## Common Mistakes

### ❌ Wrong: Using Regular Gmail Password
```
SMTP_PASSWORD=myregularpassword123
```
**Error**: `EAUTH - Authentication failed`

### ✅ Correct: Using Gmail App Password
```
SMTP_PASSWORD=abcdefghijklmnop
```

### ❌ Wrong: SMTP_FROM Different from SMTP_USER
```
SMTP_USER=kariukithomas34@gmail.com
SMTP_FROM=noreply@africapatreon.com
```
**Error**: `SMTP_FROM must equal SMTP_USER`

### ✅ Correct: SMTP_FROM Matches SMTP_USER
```
SMTP_USER=kariukithomas34@gmail.com
SMTP_FROM=kariukithomas34@gmail.com
```

### ❌ Wrong: Wrong Port or Secure Setting
```
SMTP_PORT=587
SMTP_SECURE=false
```
**Issue**: May work but not optimal for Gmail

### ✅ Correct: Port 465 with Secure
```
SMTP_PORT=465
SMTP_SECURE=true
```

## Testing After Setup

1. **Request Password Reset**:
   - Go to `/forgot-password`
   - Enter: `kariukithomas34@gmail.com`
   - Submit

2. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Look for the `/api/auth/forgot-password` function
   - Check logs for:
     - ✅ `✅ Email sent successfully` (success)
     - ❌ `❌ Failed to send password reset email` (error)

3. **Check Email**:
   - Check inbox for `kariukithomas34@gmail.com`
   - Check spam/junk folder
   - Email subject: "Reset Your Password - Africa Patreon"

## Troubleshooting

### Still Getting "Missing required environment variables"
- **Check**: Are variables set for the correct environment (Production)?
- **Check**: Did you redeploy after adding variables?
- **Check**: Are variable names exactly as shown (case-sensitive)?

### Getting "SMTP authentication failed"
- **Check**: Are you using App Password (not regular password)?
- **Check**: Is 2-Step Verification enabled?
- **Check**: Did you remove spaces from App Password?

### Getting "SMTP_FROM must equal SMTP_USER"
- **Check**: Are both variables set to the same Gmail address?
- **Check**: No typos or extra spaces?

### Email Not Arriving
- **Check**: Spam/junk folder
- **Check**: Vercel logs show "Email sent successfully"
- **Check**: Email address is correct
- **Check**: Gmail account is active

## Support

If issues persist:
1. Share Vercel function logs (the full error)
2. Verify all 7 variables are set correctly
3. Confirm you're using Gmail App Password
4. Confirm `SMTP_FROM === SMTP_USER`

