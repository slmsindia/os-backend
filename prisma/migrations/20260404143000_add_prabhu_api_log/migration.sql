-- CreateTable
CREATE TABLE "PrabhuApiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "endpointPath" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "errorPayload" JSONB,
    "userId" TEXT,
    "tenantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PrabhuApiLog_operation_idx" ON "PrabhuApiLog"("operation");

-- CreateIndex
CREATE INDEX "PrabhuApiLog_integration_idx" ON "PrabhuApiLog"("integration");

-- CreateIndex
CREATE INDEX "PrabhuApiLog_tenantId_idx" ON "PrabhuApiLog"("tenantId");

-- CreateIndex
CREATE INDEX "PrabhuApiLog_userId_idx" ON "PrabhuApiLog"("userId");

-- CreateIndex
CREATE INDEX "PrabhuApiLog_createdAt_idx" ON "PrabhuApiLog"("createdAt");
