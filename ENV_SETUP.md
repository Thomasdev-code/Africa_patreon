# Environment Variables Setup

## Required Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/africa_patreon?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# Payment Providers (at least one required)

# Flutterwave (Recommended for Africa)
FLUTTERWAVE_PUBLIC_KEY="your-flutterwave-public-key"
FLUTTERWAVE_SECRET_KEY="your-flutterwave-secret-key"

# Paystack (Alternative for Africa)
PAYSTACK_SECRET_KEY="your-paystack-secret-key"

# Stripe (For global payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
```

## Payment Provider Setup

### Flutterwave
1. Sign up at https://flutterwave.com
2. Get your API keys from the dashboard
3. Use test keys for development

### Paystack
1. Sign up at https://paystack.com
2. Get your secret key from the dashboard
3. Use test keys for development

### Stripe
1. Sign up at https://stripe.com
2. Get your secret key from the dashboard
3. Use test keys for development

## Notes

- At least one payment provider must be configured
- Default payment provider is Flutterwave
- All providers support test/sandbox mode for development
- Never commit `.env` file to version control

