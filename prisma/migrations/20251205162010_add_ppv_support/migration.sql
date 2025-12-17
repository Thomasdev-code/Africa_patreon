-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isPPV" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ppvCurrency" TEXT,
ADD COLUMN     "ppvPrice" INTEGER;

-- CreateTable
CREATE TABLE "PPVPurchase" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PPVPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PPVPurchase_postId_idx" ON "PPVPurchase"("postId");

-- CreateIndex
CREATE INDEX "PPVPurchase_fanId_idx" ON "PPVPurchase"("fanId");

-- CreateIndex
CREATE INDEX "PPVPurchase_createdAt_idx" ON "PPVPurchase"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PPVPurchase_fanId_postId_key" ON "PPVPurchase"("fanId", "postId");

-- CreateIndex
CREATE INDEX "Post_isPPV_idx" ON "Post"("isPPV");

-- AddForeignKey
ALTER TABLE "PPVPurchase" ADD CONSTRAINT "PPVPurchase_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPVPurchase" ADD CONSTRAINT "PPVPurchase_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
