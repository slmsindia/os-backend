-- Manual Database Update Script for PrabhuTransaction
-- Run this script manually in your PostgreSQL database

-- Step 1: Add userId column to PrabhuTransaction table
ALTER TABLE "PrabhuTransaction" 
ADD COLUMN "userId" TEXT;

-- Step 2: Create index for userId for better performance
CREATE INDEX "PrabhuTransaction_userId_idx" ON "PrabhuTransaction"("userId");

-- Step 3: Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'PrabhuTransaction' AND column_name = 'userId';
