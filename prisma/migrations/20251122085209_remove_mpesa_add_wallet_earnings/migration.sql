-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "referralCommission" INTEGER,
ADD COLUMN     "taxAmount" INTEGER,
ADD COLUMN     "taxRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "commissionAmount" DOUBLE PRECISION,
ADD COLUMN     "commissionRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "mobilePlatform" TEXT,
ADD COLUMN     "renewalDate" TIMESTAMP(3),
ADD COLUMN     "renewalProvider" TEXT,
ADD COLUMN     "renewalStatus" TEXT;

-- CreateTable
CREATE TABLE "FraudLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "requestPath" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "fraudType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "details" JSONB,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idDocumentUrl" TEXT NOT NULL,
    "selfieUrl" TEXT NOT NULL,
    "addressProofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmlRiskProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "flags" JSONB,
    "lastRiskUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmlRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DunningAttempt" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "attemptedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DunningAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodUpdateRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reason" TEXT,
    "evidence" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingPayouts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableAfterKycApproval" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutHistory" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerReference" TEXT,
    "accountDetails" JSONB,
    "adminNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earnings" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudLog_userId_idx" ON "FraudLog"("userId");

-- CreateIndex
CREATE INDEX "FraudLog_ipAddress_idx" ON "FraudLog"("ipAddress");

-- CreateIndex
CREATE INDEX "FraudLog_fraudType_idx" ON "FraudLog"("fraudType");

-- CreateIndex
CREATE INDEX "FraudLog_severity_idx" ON "FraudLog"("severity");

-- CreateIndex
CREATE INDEX "FraudLog_blocked_idx" ON "FraudLog"("blocked");

-- CreateIndex
CREATE INDEX "FraudLog_createdAt_idx" ON "FraudLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycVerification_userId_key" ON "KycVerification"("userId");

-- CreateIndex
CREATE INDEX "KycVerification_userId_idx" ON "KycVerification"("userId");

-- CreateIndex
CREATE INDEX "KycVerification_status_idx" ON "KycVerification"("status");

-- CreateIndex
CREATE INDEX "KycVerification_createdAt_idx" ON "KycVerification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AmlRiskProfile_userId_key" ON "AmlRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "AmlRiskProfile_userId_idx" ON "AmlRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "AmlRiskProfile_riskScore_idx" ON "AmlRiskProfile"("riskScore");

-- CreateIndex
CREATE INDEX "DunningAttempt_subscriptionId_idx" ON "DunningAttempt"("subscriptionId");

-- CreateIndex
CREATE INDEX "DunningAttempt_status_idx" ON "DunningAttempt"("status");

-- CreateIndex
CREATE INDEX "DunningAttempt_scheduledAt_idx" ON "DunningAttempt"("scheduledAt");

-- CreateIndex
CREATE INDEX "PaymentMethodUpdateRequest_userId_idx" ON "PaymentMethodUpdateRequest"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethodUpdateRequest_subscriptionId_idx" ON "PaymentMethodUpdateRequest"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentMethodUpdateRequest_status_idx" ON "PaymentMethodUpdateRequest"("status");

-- CreateIndex
CREATE INDEX "Chargeback_userId_idx" ON "Chargeback"("userId");

-- CreateIndex
CREATE INDEX "Chargeback_creatorId_idx" ON "Chargeback"("creatorId");

-- CreateIndex
CREATE INDEX "Chargeback_paymentId_idx" ON "Chargeback"("paymentId");

-- CreateIndex
CREATE INDEX "Chargeback_provider_idx" ON "Chargeback"("provider");

-- CreateIndex
CREATE INDEX "Chargeback_status_idx" ON "Chargeback"("status");

-- CreateIndex
CREATE INDEX "Chargeback_createdAt_idx" ON "Chargeback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorWallet_userId_key" ON "CreatorWallet"("userId");

-- CreateIndex
CREATE INDEX "CreatorWallet_userId_idx" ON "CreatorWallet"("userId");

-- CreateIndex
CREATE INDEX "PayoutHistory_walletId_idx" ON "PayoutHistory"("walletId");

-- CreateIndex
CREATE INDEX "PayoutHistory_status_idx" ON "PayoutHistory"("status");

-- CreateIndex
CREATE INDEX "PayoutHistory_createdAt_idx" ON "PayoutHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Earnings_creatorId_idx" ON "Earnings"("creatorId");

-- CreateIndex
CREATE INDEX "Earnings_paymentId_idx" ON "Earnings"("paymentId");

-- CreateIndex
CREATE INDEX "Earnings_type_idx" ON "Earnings"("type");

-- CreateIndex
CREATE INDEX "Earnings_createdAt_idx" ON "Earnings"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_externalId_idx" ON "PaymentTransaction"("externalId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_countryCode_idx" ON "PaymentTransaction"("countryCode");

-- CreateIndex
CREATE INDEX "Subscription_renewalDate_idx" ON "Subscription"("renewalDate");

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmlRiskProfile" ADD CONSTRAINT "AmlRiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DunningAttempt" ADD CONSTRAINT "DunningAttempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodUpdateRequest" ADD CONSTRAINT "PaymentMethodUpdateRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorWallet" ADD CONSTRAINT "CreatorWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutHistory" ADD CONSTRAINT "PayoutHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreatorWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earnings" ADD CONSTRAINT "Earnings_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earnings" ADD CONSTRAINT "Earnings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
