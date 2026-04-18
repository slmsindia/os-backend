# 🚀 Quick Start Guide - Membership System

## ✅ Server Status
Server is running on: **http://localhost:3005**

---

## 📝 Step-by-Step Testing Guide

### Step 1: Register/Login as User
```bash
# First, register a user (if not already registered)
POST http://localhost:3005/api/auth/register
Content-Type: application/json

{
  "mobile": "9876543210",
  "fullName": "Test User",
  "gender": "MALE",
  "dateOfBirth": "1990-01-01",
  "password": "Test@123"
}

# Response will include accessToken
```

### Step 2: Get Reference Data
```bash
GET http://localhost:3005/api/membership/reference-data
Authorization: Bearer <your-token>

# This returns:
# - educations (10 options)
# - sectors (13 options)
# - jobRoles (15 options)
# - documentTypes (7 options)
```

### Step 3: Get Membership Price
```bash
GET http://localhost:3005/api/membership/price

# Response:
# {
#   "success": true,
#   "data": {
#     "price": 100,
#     "currency": "INR"
#   }
# }
```

### Step 4: Apply for Membership
```bash
POST http://localhost:3005/api/membership/apply
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "gender": "male",
  "educationId": "<get-from-reference-data>",
  "sectorId": "<get-from-reference-data>",
  "jobRoleId": "<get-from-reference-data>",
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
      "documentTypeId": "<get-from-reference-data>",
      "documentNumber": "1234-5678-9012",
      "frontImageUrl": "https://example.com/front.jpg",
      "backImageUrl": "https://example.com/back.jpg"
    }
  ]
}

# Response includes:
# - applicationId
# - orderId (Razorpay order)
# - amount: 100
# - key: rzp_test_SctRrmpPJDKXas
```

### Step 5: Complete Razorpay Payment
Use the Razorpay test card:
- **Card Number**: 4111 1111 1111 1111
- **CVV**: 123
- **Expiry**: 12/25

After payment, you'll get:
- razorpay_order_id
- razorpay_payment_id
- razorpay_signature

### Step 6: Verify Payment
```bash
POST http://localhost:3005/api/membership/verify-payment
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "applicationId": "<application-id>",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature"
}
```

### Step 7: Check Application Status
```bash
GET http://localhost:3005/api/membership/status
Authorization: Bearer <your-token>

# Status will be: PENDING
```

---

## 👨‍💼 Admin Actions

### Login as Admin
Use admin credentials to get admin token

### View All Applications
```bash
GET http://localhost:3005/api/admin/membership/applications?status=PENDING
Authorization: Bearer <admin-token>
```

### Approve Application
```bash
POST http://localhost:3005/api/admin/membership/applications/<application-id>/approve
Authorization: Bearer <admin-token>

# User becomes MEMBER
```

### Reject Application
```bash
POST http://localhost:3005/api/admin/membership/applications/<application-id>/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Incomplete documentation"
}

# User can resubmit without payment
```

---

## 🔧 Admin Management

### Update Membership Price
```bash
PUT http://localhost:3005/api/admin/membership/price
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "price": 150
}
```

### Add New Education
```bash
POST http://localhost:3005/api/admin/education
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Professional Certification"
}
```

### Add New Sector
```bash
POST http://localhost:3005/api/admin/sector
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "E-commerce"
}
```

### Add New Job Role
```bash
POST http://localhost:3005/api/admin/job-role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Data Analyst"
}
```

### Add New Document Type
```bash
POST http://localhost:3005/api/admin/document-type
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Work Permit"
}
```

---

## 📊 API Endpoints Summary

### User Endpoints (Requires User Token)
- `GET /api/membership/price` - Get membership price
- `GET /api/membership/reference-data` - Get dropdown options
- `POST /api/membership/apply` - Submit application
- `POST /api/membership/verify-payment` - Verify payment
- `GET /api/membership/status` - Check status
- `POST /api/membership/resubmit` - Resubmit if rejected

### Admin Endpoints (Requires Admin Token)
- `PUT /api/admin/membership/price` - Update price
- `GET /api/admin/membership/applications` - List applications
- `GET /api/admin/membership/applications/:id` - View details
- `POST /api/admin/membership/applications/:id/approve` - Approve
- `POST /api/admin/membership/applications/:id/reject` - Reject
- `POST /api/admin/education` - Create education
- `GET /api/admin/education` - List educations
- `POST /api/admin/sector` - Create sector
- `GET /api/admin/sector` - List sectors
- `POST /api/admin/job-role` - Create job role
- `GET /api/admin/job-role` - List job roles
- `POST /api/admin/document-type` - Create document type
- `GET /api/admin/document-type` - List document types

---

## 🧪 Testing with Postman

1. Import the endpoints above into Postman
2. Create environment variables:
   - `base_url`: http://localhost:3005
   - `user_token`: <get from login>
   - `admin_token`: <get from admin login>
3. Use `{{base_url}}` and `{{user_token}}` in requests

---

## 🎯 Key Features Implemented

✅ Membership application with complete form
✅ Razorpay payment integration (₹100 default)
✅ Admin can change membership price
✅ Admin manages reference data (education, sectors, job roles, documents)
✅ Admin approves/rejects applications
✅ Rejected users can resubmit without payment
✅ Approved users become MEMBER
✅ Complete audit trail
✅ Payment verification & security

---

## 📚 Documentation Files

- `MEMBERSHIP_API.md` - Complete API documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `QUICK_START.md` - This guide

---

## ⚡ Ready to Test!

The system is fully functional and ready for testing. Start with the Step 1 above and follow through the complete flow.

For any issues, check the server logs in the terminal where `npm run dev` is running.
