# Payment Architecture Upgrade - Multi-Provider System

## Overview

This document describes the complete upgrade of the payment system from a Daraja M-Pesa API implementation to a professional multi-provider architecture using Stripe, Flutterwave, and Paystack SDKs. M-Pesa payments are now exclusively handled via Flutterwave and Paystack SDKs (no Daraja API).

## Key Changes

### 1. New Unified Payment Architecture

#### Created Files:
- **`lib/payments/payment-providers.ts`**: SDK wrappers for Stripe, Flutterwave, and Paystack
  - `StripeProviderSDK`: Full Stripe integration with Payment Intents, Subscriptions, Charges, Refunds, Payouts
  - `FlutterwaveProviderSDK`: Flutterwave integration with M-Pesa support via `mobile_money_mpesa`
  - `PaystackProviderSDK`: Paystack integration with M-Pesa support via `mpesa` channel
  - All providers implement unified interfaces: `initializePayment()`, `createSubscription()`, `cancelSubscription()`, `createCharge()`, `refundCharge()`, `createMpesaPayment()`, `checkMpesaStatus()`, `createPayout()`

- **`lib/payments/payment-router.ts`**: Intelligent payment router with automatic fallback
  - `startOneTimePayment()`: Automatic provider selection with fallback (Stripe → Flutterwave → Paystack)
  - `startMpesaPayment()`: M-Pesa via Flutterwave (primary) or Paystack (fallback)
  - `verifyMpesaPayment()`: Verify M-Pesa payment status
  - `startSubscription()`: Create subscriptions with auto-renewal support
  - `cancelSubscription()`: Cancel subscriptions
  - `processWebhook()`: Unified webhook processing
  - `routePayout()`: Route payouts to appropriate provider

#### Updated Files:
- **`lib/payments/types.ts`**: Removed `MPESA` as standalone provider type
- **`lib/payments/index.ts`**: Updated to use new SDK providers
- **`lib/payments/router.ts`**: Updated provider selection (Kenya now uses Flutterwave for M-Pesa)

### 2. Removed Daraja M-Pesa Implementation

#### Deleted Files:
- `lib/payments/mpesa.ts` (Daraja API implementation)
- `app/api/payments/mpesa/stk/route.ts` (Old STK Push route)
- `app/api/webhooks/mpesa/route.ts` (Old M-Pesa webhook route)

#### Updated Files:
- All references to `mpesaProvider` removed
- All `MPESA` provider type references updated to use Flutterwave/Paystack
- M-Pesa now handled via:
  - Flutterwave: `mobile_money_mpesa` channel
  - Paystack: `mpesa` channel in mobile_money

### 3. New API Routes

#### Payment Routes:
- **`app/api/payments/checkout/route.ts`**: Unified checkout endpoint
  - Accepts: `creatorId`, `tierId/tierName`, `amount`, `currency`, `country`, `providerPreference`
  - Returns: `paymentId`, `subscriptionId`, `provider`, `reference`, `redirectUrl`, `clientSecret`, `accessCode`, `flwRef`
  - Automatic provider selection with fallback

- **`app/api/payments/subscriptions/create/route.ts`**: Create subscriptions
  - Supports auto-renewal
  - Monthly/yearly intervals
  - Provider preference support

- **`app/api/payments/subscriptions/cancel/route.ts`**: Cancel subscriptions
  - Provider-agnostic cancellation
  - Updates local database

#### M-Pesa Routes:
- **`app/api/payments/mpesa/start/route.ts`**: Start M-Pesa payment
  - Uses `startMpesaPayment()` from payment router
  - Tries Flutterwave first, falls back to Paystack
  - Returns provider-specific response

- **`app/api/payments/mpesa/verify/route.ts`**: Verify M-Pesa payment
  - Checks payment status via provider
  - Processes payment event on success

- **`app/api/payments/mpesa/callback/route.ts`**: M-Pesa webhook handler
  - Handles callbacks from Flutterwave and Paystack
  - Uses unified webhook processing

#### Payout Routes:
- **`app/api/payouts/route.ts`**: Creator payout request
  - Supports: M-Pesa, Bank Transfer, Stripe Connect
  - Validates KYC status
  - Checks available balance
  - Routes to appropriate provider

#### Webhook Routes (Updated):
- **`app/api/payments/webhooks/stripe/route.ts`**: Uses `processWebhook()` from router
- **`app/api/payments/webhooks/flutterwave/route.ts`**: Uses `processWebhook()` from router
- **`app/api/payments/webhooks/paystack/route.ts`**: Uses `processWebhook()` from router

### 4. Database Schema Updates

#### Prisma Schema Changes:
- **Removed `MPESA` from provider enums**:
  - `Subscription.paymentProvider`: Now `'flutterwave' | 'paystack' | 'stripe'`
  - `Payment.provider`: Now `'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE'`
  - `PaymentTransaction.provider`: Now `'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE'`
  - `Chargeback.provider`: Now `'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE'`

- **Added `CreatorWallet` model**:
  ```prisma
  model CreatorWallet {
    id                      String         @id @default(cuid())
    userId                  String         @unique
    balance                 Float          @default(0)
    pendingPayouts         Float          @default(0)
    availableAfterKycApproval Float?
    currency                String         @default("USD")
    frozen                  Boolean        @default(false)
    frozenReason            String?
    createdAt               DateTime       @default(now())
    updatedAt               DateTime       @updatedAt
    user                    User           @relation(...)
    payoutHistory           PayoutHistory[]
  }
  ```

- **Added `Earnings` model**:
  ```prisma
  model Earnings {
    id            String   @id @default(cuid())
    creatorId     String
    paymentId     String
    type          String // 'payment', 'renewal', 'refund', 'payout'
    amount        Float // Amount in USD (normalized)
    balanceAfter  Float // Creator balance after this transaction
    createdAt     DateTime @default(now())
    payment       Payment  @relation(...)
    creator       User     @relation(...)
  }
  ```

### 5. Updated Supporting Files

#### Security & Fraud:
- **`lib/security/fraud.ts`**: Removed `MPESA` from provider type
- **`lib/payments/webhook-handler.ts`**: Removed `MPESA` from provider type

#### Subscriptions:
- **`lib/subscriptions/renewal.ts`**: Updated M-Pesa renewal logic (now via Flutterwave/Paystack)

#### Mobile Payments:
- **`app/api/payments/mobile/initiate/route.ts`**: Removed direct MPESA handling (now via Flutterwave/Paystack)

## M-Pesa Implementation Details

### Flutterwave M-Pesa:
- Endpoint: `/charges?type=mobile_money_mpesa`
- Phone format: `254XXXXXXXXX` (Kenya)
- Returns: `flw_ref`, `processor_response`
- Status check: `/transactions/verify_by_reference?tx_ref={reference}`

### Paystack M-Pesa:
- Endpoint: `/charge` with `mobile_money` object
- Phone format: `254XXXXXXXXX` (Kenya)
- Returns: `authorization`, `customer`
- Status check: `/transaction/verify/{reference}`

## Payment Flow

### One-Time Payment:
1. Client calls `/api/payments/checkout`
2. Router selects provider (Stripe → Flutterwave → Paystack)
3. Provider initializes payment
4. Returns redirect URL or client secret
5. Webhook confirms payment
6. Subscription activated

### M-Pesa Payment:
1. Client calls `/api/payments/mpesa/start` with phone number
2. Router tries Flutterwave first
3. If fails, tries Paystack
4. Returns reference and status
5. Client polls `/api/payments/mpesa/verify` or waits for webhook
6. Payment confirmed, subscription activated

### Subscription Renewal:
1. Cron job checks `nextBillingDate`
2. Uses original provider to charge
3. Webhook confirms renewal
4. Subscription extended

### Payout:
1. Creator calls `/api/payouts` with method and account details
2. Router routes to appropriate provider:
   - M-Pesa → Flutterwave or Paystack
   - Bank → Flutterwave
   - Stripe Connect → Stripe
3. Payout processed
4. Wallet balance updated

## Environment Variables

### Required:
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

### Removed (Daraja):
```env
# These are no longer needed:
# MPESA_CONSUMER_KEY
# MPESA_CONSUMER_SECRET
# MPESA_SHORTCODE
# MPESA_PASSKEY
# MPESA_CALLBACK_URL
# MPESA_ENVIRONMENT
```

## Migration Steps

1. **Update Environment Variables**:
   - Remove all `MPESA_*` variables
   - Ensure Stripe, Flutterwave, and Paystack keys are set

2. **Run Prisma Migrations**:
   ```bash
   npx prisma migrate dev --name remove_mpesa_add_wallet_earnings
   ```

3. **Update Webhook URLs**:
   - Stripe: `/api/payments/webhooks/stripe`
   - Flutterwave: `/api/payments/webhooks/flutterwave`
   - Paystack: `/api/payments/webhooks/paystack`
   - M-Pesa callbacks: `/api/payments/mpesa/callback` (with `x-provider` header)

4. **Test Payment Flows**:
   - Test Stripe checkout
   - Test Flutterwave payment
   - Test Paystack payment
   - Test M-Pesa via Flutterwave
   - Test M-Pesa via Paystack
   - Test subscription renewals
   - Test payouts

## Benefits

1. **Unified Architecture**: Single interface for all payment providers
2. **Automatic Fallback**: If one provider fails, automatically tries next
3. **Better M-Pesa Support**: Via established payment providers (Flutterwave/Paystack)
4. **Easier Maintenance**: No custom Daraja API code to maintain
5. **Better Error Handling**: Provider-specific error messages
6. **Scalability**: Easy to add new providers
7. **Type Safety**: Full TypeScript support throughout

## Next Steps

1. Update frontend to use new API endpoints
2. Test all payment flows in sandbox
3. Update documentation
4. Monitor webhook processing
5. Set up production webhook URLs
6. Test subscription renewals
7. Test payout flows

## Notes

- M-Pesa is now exclusively via Flutterwave and Paystack
- No Daraja API code remains in the codebase
- All payment providers follow the same internal API shape
- Webhooks are unified and process all providers consistently
- Creator earnings are tracked in the `Earnings` model
- Payouts are tracked in `PayoutHistory` model

