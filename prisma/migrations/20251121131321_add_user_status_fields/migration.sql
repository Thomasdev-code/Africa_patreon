-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false;
