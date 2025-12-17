# Multi-Provider Mobile Payment Infrastructure

## Overview

Complete upgrade of the payment system to support global + African mobile payments using Stripe, Paystack, and Flutterwave SDKs. **All Daraja API code has been removed** and replaced with Flutterwave/Paystack Mobile Money APIs.

## Architecture

### Payment Providers

#### `/lib/payments/stripe.ts`
- Full Stripe SDK implementation
- Methods: `initializePayment()`, `verifyPayment()`, `createSubscription()`, `cancelSubscription()`, `refundPayment()`, `createPayout()`
- Supports: Cards, 3D Secure, Subscriptions, Refunds, Stripe Connect

#### `/lib/payments/flutterwave.ts`
- Flutterwave SDK implementation
- Methods: `initializePayment()`, `verifyPayment()`, `createMpesaPayment()`, `checkMpesaStatus()`, `createPayout()`
- Supports: Cards, Bank Transfer, Mobile Money, M-Pesa via `mobile_money_mpesa`

#### `/lib/payments/paystack.ts`
- Paystack SDK implementation
- Methods: `initializePayment()`, `verifyPayment()`, `createMpesaPayment()`, `checkMpesaStatus()`, `createPayout()`
- Supports: Cards, Bank Transfer, Mobile Money, M-Pesa via `mpesa` channel

#### `/lib/payments/mpesa.ts`
- **Unified M-Pesa wrapper** (NO Daraja)
- Uses Flutterwave as primary, Paystack as fallback
- Methods: `sendMpesaStkPush()`, `verifyMpesaTransaction()`, `isValidMpesaNumber()`
- Automatically formats phone numbers to Kenya format (254XXXXXXXXX)

#### `/lib/payments/payment-utils.ts`
- Common utilities: `generatePaymentReference()`, `toSmallestUnit()`, `fromSmallestUnit()`, `formatCurrency()`, `validateAmount()`, `retryWithBackoff()`

### Subscription Management

#### `/lib/payments/subscription-manager.ts`
- **`createSubscription()`**: Create new subscription
- **`renewSubscription()`**: Auto-renew subscriptions
- **`retryFailedPayment()`**: Dunning system with exponential backoff
- **`cancelSubscription()`**: Cancel with provider
- **`processExpiredSubscriptions()`**: Handle expired subscriptions
- **`handleChargeback()`**: Process chargebacks

### Fraud Prevention

#### `/lib/payments/fraud.ts`
- **`checkPaymentVelocity()`**: Too many payments in short time
- **`detectDuplicatePayment()`**: Duplicate payment detection
- **`verifyCardBinCountry()`**: Card BIN vs IP address validation
- **`checkMobileMoneyFraud()`**: Mobile money fraud flags
- **`checkFailedAttempts()`**: Block users with too many failures
- **`performFraudChecks()`**: Comprehensive fraud check
- **`logFraudAttempt()`**: Log suspicious activities

### Tax & VAT

#### `/lib/tax/tax-engine.ts`
- **`getTaxRate()`**: Get VAT rate by country
- **`calculateTax()`**: Calculate tax for amount
- **`formatTaxBreakdown()`**: Format for display
- Supports: EU countries, Kenya (16%), Nigeria (7.5%), South Africa (15%), Ghana (12.5%), and more

## API Routes

### Mobile Payments

#### `POST /api/mobile/pay/initialize`
- Initialize payment for mobile apps
- Supports: Stripe, Flutterwave, Paystack, M-Pesa
- Returns provider-specific response (client_secret, authorization_url, link, etc.)
- Includes fraud checks and tax calculation
- CORS enabled for mobile apps

#### `POST /api/mobile/pay/verify`
- Verify payment status
- Works with all providers including M-Pesa
- Updates payment status and processes events

#### `POST /api/mobile/subscription/renew`
- Manual subscription renewal (for M-Pesa)
- Triggers renewal flow with retry logic

### Webhooks

#### `POST /api/webhooks/stripe`
- Handles Stripe webhooks
- Logs to `PaymentEvent` table
- Processes payment and renewal events

#### `POST /api/webhooks/paystack`
- Handles Paystack webhooks
- Signature verification
- Logs to `PaymentEvent` table

#### `POST /api/webhooks/flutterwave`
- Handles Flutterwave webhooks
- Hash verification
- Logs to `PaymentEvent` table

### Payouts

#### `POST /api/payouts/request`
- Creator payout request
- Methods: M-Pesa (via Flutterwave/Paystack), Bank Transfer, Stripe Connect
- Validates KYC status and available balance

#### `POST /api/payouts/approve` (Admin)
- Approve payout requests
- Updates wallet balance

#### `GET /api/payouts/withdraw`
- Get withdrawal history

## Database Schema

### New Models

#### `PaymentEvent`
- Logs all webhook events
- Fields: `eventId`, `provider`, `type`, `userId`, `subscriptionId`, `amount`, `currency`, `status`, `metadata`, `timestamp`

#### `ReferralCode`
- Creator referral codes
- Fields: `code`, `userId`, `isActive`

#### `ReferralPayout`
- Referral commission payouts
- Fields: `referralId`, `creatorId`, `amount`, `currency`, `status`, `paidAt`

#### `CreatorWallet`
- Creator balance tracking
- Fields: `balance`, `pendingPayouts`, `availableAfterKycApproval`, `currency`, `frozen`

#### `Earnings`
- Creator earnings ledger
- Fields: `type`, `amount`, `balanceAfter`

### Updated Models

- `Payment`: Removed `MPESA` from provider enum
- `Subscription`: Removed `MPESA` from provider enum
- `PaymentTransaction`: Removed `MPESA` from provider enum
- `Chargeback`: Removed `MPESA` from provider enum

## M-Pesa Implementation

### Via Flutterwave
```typescript
POST /charges?type=mobile_money_mpesa
{
  phone_number: "254712345678",
  amount: 1000,
  currency: "KES"
}
```

### Via Paystack
```typescript
POST /charge
{
  mobile_money: {
    phone: "254712345678",
    provider: "mpesa"
  },
  amount: 1000,
  currency: "KES"
}
```

### Flow
1. Client calls `/api/mobile/pay/initialize` with `provider: "MPESA"` and `phoneNumber`
2. System tries Flutterwave first
3. If fails, falls back to Paystack
4. Returns reference and status
5. Client polls `/api/mobile/pay/verify` or waits for webhook
6. Payment confirmed, subscription activated

## Subscription Renewal

### Auto-Renewal Flow
1. Cron job checks `nextBillingDate`
2. Calls `renewSubscription()`
3. Uses original provider:
   - **Stripe**: Automatic via webhooks
   - **Paystack**: Subscription API or charge authorization
   - **Flutterwave**: Tokenized charge
   - **M-Pesa**: Manual renewal (requires user confirmation)

### Dunning System
- Failed payments trigger retry with exponential backoff
- Max 3 retry attempts
- After max retries, subscription marked as `past_due`
- User notified via email/in-app

## Fraud Prevention

### Checks Performed
1. **Velocity Check**: Max 5 payments per hour
2. **Duplicate Detection**: Same payment within 5 minutes
3. **Card BIN Validation**: Country vs IP address
4. **Mobile Money Fraud**: Phone number used by multiple accounts
5. **Failed Attempts**: Max 5 failures in 24 hours → account blocked

### Response
- **Allowed**: Payment proceeds
- **Blocked**: Payment rejected with reason
- **Flagged**: Payment allowed but logged for review

## Tax Calculation

### Supported Countries
- **EU**: 17-27% VAT (varies by country)
- **Kenya**: 16% VAT
- **Nigeria**: 7.5% VAT
- **South Africa**: 15% VAT
- **Ghana**: 12.5% VAT
- **Tanzania**: 18% VAT
- **Uganda**: 18% VAT

### Implementation
```typescript
const tax = calculateTax(amount, countryCode)
// Returns: { taxRate, taxAmount, totalAmount, countryCode, taxType }
```

## Referral System

### Flow
1. Creator generates referral code
2. User signs up with `?ref=CODE`
3. User subscribes → referral recorded
4. Commission calculated and credited
5. Creator can withdraw referral earnings

### Models
- `ReferralCode`: Creator's referral codes
- `Referral`: Referral tracking
- `ReferralPayout`: Commission payouts

## Environment Variables

### Required
```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_WEBHOOK_SECRET=...

# Paystack
PAYSTACK_SECRET_KEY=sk_...
PAYSTACK_PUBLIC_KEY=pk_...
PAYSTACK_WEBHOOK_SECRET=...
```

### Removed (Daraja)
```env
# These are NO LONGER NEEDED:
# MPESA_CONSUMER_KEY
# MPESA_CONSUMER_SECRET
# MPESA_SHORTCODE
# MPESA_PASSKEY
# MPESA_CALLBACK_URL
# MPESA_ENVIRONMENT
```

## Migration Steps

1. **Update Environment Variables**
   - Remove all `MPESA_*` variables
   - Add Stripe, Flutterwave, Paystack keys

2. **Run Prisma Migration**
   ```bash
   npx prisma migrate dev --name multi_provider_payment_system
   ```

3. **Update Webhook URLs**
   - Stripe: `/api/webhooks/stripe`
   - Flutterwave: `/api/webhooks/flutterwave`
   - Paystack: `/api/webhooks/paystack`

4. **Test Payment Flows**
   - Stripe checkout
   - Flutterwave payment
   - Paystack payment
   - M-Pesa via Flutterwave
   - M-Pesa via Paystack
   - Subscription renewals
   - Payouts

## Features

✅ **Multi-Provider Support**: Stripe, Flutterwave, Paystack
✅ **M-Pesa via SDKs**: Flutterwave + Paystack (NO Daraja)
✅ **Auto-Renewal**: All providers with dunning
✅ **Fraud Prevention**: Velocity, duplicate, BIN validation
✅ **Tax Calculation**: Global + African VAT
✅ **Mobile Payments**: Flutter/React Native support
✅ **Webhook Logging**: All events in `PaymentEvent` table
✅ **Referral System**: Codes, tracking, payouts
✅ **Creator Payouts**: M-Pesa, Bank, Stripe Connect
✅ **KYC/AML**: Required before withdrawals

## Next Steps

1. Create UI pages for:
   - Payment methods management
   - Subscription billing
   - Earnings + payout history
   - KYC submission/verification
   - Mobile payments setup

2. Implement referral UI:
   - Referral code generation
   - Referral dashboard
   - Commission tracking

3. Add admin panels:
   - Payout approval
   - KYC verification
   - Fraud monitoring
   - Payment event logs

4. Testing:
   - All payment flows
   - Subscription renewals
   - Fraud detection
   - Tax calculations
   - Mobile app integration

