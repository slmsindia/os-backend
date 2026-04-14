# Online Saathi - Complete API Testing Flow

## Base URL
```
http://localhost:3005/api
```

## Authentication
All protected APIs require Bearer token in header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## ROLE HIERARCHY RULES

### Who Can Create Whom:
| Creator Role | Can Create |
|-------------|------------|
| SUPER_ADMIN | ADMIN, SUB_ADMIN, COUNTRY_HEAD, STATE_HEAD, DISTRICT_PARTNER, AGENT, MEMBER, USER |
| ADMIN | SUB_ADMIN, COUNTRY_HEAD, STATE_HEAD, DISTRICT_PARTNER, AGENT, MEMBER, USER |
| SUB_ADMIN | COUNTRY_HEAD, STATE_HEAD, DISTRICT_PARTNER |
| COUNTRY_HEAD | STATE_HEAD, DISTRICT_PARTNER |
| STATE_HEAD | DISTRICT_PARTNER |
| DISTRICT_PARTNER | (Cannot create subordinates) |
| AGENT | (Cannot create subordinates) |

---

## PHASE 1: SUPER ADMIN SETUP

### 1.1 Login as Super Admin
```http
POST /auth/login
Content-Type: application/json

{
  "mobile": "9999999999",
  "password": "superadmin123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "mobile": "9999999999",
    "identity": "SUPER_ADMIN"
  }
}
```

### 1.2 Create Admin (Super Admin)
```http
POST /hierarchy/admin/create
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "mobile": "8888888888",
  "fullName": "Main Admin",
  "password": "admin123",
  "identity": "ADMIN",
  "gender": "MALE",
  "dateOfBirth": "1990-01-01"
}
```

### 1.3 Set All Pricing (Super Admin)

#### Member Registration Fee
```http
POST /member-agent/admin/members/fee
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "amount": 500
}
```

#### Agent Registration Fee
```http
POST /member-agent/admin/agents/fee
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "type": "AGENT_REGISTRATION_FEE",
  "amount": 1000
}
```

#### Member to Agent Upgrade Fee
```http
POST /member-agent/admin/agents/fee
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "type": "MEMBER_TO_AGENT_UPGRADE_FEE",
  "amount": 800
}
```

#### Job Posting Fee (for Business Partners)
```http
POST /job-posting/admin/jobs/posting-fee
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "amount": 100
}
```

#### Job Profile Fee
```http
POST /admin/pricing
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "key": "JOB_PROFILE_FEE",
  "amount": 200,
  "currency": "INR"
}
```

#### Job Profile with Resume Fee
```http
POST /admin/pricing
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "key": "JOB_PROFILE_WITH_RESUME_FEE",
  "amount": 500,
  "currency": "INR"
}
```

### 1.4 Create Job Categories (Super Admin)
```http
POST /job-profile/admin/categories
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Information Technology",
  "description": "IT related jobs"
}
```

### 1.5 Create Job Roles (Super Admin)
```http
POST /job-profile/admin/roles
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Software Engineer",
  "categoryId": "category-uuid",
  "description": "Software development role"
}
```

### 1.6 Create Skills (Super Admin)
```http
POST /job-profile/admin/skills
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "JavaScript",
  "category": "Technical"
}
```

### 1.7 Create Facilities for Jobs (Super Admin)
```http
POST /job-posting/admin/jobs/facilities
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Health Insurance",
  "description": "Comprehensive health coverage",
  "icon": "https://example.com/health-icon.png"
}
```

---

## PHASE 2: ADMIN FLOWS

### 2.1 Login as Admin
```http
POST /auth/login
Content-Type: application/json

{
  "mobile": "8888888888",
  "password": "admin123"
}
```

### 2.2 Create Sub-Admin (Admin)
```http
POST /hierarchy/create
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "mobile": "7777777777",
  "fullName": "Sub Admin",
  "password": "subadmin123",
  "identity": "SUB_ADMIN",
  "gender": "MALE",
  "dateOfBirth": "1992-01-01"
}
```

### 2.3 Create Country Head (Admin)
```http
POST /hierarchy/create
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "mobile": "7666666666",
  "fullName": "Country Head",
  "password": "country123",
  "identity": "COUNTRY_HEAD",
  "gender": "MALE",
  "dateOfBirth": "1993-01-01",
  "parentId": "sub-admin-uuid"
}
```

### 2.4 Create State Head (Admin)
```http
POST /hierarchy/create
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "mobile": "7555555555",
  "fullName": "State Head",
  "password": "state123",
  "identity": "STATE_HEAD",
  "gender": "MALE",
  "dateOfBirth": "1994-01-01",
  "parentId": "country-head-uuid"
}
```

### 2.5 Create District Partner (Admin)
```http
POST /hierarchy/create
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "mobile": "7444444444",
  "fullName": "District Partner",
  "password": "district123",
  "identity": "DISTRICT_PARTNER",
  "gender": "MALE",
  "dateOfBirth": "1995-01-01",
  "parentId": "state-head-uuid"
}
```

### 2.6 Create Agent Directly (Admin - No Payment)
```http
POST /member-agent/admin/agents
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": "user-uuid",
  "aadharNumber": "123456789012",
  "maskAadharNumber": "XXXX XXXX 9012",
  "aadhaarFatherName": "Father Name",
  "aadhaarName": "Agent Name",
  "aadhaarAddress": "Aadhaar Address",
  "aadhaarDOB": "1990-01-01",
  "panCardNo": "ABCDE1234F",
  "panFirstName": "First",
  "panLastName": "Last",
  "computerLiteracy": true,
  "isPC": true,
  "internetSearchAndAccessLiteracy": true,
  "isEKYCDevice": true,
  "shopName": "My Shop",
  "shopType": "Retail",
  "licenceNo": "LIC123456",
  "shopAddress": "Shop Address",
  "shopDistrictId": "district-uuid",
  "shopStateId": "state-uuid",
  "shopPinCode": "380001",
  "shopCountry": "India",
  "documents": [
    {
      "type": 1,
      "document": "aadhar.jpg",
      "documentUrl": "https://example.com/aadhar.jpg",
      "format": 1,
      "name": "Aadhar Card",
      "size": 1024,
      "documentNumber": "123456789012"
    }
  ],
  "sections": ["section-1", "section-2"],
  "addresses": [
    {
      "address": "Home Address",
      "districtId": "district-uuid",
      "stateId": "state-uuid",
      "pinCode": "380001",
      "addressType": 0
    }
  ],
  "schemeFees": 100
}
```

### 2.7 Create Member Directly (Admin - No Payment)
```http
POST /member-agent/admin/members
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": "user-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-01",
  "email": "john@example.com",
  "profilePhoto": "https://example.com/photo.jpg",
  "genderId": "gender-uuid",
  "maritalStatus": "single",
  "citizen": "Indian",
  "education": "Bachelor's",
  "occupation": "Engineer",
  "sector": "IT",
  "jobRoles": ["role-1", "role-2"],
  "isMigrantWorker": false,
  "incomeAboveThreshold": true,
  "addresses": [
    {
      "address": "123 Main St",
      "districtId": "district-uuid",
      "stateId": "state-uuid",
      "pinCode": "380001",
      "addressType": 0
    }
  ],
  "documents": [
    {
      "type": 1,
      "document": "doc.jpg",
      "documentUrl": "https://example.com/doc.jpg",
      "format": 1,
      "name": "ID Proof",
      "size": 1024
    }
  ]
}
```

### 2.8 Admin Post Job (Unlimited - No Payment)
```http
POST /job-posting/jobs
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "jobRole": "Software Engineer",
  "jobDescription": "Looking for experienced software engineer",
  "requiredSkills": ["JavaScript", "Node.js", "React"],
  "jobType": "Full Time",
  "payStructure": "Full Time",
  "offeredAmount": 50000,
  "openings": 5,
  "shift": "Day",
  "urgentHiring": true,
  "education": "Bachelor's Degree",
  "experience": 2,
  "gender": "Any",
  "minAge": 21,
  "maxAge": 35,
  "country": "India",
  "state": "Gujarat",
  "district": "Ahmedabad",
  "pincode": "380001",
  "fullAddress": "123 Business Park, SG Highway",
  "weekOffDays": "Sunday",
  "facilities": ["Health Insurance", "PF"],
  "joiningFees": false,
  "contactName": "HR Manager",
  "contactNumber": "9876543210"
}
```

### 2.9 Get All Jobs (Admin)
```http
GET /job-posting/admin/jobs?page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

### 2.10 Get All Members (Admin)
```http
GET /member-agent/admin/members?page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

### 2.11 Get All Agents (Admin)
```http
GET /member-agent/admin/agents?page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

### 2.12 Approve Agent (Admin)
```http
PATCH /member-agent/admin/agents/{agent-id}/approve
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "status": "ACTIVE",
  "rejectionReason": null
}
```

### 2.13 Add Money to User Wallet (Admin)
```http
POST /wallet/admin/add-money
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": "user-uuid",
  "amount": 5000,
  "description": "Initial wallet load"
}
```

---

## PHASE 3: USER FLOWS

### 3.1 User Registration
```http
POST /auth/send-otp
Content-Type: application/json

{
  "mobile": "9111111111"
}
```

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "mobile": "9111111111",
  "otp": "123456"
}
```

```http
POST /auth/register
Content-Type: application/json

{
  "mobile": "9111111111",
  "fullName": "New User",
  "gender": "MALE",
  "dateOfBirth": "1995-01-01",
  "password": "user123"
}
```

### 3.2 User Login
```http
POST /auth/login
Content-Type: application/json

{
  "mobile": "9111111111",
  "password": "user123"
}
```

### 3.3 User Create Job Profile (Before Viewing Jobs)
```http
POST /job-profile/save
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "fullName": "John Doe",
  "phoneNumber": "9111111111",
  "email": "john@example.com",
  "maritalStatus": "Unmarried",
  "gender": "Male",
  "dateOfBirth": "1995-01-01",
  "languages": ["Hindi", "English"],
  "currentCountry": "India",
  "currentState": "Gujarat",
  "currentDistrict": "Ahmedabad",
  "currentAddress": "Current Address",
  "currentPincode": "380001",
  "permanentCountry": "India",
  "permanentState": "Gujarat",
  "permanentDistrict": "Ahmedabad",
  "permanentAddress": "Permanent Address",
  "permanentPincode": "380001",
  "jobType": "Full Time",
  "jobRole": "Software Engineer",
  "skills": ["JavaScript", "Node.js"],
  "jobDescription": "Looking for software engineering role",
  "education": [
    {
      "level": "Bachelor's",
      "schoolName": "GTU",
      "degree": "B.Tech",
      "passingYear": "2017",
      "percentage": "85"
    }
  ],
  "totalExperience": 3,
  "workExperience": [
    {
      "jobRole": "Developer",
      "companyName": "Tech Co",
      "salary": 30000,
      "yearsExp": 3,
      "country": "India",
      "city": "Ahmedabad",
      "startDate": "2020-01-01",
      "endDate": "2023-01-01",
      "currentlyWorking": false
    }
  ],
  "documentType": "Aadhar",
  "documentFront": "https://example.com/aadhar-front.jpg",
  "documentBack": "https://example.com/aadhar-back.jpg",
  "documentNumber": "123456789012",
  "transactionType": "ONLY_PROFILE"
}
```

### 3.4 Check if Can View Jobs
```http
GET /job-profile/can-view-jobs
Authorization: Bearer <USER_TOKEN>
```

### 3.5 Search Jobs (After Profile Created)
```http
GET /jobs/search?keyword=software&location=ahmedabad
Authorization: Bearer <USER_TOKEN>
```

### 3.6 Apply for Job
```http
POST /jobs/{job-id}/apply
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "coverLetter": "I am interested in this position",
  "resumeUrl": "https://example.com/resume.pdf"
}
```

---

## PHASE 4: MEMBER FLOWS

### 4.1 User Becomes Member (With Payment)
```http
POST /member-agent/members/register
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-01",
  "email": "john@example.com",
  "profilePhoto": "https://example.com/photo.jpg",
  "genderId": "gender-uuid",
  "maritalStatus": "single",
  "citizen": "Indian",
  "education": "Bachelor's",
  "occupation": "Engineer",
  "sector": "IT",
  "jobRoles": ["role-1"],
  "isMigrantWorker": false,
  "incomeAboveThreshold": true,
  "addresses": [
    {
      "address": "123 Main St",
      "districtId": "district-uuid",
      "stateId": "state-uuid",
      "pinCode": "380001",
      "addressType": 0
    }
  ],
  "documents": [
    {
      "type": 1,
      "document": "doc.jpg",
      "documentUrl": "https://example.com/doc.jpg",
      "format": 1,
      "name": "ID Proof",
      "size": 1024
    }
  ],
  "razorPayReferenceNo": "pay_123456",
  "paymentMode": "ONLINE"
}
```

### 4.2 Get My Member Profile
```http
GET /member-agent/members/me
Authorization: Bearer <MEMBER_TOKEN>
```

### 4.3 Update My Member Profile
```http
PATCH /member-agent/members/me
Authorization: Bearer <MEMBER_TOKEN>
Content-Type: application/json

{
  "firstName": "John Updated",
  "email": "john.new@example.com"
}
```

### 4.4 Member Benefits
- Can view all jobs without restrictions
- Can apply to unlimited jobs
- Can access member-exclusive features
- Can upgrade to Agent

---

## PHASE 5: AGENT/SAATHI FLOWS

### 5.1 User Becomes Agent (With Payment)
```http
POST /member-agent/agents/register
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "aadharNumber": "123456789012",
  "maskAadharNumber": "XXXX XXXX 9012",
  "aadhaarFatherName": "Father Name",
  "aadhaarName": "Agent Name",
  "aadhaarAddress": "Aadhaar Address",
  "aadhaarDOB": "1990-01-01",
  "panCardNo": "ABCDE1234F",
  "panFirstName": "First",
  "panLastName": "Last",
  "computerLiteracy": true,
  "isPC": true,
  "internetSearchAndAccessLiteracy": true,
  "isEKYCDevice": true,
  "shopName": "My Shop",
  "shopType": "Retail",
  "licenceNo": "LIC123456",
  "shopAddress": "Shop Address",
  "shopDistrictId": "district-uuid",
  "shopStateId": "state-uuid",
  "shopPinCode": "380001",
  "shopCountry": "India",
  "documents": [
    {
      "type": 1,
      "document": "aadhar.jpg",
      "documentUrl": "https://example.com/aadhar.jpg",
      "format": 1,
      "name": "Aadhar Card",
      "size": 1024,
      "documentNumber": "123456789012"
    }
  ],
  "sections": ["section-1"],
  "addresses": [
    {
      "address": "Home Address",
      "districtId": "district-uuid",
      "stateId": "state-uuid",
      "pinCode": "380001",
      "addressType": 0
    }
  ],
  "schemeFees": 100,
  "razorPayReferenceNo": "pay_123456",
  "paymentMode": "ONLINE"
}
```

### 5.2 Member Upgrades to Agent (With Payment)
```http
POST /member-agent/agents/upgrade
Authorization: Bearer <MEMBER_TOKEN>
Content-Type: application/json

{
  "aadharNumber": "123456789012",
  "panCardNo": "ABCDE1234F",
  "shopName": "My Shop",
  "shopAddress": "Shop Address",
  "documents": [
    {
      "type": 1,
      "document": "aadhar.jpg",
      "documentUrl": "https://example.com/aadhar.jpg",
      "format": 1,
      "name": "Aadhar Card",
      "size": 1024
    }
  ],
  "razorPayReferenceNo": "pay_123456",
  "paymentMode": "ONLINE"
}
```

### 5.3 Get My Agent Profile
```http
GET /member-agent/agents/me
Authorization: Bearer <AGENT_TOKEN>
```

### 5.4 Update My Agent Profile
```http
PATCH /member-agent/agents/me
Authorization: Bearer <AGENT_TOKEN>
Content-Type: application/json

{
  "shopName": "Updated Shop Name",
  "shopAddress": "Updated Address"
}
```

### 5.5 Agent Capabilities
- Can view all jobs
- Can apply to jobs
- Can book schemes for users
- Can earn commissions on scheme bookings
- Can view saathi dashboard

---

## PHASE 6: BUSINESS PARTNER FLOWS

### 6.1 User/Member/Agent Apply to Become Business Partner
```http
POST /role-upgrade/request
Authorization: Bearer <USER_OR_MEMBER_OR_AGENT_TOKEN>
Content-Type: application/json

{
  "targetRole": "BUSINESS_PARTNER",
  "paymentId": "pay_123456",  // Optional, if payment is required
  "businessDetails": {
    "companyName": "Tech Solutions Pvt Ltd",
    "registrationNo": "REG123456",
    "gstNumber": "24ABCDE1234F1Z5",
    "email": "business@example.com",
    "website": "https://business.com",
    "address": "Business Park, CG Road",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "pincode": "380001",
    "industry": "IT",
    "companySize": "11-50",
    "businessPlan": "Want to post tech jobs and hire developers",
    "expectedJobs": 10
  }
}
```

### 6.2 Check Business Partner Application Status
```http
GET /role-upgrade/my-status
Authorization: Bearer <USER_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "currentRole": "USER",
  "pendingRequest": "BUSINESS_PARTNER",
  "approvalStatus": "PENDING",
  "approvedAt": null,
  "businessApplication": {
    "id": "uuid",
    "companyName": "Tech Solutions Pvt Ltd",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "industry": "IT",
    "status": "PENDING",
    "reviewNotes": null,
    "reviewedAt": null,
    "createdAt": "2026-04-14T10:00:00Z"
  }
}
```

### 6.3 Admin: View Pending Business Partner Applications
```http
GET /role-upgrade/admin/pending?targetRole=BUSINESS_PARTNER&page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  },
  "requests": [
    {
      "id": "user-uuid",
      "mobile": "9222222222",
      "fullName": "Business Owner",
      "identity": "USER",
      "requestedRole": "BUSINESS_PARTNER",
      "createdAt": "2026-04-14T10:00:00Z",
      "bpApplication": {
        "id": "app-uuid",
        "companyName": "Tech Solutions Pvt Ltd",
        "registrationNo": "REG123456",
        "gstNumber": "24ABCDE1234F1Z5",
        "email": "business@example.com",
        "website": "https://business.com",
        "address": "Business Park, CG Road",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "country": "India",
        "pincode": "380001",
        "industry": "IT",
        "companySize": "11-50",
        "businessPlan": "Want to post tech jobs and hire developers",
        "expectedJobs": 10,
        "createdAt": "2026-04-14T10:00:00Z"
      }
    }
  ]
}
```

### 6.4 Admin: Approve Business Partner Application
```http
PATCH /role-upgrade/admin/{userId}/process
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "action": "APPROVE",
  "reason": "Business verified and approved"
}
```

**What happens on approval:**
1. User's identity is changed to `BUSINESS_PARTNER`
2. A `Business` profile is automatically created with the application details
3. Business profile is marked as `isVerified: true`
4. Application status is updated to `APPROVED`

### 6.5 Admin: Reject Business Partner Application
```http
PATCH /role-upgrade/admin/{userId}/process
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "action": "REJECT",
  "reason": "Insufficient business details provided"
}
```

### 6.6 Create Business Profile (Legacy - Direct Creation)
```http
POST /business/register
Authorization: Bearer <BUSINESS_TOKEN>
Content-Type: application/json

{
  "companyName": "Tech Solutions Pvt Ltd",
  "registrationNo": "REG123456",
  "gstNumber": "24ABCDE1234F1Z5",
  "email": "business@example.com",
  "website": "https://business.com",
  "address": "Business Address",
  "city": "Ahmedabad",
  "state": "Gujarat",
  "country": "India",
  "pincode": "380001",
  "industry": "IT",
  "companySize": "11-50"
}
```

### 6.3 Post Job (Business Partner - Pays Fee)
```http
POST /job-posting/jobs
Authorization: Bearer <BUSINESS_TOKEN>
Content-Type: application/json

{
  "jobRole": "Sales Executive",
  "jobDescription": "Looking for sales executive",
  "requiredSkills": ["Sales", "Communication"],
  "jobType": "Full Time",
  "payStructure": "Full Time",
  "offeredAmount": 25000,
  "openings": 3,
  "shift": "Day",
  "urgentHiring": false,
  "education": "Bachelor's",
  "experience": 1,
  "gender": "Any",
  "minAge": 20,
  "maxAge": 30,
  "country": "India",
  "state": "Gujarat",
  "district": "Ahmedabad",
  "pincode": "380001",
  "fullAddress": "Business Park",
  "weekOffDays": "Sunday",
  "facilities": ["PF"],
  "joiningFees": false,
  "contactName": "HR",
  "contactNumber": "9876543210"
}
```

### 6.4 Check Job Credits
```http
GET /job-posting/jobs/credits
Authorization: Bearer <BUSINESS_TOKEN>
```

### 6.5 View My Posted Jobs
```http
GET /job-posting/jobs/my-posted
Authorization: Bearer <BUSINESS_TOKEN>
```

---

## PHASE 7: WALLET & PAYMENT FLOWS

### 7.1 Get My Wallet
```http
GET /wallet
Authorization: Bearer <TOKEN>
```

### 7.2 Get Wallet Transactions
```http
GET /wallet/transactions
Authorization: Bearer <TOKEN>
```

### 7.3 Request Wallet Top-up
```http
POST /wallet/topup
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "UPI",
  "transactionId": "txn_123456"
}
```

### 7.4 Create Razorpay Order for Wallet
```http
POST /payments/order/wallet
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 5000
}
```

### 7.5 Verify Payment
```http
POST /payments/verify
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "orderId": "order_123",
  "paymentId": "pay_123",
  "signature": "sig_123"
}
```

---

## PHASE 8: SCHEME FLOWS

### 8.1 Create Scheme (Business Partner)
```http
POST /schemes
Authorization: Bearer <BUSINESS_TOKEN>
Content-Type: application/json

{
  "title": "Government Housing Scheme",
  "description": "Affordable housing for all",
  "category": "Government",
  "eligibilityCriteria": {
    "minAge": 21,
    "maxAge": 60,
    "incomeLimit": 500000
  },
  "benefits": ["Low interest rate", "Subsidized housing"],
  "schemeValue": 500000,
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "agentFee": 500
}
```

### 8.2 Book Saathi for Scheme (User/Member)
```http
POST /schemes/{scheme-id}/book
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "saathiId": "agent-uuid",
  "notes": "Please help with documentation"
}
```

### 8.3 Get My Scheme Bookings (User)
```http
GET /schemes/my-bookings
Authorization: Bearer <USER_TOKEN>
```

### 8.4 Get Agent Bookings (Agent)
```http
GET /saathi/agent/bookings
Authorization: Bearer <AGENT_TOKEN>
```

---

## IMPORTANT NOTES

### Pricing Keys Admin Can Set:
1. `MEMBER_REGISTRATION_FEE` - Fee to become member
2. `AGENT_REGISTRATION_FEE` - Fee to become agent (user)
3. `MEMBER_TO_AGENT_UPGRADE_FEE` - Fee for member to upgrade to agent
4. `JOB_POST_FEE` - Fee per job post (business partner)
5. `JOB_PROFILE_FEE` - Fee for basic job profile
6. `JOB_PROFILE_WITH_RESUME_FEE` - Fee for profile with resume

### Identity Flow:
```
USER → (Pay Member Fee) → MEMBER → (Pay Upgrade Fee) → AGENT
USER → (Pay Agent Fee) → AGENT
```

### Role Creation Chain:
```
SUPER_ADMIN → ADMIN → SUB_ADMIN → COUNTRY_HEAD → STATE_HEAD → DISTRICT_PARTNER
```

### Testing Sequence:
1. Start with Super Admin login
2. Create Admin using Super Admin
3. Set all pricing using Super Admin
4. Login as Admin
5. Create hierarchy (Sub-Admin, Country Head, etc.)
6. Register as User
7. User creates job profile
8. User becomes Member (payment)
9. Member upgrades to Agent (payment)
10. Business Partner posts jobs
11. User applies to jobs
12. User books schemes via Agent
