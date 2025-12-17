# Africa Patreon - SaaS Platform

A complete, production-ready Patreon-style platform for African creators, built with Next.js 16, TypeScript, Prisma, PostgreSQL, and NextAuth.

## 🚀 Features

- **Authentication & Authorization**: Role-based access (Fan, Creator, Admin)
- **Creator Profiles**: Customizable profiles with tiers and media
- **Subscriptions & Payments**: Integration with Flutterwave/Paystack
- **Paid Content**: Posts with media uploads (images, video, audio)
- **Notifications**: Real-time alerts for new content and subscriptions
- **Messaging**: Private DMs between fans and creators
- **Comments**: Threaded comments on posts
- **Analytics**: Revenue and subscriber analytics for creators
- **Referrals**: Referral system with rewards and credits
- **Admin Panel**: Complete admin dashboard for platform management

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or SQLite for development)
- Git

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd Africa_patreon
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/africapatreon?schema=public"
# For SQLite (dev): DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Payment Providers
PAYMENT_PROVIDER="flutterwave" # or "paystack" or "stripe" or "mpesa"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
FLUTTERWAVE_PUBLIC_KEY="your-public-key"
FLUTTERWAVE_SECRET_KEY="your-secret-key"
FLUTTERWAVE_WEBHOOK_SECRET="your-webhook-secret"
PAYSTACK_PUBLIC_KEY="your-public-key"
PAYSTACK_SECRET_KEY="your-secret-key"
# M-Pesa (Kenya)
MPESA_CONSUMER_KEY="your-consumer-key"
MPESA_CONSUMER_SECRET="your-consumer-secret"
MPESA_SHORTCODE="your-shortcode"
MPESA_PASSKEY="your-passkey"
MPESA_CALLBACK_URL="https://yourdomain.com/api/payments/mpesa/callback"
MPESA_ENVIRONMENT="sandbox" # or "production"

# Storage (for media uploads)
STORAGE_TYPE="local" # or "s3" or "cloudinary"
# For S3:
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_NAME="your-bucket"
S3_REGION="us-east-1"
# For Cloudinary:
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# App URL (for referral links and payment callbacks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron Secret (for scheduled jobs)
CRON_SECRET="your-random-secret-key"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# If you need to add new fields (isBanned, isApproved), create a new migration:
npx prisma migrate dev --name add_user_status_fields

# Seed database with sample data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 Test Accounts

After running the seed script, you can use these test accounts:

- **Admin**: `admin@africapatreon.com` / `admin123`
- **Creator 1**: `creator1@example.com` / `creator123`
- **Creator 2**: `creator2@example.com` / `creator123`
- **Fan 1**: `fan1@example.com` / `fan123`
- **Fan 2**: `fan2@example.com` / `fan123`

## 📁 Project Structure

```
/app
  /api              # API routes
  /admin            # Admin panel
  /creator          # Creator pages
  /dashboard        # Fan dashboard
  /messages         # Messaging
  /notifications    # Notifications
  /r                # Referral links
  /signup           # Signup page
  /login            # Login page
  page.tsx           # Landing page
  layout.tsx         # Root layout

/components         # Reusable React components
/lib               # Utilities, Prisma client, helpers
/prisma            # Prisma schema and migrations
/scripts           # Seed and utility scripts
/public            # Static assets
```

## 🔐 Role-Based Access

- **Fan**: Can subscribe to creators, view unlocked content, comment, message
- **Creator**: Can create profiles, manage tiers, create posts, view analytics
- **Admin**: Full platform access, user management, analytics

**Important**: Admin role cannot be selected at signup. Admins must be created via seed script or database directly.

## 💳 Payment Integration

### Webhook Setup

To receive payment confirmations from payment providers, you need to configure webhooks:

1. **Paystack Webhook**:
   - Go to your Paystack Dashboard → Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/subscribe/webhook?provider=paystack`
   - Select events: `charge.success`, `charge.failed`
   - Copy the webhook secret and add to `.env`: `PAYSTACK_WEBHOOK_SECRET=your-secret`

2. **Flutterwave Webhook**:
   - Go to your Flutterwave Dashboard → Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/subscribe/webhook?provider=flutterwave`
   - Select events: `charge.completed`
   - Copy the webhook secret and add to `.env`: `FLUTTERWAVE_WEBHOOK_SECRET=your-secret`

3. **Stripe Webhook**:
   - Go to your Stripe Dashboard → Developers → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/subscribe/webhook?provider=stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the webhook signing secret and add to `.env`: `STRIPE_WEBHOOK_SECRET=your-secret`

**For Local Development (using ngrok)**:
```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js dev server
npm run dev

# In another terminal, expose localhost:3000
ngrok http 3000

# Use the ngrok URL (e.g., https://abc123.ngrok.io) in your payment provider webhook settings
# Webhook URL: https://abc123.ngrok.io/api/subscribe/webhook?provider=paystack
```

## 💳 Payment Integration

### Flutterwave (Sandbox)

1. Sign up at [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Get your public and secret keys from the dashboard
3. Use test cards for sandbox testing

### Paystack (Test Mode)

1. Sign up at [Paystack Dashboard](https://dashboard.paystack.com)
2. Get your test keys from the dashboard
3. Use test cards for testing

### Webhook Testing

For local webhook testing, use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Update your payment provider webhook URL to: `https://your-ngrok-url.ngrok.io/api/subscribe/callback`

## 📦 Media Storage

### Local Storage (Development)

Media files are stored in `/public/uploads/` directory. Make sure this directory exists and is writable.

### S3 (Production)

1. Create an S3 bucket
2. Set up IAM user with S3 access
3. Configure CORS for your domain
4. Add credentials to `.env`

### Cloudinary (Production)

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your cloud name, API key, and secret
3. Add credentials to `.env`

## 🧪 Testing

Run tests:

```bash
npm test
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## 🔧 Manual Configuration Steps

### Creating Admin Users

Admins are created via the seed script. To create additional admins:

1. Run the seed script and modify it, OR
2. Use Prisma Studio: `npm run db:studio`
3. Create a user with `role: "admin"`

### Payment Webhooks

1. Set up ngrok for local testing
2. Configure webhook URL in payment provider dashboard
3. Update `NEXTAUTH_URL` if using custom domain

### Storage Configuration

1. For production, set up S3 or Cloudinary account
2. Update `STORAGE_TYPE` in `.env`
3. Add corresponding credentials
4. Test media uploads

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database permissions

### Authentication Issues

- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies if session issues persist

### Media Upload Issues

- Check storage configuration in `.env`
- Verify upload directory permissions (for local storage)
- Check S3/Cloudinary credentials (for cloud storage)

## 📚 API Documentation

### Authentication
- `POST /api/signup` - Create new user (fan or creator)
- `POST /api/login` - Login user

### Creator APIs
- `GET /api/creator/me` - Get creator profile
- `POST /api/creator/profile` - Create/update profile
- `GET /api/creator/profile/:username` - Get public profile
- `POST /api/creator/posts` - Create post
- `GET /api/creator/analytics/*` - Analytics endpoints

### Fan APIs
- `GET /api/fan/subscriptions` - Get user subscriptions
- `GET /api/fan/posts/:creatorId` - Get posts for creator
- `GET /api/fan/feed` - Get unlocked content feed

### Admin APIs
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List all users

See individual API route files for detailed documentation.

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

1. Build: `npm run build`
2. Set environment variables
3. Run: `npm start`
4. Ensure PostgreSQL database is accessible

## 📄 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

## 📧 Support

[Support Contact Information]

---

**Built with ❤️ for African Creators**
