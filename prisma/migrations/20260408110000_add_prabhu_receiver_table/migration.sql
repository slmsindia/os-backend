-- CreateTable
CREATE TABLE "PrabhuReceiver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "receiverId" TEXT,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "relationship" TEXT,
    "gender" TEXT,
    "paymentMode" TEXT,
    "bankCode" TEXT,
    "bankBranchId" TEXT,
    "accountNumber" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PrabhuReceiver_receiverId_key" ON "PrabhuReceiver"("receiverId");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_customerId_idx" ON "PrabhuReceiver"("customerId");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_mobile_idx" ON "PrabhuReceiver"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_createdAt_idx" ON "PrabhuReceiver"("createdAt");
