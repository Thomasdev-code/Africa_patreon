-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_creatorId_idx" ON "Follow"("creatorId");

-- CreateIndex
CREATE INDEX "Follow_fanId_idx" ON "Follow"("fanId");

-- CreateIndex
CREATE INDEX "Follow_createdAt_idx" ON "Follow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_fanId_creatorId_key" ON "Follow"("fanId", "creatorId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
