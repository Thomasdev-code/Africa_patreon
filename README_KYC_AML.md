# KYC + AML + Billing Safety System - Implementation Guide

## Overview

Complete implementation of KYC verification, AML risk management, dunning system, chargeback handling, and wallet management for the Africa Patreon SaaS platform.

## 🗄️ Database Schema Updates

### New Models Added

1. **KycVerification** - KYC document verification
2. **AmlRiskProfile** - Risk scoring and limits
3. **DunningAttempt** - Failed payment retry tracking
4. **PaymentMethodUpdateRequest** - Payment method update requests
5. **Chargeback** - Chargeback/dispute tracking
6. **CreatorWallet** - Creator wallet with balance tracking
7. **PayoutHistory** - Payout request history

### Migration Command

```bash
npx prisma migrate dev --name kyc_aml_billing_system
npx prisma generate
```

## 🔐 1. KYC Verification System

### Creator Flow
1. Creator visits `/creator/kyc`
2. Uploads ID document, selfie, and optional address proof
3. Documents stored in cloud storage
4. Status set to "pending"
5. Admin reviews and approves/rejects

### Admin Flow
1. Admin visits `/admin/kyc`
2. Views all KYC submissions
3. Can filter by status (pending/approved/rejected)
4. Reviews documents and approves/rejects with notes

### API Routes
- `POST /api/kyc/submit` - Submit KYC documents
- `GET /api/kyc/submit` - Get creator's KYC status
- `POST /api/kyc/admin/verify` - Admin approve/reject
- `GET /api/kyc/admin/verify` - List all KYC submissions
- `GET /api/kyc/admin/[kycId]` - Get specific KYC details

### Protection
- Withdrawals blocked unless `kyc.status === "approved"`
- Payment guard enforces KYC requirement

## 🛡️ 2. AML Risk Engine

### Risk Scoring Factors
- **KYC Status**: Not approved = +20 risk
- **Chargebacks**: +15 per open chargeback
- **Failed Payments**: >5 in 30 days = +20
- **Sudden Subscriber Spike**: >5x previous week = +25
- **IP Country Mismatch**: Detected = +15
- **Too Many Cards**: Multiple cards = +10

### Risk Limits
- **0-19**: $10,000/month, $1,000/day
- **20-39**: $500/month, $100/day
- **40-59**: $250/month, $50/day
- **60-79**: $100/month, $20/day
- **80-100**: Blocked (0 limits)

### Files
- `lib/risk-engine.ts` - Risk calculation and limit checking
- `app/admin/risk/page.tsx` - Admin risk overview dashboard
- `app/api/admin/risk/route.ts` - Risk profiles API

## 🔄 3. Dunning System (Failed Payment Recovery)

### Retry Schedule
1. **Retry 1**: 12 hours after failure
2. **Retry 2**: 24 hours after retry 1
3. **Retry 3**: 3 days after retry 2
4. **Retry 4**: 5 days after retry 3 (final)

### Process Flow
1. Payment fails → Create dunning attempt
2. Cron job runs hourly → Process scheduled attempts
3. All retries fail → Mark subscription as "past_due"
4. Create payment method update request
5. After 7 days → Cancel subscription if still past_due

### Files
- `lib/dunning/dunning-engine.ts` - Dunning logic
- `cron/dunning.ts` - Cron job handler
- `app/api/cron/dunning/route.ts` - Protected cron endpoint

### Cron Setup
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/dunning",
    "schedule": "0 * * * *"
  }]
}
```

Or use external cron service calling `/api/cron/dunning` with `Authorization: Bearer ${CRON_SECRET}` header.

## 💳 4. Chargeback Handling

### Process Flow
1. Chargeback received via webhook
2. Create chargeback record
3. Freeze creator wallet
4. Update risk score (+15 per chargeback)
5. Notify creator and admin
6. Admin resolves (won/lost)
7. If won → Unfreeze wallet
8. If lost → Deduct from wallet balance

### Files
- `app/api/chargebacks/webhook/route.ts` - Chargeback webhook handler
- `app/admin/chargebacks/page.tsx` - Admin chargeback management
- `app/api/admin/chargebacks/route.ts` - Chargeback list API
- `app/api/admin/chargebacks/resolve/route.ts` - Resolve chargeback

### Webhook Integration
All payment provider webhooks forward chargeback events to `/api/chargebacks/webhook`.

## 💰 5. Creator Wallet System

### Features
- Balance tracking (normalized to USD)
- Pending payouts tracking
- Wallet freeze on chargebacks
- KYC requirement for withdrawals
- AML limit enforcement

### API Routes
- `POST /api/wallet/request-payout` - Request withdrawal
- `GET /api/wallet/request-payout` - Get wallet balance and history
- `POST /api/admin/wallet/approve-payout` - Admin approve/reject payout
- `GET /api/admin/wallet/approve-payout` - List all payouts

### Payout Methods
- M-Pesa (Kenya only, requires phone number)
- Bank transfer (requires account details)
- Stripe Connect
- Flutterwave payout
- Paystack transfer

## 🔒 6. Payment Guard Middleware

### Functions
- `paymentGuard(req, context)` - Validates payment requests
- `withdrawalGuard(req, amount, currency)` - Specific checks for withdrawals

### Checks Performed
1. User authentication
2. Account ban status
3. KYC approval (for withdrawals)
4. AML risk limits
5. Currency validation
6. Wallet freeze status
7. Balance sufficiency

### Usage
```typescript
import { paymentGuard } from "@/lib/payment-guard"

const guardCheck = await paymentGuard(req, {
  userId: session.user.id,
  amount: 100,
  currency: "USD",
  requireKyc: true,
})

if (guardCheck) {
  return guardCheck // Returns error response
}
```

## 📋 7. Frontend Pages

### Creator Pages
- `/creator/kyc` - KYC document upload
- `/creator/wallet` - Wallet and payout management (to be created)

### Admin Pages
- `/admin/kyc` - KYC review dashboard
- `/admin/risk` - Risk & Security overview
- `/admin/chargebacks` - Chargeback management

## 🔧 8. Environment Variables

Add to `.env`:
```env
CRON_SECRET=your-secret-token-for-cron-jobs
```

## 🚀 9. Setup Steps

1. **Run Migration**:
   ```bash
   npx prisma migrate dev --name kyc_aml_billing_system
   npx prisma generate
   ```

2. **Set Up Cron**:
   - Vercel: Already configured in `vercel.json`
   - Other platforms: Set up cron to call `/api/cron/dunning` hourly

3. **Test Flow**:
   - Creator submits KYC
   - Admin approves KYC
   - Creator requests payout
   - Test dunning with failed payment
   - Test chargeback webhook

## 📊 10. Integration Points

### Payment Routes
All payment creation routes now use:
- Fraud checks (`fraudCheckMiddleware`)
- Payment guard (`paymentGuard`)
- Tax calculation
- Risk score updates

### Webhook Handlers
All webhooks now:
- Update risk scores
- Forward chargebacks
- Track in unified format

### Creator Dashboard
Should display:
- KYC status
- Wallet balance
- Pending payouts
- Risk score (if visible to creator)

## 🔍 11. Testing Checklist

- [ ] KYC submission and approval flow
- [ ] Withdrawal blocked without KYC
- [ ] Risk score calculation
- [ ] AML limits enforced
- [ ] Dunning retry schedule
- [ ] Chargeback webhook handling
- [ ] Wallet freeze/unfreeze
- [ ] Payout approval flow

## 📝 12. Notes

- All new Prisma models use `(prisma as any)` temporarily until `prisma generate` is run
- TypeScript types will be available after migration
- Cron job requires `CRON_SECRET` environment variable
- All webhooks should be configured in provider dashboards

## 🎯 Next Steps

1. Run Prisma migration
2. Generate Prisma client
3. Set up cron job
4. Configure webhook URLs in payment provider dashboards
5. Test all flows
6. Add email notifications
7. Add unit tests for risk engine
8. Add integration tests for dunning flow

