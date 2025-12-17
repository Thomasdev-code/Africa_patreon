# Multi-Provider Payment System Documentation

## Overview

This document describes the professional multi-provider payment system implemented for Africa Patreon SaaS platform. The system supports Stripe, Paystack, and Flutterwave with automatic provider selection based on user location.

## Architecture

### Folder Structure

```
lib/payments/
├── index.ts          # Provider factory and exports
├── types.ts          # TypeScript interfaces and types
├── router.ts          # Provider selection and currency conversion
├── stripe.ts          # Stripe implementation
├── paystack.ts        # Paystack implementation
└── flutterwave.ts     # Flutterwave implementation

app/api/payments/
├── create/route.ts                    # Payment initialization
├── webhooks/
│   ├── stripe/route.ts               # Stripe webhook handler
│   ├── paystack/route.ts             # Paystack webhook handler
│   └── flutterwave/route.ts          # Flutterwave webhook handler

app/api/subscriptions/
└── validate/route.ts                  # Subscription validation

app/payment/
├── success/page.tsx                   # Payment success page
└── failed/page.tsx                    # Payment failed page

app/creator/[username]/
└── subscribe/page.tsx                 # Subscribe page
```

## Database Schema

### Payment Model

```prisma
model Payment {
  id               String        @id @default(cuid())
  userId           String
  creatorId        String
  subscriptionId   String?       @unique
  tierName         String
  tierPrice        Float
  provider         String        // 'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE'
  reference        String        @unique
  amount           Int           // Amount in cents
  currency         String        @default("USD")
  status           String        @default("pending")
  metadata         Json?
  webhookReceived  Boolean       @default(false)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  user             User          @relation("UserPayments")
  creator          User          @relation("CreatorPayments")
  subscription     Subscription?
}
```

### Updated Subscription Model

```prisma
model Subscription {
  // ... existing fields
  paymentId        String?       // Link to Payment
  payment          Payment?      @relation
}
```

## Payment Flow

1. **User Initiates Subscription**
   - Fan clicks "Subscribe" on creator page
   - Frontend calls `/api/payments/create`
   - System auto-selects provider based on country
   - Creates Payment and Subscription records (pending)

2. **Payment Provider Redirect**
   - User redirected to provider's payment page
   - User completes payment

3. **Webhook Processing**
   - Provider sends webhook to `/api/payments/webhooks/{provider}`
   - System verifies webhook signature
   - Updates Payment status
   - Activates Subscription if payment successful
   - Sends notifications
   - Awards referral credits if applicable

4. **User Redirect**
   - User redirected to `/payment/success` or `/payment/failed`
   - Subscription is now active and content is unlocked

## Provider Selection Logic

```typescript
if country == "NG" → Paystack
else if country in ["GH", "ZA"] → Paystack
else if country in Africa → Flutterwave
else → Stripe
```

## API Endpoints

### Payment Creation

**POST** `/api/payments/create`

Request:
```json
{
  "creatorId": "string",
  "tierName": "string",
  "provider": "STRIPE" | "PAYSTACK" | "FLUTTERWAVE" (optional),
  "country": "string" (optional)
}
```

Response:
```json
{
  "success": true,
  "paymentId": "string",
  "subscriptionId": "string",
  "provider": "STRIPE",
  "reference": "string",
  "redirectUrl": "string"
}
```

### Webhook Endpoints

- **POST** `/api/payments/webhooks/stripe`
- **POST** `/api/payments/webhooks/paystack`
- **POST** `/api/payments/webhooks/flutterwave`

All webhooks verify signatures and process payment status updates.

### Subscription Validation

**GET** `/api/subscriptions/validate?creatorId=xxx&tierName=xxx`

Returns:
```json
{
  "hasAccess": true,
  "subscription": {
    "id": "string",
    "tierName": "string",
    "startDate": "datetime",
    "endDate": "datetime"
  }
}
```

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
FLUTTERWAVE_WEBHOOK_SECRET=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Features

1. **Webhook Signature Verification**
   - Stripe: Uses `stripe-signature` header
   - Paystack: Uses `x-paystack-signature` header
   - Flutterwave: Uses `verif-hash` header

2. **Duplicate Prevention**
   - Checks for existing active subscriptions before creating new payment
   - Prevents double activation of subscriptions
   - Webhook idempotency checks

3. **Input Validation**
   - Validates creator and tier existence
   - Validates user permissions
   - Sanitizes provider callbacks

## Testing

### Local Development with ngrok

```bash
# Start dev server
npm run dev

# In another terminal, expose localhost:3000
ngrok http 3000

# Use ngrok URL in payment provider webhook settings
# Example: https://abc123.ngrok.io/api/payments/webhooks/stripe
```

### Test Cards

**Stripe:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

**Paystack:**
- Success: `4084084084084081`
- Decline: `5060666666666666666`

**Flutterwave:**
- Success: `5531886652142950`
- Decline: `5567350000000000`

## Migration Steps

1. **Update Database Schema**
   ```bash
   npx prisma migrate dev --name add_payment_model
   npx prisma generate
   ```

2. **Install Dependencies**
   ```bash
   npm install stripe
   ```

3. **Configure Environment Variables**
   - Add all provider keys to `.env`
   - Set `NEXT_PUBLIC_APP_URL`

4. **Configure Webhooks**
   - Set up webhook URLs in each provider dashboard
   - Copy webhook secrets to `.env`

5. **Test Payment Flow**
   - Test each provider
   - Verify webhook delivery
   - Check subscription activation

## Admin Features

- View all payments in admin dashboard
- Filter by provider, status, date
- View payment totals by provider
- Track payment history

## Creator Features

- View earnings from all providers
- See payment history
- Track revenue by tier
- Analytics with provider breakdown

## Error Handling

- Payment creation errors return user-friendly messages
- Webhook errors are logged but don't break the flow
- Failed payments automatically cancel subscriptions
- Retry logic for webhook processing

## Future Enhancements

- Payment method management
- Subscription cancellation flow
- Refund processing
- Payout automation
- Multi-currency support
- Payment retry logic

