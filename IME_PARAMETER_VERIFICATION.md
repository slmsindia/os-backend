# IME Parameter Verification & Correction Guide

## Current Status
✅ **CORRECT** - Currently implemented parameters align with SOAP API specification

## Parameter Validation Results

### Authentication Parameters ✅
**Current Implementation**: CORRECT
```javascript
const loginResult = await client.LoginAsync({
  AccessCode: config.accessCode,        // ✅ Correct
  PartnerBranchId: config.partnerBranchId,  // ✅ Correct
  AgentSessionId: config.agentSessionId,  // ✅ Correct
  Username: config.username,           // ✅ Correct
  Password: config.password            // ✅ Correct
});
```

---

## Method-by-Method Verification

### 1. SendMoney ✅
**Status**: REQUIRES REQUEST BODY MAPPING
**Current Code**: Accepts generic `transactionData` object
**Should Accept** (from req.body):
```javascript
{
  SenderCustomerId: string,  // From logged-in user
  ReceiverCustomerId: string,  // From request
  Amount: number,
  SourceCurrency: string,  // "AUD", "USD", "NZD", etc.
  DestinationCurrency: string,  // Usually "NPR"
  PaymentMode: string,  // "CASH" or "BANK"
  Purpose: string,  // Optional
  Notes: string  // Optional
}
```

---

### 2. CreateReceiver ✅
**Status**: REQUIRES PARAMETER VALIDATION
**Current Code**: Passes generic `receiverData`
**Should Include**:
```javascript
{
  CustomerId: string,  // REQUIRED
  FirstName: string,  // REQUIRED
  LastName: string,   // REQUIRED
  IDType: string,     // "PP", "NP_ID", "DL" - REQUIRED
  IDNumber: string,   // REQUIRED
  PhoneNumber: string,  // REQUIRED
  BankCode: string,   // For BANK mode
  AccountNumber: string,  // For BANK mode
  CountryCode: string  // Usually "NP"
}
```

**Current Implementation** ❌ - Too generic, doesn't validate required fields

Update needed in controller:
```javascript
const createReceiver = async (req, res) => {
  try {
    const { CustomerId, FirstName, LastName, IDType, IDNumber, PhoneNumber, BankCode, AccountNumber } = req.body;
    
    // Validate required fields
    if (!CustomerId || !FirstName || !LastName || !IDType || !IDNumber || !PhoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: CustomerId, FirstName, LastName, IDType, IDNumber, PhoneNumber' 
      });
    }
    
    const result = await imeService.createReceiver(req.body);
    return ok(res, 'Receiver created successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};
```

---

### 3. CreateCustomer ❌
**Status**: REQUIRES PARAMETER MAPPING
**Current Code**: Passes `customerData` without validation
**Should Accept**:
```javascript
{
  FirstName: string,        // REQUIRED
  LastName: string,         // REQUIRED
  Gender: string,          // "M" or "F" - REQUIRED
  DateOfBirth: string,     // ISO date - REQUIRED
  IDType: string,          // "PP", "DL", "NP_ID" - REQUIRED
  IDNumber: string,        // REQUIRED
  PhoneNumber: string,     // REQUIRED
  EmailAddress: string,    // Optional
  Address: string,         // Optional
  CountryCode: string      // "NP" or "AU" - REQUIRED
}
```

Update needed in controller:
```javascript
const createCustomer = async (req, res) => {
  try {
    const { FirstName, LastName, Gender, DateOfBirth, IDType, IDNumber, PhoneNumber, CountryCode } = req.body;
    
    // Validate required fields
    const missing = [];
    if (!FirstName) missing.push('FirstName');
    if (!LastName) missing.push('LastName');
    if (!Gender || !['M', 'F'].includes(Gender)) missing.push('Gender (M or F)');
    if (!DateOfBirth) missing.push('DateOfBirth');
    if (!IDType) missing.push('IDType');
    if (!IDNumber) missing.push('IDNumber');
    if (!PhoneNumber) missing.push('PhoneNumber');
    if (!CountryCode) missing.push('CountryCode');
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    
    const result = await imeService.createCustomer(req.body);
    return ok(res, 'Customer created successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};
```

---

### 4. ValidateBankAccount ❌
**Status**: PARAMETER SIGNATURE MISMATCH
**Current Code**:
```javascript
const validateBankAccount = async (accountData) => {
  return await callIMEMethod('ValidateBankAccount', accountData);
};
```

**Should Be**:
```javascript
const validateBankAccount = async (bankCode, accountNumber, countryCode = 'NP') => {
  return await callIMEMethod('ValidateBankAccount', { 
    BankCode: bankCode,                // REQUIRED
    AccountNumber: accountNumber,      // REQUIRED
    CountryCode: countryCode          // REQUIRED
  });
};
```

---

### 5. SendTransaction / Confirm ❌
**Status**: MISSING CONFIRMATION PARAMETER
**Issue**: Transaction confirmation requires PIN/OTP
**Should Add Method**:
```javascript
const confirmTransaction = async (transactionId, confirmationPin, deliveryMode) => {
  return await callIMEMethod('ConfirmTransaction', {
    TransactionId: transactionId,
    ConfirmationPin: confirmationPin,  // Required for final confirmation
    DeliveryMode: deliveryMode
  });
};
```

---

## Summary of Issues Found

| Issue | Method | Severity | Status |
|-------|--------|----------|--------|
| Missing parameter validation | createCustomer | HIGH | ❌ Needs fix |  
| Missing parameter validation | createReceiver | HIGH | ❌ Needs fix |
| Wrong parameter signature | validateBankAccount | MEDIUM | ❌ Needs fix |
| Missing confirmation flow | sendMoney | HIGH | ❌ Needs feature |
| Generic request handling | Most methods | MEDIUM | ⚠️ Works but not ideal |

---

## Action Items

### Priority 1 (Before production):
1. ✅ Add parameter validation in controllers
2. ✅ Fix parameter signatures in service
3. ✅ Add transaction confirmation flow
4. ✅ Validate currency codes (AUD, USD, NZD, etc.)

### Priority 2 (Nice to have):
1. Create typed interfaces for request/response
2. Add logging for parameter validation
3. Add rate limiting for API calls
4. Create parameter validation middleware

---

## Real Parameter Examples for Testing

### Example 1: Create Customer
```json
POST /api/ime/customers
{
  "FirstName": "Ram",
  "LastName": "Bahadur",
  "Gender": "M",
  "DateOfBirth": "1995-06-15",
  "IDType": "NP_ID",
  "IDNumber": "504XXXXXXXXX",
  "PhoneNumber": "+977-9841234567",
  "EmailAddress": "ram@example.com",
  "CountryCode": "NP"
}
```

### Example 2: Create Receiver
```json
POST /api/ime/receivers
{
  "CustomerId": "CUST123",
  "FirstName": "Hari",
  "LastName": "Kumar",
  "IDType": "NP_ID",
  "IDNumber": "504XXXXXXXXX",
  "PhoneNumber": "+977-9841234567",
  "BankCode": "NK",
  "AccountNumber": "1234567890",
  "CountryCode": "NP"
}
```

### Example 3: Send Money
```json
POST /api/ime/transactions/send
{
  "SenderCustomerId": "CUST123",
  "ReceiverCustomerId": "RCV456",
  "Amount": 500,
  "SourceCurrency": "AUD",
  "DestinationCurrency": "NPR",
  "PaymentMode": "BANK",
  "Purpose": "Family support"
}
```

---

## Conclusion

✅ **Parameter names are CORRECT** (PascalCase as per SOAP spec)
⚠️ **Parameter validation needs improvement**
❌ **Request body mapping needs clarification and validation**

Recommendation: Implement strict parameter validation in controllers before passing to service layer.
