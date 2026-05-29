-- CreateTable
CREATE TABLE "PrabhuData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "purposeOfTransaction" TEXT,
    "paymentMode" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "sendAmountInr" REAL,
    "receiveAmountNpr" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PrabhuData_mobile_idx" ON "PrabhuData"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuData_createdAt_idx" ON "PrabhuData"("createdAt");
