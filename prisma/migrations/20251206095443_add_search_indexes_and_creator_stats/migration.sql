-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CreatorStats" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "newSubscribers" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "recentPosts" INTEGER NOT NULL DEFAULT 0,
    "daysSinceLastPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorStats_creatorId_key" ON "CreatorStats"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorStats_trendingScore_idx" ON "CreatorStats"("trendingScore");

-- CreateIndex
CREATE INDEX "CreatorStats_creatorId_idx" ON "CreatorStats"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorStats_lastCalculated_idx" ON "CreatorStats"("lastCalculated");

-- CreateIndex
CREATE INDEX "CreatorProfile_username_idx" ON "CreatorProfile"("username");

-- CreateIndex
CREATE INDEX "CreatorProfile_bio_idx" ON "CreatorProfile"("bio");

-- CreateIndex
CREATE INDEX "CreatorProfile_tags_idx" ON "CreatorProfile"("tags");

-- CreateIndex
CREATE INDEX "Poll_question_idx" ON "Poll"("question");

-- CreateIndex
CREATE INDEX "Post_title_idx" ON "Post"("title");

-- CreateIndex
CREATE INDEX "Post_content_idx" ON "Post"("content");

-- CreateIndex
CREATE INDEX "Post_mediaType_idx" ON "Post"("mediaType");

-- AddForeignKey
ALTER TABLE "CreatorStats" ADD CONSTRAINT "CreatorStats_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
