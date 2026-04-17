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
