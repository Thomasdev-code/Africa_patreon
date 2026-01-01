# Password Reset Email Debugging Guide

## Issues Fixed

### 1. **Silent Error Swallowing** ❌ → ✅
**Problem**: Email sending errors were being caught and silently ignored, making it impossible to know why emails weren't being sent.

**Fix**: 
- Changed from `.catch()` to `try/catch` with proper error logging
- Added detailed error messages with specific error codes
- Added success logging when emails are sent

### 2. **Missing SMTP Validation** ❌ → ✅
**Problem**: If SMTP credentials weren't set, nodemailer would fail silently or with unclear errors.

**Fix**:
- Added validation to check if `SMTP_USER` and `SMTP_PASSWORD` are set
- Throws clear error message if credentials are missing
- Added SMTP connection verification

### 3. **Poor Error Messages** ❌ → ✅
**Problem**: Generic error messages didn't help identify the actual issue.

**Fix**:
- Added specific error handling for common SMTP errors:
  - `EAUTH` - Authentication failed
  - `ECONNECTION` - Connection failed
  - `ETIMEDOUT` - Connection timeout
- Added detailed logging with email address, error code, and message

## How to Debug

### Step 1: Check Environment Variables

Make sure these are set in your Vercel environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@africapatreon.com
NEXTAUTH_URL=https://yourdomain.com
```

### Step 2: Check Production Logs

After requesting a password reset, check your Vercel function logs for:

**Success case:**
```
✅ Email sent successfully: { messageId: '...', to: 'user@example.com', subject: '...' }
✅ Password reset email sent to: user@example.com
```

**Error cases:**
```
❌ Email sending error: { message: '...', code: 'EAUTH', ... }
❌ Failed to send password reset email: { email: '...', error: '...' }
```

### Step 3: Common Issues and Solutions

#### Issue: "SMTP authentication failed" (EAUTH)
**Cause**: Wrong username or password
**Solution**:
- For Gmail: Use an App Password, not your regular password
- Generate App Password: https://myaccount.google.com/apppasswords
- Make sure `SMTP_USER` is your full email address
- Make sure `SMTP_PASSWORD` is the App Password (16 characters, no spaces)

#### Issue: "Could not connect to SMTP server" (ECONNECTION)
**Cause**: Wrong host or port, or firewall blocking
**Solution**:
- Verify `SMTP_HOST` is correct:
  - Gmail: `smtp.gmail.com`
  - Outlook: `smtp-mail.outlook.com`
- Verify `SMTP_PORT` is correct:
  - 587 for STARTTLS (most common)
  - 465 for SSL
- Check if your hosting provider blocks SMTP ports

#### Issue: "SMTP connection timed out" (ETIMEDOUT)
**Cause**: Network issues or wrong port
**Solution**:
- Try different port (587 vs 465)
- Check if your hosting provider allows outbound SMTP connections
- Verify SMTP server is accessible

#### Issue: "SMTP credentials not configured"
**Cause**: Missing environment variables
**Solution**:
- Set `SMTP_USER` and `SMTP_PASSWORD` in Vercel
- Redeploy after adding environment variables

### Step 4: Test Email Sending

1. **Request password reset** from the forgot password page
2. **Check Vercel logs** immediately after
3. **Look for**:
   - ✅ Success message with messageId
   - ❌ Error message with specific error code

### Step 5: Verify Email Configuration

For Gmail specifically:
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Africa Patreon" as name
   - Copy the 16-character password
3. Use the App Password as `SMTP_PASSWORD`

## Development Mode

In development (`NODE_ENV=development`), if `SMTP_HOST` is not set:
- Emails are logged to console instead of being sent
- Look for: `📧 Email (Development Mode - NOT SENT):`
- This is intentional to prevent accidental emails during development

## Testing Checklist

- [ ] Environment variables are set in Vercel
- [ ] SMTP credentials are correct (especially App Password for Gmail)
- [ ] Checked Vercel logs after requesting reset
- [ ] No error messages in logs
- [ ] Success message appears in logs
- [ ] Email arrives in inbox (check spam folder too)

## Still Not Working?

1. **Check spam/junk folder** - Reset emails often go to spam
2. **Verify email address** - Make sure the email exists in your database
3. **Check token in database** - Verify token was created:
   ```sql
   SELECT * FROM "PasswordResetToken" WHERE email = 'user@example.com';
   ```
4. **Test SMTP manually** - Use a tool like `mailtrap.io` for testing
5. **Check Vercel function logs** - Look for the detailed error messages we added

## Alternative: Use Email Service Provider

If SMTP continues to be problematic, consider using:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **Resend** (free tier: 3,000 emails/month)
- **AWS SES** (very cheap, pay-as-you-go)

These services are more reliable than SMTP and provide better deliverability.

