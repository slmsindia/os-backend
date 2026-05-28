# Saathi API — Developer Documentation

> **Version:** v1 | **Auth:** Bearer JWT | **Base URL:** `https://<your-domain>/`

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Module: Account (Wallet)](#4-module-account-wallet)
5. [Module: Admin](#5-module-admin)
6. [Module: App Services](#6-module-app-services)
7. [Module: Bank Saathi](#7-module-bank-saathi)
8. [Module: Charges & Commission](#8-module-charges--commission)
9. [Module: Commission](#9-module-commission)
10. [Module: Community](#10-module-community)
11. [Module: Complaint](#11-module-complaint)
12. [Module: Dashboard](#12-module-dashboard)
13. [Module: DMT (Domestic Money Transfer)](#13-module-dmt-domestic-money-transfer)
14. [Module: Government Schemes](#14-module-government-schemes)
15. [Module: IME (International Remittance)](#15-module-ime-international-remittance)
16. [Module: Prabhu (International Remittance)](#16-module-prabhu-international-remittance)
17. [Module: Indo-Nepal Bus Service](#17-module-indo-nepal-bus-service)
18. [Module: Jobs](#18-module-jobs)
19. [Module: Notification](#19-module-notification)
20. [Module: Recharge & Bill](#20-module-recharge--bill)
21. [Module: Remittance](#21-module-remittance)
22. [Module: Roles & Permissions](#22-module-roles--permissions)
23. [Module: Static Data](#23-module-static-data)
24. [Module: Travelling (Bus Booking)](#24-module-travelling-bus-booking)
25. [Module: User](#25-module-user)
26. [Enum Reference](#26-enum-reference)
27. [Reusable Schema Reference](#27-reusable-schema-reference)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│          Mobile App (Android/iOS)  ·  Admin Web Panel       │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS + Bearer JWT
┌──────────────────────────▼──────────────────────────────────┐
│                     SAATHI REST API                         │
│                  ASP.NET Core Web API v1                    │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  User /  │ │  Wallet  │ │Community │ │ Govt Schemes │  │
│  │  Auth    │ │ Account  │ │  Posts   │ │   & Jobs     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Recharge│ │   DMT    │ │  IME /   │ │  Bus/Travel  │  │
│  │  & Bills │ │(Dom. TXN)│ │  Prabhu  │ │   Booking    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    SERVICE INTEGRATIONS                      │
│  Razorpay · EKO · IME Forex · Prabhu · BankSaathi          │
│  CreditLinks · BBPS · HDFC UPI · FCM (Firebase)            │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│               DATABASE  (SQL Server / EF Core)               │
│   Users · Wallets · Transactions · Commissions · Content    │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Detail |
|-----------|--------|
| **Auth** | All endpoints require `Authorization: Bearer <JWT>` except login/register |
| **Pagination** | List endpoints accept `pageNumber`, `pageSize`, `searchTerm`, `sortBy`, `sortOrder` |
| **IDs** | All entity IDs are `UUID` (GUID) strings |
| **Dates** | ISO 8601 — dates as `YYYY-MM-DD`, date-times as full ISO string |
| **Response** | Consistent envelope `{ data, result, message }` on most endpoints |
| **Roles** | SuperAdmin → State Partner → District Partner → Saathi → Member |

---

## 2. Authentication

### 2.1 Login (Custom)

```
POST /api/User/Login
```

**Request Body:**
```json
{
  "userName": "9876543210",
  "password": "MyPassword@1",
  "fcmToken": "firebase-device-token-optional"
}
```

**Response:**
```json
{
  "result": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "dGhpcyBpcyBh...",
    "tokenExpireDateTime": "2025-01-01T10:00:00Z",
    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "roleId": 2,
    "roleName": "Saathi"
  }
}
```

### 2.2 Register User

```
POST /api/User/RegisterUser
POST /api/User/RegisterMobileUser
```

**Request Body:**
```json
{
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "phoneNo": "9876543210",
  "email": "ramesh@example.com",
  "birthDate": "1990-05-15",
  "gender": "uuid-of-gender",
  "password": "Password@123",
  "parentUserId": "uuid-of-parent-optional",
  "addresses": [
    {
      "address": "123 Main St",
      "districtId": "uuid",
      "stateId": "uuid",
      "country": "uuid",
      "pinCode": "110001",
      "addressType": 0
    }
  ]
}
```

### 2.3 Refresh Token

```
POST /api/User/RenewAccessToken
```

**Request Body:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBp...",
  "tokenExpireDateTime": "2025-01-01T10:00:00Z"
}
```

### 2.4 OTP Flows

```
GET  /api/User/ResendOTP?number=9876543210
POST /api/User/SendOtpForForgotPassword
POST /api/User/MobileNoConfirmation
POST /api/User/ForgotPassword
PUT  /api/User/ChangePassword
```

**ChangePassword Request:**
```json
{
  "mobileNo": "9876543210",
  "oldPassword": "OldPass@1",
  "newPassword": "NewPass@2"
}
```

### 2.5 Identity Endpoints (ASP.NET Identity)

```
POST /identity/register
POST /identity/login
POST /identity/refresh
GET  /identity/confirmEmail
POST /identity/forgotPassword
POST /identity/resetPassword
GET  /identity/manage/info
POST /identity/manage/2fa
```

---

## 3. Common Patterns

### 3.1 Standard List Request Body

All `POST` endpoints that return paginated lists accept:

```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "searchTerm": "optional search string",
  "sortBy": "createdAt",
  "sortOrder": 1,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

`sortOrder` values: `0` = None, `1` = Ascending, `-1` = Descending

### 3.2 Payment Fields (common across services)

Whenever a transaction involves payment:

```json
{
  "amount": 500.00,
  "paymentMode": 1,
  "razorPayReferenceNo": "pay_xyz123",
  "platformFees": 10.00,
  "gst": 1.80,
  "serviceCharges": 5.00
}
```

`paymentMode`: `1` = Wallet, `2` = Razorpay

### 3.3 Document Upload Pattern

```json
{
  "documents": [
    {
      "type": 1,
      "document": "base64encodedstring==",
      "format": 0,
      "name": "aadhaar_front.jpg",
      "size": 204800,
      "documentNumber": "1234-5678-9012"
    }
  ]
}
```

`DocumentType`: 0=None, 1=Aadhaar, 2=PAN, 3=Passport, 4=VoterID, 5=DrivingLicense, 6=Photo, 7=Signature, 8=Other  
`DocumentFormat`: 0=JPG, 1=PNG, 2=PDF

---

## 4. Module: Account (Wallet)

Manages wallet top-up, money requests, and deductions.

### 4.1 Create Add-Money Request

```
POST /api/Account/CreateAddMoneyRequest
```

Users submit a deposit request with proof of bank transfer.

**Request Body:**
```json
{
  "bankID": "uuid-of-bank-account",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 5000.00,
  "transactionReferenceNo": "UTR123456789",
  "transactionDate": "2024-06-01T10:30:00Z",
  "reciept": "base64-encoded-image-of-receipt==",
  "recieptName": "receipt_june01.jpg"
}
```

### 4.2 Get Add-Money Requests (Admin)

```
POST /api/Account/GetAddMoneyRequests
```

**Request Body:**
```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "searchTerm": "",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "status": null,
  "bankId": null,
  "currentUserId": null,
  "isDataExport": false
}
```

### 4.3 Approve / Reject Money Request (Admin)

```
POST /api/Account/ApproveRejectRequest
```

**Request Body:**
```json
{
  "requestId": "uuid-of-request",
  "status": true,
  "rejectReason": "Insufficient details",
  "userId": "uuid-of-admin"
}
```

### 4.4 Add Money via Payment Gateway

```
POST /api/Account/AddMoneyByPaymentGateway
```

**Request Body:**
```json
{
  "userId": "uuid",
  "amount": 1000.00,
  "transactionReferenceNo": "pay_razorpay_id"
}
```

### 4.5 Wallet Deduct (Admin)

```
PUT /api/Account/WalletDeduct?deductUserId=uuid&deductAmount=500&reason=Penalty
```

### 4.6 NEFT/RTGS Payment

```
POST /api/Account/NEFT_RTGSPaymentStatus   — Check status
POST /api/Account/CreateNEFT_RTGSRequest   — Create request
```

**NEFT/RTGS Request Body:**
```json
{
  "utrno": "SBIN0001234567890",
  "tranID": "TXN12345",
  "amount": "10000",
  "tranDate": "2024-06-01",
  "van": "virtual-account-number",
  "tranType": "NEFT"
}
```

### 4.7 Get Deposit Receipt

```
GET  /api/Account/GetDepositeReceipt?requestId=uuid
POST /api/Account/GetDepositReceipt/{requestId}
```

### 4.8 QR Code for Wallet Top-Up

```
GET /api/Admin/GetQRCode
GET /api/Admin/GetQRCodeList?isActive=true
POST /api/Admin/AddQRCode
PUT  /api/Admin/UpdateQRCode
PUT  /api/Admin/ToggleQRCodeActivation?qrCodeId=uuid
```

**AddQRCode Body:**
```json
{
  "qrCodeTitle": "UPI QR - June 2024",
  "qrCodeImage": "base64-of-qr-image==",
  "isActive": true
}
```

---

## 5. Module: Admin

Central admin operations for approvals, content, and configuration.

### 5.1 Approve Member / Saathi

```
POST /api/Admin/ApproveMember
POST /api/Admin/ApproveSaathi
```

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "status": 1,
  "rejectionReason": ""
}
```

`ApprovalStatus`: `0` = Pending, `1` = Approved, `2` = Rejected

### 5.2 Posters Management

```
GET  /api/Admin/GetPosters?Page=1
POST /api/Admin/GetPostersList
POST /api/Admin/AddPoster
PUT  /api/Admin/UpdatePoster
PUT  /api/Admin/UpdatePosterStatus?RequestId=uuid
GET  /api/Admin/GetPosterById?Id=uuid
```

**AddPoster Body:**
```json
{
  "imageBase64": "base64==",
  "screenId": "uuid-of-screen",
  "type": 0,
  "roles": ["uuid-role-1"],
  "states": ["uuid-state-1"],
  "url": "https://example.com",
  "link": "app://screen/scheme-details",
  "title": "Summer Offer",
  "description": "Get 10% extra on recharge"
}
```

`Types`: `0` = Image, `1` = Video

### 5.3 Poster Screens (where posters appear in app)

```
POST /api/Admin/AddPosterScreen
PUT  /api/Admin/UpdatePosterScreen
PUT  /api/Admin/UpdatePosterScreenStatus?RequestId=uuid
GET  /api/Admin/GetPosterScreens?flag=true&searchTerm=
GET  /api/Admin/GetPosterScreenById?Id=uuid
```

### 5.4 Announcements (Ticker/Banner Text)

```
POST /api/Admin/AddAnnouncement
PUT  /api/Admin/UpdateAnnouncement
PUT  /api/Admin/UpdateAnnouncementStatus?RequestId=uuid
GET  /api/Admin/GetAnnouncementsList?flag=true&SearchTerm=
GET  /api/Admin/GetAnnouncementById?Id=uuid
```

**AddAnnouncement Body:**
```json
{
  "announcementLine": "New scheme available for farmers!",
  "placement": 0
}
```

`Placements`: `0` = Top, `1` = Bottom

### 5.5 Notices (Pop-up / Push Notices)

```
POST /api/Admin/AddNotice
PUT  /api/Admin/UpdateNoticeStatus?Id=uuid
POST /api/Admin/GetNoticesList
GET  /api/Admin/GetUserNotices
```

**AddNotice Body:**
```json
{
  "title": "App Maintenance",
  "description": "App will be down on Sunday 2AM-4AM",
  "mediaFile": "base64-optional",
  "navigateTo": "app://home",
  "roleIds": ["uuid-role"],
  "stateIds": ["uuid-state"],
  "displayTime": 5
}
```

### 5.6 Admin Ledger (Financial Reports)

```
POST /api/Admin/GetAdminLeadger
POST /api/Admin/GetAdminLeadgerReport
POST /api/Admin/GetClosingBalance
```

**GetAdminLeadger Body:**
```json
{
  "pageNumber": 1,
  "pageSize": 50,
  "userId": null,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "serviceId": null,
  "accountType": null,
  "isDataExport": false
}
```

### 5.7 Survey / Membership Questions

```
POST /api/Admin/AddMembershipMasterQuestions
PUT  /api/Admin/UpdateMembershipMasterQuestions
PUT  /api/Admin/UpdateMembershipMasterQuestionStatus?GroupId=uuid
GET  /api/Admin/GetMembershipMasterQuestionById?GroupId=uuid
POST /api/Admin/GetMembershipMasterQuestions
POST /api/Admin/GetSurveyResponses
GET  /api/Admin/GetSurveyResponseById?userId=uuid
POST /api/Admin/DownloadSurveyResponses
PUT  /api/Admin/UpdateQuestionsOrder
```

### 5.8 Survey Categories

```
POST /api/Admin/AddSurveyCategory
PUT  /api/Admin/UpdateSurveyCategory
GET  /api/Admin/GetSurveyCategories?IsActive=true&searchTerm=&LanguageId=EN
GET  /api/Admin/GetSurveyCategoryById?GroupId=uuid
PUT  /api/Admin/UpdateSurveyCategoryStatus?GroupId=uuid
PUT  /api/Admin/UpdateCategoriesOrder
```

### 5.9 Other Admin Actions

```
GET /api/Admin/GetSections
PUT /api/Admin/ApproveRejectCommunity?CommunityId=uuid&flag=true&Reason=
PUT /api/Admin/RemoveSuspension?userId=uuid
GET /api/Admin/MigrationStatistics
POST /api/Admin/GetChartData
```

---

## 6. Module: App Services

Manages mobile app sections and services (bottom nav / home screen tiles).

### 6.1 Get Services & Sections

```
GET  /api/AppServices/GetServices
GET  /api/AppServices/GetSections
POST /api/AppServices/GetSections   — filtered
GET  /api/AppServices/GetSectionById?Id=uuid
GET  /api/AppServices/GetServiceList?SectionId=uuid
GET  /api/AppServices/GetServiceById?Id=uuid
```

### 6.2 Manage Sections

```
POST /api/AppServices/AddSection
PUT  /api/AppServices/UpdateSection
GET  /api/AppServices/UpdateSection/{sectionId}   — get section for edit
PUT  /api/AppServices/UpdateSectionStatus?SectionId=uuid
```

**AddSection Body:**
```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "sectionName": "Financial Services",
  "isActive": true,
  "order": 1,
  "sectionImage": "base64==",
  "sectionImageName": "financial.png"
}
```

### 6.3 Manage Services within Sections

```
POST /api/AppServices/AddSectionService
PUT  /api/AppServices/UpdateSectionService
PUT  /api/AppServices/UpdateServiceStatus?ServiceId=uuid
POST /api/AppServices/AssignServiceRoleWise
```

**AddSectionService Body:**
```json
{
  "sectionId": "uuid",
  "serviceName": "Mobile Recharge",
  "componentName": "RechargeComponent",
  "arguments": "{\"type\":\"mobile\"}",
  "serviceIconImage": "base64==",
  "serviceIconImageName": "recharge.png",
  "serviceAuthority": ["uuid-role-saathi", "uuid-role-member"]
}
```

### 6.4 General Settings & Maintenance

```
GET /api/AppServices/GetGeneralSettings
GET /api/AppServices/GetLatestApkVersion
PUT /api/AppServices/UpdateMaintenanceMode
GET /api/AppServices/public-ip
```

**UpdateMaintenanceMode Body:**
```json
{
  "isMaintenanceMode": true,
  "maintenanceModeTime": "2024-06-01T02:00:00Z"
}
```

---

## 7. Module: Bank Saathi

Integrates with third-party BankSaathi and CreditLinks for loan lead generation.

### 7.1 BankSaathi Leads

```
GET  /api/BankSaathi/GetAllOccupations
GET  /api/BankSaathi/GetPincodes?searchKey=110001
GET  /api/BankSaathi/CheckIfCustomerExist?MobileNo=9876543210
POST /api/BankSaathi/CreateLeadProfile
POST /api/BankSaathi/CreateLead
GET  /api/BankSaathi/GetAllProductCategories
GET  /api/BankSaathi/GetProductByCategory
GET  /api/BankSaathi/GetProductDetailsById?ProductId=1
GET  /api/BankSaathi/GetSummary/{LeadId}
GET  /api/BankSaathi/GetOffers/{LeadId}
POST /api/BankSaathi/GetBankSaathiReport
GET  /api/BankSaathi/GetDistinctBankSaathiStatuses
```

**CreateLeadProfile Body:**
```json
{
  "first_name": "Ramesh",
  "last_name": "Kumar",
  "pan": "ABCDE1234F",
  "mobile_no": "9876543210",
  "email": "ramesh@example.com",
  "dob": "1990-05-15",
  "occupation": 1,
  "monthly_salary": 25000,
  "itr_amount": 300000,
  "gender": "M",
  "pincode": 110001,
  "userId": "uuid-of-saathi"
}
```

### 7.2 CreditLinks Leads

```
GET  /api/BankSaathi/CheckIfCreditLinksCustomerExist?MobileNo=9876543210
POST /api/BankSaathi/CreateCreditLinksLead
POST /api/BankSaathi/GetCreditLinksLeadsReport
```

**CreateCreditLinksLead Body:**
```json
{
  "mobileNumber": "9876543210",
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "pan": "ABCDE1234F",
  "dob": "1990-05-15",
  "email": "ramesh@example.com",
  "pincode": "110001",
  "monthlyIncome": 25000,
  "employmentStatus": 1,
  "employerName": "ABC Corp",
  "officePincode": "110002",
  "userId": "uuid-of-saathi"
}
```

---

## 8. Module: Charges & Commission

Configure platform fees and view commission structure.

### 8.1 Service Groups & Platform Fees

```
GET /api/ChargesAndCommission/GetServiceGroup
GET /api/ChargesAndCommission/GetPlatformFeesCharges/{serviceId}
PUT /api/ChargesAndCommission/UpdateService
```

**UpdateService Body:**
```json
{
  "id": "uuid-of-service",
  "platformFee": 5.00,
  "gst": 0.90,
  "includedExcluded": true,
  "type": 1,
  "serviceCharges": 2.50
}
```

`CommissionType`: `1` = Flat, `2` = Percentage

---

## 9. Module: Commission

Full commission engine — schemes, services, share distribution, history.

### 9.1 Commission Schemes

```
GET  /api/Commission/GetCommissionSchemes?userId=uuid&isActive=true
POST /api/Commission/AddCommissionSchemes
PUT  /api/Commission/UpdateCommissionSchemes
GET  /api/Commission/GetCommissionSchemeById?Id=uuid
GET  /api/Commission/UpdateCommissionSchemeStatus?schemeId=uuid&isActive=true
```

**AddCommissionSchemes Body:**
```json
{
  "name": "Standard Saathi Scheme 2024"
}
```

### 9.2 Commission Services & Sub-Services

```
GET /api/Commission/GetCommissionServices?isActive=true
GET /api/Commission/GetCommissionSubServices?serviceId=uuid&isActive=true
GET /api/Commission/GetServicesSubServices?isActive=true
GET /api/Commission/GetServiceSubServiceBySchemeId?SchemeID=uuid
GET /api/Commission/UpdateCommissionServiceStatus?serviceId=uuid&isActive=true
GET /api/Commission/UpdateCommissionSubServiceStatus?subServiceId=uuid&isActive=true
```

### 9.3 Commission Share Distribution

Commission is split between Admin, State Partner, District Partner, Saathi, Member, and Referral.

```
POST /api/Commission/AddCommissionShare
PUT  /api/Commission/UpdateCommissionShare
POST /api/Commission/UpdateSingleCommissionShare
```

**AddCommissionShare Body:**
```json
{
  "schemeId": "uuid-of-scheme",
  "services": [
    {
      "id": "uuid-of-service",
      "name": "Mobile Recharge",
      "subServices": [
        {
          "id": "uuid-of-sub-service",
          "name": "Jio Recharge",
          "serviceId": "uuid-of-service",
          "type": 2,
          "baseType": 1,
          "admin": 1.50,
          "statePartner": 0.30,
          "districtPartner": 0.20,
          "saathi": 1.00,
          "member": 0.50,
          "referral": 0.10,
          "referralMinAmount": 100.00
        }
      ]
    }
  ]
}
```

### 9.4 All Transactions

```
POST /api/Commission/GetAllTransactions
```

**Body:**
```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "serviceId": null,
  "subServiceID": null,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "transactionDoneById": null,
  "transactionDoneForId": null,
  "isDataExport": false
}
```

### 9.5 Commission History & Wallet History

```
POST /api/Commission/GetCommissionHistory
POST /api/Commission/GetWalletHistory
POST /api/Commission/GetSuperAdminIncome
GET  /api/Commission/TransactionLogCredtedByDropdown
GET  /api/Commission/TransactionLogCredtedForDropdown
```

---

## 10. Module: Community

Social community features — posts, reactions, greeter cards, followers.

### 10.1 Community Categories

```
POST /api/Community/AddCommunityCategory
PUT  /api/Community/UpdateCommunityCategory
PUT  /api/Community/UpdateCommunityCategoryStatus?RequestId=uuid
GET  /api/Community/GetCommunityCategories?IsActive=true&searchTerm=
GET  /api/Community/GetCommunityCategoryById?Id=uuid
```

### 10.2 Community CRUD

```
POST /api/Community/CreateCommunity
PUT  /api/Community/UpdateCommunity
PUT  /api/Community/UpdateCommunityStatus?RequestId=uuid
POST /api/Community/GetAllCommunities
GET  /api/Community/GetMyCommunities?page=1&CategoryId=uuid
GET  /api/Community/FollowedCommunities?page=1&isAll=false&categoryId=uuid
GET  /api/Community/JoinLeftCommunity?CommunityId=uuid
GET  /api/Community/GetCommunityById?Id=uuid
```

**CreateCommunity Body:**
```json
{
  "name": "Farmers of UP",
  "description": "A community for UP farmers to share knowledge",
  "imageName": "community.jpg",
  "bannerImageBase64": "base64==",
  "categoryId": "uuid-of-category",
  "website": "https://example.com",
  "phoneNo": "9876543210",
  "designation": "President",
  "isGovRegisteredOrg": false,
  "latitude": 26.8467,
  "longitude": 80.9462
}
```

### 10.3 Post Types

Saathi supports multiple post types:

| Endpoint | Post Type |
|----------|-----------|
| `POST /api/Community/AddAdvertisementPost` | Business ad |
| `POST /api/Community/AddEventPost` | Event announcement |
| `POST /api/Community/AddNewsPosts` | News article |
| `POST /api/Community/AddPropertyPost` | Property listing |
| `POST /api/Community/AddVillagePost` | Village update |
| `PUT  /api/Community/RejectPost?RequestId=uuid` | Admin rejects post |
| `DELETE /api/Community/DeletePost?PostId=uuid` | Delete own post |

**AddEventPost Body:**
```json
{
  "posts": [
    {
      "media": "base64-image==",
      "imageName": "event.jpg",
      "format": 0
    }
  ],
  "communityId": "uuid",
  "type": 0,
  "name": "Kisan Mela 2024",
  "description": "Annual farmers fair",
  "organizerName": "UP Agri Dept",
  "phoneNo": "9876543210",
  "eventStartDate": "2024-07-15",
  "eventEndDate": "2024-07-17",
  "eventStartTime": "09:00",
  "eventEndTime": "18:00",
  "address": "Lucknow Maidan",
  "pincode": "226001",
  "districtId": "uuid",
  "stateId": "uuid",
  "countryId": "uuid",
  "latitude": 26.8467,
  "longitude": 80.9462
}
```

### 10.4 Feed & Reactions

```
GET  /api/Community/MyFeed?page=0&searchTerm=
GET  /api/Community/MyPosts?page=0&communityId=uuid
GET  /api/Community/PostsByCommunityId?page=1&communityId=uuid&isTrendingPosts=false
POST /api/Community/PostsByCommunityIdList
POST /api/Community/PostReaction
GET  /api/Community/FollowUnfollowUser?FollowedUserId=uuid
```

**PostReaction Body:**
```json
{
  "postId": "uuid-of-post",
  "postReactionId": "uuid-of-reaction-type"
}
```

### 10.5 Greeting Templates

```
POST /api/Community/AddGreetingCategory
PUT  /api/Community/UpdateGreetingCategory
GET  /api/Community/GetGreetingCategories?IsActive=true
POST /api/Community/AddGreetingTemplate
PUT  /api/Community/UpdateGreetingTemplate
POST /api/Community/GetGreetingTemplatesList
GET  /api/Community/GetGreetingTemplatesById?Id=uuid
POST /api/Community/AddUserGreetingTemplate
POST /api/Community/GetUserGreetingTemplateList
DELETE /api/Community/DeleteUserGreetingTemplate?Id=uuid
```

### 10.6 Post Reactions Master

```
POST /api/Community/AddMasterPostReaction
PUT  /api/Community/UpdateMasterPostReaction
PUT  /api/Community/UpdateMasterPostReactionStatus?RequestId=uuid
GET  /api/Community/GetMasterPostReaction?searchTerm=
POST /api/Community/GetPostReactionList
GET  /api/Community/GetMasterPostReactionById?Id=uuid
```

---

## 11. Module: Complaint

Ticketing system with message threads for transaction disputes.

### 11.1 Register Complaint

```
POST /api/Complaint/RegisterComplaint
```

**Request Body:**
```json
{
  "refrenceId": "TXN-12345",
  "description": "Amount deducted but transaction failed",
  "subject": "Recharge Failed",
  "serviceId": "uuid-of-service",
  "serviceType": 1,
  "documents": [
    {
      "documentProof": "base64==",
      "documentName": "screenshot.jpg"
    }
  ]
}
```

`ServiceTypes`: `0` = General, `1` = Recharge, `2` = DMT

### 11.2 Get All Complaints

```
POST /api/Complaint/GetAllComplaints
```

**Body:**
```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "status": 0,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "serviceId": null,
  "serviceType": 0
}
```

`ComplaintStatus`: `0` = Open, `1` = Closed

### 11.3 Complaint Messaging

```
POST /api/Complaint/SendMessage
POST /api/Complaint/GetMessage
PUT  /api/Complaint/CloseComplain?complaintId=uuid
```

**SendMessage Body:**
```json
{
  "complaintId": "uuid",
  "message": "Please check and refund the amount",
  "documents": []
}
```

---

## 12. Module: Dashboard

```
GET /api/Dashboard/MainDashboardData?StartDate=2024-01-01&EndDate=2024-12-31
```

Returns aggregated stats: total users, transactions, wallet balances, scheme enrollments by role and date range.

---

## 13. Module: DMT (Domestic Money Transfer)

Send money within India to any bank account. Powered by EKO.

### Flow Overview

```
1. Query Remitter (by mobile)  →  GET /api/DMT/QueryRemitter/{MobileNo}
2. Register Remitter           →  POST /api/DMT/RegisterRemitter
3. Register Beneficiary        →  POST /api/DMT/RegisterBeneficiary
4. Penny Drop (verify account) →  POST /api/DMT/PennyDrop
5. Send OTP for transaction    →  POST /api/DMT/TransactionSendOtp
6. Transfer Money              →  POST /api/DMT/TransferMoney
7. Check Status                →  GET /api/DMT/TransactionStatus/{TransactionId}
```

### 13.1 Remitter Management

```
GET  /api/DMT/IsRemitter/{UserId}
GET  /api/DMT/QueryRemitter/{MobileNo}
POST /api/DMT/RegisterRemitter
POST /api/DMT/RemitterEKYC
POST /api/DMT/GetRemiterList
```

**RegisterRemitter Body:**
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "stateResp": "response-from-ekyc",
  "ekyc_id": "ekyc-id-from-otp-step"
}
```

**RemitterEKYC Body:**
```json
{
  "mobile": "9876543210",
  "aadhaarNumber": "123456789012",
  "data": "biometric-xml-data",
  "isIris": 0
}
```

### 13.2 Beneficiary Management

```
POST /api/DMT/RegisterBeneficiary
GET  /api/DMT/GetBeneficiaryList/{userId}
GET  /api/DMT/GetBankList
```

**RegisterBeneficiary Body:**
```json
{
  "remitterId": "uuid",
  "mobile": "9876543210",
  "benename": "Suresh Kumar",
  "bankid": "SBIN0001234",
  "accno": 123456789012345,
  "ifsccode": "SBIN0001234",
  "verified": true
}
```

### 13.3 Calculate Fees

```
GET /api/DMT/CalculateDMTFinalAmount?baseAmount=1000
GET /api/DMT/DMTAmout
```

### 13.4 Send OTP & Transfer Money

**TransactionSendOtp Body:**
```json
{
  "beneficiaryId": "uuid",
  "mobile": "9876543210",
  "bene_id": 12345,
  "txntype": "IMPS",
  "amount": 1000.00,
  "pincode": "110001",
  "address": "Delhi",
  "dob": "1990-05-15",
  "gst_state": "Delhi",
  "commision": 5.00,
  "gst": 0.90,
  "platformCharges": 2.00,
  "serviceCharge": 3.00
}
```

**TransferMoney Body:**
```json
{
  "beneficiaryId": "uuid",
  "mobile": "9876543210",
  "bene_id": "12345",
  "txntype": "IMPS",
  "amount": 1000.00,
  "otp": "456789",
  "stateresp": "state-response-from-otp",
  "gst": 0.90,
  "platformCharges": 2.00,
  "serviceCharge": 3.00
}
```

### 13.5 Transaction History & Status

```
GET  /api/DMT/TransactionStatus/{TransactionId}
GET  /api/DMT/GetUserTransactions/{UserId}
GET  /api/DMT/GetSaathiTransactions/{saathiId}
GET  /api/DMT/NotConfirmedTransactions/{UserId}
POST /api/DMT/MyTransactions
GET  /api/DMT/DownloadDMTReceipt?transactionId=uuid
POST /api/DMT/GetDMTReport
```

### 13.6 Refund

```
GET  /api/DMT/RefundOTP?TransactionId=uuid
POST /api/DMT/RefundClaim
```

**RefundClaim Body:**
```json
{
  "transactionId": "uuid",
  "otp": 789012
}
```

---

## 14. Module: Government Schemes

Browse, search, and apply for government welfare schemes. Includes eligibility engine.

### 14.1 Scheme Categories & Ministry

```
POST /api/GovernmentSchemes/GetSchemeCategories
POST /api/GovernmentSchemes/AddGovernmentSchemesCategory
PUT  /api/GovernmentSchemes/UpdateSchemesCategory
PUT  /api/GovernmentSchemes/UpdateSchemesCategoryStatus
GET  /api/GovernmentSchemes/GetCategoryById?categoryId=uuid

GET  /api/GovernmentSchemes/GetSchemesMinistries?searchTerm=
POST /api/GovernmentSchemes/AddSchemesMinistry
PUT  /api/GovernmentSchemes/UpdateSchemesMinistry
PUT  /api/GovernmentSchemes/UpdateSchemesMinistryStatus

GET  /api/GovernmentSchemes/GetSchemesMinistriesDepartment?searchTerm=
POST /api/GovernmentSchemes/AddSchemesMinistryDepartment
PUT  /api/GovernmentSchemes/UpdateSchemesMinistryDepartment
GET  /api/GovernmentSchemes/GetDepartmentByMinistry?ministryId=uuid
```

### 14.2 Scheme CRUD

```
POST /api/GovernmentSchemes/AddGovernmentSchemes
PUT  /api/GovernmentSchemes/UpdateGovernmentSchemes
PUT  /api/GovernmentSchemes/UpdateSchemeStatus
POST /api/GovernmentSchemes/GetAllSchemes
GET  /api/GovernmentSchemes/GetSchemeById?SchemeId=uuid
```

**AddGovernmentSchemes Body:**
```json
{
  "categoryList": ["uuid-cat1", "uuid-cat2"],
  "imageBase64": "base64==",
  "departmentId": "uuid",
  "countryId": "uuid",
  "ministryId": "uuid",
  "sourceAndReferenceURL": "https://gov.in/scheme/pm-kisan",
  "officialWebsite": "https://pmkisan.gov.in",
  "documentOfficialLink": "https://pmkisan.gov.in/documents",
  "userId": "uuid-of-admin",
  "schemeFees": 0.00,
  "saathiFees": 50.00,
  "schemeLanguages": [
    {
      "languageId": "EN",
      "title": "PM-KISAN",
      "details": "Income support of Rs 6000/year to farmers",
      "benefits": "₹6000 per year in 3 installments",
      "eligibility": "Small and marginal farmers",
      "applicationProcessOnline": "Visit pmkisan.gov.in",
      "applicationProcessOffline": "Visit nearest CSC center",
      "documentsDetails": "Aadhaar, Land Records, Bank Account"
    }
  ],
  "isPopular": true
}
```

### 14.3 Scheme Eligibility Configuration

```
POST /api/GovernmentSchemes/AddGovernmentSchemesEligibilities
PUT  /api/GovernmentSchemes/UpdateGovernmentSchemeEligibilities
GET  /api/GovernmentSchemes/GetSchemeEligibilitiesBySchemeId?SchemeId=uuid
```

**Eligibility Body (key fields):**
```json
{
  "schemeId": "uuid",
  "startAgeRange": 18,
  "endAgeRange": 60,
  "genderId": "uuid-female",
  "forBPL": 1,
  "annualIncome": 150000,
  "residence": 1,
  "occupations": ["uuid-farmer"],
  "eligibleStates": ["UP", "MP"],
  "castCategories": ["SC", "ST", "OBC"],
  "educations": ["uuid-edu-10th"],
  "requiredSchemeDocuments": ["uuid-aadhaar", "uuid-land-record"]
}
```

### 14.4 Explore Schemes (User Facing)

```
GET  /api/GovernmentSchemes/ExploreSchemesCount?GetSchemesBy=0&languageId=EN
POST /api/GovernmentSchemes/GetExploreSchemesList
POST /api/GovernmentSchemes/ExploreEligibleSchemesData      — submit eligibility answers
POST /api/GovernmentSchemes/ExploreEligibleSchemesDataResponse — get matched schemes
GET  /api/GovernmentSchemes/GetExploreEligibleSchemesUserData?UserId=uuid
POST /api/GovernmentSchemes/GetSchemeDetailsById
GET  /api/GovernmentSchemes/GetBookmarkedSchemesByUserId?UserId=uuid&languageId=EN
POST /api/GovernmentSchemes/BookmarkScheme
POST /api/GovernmentSchemes/RemoveBookmarkScheme
POST /api/GovernmentSchemes/CheckForSchemeEligibility
POST /api/GovernmentSchemes/GetUserEligibleSchemes
```

**ExploreEligibleSchemesData Body:**
```json
{
  "userId": "uuid",
  "gender": "uuid-female",
  "age": 35,
  "state": "uuid-up",
  "residence": 1,
  "maritalStatus": "uuid-married",
  "category": "uuid-obc",
  "differentlyAbled": 0,
  "belongsToBPL": 1,
  "familyAnnualIncome": 120000,
  "employmentStatus": 1,
  "occupation": "uuid-farmer",
  "languageId": "EN",
  "forScheme": true,
  "paymentFlag": false,
  "paymentMode": 1,
  "amount": 0
}
```

### 14.5 FAQs & Documents

```
POST /api/GovernmentSchemes/AddSpecificSchemeFAQs
PUT  /api/GovernmentSchemes/UpdateSpecificSchemeFAQs
PUT  /api/GovernmentSchemes/UpdateSpecificSchemeFAQsStatus
GET  /api/GovernmentSchemes/GetFAQsBySchemeId?SchemeId=uuid&IsActive=true
GET  /api/GovernmentSchemes/GetFAQsByGroupId?GroupId=uuid

POST /api/GovernmentSchemes/AddGovernmentSchemeMasterDocuments
PUT  /api/GovernmentSchemes/UpdateMasterDocument
PUT  /api/GovernmentSchemes/UpdateMasterDocumentsStatus
GET  /api/GovernmentSchemes/GetMasterDocuments?searchTerm=
GET  /api/GovernmentSchemes/GetMasterDocument?documentId=uuid

POST /api/GovernmentSchemes/AddSchemeMasterDocumentCategory
PUT  /api/GovernmentSchemes/UpdateDocumentCategory
GET  /api/GovernmentSchemes/GetDocumentCategories?searchTerm=

GET  /api/GovernmentSchemes/GetSchemeRequiredDocumentsList?searchTerm=
GET  /api/GovernmentSchemes/GetSchemeWorkOrSkillTypesList
GET  /api/GovernmentSchemes/GetCommonQuestions
POST /api/GovernmentSchemes/AddCommonQuestion
```

### 14.6 Self-Employed Services

```
POST /api/GovernmentSchemes/AddSelfEmployedServices
PUT  /api/GovernmentSchemes/UpdateSelfEmployedServices
GET  /api/GovernmentSchemes/GetSelfEmployedServicesList?searchTerm=
PUT  /api/GovernmentSchemes/UpdateSelfEmployedServicesStatus?id=uuid
```

---

## 15. Module: IME (International Remittance)

International money transfer to Nepal via IME Forex integration.

### 15.1 Lookup / Reference Data

```
GET /api/IME/Countries
GET /api/IME/States/{CountryId}
GET /api/IME/Districts/{StateId}
GET /api/IME/Municipalities/{DistrictId}
GET /api/IME/Genders
GET /api/IME/MaritalStatus
GET /api/IME/Occupation
GET /api/IME/PurposeOfRemittance
GET /api/IME/GetIdTypes?countrycode=NP
GET /api/IME/GetIdentityTypes?countrycode=NP
GET /api/IME/RelationshipList
GET /api/IME/SourceOfFundList
GET /api/IME/GetAccountType
GET /api/IME/BankList/{CountryId}
GET /api/IME/BankBranchList/{BankId}
GET /api/IME/TransactionCancelReason
GET /api/IME/EducationalQualificationList
GET /api/IME/IDPlaceofIssue
```

### 15.2 CSP (Customer Service Point) Registration

```
GET  /api/IME/CheckCSP?cspcode=CSP001
POST /api/IME/CSPRegistration
POST /api/IME/CSPDocumentUpload
GET  /api/IME/CSPRegistrationTypeList
GET  /api/IME/CSPAddressProofTypeList
GET  /api/IME/CSPOwnerAddressProofTypeList
GET  /api/IME/CSPBusinessTypeList
GET  /api/IME/CSPDocumentTypeList
GET  /api/IME/OwnerCategoryTypes
```

### 15.3 Customer Management

```
GET  /api/IME/CheckCustomer/{mobileNo}
POST /api/IME/CustomerRegistration
POST /api/IME/ConfirmCustomerRegistration
POST /api/IME/CustomerMobileAmendment
```

### 15.4 Send Transaction

```
POST /api/IME/GetCalculation
POST /api/IME/SendOTP
POST /api/IME/SendTransaction
POST /api/IME/ConfirmSendTransaction
POST /api/IME/TransactionInquiry
POST /api/IME/AmendTransaction
POST /api/IME/CancelTransaction
GET  /api/IME/BalanceInquiry
```

**GetCalculation Body:**
```json
{
  "payoutAgentId": "IME_AGENT_001",
  "remitAmount": "5000",
  "paymentType": "AC",
  "payoutCountry": "NP",
  "calcBy": "S"
}
```

**SendTransaction Body:**
```json
{
  "senderName": "Ramesh Kumar",
  "senderMobileNo": "9876543210",
  "occupation": "EMPLOYEE",
  "receiverName": "Suresh Sharma",
  "receiverAddress": "Kathmandu",
  "receiverGender": "M",
  "receiverMobileNo": "9801234567",
  "receiverCity": "KTM",
  "receiverCountry": "NP",
  "forexSessionId": "session-id-from-calc",
  "agentTxnRefId": "REF001",
  "collectAmount": "5150",
  "payoutAmount": "8000",
  "sourceOfFund": "SALARY",
  "relationship": "BROTHER",
  "purposeOfRemittance": "FAMILY_MAINTENANCE",
  "paymentType": "AC",
  "bankId": "BANK001",
  "bankBranchId": "BRANCH001",
  "bankAccountNumber": "123456789",
  "calcBy": "S"
}
```

---

## 16. Module: Prabhu (International Remittance)

Alternative international remittance via Prabhu Money Transfer.

### 16.1 Token & KYC

```
POST /api/Prabhu/GetToken
POST /api/Prabhu/InitiateKYC
```

### 16.2 Reference Data

```
POST /api/Prabhu/CashPayLocationList
POST /api/Prabhu/AcPayBankBranchList
GET  /api/Prabhu/GetStateDistrict/{country}
GET  /api/Prabhu/GetStaticData/{type}
```

### 16.3 Customer & Receiver

```
GET  /api/Prabhu/GetCustomerByMobile/{customer_Mobile}
GET  /api/Prabhu/GetCustomerByIdNumber/{customer_IdNo}
POST /api/Prabhu/CreateCustomer
POST /api/Prabhu/CreateReceiver
POST /api/Prabhu/SendOTP
POST /api/Prabhu/ValidateBankAccount
```

### 16.4 Send & Manage Transactions

```
POST /api/Prabhu/GetServiceCharge
POST /api/Prabhu/SendTransaction
POST /api/Prabhu/SearchTransaction
POST /api/Prabhu/VerifyTransaction/{pinNo}
POST /api/Prabhu/CancelTransaction
POST /api/Prabhu/ComplianceTransactions
POST /api/Prabhu/GetImePrabhuReport
```

---

## 17. Module: Indo-Nepal Bus Service

Manage bus routes and seat bookings for Indo-Nepal cross-border travel.

### 17.1 Master Data Setup

```
POST /api/IndoNepalBusService/AddAgency        — Bus operator
PUT  /api/IndoNepalBusService/UpdateAgency
GET  /api/IndoNepalBusService/GetActiveAgency?searchTerm=
POST /api/IndoNepalBusService/GetAgencyList

POST /api/IndoNepalBusService/AddCity
PUT  /api/IndoNepalBusService/UpdateCity
GET  /api/IndoNepalBusService/GetActiveCities?searchTerm=
POST /api/IndoNepalBusService/GetCityList

POST /api/IndoNepalBusService/AddCityPoint     — Boarding/dropping points
PUT  /api/IndoNepalBusService/UpdateCityPoint
GET  /api/IndoNepalBusService/GetActiveCityPoints?cityId=uuid
POST /api/IndoNepalBusService/GetCityPointsList
```

### 17.2 Bus & Route Configuration

```
POST /api/IndoNepalBusService/AddBus
PUT  /api/IndoNepalBusService/UpdateBus
GET  /api/IndoNepalBusService/GetActiveBus?agencyId=uuid
GET  /api/IndoNepalBusService/GetBusById?busId=uuid
POST /api/IndoNepalBusService/GetBusList

POST /api/IndoNepalBusService/AddRoute
PUT  /api/IndoNepalBusService/UpdateRoute
POST /api/IndoNepalBusService/GetActiveRoutes
GET  /api/IndoNepalBusService/GetRouteById?routeId=uuid
POST /api/IndoNepalBusService/GetRoutesList

POST /api/IndoNepalBusService/ConfigureBusRoute   — Assign bus to route with schedule
GET  /api/IndoNepalBusService/GetConfiguredBusRoute?routeId=uuid
GET  /api/IndoNepalBusService/GetUnConfiguredBusRoute
```

**AddBus Body:**
```json
{
  "busClass": 1,
  "agencyId": "uuid",
  "busNumber": "UP-32-AB-1234",
  "busName": "Delhi Express",
  "row": 12,
  "col": 4,
  "walkWayColNo": 2,
  "isCompartmentalized": false,
  "seatLayout": [
    { "seatNumber": "A1", "row": 1, "col": 1, "isUpper": false },
    { "seatNumber": "A2", "row": 1, "col": 2, "isUpper": false }
  ]
}
```

`BusClass`: `0` = None, `1` = Seater, `2` = Sleeper, `3` = SemiSleeper, `4` = Volvo

### 17.3 Cancellation Policies

```
POST   /api/IndoNepalBusService/AddCancelationPolicy
PUT    /api/IndoNepalBusService/UpdateCancelationPolicy
DELETE /api/IndoNepalBusService/RemoveCancelationPolicy?cancelationId=uuid
GET    /api/IndoNepalBusService/GetActiveCancelationPolicy?agencyId=uuid
POST   /api/IndoNepalBusService/GetCancelationPolicyList
GET    /api/IndoNepalBusService/GetCancelationPolicyById?id=uuid
```

### 17.4 Seat Availability & Booking

```
GET  /api/IndoNepalBusService/GetSeats?busId=uuid&journeyDate=2024-07-01
POST /api/IndoNepalBusService/GetSeats1
PUT  /api/IndoNepalBusService/BlockSeats     — temporarily hold seats
POST /api/IndoNepalBusService/BookSeats      — confirm booking
POST /api/IndoNepalBusService/BookingsList   — admin list
POST /api/IndoNepalBusService/CancelTicket
GET  /api/IndoNepalBusService/DownloadTickets?bookingId=uuid
```

**BookSeats Body:**
```json
{
  "passenger": [
    {
      "name": "Ramesh Kumar",
      "gender": "uuid-male",
      "age": 35,
      "seatId": "uuid-seat",
      "seatNumber": "A1",
      "seatFare": 850.00,
      "isLeadPassenger": true
    }
  ],
  "paymentMode": 1,
  "traceId": "uuid",
  "busRouteId": "uuid",
  "busId": "uuid",
  "boardingCityPointId": "uuid",
  "droppingCityPointId": "uuid",
  "boardingCityId": "uuid",
  "droppingCityId": "uuid",
  "noOfSeats": 1,
  "gst": 42.50,
  "serviceFees": 50.00,
  "amount": 942.50,
  "platformCharges": 10.00,
  "phoneNo": "9876543210",
  "email": "user@example.com"
}
```

---

## 18. Module: Jobs

Full job portal — businesses post jobs, users create profiles and apply.

### 18.1 Master Data

```
POST /api/Jobs/AddSector         PUT /api/Jobs/UpdateSector
POST /api/Jobs/GetSectorList     GET /api/Jobs/SectorList
GET  /api/Jobs/SectorById?sectorId=uuid

POST /api/Jobs/AddJobRole        PUT /api/Jobs/UpdateJobRole
GET  /api/Jobs/GetJobRoles?sectorId=uuid
POST /api/Jobs/GetJobRolesList

POST /api/Jobs/AddSkill          PUT /api/Jobs/UpdateSkill
GET  /api/Jobs/GetSkills?jobRoleId=uuid&sectorId=uuid
POST /api/Jobs/GetSkillsList

POST /api/Jobs/AddFacility       PUT /api/Jobs/UpdateFacility
GET  /api/Jobs/GetFacilities

POST /api/Jobs/AddJobPlan        PUT /api/Jobs/UpdateJobPlan
GET  /api/Jobs/GetJobPlans?status=true
GET  /api/Jobs/GetJobPlanById?jobPlanId=uuid
```

### 18.2 Business Registration

```
POST /api/Jobs/AddBusiness
PUT  /api/Jobs/EditBusiness
GET  /api/Jobs/GetBusinessById?id=uuid&userId=uuid
POST /api/Jobs/GetBusinessList
PUT  /api/Jobs/UpdateBusinessStatus?id=uuid
PUT  /api/Jobs/BusinessApproval?id=uuid&status=1&remarks=
POST /api/Jobs/RenewBusinessPlan
GET  /api/Jobs/GetBusinessDropDownList?searchTerm=
```

**AddBusiness Body:**
```json
{
  "businessName": "ABC Technologies",
  "ownerName": "Amit Sharma",
  "userId": "uuid-of-user",
  "sectorId": "uuid-it-sector",
  "email": "hr@abc.com",
  "contactNumber1": "9876543210",
  "bussinessType": 1,
  "employeerType": 1,
  "amount": 999.00,
  "paymentMode": 2,
  "razorPayReferenceNo": "pay_xyz123",
  "address": {
    "address": "Plot 5, Tech Park",
    "districtId": "uuid",
    "stateId": "uuid",
    "country": "uuid",
    "pinCode": "201301"
  },
  "documents": [
    {
      "type": 2,
      "document": "base64==",
      "format": 2,
      "name": "GST_Certificate.pdf",
      "size": 512000
    }
  ]
}
```

### 18.3 Job Posts

```
POST /api/Jobs/AddJobPost
PUT  /api/Jobs/UpdateJobPost
PUT  /api/Jobs/UpdateJobPostStatus?jobId=uuid
PUT  /api/Jobs/JobPostApproval?id=uuid&status=1&remarks=
GET  /api/Jobs/GetJobPostById?id=uuid
POST /api/Jobs/GetJobPostList
```

**AddJobPost Body:**
```json
{
  "businessId": "uuid",
  "jobType": 1,
  "payStructure": 1,
  "offeredAmount": 25000,
  "educationId": "uuid-10th",
  "experience": 1,
  "genderId": "uuid-any",
  "minAge": 18,
  "maxAge": 35,
  "officeStartTime": "09:00",
  "officeEndTime": "18:00",
  "jobFacilities": ["uuid-pf", "uuid-esi"],
  "isJoiningFees": false,
  "joiningAmount": 0,
  "contactName": "HR Team",
  "contactNumber": "9876543210",
  "isUrgentHiring": true,
  "noOfOpenings": 5,
  "shiftType": 0,
  "weekOffDays": [0, 6],
  "skillIds": ["uuid-java", "uuid-sql"],
  "sectorId": "uuid-it",
  "jobRoleId": "uuid-developer",
  "address": {
    "address": "Tech Park, Noida",
    "districtId": "uuid",
    "stateId": "uuid",
    "country": "uuid"
  }
}
```

### 18.4 User Job Profile (Resume)

```
POST /api/Jobs/AddUserJobProfile
PUT  /api/Jobs/UpdateUserJobProfile
GET  /api/Jobs/GetJobProfileDetailsById?id=uuid&userId=uuid
POST /api/Jobs/GetJobProfilesList
PUT  /api/Jobs/UpdateUserJobProfileStatus?id=uuid
POST /api/Jobs/UpdateUserResumes
DELETE /api/Jobs/DeleteUserResume?id=uuid
```

### 18.5 Resume Templates

```
POST /api/Jobs/AddResumeTemplate
PUT  /api/Jobs/UpdateResumeTemplate
PUT  /api/Jobs/UpdateResumeTemplateStatus?id=uuid
GET  /api/Jobs/GetResumeTemplates?status=true
GET  /api/Jobs/GetResumeTemplateById?id=uuid
GET  /api/Jobs/DownloadResume?resumeId=uuid&userId=uuid
```

### 18.6 Apply & Manage Applications

```
POST /api/Jobs/ApplyJob
POST /api/Jobs/GetAppliedJobs
POST /api/Jobs/GetApplicantsList
POST /api/Jobs/GetRecommendedCandidateList
POST /api/Jobs/GetRecommendedJobList
PUT  /api/Jobs/UpdateUserPreferenceStatus?applicationId=uuid&jobId=uuid&status=1
POST /api/Jobs/GetJobReportList
```

**ApplyJob Body:**
```json
{
  "jobId": "uuid-of-job",
  "templateId": "uuid-of-resume-template-optional"
}
```

`PreferenceStatus`: `0` = Pending, `1` = Shortlisted, `2` = Rejected

---

## 19. Module: Notification

Send FCM push notifications to users or groups.

```
POST /api/Notification/SendNotification
POST /api/Notification/CreateNotification
POST /api/Notification/CreateBulkNotificationAsync
POST /api/Notification/GetNotificationList
```

**SendNotification Body:**
```json
{
  "deviceToken": "fcm-device-token",
  "title": "New Scheme Available!",
  "body": "PM Kisan Yojana is now available. Click to know more.",
  "screenName": "SchemeDetails",
  "complaintId": null
}
```

**CreateNotification (broadcast) Body:**
```json
{
  "title": "Important Update",
  "message": "App will be under maintenance tonight from 12AM-2AM",
  "role": ["uuid-saathi-role", "uuid-member-role"],
  "states": ["uuid-up", "uuid-mp"]
}
```

**GetNotificationList Body:**
```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "notificationType": 0,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

`NotificationType`: `0` = All, `1` = Unread

---

## 20. Module: Recharge & Bill

Mobile recharge, DTH, FASTag, and BBPS utility bill payments.

### 20.1 Mobile Recharge

```
POST /api/RechargeAndBill/RechargePlans    — Get available plans
POST /api/RechargeAndBill/Recharge
GET  /api/RechargeAndBill/GetRecharges/{Type}
GET  /api/RechargeAndBill/CheckRechargeStatus/{rechargeId}
POST /api/RechargeAndBill/RechargeCheckPayment
GET  /api/RechargeAndBill/DownloadRechargeAndBillReceipt?transactionId=uuid
```

**RechargePlans Body:**
```json
{
  "canumber": "9876543210",
  "type": 1
}
```

`HLRType`: `1` = Prepaid, `2` = Postpaid, `3` = DTH, `4` = FASTag

**Recharge Body:**
```json
{
  "canumber": "9876543210",
  "amount": 299.00,
  "rechargeType": 1,
  "operatorName": "JIO",
  "serviceCharges": 2.00,
  "gst": 0.36,
  "platformFees": 1.00
}
```

### 20.2 DTH Recharge

```
GET  /api/RechargeAndBill/DTHOperatorList
POST /api/RechargeAndBill/Recharge         — same endpoint, type=3
```

### 20.3 FASTag Recharge

```
GET  /api/RechargeAndBill/FASTagOperatorList
POST /api/RechargeAndBill/FetchFASTagDetail
POST /api/RechargeAndBill/FASTagRecharge
```

**FASTagRecharge Body:**
```json
{
  "amount": 500.00,
  "caNumber": "VEHICLE-NO-OR-TAG-ID",
  "operatorId": 12,
  "serviceCharges": 5.00,
  "gst": 0.90,
  "platformFees": 2.00,
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

### 20.4 Utility Bill Payment (BBPS)

```
GET  /api/RechargeAndBill/BillOperatorList
POST /api/RechargeAndBill/BillDetails
POST /api/RechargeAndBill/PayBill
POST /api/RechargeAndBill/GetBills
GET  /api/RechargeAndBill/DownloadBbpsReceipt?transactionId=uuid
```

**BillDetails Body:**
```json
{
  "operatorId": 45,
  "cAnumber": "CA123456789",
  "ad1_value": "additional-field-1",
  "ad2_value": null,
  "ad3_value": null
}
```

### 20.5 Nepal Utility Services

```
POST /api/RechargeAndBill/CheckPayment        — Generic
POST /api/RechargeAndBill/ExecutePayment
POST /api/RechargeAndBill/GetTransaction
POST /api/RechargeAndBill/NepalWaterCheckPayment
POST /api/RechargeAndBill/NEACheckPayment      — Nepal Electricity
POST /api/RechargeAndBill/InternetCheckPayment
POST /api/RechargeAndBill/TvAndInternetCheckPayment
POST /api/RechargeAndBill/SubisuCheckPayment
POST /api/RechargeAndBill/GetCompanyPackagesInfo
```

**CheckPayment Body:**
```json
{
  "companyCode": 100,
  "serviceCode": 1001,
  "account": "CONSUMER-NUMBER",
  "special1": null,
  "special2": null
}
```

### 20.6 BBPS Service Provider Management (Admin)

```
GET  /api/RechargeAndBill/GetServiceProvidersList
GET  /api/RechargeAndBill/GetServiceCodes?providerId=1
POST /api/RechargeAndBill/AddBBPSServiceProviders
PUT  /api/RechargeAndBill/UpdateBBPSLogo
POST /api/RechargeAndBill/AddBBPSServiceCodes
```

---

## 21. Module: Remittance

Unified wrapper over IME and Prabhu for Nepal remittance transactions.

### 21.1 Transaction Flows

```
GET  /api/Remittance/GetTransactions?mobileNo=9876543210
GET  /api/Remittance/GetRecieversListMobileNo?mobileNo=9876543210&pageNo=1
POST /api/Remittance/SendIMETransaction
POST /api/Remittance/ConfirmIMESendTransaction
PUT  /api/Remittance/ModifyImeTransaction
PUT  /api/Remittance/CancelImeTransaction
PUT  /api/Remittance/UpdateCheckImeStatus?PinIcnNumber=ICN123
GET  /api/Remittance/GetTransactionByPinNo?pinIcnNumber=ICN123
GET  /api/Remittance/DownloadImePrabhuReciept?pinIcnNumber=ICN123
GET  /api/Remittance/RefundTransaction?Id=uuid

POST /api/Remittance/SendPrabhuTransaction
POST /api/Remittance/ConfirmPrabhuTransaction
POST /api/Remittance/PrabhuCancelTransaction
```

### 21.2 CSP / Agent Management

```
POST /api/Remittance/ImeAgentOnboard
POST /api/Remittance/UploadAgentDocument
GET  /api/Remittance/CheckCSPStatus?agentId=uuid
POST /api/Remittance/GetAllAgentsList
GET  /api/Remittance/GetUsersBySearchTerm?searchTerm=
PUT  /api/Remittance/ChangeAgentStatus?agentId=uuid
POST /api/Remittance/SearchCSP
POST /api/Remittance/CreateCSP
POST /api/Remittance/GetCSPList
GET  /api/Remittance/prabhu/{userId}
GET  /api/Remittance/ime/{userId}
```

### 21.3 eKYA (Biometric KYC) for Agents

```
POST /api/Remittance/E_KYA_InitiateAPI
POST /api/Remittance/E_KYA_Unique_Ref_Status
POST /api/Remittance/E_KYA_Enrollment_API
POST /api/Remittance/BioKYCRequery
POST /api/Remittance/CSP_Onboarding_API
POST /api/Remittance/CSP_Mapping
POST /api/Remittance/Agent_Consent_Status
```

### 21.4 Customer Registration (Nepal Remittance)

```
POST /api/Remittance/RegisterCustomer
POST /api/Remittance/ConfirmCustomerRegistration
POST /api/Remittance/CheckCustomer
POST /api/Remittance/GetCustomerDetailsList
POST /api/Remittance/CheckPrabhuCustomer
POST /api/Remittance/CreateCustomerAsync
POST /api/Remittance/CustomerE_KYA_InitiateAPI
POST /api/Remittance/CustomerE_KYA_Unique_Ref_Status
POST /api/Remittance/CustomerE_KYA_Enrollment_API
POST /api/Remittance/PrabhuCustomerOnboarding
POST /api/Remittance/GetPrabhuCustomerList
```

### 21.5 Reference Data & Reports

```
GET  /api/Remittance/GetStaticData?type=GENDER
GET  /api/Remittance/GetStateDistrict?country=NP
POST /api/Remittance/IMEReportComparision   — multipart/form-data with Excel file
```

---

## 22. Module: Roles & Permissions

RBAC system — modules, sub-modules, operations, and role assignments.

### 22.1 Modules & Sub-Modules

```
GET  /api/RolesAndPermissions/GetMenuList
POST /api/RolesAndPermissions/AddModule
PUT  /api/RolesAndPermissions/UpdateModule
PUT  /api/RolesAndPermissions/UpdateModuleOrder
GET  /api/RolesAndPermissions/GetModulesList

POST /api/RolesAndPermissions/AddSubModule
PUT  /api/RolesAndPermissions/UpdateSubModule
PUT  /api/RolesAndPermissions/UpdateSubModuleOrder?moduleId=1
GET  /api/RolesAndPermissions/GetSubModulesList?moduleId=1
```

### 22.2 Operations (Permissions)

```
POST /api/RolesAndPermissions/AddOperation
PUT  /api/RolesAndPermissions/UpdateOperation
GET  /api/RolesAndPermissions/GetOperationsList?moduleId=1&subModuleId=2
GET  /api/RolesAndPermissions/GetAllOperationsList?roleId=1
```

### 22.3 Roles

```
POST /api/RolesAndPermissions/AddRole
PUT  /api/RolesAndPermissions/UpdateRole
PUT  /api/RolesAndPermissions/UpdateRoleStatus?id=1
GET  /api/RolesAndPermissions/GetRolesList?status=true
PUT  /api/RolesAndPermissions/ConfigureRolePermissions
PUT  /api/RolesAndPermissions/ConfigureUserRole?userId=uuid&roleId=1
```

**ConfigureRolePermissions Body:**
```json
{
  "roleId": 3,
  "operationIds": [1, 2, 5, 10, 15, 22]
}
```

---

## 23. Module: Static Data

Reference / lookup data used across the app.

```
GET /api/StaticData/GetCountries
GET /api/StaticData/GetStates?CountryId=uuid
GET /api/StaticData/GetDistricts?StateId=uuid
GET /api/StaticData/GetMunicipalities?DistrictId=uuid
GET /api/StaticData/GetGenders
GET /api/StaticData/GetMaritalStatuses
GET /api/StaticData/GetOccupations
GET /api/StaticData/GetEducations
GET /api/StaticData/GetAdditionalCourses
GET /api/StaticData/GetAlternateOccupationTypes
GET /api/StaticData/GetBankAccountTypes
GET /api/StaticData/GetDocumentTypes
GET /api/StaticData/GetCategories
GET /api/StaticData/GetSourceOfFunds
GET /api/StaticData/GetTypeOfPartners
GET /api/StaticData/GetAreaOfExpertise
GET /api/StaticData/GetRoles
GET /api/StaticData/GetCspBanks

— CSP / Remittance specific:
GET /api/StaticData/GetCSPAddressProofTypes
GET /api/StaticData/GetCSPBusinessTypes
GET /api/StaticData/GetCSPDeviceConnectivityTypes
GET /api/StaticData/GetCSPDevices
GET /api/StaticData/GetCSPDocumentTypes
GET /api/StaticData/GetCSPRegistrationTypes
GET /api/StaticData/GetCustomerIdentificationTypes
GET /api/StaticData/GetOwnersAddressProofTypes
GET /api/StaticData/OwnersIdTypes
GET /api/StaticData/GetAppComponents
```

---

## 24. Module: Travelling (Bus Booking)

Third-party bus booking integration (TBO/similar API).

### 24.1 Search & Seat Layout

```
GET  /api/Travelling/GetBusCities
GET  /api/Travelling/GetAgencyBalance
POST /api/Travelling/SearchBus
POST /api/Travelling/GetBusSeatLayOut
POST /api/Travelling/GetBusBoardingPointDetails
```

**SearchBus Body:**
```json
{
  "originId": 1,
  "destinationId": 45,
  "dateOfJourney": "2024-07-01",
  "isAcOnly": false,
  "busTypes": ["SEATER", "SLEEPER"]
}
```

**GetBusSeatLayOut Body:**
```json
{
  "traceId": "trace-id-from-search",
  "resultIndex": 0
}
```

### 24.2 Block & Book

```
POST /api/Travelling/BusBlock    — hold seats temporarily
POST /api/Travelling/BusBook     — confirm booking with payment
POST /api/Travelling/GetBookingDetail
```

**BusBook Body:**
```json
{
  "resultIndex": 0,
  "traceId": "trace-id-from-search",
  "boardingPointId": 101,
  "droppingPointId": 205,
  "passenger": [
    {
      "title": "Mr",
      "firstName": "Ramesh",
      "lastName": "Kumar",
      "age": 35,
      "phoneno": "9876543210",
      "email": "ramesh@example.com",
      "gender": 1,
      "leadPassenger": true,
      "seat": {
        "seatIndex": 5,
        "seatName": "L1"
      }
    }
  ],
  "serviceFees": 50.00,
  "gst": 9.00,
  "platformCharges": 10.00,
  "paymentMode": 1
}
```

### 24.3 Cancellation & History

```
POST /api/Travelling/BusCancel
PUT  /api/Travelling/CheckRefundStatus?id=uuid
POST /api/Travelling/GetChangeRequestStatus
GET  /api/Travelling/GetBusBookingHistory?page=0&searchTerm=
POST /api/Travelling/GetTravelReport
```

---

## 25. Module: User

Core user management — registration, profile, Saathi onboarding, partner hierarchy.

### 25.1 User Lookup & Profile

```
GET  /api/User/CheckIfUserExist?mobileNo=9876543210
POST /api/User/GetUserByID?Id=uuid
GET  /api/User/GetUserByMobileNo?mobileNo=9876543210
GET  /api/User/GetCompleteUserInfo?number=9876543210
GET  /api/User/child-users/{userId}?fromDate=&toDate=
GET  /api/User/GetUsersByMobileNumber?searchTerm=987
PUT  /api/User/UpdateUser
PUT  /api/User/UpdateUserStatus
```

### 25.2 Member Registration & Management

```
POST /api/User/AddUserAsMember
PUT  /api/User/UpdateMember
GET  /api/User/GetMemberByUserID?UserId=uuid
POST /api/User/GetMembersList
```

**AddUserAsMember Body:**
```json
{
  "userId": "uuid",
  "genderId": "uuid",
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "birthDate": "1990-05-15",
  "email": "ramesh@example.com",
  "maritalStatus": "uuid",
  "citizen": "uuid-india",
  "education": "uuid-graduation",
  "occupation": "uuid-farmer",
  "isMigrantWorker": true,
  "incomeAboveThreashold": false,
  "addresses": [...],
  "documents": [...],
  "paymentMode": 1,
  "razorPayReferenceNo": null
}
```

### 25.3 Saathi Registration & Management

```
POST /api/User/SaathiRegistration
GET  /api/User/GetSaathi?userId=uuid&isViewMemDocs=false
PUT  /api/User/UpdateSaathi
POST /api/User/GetSaathiList
PUT  /api/User/updateSaathiServices
PUT  /api/User/MarkSaathiAsPopularInSchemes?saathiId=uuid
GET  /api/User/DownloadMembershipCard
```

**SaathiRegistration Body:**
```json
{
  "userId": "uuid",
  "panCardNo": "ABCDE1234F",
  "computerLiteracy": true,
  "isPC": true,
  "internetSearchAndAccessLiteracy": true,
  "isEKYCDevice": false,
  "shopAddress": {
    "shopName": "Ramesh Digital Seva Kendra",
    "shopAddress": "Near Bus Stand",
    "districtId": "uuid",
    "stateId": "uuid",
    "country": "uuid",
    "pinCode": "226001"
  },
  "documents": [...],
  "sections": ["uuid-section-recharge", "uuid-section-schemes"],
  "schemeFees": 100.00,
  "paymentMode": 2,
  "razorPayReferenceNo": "pay_xyz123"
}
```

### 25.4 Book Saathi Service

```
POST /api/User/BookSaathi
POST /api/User/GetSaathiListByPincode
POST /api/User/GetBookedSaathi
POST /api/User/GetSaathiServicesApplicantUsers
POST /api/User/UserApprovalForBookSaathi
```

**BookSaathi Body:**
```json
{
  "schemeId": "uuid-optional",
  "userId": "uuid-applicant",
  "saathiUserId": "uuid-saathi",
  "applicantName": "Suresh Verma",
  "applicantPhoneNo": "9876543210",
  "applicantAddress": "Village Rampur, UP",
  "platformFees": 10.00,
  "saathiFees": 50.00,
  "schemeFees": 0.00,
  "pincode": "226001"
}
```

### 25.5 Partner Management

Partners form the distribution hierarchy (State → District).

```
POST /api/User/AddPartner
POST /api/User/UpdatePartner
GET  /api/User/GetAllPartnerList?currentUserId=uuid
POST /api/User/GetStatePartnerList
POST /api/User/GetDistrictPartnerList
GET  /api/User/GetPartnerDetailsByID?UserId=uuid
POST /api/User/SetPartnerPassword
GET  /api/User/ResendEmailForSetPassword?email=partner@example.com
```

### 25.6 System Users (Admin Staff)

```
POST /api/User/AddSystemUser
POST /api/User/GetSystemUsersList
```

**AddSystemUser Body:**
```json
{
  "firstName": "Admin",
  "lastName": "Staff",
  "phoneNo": "9876543210",
  "email": "admin@saathi.in",
  "birthDate": "1985-01-01",
  "gender": "uuid",
  "password": "AdminPass@123",
  "roleId": 1
}
```

### 25.7 Membership & Survey Questions

```
GET  /api/User/GetMembershipQuestions?SearchTerm=&LanguageId=EN
POST /api/User/AddUpdateMembershipSelectedQuestions
GET  /api/User/GetOfflineMembershipQuestionsByDP?LanguageId=EN
GET  /api/User/GetOnlineMembershipQuestions?LanguageId=EN
POST /api/User/OfflineRegistrations
```

### 25.8 Referral & Notifications

```
POST /api/User/AddReferralData
GET  /api/User/LogReferalCode?id=uuid
POST /api/User/AddNotificationData
GET  /api/User/GetNotifications?PageNumber=1
PUT  /api/User/UpdateNotificationLastSeen
PUT  /api/User/UpdateFCMData
```

### 25.9 Bank Accounts

```
POST /api/User/AddBankAccount
PUT  /api/User/UpdateBankAccount
PUT  /api/User/UpdateBankAccountStatus?BankId=uuid
GET  /api/User/GetBankAccounts
GET  /api/User/GetBankAccountDetails?BankId=uuid
```

### 25.10 Parent Change Request

```
POST   /api/User/RequestParentChange
GET    /api/User/GetParentChangeRequests?searchTerm=
GET    /api/User/GetMyParentChangeRequests
DELETE /api/User/WithdrawParentChangeRequest?requestId=uuid
POST   /api/User/ApproveRejectParentChangeRequest
```

### 25.11 Other User Endpoints

```
POST /api/User/MoneyDepositRequest
POST /api/User/UpdateLocation
GET  /api/User/AddDashboardImage
GET  /api/User/GetDashboardImages/{RoleId}
POST /api/User/AddUserAsUser
POST /api/User/GetUsersList1
```

---

## 26. Enum Reference

| Enum | Values |
|------|--------|
| `PaymentMode` | 1=Wallet, 2=Razorpay |
| `SortOrder` | 0=None, 1=Ascending, -1=Descending |
| `ApprovalStatus` | 0=Pending, 1=Approved, 2=Rejected |
| `DocumentFormat` | 0=JPG, 1=PNG, 2=PDF |
| `DocumentType` | 0=None, 1=Aadhaar, 2=PAN, 3=Passport, 4=VoterID, 5=DrivingLicense, 6=Photo, 7=Signature, 8=Other |
| `AddressType` | 0=Permanent, 1=Current, 2=Office, 3=Shop, 4=Other |
| `PostType` | 0=Public, 1=Community |
| `HLRType` | 1=Prepaid, 2=Postpaid, 3=DTH, 4=FASTag |
| `BusClass` | 0=None, 1=Seater, 2=Sleeper, 3=SemiSleeper, 4=Volvo |
| `BusBookingStatus` | 1=Booked, 2=Cancelled, 3=Refunded, 4=Pending, 5=Failed, 6=Processing, 7=Confirmed, 8=Expired |
| `JobTypes` | 0=None, 1=FullTime, 2=PartTime |
| `PayStructure` | 0=None, 1=Monthly, 2=Daily, 3=Hourly |
| `Experience` | 0=Fresher, 1=LessThan1Year, 2=1to3Years, 3=3to5Years, 4=5to10Years, 5=MoreThan10Years |
| `ShiftTypes` | 0=Day, 1=Night |
| `ApplicantStatus` | 0=Applied, 1=Shortlisted, 2=Selected, 3=Rejected |
| `PreferenceStatus` | 0=None, 1=Shortlisted, 2=Rejected |
| `ApprovalStatus` (Business) | 0=Pending, 1=Approved, 2=Rejected |
| `BussinessTypes` | 0=None, 1=Proprietorship, 2=Partnership, 3=Company |
| `EmployeerTypes` | 0=None, 1=Local, 2=National, 3=International |
| `TransactionStatus` | 0=None, 1=Success, 2=Failed, 3=Pending, 4=Processing, 5=Refunded, 6=PartialRefund, 7=Cancelled, 8=Expired, 9=OnHold, 10=Disputed, -1=Unknown |
| `DMTTransactionStatus` | 0=None, 1=Success, 2=Failed, 3=Pending, 4=Refunded, 5=Cancelled |
| `CommissionType` | 1=Flat, 2=Percentage |
| `BaseCommissionType` | 1=TransactionAmount, 2=CommissionAmount |
| `NotificationType` | 0=All, 1=Unread |
| `ComplaintStatus` | 0=Open, 1=Closed |
| `ServiceTypes` | 0=General, 1=Recharge, 2=DMT |
| `QuestionTypes` | 0=YesNo, 1=SingleChoice, 2=MultiChoice |
| `EligibilityFlags` | 0=NotApplicable, 1=Yes, 2=No |
| `Residence` | 0=Any, 1=Rural, 2=Urban |
| `HouseTypes` | 0=Any, 1=Pucca, 2=Kutcha |
| `WallTypes` | 0=Any, 1=Brick, 2=Bamboo |
| `SourceOfIncome` | 0=None, 1=Agriculture, 2=Business, 3=Service, 4=Labour, 5=Other |
| `EmploymentStatus` | 0=None, 1=Employed, 2=SelfEmployed, 3=Unemployed, 4=Student |
| `MinistryType` | 0=None, 1=Central, 2=State, 3=Both |
| `Placements` | 0=Top, 1=Bottom |
| `Types` (Poster) | 0=Image, 1=Video |
| `PartnerType` | 0=StatePartner, 1=DistrictPartner |
| `GetSchemesListBy` | 0=All, 1=Category, 2=Ministry |
| `TransactionTypes` | 0=None, 1=Credit, 2=Debit, 3=Transfer |

---

## 27. Reusable Schema Reference

### AddressVM

```json
{
  "address": "123 Main Street",
  "districtId": "uuid",
  "stateId": "uuid",
  "municipalityId": "uuid-optional",
  "country": "uuid",
  "pinCode": "226001",
  "addressType": 0
}
```

### DocumentsVM

```json
{
  "type": 1,
  "document": "base64-encoded-content",
  "format": 0,
  "name": "aadhaar_front.jpg",
  "size": 204800,
  "documentNumber": "1234-5678-9012"
}
```

### BaseListRequestVM (Pagination)

```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "searchTerm": "",
  "sortBy": "createdAt",
  "sortOrder": -1
}
```

### SurveyQuestionsVM (Membership Form)

```json
{
  "questionId": "uuid-of-question",
  "answer": "Yes",
  "linkedQueAnswer": "answer-to-linked-question-if-any"
}
```

### AgentOnboardVM (Remittance Agent)

See full schema in Section 21 — includes personal details, bank details, KYC documents, shop address, and owner details.

---

*Documentation generated from Saathi API OpenAPI Specification v1. For integration support, contact the platform team.*
