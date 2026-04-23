# IME Forex — Complete API Integration Guide
> **For Beginner Developers** | Indo Nepal Money Transfer | Version 1.6 (Phase 1) + Phase 2 (eKYC/Aadhar)

---

## 📋 Table of Contents

1. [What is IME Forex?](#1-what-is-ime-forex)
2. [Important URLs](#2-important-urls)
3. [How the API Works (Basics)](#3-how-the-api-works-basics)
4. [Authentication — Credentials Explained](#4-authentication--credentials-explained)
5. [Common Response Codes](#5-common-response-codes)
6. [Static Data (GetStaticData)](#6-static-data-getstaticdata)
7. [CSP Module](#7-csp-module)
8. [Customer Module](#8-customer-module)
9. [Transaction Flow](#9-transaction-flow)
10. [Reports](#10-reports)
11. [Phase 2 — Aadhar Entity Reprocess](#11-phase-2--aadhar-entity-reprocess)
12. [Phase 2 — eKYC via Aadhar (RBL)](#12-phase-2--ekyc-via-aadhar-rbl)
13. [Master Data — All Static IDs](#13-master-data--all-static-ids)
14. [Terms and Conditions](#14-terms-and-conditions)

---

## 1. What is IME Forex?

**IME Forex (now IME India Private Limited)** is a money transfer service that allows agents in India to send money to beneficiaries in Nepal. This is called the **Indo-Nepal Remittance Service**, operated under **Reserve Bank of India (RBI)** guidelines.

As a developer, you will integrate with this API to:
- Register agents/branches (called **CSP** — Customer Service Points)
- Register customers (senders in India)
- Create money transfer transactions
- Track, modify, or cancel transactions
- Pull reports

The API uses **SOAP Web Services** (XML-based) for Phase 1, and **REST/POST** endpoints for Phase 2 eKYC.

---

## 2. Important URLs

| Environment | URL |
|-------------|-----|
| **UAT (Testing)** | `https://testsendapi.imeforex-txn.net/SendWsApi/IMEForexSendService.asmx` |
| **OTP Consent (Phase 2)** | `https://uiduat.rblbank.com/PrepaidCustomerLogin/PPIAgentEkyc.aspx?ref=n4VqHQe13IbA/4uRcwC7/Q==` |
| **Website** | `www.imeforex.com` / `www.imeindia.com` |
| **Support** | `support@imeindia.com` | `+91-0120-4798200` |

> ⚠️ **Beginner Tip:** Always test on the UAT environment first. Never run untested code on production.

---

## 3. How the API Works (Basics)

### What is SOAP?
SOAP (Simple Object Access Protocol) is a way to call remote functions over the internet using **XML** messages. Think of it like sending a very structured letter to a server and getting a structured reply.

Every request you send has:
1. A **SOAP Envelope** — the wrapper
2. A **SOAP Header** — (often empty)
3. A **SOAP Body** — the actual request data

### Basic XML Structure Template
Every API call follows this skeleton:
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ime="IME">
  <soapenv:Header/>
  <soapenv:Body>
    <ime:METHOD_NAME>
      <ime:METHOD_NAMERequest>
        <ime:Credentials>
          <ime:AccessCode>YOUR_ACCESS_CODE</ime:AccessCode>
          <ime:UserName>YOUR_USERNAME</ime:UserName>
          <ime:Password>YOUR_PASSWORD</ime:Password>
          <ime:PartnerBranchId>YOUR_BRANCH_ID</ime:PartnerBranchId>
          <ime:AgentSessionId>UNIQUE_SESSION_ID</ime:AgentSessionId>
        </ime:Credentials>
        <!-- Additional fields go here -->
      </ime:METHOD_NAMERequest>
    </ime:METHOD_NAME>
  </soapenv:Body>
</soapenv:Envelope>
```

### What is AgentSessionId?
`AgentSessionId` is a **unique string you generate** on your side for every API call (max 30 chars). It helps you track which call is which. Think of it as a request ID — make it unique every time (e.g., a timestamp + random number).

---

## 4. Authentication — Credentials Explained

Every single API call requires these 5 credential fields:

| Parameter | Type | Max Length | What It Means |
|-----------|------|-----------|----------------|
| `AccessCode` | String | 10 | A unique code IME assigns to your agent/company. You receive this from IME. |
| `UserName` | String | 20 | Login username assigned by IME for your agent account. |
| `Password` | String | 20 | Password for your agent account. |
| `PartnerBranchId` | String | 10 | Your specific branch or CSP code — also assigned by IME. |
| `AgentSessionId` | String | 30 | A unique ID **you generate** for each request to track it on your end. |

> 💡 **Tip:** Store `AccessCode`, `UserName`, `Password`, and `PartnerBranchId` securely (e.g., in environment variables). Never hardcode them in your source code.

---

## 5. Common Response Codes

Every API response returns a `Code` field. Here is what each code means:

### Universal Codes (apply to ALL methods)

| Code | Message | What to Do |
|------|---------|------------|
| `0` | **Success** | Everything worked! Process the response. |
| `101` | Authentication Failed | Wrong credentials. Check AccessCode, UserName, or Password. |
| `102` | Need to change Password. Contact HO | Your password has expired. Contact IME Head Office. |
| `901` | Technical Error | Server-side error. Retry after a delay; if it persists, contact IME. |
| `999` | Internal Server Error | Serious server error. Contact IME support. |

### CSP Module–Specific Codes

| Code | Message |
|------|---------|
| `603` | Parameter Missing — You forgot a required field |
| `604` | Bad Request (Invalid Input Value) — A field has an invalid value |
| `605` | Balance Details Not Found |

### Customer Module–Specific Codes

| Code | Message |
|------|---------|
| `503` | Parameter Missing |
| `504` | Bad Request (Invalid Input Value) |

### OTP Module–Specific Codes

| Code | Message |
|------|---------|
| `703` | Parameter Missing |
| `704` | Bad Request |
| `706` | Sending OTP Very Quick / OTP Limit Exceeded — Wait before retrying |
| `708` | Transaction with REF No not found |

### Transaction Module–Specific Codes

| Code | Message |
|------|---------|
| `103` | Required Field |
| `104` | Bad Request (Invalid Input Value) |
| `105` | Setup Required |
| `106` | Limit/Balance Expired or Not Enough |
| `107` | Forex ID expired or Already Used — Get a fresh `ForexSessionId` |
| `108` | Transaction Not Found for supplied RefNo |
| `109` | Unauthorized |

### Reports Module–Specific Codes

| Code | Message |
|------|---------|
| `803` | Parameter Missing |
| `804` | Bad Request |
| `809` | Report Record Not Found |

---

## 6. Static Data (GetStaticData)

### What is Static Data?
Many fields in other API calls require **IDs** instead of plain text. For example, instead of passing `"Male"` as gender, you pass `1801`. These IDs come from the `GetStaticData` API.

**Method Name:** `GetStaticData`

> 💡 **Tip for Beginners:** Call `GetStaticData` once when your app starts and cache the results. These values rarely change.

### All Available TypeCodes

| S.N. | TypeCode | What It Returns | Used In |
|------|----------|----------------|---------|
| 1 | `WSST-CONV1` | Country List | All country fields |
| 2 | `WSST-STTV1` | Country State List | State fields (pass country code as ReferenceValue) |
| 3 | `WSST-DISV1` | State District List | District fields (pass State ID as ReferenceValue) |
| 4 | `WSST-MUNV1` | District Municipality List | Municipality field (pass District ID as ReferenceValue) |
| 5 | `WSST-GDRV1` | Gender List | Gender fields |
| 6 | `WSST-MSSV1` | Marital Status List | MaritalStatus field |
| 7 | `WSST-OCPV1` | Occupation List | Occupation fields |
| 8 | `WSST-SOFV1` | Source of Fund List | SourceOfFund field |
| 9 | `WSST-IDTV1` | Identification Type List | IdType field (pass country code as ReferenceValue) |
| 10 | `WSST-POIV1` | Place of Issue List | IdPlaceOfIssue (pass Id Type ID as ReferenceValue) |
| 11 | `WSST-RELV1` | Relationship List | Relationship field in transactions |
| 12 | `WSST-PORV1` | Purpose of Remit List | PurposeOfRemittance field |
| 13 | `WSST-TCRV1` | Transaction Cancel Reason List | CancelReason field |
| 14 | `WSST-BKLV1` | Bank List | Bank field |
| 15 | `WSST-BBLV1` | Bank Branch List | BankBranchId (pass Bank ID as ReferenceValue) |
| 16 | `WSST-REGV1` | CSP Registration Type List | RegistrationType field |
| 17 | `WSST-ADPV1` | CSP Address Proof Type List | AddressProofType field |
| 18 | `WSST-BUSV1` | CSP Business Type List | BusinessType field |
| 19 | `WSST-ADOV1` | CSP Document Type List | DocumentType in document upload |
| 20 | `WSST-ACCV1` | Account Type List | AccountType field |
| 21 | `WSST-DEVV1` | Device List | Device field |
| 22 | `WSST-CTVV1` | Connectivity Type List | ConnectivityType field |
| 23 | `WSST-CATV1` | Owner Category Type List | Category field |
| 24 | `WSST-OAPV1` | Owner Address Proof Type List | OwnerAddressProofType |
| 25 | `WSST-PHCV1` | Physically Handicapped Type List | PhysicallyHandicapped field |
| 26 | `WSST-AOCV1` | Alternate Occupation Type List | AlternateOccupationType field |
| 27 | `WSST-OIDV1` | Owner Id Type List | IdType in owner details |
| 28 | `WSST-EDQV1` | Educational Qualification List | EducationalQualification field |
| 29 | `WSST-ADCV1` | Additional Course List | AdditionalCourse field |
| 30 | `WSST-OBAV1` | Owner By Agent List *(Phase 2)* | Pass Agent Id as ReferenceValue |
| 31 | `WSST-BBAV1` | Bank By Agent List *(Phase 2)* | Pass Agent Id as ReferenceValue |
| 32 | `WSST-CAIV1` | Customer Annual Income List *(Phase 2)* | EstimatedAnnualIncome field |

### ReferenceValue Rules (Important!)

| TypeCode | ReferenceValue to Pass |
|----------|----------------------|
| `WSST-STTV1` | Country code: `NPL` (Nepal) or `IND` (India) |
| `WSST-DISV1` | State ID (from state list result) |
| `WSST-MUNV1` | District ID (from district list result) |
| `WSST-IDTV1` | Country code: `NPL` or `IND` |
| `WSST-POIV1` | Identification Type ID |
| `WSST-BBLV1` | Bank ID |
| `WSST-OBAV1` | Agent Id |
| `WSST-BBAV1` | Agent Id |

### GetStaticData Request XML

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ime="IME">
  <soapenv:Header/>
  <soapenv:Body>
    <ime:GetStaticData>
      <ime:GetStaticDataRequest>
        <ime:Credentials>
          <ime:AccessCode>string</ime:AccessCode>
          <ime:UserName>string</ime:UserName>
          <ime:Password>string</ime:Password>
          <ime:PartnerBranchId>string</ime:PartnerBranchId>
          <ime:AgentSessionId>string</ime:AgentSessionId>
        </ime:Credentials>
        <ime:TypeCode>WSST-GDRV1</ime:TypeCode>
        <ime:ReferenceValue></ime:ReferenceValue>  <!-- Optional; use when required -->
      </ime:GetStaticDataRequest>
    </ime:GetStaticData>
  </soapenv:Body>
</soapenv:Envelope>
```

### GetStaticData Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code |
| AgentSessionId | String | Y | 30 | Unique Session ID you generate |
| TypeCode | String | Y | 10 | The code from the table above (e.g., WSST-GDRV1) |
| ReferenceValue | String | N | 30 | Required only for some TypeCodes — see table above |

### GetStaticData Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success, otherwise error code |
| Message | Success or Error message text |
| AgentSessionId | The session ID you sent (echoed back) |
| RequestedTypeCode | The TypeCode you requested |
| Id | The numeric ID of this data item — **use this ID in other API calls** |
| Value | The human-readable name of this item (e.g., "Male", "Married") |

---

## 7. CSP Module

### What is a CSP?
A **CSP (Customer Service Point)** is a registered branch/agent location that can process money transfers. Before any transactions, the CSP must be registered and have its documents uploaded and approved.

### CSP Module Response Codes (in addition to common codes)

| Code | Message |
|------|---------|
| `603` | Parameter Missing |
| `604` | Bad Request (Invalid Input Value) |
| `605` | Balance Details Not Found |

---

### 7.1 CSP Registration

**Method Name:** `CSPRegistration`

This registers a new CSP (branch) in the IME system. It's a large request broken into sections.

#### Request XML

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ime="IME">
  <soapenv:Header/>
  <soap:Body>
    <CSPRegistration>
      <CSPRegisterRequest>
        <Credentialss>
          <AccessCode>string</AccessCode>
          <UserName>string</UserName>
          <Password>string</Password>
          <PartnerBranchId>string</PartnerBranchId>
          <AgentSessionId>string</AgentSessionId>
        </Credentialss>
        <CompanyProfile>
          <PartnerCSPCode>string</PartnerCSPCode>
          <CSPName>string</CSPName>
          <RegistrationType>string</RegistrationType>
          <RegistrationNumber>string</RegistrationNumber>
          <BusinessType>string</BusinessType>
          <ContractExpiryDate>YYYY/MM/DD</ContractExpiryDate>
          <ContractRenewalDate>YYYY/MM/DD</ContractRenewalDate>
          <PANNumber>string</PANNumber>
        </CompanyProfile>
        <!-- ... (see full parameters below) -->
      </CSPRegisterRequest>
    </CSPRegistration>
  </soap:Body>
</soapenv:Envelope>
```

#### Section: CompanyProfile Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| PartnerCSPCode | String | Y | 10 | Your internal unique code for this CSP |
| CSPName | String | Y | 100 | Full name of the CSP/business |
| RegistrationType | String | Y | 10 | ID from GetStaticData (`WSST-REGV1`) — e.g., 4501 = Proprietorship |
| RegistrationNumber | String | Y | 20 | Business registration number |
| BusinessType | String | Y | 10 | ID from GetStaticData (`WSST-BUSV1`) — e.g., 6200 = Remittance |
| ContractExpiryDate | Date | Y | 20 | Format: `YYYY/MM/DD` |
| ContractRenewalDate | Date | Y | 20 | Format: `YYYY/MM/DD` |
| PANNumber | String | Y | 20 | PAN card number of the CSP/company |

#### Section: CompanyInfoDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| Country | String | Y | 10 | Country ID from GetStaticData (`WSST-CONV1`) |
| State | String | Y | 10 | State ID from GetStaticData (`WSST-STTV1`) |
| District | String | Y | 10 | District ID from GetStaticData (`WSST-DISV1`) |
| City | String | Y | 100 | City name (free text) |
| HouseNumber | String | Y | 20 | House/building number |
| RoadName | String | Y | 200 | Road or street name |
| PINCode | String | Y | 6 | 6-digit postal PIN code |
| AddressProofType | String | Y | 10 | ID from GetStaticData (`WSST-ADPV1`) |

#### Section: ContactPersonDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| ContactPersonName | String | Y | 250 | Full name of contact person |
| MobileNumber1 | String | Y | 10 | Primary mobile number (10 digits) |
| MobileNumber2 | String | N | 10 | Secondary mobile (optional) |
| LandlineNumber | String | N | 11 | Landline with STD code |
| Email | String | Y | 100 | Contact person's email |

#### Section: BankDetails Parameters *(can repeat for multiple bank accounts)*

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| Bank | String | Y | 10 | Bank ID from GetStaticData (`WSST-BKLV1`) — India banks only |
| AccountType | String | Y | 10 | Account Type ID from GetStaticData (`WSST-ACCV1`) |
| AccountNo | String | Y | 30 | Bank account number |
| IFSC | String | Y | 30 | Bank IFSC code (11 characters) |

#### Section: DeviceConnectivityDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| Device | String | Y | 10 | Device ID from GetStaticData (`WSST-DEVV1`) — e.g., 16001 = Laptop |
| ConnectivityType | String | Y | 10 | Connectivity ID from GetStaticData (`WSST-CTVV1`) — e.g., 16102 = Mobile |
| Provider | String | Y | 100 | Name of internet service provider |

#### Section: BusinessHourDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| StartTime | Time | Y | 10 | Opening time in format `HH:mm:ss` (e.g., `09:00:00`) |
| EndTime | Time | Y | 10 | Closing time in format `HH:mm:ss` |
| HasWeekendOff | String | Y | 1 | `Y` = Yes has weekend off, `N` = No |
| OffDay | String | N | 10 | Weekday ID (mandatory if HasWeekendOff = Y) |

#### Section: OwnerDetails Parameters *(can repeat for multiple owners)*

**OwnerInfoDetails:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| OwnersName | String | Y | 50 | Owner full name |
| Gender | String | Y | 10 | Gender ID from GetStaticData (`WSST-GDRV1`) |
| DOB | Date | Y | 20 | Date of Birth: `YYYY/MM/DD` |
| FatherName | String | Y | 50 | Father's full name |
| SpouseName | String | N | 50 | Spouse name (optional) |
| Category | String | N | 10 | Category ID from GetStaticData (`WSST-CATV1`) — e.g., 16301 = GENERAL |
| PhysicallyHandicapped | String | N | 10 | ID from GetStaticData (`WSST-PHCV1`) |
| MobileNumber | String | Y | 10 | Owner mobile number |
| ContactNumber | String | N | 11 | Alternate contact |
| Email | String | N | 50 | Owner email |
| AlternateOccupationType | String | N | 10 | ID from GetStaticData (`WSST-AOCV1`) |

**OwnerDocumentDetails:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| PanCard | String | Y | 20 | Owner's PAN card number |
| IdType | String | Y | 10 | ID Type from GetStaticData (`WSST-OIDV1`) |
| IDTypeNumber | String | Y | 50 | The actual ID number (e.g., Aadhaar number) |

**OwnerAddressDetails:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| Country | String | Y | 10 | Country ID |
| State | String | Y | 10 | State ID |
| District | String | Y | 10 | District ID |
| City | String | Y | 100 | City name |
| HouseNumber | String | Y | 20 | House number |
| RoadName | String | Y | 200 | Road/Street name |
| PINCode | String | Y | 6 | PIN code |
| ResidentialAddressVillageCode | String | Y | 10 | Village code for residential address |
| AddressProofType | String | Y | 10 | ID from GetStaticData (`WSST-OAPV1`) |

**OwnerEducationDetails:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| EducationalQualification | String | Y | 10 | ID from GetStaticData (`WSST-EDQV1`) — e.g., 16605 = Graduate |
| AdditionalCourse | String | Y | 10 | ID from GetStaticData (`WSST-ADCV1`) — e.g., 16703 = None |
| InstituteName | String | Y | 50 | Name of educational institution |
| DateofPassed | String | Y | 50 | Year of passing (e.g., `2018`) |

#### CSP Registration Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success, otherwise error code |
| Message | Success or Error message |
| AgentSessionId | Your session ID |
| CSPName | Registered name of CSP |
| PartnerCSPCode | Your CSP code (echoed back) |
| Status | `Y` = Active, `N` = Inactive |
| OwnerId | Owner's ID in IME system (save this for document upload) |
| OwnerName | Owner's name |
| BankId | Bank ID in IME system (save this for document upload) |
| BankName | Bank name |
| DocumentType | Document type ID |
| Status (doc) | `True` = uploaded, `False` = not uploaded |
| ReferenceId | CSPCode / BankId / OwnerId (use for document upload) |
| IsRequired | `Yes` = Mandatory document, `No` = Optional |

---

### 7.2 CSP Document Upload

**Method Name:** `CSPDocumentUpload`

After registering the CSP, you must upload required documents.

> 💡 **Tip:** From CSPRegistration response, note all `DocumentType` + `ReferenceId` pairs where `IsRequired = Yes`. Upload all of those.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Agent access code |
| UserName | String | Y | 20 | Agent username |
| Password | String | Y | 20 | Agent password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Unique session ID |
| DocumentType | String | Y | 10 | Document Type ID from GetStaticData (`WSST-ADOV1`) |
| ReferenceId | String | Y | 10 | Reference ID from CSPRegistration or CheckCSP response |
| DocumentData | String | Y | 2 MB | Document content in **Base64 encoded string** |
| DocumentFormat | String | Y | 10 | File format: `pdf`, `jpg`, `jpeg`, or `png` (no dot, no uppercase) |

> ⚠️ **Note:** Max file size is **2 MB**. Encode the file to Base64 before sending.

---

### 7.3 Check CSP

**Method Name:** `CheckCSP`

Use this to check the current registration status of a CSP and which documents have been uploaded.

#### Request Parameters (same as credentials only)

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Agent access code |
| UserName | String | Y | 20 | Agent username |
| Password | String | Y | 20 | Agent password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Unique session ID |

Response format is same as CSP Registration response.

---

### 7.4 Balance Inquiry

**Method Name:** `BalanceInquiry`

Check the current wallet/account balance of your agent account.

#### Request Parameters (same as credentials only)

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Agent access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Unique session ID |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| Message | Success or Error |
| AgentSessionId | Your session ID |
| Balance | **Current balance amount** in your agent account |

---

## 8. Customer Module

### What is a Customer?
A **Customer** is the person in India who wants to send money to Nepal. They must be registered in the IME system before a transaction can be created.

### Customer Module Response Codes

| Code | Message |
|------|---------|
| `503` | Parameter Missing |
| `504` | Bad Request (Invalid Input Value) |

---

### 8.1 Customer Registration

**Method Name:** `CustomerRegistration`

Registers a new sending customer.

> 🔄 **Flow:** CustomerRegistration → SendOTP → ConfirmCustomerRegistration

#### Request XML

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ime="IME">
  <soapenv:Header/>
  <soapenv:Body>
    <ime:CustomerRegistration>
      <ime:RegisterCustomerRequest>
        <ime:Credentials>
          <ime:AccessCode>string</ime:AccessCode>
          <ime:UserName>string</ime:UserName>
          <ime:Password>string</ime:Password>
          <ime:PartnerBranchId>string</ime:PartnerBranchId>
          <ime:AgentSessionId>string</ime:AgentSessionId>
        </ime:Credentials>
        <ime:CustomerDetails>
          <ime:MobileNo>string</ime:MobileNo>
          <ime:FirstName>string</ime:FirstName>
          <ime:MiddleName>string</ime:MiddleName>
          <ime:LastName>string</ime:LastName>
          <ime:Nationality>string</ime:Nationality>
          <ime:MaritalStatus>string</ime:MaritalStatus>
          <ime:DOB>string</ime:DOB>
          <ime:Gender>string</ime:Gender>
          <ime:FatherOrMotherName>string</ime:FatherOrMotherName>
          <ime:Occupation>string</ime:Occupation>
          <ime:SourceOfFund>string</ime:SourceOfFund>
        </ime:CustomerDetails>
        <ime:PermanentAddresss>
          <ime:State>string</ime:State>
          <ime:District>string</ime:District>
          <ime:Municipality>string</ime:Municipality>
          <ime:Address>string</ime:Address>
          <ime:WardNo>string</ime:WardNo>
          <ime:HouseNo>string</ime:HouseNo>
        </ime:PermanentAddresss>
        <ime:TemporaryAddress>
          <ime:State>string</ime:State>
          <ime:District>string</ime:District>
          <ime:Address>string</ime:Address>
          <ime:PostalCode>string</ime:PostalCode>
          <ime:HouseNo>string</ime:HouseNo>
        </ime:TemporaryAddress>
        <ime:IdentityDetails>
          <ime:IdType>string</ime:IdType>
          <ime:IdNo>string</ime:IdNo>
          <ime:IdPlaceOfIssue>string</ime:IdPlaceOfIssue>
          <ime:IssueDate>string</ime:IssueDate>
          <ime:IdData>string</ime:IdData>
          <ime:IdDataType>string</ime:IdDataType>
        </ime:IdentityDetails>
      </ime:RegisterCustomerRequest>
    </ime:CustomerRegistration>
  </soapenv:Body>
</soapenv:Envelope>
```

#### CustomerDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| MobileNo | String | Y | 15 | Customer's mobile number |
| MembershipId | String | N | 10 | IME Forex Membership ID (if customer already has one) |
| FirstName | String | Y | 20 | First name |
| MiddleName | String | N | 20 | Middle name |
| LastName | String | Y | 20 | Last name |
| Nationality | String | Y | 3 | Country ID from GetStaticData (`WSST-CONV1`) |
| MaritalStatus | String | Y | 10 | Marital Status ID from GetStaticData (`WSST-MSSV1`) |
| DOB | Date | Y | 20 | Date of Birth: `YYYY/MM/DD` |
| Gender | String | Y | 10 | Gender ID from GetStaticData (`WSST-GDRV1`) |
| FatherOrMotherName | String | Y | 50 | Father's or Mother's full name |
| Email | String | N | 30 | Email address |
| Occupation | String | Y | 10 | Occupation ID from GetStaticData (`WSST-OCPV1`) |
| SourceOfFund | String | N | 10 | Source of Fund ID from GetStaticData (`WSST-SOFV1`) |

#### PermanentAddress Parameters

| Parameter | Type | Mandatory | Notes |
|-----------|------|-----------|-------|
| State | String | Y | State ID per customer's Nationality country |
| District | String | Y | District ID per State |
| Municipality | String | N | **Mandatory if Nationality = NPL (Nepal)** |
| Address | String | Y | Max 50 chars |
| WardNo | String | N | Ward number |
| HouseNo | String | N | House number |

#### TemporaryAddress Parameters (India address where customer currently lives)

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| State | String | Y | 10 | India State ID |
| District | String | Y | 10 | India District ID |
| Address | String | Y | 50 | Temporary address |
| PostalCode | String | N | 20 | Postal code |
| HouseNo | String | N | 20 | House number |

#### IdentityDetails Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| IdType | String | Y | 10 | ID type from GetStaticData (`WSST-IDTV1`) |
| IdNo | String | Y | 20 | The actual ID number |
| IDPlaceofIssue | String | N | 10 | **Mandatory if Nationality = NPL**; Place of Issue ID from GetStaticData |
| IssueDate | Date | Y | 20 | Format: `YYYY/MM/DD` |
| ExpiryDate | Date | N | 20 | **Mandatory if the ID document has an expiry date** |
| IdNoCitizenship | String | Conditional | 20 | **Mandatory if NPL nationality AND ID is not Citizenship** |
| IdIssuePlaceCitizenship | String | Conditional | 10 | Nepal ID issue place |
| IdIssueDateCitizenship | Date | Conditional | 20 | Citizenship issue date |
| PhotoData | String | N | 500KB | Customer photo in Base64 |
| PhotoDataType | String | N | 5 | `pdf`, `jpg`, `jpeg`, or `png` |
| IdData | String | Y | 500KB | ID document image in Base64 |
| IdDataType | String | Y | 5 | `pdf`, `jpg`, `jpeg`, or `png` |

#### CustomerRegistration Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| Message | Success or Error |
| AgentSessionId | Your session ID |
| CustomerToken | **Save this!** You need it in ConfirmCustomerRegistration |

---

### 8.2 Send OTP

**Method Name:** `SendOTP`

Sends an OTP (One-Time Password) to the customer's mobile. Used in multiple flows.

> 💡 The same `SendOTP` method is used for Customer Registration, Send Transaction, Modify Transaction, and Cancel Transaction. The `Module` field tells it which flow you're in.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Agent access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Unique session ID |
| Module | String | Y | 2 | Which flow: `CR` / `ST` / `MT` / `CT` |
| ReferenceValue | String | Y | 20 | Reference number from that flow |

**Module Values Explained:**

| Module | Meaning | ReferenceValue to Pass |
|--------|---------|----------------------|
| `CR` | Customer Registration | CustomerToken from `CustomerRegistration` |
| `ST` | Send Transaction | RefNo from `SendTransaction` |
| `MT` | Modify Transaction | ICN from `ConfirmSendTransaction` |
| `CT` | Cancel Transaction | ICN from `ConfirmSendTransaction` |

#### SendOTP Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| Message | Success or Error |
| AgentSessionId | Your session ID |
| OTPToken | **Save this!** You need it in the Confirm step. |

---

### 8.3 Confirm Customer Registration

**Method Name:** `ConfirmCustomerRegistration`

Verifies the OTP to complete customer registration.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| OTP | String | Y | 6 | The 6-digit OTP the customer received |
| CustomerToken | String | Y | 15 | Token from `CustomerRegistration` response |
| OTPToken | String | Y | 100 | Token from `SendOTP` response |

---

### 8.4 Check Customer

**Method Name:** `CheckCustomer`

Check if a customer is registered and eligible to send money.

> 💡 **Always call this before creating a transaction** to verify the customer exists and is KYC-approved.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| MobileNo | String | Y | 10 | Customer's mobile number |

#### CheckCustomer Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| Message | Success or Error |
| Name | Customer's name |
| MobileNo | Customer's mobile |
| AMLStatus | `True` = Eligible for transactions, `False` = NOT eligible |
| KYCStatus | `Approved` / `Pending` / `Rejected` |
| RejectedReason | Reason for rejection (if KYCStatus = Rejected) |
| NewMobileNo | If customer's mobile was changed |
| AmendmentStatus | `Pending` / `Approved` / `Rejected` |
| AmendmentMessage | Message about amendment status |

> ⚠️ **Only proceed with transaction if AMLStatus = True AND KYCStatus = Approved**

---

## 9. Transaction Flow

### Transaction Response Codes

| Code | Message |
|------|---------|
| `103` | Required Field |
| `104` | Bad Request |
| `105` | Setup Required |
| `106` | Limit/Balance Expired or Not Enough |
| `107` | Forex ID expired or Already Used |

### Complete Transaction Journey

```
1. CheckCustomer           → Verify sender is eligible
2. GetCalculation          → Get exchange rate + get ForexSessionId
3. SendTransaction         → Create the transaction (uses ForexSessionId)
4. SendOTP (Module=ST)     → Send OTP to customer
5. ConfirmSendTransaction  → Confirm with OTP → Get ICN (the payout code)
```

---

### 9.1 Get Exchange Rate and Service Charge

**Method Name:** `GetCalculation`

Call this to get the current exchange rate and service charges. The `ForexSessionId` returned **must** be used immediately in `SendTransaction`.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| PayoutAgentId | String | N | 10 | Bank ID from GetStaticData — **Mandatory if PaymentType = B (Bank)** |
| RemitAmount | String | Y | 20 | Amount for calculation (in INR) |
| PaymentType | String | Y | 10 | `C` = Cash payment in Nepal, `B` = Bank deposit in Nepal |
| PayoutCountry | String | Y | 15 | Always `NPL` (Nepal) |
| CalcBy | String | Y | 3 | `C` = you entered Collection Amount, `P` = you entered Payout Amount |

#### GetCalculation Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| ForexSessionId | **Critical! Save this and use in SendTransaction immediately.** |
| CollectAmount | Total to collect from sender (includes service charge) |
| ServiceCharge | The service charge in INR |
| ExchangeRate | Current INR to NPR exchange rate |
| PayoutAmount | Amount the receiver gets in Nepal (in NPR) |
| PayoutCurrency | Currency of payout (NPR) |

---

### 9.2 Send Transaction

**Method Name:** `SendTransaction`

Creates a new money transfer transaction.

> ⚠️ The `ForexSessionId` from `GetCalculation` expires quickly. Use it immediately.

#### Request Parameters

**Credentials:** (standard 5 fields)

**Sender Details:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| SenderName | String | Y | 100 | Sender's full name |
| SenderMobileNo | String | Y | 15 | Registered customer mobile (verify via CheckCustomer) |
| Occupation | String | Y | 10 | Occupation ID from GetStaticData |

**Receiver Details:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| ReceiverName | String | Y | 100 | Receiver full name in Nepal |
| ReceiverAddress | String | Y | 100 | Receiver address |
| ReceiverGender | String | Y | 15 | Receiver gender |
| ReceiverMobileNo | String | Y | 15 | Receiver mobile number in Nepal |
| ReceiverCity | String | N | 30 | Receiver's city (optional) |
| ReceiverCountry | String | Y | 3 | Always `NPL` |
| ReceiverState | String | Y | 10 | Receiver State ID from GetStaticData |
| ReceiverDistrict | String | Y | 10 | Receiver District ID |
| ReceiverMunicipality | String | Y | 10 | Receiver Municipality ID |

**Transaction Details:**

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| ForexSessionId | String | Y | 10 | From `GetCalculation` response — **must be unique each transaction** |
| AgentTxnRefId | String | Y | 20 | Your own unique transaction reference ID |
| CollectAmount | String | Y | 20 | Amount collected from sender including service charge |
| PayoutAmount | String | Y | 20 | Amount to be paid in Nepal |
| SourceOfFund | String | Y | 10 | Source of Fund ID |
| Relationship | String | Y | 10 | Relationship ID from GetStaticData (`WSST-RELV1`) |
| PurposeOfRemittance | String | Y | 10 | Purpose ID from GetStaticData (`WSST-PORV1`) |
| PaymentType | String | Y | 3 | `C` = Cash, `B` = Bank Deposit |
| BankId | String | If Bank | 10 | Bank ID — **mandatory if PaymentType = B** |
| BankBranchId | String | If Bank | 100 | Bank Branch ID — **mandatory if PaymentType = B** |
| BankAccountNumber | String | If Bank | 30 | Beneficiary account — **mandatory if PaymentType = B** |
| CalcBy | String | Y | 3 | `C` = Collection Amount, `P` = Payout Amount |

#### SendTransaction Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| RefNo | **Save this!** Reference number for OTP confirmation |
| AgentTxnRefId | Your reference ID (echoed back) |
| CollectAmount | Amount to collect |
| ServiceCharge | Service charge |
| ExchangeRate | Exchange rate |
| PayoutAmount | Payout amount in Nepal |
| PayoutCurrency | Payout currency (NPR) |

---

### 9.3 Confirm Send Transaction

**Method Name:** `ConfirmSendTransaction`

Called after OTP is sent to the customer. This finalizes the transaction.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| RefNo | String | Y | 20 | Reference number from `SendTransaction` |
| OTPToken | String | Y | 100 | Token from `SendOTP` |
| OTP | String | Y | 6 | OTP entered by customer |

#### ConfirmSendTransaction Response Parameters

| Field | Description |
|-------|-------------|
| RefNo | **This is the ICN (International Control Number)** — give this to the customer/beneficiary to collect cash in Nepal |
| AgentTxnRefId | Your transaction reference |
| CollectAmount | Total collected |
| ServiceCharge | Service charge |
| ExchangeRate | Exchange rate |
| PayoutAmount | Payout in Nepal |
| PayoutCurrency | Payout currency |

> 💡 **ICN (RefNo from ConfirmSendTransaction):** The beneficiary in Nepal must provide this number at the payout location to receive money. It expires in **7 days** per RBI guidelines.

---

### 9.4 Transaction Inquiry

**Method Name:** `TransactionInquiry`

Look up the status and details of any transaction.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode–AgentSessionId | — | Y | — | Standard credentials |
| RefNoType | String | Y | 1 | `1` = IME ICN number, `2` = Your AgentTxnRefId |
| RefNo | String | Y | 20 | The reference number (per RefNoType) |

#### TransactionInquiry Response — All Fields

| Field | Description |
|-------|-------------|
| RefNo | ICN (unique control number) |
| SenderName | Sender's name |
| SenderGender | Sender's gender |
| SenderCountry | Sender's country |
| SenderMobileNo | Sender's mobile |
| SenderIdType | Sender's ID type |
| SenderEmail | Sender's email |
| ReceiverName | Receiver's name |
| ReceiverGender | Receiver's gender |
| ReceiverCountry | Receiver's country |
| ReceiverAddress | Receiver's address |
| ReceiverMobileNo | Receiver's mobile |
| ReceiverRelationWithSender | Relationship to sender |
| TransferAmount | Transfer amount (without service charge) |
| ServiceCharge | Service charge |
| CollectedAmount | Total collected from sender |
| ExchangeRate | Exchange rate applied |
| PayoutAmount | Amount paid/to be paid in Nepal |
| PayoutCurrency | Payout currency |
| SendingBranch | Agent branch that created the transaction |
| PaymentMethod | Cash or Bank |
| PurposeOfRemit | Purpose of remittance |
| SourceOfFund | Source of funds |
| TransactionDate | When transaction was created |
| Status | Current transaction status |
| PaidDate | When it was paid (if paid) |
| CancelDate | When cancelled (if cancelled) |
| CancelCharge | Cancellation charge (if cancelled) |

---

### 9.5 Modify Transaction

**Method Name:** `AmendmentTransaction`

Modify receiver details or other information in an existing transaction.

> 🔄 **Flow:** TransactionInquiry → SendOTP (Module=MT) → AmendmentTransaction

#### Request Parameters (in addition to credentials)

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| RefNo | String | Y | 20 | ICN from ConfirmSendTransaction |
| ReceiverName | String | At least one field required | 50 | New receiver name |
| ReceiverGender | String | — | 10 | New gender |
| ReceiverAddress | String | — | 30 | New address |
| RelationWithSender | String | — | 10 | New relationship ID |
| PurposeOfRemittance | String | — | 10 | New purpose ID |
| SourceOfFund | String | — | 10 | New source of fund ID |
| ReceiverMobileNo | String | — | 15 | New mobile number |
| BankId | String | — | 100 | New bank ID |
| BankBranchId | String | — | 10 | New bank branch ID |
| AccountNo | String | — | 20 | New account number |
| OTP | String | Y | 6 | OTP from sender |
| OTPToken | String | Y | 100 | Token from SendOTP |

---

### 9.6 Cancel Transaction

**Method Name:** `CancelTransaction`

> 🔄 **Flow:** TransactionInquiry → SendOTP (Module=CT) → CancelTransaction

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode–AgentSessionId | — | Y | — | Standard credentials |
| RefNo | String | Y | 20 | ICN of transaction to cancel |
| CancelReason | String | Y | 10 | Cancel Reason ID from GetStaticData (`WSST-TCRV1`) |
| OTP | String | Y | 6 | OTP from sender |
| OTPToken | String | Y | 100 | Token from SendOTP |

#### CancelTransaction Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success |
| RefId | ICN that was cancelled |
| CollectedAmount | Original collected amount |
| ExchangeRate | Exchange rate |
| ServiceCharge | Service charge (may be deducted from refund) |
| PayoutAmount | Payout amount |
| PayoutCurrency | Currency |

---

## 10. Reports

### 10.1 Reconcile Report

**Method Name:** `ReconcileReport`

Get a list of all transactions within a date range.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode–AgentSessionId | — | Y | — | Standard credentials |
| ReportType | String | Y | 1 | `A` = All, `S` = Sent Only, `C` = Cancel Only |
| FromDate | Date | Y | 20 | Start date: `YYYY/MM/DD` |
| ToDate | Date | Y | 20 | End date: `YYYY/MM/DD` |

#### Response Fields (one entry per transaction)

| Field | Description |
|-------|-------------|
| RefNo | ICN |
| AgentTxnRefId | Your reference ID |
| SenderName | Sender name |
| ReceiverName | Receiver name |
| ReceiverCountry | Receiver country |
| ServiceCharge | Service charge |
| ServiceChargeCurrency | Service charge currency |
| CollectedAmount | Collected amount |
| CollectedAmountCurrency | Collection currency |
| PayoutAmount | Payout amount |
| PayoutCurrency | Payout currency |
| SendingAgent | Agent name |
| SendingBranch | Branch name |
| TransactionDate | Transaction date |
| Status | Current status |
| PaidDate | Paid date (if paid) |
| PayoutAgent | Paying agent in Nepal |
| CancelDate | Cancel date (if cancelled) |
| CancelCharge | Cancel charge |

---

### 10.2 Statement of Account (SOA)

**Method Name:** `SOAReport`

Get a credit/debit statement of your agent account.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode–AgentSessionId | — | Y | — | Standard credentials |
| FromDate | Date | Y | 20 | Start date: `YYYY/MM/DD` |
| ToDate | Date | Y | 20 | End date: `YYYY/MM/DD` |

#### Response Fields

| Field | Description |
|-------|-------------|
| Date | Date of entry |
| Particulars | Description of the entry |
| DR | Debit amount (money going out of your account) |
| CR | Credit amount (money coming into your account) |
| Balance | Balance after this entry |
| Indicator | `DR` = Debit or `CR` = Credit |
| Narration | Additional remarks |

---

## 11. Phase 2 — Aadhar Entity Reprocess

**Method Name:** `AadharEntityReprocess`
**Document Version:** 1.2 | April 8, 2020

### What is this?
This method is used to clear/reset the Aadhar KYC process for a CSP or Customer that was previously enrolled via Aadhar but needs to restart the process.

### Request XML

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ime="IME">
  <soap:Header/>
  <soap:Body>
    <ime:AadharEntityReprocess>
      <ime:AadharEntityReprocessRequest>
        <ime:Credentials>
          <ime:AccessCode>string</ime:AccessCode>
          <ime:UserName>string</ime:UserName>
          <ime:Password>string</ime:Password>
          <ime:PartnerBranchId>string</ime:PartnerBranchId>
          <ime:AgentSessionId>string</ime:AgentSessionId>
        </ime:Credentials>
        <ime:EntityType>string</ime:EntityType>
        <ime:EntityId>string</ime:EntityId>
        <ime:ReprocessState>string</ime:ReprocessState>
      </ime:AadharEntityReprocessRequest>
    </ime:AadharEntityReprocess>
  </soap:Body>
</soap:Envelope>
```

### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Agent access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner Branch ID or CSP Code |
| AgentSessionId | String | Y | 30 | Unique session ID |
| EntityType | String | Y | 10 | `201` = CSP, `203` = Customer |
| EntityId | String | Y | 20 | For CSP: Partner Branch ID. For Customer: Mobile Number |
| ReProcessState | String | Y | — | Value from GetStaticData where TYPE CODE = `WSST-AERV1` |

### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 = Success, otherwise error code |
| Message | Success or Error message |
| AgentSessionId | Your session ID |

---

## 12. Phase 2 — eKYC via Aadhar (RBL)

**Document:** IME India — CSP and Customer Registration through RBL
**Version:** 1.1 | June 6, 2025

### What is eKYC?
eKYC (electronic Know Your Customer) is a digital process to verify a person's identity using their Aadhaar number and biometric data, without physical documents.

> ⚠️ **These are REST/POST endpoints**, not SOAP. The same credential fields apply.

### All eKYC Methods

| S.N. | Method | Endpoint | Description |
|------|--------|----------|-------------|
| 1 | GetStaticData | — | Same as Phase 1 |
| 2 | GetUniqueId | `/UniqueIdentifier` | Get unique ID after Aadhaar validation |
| 3 | GenerateOTT | `/GenerateOTT` | Generate One-Time Token |
| 4 | BioKyc | `/BioKyc` | Process biometric fingerprint data |
| 5 | CSPOnboarding | `/CSPOnboarding` | Complete CSP registration after KYC |
| 6 | CSPConsent | `/CSPConsent` | Register CSP and sync status |
| 7 | CheckEntityStatus | `/CheckEntityStatus` | Check current onboarding stage |
| 8 | AadharCustomerRegistration | — | Register customer via Aadhaar |
| 9 | SendOTP | — | Same as Phase 1 |
| 10 | CustomerOnboarding | `/CustomerOnboarding` | Complete customer registration after KYC |
| 11 | CustomerRequery | `/CustomerRequery` | Get full customer details |

---

### 12.1 CSP Registration Flow (eKYC)

```
1. GenerateOTT       → Get a URL with OTT
2. (User opens URL)  → Enters Aadhaar, validates it
3. GetUniqueId       → Retrieve the unique identifier
4. BioKyc            → Capture and submit biometric data
5. CSPOnboarding     → Submit bank/financial details
6. (Open OTP Consent URL if PanValidationStatus = Success)
7. CSPConsent        → Register and sync status
8. CheckEntityStatus → Poll until onboarding is complete
```

---

### 12.2 GenerateOTT

**Method:** POST | **Endpoint:** `/GenerateOTT`

Generates a One-Time Token and returns a URL. The CSP/customer must open this URL on a device with geo-location enabled to enter their Aadhaar number.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | `201` = CSP, `203` = Customer |
| EntityId | String | Y | 30 | For CSP: Partner Branch ID. For Customer: Mobile Number |
| OTPToken | String | N | 100 | **Required only if EntityType = 203 (Customer)** |
| OTP | String | N | 4 | **Required only if EntityType = 203 (Customer)** |
| Owner | String | Y | 10 | Owner information |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | Status of OTT generation |
| Url | **URL to open in browser** — user must open this and enter Aadhaar (geo-location required) |

---

### 12.3 Get Unique ID

**Method:** POST | **Endpoint:** `/UniqueIdentifier`

Called after the user has opened the OTT URL and completed Aadhaar number entry.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | `201` = CSP, `203` = Customer |
| EntityId | String | Y | 30 | Partner Branch ID (CSP) or Mobile Number (Customer) |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | `RBLUnique Identifier` (when successful) |

---

### 12.4 Bio KYC

**Method:** POST | **Endpoint:** `/BioKyc`

Submits biometric fingerprint data for KYC verification.

> 💡 The `Pid` field is a Base64-encoded XML string generated by a biometric fingerprint device.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | `201` = CSP, `203` = Customer |
| EntityId | String | Y | 30 | Partner Branch ID or Mobile Number |
| Pid | String | Y | — | **Base64 encoded PID XML** from biometric device |

#### Bio KYC Response Codes

| Code | Message | What to Do |
|------|---------|------------|
| `0` | Success | Proceed to next step |
| `102` | Re-initiated | Start again from GenerateOTT |
| `504` | Invalid Entity Type | Fix EntityType value |
| `504` | Three attempts done. Please Contact HO. | Contact IME HQ to reset |
| `504` | Invalid Pid Data | Bad biometric data — retry scan |
| `999` | Internal Server Error | Retry or contact support |

**Important Decision Logic:**
- Response code = `0` → Proceed to CSPOnboarding or CustomerOnboarding
- Response code = `102` → Start from GenerateOTT again
- Response message contains "Three attempts done" → Contact IME Head Office

---

### 12.5 CSP Onboarding

**Method:** POST | **Endpoint:** `/CSPOnboarding`

Submit additional details to complete CSP registration after KYC.

#### Request Parameters (additional to credentials + EntityId)

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| Accountnumber | String | Y | 30 | Agent's bank account number |
| AgentAccountName | String | Y | 100 | Name on the bank account |
| Ifsccode | String | Y | 100 | Bank IFSC code |
| Bankname | String | Y | 100 | Bank name |
| Branchname | String | Y | 100 | Bank branch name |
| Institutename | String | Y | 100 | Educational institution name |
| Dateofpassing | String | Y | — | Format: `YYYY/MM/DD` |
| Nooftransactionperday | String | Y | 10 | Expected daily transaction count |
| Transferamountperday | String | Y | 10 | Expected daily transfer amount |
| Settlementdays | String | Y | 10 | Settlement period in days |
| Expectedannualturnover | String | Y | 10 | Expected annual turnover |
| Expectedannualincome | String | Y | 10 | Expected annual income |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | `CSPOnboarding` |
| PanValidationStatus | `Success` OR `Name not matched, Verification pending with OPS` |

**After CSPOnboarding, check PanValidationStatus:**
- `Success` → Open OTP Consent URL → After OTP → call CSPConsent
- `Name not matched...` → Skip OTP Consent URL → Call CSPConsent directly and wait

---

### 12.6 CSP Consent

**Method:** POST | **Endpoint:** `/CSPConsent`

Final step to register CSP and sync with RBL.

#### Request Parameters

| Parameter | Type | Mandatory | Description |
|-----------|------|-----------|-------------|
| AccessCode–AgentSessionId | — | Y | Standard credentials |
| EntityId | String | Y | CSP Partner Branch ID |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| PanValidationStatus | Name match status |
| BankApprovalStatus | Numeric status (see table below) |
| Remarks | Human-readable status message |

**BankApprovalStatus Values:**

| Status | Meaning | Action |
|--------|---------|--------|
| `0` | Pending | Wait and poll |
| `1` | On Process | Wait |
| `2` | Details Required | Upload additional details |
| `3` | Hold | Contact IME |
| `4` | Validation Completed | Near done |
| `5` | Document Uploaded | Documents received |
| `6` + "Agent(eKYC)" | ✅ Approved | Done! CSP is active |
| `6` + "Verification pending with RBL OPS" | Under review | Wait up to 24 hrs |
| `6` + "Approved By RBLOPS" | ✅ Approved | Done! |
| `7` | Rejected by RBL OPS | Upload documents manually |
| `8` | Blocked | Contact IME |
| `9` | CP Approved List | — |
| `10` | Re-Upload | Re-upload documents |
| `11` | Bank Maker Verified | In progress |

---

### 12.7 Check Entity Status

**Method:** POST | **Endpoint:** `/CheckEntityStatus`

Check the current stage in the onboarding process.

#### Request Parameters

| Parameter | Type | Mandatory | Description |
|-----------|------|-----------|-------------|
| AccessCode–AgentSessionId | — | Y | Standard credentials |
| EntityType | String | Y | `201` = CSP, `203` = Customer |
| EntityId | String | Y | Partner Branch ID or Mobile Number |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| Status | Current onboarding status |
| IsEligibleForTxn | `Y` = Can do transactions, `N` = Cannot yet |

---

### 12.8 Aadhar Customer Registration

**Method Name:** `AadharCustomerRegistration`

Register a customer using their Aadhaar number (instead of the manual Phase 1 registration).

#### Sample Request XML

```xml
<RegisterAadharCustomerRequest>
  <Credentials>
    <AccessCode>IMEIN14665</AccessCode>
    <UserName>thapa</UserName>
    <Password>xxxxx</Password>
    <PartnerBranchId>IMEIN14665</PartnerBranchId>
    <AgentSessionId>235842</AgentSessionId>
  </Credentials>
  <CustomerDetails>
    <MobileNo>9311828883</MobileNo>
    <FullName>Simpal Agrahari</FullName>
    <MaritalStatus>1902</MaritalStatus>
    <DOB>1995/07/22</DOB>
    <Gender>1802</Gender>
    <Email>simpal@test.com</Email>
    <Occupation>8081</Occupation>
    <SourceOfFund>8051</SourceOfFund>
    <EstimatedAnnualIncome>6</EstimatedAnnualIncome>
  </CustomerDetails>
  <IdentityDetails>
    <AadharNo>707139067873</AadharNo>
  </IdentityDetails>
  <AddressDetails>
    <Country>104</Country>
    <State>1041</State>
    <District>5705</District>
    <PinCode>201301</PinCode>
    <Address>Sector 55 Noida D Block 106</Address>
  </AddressDetails>
</RegisterAadharCustomerRequest>
```

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| FullName | String | Y | 100 | Customer's full name |
| MaritalStatus | String | Y | 10 | Marital Status ID |
| DOB | String | Y | 10 | Format: `YYYY/MM/DD` |
| Occupation | String | Y | 10 | Occupation ID |
| Email | String | Y | 30 | Valid email (required) |
| MobileNo | String | Y | 10 | Exactly 10 digits |
| Gender | String | Y | 10 | Gender ID |
| SourceOfFund | String | Y | 10 | Source of Fund ID |
| EstimatedAnnualIncome | String | Y | 10 | Annual Income ID from `WSST-CAIV1` |
| Country | String | Y | 10 | Country ID |
| State | String | Y | 10 | State ID |
| District | String | Y | 10 | District ID |
| Address | String | Y | 100 | Full address text |
| PinCode | String | Y | 30 | Valid PIN code |
| AadharNo | String | Y | 12 | Valid 12-digit Aadhaar number |
| PhotoData | String | N | 500KB | Base64 photo (optional) |
| PhotoDataType | String | N | 5 | `pdf`, `jpg`, `jpeg`, `png` |
| IdData | String | N | 500KB | Base64 ID image (optional) |
| IdDataType | String | N | 5 | `pdf`, `jpg`, `jpeg`, `png` |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 = Success |
| Message | Response message |
| CustomerToken | **Save this!** Token for confirm step |

---

### 12.9 Customer Onboarding (eKYC)

**Method:** POST | **Endpoint:** `/CustomerOnboarding`

Final step after biometric KYC for customer registration.

Request: Standard credentials + `EntityId` = Customer Mobile Number.
Response Status: `CustomerOnboarding`

---

### 12.10 Customer Requery

**Method:** POST | **Endpoint:** `/CustomerRequery`

Retrieves comprehensive customer information.

Request: Same as Customer Onboarding.
Response Status: `Success`

---

## 13. Master Data — All Static IDs

> These values come from the `Master_Data_India_Updated.xlsx` file. You can also fetch live values via `GetStaticData`.

### Gender List (`WSST-GDRV1`)

| ID | Name |
|----|------|
| 1801 | Male |
| 1802 | Female |
| 1803 | Third |

### Marital Status List (`WSST-MSSV1`)

| ID | Name |
|----|------|
| 1901 | Married |
| 1902 | UnMarried |

### Occupation List (`WSST-OCPV1`)

| ID | Name |
|----|------|
| 8080 | Businessman |
| 8081 | Salaried |
| 8082 | Self Employed |
| 8083 | Retiree |
| 8084 | Student |
| 8085 | Housewife |
| 8086 | Armed Police Personnel (Police, Army etc.) |
| 8087 | Government Employee |
| 8088 | Professional Worker (farmer, teacher, engineer, doctor, lawyer etc.) |
| 8089 | Unemployed |

### Source of Fund List (`WSST-SOFV1`)

| ID | Name |
|----|------|
| 8051 | Salary |
| 8052 | Business |
| 8070 | Salary / Wages |
| 8071 | Bonus / Commission |
| 8073 | Savings or Accumulated |
| 8074 | Part Time Job |
| 8075 | Own Business |
| 8076 | Investment |
| 8077 | Lottery |
| 8078 | Gifts and Donation |
| 8079 | Loan from Bank |

### ID Type List — Nepal (`WSST-IDTV1` with ReferenceValue=NPL)

| ID | Name |
|----|------|
| 1301 | Citizenship |
| 1302 | Passport |

### Place of Issue List — Nepal (`WSST-POIV1`) — All 77 Districts

| ID | District | ID | District | ID | District |
|----|----------|----|----------|----|----------|
| 5001 | Ilam | 5026 | Kavrepalanchok | 5053 | Bardiya |
| 5002 | Jhapa | 5027 | Lalitpur | 5054 | Dailekh |
| 5003 | Panchthar | 5028 | Nuwakot | 5055 | Jajarkot |
| 5004 | Taplejung | 5029 | Rasuwa | 5056 | Surkhet |
| 5005 | Bhojpur | 5030 | Sindhupalchok | 5057 | Achham |
| 5006 | Dhankuta | 5031 | Gorkha | 5058 | Bajhang |
| 5007 | Morang | 5032 | Kaski | 5059 | Bajura |
| 5008 | Sankhuwasabha | 5033 | Lamjung | 5060 | Doti |
| 5009 | Sunsari | 5034 | Manang | 5061 | Kailali |
| 5010 | Terhathum | 5035 | Syangja | 5062 | Baglung |
| 5011 | Khotang | 5036 | Tanahu | 5063 | Mustang |
| 5012 | Okhaldhunga | 5037 | Bara | 5064 | Myagdi |
| 5013 | Saptari | 5038 | Chitawan | 5065 | Parbat |
| 5014 | Siraha | 5039 | Makwanpur | 5066 | Arghakhanchi |
| 5015 | Solukhumbu | 5040 | Parsa | 5067 | Gulmi |
| 5016 | Udayapur | 5041 | Rautahat | 5068 | Kapilvastu |
| 5017 | Dhanusa | 5042 | Dolpa | 5069 | Nawalparasi |
| 5018 | Dolakha | 5043 | Humla | 5070 | Palpa |
| 5019 | Mahottari | 5044 | Jumla | 5071 | Rupandehi |
| 5020 | Ramechhap | 5045 | Kalikot | 5072 | Baitadi |
| 5021 | Sarlahi | 5046 | Mugu | 5073 | Dadeldhura |
| 5022 | Sindhuli | 5047 | Dang | 5074 | Darchula |
| 5023 | Bhaktapur | 5048 | Pyuthan | 5075 | Kanchanpur |
| 5024 | Dhading | 5049 | Rolpa | 5076 | Rukum West |
| 5025 | Kathmandu | 5050 | Rukum | 5077 | Nawalparasi West |
| — | — | 5051 | Salyan | — | — |
| — | — | 5052 | Banke | — | — |

### Relationship List (`WSST-RELV1`)

| ID | Name | ID | Name |
|----|------|----|------|
| 2101 | Father | 2112 | Sister in Law |
| 2102 | Mother | 2113 | Son |
| 2103 | Grand Father | 2114 | Daughter |
| 2104 | Grand Mother | 2115 | Uncle |
| 2105 | Husband | 2116 | Aunty |
| 2106 | Wife | 2117 | Cousin |
| 2107 | Father in Law | 2118 | Nephew |
| 2108 | Mother in Law | 2119 | Niece |
| 2109 | Brother | 2121 | Self |
| 2110 | Brother in Law | 8011 | Spouse |
| 2111 | Sister | — | — |

### Purpose of Remittance List (`WSST-PORV1`)

| ID | Name |
|----|------|
| 3801 | Family Maintenance |

### Cancel Reason List (`WSST-TCRV1`)

| ID | Name |
|----|------|
| 7701 | Sender Has Cancel by themselves |
| 7703 | Remittance Amount is wrong |
| 7704 | Beneficiary is unable to collect the funds |

### CSP Registration Type List (`WSST-REGV1`)

| ID | Name |
|----|------|
| 4501 | Proprietorship Firm |
| 4502 | Partnership Firm |
| 15203 | Company |

### CSP Business Type List (`WSST-BUSV1`)

| ID | Name |
|----|------|
| 6200 | Remittance |
| 6201 | Commercial Bank |
| 6202 | Development Bank |
| 6203 | Finance |
| 6204 | Cooperative |
| 6205 | Travel Agency |
| 6206 | Cyber |

### CSP Address Proof Type List (`WSST-ADPV1`)

| ID | Name |
|----|------|
| 16901 | Establishment Certificate |
| 16902 | Business License |
| 16903 | Electricity Bill |
| 16904 | Telephone Bill |

### Bank Account Type List (`WSST-ACCV1`)

| ID | Name |
|----|------|
| 16201 | Current |
| 16202 | Personal |

### Device List (`WSST-DEVV1`)

| ID | Name |
|----|------|
| 16001 | Laptop/Desktop |
| 16002 | Handheld |

### Connectivity Type List (`WSST-CTVV1`)

| ID | Name |
|----|------|
| 16101 | Landline |
| 16102 | Mobile |
| 16103 | VSAT |

### Category List (`WSST-CATV1`) — Owner Category

| ID | Name |
|----|------|
| 16301 | GENERAL |
| 16302 | OBC |
| 16303 | SC |
| 16304 | ST |

### Physically Handicapped List (`WSST-PHCV1`)

| ID | Name |
|----|------|
| 16401 | Handicapped |
| 16402 | Not Handicapped |

### Alternate Occupation Type List (`WSST-AOCV1`)

| ID | Name |
|----|------|
| 16501 | Government |
| 16502 | Public Sector |
| 16503 | Self Employed |
| 16504 | Private |
| 16505 | Other |
| 16506 | None |

### Owner ID Type List (`WSST-OIDV1`)

| ID | Name |
|----|------|
| 16801 | Aadhaar Card |
| 16802 | Voters ID Card |
| 16803 | Driver License |
| 16804 | NREGA Card |
| 16805 | Passport |

### Educational Qualification List (`WSST-EDQV1`)

| ID | Name |
|----|------|
| 16601 | Under 10th |
| 16602 | 10th |
| 16603 | 12th |
| 16604 | Private |
| 16605 | Graduate |
| 16606 | Post Graduate |
| 16607 | Others |

### Additional Course List (`WSST-ADCV1`)

| ID | Name |
|----|------|
| 16701 | IIBF Advance |
| 16702 | IIBF Basic Certified By Bank |
| 16703 | None |

### Owners Address Proof List (`WSST-OAPV1`)

| ID | Name |
|----|------|
| 17101 | Aadhaar Card |
| 17102 | Voters ID Card |
| 17103 | Driver License |
| 17104 | NREGA Card |
| 17105 | Passport Number |

### Document Type List (`WSST-ADOV1`) — For Document Upload

| ID | Document Name | Notes |
|----|--------------|-------|
| 17001 | CompanyPANCard | Company PAN card |
| 17002 | CompanyEstablishmentCertificate | Business registration certificate |
| 17003 | CompanyAddressProof | Company address proof |
| 17004 | CompanyCancelledCheque | Cancelled cheque of company |
| 17005 | CSPForm | Filled CSP application form |
| 17006 | OwnersPANCard | Owner's PAN card |
| 17007 | OwnersAddressProof | Owner's address proof |
| 17008 | MOA | Memorandum of Association (for Company) |
| 17009 | AOA | Articles of Association (for Company) |
| 17010 | Board Resolution | Board resolution (for Company) |
| 17011 | Pan Card of the CA | CA's PAN card (for Company) |
| 17012 | Certificate of Incorporation | Incorporation certificate (for Company) |
| 17013 | KYC of Directors | Directors' KYC (for Company) |
| 17014 | KYC of authorized signatory | Authorized signatory's KYC |
| 17015 | Shareholding Pattern | Share structure (for Company) |

---

## 14. Terms and Conditions

Key points from the Indo-Nepal Money Transfer Service terms:

- The service is operated by **IME India Private Limited** (formerly IME Forex India Pvt Ltd) as per **RBI guidelines**.
- The customer is fully responsible for the accuracy of all details in the payment order.
- IME is **not responsible** for losses due to wrong customer-provided details.
- Once paid to the beneficiary, the transaction is **irrevocable** (cannot be undone).
- The **ICN/PIN** must only be disclosed to the intended beneficiary.
- Payment in Nepal follows **Nepal Rastra Bank guidelines**.
- Bank account credits happen within **1 working day (24 hours)**.
- Beneficiary must collect within **7 days** from transaction date (RBI guideline). After 7 days, the sender gets an SMS with OTP for a refund at the originating agent location (amount excluding charges).
- Jurisdiction: Courts at **Mumbai**.

---

*Document compiled from: Integration API Document v1.6 (Phase 1), AadharEntityReprocess Phase 2, API Integration for eKYC through Aadhar Phase 2, and Master_Data_India_Updated.xlsx*

*Generated: 2026 | IME India Private Limited | www.imeindia.com*
