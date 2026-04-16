-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Identity" AS ENUM ('ADMIN', 'STATE_PARTNER', 'DISTRICT_PARTNER', 'AGENT', 'USER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "identity" "Identity" NOT NULL DEFAULT 'USER',
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdBy" TEXT,
    "referredBy" TEXT,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrabhuApiLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrabhuApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImeData" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "sendAmountInr" DOUBLE PRECISION,
    "receiveAmountNpr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrabhuData" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "purposeOfTransaction" TEXT,
    "paymentMode" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "sendAmountInr" DOUBLE PRECISION,
    "receiveAmountNpr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrabhuData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrabhuReceiver" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrabhuReceiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrabhuSender" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrabhuSender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_parentId_idx" ON "User"("parentId");

-- CreateIndex
CREATE INDEX "User_createdBy_idx" ON "User"("createdBy");

-- CreateIndex
CREATE INDEX "User_referredBy_idx" ON "User"("referredBy");

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

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

-- CreateIndex
CREATE INDEX "OtpCode_mobile_idx" ON "OtpCode"("mobile");

-- CreateIndex
CREATE INDEX "ImeData_mobile_idx" ON "ImeData"("mobile");

-- CreateIndex
CREATE INDEX "ImeData_createdAt_idx" ON "ImeData"("createdAt");

-- CreateIndex
CREATE INDEX "PrabhuData_mobile_idx" ON "PrabhuData"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuData_createdAt_idx" ON "PrabhuData"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrabhuReceiver_receiverId_key" ON "PrabhuReceiver"("receiverId");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_customerId_idx" ON "PrabhuReceiver"("customerId");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_mobile_idx" ON "PrabhuReceiver"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuReceiver_createdAt_idx" ON "PrabhuReceiver"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrabhuSender_customerId_key" ON "PrabhuSender"("customerId");

-- CreateIndex
CREATE INDEX "PrabhuSender_mobile_idx" ON "PrabhuSender"("mobile");

-- CreateIndex
CREATE INDEX "PrabhuSender_createdAt_idx" ON "PrabhuSender"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
