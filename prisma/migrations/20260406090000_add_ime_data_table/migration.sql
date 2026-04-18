-- CreateTable
CREATE TABLE "ImeData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "sendAmountInr" REAL,
    "receiveAmountNpr" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ImeData_mobile_idx" ON "ImeData"("mobile");

-- CreateIndex
CREATE INDEX "ImeData_createdAt_idx" ON "ImeData"("createdAt");
