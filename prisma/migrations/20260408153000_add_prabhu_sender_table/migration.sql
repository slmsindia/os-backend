-- CreateTable
CREATE TABLE "PrabhuSender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "nationality" TEXT,
    "email" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "idExpiryDate" TEXT,
    "idIssuedPlace" TEXT,
    "sourceIncomeType" TEXT,
    "customerType" TEXT,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PrabhuSender_customerId_key" ON "PrabhuSender"("customerId");

-- CreateIndex
CREATE INDEX "PrabhuSender_mobile_idx" ON "PrabhuSender"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuSender_createdAt_idx" ON "PrabhuSender"("createdAt");
