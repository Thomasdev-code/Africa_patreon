/*
  Warnings:

  - You are about to drop the column `text` on the `PollOption` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,optionId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `label` to the `PollOption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PollOption" DROP COLUMN "text",
ADD COLUMN     "label" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Poll_isPublished_idx" ON "Poll"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_optionId_key" ON "Vote"("userId", "optionId");
