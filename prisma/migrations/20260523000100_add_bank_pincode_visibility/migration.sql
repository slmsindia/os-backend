-- Pincode-wise visibility for existing official bank accounts.
CREATE TABLE "BankPincodeVisibility" (
    "id" TEXT NOT NULL,
    "bankDetailsId" TEXT NOT NULL,
    "tenantId" TEXT,
    "pincode" TEXT NOT NULL,
    "locationName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankPincodeVisibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankPincodeVisibility_tenantId_bankDetailsId_pincode_key"
ON "BankPincodeVisibility"("tenantId", "bankDetailsId", "pincode");

CREATE INDEX "BankPincodeVisibility_tenantId_pincode_isActive_idx"
ON "BankPincodeVisibility"("tenantId", "pincode", "isActive");

CREATE INDEX "BankPincodeVisibility_bankDetailsId_idx"
ON "BankPincodeVisibility"("bankDetailsId");

ALTER TABLE "BankPincodeVisibility"
ADD CONSTRAINT "BankPincodeVisibility_bankDetailsId_fkey"
FOREIGN KEY ("bankDetailsId") REFERENCES "BankDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankPincodeVisibility"
ADD CONSTRAINT "BankPincodeVisibility_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
