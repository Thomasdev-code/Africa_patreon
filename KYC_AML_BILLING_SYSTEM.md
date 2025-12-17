# KYC + AML + Billing Safety System

## Overview

Complete KYC verification, AML risk management, dunning, chargeback handling, and wallet system for the Africa Patreon SaaS platform.

## 1. KYC Verification System

### Database Model
- `KycVerification`: Stores ID document, selfie, address proof, status, admin notes

### API Routes
- `POST /api/kyc/submit`: Creator submits KYC documents
- `GET /api/kyc/submit`: Get creator's KYC status
- `POST /api/kyc/admin/verify`: Admin approves/rejects KYC
- `GET /api/kyc/admin/verify`: List all KYC submissions
- `GET /api/kyc/admin/[kycId]`: Get specific KYC details

### Frontend
- `/app/creator/kyc/page.tsx`: Creator KYC upload page
- `/app/admin/kyc/page.tsx`: Admin KYC review dashboard

### Middleware Protection
- Withdrawals blocked unless `kyc.status === "approved"`
- Payment guard enforces KYC requirement

## 2. AML Risk Engine

### Database Model
- `AmlRiskProfile`: Risk score (0-100), monthly/daily limits, flags

### Risk Factors
- KYC status (not approved = +20 risk)
- Chargeback count (+15 per chargeback)
- Failed payments (>5 in 30 days = +20)
- Sudden subscriber spike (>5x previous week = +25)
- IP country mismatches
- Too many cards added

### Risk Limits
- Risk 0-19: $10,000/month, $1,000/day
- Risk 20-39: $500/month, $100/day
- Risk 40-59: $250/month, $50/day
- Risk 60-79: $100/month, $20/day
- Risk 80-100: Blocked (0 limits)

### Functions
- `calculateRiskScore(userId)`: Calculates and updates risk profile
- `checkTransactionAllowed(userId, amount)`: Validates transaction against limits

## 3. Subscription Dunning System

### Database Models
- `DunningAttempt`: Tracks retry attempts with schedule
- `PaymentMethodUpdateRequest`: User payment method update requests

### Retry Schedule
1. Retry 1: 12 hours after failure
2. Retry 2: 24 hours after retry 1
3. Retry 3: 3 days after retry 2
4. Retry 4: 5 days after retry 3 (final)

### Process Flow
1. Payment fails → Create dunning attempt
2. Cron job runs hourly → Process scheduled attempts
3. All retries fail → Mark subscription as "past_due"
4. Create payment method update request
5. After 7 days → Cancel subscription if still past_due

### Cron Job
- `/app/api/cron/dunning/route.ts`: Protected endpoint for cron
- `/cron/dunning.ts`: Dunning engine logic

## 4. Chargeback Handling

### Database Model
- `Chargeback`: Tracks chargebacks with status (open/won/lost)

### Webhook Handler
- `/app/api/chargebacks/webhook/route.ts`: Handles chargeback events from all providers

### Process Flow
1. Chargeback received → Create record
2. Freeze creator wallet
3. Update risk score (+15 per chargeback)
4. Notify creator and admin
5. Admin can resolve (won/lost)
6. If won → Unfreeze wallet, adjust balance
7. If lost → Deduct from wallet balance

## 5. Creator Wallet System

### Database Models
- `CreatorWallet`: Balance, pending payouts, frozen status
- `PayoutHistory`: All payout requests and history

### API Routes
- `POST /api/wallet/request-payout`: Creator requests withdrawal
- `GET /api/wallet/request-payout`: Get wallet balance and history
- `POST /api/admin/wallet/approve-payout`: Admin approves/rejects payout
- `GET /api/admin/wallet/approve-payout`: List all payouts

### Payout Rules
- KYC must be approved
- AML limits enforced
- Wallet must not be frozen
- Sufficient balance required
- Method-specific validation (M-Pesa requires phone, bank requires account)

### Supported Methods
- M-Pesa (Kenya only)
- Bank transfer
- Stripe Connect
- Flutterwave payout
- Paystack transfer

## 6. Payment Guard Middleware

### Functions
- `paymentGuard(req, context)`: Validates payment requests
- `withdrawalGuard(req, amount, currency)`: Specific checks for withdrawals

### Checks Performed
1. User authentication
2. Account ban status
3. KYC approval (for withdrawals)
4. AML risk limits
5. Currency validation
6. Wallet freeze status
7. Balance sufficiency

## 7. Webhook Updates

All payment provider webhooks now:
- Update risk scores on successful payments
- Forward chargeback events to chargeback handler
- Track all transactions in unified format

## 8. Database Schema Updates

### New Models
- `KycVerification`
- `AmlRiskProfile`
- `DunningAttempt`
- `PaymentMethodUpdateRequest`
- `Chargeback`
- `CreatorWallet`
- `PayoutHistory`

### Updated Models
- `Subscription`: Added `dunningAttempts` relation
- `User`: Added relations for KYC, AML, wallet, chargebacks

## 9. Migration Steps

1. **Run Prisma Migration**:
   ```bash
   npx prisma migrate dev --name kyc_aml_billing_system
   npx prisma generate
   ```

2. **Set Environment Variables**:
   ```env
   CRON_SECRET=your-secret-token-for-cron-jobs
   ```

3. **Set Up Cron Job**:
   - Vercel: Add to `vercel.json`:
     ```json
     {
       "crons": [{
         "path": "/api/cron/dunning",
         "schedule": "0 * * * *"
       }]
     }
     ```
   - Or use external cron service

4. **Test Flow**:
   - Creator submits KYC
   - Admin approves KYC
   - Creator requests payout
   - Test dunning with failed payment
   - Test chargeback webhook

## 10. Security Features

- KYC mandatory for withdrawals
- AML risk scoring and limits
- Wallet freeze on chargebacks
- Transaction limits based on risk
- IP tracking for fraud detection
- Multi-layer fraud protection

## 11. Next Steps

- [ ] Add email notifications for KYC status changes
- [ ] Add email notifications for chargebacks
- [ ] Add email notifications for dunning attempts
- [ ] Implement IP tracking in auth middleware
- [ ] Add admin dashboard for risk overview
- [ ] Add admin dashboard for chargeback management
- [ ] Add unit tests for risk engine
- [ ] Add integration tests for dunning flow
- [ ] Set up monitoring and alerts

