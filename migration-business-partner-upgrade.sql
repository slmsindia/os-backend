-- Migration: Add Business Partner Upgrade System
-- Date: 2026-04-14
-- Description: Adds BUSINESS_PARTNER to Identity enum and creates BusinessPartnerApplication table

-- Step 1: Add BUSINESS_PARTNER to Identity enum
ALTER TYPE "Identity" ADD VALUE 'BUSINESS_PARTNER';

-- Step 2: Create BusinessPartnerApplication table
CREATE TABLE "BusinessPartnerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNo" TEXT,
    "gstNumber" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "businessPlan" TEXT,
    "expectedJobs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPartnerApplication_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes
CREATE UNIQUE INDEX "BusinessPartnerApplication_userId_key" ON "BusinessPartnerApplication"("userId");
CREATE INDEX "BusinessPartnerApplication_userId_idx" ON "BusinessPartnerApplication"("userId");
CREATE INDEX "BusinessPartnerApplication_status_idx" ON "BusinessPartnerApplication"("status");
CREATE INDEX "BusinessPartnerApplication_createdAt_idx" ON "BusinessPartnerApplication"("createdAt");

-- Step 4: Add foreign key constraints
ALTER TABLE "BusinessPartnerApplication" 
    ADD CONSTRAINT "BusinessPartnerApplication_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessPartnerApplication" 
    ADD CONSTRAINT "BusinessPartnerApplication_reviewedBy_fkey" 
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add relation columns to User table (if not exists)
-- Note: These should already exist from schema.prisma relations
-- bpApplication and reviewedBPApplications are handled by Prisma relations
