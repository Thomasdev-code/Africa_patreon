-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "creatorEarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'subscription';

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "creatorEarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformFee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE INDEX "Config_key_idx" ON "Config"("key");
