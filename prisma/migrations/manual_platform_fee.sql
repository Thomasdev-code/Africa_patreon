-- Manual migration script for PlatformFee table
-- Run this if the table doesn't exist yet

CREATE TABLE IF NOT EXISTS "PlatformFee" (
    "id" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- Insert default platform fee if none exists
INSERT INTO "PlatformFee" ("id", "percentage", "updatedAt", "createdAt")
SELECT 
    gen_random_uuid()::text,
    5.0,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PlatformFee");

