# Business Partner Upgrade - Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration
```bash
npx prisma migrate dev --name add_business_partner_upgrade
npx prisma generate
```

If database is not available, save this SQL and run later:
```bash
# File: migration-business-partner-upgrade.sql
# Run: psql -U username -d database -f migration-business-partner-upgrade.sql
```

### Step 2: (Optional) Set Upgrade Fee
```http
PUT /api/admin/pricing/BUSINESS_PARTNER_UPGRADE
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "amount": 5000,
  "isActive": true
}
```

### Step 3: Test the Flow
See testing steps below 👇

---

## 📋 Complete Testing Flow

### 1️⃣ Create a Test User
```http
POST /api/auth/register
Content-Type: application/json

{
  "mobile": "9999999999",
  "fullName": "Test Business Owner",
  "gender": "MALE",
  "dateOfBirth": "1990-01-01",
  "password": "test123",
  "identity": "USER"
}
```

### 2️⃣ Login as User
```http
POST /api/auth/login
Content-Type: application/json

{
  "mobile": "9999999999",
  "password": "test123"
}
```
Save the token as `USER_TOKEN`

### 3️⃣ Check Available Upgrades
```http
GET /api/role-upgrade/available
Authorization: Bearer <USER_TOKEN>
```

Expected response should include:
```json
{
  "availableUpgrades": [
    { "role": "MEMBER", "fee": 0 },
    { "role": "AGENT", "fee": 0 },
    { "role": "BUSINESS_PARTNER", "fee": 5000 }
  ]
}
```

### 4️⃣ Submit Business Partner Application
```http
POST /api/role-upgrade/request
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "targetRole": "BUSINESS_PARTNER",
  "businessDetails": {
    "companyName": "Tech Solutions Pvt Ltd",
    "registrationNo": "REG123456",
    "gstNumber": "24ABCDE1234F1Z5",
    "email": "tech@example.com",
    "website": "https://techsolutions.com",
    "address": "Business Park, CG Road",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "pincode": "380001",
    "industry": "IT",
    "companySize": "11-50",
    "businessPlan": "We want to hire software developers and post tech jobs",
    "expectedJobs": 10
  }
}
```

### 5️⃣ Check Application Status
```http
GET /api/role-upgrade/my-status
Authorization: Bearer <USER_TOKEN>
```

Expected response:
```json
{
  "currentRole": "USER",
  "pendingRequest": "BUSINESS_PARTNER",
  "approvalStatus": "PENDING",
  "businessApplication": {
    "companyName": "Tech Solutions Pvt Ltd",
    "status": "PENDING"
  }
}
```

### 6️⃣ Login as Admin
```http
POST /api/auth/login
Content-Type: application/json

{
  "mobile": "<ADMIN_MOBILE>",
  "password": "<ADMIN_PASSWORD>"
}
```
Save the token as `ADMIN_TOKEN`

### 7️⃣ Admin: View Pending Applications
```http
GET /api/role-upgrade/admin/pending?targetRole=BUSINESS_PARTNER
Authorization: Bearer <ADMIN_TOKEN>
```

Expected response includes user details + full business application:
```json
{
  "requests": [
    {
      "id": "user-uuid",
      "fullName": "Test Business Owner",
      "mobile": "9999999999",
      "identity": "USER",
      "requestedRole": "BUSINESS_PARTNER",
      "bpApplication": {
        "companyName": "Tech Solutions Pvt Ltd",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "industry": "IT",
        "status": "PENDING"
      }
    }
  ]
}
```

### 8️⃣ Admin: Approve Application
```http
PATCH /api/role-upgrade/admin/{userId}/process
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "action": "APPROVE",
  "reason": "Business verified and approved"
}
```

### 9️⃣ Verify: User is Now Business Partner
```http
GET /api/role-upgrade/my-status
Authorization: Bearer <USER_TOKEN>
```

Expected:
```json
{
  "currentRole": "BUSINESS_PARTNER",
  "pendingRequest": null,
  "approvalStatus": "APPROVED",
  "approvedAt": "2026-04-14T10:30:00Z"
}
```

### 🔟 Verify: Business Profile Created
```http
GET /api/business/my
Authorization: Bearer <USER_TOKEN>
```

Expected: Business profile with all details from application, `isVerified: true`

---

## 🎯 What Happens Behind the Scenes

### On Application Submission:
1. ✅ Validates business details (required fields)
2. ✅ Checks no existing business profile
3. ✅ Checks no pending application
4. ✅ Creates `BusinessPartnerApplication` record
5. ✅ Sets user `requestedRole` to "BUSINESS_PARTNER"
6. ✅ Sets user `approvalStatus` to "PENDING"

### On Admin Approval:
1. ✅ Creates `Business` profile with application details
2. ✅ Sets `isVerified: true` on business
3. ✅ Changes user `identity` to "BUSINESS_PARTNER"
4. ✅ Updates application status to "APPROVED"
5. ✅ Sets `approvedAt` timestamp
6. ✅ Logs admin action for audit

### On Admin Rejection:
1. ✅ Updates application status to "REJECTED"
2. ✅ Stores rejection reason in `reviewNotes`
3. ✅ Clears user `requestedRole`
4. ✅ Sets user `approvalStatus` to "REJECTED"

---

## 🔍 API Endpoints Summary

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/role-upgrade/available` | User/Member/Agent | View upgrade options |
| POST | `/role-upgrade/request` | User/Member/Agent | Submit application |
| GET | `/role-upgrade/my-status` | User/Member/Agent | Check status |
| GET | `/role-upgrade/admin/pending?targetRole=BUSINESS_PARTNER` | Admin | View pending apps |
| PATCH | `/role-upgrade/admin/{userId}/process` | Admin | Approve/Reject |

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot upgrade from USER to BUSINESS_PARTNER"
**Solution:** Check UPGRADE_PATHS in role-upgrade.controller.js includes BUSINESS_PARTNER

### Issue: "Business partner application not found"
**Solution:** Ensure user submitted application before trying to approve

### Issue: "You already have a pending business partner application"
**Solution:** User must wait for current application to be processed or rejected

### Issue: "Payment of ₹5000 is required"
**Solution:** Either:
- Set pricing to 0 for free upgrades
- Implement payment flow and pass `paymentId`
- Remove payment validation for BUSINESS_PARTNER

---

## 📝 Required Business Fields

These fields are **REQUIRED**:
- ✅ companyName
- ✅ address
- ✅ city
- ✅ state
- ✅ pincode

These fields are **OPTIONAL**:
- registrationNo
- gstNumber
- email
- website
- industry
- companySize
- businessPlan
- expectedJobs

---

## 🎉 Success Indicators

After approval, verify:
- [ ] User identity = "BUSINESS_PARTNER"
- [ ] Business profile exists
- [ ] Business isVerified = true
- [ ] Application status = "APPROVED"
- [ ] User can access business routes
- [ ] User can post jobs

---

## 📚 Documentation Files

1. `BUSINESS_PARTNER_UPGRADE_IMPLEMENTATION.md` - Full implementation details
2. `API_TESTING_FLOW.md` - Complete API documentation (Phase 6)
3. `migration-business-partner-upgrade.sql` - SQL migration script
4. `prisma/schema.prisma` - Database schema with new model

---

## 🆘 Need Help?

1. Check logs: `console.error` statements in controller
2. Verify database: Check if BusinessPartnerApplication table exists
3. Test step-by-step: Follow the testing flow above
4. Review schema: `prisma/schema.prisma` BusinessPartnerApplication model

---

**Ready to test? Start with Step 1: Run the migration! 🚀**
