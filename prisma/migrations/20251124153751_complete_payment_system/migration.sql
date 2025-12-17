-- DropIndex
DROP INDEX "User_referralCode_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCodeId" TEXT;

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "subscriptionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_provider_idx" ON "PaymentEvent"("provider");

-- CreateIndex
CREATE INDEX "PaymentEvent_type_idx" ON "PaymentEvent"("type");

-- CreateIndex
CREATE INDEX "PaymentEvent_userId_idx" ON "PaymentEvent"("userId");

-- CreateIndex
CREATE INDEX "PaymentEvent_subscriptionId_idx" ON "PaymentEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentEvent_status_idx" ON "PaymentEvent"("status");

-- CreateIndex
CREATE INDEX "PaymentEvent_timestamp_idx" ON "PaymentEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_userId_idx" ON "ReferralCode"("userId");

-- CreateIndex
CREATE INDEX "ReferralPayout_referralId_idx" ON "ReferralPayout"("referralId");

-- CreateIndex
CREATE INDEX "ReferralPayout_creatorId_idx" ON "ReferralPayout"("creatorId");

-- CreateIndex
CREATE INDEX "ReferralPayout_status_idx" ON "ReferralPayout"("status");

-- CreateIndex
CREATE INDEX "ReferralPayout_createdAt_idx" ON "ReferralPayout"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add referralCodeId column to Referral table
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referralCodeId" TEXT;

-- Create ReferralCode records for existing referral codes
-- This creates a ReferralCode for each unique referralCode in Referral table
-- We'll use a dummy userId for orphaned codes (they can be cleaned up later)
INSERT INTO "ReferralCode" ("id", "code", "userId", "isActive", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text as id,
    r."referralCode" as code,
    COALESCE((SELECT "referrerId" FROM "Referral" r2 WHERE r2."referralCode" = r."referralCode" LIMIT 1), '00000000000000000000') as userId,
    true as "isActive",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM (SELECT DISTINCT "referralCode" FROM "Referral" WHERE "referralCode" IS NOT NULL) r
ON CONFLICT ("code") DO NOTHING;

-- Update Referral.referralCodeId based on ReferralCode.code
UPDATE "Referral" r
SET "referralCodeId" = rc."id"
FROM "ReferralCode" rc
WHERE r."referralCode" = rc."code"
AND r."referralCode" IS NOT NULL;

-- AddForeignKey for referralCodeId
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
