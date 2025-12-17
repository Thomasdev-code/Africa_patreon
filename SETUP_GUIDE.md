# Africa Patreon - Complete Setup Guide

## 🎯 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your values (minimum: DATABASE_URL, NEXTAUTH_SECRET)
```

### 3. Setup Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## 📋 Complete Feature Checklist

### ✅ Authentication & Authorization
- [x] NextAuth v5 with credentials provider
- [x] Role-based access (fan, creator, admin)
- [x] Protected routes via middleware
- [x] Admin role NOT selectable at signup
- [x] JWT sessions with role + isOnboarded

### ✅ Creator System
- [x] Creator onboarding flow
- [x] Profile creation (username, bio, avatar, banner)
- [x] Tier management (name, price, description)
- [x] Creator dashboard
- [x] Public creator pages

### ✅ Subscriptions & Payments
- [x] Subscription model and APIs
- [x] Flutterwave integration (sandbox)
- [x] Paystack integration (sandbox)
- [x] Payment verification and webhooks
- [x] Subscription lifecycle management

### ✅ Content & Media
- [x] Post CRUD (create, read, update, delete)
- [x] Media upload (images, video, audio)
- [x] Storage abstraction (local/S3/Cloudinary)
- [x] Locked content by tier
- [x] Post unlock tracking

### ✅ Notifications
- [x] Notification model (comment, reply, message, subscription, post)
- [x] Auto-trigger on events
- [x] Notification center
- [x] Mark as read functionality

### ✅ Messaging
- [x] Private DMs (fan ↔ creator)
- [x] Message history
- [x] Unread counts
- [x] Media attachments in messages

### ✅ Comments
- [x] Comments on posts
- [x] Threaded replies (1-level)
- [x] Role badges
- [x] Auto-refresh

### ✅ Analytics
- [x] Subscriber analytics
- [x] Revenue analytics
- [x] Unlock statistics
- [x] Charts and visualizations

### ✅ Referrals
- [x] Auto-generated referral codes
- [x] Referral link tracking
- [x] Credit system
- [x] Referral dashboard

### ✅ Admin Panel
- [x] Admin dashboard
- [x] User management
- [x] Platform statistics
- [x] Admin-only routes

## 🔐 Test Accounts (After Seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@africapatreon.com | admin123 |
| Creator 1 | creator1@example.com | creator123 |
| Creator 2 | creator2@example.com | creator123 |
| Fan 1 | fan1@example.com | fan123 |
| Fan 2 | fan2@example.com | fan123 |

## 🧪 Testing Flows

### Creator Flow
1. Sign up as creator → `/creator/onboarding`
2. Complete profile (username, bio, tiers)
3. Go to dashboard → Create post with media
4. View analytics → Check subscriber stats
5. View referrals → Share referral link

### Fan Flow
1. Sign up as fan → `/dashboard`
2. Browse creators → Visit `/creator/[username]`
3. Subscribe to creator → Complete payment (sandbox)
4. View unlocked content → See posts
5. Comment on posts → Engage with content
6. Message creator → Send DM
7. Check notifications → See alerts

### Admin Flow
1. Login as admin → `/admin`
2. View platform stats
3. Browse users
4. Monitor subscriptions

## 🔧 Manual Configuration Required

### Payment Providers

**Flutterwave:**
1. Sign up: https://dashboard.flutterwave.com
2. Get test keys from dashboard
3. Add to `.env`:
   ```
   PAYMENT_PROVIDER=flutterwave
   FLUTTERWAVE_PUBLIC_KEY=your-key
   FLUTTERWAVE_SECRET_KEY=your-secret
   ```

**Paystack:**
1. Sign up: https://dashboard.paystack.com
2. Get test keys from dashboard
3. Add to `.env`:
   ```
   PAYMENT_PROVIDER=paystack
   PAYSTACK_PUBLIC_KEY=your-key
   PAYSTACK_SECRET_KEY=your-secret
   ```

### Storage (Production)

**S3:**
1. Create AWS S3 bucket
2. Create IAM user with S3 permissions
3. Add to `.env`:
   ```
   STORAGE_TYPE=s3
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   S3_BUCKET_NAME=your-bucket
   S3_REGION=us-east-1
   ```

**Cloudinary:**
1. Sign up: https://cloudinary.com
2. Get credentials from dashboard
3. Add to `.env`:
   ```
   STORAGE_TYPE=cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud
   CLOUDINARY_API_KEY=your-key
   CLOUDINARY_API_SECRET=your-secret
   ```

### Webhooks (Local Testing)

1. Install ngrok: https://ngrok.com
2. Run: `ngrok http 3000`
3. Copy ngrok URL
4. Update payment provider webhook URL:
   - Flutterwave: `https://your-ngrok-url.ngrok.io/api/subscribe/callback`
   - Paystack: `https://your-ngrok-url.ngrok.io/api/subscribe/callback`

## 📁 Key Files & Locations

- **Auth Config**: `auth.ts`
- **Middleware**: `middleware.ts`
- **Prisma Schema**: `prisma/schema.prisma`
- **Seed Script**: `prisma/seed.ts`
- **API Routes**: `app/api/`
- **Components**: `components/`
- **Utilities**: `lib/`

## 🚨 Common Issues & Solutions

### Database Connection
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- For SQLite: Use `file:./dev.db`

### Authentication Errors
- Generate new `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Clear browser cookies
- Check `NEXTAUTH_URL` matches your domain

### Media Upload Fails
- For local: Create `public/uploads/` directory
- Check file permissions
- Verify storage credentials in `.env`

### Payment Webhooks Not Working
- Use ngrok for local testing
- Verify webhook URL in provider dashboard
- Check webhook signature verification

## 📊 Database Schema Overview

- **User**: Core user accounts (fan/creator/admin)
- **CreatorProfile**: Creator-specific data
- **Subscription**: Fan-creator subscriptions
- **Post**: Content posts with media
- **PostUnlock**: Track content unlocks
- **Notification**: User notifications
- **Message**: Private messages
- **Comment**: Post comments
- **Referral**: Referral tracking
- **ReferralCredit**: Reward credits

## 🎨 Styling

- Tailwind CSS for all styling
- Responsive design (mobile-first)
- Custom components in `components/`
- Consistent color scheme (blue/green/purple)

## 🔄 Next Steps

1. **Customize Branding**: Update colors, logos, text
2. **Add Email Service**: Integrate SendGrid/AWS SES
3. **Add Real-time**: Integrate Pusher for live updates
4. **Add Search**: Implement creator/content search
5. **Add Reviews**: Creator ratings and reviews
6. **Add Payouts**: Creator withdrawal system
7. **Add Moderation**: Content moderation tools

## 📞 Support

For issues or questions, check:
- README.md for general info
- API route files for endpoint docs
- Component files for UI usage

---

**Ready to launch! 🚀**

