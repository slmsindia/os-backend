-- Add userId field to PrabhuTransaction table
ALTER TABLE "PrabhuTransaction" 
ADD COLUMN "userId" TEXT;

-- Create index for userId for better performance
CREATE INDEX "PrabhuTransaction_userId_idx" ON "PrabhuTransaction"("userId");
