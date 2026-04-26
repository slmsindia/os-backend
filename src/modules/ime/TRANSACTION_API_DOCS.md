# IME Transaction Middleware API Documentation

## 🎯 Complete Transaction Flow API

This middleware handles the entire IME transaction process in a single API call or split into multiple steps.

---

## 📋 API Endpoints

### 1. Complete Transaction Flow (Single API Call)
**POST** `/api/ime/transactions/send-complete`

Handles the complete transaction flow: Customer Check → Rate Calculation → Transaction Creation → OTP → (Optional) Confirmation

#### Request Body
```json
{
  "senderMobileNo": "9812345678",
  "receiverName": "Sita Thapa",
  "receiverAddress": "Pashupatinath, Kathmandu",
  "receiverMobileNo": "9847654321",
  "receiverState": "Bagmati",
  "receiverDistrict": "Kathmandu",
  "receiverMunicipality": "Kathmandu",
  "receiverCity": "Kathmandu",
  "remitAmount": "10000",
  "sourceOfFund": "8051",
  "relationship": "1001",
  "purposeOfRemittance": "2001",
  "paymentType": "C",
  "calcBy": "C",
  "autoConfirmOTP": false,
  "otp": "123456"
}
```

#### Required Fields
- `senderMobileNo` - Sender's registered mobile number
- `receiverName` - Receiver's full name
- `receiverAddress` - Receiver's address in Nepal
- `receiverMobileNo` - Receiver's mobile number in Nepal
- `receiverState` - Receiver state ID from GetStaticData
- `receiverDistrict` - Receiver district ID
- `receiverMunicipality` - Receiver municipality ID
- `remitAmount` - Amount to send (INR)
- `sourceOfFund` - Source of fund ID from GetStaticData
- `relationship` - Relationship ID from GetStaticData
- `purposeOfRemittance` - Purpose ID from GetStaticData
- `paymentType` - "C" for Cash, "B" for Bank

#### Optional Fields
- `receiverCity` - Receiver's city
- `calcBy` - "C" for Collection Amount, "P" for Payout Amount
- `autoConfirmOTP` - true to auto-confirm with provided OTP
- `otp` - 6-digit OTP (required if autoConfirmOTP = true)

#### Bank Payment Fields (Required if paymentType = "B")
- `bankId` - Bank ID from GetStaticData
- `bankBranchId` - Bank Branch ID
- `bankAccountNumber` - Beneficiary's bank account number

#### Response (Without Auto-Confirm)
```json
{
  "success": true,
  "message": "Transaction created successfully. OTP sent to customer mobile.",
  "transaction": {
    "refNo": "REF_789012",
    "collectAmount": "10500",
    "payoutAmount": "16000",
    "serviceCharge": "500",
    "exchangeRate": "1.60",
    "status": "OTP_SENT",
    "otpToken": "OTP_TOKEN_345678"
  },
  "customer": {
    "name": "Ram Bahadur Thapa",
    "mobileNo": "9812345678",
    "amlStatus": "True",
    "kycStatus": "Approved"
  },
  "nextSteps": {
    "action": "CONFIRM_OTP",
    "endpoint": "/api/ime/transactions/confirm",
    "required": {
      "refNo": "REF_789012",
      "otpToken": "OTP_TOKEN_345678",
      "otp": "6-digit OTP from customer mobile"
    }
  }
}
```

#### Response (With Auto-Confirm)
```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "icn": "ICN_987654321",
    "refNo": "REF_789012",
    "collectAmount": "10500",
    "payoutAmount": "16000",
    "serviceCharge": "500",
    "exchangeRate": "1.60",
    "status": "COMPLETED"
  },
  "customer": {
    "name": "Ram Bahadur Thapa",
    "mobileNo": "9812345678",
    "amlStatus": "True",
    "kycStatus": "Approved"
  }
}
```

---

### 2. Confirm Transaction with OTP
**POST** `/api/ime/transactions/confirm`

Confirms a pending transaction using OTP received by customer.

#### Request Body
```json
{
  "refNo": "REF_789012",
  "otpToken": "OTP_TOKEN_345678",
  "otp": "123456"
}
```

#### Response
```json
{
  "success": true,
  "message": "Transaction confirmed successfully",
  "transaction": {
    "icn": "ICN_987654321",
    "refNo": "REF_789012",
    "status": "COMPLETED"
  },
  "instructions": {
    "message": "Share the ICN with the beneficiary to collect money in Nepal",
    "icnExpiry": "ICN expires in 7 days as per RBI guidelines"
  }
}
```

---

## 🔄 Complete Flow Example

### Step 1: Create Transaction (Send OTP)
```bash
curl -X POST http://localhost:3005/api/ime/transactions/send-complete \
  -H "Content-Type: application/json" \
  -d '{
    "senderMobileNo": "9812345678",
    "receiverName": "Sita Thapa",
    "receiverAddress": "Pashupatinath, Kathmandu",
    "receiverMobileNo": "9847654321",
    "receiverState": "Bagmati",
    "receiverDistrict": "Kathmandu",
    "receiverMunicipality": "Kathmandu",
    "remitAmount": "10000",
    "sourceOfFund": "8051",
    "relationship": "1001",
    "purposeOfRemittance": "2001",
    "paymentType": "C"
  }'
```

### Step 2: Confirm Transaction with OTP
```bash
curl -X POST http://localhost:3005/api/ime/transactions/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "refNo": "REF_789012",
    "otpToken": "OTP_TOKEN_345678",
    "otp": "123456"
  }'
```

---

## 🎯 Auto-Confirm Example

### Single API Call with Auto-Confirm
```bash
curl -X POST http://localhost:3005/api/ime/transactions/send-complete \
  -H "Content-Type: application/json" \
  -d '{
    "senderMobileNo": "9812345678",
    "receiverName": "Sita Thapa",
    "receiverAddress": "Pashupatinath, Kathmandu",
    "receiverMobileNo": "9847654321",
    "receiverState": "Bagmati",
    "receiverDistrict": "Kathmandu",
    "receiverMunicipality": "Kathmandu",
    "remitAmount": "10000",
    "sourceOfFund": "8051",
    "relationship": "1001",
    "purposeOfRemittance": "2001",
    "paymentType": "C",
    "autoConfirmOTP": true,
    "otp": "123456"
  }'
```

---

## 🏦 Bank Payment Example

```bash
curl -X POST http://localhost:3005/api/ime/transactions/send-complete \
  -H "Content-Type: application/json" \
  -d '{
    "senderMobileNo": "9812345678",
    "receiverName": "Sita Thapa",
    "receiverAddress": "Pashupatinath, Kathmandu",
    "receiverMobileNo": "9847654321",
    "receiverState": "Bagmati",
    "receiverDistrict": "Kathmandu",
    "receiverMunicipality": "Kathmandu",
    "remitAmount": "10000",
    "sourceOfFund": "8051",
    "relationship": "1001",
    "purposeOfRemittance": "2001",
    "paymentType": "B",
    "bankId": "BANK_123",
    "bankBranchId": "BRANCH_456",
    "bankAccountNumber": "9876543210",
    "autoConfirmOTP": true,
    "otp": "123456"
  }'
```

---

## 🚨 Error Handling

### Customer Not Eligible
```json
{
  "success": false,
  "message": "Customer not eligible for transactions",
  "amlStatus": "False",
  "kycStatus": "Pending"
}
```

### Invalid OTP
```json
{
  "success": false,
  "message": "Failed to confirm transaction",
  "imeCode": "704",
  "error": "Bad Request"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "message": "Missing required transaction fields",
  "missing": ["receiverName", "receiverAddress"]
}
```

---

## 📝 Important Notes

1. **Customer Eligibility**: Sender must have AMLStatus = True AND KYCStatus = Approved
2. **ForexSessionId**: Automatically generated and expires quickly - used immediately
3. **OTP**: Required for transaction confirmation - sent to sender's mobile
4. **ICN**: Final payout code for receiver - expires in 7 days
5. **Bank Payments**: Require additional bank details (bankId, bankBranchId, bankAccountNumber)
6. **Auto-Confirm**: Can complete entire flow in single API call if OTP is provided

---

## 🔧 Static Data Requirements

The following fields require IDs from IME GetStaticData API:
- `receiverState` - From `WSST-STTV1`
- `receiverDistrict` - From state-specific districts
- `receiverMunicipality` - From district-specific municipalities
- `sourceOfFund` - From `WSST-SOFV1`
- `relationship` - From `WSST-RELV1`
- `purposeOfRemittance` - From `WSST-PORV1`
- `bankId` - From bank list GetStaticData

Use `/api/ime/static-data` endpoint to fetch these values.
