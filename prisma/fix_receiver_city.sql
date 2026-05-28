-- ===================================================
-- Fix ALL missing columns in ImeTransaction table
-- ===================================================
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "receiverCity" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "otp" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "icn" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "senderCustomerId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "receiverCustomerId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "receiverId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "sendAmount" DOUBLE PRECISION;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "serviceCharge" DOUBLE PRECISION;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "sourceCurrency" TEXT DEFAULT 'INR';
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "destinationCurrency" TEXT DEFAULT 'NPR';
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "purposeOfRemittance" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "sourceOfFund" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "relationship" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "bankCode" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "bankBranchId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "otpProcessId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "agentSessionId" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "imeResponsePayload" JSONB;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "requestPayload" JSONB;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "responseCode" TEXT;
ALTER TABLE "ImeTransaction" ADD COLUMN IF NOT EXISTS "responseMessage" TEXT;

-- ===================================================
-- Fix ALL missing columns in ImeReceiver table
-- ===================================================
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "purposeOfRemittance" TEXT;
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "countryCode" TEXT DEFAULT 'NP';
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "agentSessionId" TEXT;
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "imeResponseCode" TEXT;
ALTER TABLE "ImeReceiver" ADD COLUMN IF NOT EXISTS "imeResponseMessage" TEXT;
