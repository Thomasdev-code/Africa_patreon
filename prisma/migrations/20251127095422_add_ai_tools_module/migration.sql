-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "AiUsageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolType" TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB,
    "output" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageHistory_userId_idx" ON "AiUsageHistory"("userId");

-- CreateIndex
CREATE INDEX "AiUsageHistory_toolType_idx" ON "AiUsageHistory"("toolType");

-- CreateIndex
CREATE INDEX "AiUsageHistory_createdAt_idx" ON "AiUsageHistory"("createdAt");

-- CreateIndex
CREATE INDEX "User_subscriptionPlan_idx" ON "User"("subscriptionPlan");

-- AddForeignKey
ALTER TABLE "AiUsageHistory" ADD CONSTRAINT "AiUsageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
