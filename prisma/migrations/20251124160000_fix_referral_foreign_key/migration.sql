-- First, drop the failed foreign key constraint if it exists
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referralCode_fkey";

-- Add referralCodeId column if it doesn't exist
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referralCodeId" TEXT;

-- Create ReferralCode records for existing referral codes in Referral table
-- Use the referrerId as the userId for the ReferralCode
INSERT INTO "ReferralCode" ("id", "code", "userId", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT ON (r."referralCode")
    gen_random_uuid()::text as id,
    r."referralCode" as code,
    (SELECT "referrerId" FROM "Referral" r2 WHERE r2."referralCode" = r."referralCode" AND r2."referrerId" IS NOT NULL LIMIT 1) as userId,
    true as "isActive",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "Referral" r
WHERE r."referralCode" IS NOT NULL 
AND r."referralCode" NOT IN (SELECT "code" FROM "ReferralCode")
AND EXISTS (SELECT 1 FROM "Referral" r2 WHERE r2."referralCode" = r."referralCode" AND r2."referrerId" IS NOT NULL)
ON CONFLICT ("code") DO NOTHING;

-- For orphaned codes (no referrerId), create with a placeholder user
-- You may want to clean these up later
INSERT INTO "ReferralCode" ("id", "code", "userId", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT ON (r."referralCode")
    gen_random_uuid()::text as id,
    r."referralCode" as code,
    COALESCE((SELECT "id" FROM "User" WHERE "role" = 'admin' LIMIT 1), (SELECT "id" FROM "User" LIMIT 1)) as userId,
    false as "isActive",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "Referral" r
WHERE r."referralCode" IS NOT NULL 
AND r."referralCode" NOT IN (SELECT "code" FROM "ReferralCode")
AND NOT EXISTS (SELECT 1 FROM "Referral" r2 WHERE r2."referralCode" = r."referralCode" AND r2."referrerId" IS NOT NULL)
ON CONFLICT ("code") DO NOTHING;

-- Update Referral.referralCodeId based on ReferralCode.code
UPDATE "Referral" r
SET "referralCodeId" = rc."id"
FROM "ReferralCode" rc
WHERE r."referralCode" = rc."code"
AND r."referralCode" IS NOT NULL
AND r."referralCodeId" IS NULL;

-- Now add the foreign key constraint on referralCodeId (if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Referral_referralCodeId_fkey'
    ) THEN
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCodeId_fkey" 
        FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

