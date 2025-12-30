# Production-Safe NextAuth Credentials Authentication

## Overview
This application uses NextAuth v5 with Credentials provider for authentication. The implementation is production-ready and follows Next.js App Router best practices.

## Files Modified

### 1. `auth.ts`
- **Location**: Root directory
- **Changes**:
  - Wrapped `authorize()` in try/catch for error handling
  - Added credential validation (email format, type checking)
  - Normalizes email (lowercase, trim)
  - Queries Prisma safely with `select` (only needed fields)
  - Compares passwords with bcrypt
  - Returns plain object `{ id, email, name, role, isOnboarded, isBanned, isApproved }`
  - Returns `null` on any failure (never throws)
  - Added production logging with `[AUTH]` prefix
  - Callbacks are minimal and type-safe

### 2. `app/api/auth/[...nextauth]/route.ts`
- **Location**: `app/api/auth/[...nextauth]/route.ts`
- **Changes**:
  - Added `export const runtime = "nodejs"` to ensure Node.js runtime (not Edge)
  - Exports GET and POST handlers from NextAuth

### 3. `app/login/page.tsx`
- **Location**: `app/login/page.tsx`
- **Changes**:
  - Uses `signIn("credentials", { email, password, redirect: false })`
  - Handles success/error explicitly
  - No hanging state - always sets `loading` to false
  - Fetches session after login to determine redirect
  - Redirects based on user role and onboarding status

### 4. `middleware.ts`
- **Location**: `middleware.ts`
- **Changes**:
  - Removed custom JWT token checking
  - Uses NextAuth session only
  - Protects routes based on NextAuth session

## Environment Variables Required for Vercel

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

### Required:
1. **`NEXTAUTH_SECRET`** (or `AUTH_SECRET`)
   - A random secret string for encrypting JWT tokens
   - Generate with: `openssl rand -base64 32`
   - Example: `your-random-secret-key-here`

2. **`DATABASE_URL`**
   - PostgreSQL connection string
   - Must start with `postgresql://` or `postgres://`
   - Example: `postgresql://user:password@host:port/database?sslmode=require`

### Optional (for better security):
- **`NEXTAUTH_URL`**: Your production URL (e.g., `https://yourdomain.com`)

## Authentication Flow

1. User submits login form
2. Frontend calls `signIn("credentials", { email, password, redirect: false })`
3. NextAuth calls `authorize()` in `auth.ts`
4. `authorize()` validates credentials, queries Prisma, compares password
5. Returns user object or `null`
6. NextAuth creates JWT session
7. Frontend fetches session to determine redirect
8. User is redirected to appropriate dashboard

## Production Logging

All authentication events are logged with `[AUTH]` prefix:
- `[AUTH] Missing credentials`
- `[AUTH] Invalid credential types`
- `[AUTH] Invalid email format: <email>`
- `[AUTH] User not found: <email>`
- `[AUTH] Banned user attempted login: <email>`
- `[AUTH] Invalid password for user: <email>`
- `[AUTH] Authorization error: <error>`

## Security Features

1. **Password Hashing**: Uses bcrypt for password comparison
2. **Email Normalization**: Converts to lowercase and trims whitespace
3. **Input Validation**: Validates email format and credential types
4. **Error Handling**: Never exposes internal errors to client
5. **Banned User Check**: Prevents banned users from logging in
6. **Selective Field Query**: Only queries needed fields from database
7. **JWT Strategy**: Uses JWT for stateless sessions

## Custom JWT Login Route

The custom `/api/login` route (`app/api/login/route.ts`) is no longer used but kept for reference. It can be safely ignored or deleted if not needed elsewhere.

## Testing in Production

1. Ensure environment variables are set in Vercel
2. Deploy the application
3. Test login flow:
   - Valid credentials → Should redirect to dashboard
   - Invalid credentials → Should show error message
   - Banned user → Should show error (logged server-side)
4. Check Vercel logs for `[AUTH]` messages to debug issues

## Troubleshooting

### Login hangs on "Logging in..."
- Check browser console for errors
- Check Vercel logs for `[AUTH]` messages
- Verify `NEXTAUTH_SECRET` is set
- Verify `DATABASE_URL` is correct and accessible

### "Invalid email or password" always shows
- Check Vercel logs for specific `[AUTH]` error
- Verify user exists in database
- Verify password is correctly hashed with bcrypt
- Check email normalization (should be lowercase)

### Session not persisting
- Verify `NEXTAUTH_SECRET` is set
- Check browser cookies (should see `next-auth.session-token`)
- Verify middleware is not blocking session

