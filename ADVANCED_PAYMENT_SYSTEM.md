# Advanced Payment System Implementation

## Overview

This document describes the comprehensive financial, payment, and growth systems added to the Africa Patreon SaaS platform.

## 1. Fraud Detection System (`lib/security/fraud.ts`)

### Features
- **IP Address Verification**: Checks against flagged IPs
- **Rate Limiting**: Per user (10 requests/5 min) and per card (3 transactions/15 min)
- **Duplicate Transaction Rejection**: Prevents duplicate payments within 5 minutes
- **Creator/Tier Validation**: Verifies creator exists and tier is valid
- **Active Subscription Check**: Prevents duplicate subscriptions
- **Currency Mismatch Detection**: Validates currency consistency
- **Webhook Origin Validation**: Verifies signatures for all providers

### Fraud Log Table
All suspicious attempts are logged to `FraudLog` table with:
- User ID, IP address, user agent
- Fraud type and severity
- Details and resolution status

### Middleware
`lib/security/fraud-middleware.ts` applies fraud checks to all payment routes.

## 2. VAT / Tax Engine (`lib/tax/tax-engine.ts`)

### Supported Tax Rates
- **EU Countries**: VAT rates for digital goods (varies by country, 17-27%)
- **Kenya**: 16% VAT
- **Nigeria**: 7.5% VAT
- **South Africa**: 15% VAT
- **Ghana**: 12.5% VAT
- **Other African countries**: Various rates

### Features
- Automatic tax calculation based on billing country
- Tax amount stored in `PaymentTransaction` table
- Tax breakdown in invoices and receipts

### Database Fields
- `taxAmount`: Tax amount in cents
- `taxRate`: Tax rate percentage
- `countryCode`: Billing country code

## 3. Multi-Currency Support (`lib/payments/currency.ts`)

### Supported Currencies
- USD, EUR, GBP
- KES (Kenya), NGN (Nigeria), ZAR (South Africa), GHS (Ghana)

### Features
- **Normalization**: All earnings stored internally in USD
- **Display**: Frontend shows local currency
- **Exchange Rates**: Fetched from payment providers (Stripe/Flutterwave/Paystack)
- **Conversion**: Automatic currency conversion

### Functions
- `convertCurrency()`: Convert between currencies
- `normalizeToUSD()`: Normalize to USD for storage
- `formatCurrency()`: Format for display
- `getCurrencyForCountryCode()`: Get currency for country

## 4. Unified Payment API (`lib/payments/unified-api.ts`)

All payment providers map to unified internal format:

```typescript
{
  provider: "STRIPE" | "PAYSTACK" | "FLUTTERWAVE" | "MPESA",
  externalId: string,
  amount: number, // in cents
  currency: SupportedCurrency,
  status: "pending" | "success" | "failed",
  userId: string,
  creatorId: string,
  tierId: string,
  taxAmount: number, // in cents
  taxRate: number,
  countryCode: string,
  referralCommission: number, // in cents
  amountUSD: number, // normalized to USD
}
```

All transactions stored in `PaymentTransaction` table with full details.

## 5. Affiliate / Referral System

### Referral Flow
1. User signs up with `?ref=abc123`
2. Referrer earns commission on subscriber's monthly fees
3. Commission credited after webhook confirms payment
4. Referral payouts appear on Creator Dashboard

### Commission Rates
- **Base Rate**: 10% of subscription value
- **Tier Multipliers**:
  - Basic: 1.0x (10%)
  - Premium: 1.5x (15%)
  - Pro: 2.0x (20%)
  - Elite: 2.5x (25%)

### Database Fields
- `commissionRate`: Commission rate percentage
- `commissionAmount`: Commission amount earned
- Stored in `Referral` and `PaymentTransaction` tables

### Dashboard
- `/dashboard/referrals` page shows:
  - Total clicks, signups, conversions
  - Total credits and commission earned
  - Referral history with commission details

## 6. Creator Earnings + Payout Enhancements

### Creator Dashboard Features
- Total earnings (normalized to USD)
- Monthly breakdown
- Withdrawable balance
- Pending affiliate payouts
- Currency selector
- Withdrawal history

### Withdrawal Endpoint (`/api/creator/withdraw`)

**Supported Methods**:
- M-Pesa (phone number required)
- Bank transfer (account details required)
- Stripe Connect
- Flutterwave payout
- Paystack transfer

**Validation**:
- Minimum withdrawal: $10
- Balance check before withdrawal
- Method-specific account validation

## 7. Subscription Model Updates

### New Fields
- `renewalDate`: Scheduled renewal date
- `renewalProvider`: Provider for renewal
- `renewalStatus`: Renewal processing status
- `mobilePlatform`: Platform used (web/flutter/react-native)

### Auto-Renewal
- Processed via webhook or cron job
- Automatic subscription extension
- Renewal payments tracked separately

## 8. Updated Payment Routes

### Payment Creation (`/api/payments/create`)
- Fraud checks applied
- Tax calculation included
- Unified API format
- Referral commission tracking

### Mobile Payments (`/api/payments/mobile/initiate`)
- Fraud checks applied
- Tax calculation included
- Mobile-specific responses

### Webhook Handlers
All webhooks updated to:
- Use unified payment format
- Include tax information
- Track referral commissions
- Store in `PaymentTransaction` table

## 9. Database Schema Updates

### New Tables
- `FraudLog`: Fraud attempt logging

### Updated Tables
- `PaymentTransaction`: Added `taxAmount`, `taxRate`, `countryCode`, `referralCommission`, `externalId`
- `Subscription`: Added `renewalDate`, `renewalProvider`, `renewalStatus`, `mobilePlatform`
- `Referral`: Added `commissionRate`, `commissionAmount`

## 10. Migration Steps

1. **Update Prisma Schema**:
   ```bash
   npx prisma migrate dev --name advanced_payment_system
   npx prisma generate
   ```

2. **Environment Variables**:
   ```env
   # Add any new required env vars
   ```

3. **Test Payment Flow**:
   - Test fraud detection
   - Test tax calculation
   - Test currency conversion
   - Test referral commissions
   - Test withdrawals

## 11. Security Considerations

- All payment routes protected by fraud middleware
- Webhook signatures validated
- Rate limiting prevents abuse
- Duplicate transaction prevention
- Currency mismatch detection
- IP address tracking

## 12. Next Steps

- [ ] Set up exchange rate API integration
- [ ] Configure tax rates for all countries
- [ ] Test withdrawal flows for all methods
- [ ] Set up cron job for subscription renewals
- [ ] Add email notifications for payouts
- [ ] Create admin panel for fraud log review
- [ ] Add analytics for referral performance

