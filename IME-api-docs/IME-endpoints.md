# IME API Endpoints Documentation

Complete documentation of all IME (International Money Express) API endpoints with detailed descriptions, use cases, and when to use each endpoint.

---

## Table of Contents
1. [Authentication & Session Management](#1-authentication--session-management)
2. [Customer Operations](#2-customer-operations)
3. [Transaction/Remittance Operations](#3-transactionremittance-operations)
4. [Receiver Management](#4-receiver-management)
5. [Bank & Payment Operations](#5-bank--payment-operations)
6. [Static Data & Dropdown Lists](#6-static-data--dropdown-lists)
7. [Compliance & Verification](#7-compliance--verification)
8. [Reporting & Queries](#8-reporting--queries)
9. [Phase 2 eKYC Endpoints](#9-phase-2-ekyc-endpoints)
10. [Legacy IME Contract Routes](#10-legacy-ime-contract-routes)

---

## 1. Authentication & Session Management

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/authenticate` | POST | Authenticate agent/partner with IME system using credentials. Establishes session for subsequent API calls. | Use at the start of any IME session to get authentication token/session ID. Required before any transaction or customer operation. |
| `/api/ime/login` | POST | Alternative login endpoint for agent authentication. May include additional login parameters. | Use as fallback if authenticate endpoint fails. Provides same functionality with different request format. |

---

## 2. Customer Operations

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/customers/send-otp` | POST | Send OTP to customer's mobile number for verification. Generates and sends 6-digit code via SMS. | Use before creating or confirming customer registration. Required for mobile number verification and security. |
| `/api/ime/customers/confirm` | POST | Confirm customer registration by validating OTP sent to mobile. Completes the registration process. | Use after customer receives OTP. Required to activate customer account and enable transactions. |
| `/api/ime/customers` | POST | Create new customer/sender profile with complete KYC details including name, address, ID proof, etc. | Use when onboarding new money transfer customers. Collects all mandatory sender information as per compliance. |
| `/api/ime/customers/search/mobile/:mobile` | GET | Search for existing customer by mobile number. Returns customer details if found. | Use before creating new customer to check if customer already exists. Prevents duplicate registrations. |
| `/api/ime/customers/requery` | GET | Requery customer details from IME system to get latest status and information. | Use when customer data might have changed or to verify current customer status after long period. |
| `/api/ime/customers/:customerId` | GET | Get complete customer profile by customer ID. Returns all stored information including KYC status. | Use to retrieve full customer details for display, verification, or before processing transactions. |
| `/api/ime/customers/validate` | POST | Validate customer information without creating record. Checks if data meets IME requirements. | Use during form validation before submission. Helps catch errors early and improves UX. |

---

## 3. Transaction/Remittance Operations

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/transactions/send` | POST | Initiate new money transfer transaction. Creates transaction with sender, receiver, amount, and payment details. | Use when customer wants to send money internationally. Core endpoint for all remittance operations. |
| `/api/ime/transactions/:transactionId/status` | GET | Check current status of a transaction (Pending, Completed, Cancelled, etc.). Returns transaction details. | Use to track transaction progress, inform customer of status, or verify completion before delivery. |
| `/api/ime/transactions/:transactionId/cancel` | POST | Cancel an existing transaction. Only works if transaction is still in pending/processable state. | Use when customer requests cancellation or transaction has issues. Check status first to ensure cancellable. |

---

## 4. Receiver Management

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/receivers` | POST | Create new receiver/beneficiary profile with complete details including name, location, and payment info. | Use when adding new beneficiary for money transfer. Receiver must exist before sending money. |
| `/api/ime/receivers/:receiverId` | GET | Get complete receiver profile by receiver ID. Returns all stored information and status. | Use to verify receiver details before transaction or to display saved beneficiaries. |
| `/api/ime/receivers/:receiverId` | PATCH | Update existing receiver information. Allows modification of name, address, payment details, etc. | Use when receiver information changes or corrections needed. Maintains accurate beneficiary records. |

---

## 5. Bank & Payment Operations

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/payment-modes` | GET | Get list of available payment modes (Cash, Bank Transfer, Card, etc.) for transactions. | Use during transaction creation to show customer available payment options. |
| `/api/ime/bank-accounts/validate` | POST | Validate bank account details (account number, IFSC, etc.) before using in transaction. | Use before creating transaction with bank payment mode. Ensures account details are correct. |
| `/api/ime/banks` | GET | Get list of all available banks for the specified country. Returns bank codes and names. | Use to populate bank dropdown in UI. Required before selecting bank branch or validating account. |
| `/api/ime/bank-branches` | GET | Get list of bank branches for a specific bank. Accepts query parameters: `bankId`, `countryCode`. | Use to populate branch dropdown after bank selection. Required for branch-based transactions. |
| `/api/ime/static-data` | GET | Generic endpoint to get any static reference data by TypeCode. Flexible data retrieval. | Use for custom data retrieval when specific endpoint not available. Requires knowledge of TypeCodes. |
| `/api/ime/id-issue-places` | GET | Get list of ID issue places (RTO, Passport Office, etc.) for specified ID type and country. | Use when filling customer KYC form to populate ID place of issue dropdown. |

---

## 6. Static Data & Dropdown Lists

**Note:** All these endpoints return reference data for form dropdowns. Data rarely changes and should be cached.

### Location Data

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/Countries` | GET | Get list of all countries supported by IME. Returns country codes and names. | Use to populate country dropdown in customer/receiver forms. Call once and cache. | WSST-CONV1 |
| `/api/ime/States/:CountryId` | GET | Get list of states/provinces for specified country. Pass country code as parameter. | Use after country selection to populate state dropdown. Chain with country selection. | WSST-STTV1 |
| `/api/ime/Districts/:StateId` | GET | Get list of districts for specified state. Pass state ID as parameter. | Use after state selection to populate district dropdown. Chain with state selection. | WSST-DISV1 |
| `/api/ime/Municipalities/:DistrictId` | GET | Get list of municipalities/cities for specified district. Pass district ID as parameter. | Use after district selection to populate city dropdown. Final step in address cascade. | WSST-MUNV1 |

### Personal Information

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/Genders` | GET | Get list of gender options (Male, Female, Other). | Use in customer/receiver registration forms for gender selection. | Gender |
| `/api/ime/MaritalStatus` | GET | Get list of marital status options (Single, Married, Divorced, etc.). | Use in customer KYC forms for marital status selection. | WSST-MSSV1 |
| `/api/ime/Occupation` | GET | Get list of occupation categories (Employed, Self-employed, Business, etc.). | Use in customer forms for occupation/profession selection. Required for compliance. | WSST-OCPV1 |
| `/api/ime/RelationshipList` | GET | Get list of relationship types (Self, Father, Mother, Spouse, etc.). | Use when defining sender-receiver relationship in transaction form. | WSST-RELV1 |

### Identification Documents

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/GetIdTypes` | GET | Get list of ID types (Passport, Driver License, Aadhaar, PAN, etc.) for specified country. Accepts query: `countrycode`. | Use in customer KYC form to select ID document type. Pass country code for relevant options. | WSST-IDTV1 |
| `/api/ime/GetIdentityTypes` | GET | Alternative endpoint for identity types. Same as GetIdTypes with country code support. | Use as alternative to GetIdTypes. Both endpoints return same data. | WSST-IDTV1 |
| `/api/ime/IDPlaceofIssue` | GET | Get list of places where ID can be issued (RTO, Passport Office, etc.). Accepts query: `countrycode`, `idType`. | Use after ID type selection to populate place of issue dropdown in KYC form. | WSST-POIV1 |

### Financial & Transaction Data

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/BankList/:CountryId` | GET | Get list of banks for specified country. Pass country code as path parameter. | Use to populate bank dropdown in transaction or receiver forms. | WSST-BKLV1 |
| `/api/ime/BankBranchList/:BankId` | GET | Get list of branches for specified bank. Pass bank ID as path parameter. | Use after bank selection to populate branch dropdown. | WSST-BBLV1 |
| `/api/ime/PurposeOfRemittance` | GET | Get list of remittance purposes (Family Support, Education, Medical, Business, etc.). | Use in transaction form to select purpose of money transfer. Required for compliance. | WSST-PORV1 |
| `/api/ime/SourceOfFundList` | GET | Get list of fund sources (Salary, Business Income, Savings, etc.). | Use in customer KYC or high-value transactions to declare fund source. | WSST-SOFV1 |
| `/api/ime/TransactionCancelReason` | GET | Get list of valid reasons for transaction cancellation. | Use when cancelling transaction to select cancellation reason. Required for audit trail. | WSST-TCRV1 |

### CSP (Customer Service Point) Related

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/CSPRegistrationTypeList` | GET | Get list of CSP registration types. | Use during CSP/partner registration to select registration category. | WSST-REGV1 |
| `/api/ime/CSPAddressProofTypeList` | GET | Get list of acceptable address proof types for CSP registration. | Use in CSP registration form for address verification document selection. | WSST-ADPV1 |
| `/api/ime/CSPOwnerAddressProofTypeList` | GET | Get list of address proof types specifically for CSP owner verification. | Use during CSP owner KYC for address proof document selection. | WSST-OAPV1 |
| `/api/ime/CSPBusinessTypeList` | GET | Get list of CSP business categories/types. | Use in CSP registration to select business type/category. | WSST-BUSV1 |
| `/api/ime/CSPDocumentTypeList` | GET | Get list of document types accepted for CSP verification. | Use during CSP document upload to select document category. | WSST-ADOV1 |

### Additional Data

| Endpoint | Method | Description | When to Use | WSST TypeCode |
|----------|--------|-------------|-------------|---------------|
| `/api/ime/OwnerCategoryTypes` | GET | Get list of owner categories (GENERAL, OBC, SC, ST, etc.). | Use in customer or CSP registration for category selection. Important for reservations/benefits. | WSST-CATV1 |
| `/api/ime/EducationalQualificationList` | GET | Get list of education levels (10th, 12th, Graduate, Post Graduate, etc.). | Use in customer or CSP registration forms for education qualification selection. | WSST-EDQV1 |
| `/api/ime/GetAccountType` | GET | Get list of bank account types (Savings, Current, NRI, etc.). | Use when collecting bank account details for transaction or receiver. | GetAccountType |

---

## 7. Compliance & Verification

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/kyc/verify` | POST | Verify customer KYC details against external databases. Validates ID proof, address, etc. | Use after customer submits KYC documents. Required for compliance before enabling transactions. |
| `/api/ime/compliance/:customerId/status` | GET | Check compliance status of customer. Returns verification results and any flags. | Use before processing high-value transactions or periodic compliance checks. |

---

## 8. Reporting & Queries

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/customers/:customerId/transactions` | GET | Get transaction history for specific customer. Returns list of all past transactions. | Use to display customer's transaction history, for statements, or dispute resolution. |
| `/api/ime/exchange-rate` | GET | Get current exchange rate for specified currency pair. Returns live rates from IME. | Use before transaction to show customer exchange rate and calculate amount. Rates change frequently. |
| `/api/ime/reports/soa` | GET | Generate Statement of Account (SOA) report. Returns transaction summary for date range. | Use for financial reporting, reconciliation, or providing customer statements. |

---

## 9. Phase 2 eKYC Endpoints

**Note:** These endpoints use Aadhaar-based eKYC for Indian customers. Requires Aadhaar integration.

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/ekyc/generate-ott` | POST | Generate One-Time Token (OTT) for Aadhaar eKYC session. Initiates eKYC process. | Use as first step in Aadhaar eKYC flow. OTT required for subsequent eKYC calls. |
| `/api/ime/ekyc/get-unique-id` | POST | Get unique customer ID from Aadhaar system using biometric or demographic data. | Use to retrieve customer's unique identifier from UIDAI after authentication. |
| `/api/ime/ekyc/bio-kyc` | POST | Perform biometric KYC using fingerprint/iris scan. Validates identity against Aadhaar database. | Use for high-assurance KYC when biometric authentication available. Most secure verification. |
| `/api/ime/ekyc/customer-onboarding` | POST | Complete customer onboarding using eKYC data. Creates customer profile from Aadhaar information. | Use after successful eKYC to create customer account with pre-filled Aadhaar data. |
| `/api/ime/ekyc/customer-requery` | POST | Requery customer eKYC status and data from UIDAI. Updates customer information. | Use to refresh customer KYC data or check status of pending eKYC requests. |
| `/api/ime/ekyc/check-entity-status` | POST | Check status of eKYC entity/transaction. Returns processing status and results. | Use to monitor eKYC process status, especially for async operations. |
| `/api/ime/ekyc/aadhar-registration` | POST | Register customer using Aadhaar number and consent. Initiates Aadhaar-based registration. | Use for simplified customer registration using Aadhaar instead of manual data entry. |
| `/api/ime/ekyc/aadhar-reprocess` | POST | Reprocess failed or pending Aadhaar registration. Retries the registration process. | Use when Aadhaar registration fails due to network or system issues. |

---

## 10. Legacy IME Contract Routes

**Note:** These are legacy SOAP API compatible endpoints for backward compatibility. Use REST endpoints (sections 1-9) for new development unless integrating with legacy systems.

### Legacy Static Data Endpoints

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/Countries` | GET | Get countries list (Legacy). Same as REST version but SOAP-compatible response format. | Use only when integrating with legacy SOAP clients. Otherwise use REST endpoints. |
| `/api/ime/States/:CountryId` | GET | Get states list (Legacy). Returns SOAP-compatible XML/JSON response. | Use for legacy system integration. |
| `/api/ime/Districts/:StateId` | GET | Get districts list (Legacy). | Use for legacy system integration. |
| `/api/ime/Municipalities/:DistrictId` | GET | Get municipalities list (Legacy). | Use for legacy system integration. |
| `/api/ime/Genders` | GET | Get genders list (Legacy). | Use for legacy system integration. |
| `/api/ime/MaritalStatus` | GET | Get marital status list (Legacy). | Use for legacy system integration. |
| `/api/ime/Occupation` | GET | Get occupation list (Legacy). | Use for legacy system integration. |
| `/api/ime/PurposeOfRemittance` | GET | Get purpose of remittance list (Legacy). | Use for legacy system integration. |
| `/api/ime/TransactionCancelReason` | GET | Get transaction cancel reasons (Legacy). | Use for legacy system integration. |
| `/api/ime/GetIdTypes` | GET | Get ID types list (Legacy). | Use for legacy system integration. |
| `/api/ime/GetIdentityTypes` | GET | Get identity types list (Legacy). | Use for legacy system integration. |
| `/api/ime/BankList/:CountryId` | GET | Get bank list (Legacy). | Use for legacy system integration. |
| `/api/ime/BankBranchList/:BankId` | GET | Get bank branch list (Legacy). | Use for legacy system integration. |
| `/api/ime/CSPRegistrationTypeList` | GET | Get CSP registration types (Legacy). | Use for legacy system integration. |
| `/api/ime/CSPAddressProofTypeList` | GET | Get CSP address proof types (Legacy). | Use for legacy system integration. |
| `/api/ime/CSPOwnerAddressProofTypeList` | GET | Get CSP owner address proof types (Legacy). | Use for legacy system integration. |
| `/api/ime/CSPBusinessTypeList` | GET | Get CSP business types (Legacy). | Use for legacy system integration. |
| `/api/ime/CSPDocumentTypeList` | GET | Get CSP document types (Legacy). | Use for legacy system integration. |
| `/api/ime/OwnerCategoryTypes` | GET | Get owner category types (Legacy). | Use for legacy system integration. |
| `/api/ime/EducationalQualificationList` | GET | Get educational qualification list (Legacy). | Use for legacy system integration. |
| `/api/ime/RelationshipList` | GET | Get relationship list (Legacy). | Use for legacy system integration. |
| `/api/ime/IDPlaceofIssue` | GET | Get ID place of issue list (Legacy). | Use for legacy system integration. |
| `/api/ime/SourceOfFundList` | GET | Get source of fund list (Legacy). | Use for legacy system integration. |

### Legacy Transaction & Customer Endpoints

| Endpoint | Method | Description | When to Use |
|----------|--------|-------------|-------------|
| `/api/ime/AmendTransaction` | POST | Amend/modify existing transaction details. Allows changes to amount, receiver info, etc. | Use when transaction needs modification before completion. Legacy SOAP-compatible version. |
| `/api/ime/BalanceInquiry` | GET | Check account/wallet balance. Returns current available balance. | Use to display balance before transaction. Legacy version. |
| `/api/ime/CSPDocumentUpload` | POST | Upload documents for CSP verification. Accepts file uploads. | Use during CSP registration to submit required documents. |
| `/api/ime/CSPRegistration` | POST | Register new CSP/partner with complete details. Creates CSP account. | Use for partner onboarding. Legacy SOAP-compatible version. |
| `/api/ime/CancelTransaction` | POST | Cancel transaction (Legacy). Same as REST version but SOAP-compatible. | Use for legacy system integration. |
| `/api/ime/CheckCSP` | GET | Check CSP status and validity. Returns CSP information. | Use to verify CSP credentials before processing transactions. |
| `/api/ime/CheckCustomer/:mobileNo` | GET | Check if customer exists by mobile number (Legacy). | Use for legacy system integration. |
| `/api/ime/ConfirmCustomerRegistration` | POST | Confirm customer registration (Legacy). Completes registration process. | Use for legacy system integration. |
| `/api/ime/ConfirmSendTransaction` | POST | Confirm and finalize send transaction (Legacy). Second step in two-phase transaction. | Use for legacy systems requiring two-phase transaction confirmation. |
| `/api/ime/CustomerMobileAmendment` | POST | Update customer mobile number. Requires OTP verification. | Use when customer needs to change registered mobile number. |
| `/api/ime/CustomerRegistration` | POST | Register new customer (Legacy). Same as REST version but SOAP-compatible. | Use for legacy system integration. |
| `/api/ime/GetCalculation` | POST | Calculate transaction fees, exchange rate, and total amount. Returns cost breakdown. | Use before transaction to show customer fees and total cost. |
| `/api/ime/SendOTP` | POST | Send OTP to customer mobile (Legacy). | Use for legacy system integration. |
| `/api/ime/SendTransaction` | POST | Send money transaction (Legacy). Same as REST version but SOAP-compatible. | Use for legacy system integration. |
| `/api/ime/TransactionInquiry` | POST | Query transaction details by transaction ID or reference. Returns full transaction info. | Use to get transaction details in legacy format. |
| `/api/ime/TransactionInquiryDefault` | POST | Query transactions with default filters. Returns recent transactions. | Use for quick transaction lookup without specific parameters. |

---

## Quick Reference: When to Use Which Endpoint Type

### **Use REST Endpoints (Sections 1-9) When:**
- ✅ Building new web/mobile applications
- ✅ Using modern JavaScript/React frontend
- ✅ Want clean JSON responses
- ✅ Following REST API best practices
- ✅ Need better error handling
- ✅ Want better developer experience

### **Use Legacy Endpoints (Section 10) When:**
- ⚠️ Integrating with existing SOAP-based systems
- ⚠️ Maintaining backward compatibility with old clients
- ⚠️ Required by partner/integration specifications
- ⚠️ Legacy system migration in progress

---

## Data Caching Strategy

**Cache these endpoints (data rarely changes):**
- Countries, States, Districts, Municipalities
- Genders, Marital Status, Occupation
- ID Types, Bank List, Relationship Types
- Purpose of Remittance, Source of Fund
- All CSP-related static data
- Owner Category Types, Educational Qualification

**Do NOT cache (data changes frequently):**
- Exchange Rates (call before each transaction)
- Transaction Status (always get latest)
- Customer Search Results (real-time)
- Balance Inquiry (real-time)

**Cache duration recommendation:**
- Static data: 24 hours
- Exchange rates: 5 minutes
- Transaction status: Do not cache

---

## Common Workflows

### **Customer Registration Workflow:**
1. `GET /api/ime/Countries` - Get country list
2. `POST /api/ime/customers/send-otp` - Send OTP
3. `POST /api/ime/customers` - Create customer (with OTP verification)
4. `POST /api/ime/customers/confirm` - Confirm registration

### **Money Transfer Workflow:**
1. `GET /api/ime/exchange-rate` - Get exchange rate
2. `POST /api/ime/GetCalculation` - Calculate fees
3. `GET /api/ime/banks` - Get bank list
4. `GET /api/ime/bank-branches` - Get branch list
5. `POST /api/ime/receivers` - Create receiver
6. `POST /api/ime/transactions/send` - Send money
7. `GET /api/ime/transactions/:id/status` - Track status

### **KYC Verification Workflow:**
1. `GET /api/ime/GetIdTypes` - Get ID types
2. `GET /api/ime/IDPlaceofIssue` - Get issue places
3. `POST /api/ime/customers` - Submit KYC data
4. `POST /api/ime/kyc/verify` - Verify KYC
5. `GET /api/ime/compliance/:id/status` - Check compliance

---

## Error Handling

All IME endpoints return consistent response format:

```json
{
  "success": true/false,
  "message": "Success/Error message",
  "data": { ... },
  "error": { ... } // Only on error
}
```

**Common Error Codes:**
- `200` - Success
- `203` - Validation Error (missing required fields)
- `204` - Not Found / Does Not Exist
- `400` - Bad Request
- `401` - Unauthorized
- `500` - Internal Server Error

---

**Document Version:** 1.0  
**Last Updated:** April 24, 2026  
**API Version:** IME SOAP API v1.0 + REST v1.0  
**Total Endpoints:** 74 (38 REST + 36 Legacy)
