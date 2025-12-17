# Payouts & Subscription Renewals System

## Overview

Complete implementation of creator payouts, M-Pesa support, auto-renewing subscriptions, and 3D Secure payment flows.

## Database Schema Updates

### New Models

**PayoutRequest:**
- Tracks withdrawal requests from creators
- Supports M-Pesa, bank transfers, and Stripe connected accounts
- Admin approval workflow

**PaymentTransaction:**
- Detailed transaction logs for all payments
- Tracks renewals, refunds, and initial payments
- Provider-specific metadata storage

### Updated Models

**Subscription:**
- Added `nextBillingDate` for renewal scheduling
- Added `lastPaymentId` to track renewal payments
- Added `autoRenew` flag
- Added `expired` status

**Payment:**
- Added support for M-Pesa provider
- Links to PaymentTransaction records

## Features Implemented

### 1. Creator Payouts System

**API Routes:**
- `POST /api/payouts/request` - Request withdrawal
- `GET /api/payouts/my-payouts` - Get payout history and summary
- `POST /api/payouts/approve` - Admin approve/reject
- `POST /api/payouts/mark-paid` - Admin mark as paid

**UI Pages:**
- `/creator/earnings` - Full earnings dashboard with charts
- `/creator/withdraw` - Withdrawal request form
- Creator dashboard "Earnings" tab

**Features:**
- Balance calculation (earnings - withdrawn - pending)
- Multiple withdrawal methods (M-Pesa, Bank, Stripe)
- Admin approval workflow
- Payout history tracking

### 2. M-Pesa Payment Provider

**Implementation:**
- `lib/payments/mpesa.ts` - Full M-Pesa provider
- STK Push for payments
- OAuth token management
- Callback handling

**API Routes:**
- `POST /api/payments/mpesa/stk` - Initiate STK Push
- `POST /api/payments/mpesa/callback` - Handle M-Pesa callbacks

**Features:**
- Phone number validation and formatting
- Automatic provider selection for Kenya (KE)
- Secure webhook handling

### 3. Auto-Renewing Subscriptions

**Implementation:**
- `lib/subscriptions/renewal.ts` - Renewal processing logic
- `app/api/cron/renewals/route.ts` - Scheduled renewal job

**Features:**
- Automatic renewal processing
- Provider-specific renewal logic:
  - Stripe: Handled via webhooks (automatic)
  - Paystack: Charge authorization API
  - Flutterwave: Tokenized card charge
  - M-Pesa: Requires user confirmation (STK Push)
- Grace period for failed renewals (7 days)
- Automatic expiration after grace period

**Cron Setup:**
- Vercel: Configured in `vercel.json`
- Runs daily at midnight UTC
- Can be triggered manually via GET request

### 4. 3D Secure Support

**Stripe:**
- Enabled `automatic_payment_methods` in Payment Intents
- Full 3DS support via Stripe Checkout

**Paystack:**
- Pin + OTP + 3DS redirect flow enabled
- Callback handling for 3DS completion

**Flutterwave:**
- Charge → Validate → Verify flow
- 3DS redirect support

**UI:**
- `/subscription/verify/[provider]` - 3DS verification page
- Loading states and error handling

### 5. Unified Payment Layer

**File: `lib/payments/unified.ts`**

Functions:
- `processPayment()` - Unified payment processing
- `verifyPayment()` - Unified verification
- `refundPayment()` - Unified refunds (placeholder)

**Benefits:**
- Single interface for all providers
- Consistent error handling
- Automatic transaction logging

### 6. Earnings Metrics

**API: `GET /api/creator/earnings`**

Returns:
- Total lifetime earnings
- Total withdrawn
- Available balance
- Pending payout amount
- Earnings by tier
- Monthly revenue (12 months)
- Subscriber count and growth

**UI:**
- Full earnings dashboard with charts
- Summary cards in creator dashboard
- Payout history table

### 7. Admin Payout Management

**Features:**
- View all payout requests
- Approve/reject requests
- Mark as paid with transaction reference
- Filter by status
- View creator details

**API:**
- `GET /api/admin/payout-requests` - List all requests

## Environment Variables

```env
# M-Pesa
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
MPESA_ENVIRONMENT=sandbox # or "production"

# Cron
CRON_SECRET=your-random-secret
```

## Migration Steps

1. **Run Database Migration:**
   ```bash
   npx prisma migrate dev --name add_payouts_and_renewals
   npx prisma generate
   ```

2. **Set Up Cron Job:**
   - Vercel: Already configured in `vercel.json`
   - Other platforms: Set up daily cron to call `/api/cron/renewals`
   - Add `CRON_SECRET` to environment variables

3. **Configure M-Pesa:**
   - Get credentials from Safaricom Developer Portal
   - Set up callback URL in M-Pesa dashboard
   - Test with sandbox environment first

## Testing

### M-Pesa Testing
- Use test phone numbers from Safaricom
- Test STK Push flow
- Verify callback handling

### Renewal Testing
- Manually trigger: `GET /api/cron/renewals?authorization=Bearer YOUR_CRON_SECRET`
- Check subscription `nextBillingDate`
- Verify renewal payment creation

### Payout Testing
1. Create test earnings (via payments)
2. Request withdrawal
3. Admin approve
4. Mark as paid
5. Verify balance updates

## Security

- All payout routes require authentication
- Admin routes require admin role
- M-Pesa callbacks verified (signature validation)
- Balance calculations use Prisma transactions
- Idempotency checks on all payment operations

## Next Steps

1. **Production Deployment:**
   - Set up production M-Pesa credentials
   - Configure cron job
   - Test all payment flows

2. **Enhancements:**
   - Automated payout processing (bank API integration)
   - Email notifications for payout status
   - Payout limits and thresholds
   - Tax reporting

3. **Monitoring:**
   - Set up alerts for failed renewals
   - Monitor payout request queue
   - Track payment success rates

