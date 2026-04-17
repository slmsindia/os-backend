# Membership API Documentation

## Overview
This document describes the membership registration flow with Razorpay payment integration.

## Flow Summary
1. User gets reference data (education, sectors, job roles, document types)
2. User submits membership application with all required details
3. Razorpay payment order is created
4. User completes payment via Razorpay interface
5. Payment is verified
6. Admin reviews and approves/rejects the application
7. If approved, user becomes a MEMBER
8. If rejected, user can resubmit without paying again

---

## USER ENDPOINTS

### 1. Get Membership Price
**GET** `/api/membership/price`

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 100,
    "currency": "INR"
  }
}
```

---

### 2. Get Reference Data
**GET** `/api/membership/reference-data`

**Response:**
```json
{
  "success": true,
  "data": {
    "educations": [{"id": "...", "name": "Bachelor's Degree"}],
    "sectors": [{"id": "...", "name": "Information Technology"}],
    "jobRoles": [{"id": "...", "name": "Engineer"}],
    "documentTypes": [{"id": "...", "name": "Aadhaar Card"}]
  }
}
```

---

### 3. Create Membership Application
**POST** `/api/membership/apply`

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "gender": "male",
  "educationId": "<education-id>",
  "sectorId": "<sector-id>",
  "jobRoleId": "<job-role-id>",
  "maritalStatus": "UnMarried",
  "citizenship": "India",
  "isMigrantWorker": false,
  "monthlyIncome": "below 15000",
  "currentCountry": "India",
  "currentState": "Maharashtra",
  "currentDistrict": "Mumbai",
  "currentAddress": "123 Main Street",
  "currentPincode": "400001",
  "permanentCountry": "India",
  "permanentState": "Bihar",
  "permanentDistrict": "Patna",
  "permanentAddress": "456 Home Street",
  "permanentPincode": "800001",
  "documents": [
    {
      "documentTypeId": "<document-type-id>",
      "documentNumber": "1234-5678-9012",
      "frontImageUrl": "https://example.com/front.jpg",
      "backImageUrl": "https://example.com/back.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership application created. Please complete the payment.",
  "data": {
    "applicationId": "<application-id>",
    "orderId": "order_xxxxx",
    "amount": 100,
    "currency": "INR",
    "key": "rzp_test_SctRrmpPJDKXas"
  }
}
```

---

### 4. Verify Payment
**POST** `/api/membership/verify-payment`

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "applicationId": "<application-id>",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_from_razorpay"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment successful. Your membership application is under review."
}
```

---

### 5. Get Application Status
**GET** `/api/membership/status`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "PENDING",
    "firstName": "John",
    "lastName": "Doe",
    "payment": {
      "status": "SUCCESS",
      "amount": 100
    },
    "education": {...},
    "sector": {...},
    "jobRole": {...},
    "documents": [...]
  }
}
```

---

### 6. Resubmit Rejected Application
**POST** `/api/membership/resubmit`

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:** (Same as create application, but payment not required)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "gender": "male",
  "educationId": "<education-id>",
  "sectorId": "<sector-id>",
  "jobRoleId": "<job-role-id>",
  "maritalStatus": "UnMarried",
  "citizenship": "India",
  "isMigrantWorker": false,
  "monthlyIncome": "below 15000",
  "currentCountry": "India",
  "currentState": "Maharashtra",
  "currentDistrict": "Mumbai",
  "currentAddress": "123 Main Street",
  "currentPincode": "400001",
  "permanentCountry": "India",
  "permanentState": "Bihar",
  "permanentDistrict": "Patna",
  "permanentAddress": "456 Home Street",
  "permanentPincode": "800001",
  "documents": [
    {
      "documentTypeId": "<document-type-id>",
      "documentNumber": "1234-5678-9012",
      "frontImageUrl": "https://example.com/front.jpg",
      "backImageUrl": "https://example.com/back.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application resubmitted successfully. No payment required.",
  "data": {
    "applicationId": "<application-id>"
  }
}
```

---

## ADMIN ENDPOINTS

### 1. Update Membership Price
**PUT** `/api/admin/membership/price`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "price": 150
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership price updated successfully",
  "data": {
    "price": 150,
    "currency": "INR"
  }
}
```

---

### 2. Get All Membership Applications
**GET** `/api/admin/membership/applications?status=PENDING&page=1&limit=20`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Query Parameters:**
- `status` (optional): PENDING, APPROVED, REJECTED
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "...",
        "status": "PENDING",
        "user": {
          "mobile": "9876543210",
          "fullName": "User Name"
        },
        "payment": {
          "status": "SUCCESS",
          "amount": 100
        },
        "education": {...},
        "sector": {...},
        "jobRole": {...},
        "documents": [...]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

### 3. Get Application Details
**GET** `/api/admin/membership/applications/:applicationId`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "status": "PENDING",
    "user": {...},
    "payment": {...},
    "education": {...},
    "sector": {...},
    "jobRole": {...},
    "documents": [...]
  }
}
```

---

### 4. Approve Application
**POST** `/api/admin/membership/applications/:applicationId/approve`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Response:**
```json
{
  "success": true,
  "message": "Membership application approved successfully",
  "data": {
    "applicationId": "...",
    "userId": "..."
  }
}
```

---

### 5. Reject Application
**POST** `/api/admin/membership/applications/:applicationId/reject`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "reason": "Incomplete documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership application rejected",
  "data": {
    "applicationId": "...",
    "rejectionReason": "Incomplete documentation"
  }
}
```

---

### 6. Create Education
**POST** `/api/admin/education`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "name": "Professional Certification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Education created successfully",
  "data": {
    "id": "...",
    "name": "Professional Certification"
  }
}
```

---

### 7. Get Educations
**GET** `/api/admin/education`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

---

### 8. Create Sector
**POST** `/api/admin/sector`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "name": "E-commerce"
}
```

---

### 9. Get Sectors
**GET** `/api/admin/sector`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

---

### 10. Create Job Role
**POST** `/api/admin/job-role`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "name": "Data Analyst"
}
```

---

### 11. Get Job Roles
**GET** `/api/admin/job-role`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

---

### 12. Create Document Type
**POST** `/api/admin/document-type`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

**Request Body:**
```json
{
  "name": "Work Permit"
}
```

---

### 13. Get Document Types
**GET** `/api/admin/document-type`

**Headers:**
- `Authorization: Bearer <token>`
- Requires: SUPER_ADMIN, WHITE_LABEL_ADMIN, or ADMIN

---

## Razorpay Integration (Frontend)

### Frontend Payment Flow

```javascript
// 1. Create application
const applicationResponse = await fetch('/api/membership/apply', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(applicationData)
});

const { data } = await applicationResponse.json();

// 2. Open Razorpay checkout
const options = {
  key: data.key,
  amount: data.amount * 100, // In paise
  currency: data.currency,
  name: 'Online Saathi',
  description: 'Membership Fee',
  order_id: data.orderId,
  handler: async function (response) {
    // 3. Verify payment
    const verifyResponse = await fetch('/api/membership/verify-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId: data.applicationId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
    
    const verifyResult = await verifyResponse.json();
    if (verifyResult.success) {
      alert('Payment successful! Your application is under review.');
    }
  },
  prefill: {
    name: `${firstName} ${lastName}`,
    email: email,
    contact: mobile
  },
  theme: {
    color: '#3399cc'
  }
};

const rzp = new window.Razorpay(options);
rzp.open();
```

---

## Testing with Postman

### Setup
1. Login as user to get token
2. Use token in Authorization header: `Bearer <token>`

### Test Flow
1. GET `/api/membership/price` - Check membership price
2. GET `/api/membership/reference-data` - Get all dropdown options
3. POST `/api/membership/apply` - Create application
4. Use Razorpay test cards for payment:
   - Card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date
5. POST `/api/membership/verify-payment` - Verify payment
6. GET `/api/membership/status` - Check application status

### Admin Flow
1. Login as admin
2. GET `/api/admin/membership/applications` - View all applications
3. POST `/api/admin/membership/applications/:id/approve` - Approve
   OR
   POST `/api/admin/membership/applications/:id/reject` - Reject with reason

---

## Notes

- All monetary amounts are in INR (Indian Rupees)
- Razorpay test mode is enabled with provided credentials
- User can only have one PENDING or APPROVED application at a time
- Rejected applications can be resubmitted without payment
- Admin must provide a reason when rejecting an application
- User type is automatically updated to MEMBER upon approval

---

## 🆕 NEW: Admin User & Member Management APIs

### Get All Users

**GET** `/api/admin/users`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `identity` (optional): Filter by user type (USER, MEMBER, SAATHI, BUSINESS_PARTNER, STATE_PARTNER, DISTRICT_PARTNER, AGENT, ADMIN)
- `approvalStatus` (optional): Filter by approval status (PENDING, APPROVED, REJECTED)
- `search` (optional): Search by mobile number or full name

**Example Request:**
```
GET /api/admin/users?page=1&limit=10&identity=USER&search=98765
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "mobile": "9876543210",
        "email": "user@example.com",
        "fullName": "John Doe",
        "profilePhoto": "https://example.com/photo.jpg",
        "gender": "MALE",
        "dateOfBirth": "1990-01-01T00:00:00.000Z",
        "identity": "USER",
        "tenantId": "tenant-uuid",
        "referredBy": null,
        "referralCode": "unique-code",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "roles": ["USER"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### Get All Members (Membership Applications)

**GET** `/api/admin/members`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by application status (PENDING, APPROVED, REJECTED)

**Example Request:**
```
GET /api/admin/members?page=1&limit=20&status=PENDING
```

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "application-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "status": "PENDING",
        "gender": "male",
        "maritalStatus": "UnMarried",
        "citizenship": "India",
        "isMigrantWorker": false,
        "monthlyIncome": "below 15000",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "user": {
          "id": "user-uuid",
          "mobile": "9876543210",
          "fullName": "Test User",
          "email": "user@example.com",
          "profilePhoto": "https://example.com/photo.jpg",
          "identity": "USER"
        },
        "payment": {
          "id": "payment-uuid",
          "status": "SUCCESS",
          "amount": 100,
          "currency": "INR",
          "razorpayOrderId": "order_MxK..."
        },
        "education": {
          "id": "edu-7",
          "name": "Bachelor's Degree"
        },
        "sector": {
          "id": "sec-4",
          "name": "Information Technology"
        },
        "jobRole": {
          "id": "job-6",
          "name": "Engineer"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

---

## Usage Examples

### Filter Users by Type
```bash
# Get all agents
GET /api/admin/users?identity=AGENT

# Get all state partners
GET /api/admin/users?identity=STATE_PARTNER

# Get only members
GET /api/admin/users?identity=MEMBER
```

### Search Users
```bash
# Search by mobile number
GET /api/admin/users?search=98765

# Search by name
GET /api/admin/users?search=John
```

### Filter Members by Application Status
```bash
# Get only approved members
GET /api/admin/members?status=APPROVED

# Get only pending applications
GET /api/admin/members?status=PENDING

# Get rejected applications
GET /api/admin/members?status=REJECTED
```

---

## 💰 WALLET TOP-UP SYSTEM

### Overview
The wallet system allows members to add money to their wallet by:
1. Admin posts bank account details
2. Member transfers money to the bank account via UPI/Banking apps
3. Member submits top-up request with payment proof (screenshot)
4. Admin verifies and approves/rejects the request
5. If approved, money is added to member's wallet

**Note:** Wallet is automatically created when a user's membership is approved.

---

### MEMBER WALLET ENDPOINTS

#### 1. Get My Wallet

**GET** `/api/wallet/my-wallet`

**Headers:**
```
Authorization: Bearer <member_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "userId": "user-uuid",
    "balance": 5000.00,
    "currency": "INR",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "topUpRequests": [
      {
        "id": "request-uuid",
        "amount": 5000,
        "status": "APPROVED",
        "utrNumber": "UPI1234567890",
        "bankDetails": {
          "id": "bank-uuid",
          "bankName": "State Bank of India",
          "accountNumber": "1234567890"
        }
      }
    ]
  }
}
```

---

#### 2. Get Active Bank Details

**GET** `/api/wallet/bank-details`

**Headers:**
```
Authorization: Bearer <member_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bank-uuid",
      "bankName": "State Bank of India",
      "beneficiaryName": "Company Name Pvt Ltd",
      "accountNumber": "1234567890",
      "branch": "Mumbai Main Branch",
      "ifscCode": "SBIN0001234",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

#### 3. Create Top-Up Request

**POST** `/api/wallet/top-up`

**Headers:**
```
Authorization: Bearer <member_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 5000,
  "depositDate": "2024-01-15",
  "bankDetailsId": "bank-uuid",
  "utrNumber": "UPI1234567890",
  "paymentScreenshot": "https://example.com/screenshot.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request submitted successfully. Please wait for admin approval.",
  "data": {
    "id": "request-uuid",
    "walletId": "wallet-uuid",
    "bankDetailsId": "bank-uuid",
    "amount": 5000,
    "depositDate": "2024-01-15T00:00:00.000Z",
    "utrNumber": "UPI1234567890",
    "paymentScreenshot": "https://example.com/screenshot.jpg",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Important Notes:**
- UTR number must be globally unique (cannot reuse UTR from approved requests)
- If request is rejected, the same UTR can be reused
- Bank details must be active
- Amount must be greater than 0

---

#### 4. Get My Top-Up Requests

**GET** `/api/wallet/top-up/requests?page=1&limit=20&status=PENDING`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)

**Headers:**
```
Authorization: Bearer <member_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request-uuid",
        "amount": 5000,
        "status": "PENDING",
        "utrNumber": "UPI1234567890",
        "depositDate": "2024-01-15T00:00:00.000Z",
        "paymentScreenshot": "https://example.com/screenshot.jpg",
        "bankDetails": {
          "id": "bank-uuid",
          "bankName": "State Bank of India",
          "accountNumber": "1234567890",
          "ifscCode": "SBIN0001234"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### ADMIN WALLET ENDPOINTS

#### 5. Create Bank Details

**POST** `/api/wallet/admin/bank-details`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "bankName": "State Bank of India",
  "beneficiaryName": "Company Name Pvt Ltd",
  "accountNumber": "1234567890",
  "branch": "Mumbai Main Branch",
  "ifscCode": "SBIN0001234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank details added successfully",
  "data": {
    "id": "bank-uuid",
    "bankName": "State Bank of India",
    "beneficiaryName": "Company Name Pvt Ltd",
    "accountNumber": "1234567890",
    "branch": "Mumbai Main Branch",
    "ifscCode": "SBIN0001234",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### 6. Get All Bank Details

**GET** `/api/wallet/admin/bank-details?page=1&limit=20&isActive=true`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `isActive` (optional): Filter by active status (true/false)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bankDetails": [
      {
        "id": "bank-uuid",
        "bankName": "State Bank of India",
        "beneficiaryName": "Company Name Pvt Ltd",
        "accountNumber": "1234567890",
        "branch": "Mumbai Main Branch",
        "ifscCode": "SBIN0001234",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

#### 7. Update Bank Details (Activate/Deactivate)

**PUT** `/api/wallet/admin/bank-details/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isActive": false
}
```

You can also update other fields:
```json
{
  "bankName": "New Bank Name",
  "accountNumber": "9876543210",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank details updated successfully",
  "data": {
    "id": "bank-uuid",
    "bankName": "New Bank Name",
    "accountNumber": "9876543210",
    "isActive": true,
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

#### 8. Get All Top-Up Requests

**GET** `/api/wallet/admin/top-up/requests?page=1&limit=20&status=PENDING`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request-uuid",
        "amount": 5000,
        "status": "PENDING",
        "utrNumber": "UPI1234567890",
        "depositDate": "2024-01-15T00:00:00.000Z",
        "paymentScreenshot": "https://example.com/screenshot.jpg",
        "wallet": {
          "user": {
            "id": "user-uuid",
            "mobile": "9876543210",
            "fullName": "John Doe",
            "email": "john@example.com"
          }
        },
        "bankDetails": {
          "bankName": "State Bank of India",
          "accountNumber": "1234567890",
          "branch": "Mumbai Main Branch",
          "ifscCode": "SBIN0001234"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

#### 9. Approve Top-Up Request

**POST** `/api/wallet/admin/top-up/:requestId/approve`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request approved successfully. Wallet balance updated.",
  "data": {
    "requestId": "request-uuid",
    "amount": 5000,
    "walletId": "wallet-uuid"
  }
}
```

**What happens on approval:**
- Request status changes to APPROVED
- Amount is added to member's wallet balance
- UTR number is marked as used (cannot be reused)

---

#### 10. Reject Top-Up Request

**POST** `/api/wallet/admin/top-up/:requestId/reject`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Invalid UTR number. Please verify with your bank statement and resubmit."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request rejected",
  "data": {
    "requestId": "request-uuid",
    "rejectionReason": "Invalid UTR number. Please verify with your bank statement and resubmit."
  }
}
```

**What happens on rejection:**
- Request status changes to REJECTED
- Wallet balance is NOT updated
- UTR number can be reused in a new request
- Member can see the rejection reason

---

## WALLET TOP-UP FLOW

### Complete Member Journey:

1. **Check Wallet Balance**
   ```
   GET /api/wallet/my-wallet
   ```

2. **Get Bank Details**
   ```
   GET /api/wallet/bank-details
   ```

3. **Transfer Money** (Outside App)
   - Member uses UPI app (PhonePe, GPay, Paytm) or Banking app
   - Transfers money to the bank account shown in step 2
   - Gets transaction receipt/screenshot

4. **Submit Top-Up Request**
   ```
   POST /api/wallet/top-up
   ```
   - Enter amount transferred
   - Enter deposit date
   - Select bank account used
   - Enter UTR number (from transaction)
   - Upload payment screenshot URL

5. **Wait for Admin Approval**
   - Request status: PENDING
   - Can check status: `GET /api/wallet/top-up/requests`

6. **Result**
   - **If Approved**: Money added to wallet balance
   - **If Rejected**: Can resubmit with same UTR after fixing issues

### Complete Admin Journey:

1. **Add Bank Account**
   ```
   POST /api/wallet/admin/bank-details
   ```

2. **View Pending Requests**
   ```
   GET /api/wallet/admin/top-up/requests?status=PENDING
   ```

3. **Verify Payment**
   - Check UTR number in bank statement
   - Verify amount matches
   - Check payment screenshot

4. **Approve or Reject**
   - **Approve**: `POST /api/wallet/admin/top-up/:id/approve`
   - **Reject**: `POST /api/wallet/admin/top-up/:id/reject` (with reason)

5. **Manage Bank Accounts**
   - View all: `GET /api/wallet/admin/bank-details`
   - Activate/Deactivate: `PUT /api/wallet/admin/bank-details/:id`
   - Delete: `DELETE /api/wallet/admin/bank-details/:id`

---

## IMPORTANT VALIDATIONS

1. **UTR Uniqueness**
   - UTR must be unique across ALL approved requests globally
   - Rejected requests allow UTR reuse
   - Pending requests allow UTR reuse (in case they need to cancel)

2. **Bank Account Status**
   - Members can only submit to active bank accounts
   - Admin can deactivate accounts without deleting them

3. **Wallet Requirement**
   - Only MEMBERS can have wallets
   - Wallet is auto-created on membership approval
   - Non-members get error when trying to top-up

4. **Amount Validation**
   - Amount must be greater than 0
   - Amount is stored as Float (supports decimals)

5. **Status Transitions**
   - PENDING → APPROVED (wallet balance increases)
   - PENDING → REJECTED (wallet balance unchanged)
   - APPROVED/REJECTED → Cannot be changed again

6. **Security**
   - All endpoints require authentication
   - Admin endpoints require ADMIN/SUPER_ADMIN/WHITE_LABEL_ADMIN role
   - Member can only see their own wallet and requests
   - Admin can see all requests from all members
