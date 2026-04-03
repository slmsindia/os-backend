# IME SOAP API - Parameter Mapping Documentation

This document maps all IME SOAP API endpoints to their required parameters based on the official IME integration documentation.

## Base Configuration
All methods require these credentials to be passed automatically by the service:
- `AccessCode`: IME_ACCESS_CODE (from .env)
- `PartnerBranchId`: IME_PARTNER_BRANCH_ID (from .env)
- `AgentSessionId`: IME_AGENT_SESSION_ID (from .env)
- `Username`: IME_USERNAME (from .env)
- `Password`: IME_PASSWORD (from .env)

---

## Authentication & Session Management

### Login
**WSDL Method**: `LoginAsync`
**Request Parameters**:
- AccessCode (Auto)
- PartnerBranchId (Auto)
- AgentSessionId (Auto)
- Username (Auto)
- Password (Auto)

**Response**: SessionId, Token, AgentId, etc.

---

### Authenticate
**WSDL Method**: `AuthenticateAsync`
**Request Parameters**: Same as Login
**Response**: Authentication Token, User Details

---

## Customer Operations

### CreateCustomer
**WSDL Method**: `CreateCustomerAsync`
**Request Parameters** (in addition to auto-credentials):
- FirstName: string (required)
- LastName: string (required)
- MiddleName: string (optional)
- Gender: string "M" | "F" (required)
- DateOfBirth: datetime (required)
- IDType: string "PP" | "DL" | "NP_ID" (required)
- IDNumber: string (required)
- PhoneNumber: string (required)
- EmailAddress: string (optional)
- Address: string (optional)
- City: string (optional)
- CountryCode: string "NP" | "AU" (required)

**Response**: CustomerId, RegistrationStatus, ValidationStatus

---

### GetCustomer
**WSDL Method**: `GetCustomerAsync`
**Request Parameters**:
- CustomerId: string (required)

**Response**: Customer details object

---

### ValidateCustomer
**WSDL Method**: `ValidateCustomerAsync`
**Request Parameters**:
- CustomerId: string (required)
- IDType: string (optional)
- IDNumber: string (optional)

**Response**: ValidationStatus, Errors, Warnings

---

## Remittance/Money Transfer Operations

### SendMoney / SendTransaction
**WSDL Method**: `SendMoneyAsync` or `SendTransactionAsync`
**Request Parameters**:
- SenderCustomerId: string (required)
- ReceiverCustomerId: string (required)
- Amount: decimal (required)
- SourceCurrency: string "AUD" | "NZD" | "CAD" | "USD" | "GBP" (required)
- DestinationCurrency: string "NPR" (required)
- PaymentMode: string "CASH" | "BANK" (required)
- Purpose: string (optional)
- Notes: string (optional)
- Reference: string (optional)

**Response**: TransactionId, Status, ExchangeRate, Charges, NetAmount, DeliveryEstimate

---

### GetTransactionStatus
**WSDL Method**: `GetTransactionStatusAsync`
**Request Parameters**:
- TransactionId: string (required)

**Response**: Status, Amount, Charges, ExchangeRate, CreatedAt, UpdatedAt, DeliveryTime

---

### CancelTransaction
**WSDL Method**: `CancelTransactionAsync`
**Request Parameters**:
- TransactionId: string (required)
- CancellationReason: string (optional)

**Response**: CancelStatus, RefundStatus, RefundAmount

---

### ConfirmTransaction
**WSDL Method**: `ConfirmTransactionAsync`
**Request Parameters**:
- TransactionId: string (required)
- ConfirmationPin: string (required)
- DeliveryMode: string (required)

**Response**: ConfirmationStatus, ReferenceNumber

---

## Receiver/Beneficiary Management

### CreateReceiver
**WSDL Method**: `CreateReceiverAsync`
**Request Parameters**:
- CustomerId: string (required)
- FirstName: string (required)
- LastName: string (required)
- IDType: string "PP" | "NP_ID" | "DL" (required)
- IDNumber: string (required)
- PhoneNumber: string (required)
- BankCode: string (optional for CASH mode)
- AccountNumber: string (optional for BANK mode)
- Address: string (optional)
- City: string (optional)
- CountryCode: string "NP" (required)

**Response**: ReceiverId, Status, ValidationStatus

---

### GetReceiver
**WSDL Method**: `GetReceiverAsync`
**Request Parameters**:
- ReceiverId: string (required)

**Response**: Receiver details object

---

### UpdateReceiver
**WSDL Method**: `UpdateReceiverAsync`
**Request Parameters**:
- ReceiverId: string (required)
- PhoneNumber: string (optional)
- BankCode: string (optional)
- AccountNumber: string (optional)
- Address: string (optional)

**Response**: UpdateStatus, UpdatedFields

---

## Payment Mode & Bank Operations

### GetPaymentModes
**WSDL Method**: `GetPaymentModesAsync`
**Request Parameters**: None (besides auto-credentials)

**Response**: List of payment modes: [{ Mode: "CASH", Name: "Cash Pickup" }, { Mode: "BANK", Name: "Bank Transfer" }]

---

### ValidateBankAccount
**WSDL Method**: `ValidateBankAccountAsync`
**Request Parameters**:
- BankCode: string (required)
- AccountNumber: string (required)
- CountryCode: string "NP" (required)

**Response**: IsValid, AccountHolderName, BankName, Message

---

### GetBankList
**WSDL Method**: `GetBankListAsync`
**Request Parameters**:
- CountryCode: string "NP" | "AU" (required)

**Response**: Array of banks: [{ BankCode: "NK", BankName: "Nepal Kendra Bank", ... }]

---

## Compliance & KYC Operations

### VerifyKYC
**WSDL Method**: `VerifyKYCAsync`
**Request Parameters**:
- CustomerId: string (required)
- IDType: string (required)
- IDNumber: string (required)
- IDExpiryDate: datetime (optional)
- DocumentHash: string (optional for biometric verification)

**Response**: KYCStatus, VerificationDate, ExpiryDate, ApprovalStatus

---

### GetComplianceStatus
**WSDL Method**: `GetComplianceStatusAsync`
**Request Parameters**:
- CustomerId: string (required)

**Response**: ComplianceStatus, RiskLevel, Restrictions, LastUpdateDate

---

## Reporting & Query Operations

### GetTransactionHistory
**WSDL Method**: `GetTransactionHistoryAsync`
**Request Parameters**:
- CustomerId: string (required)
- StartDate: datetime (optional)
- EndDate: datetime (optional)
- Status: string (optional) "COMPLETED" | "PENDING" | "CANCELLED"
- PageNumber: int (optional, default: 1)
- PageSize: int (optional, default: 10)

**Response**: Array of transactions with pagination info

---

### GetExchangeRate
**WSDL Method**: `GetExchangeRateAsync`
**Request Parameters**:
- SourceCurrency: string "AUD" | "NZD" | "CAD" | "USD" | "GBP" (required)
- DestinationCurrency: string "NPR" (required)

**Response**: Rate, EffectiveDate, BaseCurrency, TargetCurrency, Charges

---

### GetStaticData / GetStateDistrict
**WSDL Method**: `GetStateDistrictAsync`
**Request Parameters**:
- CountryCode: string "NP" (required)

**Response**: Array of states/provinces with districts

---

## Error Handling

All endpoints return error responses in this format:
```json
{
  "success": false,
  "error_code": "ERROR_CODE",
  "message": "Human readable error message"
}
```

Common error codes:
- `INVALID_CREDENTIALS`: Authentication failed
- `INVALID_PARAMETER`: Missing or malformed required parameter
- `CUSTOMER_NOT_FOUND`: CustomerId doesn't exist
- `INSUFFICIENT_FUNDS`: Not enough balance for transaction
- `VALIDATION_FAILED`: Customer/Receiver/Bank validation failed
- `TRANSACTION_NOT_FOUND`: TransactionId doesn't exist
- `OPERATION_NOT_ALLOWED`: Due to compliance restrictions
- `SERVICE_UNAVAILABLE`: IME service is down

---

## Parameter Type Reference

- **string**: Text values, max length varies by field
- **decimal**: Monetary amounts (e.g., 1000.50)
- **datetime**: ISO 8601 format (e.g., "2024-04-03T10:30:00Z")
- **int**: Whole numbers for pagination
- **boolean**: true | false

---

## Notes

1. All parameters in actual SOAP calls use **PascalCase** (e.g., `CustomerId`, `FirstName`)
2. Some fields like Email are optional but improve customer experience
3. Date parameters should use ISO 8601 format
4. Transaction amounts should be validated before sending
5. Some methods may require agent approval for large amounts
6. Exchange rates are live and change frequently
