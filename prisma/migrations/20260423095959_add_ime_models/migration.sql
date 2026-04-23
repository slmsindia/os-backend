-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Identity" AS ENUM ('SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'SUPPORT_TEAM', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER', 'BUSINESS_PARTNER', 'SAATHI', 'MEMBER', 'AGENT', 'USER');

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
    "email" TEXT,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "identity" "Identity" NOT NULL DEFAULT 'USER',
    "userType" TEXT NOT NULL DEFAULT 'USER',
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedAt" TIMESTAMP(3),
    "roleId" TEXT,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdBy" TEXT,
    "referredBy" TEXT,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber1" TEXT NOT NULL,
    "contactNumber2" TEXT,
    "companyLogoUrl" TEXT,
    "sectorId" TEXT NOT NULL,
    "businessType" INTEGER NOT NULL DEFAULT 0,
    "employerType" INTEGER NOT NULL DEFAULT 0,
    "serviceCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber1" TEXT NOT NULL,
    "contactNumber2" TEXT,
    "sectorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" INTEGER NOT NULL DEFAULT 1,
    "razorPayReferenceNo" TEXT,
    "address" JSONB,
    "documents" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "jobType" INTEGER NOT NULL DEFAULT 0,
    "payStructure" INTEGER NOT NULL DEFAULT 0,
    "offeredAmount" DOUBLE PRECISION NOT NULL,
    "educationId" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "gender" "Gender" NOT NULL DEFAULT 'OTHER',
    "minAge" INTEGER NOT NULL DEFAULT 18,
    "maxAge" INTEGER NOT NULL DEFAULT 60,
    "officeStartTime" TEXT NOT NULL,
    "officeEndTime" TEXT NOT NULL,
    "address" JSONB,
    "facilities" TEXT[],
    "isJoiningFees" BOOLEAN NOT NULL DEFAULT false,
    "joiningAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joiningFeeReason" INTEGER[],
    "contactName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "isUrgentHiring" BOOLEAN NOT NULL DEFAULT false,
    "noOfOpenings" INTEGER NOT NULL DEFAULT 1,
    "shiftType" INTEGER NOT NULL DEFAULT 0,
    "weekOffDays" INTEGER[],
    "skillIds" TEXT[],
    "sectorId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "applicationCloseDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFacility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "MembershipConfig" (
    "id" TEXT NOT NULL,
    "membershipPrice" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "educationId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "citizenship" TEXT NOT NULL,
    "isMigrantWorker" BOOLEAN NOT NULL,
    "monthlyIncome" TEXT NOT NULL,
    "currentCountry" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "currentDistrict" TEXT NOT NULL,
    "currentAddress" TEXT NOT NULL,
    "currentPincode" TEXT NOT NULL,
    "permanentCountry" TEXT NOT NULL,
    "permanentState" TEXT NOT NULL,
    "permanentDistrict" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "permanentPincode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPayment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "frontImageUrl" TEXT NOT NULL,
    "backImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTopUpRequest" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bankDetailsId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "depositDate" TIMESTAMP(3) NOT NULL,
    "utrNumber" TEXT NOT NULL,
    "paymentScreenshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "isResubmitted" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopUpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrabhuTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderMobile" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverMobile" TEXT NOT NULL,
    "sendCountry" TEXT NOT NULL DEFAULT 'India',
    "payoutCountry" TEXT NOT NULL DEFAULT 'Nepal',
    "paymentMode" TEXT NOT NULL,
    "transferAmount" TEXT NOT NULL,
    "sendAmount" TEXT NOT NULL,
    "sendCurrency" TEXT NOT NULL DEFAULT 'INR',
    "payAmount" TEXT NOT NULL,
    "payCurrency" TEXT NOT NULL DEFAULT 'NPR',
    "exchangeRate" TEXT NOT NULL DEFAULT '1.6',
    "serviceCharge" TEXT NOT NULL,
    "collectedAmount" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "partnerPinNo" TEXT NOT NULL,
    "remittanceReason" TEXT NOT NULL,
    "sourceOfFund" TEXT NOT NULL,
    "cspCode" TEXT NOT NULL,
    "otpProcessId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankBranchId" TEXT NOT NULL,
    "transactionId" TEXT,
    "pinNo" TEXT NOT NULL,
    "responseCode" TEXT NOT NULL DEFAULT '000',
    "responseMessage" TEXT NOT NULL DEFAULT 'Success',
    "transactionStatus" TEXT NOT NULL DEFAULT 'Success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrabhuTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMECustomer" (
    "id" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "fatherOrMotherName" TEXT NOT NULL,
    "email" TEXT,
    "occupation" TEXT NOT NULL,
    "sourceOfFund" TEXT,
    "permanentState" TEXT NOT NULL,
    "permanentDistrict" TEXT NOT NULL,
    "permanentMunicipality" TEXT,
    "permanentAddress" TEXT NOT NULL,
    "permanentWardNo" TEXT,
    "permanentHouseNo" TEXT,
    "tempState" TEXT NOT NULL,
    "tempDistrict" TEXT NOT NULL,
    "tempAddress" TEXT NOT NULL,
    "tempPostalCode" TEXT,
    "tempHouseNo" TEXT,
    "idType" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "idPlaceOfIssue" TEXT,
    "idIssueDate" TEXT NOT NULL,
    "idExpiryDate" TEXT,
    "idNoCitizenship" TEXT,
    "idIssuePlaceCitizenship" TEXT,
    "idIssueDateCitizenship" TEXT,
    "idData" TEXT,
    "idDataType" TEXT,
    "photoData" TEXT,
    "photoDataType" TEXT,
    "customerToken" TEXT,
    "imeCustomerId" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'Pending',
    "amlStatus" BOOLEAN NOT NULL DEFAULT false,
    "aadharNo" TEXT,
    "eKycStatus" TEXT,
    "eKycUniqueId" TEXT,
    "eKycOttToken" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMECustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMETransaction" (
    "id" TEXT NOT NULL,
    "agentTxnRefId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "senderMobileNo" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderOccupation" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "receiverGender" TEXT NOT NULL,
    "receiverMobileNo" TEXT NOT NULL,
    "receiverCity" TEXT,
    "receiverCountry" TEXT NOT NULL DEFAULT 'NPL',
    "receiverState" TEXT NOT NULL,
    "receiverDistrict" TEXT NOT NULL,
    "receiverMunicipality" TEXT NOT NULL,
    "forexSessionId" TEXT NOT NULL,
    "remitAmount" DOUBLE PRECISION NOT NULL,
    "collectAmount" DOUBLE PRECISION NOT NULL,
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "serviceCharge" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "payoutCurrency" TEXT NOT NULL DEFAULT 'NPR',
    "paymentType" TEXT NOT NULL,
    "bankId" TEXT,
    "bankBranchId" TEXT,
    "bankAccountNumber" TEXT,
    "sourceOfFund" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "purposeOfRemittance" TEXT NOT NULL,
    "calcBy" TEXT NOT NULL,
    "refNo" TEXT,
    "icn" TEXT,
    "otpToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidDate" TIMESTAMP(3),
    "cancelDate" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelCharge" DOUBLE PRECISION,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMETransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMEStaticData" (
    "id" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "referenceValue" TEXT,
    "itemId" TEXT NOT NULL,
    "itemValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMEStaticData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMECSP" (
    "id" TEXT NOT NULL,
    "partnerCSPCode" TEXT NOT NULL,
    "cspName" TEXT NOT NULL,
    "registrationType" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "contractExpiryDate" TEXT NOT NULL,
    "contractRenewalDate" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "roadName" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "addressProofType" TEXT NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "mobileNumber1" TEXT NOT NULL,
    "mobileNumber2" TEXT,
    "landlineNumber" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "imeStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMECSP_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- CreateIndex
CREATE INDEX "BusinessApplication_userId_idx" ON "BusinessApplication"("userId");

-- CreateIndex
CREATE INDEX "BusinessApplication_status_idx" ON "BusinessApplication"("status");

-- CreateIndex
CREATE INDEX "JobPost_businessId_idx" ON "JobPost"("businessId");

-- CreateIndex
CREATE INDEX "JobPost_sectorId_idx" ON "JobPost"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobFacility_name_key" ON "JobFacility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

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

-- CreateIndex
CREATE UNIQUE INDEX "Education_name_key" ON "Education"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_key" ON "JobRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "MembershipApplication_userId_idx" ON "MembershipApplication"("userId");

-- CreateIndex
CREATE INDEX "MembershipApplication_status_idx" ON "MembershipApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPayment_applicationId_key" ON "MembershipPayment"("applicationId");

-- CreateIndex
CREATE INDEX "MembershipPayment_applicationId_idx" ON "MembershipPayment"("applicationId");

-- CreateIndex
CREATE INDEX "MembershipPayment_razorpayOrderId_idx" ON "MembershipPayment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "MembershipDocument_applicationId_idx" ON "MembershipDocument"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "BankDetails_isActive_idx" ON "BankDetails"("isActive");

-- CreateIndex
CREATE INDEX "WalletTopUpRequest_walletId_idx" ON "WalletTopUpRequest"("walletId");

-- CreateIndex
CREATE INDEX "WalletTopUpRequest_status_idx" ON "WalletTopUpRequest"("status");

-- CreateIndex
CREATE INDEX "WalletTopUpRequest_utrNumber_idx" ON "WalletTopUpRequest"("utrNumber");

-- CreateIndex
CREATE INDEX "PrabhuTransaction_customerId_idx" ON "PrabhuTransaction"("customerId");

-- CreateIndex
CREATE INDEX "PrabhuTransaction_pinNo_idx" ON "PrabhuTransaction"("pinNo");

-- CreateIndex
CREATE INDEX "PrabhuTransaction_transactionStatus_idx" ON "PrabhuTransaction"("transactionStatus");

-- CreateIndex
CREATE INDEX "PrabhuTransaction_createdAt_idx" ON "PrabhuTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IMECustomer_mobileNo_key" ON "IMECustomer"("mobileNo");

-- CreateIndex
CREATE INDEX "IMECustomer_mobileNo_idx" ON "IMECustomer"("mobileNo");

-- CreateIndex
CREATE INDEX "IMECustomer_kycStatus_idx" ON "IMECustomer"("kycStatus");

-- CreateIndex
CREATE INDEX "IMECustomer_userId_idx" ON "IMECustomer"("userId");

-- CreateIndex
CREATE INDEX "IMECustomer_createdAt_idx" ON "IMECustomer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IMETransaction_agentTxnRefId_key" ON "IMETransaction"("agentTxnRefId");

-- CreateIndex
CREATE INDEX "IMETransaction_customerId_idx" ON "IMETransaction"("customerId");

-- CreateIndex
CREATE INDEX "IMETransaction_agentTxnRefId_idx" ON "IMETransaction"("agentTxnRefId");

-- CreateIndex
CREATE INDEX "IMETransaction_icn_idx" ON "IMETransaction"("icn");

-- CreateIndex
CREATE INDEX "IMETransaction_status_idx" ON "IMETransaction"("status");

-- CreateIndex
CREATE INDEX "IMETransaction_transactionDate_idx" ON "IMETransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "IMEStaticData_typeCode_idx" ON "IMEStaticData"("typeCode");

-- CreateIndex
CREATE INDEX "IMEStaticData_isActive_idx" ON "IMEStaticData"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IMEStaticData_typeCode_referenceValue_itemId_key" ON "IMEStaticData"("typeCode", "referenceValue", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "IMECSP_partnerCSPCode_key" ON "IMECSP"("partnerCSPCode");

-- CreateIndex
CREATE INDEX "IMECSP_partnerCSPCode_idx" ON "IMECSP"("partnerCSPCode");

-- CreateIndex
CREATE INDEX "IMECSP_status_idx" ON "IMECSP"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApplication" ADD CONSTRAINT "BusinessApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApplication" ADD CONSTRAINT "BusinessApplication_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "Education"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "Education"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPayment" ADD CONSTRAINT "MembershipPayment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDocument" ADD CONSTRAINT "MembershipDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDocument" ADD CONSTRAINT "MembershipDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUpRequest" ADD CONSTRAINT "WalletTopUpRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUpRequest" ADD CONSTRAINT "WalletTopUpRequest_bankDetailsId_fkey" FOREIGN KEY ("bankDetailsId") REFERENCES "BankDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMETransaction" ADD CONSTRAINT "IMETransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "IMECustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
