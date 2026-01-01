# Forgot Password Email Flow - Production Audit & Fix

## Summary

The forgot-password email flow has been audited and fixed for production use with Gmail SMTP (PORT 465, secure: true).

## Changes Made

### 1. Created Production Mailer (`lib/mailer.ts`)

**New file**: `lib/mailer.ts` - Production-ready email utility

**Features**:
- ✅ Validates all required environment variables at runtime
- ✅ Fails loudly with clear error messages if variables are missing
- ✅ Ensures `SMTP_FROM` equals `SMTP_USER` (Gmail requirement)
- ✅ Uses PORT 465 with `secure: true` (no STARTTLS hacks)
- ✅ No domain spoofing - sends from authenticated address
- ✅ Detailed server-side error logging
- ✅ Returns safe client messages

**Required Environment Variables**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourgmail@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM=yourgmail@gmail.com  # Must equal SMTP_USER
NEXTAUTH_URL=https://africa-patreon.vercel.app
```

### 2. Updated Forgot Password Route

**File**: `app/api/auth/forgot-password/route.ts`

**Changes**:
- ✅ Updated import to use `@/lib/mailer` instead of `@/lib/mail`
- ✅ Improved error logging with detailed SMTP error information
- ✅ Maintains security best practice (returns 200 even if email fails)
- ✅ Server-side logs show real error reasons

### 3. Validation & Error Handling

**Environment Variable Validation**:
- Checks all 7 required variables at runtime
- Throws clear error if any are missing
- Validates `SMTP_FROM === SMTP_USER` (Gmail requirement)
- Warns if PORT is not 465 or SECURE is not true

**Error Handling**:
- Logs detailed SMTP errors server-side (code, response, message)
- Returns safe client message (no sensitive info)
- API always returns 200 to prevent email enumeration
- Errors are logged with full context for debugging

## Implementation Details

### Mailer Configuration

```typescript
// Gmail SMTP Configuration
{
  host: process.env.SMTP_HOST,        // smtp.gmail.com
  port: 465,                           // Secure port
  secure: true,                        // SSL/TLS (no STARTTLS)
  auth: {
    user: process.env.SMTP_USER,       // Gmail address
    pass: process.env.SMTP_PASSWORD,  // App Password
  }
}
```

### Email Sending Flow

1. **Validate Environment Variables**
   - Checks all required vars exist
   - Validates `SMTP_FROM === SMTP_USER`
   - Warns about port/secure mismatches

2. **Create Transporter**
   - Creates nodemailer transporter with validated config
   - Logs configuration (without password)

3. **Send Email**
   - Uses `SMTP_FROM` as sender (must equal `SMTP_USER`)
   - Sends HTML and text versions
   - Logs success with messageId

4. **Error Handling**
   - Catches SMTP errors
   - Logs detailed error information server-side
   - Throws error with specific error codes (EAUTH, ECONNECTION, etc.)

### Forgot Password Route Flow

1. **Validate Email** - Uses Zod schema
2. **Check User Exists** - Queries database
3. **Generate Token** - Creates secure reset token
4. **Store Token** - Saves hashed token + expiry in DB
5. **Send Email** - Uses mailer utility
6. **Return Success** - Always returns 200 (security)

## Error Codes & Messages

### Server-Side Logs (Detailed)

```
❌ SMTP error (server-side): {
  message: "SMTP authentication failed",
  code: "EAUTH",
  command: "AUTH",
  response: "535-5.7.8 Username and Password not accepted",
  to: "user@example.com",
  subject: "Reset Your Password - Africa Patreon"
}
```

### Client Messages (Safe)

- Always: `"If an account with that email exists, we've sent a password reset link."`
- No sensitive information exposed
- Prevents email enumeration attacks

## Gmail Setup Requirements

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and device
   - Copy the 16-character password
   - Use as `SMTP_PASSWORD`

3. **Environment Variables**
   - Set all 7 required variables in Vercel
   - Ensure `SMTP_FROM` equals `SMTP_USER`
   - Use PORT 465 with `SMTP_SECURE=true`

## Testing Checklist

- [x] Environment variables validated at runtime
- [x] `SMTP_FROM === SMTP_USER` enforced
- [x] PORT 465 with secure: true
- [x] No STARTTLS hacks
- [x] No domain spoofing
- [x] Detailed server-side error logging
- [x] Safe client messages
- [x] Auth logic unchanged
- [x] NextAuth unchanged
- [x] Build compiles successfully

## Production Deployment

1. **Set Environment Variables in Vercel**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=yourgmail@gmail.com
   SMTP_PASSWORD=your_16_char_app_password
   SMTP_FROM=yourgmail@gmail.com
   NEXTAUTH_URL=https://africa-patreon.vercel.app
   ```

2. **Deploy** - The mailer will validate all variables on first use

3. **Test** - Request password reset and check:
   - Vercel function logs for success/error messages
   - Email arrives in inbox (check spam folder)

## Troubleshooting

### "Missing required environment variables"
- Check all 7 variables are set in Vercel
- Redeploy after adding variables

### "SMTP_FROM must equal SMTP_USER"
- Set `SMTP_FROM` to the same value as `SMTP_USER`
- Gmail requires sending from authenticated address

### "SMTP authentication failed" (EAUTH)
- Use Gmail App Password, not regular password
- Verify App Password is correct (16 characters)
- Check 2-Step Verification is enabled

### "Could not connect" (ECONNECTION)
- Verify `SMTP_HOST=smtp.gmail.com`
- Verify `SMTP_PORT=465`
- Check firewall/network allows outbound SMTP

## Files Modified

1. ✅ `lib/mailer.ts` - New production mailer utility
2. ✅ `app/api/auth/forgot-password/route.ts` - Updated to use new mailer

## Files NOT Modified

- ✅ Auth logic unchanged
- ✅ NextAuth configuration unchanged
- ✅ Signup logic unchanged
- ✅ Database schema unchanged

## Security Features

1. **Email Enumeration Prevention** - Always returns 200
2. **Token Hashing** - Tokens stored hashed in database
3. **Token Expiry** - 30-minute expiration
4. **Single Use** - Tokens deleted after use
5. **No Domain Spoofing** - Sends from authenticated address
6. **Secure Connection** - PORT 465 with SSL/TLS

## Next Steps

1. Deploy to production
2. Set all environment variables in Vercel
3. Test password reset flow
4. Monitor Vercel logs for email sending status
5. Verify emails arrive in inbox

