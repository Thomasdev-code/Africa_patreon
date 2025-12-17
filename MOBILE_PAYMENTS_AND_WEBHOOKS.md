# Mobile Payments & Unified Webhooks System

## Overview

This document describes the advanced financial + payment + growth systems added to the Africa Patreon SaaS platform, including mobile app payment support and unified webhook handling.

## 1. Mobile App Payment Support

### Endpoint: `/api/payments/mobile/initiate`

A unified mobile-friendly payment endpoint that supports Flutter, React Native, and web platforms.

#### Request Headers
- `X-Bundle-ID` (optional): iOS bundle identifier (e.g., `com.africapatreon.app`)
- `X-Package-Name` (optional): Android package name (e.g., `com.africapatreon.app`)

#### Request Body
```json
{
  "provider": "stripe" | "paystack" | "flutterwave" | "mpesa",
  "amount": 10.00,
  "currency": "USD",
  "creatorId": "creator_id",
  "tierId": "tier_id" | "tierName": "tier_name",
  "platform": "web" | "flutter" | "react-native",
  "country": "NG",
  "metadata": {}
}
```

#### Response Format

**Stripe (Mobile):**
```json
{
  "success": true,
  "paymentId": "payment_id",
  "subscriptionId": "subscription_id",
  "provider": "STRIPE",
  "reference": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Paystack:**
```json
{
  "success": true,
  "paymentId": "payment_id",
  "subscriptionId": "subscription_id",
  "provider": "PAYSTACK",
  "reference": "ref_xxx",
  "authorization_url": "https://checkout.paystack.com/xxx",
  "access_code": "access_code_xxx"
}
```

**Flutterwave:**
```json
{
  "success": true,
  "paymentId": "payment_id",
  "subscriptionId": "subscription_id",
  "provider": "FLUTTERWAVE",
  "reference": "ref_xxx",
  "link": "https://checkout.flutterwave.com/xxx",
  "flw_ref": "flw_ref_xxx"
}
```

**M-Pesa:**
```json
{
  "success": true,
  "paymentId": "payment_id",
  "subscriptionId": "subscription_id",
  "provider": "MPESA",
  "reference": "checkout_request_id",
  "merchantRequestID": "merchant_request_id",
  "checkoutRequestID": "checkout_request_id",
  "customerMessage": "STK Push sent to phone"
}
```

### Security Features

1. **Bundle ID / Package Name Validation**
   - Configure allowed bundle IDs in `.env`: `ALLOWED_BUNDLE_IDS=com.africapatreon.app,com.africapatreon.dev`
   - Configure allowed package names: `ALLOWED_PACKAGE_NAMES=com.africapatreon.app,com.africapatreon.dev`
   - If no restrictions are configured, all apps are allowed (development mode)

2. **CORS Support**
   - CORS headers are automatically added for mobile app requests
   - Supports preflight OPTIONS requests

## 2. Unified Webhook System

### Webhook Routes

All webhook routes follow a unified `PaymentEvent` model and use the centralized `processPaymentEvent` handler.

#### Available Webhook Routes

1. **Stripe**: `/api/payments/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`
   - Signature validation: `stripe-signature` header

2. **Paystack**: `/api/payments/webhooks/paystack`
   - Events: `charge.success`
   - Signature validation: `x-paystack-signature` header

3. **Flutterwave**: `/api/payments/webhooks/flutterwave`
   - Events: `charge.completed`
   - Signature validation: `verif-hash` header

4. **M-Pesa**: `/api/webhooks/mpesa`
   - Events: `stk_push_callback`
   - Also available at: `/api/payments/mpesa/callback` (legacy)

### Unified PaymentEvent Model

```typescript
interface PaymentEvent {
  event: string              // Event type (e.g., "checkout.session.completed")
  reference: string          // Payment reference from provider
  status: PaymentStatus      // "pending" | "success" | "failed" | "cancelled"
  amount: number            // Amount in cents/smallest currency unit
  currency: string          // Currency code (USD, NGN, KES, etc.)
  metadata?: Record<string, any>
  provider: "STRIPE" | "PAYSTACK" | "FLUTTERWAVE" | "MPESA"
}
```

### Webhook Processing Flow

All webhooks follow this standardized flow:

1. **Signature Validation**
   - Each provider validates webhook signatures securely
   - Prevents unauthorized webhook calls

2. **Payment Confirmation**
   - Updates payment status in database
   - Creates `PaymentTransaction` record for audit trail

3. **Subscription Activation**
   - Activates subscription if payment successful
   - Sets subscription dates (start, end, next billing)
   - Links payment to subscription

4. **Event Logging**
   - All events logged to `PaymentTransaction` table
   - Includes metadata for debugging and analytics

5. **Notifications**
   - Creator notified of new subscription
   - In-app notifications created
   - Email notifications (if configured)

6. **Referral Payout Logic**
   - Checks if subscription has referral
   - Calculates referral credits based on tier
   - Awards credits to referrer
   - Updates referral status

7. **Creator Earnings Update**
   - Payment automatically linked to creator
   - Earnings queries include all successful payments
   - Renewals tracked separately

### Webhook Handler Functions

#### `processPaymentEvent(event: PaymentEvent)`
Handles initial payment events:
- Payment confirmation
- Subscription activation
- Notifications
- Referral credits
- Earnings tracking

#### `processRenewalEvent(event: PaymentEvent)`
Handles subscription renewal events:
- Creates renewal payment record
- Extends subscription dates
- Awards referral credits for renewals
- Updates subscription status

## 3. Environment Variables

Add these to your `.env` file:

```env
# Mobile App Security
ALLOWED_BUNDLE_IDS=com.africapatreon.app,com.africapatreon.dev
ALLOWED_PACKAGE_NAMES=com.africapatreon.app,com.africapatreon.dev

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_xxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_xxx

# M-Pesa
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
MPESA_SHORTCODE=xxx
MPESA_PASSKEY=xxx
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhooks/mpesa
MPESA_ENVIRONMENT=sandbox  # or "production"
```

## 4. Testing

### Mobile Payment Testing

1. **Test with Flutter/React Native:**
   ```dart
   // Flutter example
   final response = await http.post(
     Uri.parse('https://yourdomain.com/api/payments/mobile/initiate'),
     headers: {
       'Content-Type': 'application/json',
       'X-Bundle-ID': 'com.africapatreon.app', // iOS
       'X-Package-Name': 'com.africapatreon.app', // Android
       'Authorization': 'Bearer $token',
     },
     body: jsonEncode({
       'provider': 'stripe',
       'amount': 10.00,
       'currency': 'USD',
       'creatorId': 'creator_id',
       'tierName': 'Premium',
       'platform': 'flutter',
     }),
   );
   ```

2. **Test Webhook Endpoints:**
   - Use provider webhook testing tools (Stripe CLI, Paystack dashboard, etc.)
   - Verify signature validation works
   - Check database for payment and transaction records

## 5. Architecture Benefits

1. **Unified Processing**: All webhooks use the same handler, ensuring consistent behavior
2. **Mobile-First**: Native mobile app support with proper authentication
3. **Security**: Bundle ID validation and signature verification
4. **Audit Trail**: All events logged to `PaymentTransaction` table
5. **Extensible**: Easy to add new payment providers
6. **Comprehensive**: Handles payments, renewals, referrals, and earnings automatically

## 6. Next Steps

- [ ] Configure webhook URLs in provider dashboards
- [ ] Set up bundle ID/package name restrictions for production
- [ ] Test mobile payment flows with Flutter/React Native apps
- [ ] Monitor webhook logs for errors
- [ ] Set up email notifications for payment events
- [ ] Configure production payment provider credentials

