# Vercel Environment Variables Troubleshooting

## Current Issue

You're still seeing this error:
```
Missing required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
```

This means the environment variables are **not available** to your Vercel functions at runtime.

## Common Causes & Solutions

### 1. Variables Not Set in Vercel

**Check**: Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Solution**: Add all 7 variables:
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465`
- `SMTP_SECURE` = `true`
- `SMTP_USER` = `yourgmail@gmail.com`
- `SMTP_PASSWORD` = `your_app_password`
- `SMTP_FROM` = `yourgmail@gmail.com` (same as SMTP_USER)
- `NEXTAUTH_URL` = `https://africa-patreon.vercel.app`

### 2. Variables Set for Wrong Environment

**Problem**: Variables might be set for "Development" but not "Production"

**Solution**: 
1. Go to each variable in Vercel
2. Make sure **Production** is checked (and Preview/Development if needed)
3. Click "Save"

### 3. Not Redeployed After Adding Variables

**Problem**: Vercel needs a new deployment to pick up new environment variables

**Solution**:
1. After adding all variables, go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Test again

### 4. Variables Have Typos or Extra Spaces

**Problem**: Variable names must be exact (case-sensitive)

**Solution**:
- Check variable names are exactly: `SMTP_HOST`, `SMTP_PORT`, etc. (all caps)
- Check values don't have leading/trailing spaces
- For `SMTP_PASSWORD`, remove any spaces from Gmail App Password

### 5. Vercel Caching Issue

**Problem**: Sometimes Vercel caches old builds

**Solution**:
1. Go to **Deployments**
2. Click **Redeploy** on latest deployment
3. Or push a new commit to trigger fresh deployment

## Diagnostic Tool

I've created a debug endpoint to check which variables are available:

**URL**: `https://africa-patreon.vercel.app/api/debug/env-check`

**What it shows**:
- Which variables are present
- Which variables are missing
- Environment (Production/Preview/Development)

**How to use**:
1. Visit the URL in your browser
2. Check the JSON response
3. See which variables are missing

**Example response**:
```json
{
  "allPresent": false,
  "missing": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"],
  "status": {
    "SMTP_HOST": { "present": false },
    "SMTP_PORT": { "present": false },
    ...
  },
  "message": "❌ Missing: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD"
}
```

## Step-by-Step Fix

### Step 1: Verify Variables in Vercel
1. Go to: https://vercel.com/dashboard
2. Select: `africa-patreon` project
3. Go to: **Settings** → **Environment Variables**
4. **Check**: Do you see all 7 variables listed?

If **NO** → Add them (see VERCEL_ENV_SETUP.md)

If **YES** → Continue to Step 2

### Step 2: Check Environment Selection
1. Click on each variable
2. **Verify**: Is "Production" checked?
3. If not, check it and save

### Step 3: Check Variable Values
1. Click on each variable to view/edit
2. **Verify**:
   - `SMTP_HOST` = `smtp.gmail.com` (exact, no spaces)
   - `SMTP_PORT` = `465` (number, no quotes)
   - `SMTP_SECURE` = `true` (lowercase, no quotes)
   - `SMTP_USER` = Your Gmail address
   - `SMTP_PASSWORD` = 16-char App Password (no spaces)
   - `SMTP_FROM` = Same as SMTP_USER
   - `NEXTAUTH_URL` = Your production URL

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Wait for completion

### Step 5: Test
1. Visit: `https://africa-patreon.vercel.app/api/debug/env-check`
2. Check if all variables show `"present": true`
3. If yes, test password reset
4. If no, check which ones are missing and add them

## Quick Checklist

- [ ] All 7 variables added in Vercel
- [ ] Each variable has "Production" environment selected
- [ ] Variable names are exact (case-sensitive, no typos)
- [ ] Variable values are correct (no extra spaces)
- [ ] Redeployed after adding variables
- [ ] Checked `/api/debug/env-check` endpoint
- [ ] All variables show as present

## Still Not Working?

If you've done all the above and still see the error:

1. **Check the debug endpoint**: Visit `/api/debug/env-check` to see exactly which variables are missing

2. **Check Vercel logs**: 
   - Go to Vercel Dashboard → Your Project → Functions
   - Look for the environment variable check log:
   ```
   🔍 Environment variable check: { found: "3/7", missing: [...], ... }
   ```

3. **Try a fresh deployment**:
   - Make a small change (add a comment)
   - Commit and push
   - This forces a completely fresh build

4. **Contact Vercel Support** if variables are set but not accessible

## Security Note

The `/api/debug/env-check` endpoint shows which variables are present but **does not expose their values**. However, you may want to remove or secure this endpoint in production after debugging.

