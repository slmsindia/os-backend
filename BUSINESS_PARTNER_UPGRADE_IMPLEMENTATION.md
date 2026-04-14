# Business Partner Upgrade System - Implementation Summary

## Overview
Implemented a complete workflow where **Users, Members, and Agents** can apply to become **Business Partners** by filling out a business details form. Admins can review and approve/reject these applications.

---

## Changes Made

### 1. Database Schema Changes (`prisma/schema.prisma`)

#### Added BUSINESS_PARTNER to Identity Enum
```prisma
enum Identity {
  SUPER_ADMIN
  ADMIN
  SUB_ADMIN
  COUNTRY_HEAD
  STATE_HEAD
  STATE_PARTNER
  DISTRICT_PARTNER
  AGENT
  USER
  BUSINESS_PARTNER  // ← NEW
}
```

#### Created BusinessPartnerApplication Model
New table to store business partner applications with:
- Business details (company name, registration, GST, etc.)
- Contact information (email, website)
- Location (address, city, state, pincode)
- Industry information
- Business plan and expected job postings
- Approval status (PENDING, APPROVED, REJECTED)
- Admin review tracking

#### Updated User Model Relations
Added two new relations:
- `bpApplication` - The business partner application filed by this user
- `reviewedBPApplications` - Applications reviewed by this admin

---

### 2. Controller Updates (`src/controllers/role-upgrade.controller.js`)

#### Updated Upgrade Paths
```javascript
const UPGRADE_PATHS = {
  USER: ["MEMBER", "AGENT", "BUSINESS_PARTNER"],
  MEMBER: ["AGENT", "BUSINESS_PARTNER"],
  AGENT: ["BUSINESS_PARTNER"]
};
```

#### Enhanced `requestUpgrade()` Function
- Validates business details for BUSINESS_PARTNER applications
- Checks for existing business profile or pending applications
- Creates `BusinessPartnerApplication` record with all business details
- Submits role upgrade request

#### Enhanced `getPendingUpgrades()` Function (Admin)
- Added `targetRole` query parameter to filter by role
- Includes `bpApplication` details when viewing BUSINESS_PARTNER requests
- Returns complete business information for admin review

#### Enhanced `processUpgradeRequest()` Function (Admin)
When **APPROVING** a BUSINESS_PARTNER:
1. Creates a `Business` profile with application details
2. Marks business as verified (`isVerified: true`)
3. Updates application status to `APPROVED`
4. Changes user identity to `BUSINESS_PARTNER`

When **REJECTING** a BUSINESS_PARTNER:
1. Updates application status to `REJECTED`
2. Stores rejection reason in `reviewNotes`
3. Clears the upgrade request

#### Enhanced `getMyUpgradeStatus()` Function
- Returns business application details for BUSINESS_PARTNER requests
- Shows application status, review notes, and timestamps

---

### 3. API Documentation Updates (`API_TESTING_FLOW.md`)

Added comprehensive API examples:
- **6.1** - User/Member/Agent apply to become Business Partner
- **6.2** - Check application status
- **6.3** - Admin view pending applications (with filter)
- **6.4** - Admin approve application
- **6.5** - Admin reject application
- **6.6** - Legacy direct business creation (kept for reference)

---

## API Endpoints

### For Users/Members/Agents

#### 1. Apply to Become Business Partner
```
POST /role-upgrade/request
Authorization: Bearer <TOKEN>

{
  "targetRole": "BUSINESS_PARTNER",
  "paymentId": "pay_123",  // Optional
  "businessDetails": {
    "companyName": "Tech Solutions Pvt Ltd",
    "registrationNo": "REG123456",
    "gstNumber": "24ABCDE1234F1Z5",
    "email": "business@example.com",
    "website": "https://business.com",
    "address": "Business Park",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "pincode": "380001",
    "industry": "IT",
    "companySize": "11-50",
    "businessPlan": "Want to hire developers",
    "expectedJobs": 10
  }
}
```

#### 2. Check Application Status
```
GET /role-upgrade/my-status
Authorization: Bearer <TOKEN>
```

---

### For Admins

#### 3. View All Pending Business Partner Applications
```
GET /role-upgrade/admin/pending?targetRole=BUSINESS_PARTNER&page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

#### 4. Approve Application
```
PATCH /role-upgrade/admin/{userId}/process
Authorization: Bearer <ADMIN_TOKEN>

{
  "action": "APPROVE",
  "reason": "Business verified"
}
```

#### 5. Reject Application
```
PATCH /role-upgrade/admin/{userId}/process
Authorization: Bearer <ADMIN_TOKEN>

{
  "action": "REJECT",
  "reason": "Insufficient details"
}
```

---

## Workflow

### User Journey
1. **User/Member/Agent** logs in
2. Checks available upgrades: `GET /role-upgrade/available`
3. Sees BUSINESS_PARTNER as an option with required fee
4. Fills business details form and submits application
5. Application goes to **PENDING** status
6. User can check status anytime: `GET /role-upgrade/my-status`

### Admin Journey
1. **Admin** logs in
2. Views pending applications: `GET /role-upgrade/admin/pending?targetRole=BUSINESS_PARTNER`
3. Reviews business details, documents, and business plan
4. **Approves** or **Rejects** the application
5. If approved:
   - User's role changes to `BUSINESS_PARTNER`
   - Business profile is automatically created and verified
   - User can now post jobs

---

## Database Migration

### Option 1: Using Prisma (Recommended)
```bash
npx prisma migrate dev --name add_business_partner_upgrade
npx prisma generate
```

### Option 2: Using SQL Script
If Prisma migration fails, use the provided SQL script:
```bash
psql -U <username> -d <database> -f migration-business-partner-upgrade.sql
```

---

## Validation Rules

### Application Submission
- ✅ User cannot have existing business profile
- ✅ User cannot have pending business partner application
- ✅ Required fields: companyName, address, city, state, pincode
- ✅ Optional fields: registrationNo, gstNumber, email, website, industry, etc.

### Admin Approval
- ✅ Creates Business profile automatically
- ✅ Marks business as verified
- ✅ Updates user identity to BUSINESS_PARTNER
- ✅ Updates application status
- ✅ Logs admin action for audit trail

---

## Business Logic

### What Happens on Approval?
1. **Business Profile Created**
   - All application details copied to Business table
   - `isVerified` set to `true`
   - `verifiedAt` timestamp set

2. **User Role Updated**
   - `identity` changed to `BUSINESS_PARTNER`
   - `requestedRole` cleared
   - `approvalStatus` set to `APPROVED`
   - `approvedAt` timestamp set

3. **Application Updated**
   - `status` changed to `APPROVED`
   - `reviewedBy` set to admin ID
   - `reviewedAt` timestamp set
   - `reviewNotes` stored (if provided)

---

## Pricing Configuration

Admins can set the upgrade fee using PricingSetting:
```javascript
{
  key: "BUSINESS_PARTNER_UPGRADE",
  amount: 5000,  // ₹5000
  currency: "INR",
  isActive: true
}
```

If amount is 0 or not set, the upgrade is free.

---

## Testing Checklist

- [ ] User can submit business partner application
- [ ] Validation prevents duplicate applications
- [ ] Admin can view all pending applications
- [ ] Admin can filter by BUSINESS_PARTNER role
- [ ] Application details are complete and accurate
- [ ] Approval creates Business profile
- [ ] Approval updates user identity
- [ ] Business profile is verified after approval
- [ ] Rejection stores reason in reviewNotes
- [ ] User can check application status
- [ ] Payment integration works (if fee required)

---

## Next Steps

1. **Run Database Migration**
   ```bash
   npx prisma migrate dev --name add_business_partner_upgrade
   ```

2. **Set Pricing (Optional)**
   ```bash
   # Use admin API to set BUSINESS_PARTNER_UPGRADE pricing
   ```

3. **Test the Flow**
   - Create a test user
   - Submit business partner application
   - Login as admin and approve
   - Verify business profile creation

4. **Update Frontend**
   - Add business partner application form
   - Show application status
   - Admin dashboard for reviewing applications

---

## Files Modified

1. `prisma/schema.prisma` - Added enum value and new model
2. `src/controllers/role-upgrade.controller.js` - Enhanced all upgrade functions
3. `API_TESTING_FLOW.md` - Updated documentation with new flows
4. `migration-business-partner-upgrade.sql` - SQL migration script (created)

---

## Benefits

✅ **Controlled Access** - Admins verify businesses before they can post jobs  
✅ **Complete Information** - All business details collected upfront  
✅ **Audit Trail** - Full tracking of applications and approvals  
✅ **Flexible Pricing** - Admins can set upgrade fees  
✅ **User Friendly** - Clear application status and feedback  
✅ **Automatic Setup** - Business profile created on approval  

---

## Support

For questions or issues:
1. Check API documentation in `API_TESTING_FLOW.md`
2. Review controller logic in `role-upgrade.controller.js`
3. Examine schema in `prisma/schema.prisma`
4. Run migrations when database is available
