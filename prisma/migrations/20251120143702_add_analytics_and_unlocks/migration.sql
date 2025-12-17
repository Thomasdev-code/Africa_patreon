-- CreateTable
CREATE TABLE "PostUnlock" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostUnlock_postId_idx" ON "PostUnlock"("postId");

-- CreateIndex
CREATE INDEX "PostUnlock_fanId_idx" ON "PostUnlock"("fanId");

-- CreateIndex
CREATE INDEX "PostUnlock_unlockedAt_idx" ON "PostUnlock"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostUnlock_fanId_postId_key" ON "PostUnlock"("fanId", "postId");

-- AddForeignKey
ALTER TABLE "PostUnlock" ADD CONSTRAINT "PostUnlock_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostUnlock" ADD CONSTRAINT "PostUnlock_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
