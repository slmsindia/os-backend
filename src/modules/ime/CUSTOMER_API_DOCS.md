# IME Customer Registration Middleware API Documentation

## 🎯 Complete Customer Registration Flow API

This middleware handles the entire IME customer registration process exactly as per the official IME documentation.

---

## 📋 API Endpoints

### 1. Complete Customer Registration Flow
**POST** `/api/ime/customers/register-complete`

Handles the complete customer registration flow: CustomerRegistration → SendOTP → (Optional) ConfirmCustomerRegistration

#### Request Body (Exactly as IME Documentation)
```json
{
  "CustomerDetails": {
    "MobileNo": "9812345678",
    "FirstName": "Ram",
    "MiddleName": "Bahadur", 
    "LastName": "Thapa",
    "Nationality": "NPL",
    "MaritalStatus": "1901",
    "DOB": "1990/01/15",
    "Gender": "1801",
    "FatherOrMotherName": "Hari Thapa",
    "Email": "ram@example.com",
    "Occupation": "8081",
    "SourceOfFund": "8051"
  },
  "PermanentAddresss": {
    "State": "Bagmati",
    "District": "Kathmandu", 
    "Municipality": "Kathmandu",
    "Address": "Kathmandu",
    "WardNo": "01",
    "HouseNo": "123"
  },
  "TemporaryAddress": {
    "State": "Delhi",
    "District": "New Delhi",
    "Address": "Connaught Place",
    "PostalCode": "110001",
    "HouseNo": "456"
  },
  "IdentityDetails": {
    "IdType": "1301",
    "IdNo": "1234567890123",
    "IdPlaceOfIssue": "Kathmandu",
    "IssueDate": "2015/01/01",
    "ExpiryDate": "2025/01/01",
    "IdData": "base64_encoded_id_document",
    "IdDataType": "image/jpeg",
    "PhotoData": "base64_encoded_photo",
    "PhotoDataType": "image/jpeg"
  },
  "autoConfirmOTP": false,
  "otp": "123456"
}
```

#### Required Fields (CustomerDetails)
- `MobileNo` - Customer's mobile number (max 15 chars)
- `FirstName` - First name (max 20 chars)
- `LastName` - Last name (max 20 chars)
- `Nationality` - Country ID from GetStaticData (`WSST-CONV1`)
- `MaritalStatus` - Marital Status ID from GetStaticData (`WSST-MSSV1`)
- `DOB` - Date of Birth: `YYYY/MM/DD` format
- `Gender` - Gender ID from GetStaticData (`WSST-GDRV1`)
- `FatherOrMotherName` - Father's or Mother's full name (max 50 chars)
- `Occupation` - Occupation ID from GetStaticData (`WSST-OCPV1`)

#### Optional Fields (CustomerDetails)
- `MiddleName` - Middle name (max 20 chars)
- `Email` - Email address (max 30 chars)
- `SourceOfFund` - Source of Fund ID from GetStaticData (`WSST-SOFV1`)

#### Required Fields (PermanentAddresss)
- `State` - State ID per customer's Nationality country
- `District` - District ID per State
- `Address` - Max 50 chars

#### Optional Fields (PermanentAddresss)
- `Municipality` - **Mandatory if Nationality = NPL (Nepal)**
- `WardNo` - Ward number
- `HouseNo` - House number

#### Required Fields (TemporaryAddress)
- `State` - India State ID
- `District` - India District ID
- `Address` - Temporary address (max 50 chars)

#### Optional Fields (TemporaryAddress)
- `PostalCode` - Postal code (max 20 chars)
- `HouseNo` - House number (max 20 chars)

#### Required Fields (IdentityDetails)
- `IdType` - ID type from GetStaticData (`WSST-IDTV1`)
- `IdNo` - The actual ID number (max 20 chars)
- `IssueDate` - Format: `YYYY/MM/DD`
- `IdData` - ID document image in Base64 (max 500KB)
- `IdDataType` - `pdf`, `jpg`, `jpeg`, or `png`

#### Optional Fields (IdentityDetails)
- `IdPlaceOfIssue` - **Mandatory if Nationality = NPL**; Place of Issue ID from GetStaticData
- `ExpiryDate` - **Mandatory if the ID document has an expiry date**
- `IdNoCitizenship` - **Mandatory if NPL nationality AND ID is not Citizenship**
- `IdIssuePlaceCitizenship` - Nepal ID issue place
- `IdIssueDateCitizenship` - Citizenship issue date
- `PhotoData` - Customer photo in Base64 (max 500KB)
- `PhotoDataType` - `pdf`, `jpg`, `jpeg`, or `png`

#### Optional Request Fields
- `autoConfirmOTP` - true to auto-confirm with provided OTP
- `otp` - 6-digit OTP (required if autoConfirmOTP = true)

#### Response (Without Auto-Confirm)
```json
{
  "success": true,
  "message": "Customer registration initiated successfully. OTP sent to customer mobile.",
  "customer": {
    "customerToken": "CUSTOMER_TOKEN_12345",
    "mobileNo": "9812345678",
    "firstName": "Ram",
    "lastName": "Thapa",
    "status": "OTP_SENT"
  },
  "nextSteps": {
    "action": "CONFIRM_OTP",
    "endpoint": "/api/ime/customers/confirm-registration",
    "required": {
      "customerToken": "CUSTOMER_TOKEN_12345",
      "otpToken": "OTP_TOKEN_67890",
      "otp": "6-digit OTP from customer mobile"
    }
  }
}
```

#### Response (With Auto-Confirm)
```json
{
  "success": true,
  "message": "Customer registration completed successfully",
  "customer": {
    "customerToken": "CUSTOMER_TOKEN_12345",
    "mobileNo": "9812345678",
    "firstName": "Ram",
    "lastName": "Thapa",
    "status": "REGISTERED"
  }
}
```

---

### 2. Confirm Customer Registration with OTP
**POST** `/api/ime/customers/confirm-registration`

Confirms a pending customer registration using OTP received by customer.

#### Request Body
```json
{
  "customerToken": "CUSTOMER_TOKEN_12345",
  "otpToken": "OTP_TOKEN_67890",
  "otp": "123456"
}
```

#### Response
```json
{
  "success": true,
  "message": "Customer registration confirmed successfully",
  "customer": {
    "customerToken": "CUSTOMER_TOKEN_12345",
    "status": "REGISTERED"
  }
}
```

---

### 3. Check Customer Eligibility
**POST** `/api/ime/customers/check-eligibility`

Check if a customer is registered and eligible to send money.

#### Request Body
```json
{
  "mobileNo": "9812345678"
}
```

#### Response
```json
{
  "success": true,
  "message": "Customer eligibility checked successfully",
  "customer": {
    "name": "Ram Bahadur Thapa",
    "mobileNo": "9812345678",
    "amlStatus": "True",
    "kycStatus": "Approved",
    "rejectedReason": "",
    "newMobileNo": "",
    "amendmentStatus": "",
    "amendmentMessage": ""
  },
  "eligible": true
}
```

---

## 🔄 Complete Flow Example

### Step 1: Register Customer (Send OTP)
```bash
curl -X POST http://localhost:3005/api/ime/customers/register-complete \
  -H "Content-Type: application/json" \
  -d '{
    "CustomerDetails": {
      "MobileNo": "9812345678",
      "FirstName": "Ram",
      "LastName": "Thapa",
      "Nationality": "NPL",
      "MaritalStatus": "1901",
      "DOB": "1990/01/15",
      "Gender": "1801",
      "FatherOrMotherName": "Hari Thapa",
      "Occupation": "8081"
    },
    "PermanentAddresss": {
      "State": "Bagmati",
      "District": "Kathmandu",
      "Address": "Kathmandu"
    },
    "TemporaryAddress": {
      "State": "Delhi",
      "District": "New Delhi",
      "Address": "Connaught Place"
    },
    "IdentityDetails": {
      "IdType": "1301",
      "IdNo": "1234567890123",
      "IssueDate": "2015/01/01",
      "IdData": "base64_encoded_id_document",
      "IdDataType": "image/jpeg"
    }
  }'
```

### Step 2: Confirm Registration with OTP
```bash
curl -X POST http://localhost:3005/api/ime/customers/confirm-registration \
  -H "Content-Type: application/json" \
  -d '{
    "customerToken": "CUSTOMER_TOKEN_12345",
    "otpToken": "OTP_TOKEN_67890",
    "otp": "123456"
  }'
```

### Step 3: Check Customer Eligibility
```bash
curl -X POST http://localhost:3005/api/ime/customers/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNo": "9812345678"
  }'
```

---

## 🎯 Auto-Confirm Example

### Single API Call with Auto-Confirm
```bash
curl -X POST http://localhost:3005/api/ime/customers/register-complete \
  -H "Content-Type: application/json" \
  -d '{
    "CustomerDetails": {
      "MobileNo": "9812345678",
      "FirstName": "Ram",
      "LastName": "Thapa",
      "Nationality": "NPL",
      "MaritalStatus": "1901",
      "DOB": "1990/01/15",
      "Gender": "1801",
      "FatherOrMotherName": "Hari Thapa",
      "Occupation": "8081"
    },
    "PermanentAddresss": {
      "State": "Bagmati",
      "District": "Kathmandu",
      "Address": "Kathmandu"
    },
    "TemporaryAddress": {
      "State": "Delhi",
      "District": "New Delhi",
      "Address": "Connaught Place"
    },
    "IdentityDetails": {
      "IdType": "1301",
      "IdNo": "1234567890123",
      "IssueDate": "2015/01/01",
      "IdData": "base64_encoded_id_document",
      "IdDataType": "image/jpeg"
    },
    "autoConfirmOTP": true,
    "otp": "123456"
  }'
```

---

## 🚨 Error Handling

### Missing Required Fields
```json
{
  "success": false,
  "message": "Missing required CustomerDetails fields",
  "missing": ["MobileNo", "FirstName", "LastName"]
}
```

### Customer Registration Failed
```json
{
  "success": false,
  "message": "Parameter Missing - Required field is missing",
  "imeCode": "503",
  "error": "503"
}
```

### Invalid OTP
```json
{
  "success": false,
  "message": "Failed to confirm customer registration",
  "imeCode": "704",
  "error": "Bad Request"
}
```

### Customer Not Eligible
```json
{
  "success": true,
  "message": "Customer eligibility checked successfully",
  "customer": {
    "amlStatus": "False",
    "kycStatus": "Pending"
  },
  "eligible": false
}
```

---

## 📝 Important Notes

1. **IME Documentation Compliance**: All payloads exactly match IME official documentation
2. **CustomerToken**: Required for OTP confirmation - save it from registration response
3. **OTP**: Required for customer registration confirmation - sent to customer's mobile
4. **Eligibility Check**: Must verify AMLStatus = True AND KYCStatus = Approved before transactions
5. **Base64 Encoding**: ID documents and photos must be base64 encoded
6. **Static Data IDs**: All dropdown values should come from IME GetStaticData API
7. **Conditional Fields**: Some fields are mandatory based on nationality or ID type

---

## 🔧 Static Data Requirements

The following fields require IDs from IME GetStaticData API:
- `Nationality` - From `WSST-CONV1`
- `MaritalStatus` - From `WSST-MSSV1`
- `Gender` - From `WSST-GDRV1`
- `Occupation` - From `WSST-OCPV1`
- `SourceOfFund` - From `WSST-SOFV1`
- `State` (Permanent) - From `WSST-STTV1` (based on nationality)
- `District` - From state-specific districts
- `Municipality` - From district-specific municipalities
- `IdType` - From `WSST-IDTV1`
- `IdPlaceOfIssue` - From issue places GetStaticData

Use `/api/ime/static-data` endpoint to fetch these values.

---

## 🎯 Integration with Transaction Flow

After customer registration is complete, use the customer's mobile number for:
1. **Check Eligibility** - Verify customer can send money
2. **Send Transaction** - Create money transfer transactions

Example transaction flow:
```bash
# 1. Check eligibility
POST /api/ime/customers/check-eligibility
{ "mobileNo": "9812345678" }

# 2. Send transaction (if eligible)
POST /api/ime/transactions/send-complete
{
  "senderMobileNo": "9812345678",
  "receiverName": "Sita Thapa",
  // ... other transaction fields
}
```
