# PRABHU MONEY TRANSFER — COMPLETE API & INTEGRATION DOCUMENTATION

> **Company:** Prabhu Money Transfer Private Limited  
> **Address:** Ground Floor, A-45, Metro Station Rd, near Sector-15, A Block, Sector 2, Noida, Uttar Pradesh 201301  
> **Phone:** +91-11-47084942 / 11-47084042 / 11-43550035 / 11-43553135  
> **E-Mail:** info@prabhumoneytransfer.co.in  
> **Web:** www.prabhumoneytransfer.co.in

---

## TABLE OF CONTENTS

1. [Partner Credentials & Configuration (SHUBHLAXMI)](#1-partner-credentials--configuration-shubhlaxmi)
2. [Token-Based CSP Onboarding API (v1.2)](#2-token-based-csp-onboarding-api-v12)
3. [Token-Based E-KYC API (v2.0)](#3-token-based-e-kyc-api-v20)
4. [CSP Onboarding Partner Flow Diagram](#4-csp-onboarding-partner-flow-diagram)
5. [Send API Document (v5.0)](#5-send-api-document-v50)
6. [Postman Environment](#6-postman-environment)

---

# 1. PARTNER CREDENTIALS & CONFIGURATION (SHUBHLAXMI)

> Source: SHUBHLAXMI_MULTI_SERVICES_INDIA_PRIVATE_LIMITED.xlsx

## Partner: MOBIFAST SOLUTIONS PRIVATE LIMITED

| Field | Value |
|-------|-------|
| IP Address | Partner needs to be shared with PMT |
| Landing Page | Partner needs to be shared with PMT |
| **APIKey** | `32127EE9-2A6C-4742-B9B6-D0263FE30E8E` |
| **EKYCPrefix** | `SHUD6` |
| **OnboardingPrefix** | `SHU90` |
| **AgentCode** | `993` |
| **API User Name** | `SHUBH_API` |
| **Password** | `Subhalaxmi#12345` |

---

## CSP Onboarding API Details

| API | Endpoint |
|-----|----------|
| **EKYA Base URL** | `https://ekyc-sandbox.prabhuindia.com/testkya` |
| Token Generation API | `/v1/auth/generatetoken` |
| E-KYA Initiate API | `/v1/csp/Initiate` |
| E-KYA Unique Ref Status | `/v1/csp/Uniquerefstatus` |
| E-KYA Enrollment API | `/v1/csp/Enrollment` |
| Bio-KYC Requery API | `/v1/csp/BioKYCRequery` |
| CSP Onboarding API | `/v1/csp/onboarding` |
| Search CSP API | `/v1/csp/SearchCSP` |
| Create CSP API | `/v1/csp/CreateCSP` |
| Agent Consent Status | `/v1/csp/AgentConsent` |
| CSP Mapping API | `/v1/csp/CSPMapping` |
| **OTP Consent URL** | `https://uiduat.rbl.bank.in/PrepaidCustomerLogin/PPIAgentEkyc.aspx?ref=YRZyRX9c9Kk0GwOMgSlXWg==` |

---

## Customer Onboarding API Details

| API | Endpoint |
|-----|----------|
| **EKYA Base URL** | `https://ekyc-sandbox.prabhuindia.com/test/v1` |
| Token Generation API | `/auth/generatetoken` |
| Initiate API | `/customer/ekycinitiate` |
| Unique Ref Status | `/customer/ekycuniquerefstatus` |
| Enrollment API | `/customer/ekycenrollment` |
| Onboarding API | `/customer/customeronboarding` |

---

## Send API Details

| Field | Value |
|-------|-------|
| **Base URL** | `https://sandbox.prabhuindia.com/Sendapi` |

---

# 2. TOKEN-BASED CSP ONBOARDING API (v1.2)

> Source: Token_Based_CSP_Onboarding_API_V1_2.pdf  
> Created by: Kamal Panthi | Latest version: 1.2 (26 October 2024)

## Document Revision History

| Date | Created By | API Version | Change Summary |
|------|-----------|-------------|----------------|
| 31 January 2024 | Kamal Panthi | 1.0 | Creation of API Document |
| 07 February 2024 | Kamal Panthi | 1.1 | Reviewing and update the Static fields information |
| 26 October 2024 | Kamal Panthi | 1.2 | Change Base URL |

---

## 2.1 Introduction

### API Definition
An Application Programming Interface (API) is a mechanism that enables two software components to communicate with each other using a set of definitions and protocols. Prabhu Money Transfer Private Limited has developed an online API for partners to enroll in the CSP/Agent onboarding process through E-KYA.

### Requirements (Pre-conditions)
- Partner must have an internet connection at their server.
- Partner needs to be registered on the Prabhu system.
- Partner needs to provide a public static IP address to Prabhu.
- Partner needs to provide the landing page (static URL) required to redirect after the E-KYA enrolment initiation from the partner's end.
- Prabhu will provide their partner with the necessary login credentials and other details.
- Prabhu will provide a test environment to their Partner and test all possible cases before going into live/production.

### Request API URL (Test Environment)

**Base URL:** `https://ekyc-sandbox.prabhuindia.com/testkya`

| API | Endpoint |
|-----|----------|
| Token Generation API | `/v1/auth/generatetoken` |
| E-KYA Initiate API | `/v1/csp/Initiate` |
| E-KYA Unique Ref Status | `/v1/csp/Uniquerefstatus` |
| E-KYA Enrollment API | `/v1/csp/Enrollment` |
| Bio-KYC Requery API | `/v1/csp/BioKYCRequery` |
| Customer Onboarding API | `/v1/csp/onboarding` |
| Search CSP | `/v1/csp/SearchCSP` |
| Create CSP | `/v1/csp/CreateCSP` |
| CSP Mapping | `/v1/csp/CSPMapping` |
| Agent Consent Status | `/v1/csp/AgentConsent` |
| OTP Consent URL | `https://uid.rbl.bank.in/CustomerLogin/PPIAgentEkyc.aspx?ref=2DolbGEO4/Qe8Os111Jtig==` |

---

## 2.2 Process Flow Notes

> **Important Notes:**
> 1. The Token will be generated and will expire after midnight (00:00:00) or expire if the API is not called for 25 minutes.
> 2. Partner must display the redirected URL (*RBL Page) to the default browser where teller will type customer details and submit.
> 3. Partner needs to provide the landing page (static URL) required to redirect after the E-KYA enrolment initiation from the partner's end. Branch/CSP must click the OK button on the RBL Page to get the status updated on the **Uniquerefstatus** API.
> 4. Partner must call the **OTPConsentURL** at last once the **PANValidationStatus** has been updated as **Success**.
> 5. Process Flow has been attached separately for further clarity.

---

## 2.3 Token Generation API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/auth/generatetoken`

### JSON Request
```json
{
  "UserName": "String",
  "Password": "String"
}
```

### JSON Response
```json
{
  "SessionTimeout": "datetime",
  "AccessToken": "string",
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| Username* | Body | String | 50 | Provided by Prabhu |
| Password* | Body | String | 50 | Provided by Prabhu |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| SessionTimeout | Response | Datetime | — | Idle session time is 25 Minutes |
| AccessToken | Response | String | 100 | Alphanumeric Value |
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

> *Mandatory Fields on the request parameters are highlighted with (*).

---

## 2.4 E-KYA Initiate API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Initiate`

### JSON Request
```json
{
  "PartnerUniqueRefNo": "String",
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "Url": "string",
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| PartnerUniqueRefNo* | Body | String | 50 | Unique reference number for the request by Partner {Prefix+XXXXXX} |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| URL | Response | String | 500 | Redirected to RBL Bank Page for Aadhaar Validation check |
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

---

## 2.5 E-KYA Unique Ref Status

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Uniquerefstatus`

### JSON Request
```json
{
  "PartnerUniqueRefNo": "String",
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "String"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| PartnerUniqueRefNo* | Body | String | 50 | Unique reference number for the request by Partner {Prefix+XXXXXX} Same as above API |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

---

## 2.6 E-KYA Enrollment API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Enrollment`

### JSON Request
```json
{
  "EncryptedPid": "string",
  "EncryptedHmac": "string",
  "SessionKeyValue": "string",
  "CertificateIdentifier": 0,
  "RegisteredDeviceServiceId": "string",
  "RegisteredDeviceServiceVersion": "string",
  "RegisteredDeviceProviderId": "string",
  "RegisteredDeviceCode": "string",
  "RegisteredDeviceModelId": "string",
  "RegisteredDevicePublicKey": "string",
  "PartnerUniqueRefNo": "string",
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| EncryptedPid* | Body | String | 5000 | PID generated from Device |
| EncryptedHmac* | Body | String | 500 | HMAC generated from Device |
| SessionKeyValue* | Body | String | 1000 | S Key from Device |
| CertificateIdentifier* | Body | Integer | 8 | CI from Device |
| RegisteredDeviceServiceId* | Body | String | 100 | rdsid returned by RD service using biometric |
| RegisteredDeviceServiceVersion* | Body | String | 100 | Rdsver returned by RD service using biometric |
| RegisteredDeviceProviderID* | Body | String | 100 | Dpid returned by RD service using biometric |
| RegisteredDeviceCode* | Body | String | 100 | dc returned by RD service using biometric |
| RegisteredDeviceModelID* | Body | String | 100 | mi value returned by RD service using biometric |
| RegisteredDevicePublicKey* | Body | String | 5000 | mc value returned by RD service using biometric |
| PartnerUniqueRefNo* | Body | String | 50 | Unique reference number for the request by Partner {Prefix+XXXXXX} Same as Above API |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 0 – Failure / 1 – Success |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure' or 'Success' |

---

## 2.7 BioKYCRequery

> Call this API only if you get the success response in Enrollment API. This is used to fix the error to Onboarding ResponseMessage as **"Aadhaarrefkey not generated"** on the onboarding API.

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/BioKYCRequery`

### JSON Request
```json
{
  "PartnerUniqueRefNo": "String",
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "status": 0,
  "responsecode": "00",
  "responsemessage": "String"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| PartnerUniqueRefNo* | Body | String | 50 | Unique reference number {Prefix+XXXXXX} Same as Above API |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Description |
|-----------|----------------|-----------|-------------|
| status | Response | Number | 0 – Failure / 1 – Success |
| responsecode | Response | String | Response code |
| responsemessage | Response | String | Response message |

---

## 2.8 CSP Onboarding API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/onboarding`

### JSON Request
```json
{
  "PartnerIDCode": "string",
  "FirstName": "string",
  "MiddleName": "string",
  "LastName": "string",
  "CompanyName": "string",
  "MobileNumber": 0,
  "LocalAddress": "string",
  "LocalArea": "string",
  "LocalCity": "string",
  "LocalDistrict": "string",
  "LocalState": "string",
  "LocalPinCode": 0,
  "Telephone": 0,
  "AlternateNumber": 0,
  "EmailId": "string",
  "DOB": "string",
  "PanCard": "string",
  "ShopAddress": "string",
  "ShopArea": "string",
  "ShopCity": "string",
  "ShopDistrict": "string",
  "ShopState": "string",
  "ShopPinCode": 0,
  "IFSCCode": "string",
  "AccountNumber": 0,
  "AgentAccountName": "string",
  "Gender": "string",
  "Category": "string",
  "FatherNameOrSpouseName": "string",
  "PhysicallyHandicapped": "string",
  "AlternateOccupationType": "string",
  "AlternateOccupationDescription": "string",
  "HighestuEdcationQualification": "string",
  "CorporateIndividualBC": "string",
  "OperatingHoursFrom": "string",
  "OperatingHoursTo": "string",
  "Course": "string",
  "DateOfPassing": "string",
  "InstituteName": "string",
  "DeviceName": "string",
  "ConnectivityType": "string",
  "provider": "string",
  "EntityType": "string",
  "WeeklyOff": "string",
  "BankName": "string",
  "BranchName": "string",
  "ListOfOtherBanksTheCSPWorksWith": "string",
  "NatureOfBusiness": "string",
  "ExpectedAnnualTurnover": 0,
  "ExpectedAnnualIncome": 0,
  "PartnerUniqueRefNo": "string",
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string",
  "OnboardingStatus": "string",
  "PANValidationStatus": "string",
  "ConsentURL": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| PartnerIDCode* | Body | String | 20 | Your CSP Unique Identification Number |
| FirstName* | Body | String | 50 | First Name of CSP |
| MiddleName | Body | String | 50 | Middle Name of CSP |
| LastName | Body | String | 50 | Last Name of CSP |
| CompanyName* | Body | String | 50 | CSP shop/establishment name |
| MobileNumber* | Body | Number | — | CSP Mobile Number |
| LocalAddress* | Body | String | 100 | CSP Local Address |
| LocalArea* | Body | String | 100 | CSP Local Area |
| LocalCity* | Body | String | 50 | CSP Local City |
| LocalDistrict* | Body | String | 50 | CSP Local District |
| LocalState* | Body | String | 50 | CSP Local State |
| LocalPinCode* | Body | Number | — | CSP Local Pin Code |
| Telephone | Body | Number | — | CSP Telephone Number |
| AlternateNumber* | Body | Number | — | CSP Alternate Mobile Number |
| EmailId* | Body | String | 50 | CSP Email ID |
| DOB* | Body | String | 10 | CSP Date of Birth |
| PanCard* | Body | String | 10 | CSP PAN Card |
| ShopAddress* | Body | String | 100 | CSP Shop Address |
| SoapArea* | Body | String | 100 | CSP Shop Area |
| ShopCity* | Body | String | 50 | CSP Shop City |
| ShopDistrict* | Body | String | 50 | CSP Shop District |
| ShopState* | Body | String | 50 | CSP Shop State |
| ShopPinCode* | Body | Number | — | CSP Shop Pin Code |
| IFSCCode* | Body | String | 50 | CSP Bank IFSC Code |
| AccountNumber* | Body | Number | 50 | CSP Bank Account Number |
| AgentAccountName* | Body | String | 50 | CSP Bank Account Name |
| Gender* | Body | String | 10 | CSP Gender (**Male, Female or Other**) |
| Category* | Body | String | 10 | Describes the CSP category (**General, OBC, ST, or SC**) |
| FatherNameOrSpouseName* | Body | String | 50 | CSP father name or Spouse name |
| PhysicallyHandicapped* | Body | String | 20 | Describe the Physically Handicapped (**Handicapped or Not Handicapped**) |
| AlternateOccupationType* | Body | String | 20 | Describe the alternate CSP occupation (**Government, Self Employed, Public Sector, Private, Other or None**) |
| AlternateOccupationDescription | Body | String | 20 | Mandatory in case CSP mentions other in alternate occupation type |
| HighestEducationQualification* | Body | String | 15 | Describes the highest education qualification (**Under 10th, 10th, 12th, Graduate or Post Graduate**) |
| CorporateIndividualBC* | Body | String | 15 | Describes whether the CSP type (**Individual**) |
| OperatingHoursFrom* | Body | String | 10 | CSP shop opening hours. Example: (09:00 AM) |
| OperatingHoursTo* | Body | String | 10 | CSP shop closing hours. Example: (06:00 PM) |
| Course* | Body | String | 20 | Describes the CSP course (**IIBF Advance, IIBF Basic, Certified by Bank, or None**) |
| DateOfPassing* | Body | String | 10 | Date of passing the course (Not applicable for none) Format (MM/DD/YYYY) |
| InstituteName* | Body | String | 50 | Institute name where CSP has done the course (Not applicable for none) |
| DeviceName* | Body | String | 10 | Describes the device name (**Laptop, or Handheld**) |
| ConnectivityType* | Body | String | 10 | Describe the CSP connectivity type (**Landline, Mobile, or VSAT**) |
| Provider* | Body | String | 10 | Describe the provider's name. Example: Airtel, JIO |
| EntityType* | Body | String | 15 | Describe the CSP entity (**Sole Proprietor / Individual**) |
| WeeklyOff* | Body | String | 10 | Describe the CSP week off |
| BankName* | Body | String | 50 | Describe the CSP Bank name |
| BranchName* | Body | String | 50 | Describe the CSP Bank Branch name |
| ListOfOtherBanksTheCSPWorksWith* | Body | String | 50 | Describe the CSP lists of banks working with. (NA if not available) |
| NatureOfBusiness* | Body | String | 50 | Describe the CSP nature of business (Individual) |
| ExpectedAnnualTurnover* | Body | Number | — | Expected annual turnover of CSP |
| ExpectedAnnualIncome* | Body | Number | — | Expected annual Income of CSP |
| PartnerUniqueRefNo* | Body | String | 50 | New Unique reference number {Prefix+XXXXXX} |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failure |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure' or 'Success' |
| OnboardingStatus | Response | String | 20 | Pending / Failed / Success / Error |
| PANValidationStatus | Response | String | 150 | Success / Name not matched, Verification pending with OPS / PAN validation timed out / PAN Invalid |
| ConsentURL | Response | String | 150 | OTP Consent URL if got PAN Validation Status as Success |

> Pass the same Value that you are getting in the response of the SearchCSP API. If you are getting a blank response in mandatory parameters then fill in the details and pass the request.

---

## 2.9 Search CSP

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/SearchCSP`

### JSON Request
```json
{
  "MobileNumber": 0
}
```

### JSON Response
```json
{
  "StatusCode": 1,
  "ResponseMessage": "Success",
  "CSPDetail": [{}]
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| MobileNumber* | Body | Number | — | Mobile Number of CSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failure |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure' or 'Success' |
| CSPDetail | Response | — | — | Details of the CSP List |

---

## 2.10 Create CSP

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/CreateCSP`

### JSON Request
```json
{
  "IsOwnBranch": "string",
  "GSTIN": "string",
  "IsMainBranch": "string",
  "OTPProcessId": "string",
  "OTP": "string",
  "PartnerIDCode": "string",
  "Firstname": "string",
  "Middlename": "string",
  "Lastname": "string",
  "Companyname": "string",
  "Mobilenumber": 0,
  "Localaddress": "string",
  "Localarea": "string",
  "Localcity": "string",
  "Localdistrict": "string",
  "Localstate": "string",
  "Localpincode": 0,
  "Telephone": 0,
  "Alternatenumber": 0,
  "Emailid": "string",
  "Dob": "string",
  "Pancard": "string",
  "Shopaddress": "string",
  "Shoparea": "string",
  "Shopcity": "string",
  "Shopdistrict": "string",
  "Shopstate": "string",
  "Shoppincode": 0,
  "Ifsccode": "string",
  "Accountnumber": 0,
  "Agentaccountname": "string",
  "Gender": "string",
  "Category": "string",
  "Fathernameorspousename": "string",
  "Physicallyhandicapped": "string",
  "Alternateoccupationtype": "string",
  "Alternateoccupationdescription": "string",
  "Highesteducationqualification": "string",
  "CorporateindividualBC": "string",
  "Operatinghoursfrom": "string",
  "Operatinghoursto": "string",
  "Course": "string",
  "Dateofpassing": "string",
  "Institutename": "string",
  "Devicename": "string",
  "Connectivitytype": "string",
  "Provider": "string",
  "Entitytype": "string",
  "Weeklyoff": "string",
  "Bankname": "string",
  "Branchname": "string",
  "ListofotherbankstheCSPworkswith": "string",
  "Natureofbusiness": "string",
  "Expectedannualturnover": 0,
  "Expectedannualincome": 0
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string",
  "BranchCode": 0,
  "EKYAStatus": "Unverified",
  "OnboardingStatus": "Pending",
  "PANValidationStatus": "Pending",
  "OTPConsentStatus": "Pending"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| IsOwnBranch* | Body | String | 5 | "N" for all |
| GSTIN | Body | String | 60 | GST Number of CSP |
| IsMainBranch* | Body | String | 5 | "N" if all |
| OTPProcessId* | Body | String | 20 | Response from SendOTP |
| OTP* | Body | Number | — | OTP Receive on CSP Mobile Number |
| PartnerIDCode* | Body | String | 20 | Your CSP Unique Identification Number |
| FirstName* | Body | String | 50 | First Name of CSP |
| MiddleName | Body | String | 50 | Middle Name of CSP |
| LastName | Body | String | 50 | Last Name of CSP |
| CompanyName* | Body | String | 50 | CSP shop/establishment name |
| MobileNumber* | Body | Number | — | CSP Mobile Number |
| LocalAddress* | Body | String | 100 | CSP Local Address |
| LocalArea* | Body | String | 100 | CSP Local Area |
| LocalCity* | Body | String | 50 | CSP Local City |
| LocalDistrict* | Body | String | 50 | CSP Local District (Get District list from GetStateDistrict method in SendAPI Docs) |
| LocalState* | Body | String | 50 | CSP Local State (Get State list from GetStateDistrict method in SendAPI Docs) |
| LocalPinCode* | Body | Number | — | CSP Local Pin Code |
| Telephone | Body | Number | — | CSP Telephone Number |
| AlternateNumber* | Body | Number | — | CSP Alternate Mobile Number |
| EmailId* | Body | String | 50 | CSP Email ID |
| DOB* | Body | String | 10 | CSP Date of Birth (MM/DD/YYYY) |
| PanCard* | Body | String | 10 | CSP PAN Card |
| ShopAddress* | Body | String | 100 | CSP Shop Address |
| ShopArea* | Body | String | 100 | CSP Shop Area |
| ShopCity* | Body | String | 50 | CSP Shop City |
| ShopDistrict* | Body | String | 50 | CSP Shop District |
| ShopState* | Body | String | 50 | CSP Shop State |
| ShopPinCode* | Body | Number | — | CSP Shop Pin Code |
| IFSCCode* | Body | String | 50 | CSP Bank IFSC Code |
| AccountNumber* | Body | Number | 50 | CSP Bank Account Number |
| AgentAccountName* | Body | String | 50 | CSP Bank Account Name |
| Gender* | Body | String | 10 | CSP Gender (**Male, Female or Other**) |
| Category* | Body | String | 10 | CSP category (**General, OBC, ST, or SC**) |
| FatherNameOrSpouseName* | Body | String | 50 | CSP father name or Spouse name |
| PhysicallyHandicapped* | Body | String | 20 | **Handicapped or Not Handicapped** |
| AlternateOccupationType* | Body | String | 20 | **Government, Self Employed, Public Sector, Private, Other or None** |
| AlternateOccupationDescription | Body | String | 20 | Mandatory if CSP mentions Other |
| HighestEducationQualification* | Body | String | 15 | **Under 10th, 10th, 12th, Graduate or Post Graduate** |
| CorporateIndividualBC* | Body | String | 15 | CSP type (**Individual**) |
| OperatingHoursFrom* | Body | String | 10 | Example: (09:00 AM) |
| OperatingHoursTo* | Body | String | 10 | Example: (06:00 PM) |
| Course* | Body | String | 20 | **IIBF Advance, IIBF Basic, Certified by Bank, or None** |
| DateOfPassing* | Body | String | 10 | Format (MM/DD/YYYY) |
| InstituteName* | Body | String | 50 | Institute name (Not applicable for none) |
| DeviceName* | Body | String | 10 | **Laptop, or Handheld** |
| ConnectivityType* | Body | String | 10 | **Landline, Mobile, or VSAT** |
| Provider* | Body | String | 10 | Example: Airtel, JIO |
| EntityType* | Body | String | 15 | **Sole Proprietor / Individual** |
| WeeklyOff* | Body | String | 10 | **Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday or None** |
| BankName* | Body | String | 50 | CSP Bank name |
| BranchName* | Body | String | 50 | CSP Bank Branch name |
| ListOfOtherBanksTheCSPWorksWith* | Body | String | 50 | Banks working with (NA if not available) |
| NatureOfBusiness* | Body | String | 50 | CSP nature of business (Individual) |
| ExpectedAnnualTurnover* | Body | Number | — | Expected annual turnover of CSP |
| ExpectedAnnualIncome* | Body | Number | — | Expected annual Income of CSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failure |
| ResponseMessage | Response | String | 100 | Response Message |
| BranchCode | Response | Number | — | Branch code |
| EKYAStatus | Response | String | 10 | Unverified on the initial phase |
| OnboardingStatus | Response | String | 10 | Pending on the Initial Phase |
| PANValidationStatus | Response | String | 10 | Pending on the Initial Phase |
| OTPConsentStatus | Response | String | 10 | Pending on the Initial Phase |

---

## 2.11 CSP Mapping

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/CSPMapping`

### JSON Request
```json
{
  "PartnerIDCode": 0,
  "BranchCode": 0,
  "MobileNumber": 0,
  "PanCard": "String"
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| PartnerIDCode* | Body | String | 20 | Your CSP Unique Identification Number |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| MobileNumber* | Body | Number | — | Mobile Number of CSP |
| PanCard* | Body | String | 10 | PAN Card of CSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 0 – Failure / 1 – Success or Already Mapped |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure', 'Success', or 'Already Mapped' |

---

## 2.12 Agent Consent Status

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/AgentConsent`

### JSON Request
```json
{
  "MobileNumber": 0,
  "BranchCode": 0
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string",
  "BankApprovalStatus": "string",
  "PANValidationStatus": "string",
  "Remarks": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| MobileNumber* | Body | Number | — | Mobile Number of CSP |
| BranchCode* | Body | Number | — | Value of Branch Code response from SearchCSP |
| APIKey* | Header | String | 50 | Provided by Prabhu |
| AgentCode* | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken* | Header | String | 100 | Value of 'Access Token' |
| RequestBy* | Header | String | 50 | Pass "Username" Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Description |
|-----------|----------------|-----------|-------------|
| StatusCode | Response | Number | 0 – Failure / 1 – Success |
| ResponseMessage | Response | String | Response Message |
| BankApprovalStatus | Response | String | Pending / On Process / Details Required / Hold / Validation Completed / Document Uploaded / Approved / Rejected / Blocked / CP APPROVED LIST / Re-Upload / Bank Maker verified |
| PANValidationStatus | Response | String | Success / Name not matched |
| Remarks | Response | String | Agent(eKYC) / Verification pending with OPS / OTP consent pending / Approved by RBLOPS / Rejected by RBL OPS Team. Kindly upload documents manually |

---

## 2.13 Send OTP (CSP Onboarding)

**WSDL:** `https://sandbox.prabhuindia.com/Api/Send.svc?wsdl`

### XML Request
```xml
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:tem="http://tempuri.org/" 
  xmlns:rem="http://schemas.datacontract.org/2004/07/Remit.API">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:SendOTP>
      <tem:SendOTPRequest>
        <rem:UserName>?</rem:UserName>
        <rem:Password>?</rem:Password>
        <rem:Operation>?</rem:Operation>
        <rem:Mobile>?</rem:Mobile>
        <rem:CSPMobile>?</rem:CSPMobile>
        <rem:CSPName>?</rem:CSPName>
      </tem:SendOTPRequest>
    </tem:SendOTP>
  </soapenv:Body>
</soapenv:Envelope>
```

### XML Response
```xml
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <SendOTPResponse xmlns="http://tempuri.org/">
      <SendOTPResult 
        xmlns:a="http://schemas.datacontract.org/2004/07/Remit.API" 
        xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <a:Code>?</a:Code>
        <a:Message>?</a:Message>
        <a:ProcessId>?</a:ProcessId>
      </SendOTPResult>
    </SendOTPResponse>
  </s:Body>
</s:Envelope>
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| UserName* | Body | String | 20 | Provided by Prabhu |
| Password* | Body | String | 20 | Provided by Prabhu |
| Operation* | Body | String | 10 | Pass "CreateCSP" |
| CSPMobile* | Body | Number | — | Mobile Number of CSP |
| CSPName* | Body | String | 50 | Name of CSP |
| Content-Type | Header | String | 20 | application/xml |
| SOAPAction | Header | String | 35 | http://tempuri.org/ISend/SendOTP |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| Code | Response | Number | — | Success '000' / For others check the Message |
| Message | Response | String | 100 | Success if Success / Else Error Description |
| ProcessId | Response | String | 40 | Value will only be returned on Success |

---

# 3. TOKEN-BASED E-KYC API (v2.0)

> Source: Token_Based_E-KYC_API_V2_0.pdf  
> Created by: Kamal Panthi | Latest version: 2.0 (26 October 2024)

## Document Revision History

| Date | Created By | API Version | Change Summary |
|------|-----------|-------------|----------------|
| 07 November 2022 | Kamal Panthi | 1.0 | Creation of API Document |
| 09 November 2022 | Sanjaya Tripathi | 1.0 | Review |
| 07 December 2022 | Kamal Panthi | 1.1 | Add Unique Ref Status API |
| 26 October 2024 | Kamal Panthi | 2.0 | Change Base URL |

---

## 3.1 Introduction

### API Definition
Prabhu Money Transfer Private Limited has developed an online API for partners to enroll in the **customer onboarding process through E-KYC**.

### Requirements (Pre-conditions)
- Partner must have an internet connection at their server.
- Partner needs to be registered on the Prabhu system.
- Partner needs to provide a public static IP address to Prabhu.
- Partner needs to provide the landing page (static URL) required to redirect after the E-KYC enrolment initiation.
- Prabhu will provide their partner with the necessary login credentials and other details.
- Prabhu will provide a test environment to their Partner and test all possible cases before going into live/production.

### Request API URL (Test Environment)

**Base URL:** `https://ekyc-sandbox.prabhuindia.com/test/v1`

| API | Endpoint |
|-----|----------|
| Token Generation API | `/auth/generatetoken` |
| E-KYC Initiate API | `/customer/ekycinitiate` |
| E-KYC Unique Ref Status | `/customer/ekycuniquerefstatus` |
| E-KYC Enrollment API | `/customer/ekycenrollment` |
| Customer Onboarding API | `/customer/customeronboarding` |

---

## 3.2 Token Generation API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/test/v1/auth/generatetoken`

### JSON Request
```json
{
  "UserName": "string",
  "Password": "string"
}
```

### JSON Response
```json
{
  "SessionTimeout": "datetime",
  "AccessToken": "string",
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| Username | Body | String | 50 | Provided by Prabhu |
| Password | Body | String | 50 | Provided by Prabhu |
| APIKey | Header | String | 50 | Provided by Prabhu |
| AgentCode | Header | String | 25 | Provided by Prabhu |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| SessionTimeout | Response | Datetime | — | Idle session time is 25 Minutes |
| AccessToken | Response | String | 100 | Alphanumeric Value |
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

---

## 3.3 E-KYC Initiate API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycinitiate`

### JSON Request
```json
{
  "CustomerId": 0,
  "PartnerUniqueRefNo": "string"
}
```

### JSON Response
```json
{
  "Url": "string",
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| CustomerID | Body | Number | — | Value of 'CustomerID' |
| PartnerUniqueRefNo | Body | String | 50 | Unique reference number for the request by Partner {Prefix+XXXXXX} |
| APIKey | Header | String | 50 | Provided by Prabhu |
| AgentCode | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| URL | Response | String | 500 | Redirected to RBL Bank Page for Aadhaar Validation check |
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

---

## 3.4 E-KYC Unique Ref Status

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycuniquerefstatus`

### JSON Request
```json
{
  "CustomerId": 0,
  "PartnerUniqueRefNo": "string"
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "String"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| CustomerID | Body | Number | — | Value of 'CustomerID' |
| PartnerUniqueRefNo | Body | String | 50 | Unique reference number for the request by Partner {Prefix+XXXXXX} Same as above API |
| APIKey | Header | String | 50 | Provided by Prabhu |
| AgentCode | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failed |
| ResponseMessage | Response | String | 100 | Response Message of 'Failed' or 'Success' |

---

## 3.5 E-KYC Enrollment API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycenrollment`

### JSON Request
```json
{
  "EncryptedPid": "string",
  "EncryptedHmac": "string",
  "SessionKeyValue": "string",
  "CertificateIdentifier": "string",
  "RegisteredDeviceServiceId": "string",
  "RegisteredDeviceServiceVersion": "string",
  "RegisteredDeviceProviderId": "string",
  "RegisteredDeviceCode": "string",
  "RegisteredDeviceModelId": "string",
  "RegisteredDevicePublicKey": "string",
  "CustomerId": 0,
  "PartnerUniqueRefNo": "string"
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| EncryptedPid | Body | String | 5000 | PID generated from Device |
| EncryptedHmac | Body | String | 500 | HMAC generated from Device |
| SessionKeyValue | Body | String | 1000 | S Key from Device |
| CertificateIdentifier | Body | Integer | 8 | CI from Device |
| RegisteredDeviceServiceId | Body | String | 100 | rdsid returned by RD service using biometric |
| RegisteredDeviceServiceVersion | Body | String | 100 | Rdsver returned by RD service using biometric |
| RegisteredDeviceProviderID | Body | String | 100 | Dpid returned by RD service using biometric |
| RegisteredDeviceCode | Body | String | 100 | dc returned by RD service using biometric |
| RegisteredDeviceModelID | Body | String | 100 | mi value returned by RD service using biometric |
| RegisteredDevicePublicKey | Body | String | 5000 | mc value returned by RD service using biometric |
| CustomerID | Body | Number | — | Value of 'CustomerID' responded from the "CreateCustomer" Method |
| PartnerUniqueRefNo | Body | String | 50 | Unique reference number {Prefix+XXXXXX} Same as Above API |
| APIKey | Header | String | 50 | Provided by Prabhu |
| AgentCode | Header | String | 25 | Provided by Prabhu |
| AuthenticationToken | Header | String | 100 | Value of 'Access Token' responded from "Token Generation API" |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 0 – Failure / 1 – Success |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure' or 'Success' |

---

## 3.6 Customer Onboarding API

**Endpoint:** `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/customeronboarding`

### JSON Request
```json
{
  "CustomerType": 0,
  "SourceIncomeType": 0,
  "AnnualIncome": 0,
  "CustomerId": 0,
  "PartnerUniqueRefNo": "string"
}
```

### JSON Response
```json
{
  "StatusCode": 0,
  "ResponseMessage": "string"
}
```

### Request Fields

| Field Name | Parameter Type | Data Type | Description |
|-----------|----------------|-----------|-------------|
| CustomerType | Body | Number | **UAT:** 16-Salaried, 15-Self Employed incl. Professional, 14-Farmer, 17-Housewife. **Production:** 1-Salaried, 2-Self Employed incl. Professional, 3-Farmer, 4-Housewife. (Minor customer is not allowed) |
| SourceIncomeType | Body | Number | **UAT:** 8-Govt, 9-Public sector, 10-Private Sector, 11-Business, 13-Agriculture, 12-Dependent. **Production:** 1-Govt, 2-Public sector, 3-Private Sector, 4-Business, 5-Agriculture, 6-Dependent |
| AnnualIncome | Body | Number | **UAT:** 6-Rs.0-2 Lacs, 7-Rs.2-5 Lacs, 8-Rs.5-10 Lacs, 9-More than 10 Lacs. **Production:** 1-Rs.0-2 Lacs, 2-Rs.2-5 Lacs, 3-Rs.5-10 Lacs, 4-More than 10 Lacs |
| CustomerID | Body | Number | Value of 'CustomerID' responded from the "CreateCustomer" Method |
| PartnerUniqueRefNo | Body | String | New Unique reference number {Prefix+XXXXXX} |
| APIKey | Header | String | Provided by Prabhu |
| AgentCode | Header | String | Provided by Prabhu |
| AuthenticationToken | Header | String | Value of 'Access Token' responded from "Token Generation API" |

### Response Fields

| Field Name | Parameter Type | Data Type | Length | Description |
|-----------|----------------|-----------|--------|-------------|
| StatusCode | Response | Number | — | 1 – Success / 0 – Failure |
| ResponseMessage | Response | String | 100 | Response Message of 'Failure' or 'Success' |

---

# 4. CSP ONBOARDING PARTNER FLOW DIAGRAM

> Source: CSP_Onboarding_Partner_Flow.pdf

## Complete CSP Onboarding API Flow

### Step 1: Generate Token
Call **GenerateToken API**
- StatusCode: 1 → ResponseMessage: Success → Proceed
- StatusCode: 0 → ResponseMessage: {Message} → Handle error

### Step 2: Search CSP
Call **SearchCSP API**
- **CSP Found** → Proceed to CSPMapping + Onboarding flow
- **CSP Not Found** → Send OTP → CreateCSP API

### Step 3A: If CSP Found — Multiple Status Scenarios

| EKYC Status | Onboarding Status | PAN Validation Status | OTP Consent Status | Action |
|-------------|-------------------|-----------------------|--------------------|--------|
| Unverified | Pending | Pending | Pending | CSPMapping → Initiate API |
| Verified | Pending | Pending | Pending | CSPMapping → Onboarding API |
| Verified | Success | Success | Pending | CSPMapping → AgentConsentStatus → OTPConsent URL |
| Verified | Success | Pending | Pending | CSPMapping → AgentConsentStatus API |
| Verified | Success | Success | Success | END |

### Step 3B: If CSP Not Found
1. **Send OTP** (Operation = CreateCSP)
2. **CreateCSP API**
3. **Initiate API** → Redirect to RBL URL
4. **UniqueRefStatus API**
5. **Enrollment API**
6. **BIO-KYC Re-query** (if Enrollment gets Success Response)
7. **Onboarding API**

### Step 4: Onboarding API Response Handling

**Response 1 — PANValidationStatus: Success**
- StatusCode: 1, PANValidationStatus: Success
- → Proceed to OTPConsentURL

**Response 2 — Name Not Matched**
- StatusCode: 1, PANValidationStatus: Name not matched, Verification pending with OPS
- → These records will move to OPS bucket for approval. TAT will be 24 Hrs.
- → Partner needs to wait for OPS response & check the agent status by calling AgentConsentStatus API.

**Response 3 — PAN Validation Timed Out**
- StatusCode: 1, PANValidationStatus: The PAN validation is timed out, request you to reinitiate the request after sometime
- → Action: Call Onboarding API Again

**Response 4 — Invalid PAN**
- StatusCode: 1, PANValidationStatus: The validation is failed as the PAN entered is Invalid, request you to reinitiate the request with Valid PAN
- → Action: Contact PMT Support team.

### Step 5: AgentConsentStatus API Response Handling

**Response 1 — Pending/Processing**
- BankApprovalStatus: Pending / On Process / Details Required / Hold / Validation Completed / Document Uploaded / Rejected / Blocked / CP APPROVED LIST / Re-Upload / Bank Maker verified
- PANValidationStatus: Name Not Matched
- Remarks: Verification pending with OPS / Rejected by RBL OPS Team. Kindly upload documents manually

**Response 2 — OTP Consent Pending**
- BankApprovalStatus: Approved
- PANValidationStatus: Success
- Remarks: OTP consent pending
- → Call the OTPConsentURL

**Response 3 — Approved**
- BankApprovalStatus: Approved
- PANValidationStatus: Success
- Remarks: Agent(eKYC) / Approved by RBLOPS
- → END

---

# 5. SEND API DOCUMENT (v5.0)

> Source: Send_API_Document_5_0.pdf  
> Created by: Kamal Panthi | Latest version: 5.0 (25 March 2026)

## Document Revision History

| Date | Created By | API Version | Change Summary |
|------|-----------|-------------|----------------|
| September 2020 | Kapil Acharya | 2.0.0 | Compliance Update |
| September 2020 | Kapil Acharya | 2.0.1 | Update (Fields Added) |
| 15 November 2022 | Kamal Panthi | 3.0 | Review Document - Added Fields - Introduce New Process Flow |
| 07 December 2022 | Kamal Panthi | 3.1 | Update Process Flow with RBL Page information |
| 26 October 2024 | Kamal Panthi | 4.0 | Minor Correction & Review |
| 25 March 2026 | Kamal Panthi | 5.0 | Updated API in JSON along with Citizenship and Passport processes |

---

## 5.1 Introduction

Prabhu Money Transfer Private Limited (Prabhu INDIA) has developed an online **JSON-based API** for its partners to create customers, add receivers, and initiate transactions. The API interacts with the Prabhu INDIA system in real time as an authorised agent.

**Test Base URL:** `https://sandbox.prabhuindia.com/Sendapi`

### Requirements
- Partner must have an internet connection at their server.
- Partner needs to be registered on the Prabhu INDIA system.
- Partner will need to provide a public static IP address to Prabhu INDIA.
- Partners will be provided with the necessary login credentials upon confirming the above requirement.
- Prabhu INDIA will provide a Test Environment to the Partner and test all possible cases before going LIVE.
- Partner will be going through a certification process before Prabhu INDIA will allow the partner to transact on the production system.
- **Partner needs to create a Signature for secure HMAC Authentication for each method.**

---

## 5.2 List of All Methods

| S.N | Method Name | Endpoint | Description |
|-----|------------|----------|-------------|
| 1 | GetEcho | /Send/getEcho | To test the connection |
| 2 | GetCustomerByMobile | /Send/GetCustomerByMobile | To get the customer details by searching the registered Mobile Number |
| 3 | GetCustomerByID | /Send/GetCustomerById | To get customer details by searching the registered ID Number (* Only for Nepalese Citizenship & Nepalese Passport) |
| 4 | CreateCustomer | /Send/CreateCustomer | To create a sender if the details are not found on the GetCustomer Method |
| 5 | CreateReceiver | /Send/CreateReceiver | To create a receiver if the details are not found on the GetCustomer Method |
| 6 | SendTransaction | /Send/SendTransaction | To send the transaction |
| 7 | ConfirmTransaction | /Send/ConfirmTransaction | To Verify the Transaction. Also named as (VerifyTransaction) |
| 8 | UnverifiedTransaction | /Send/UnverifiedTransactions | To get the transactions that were not verified (relates to the confirm transaction method) |
| 9 | SendOTP | /Send/SendOTP | To send the OTP for creating the customer, send a Transaction, and create the CSP |
| 10 | AcPayBankBranchList | /Send/AcPayBankBranchList | To get the Bank list of Nepal |
| 11 | GetServiceCharge | /Send/GetServiceCharge | To get the Service Charge |
| 12 | GetStateDistrict | /Send/GetStateDistrict | To get the State and District of India and Nepal. (The parameters should be matched while calling the methods that have the state and District) |
| 13 | GetStaticData | /Send/GetStaticData | To get the static data for validated parameters (drop-down data) |
| 14 | GetBalance | /Send/GetBalance | To check the available balance |
| 15 | UploadDocument | /Send/UploadDocument | To upload the sender document for Nepalese Citizenship & Nepalese Passport |
| 16 | SearchTransaction | /Send/SearchTransaction | To get the transaction status |
| 17 | RegisterComplaint | /Send/RegisterComplaint | To generate a ticket for a complaint |
| 18 | TrackComplaint | /Send/TrackComplaint | To track the generated complaint |

---

## 5.3 HMAC Authentication

This HMAC-based authentication system ensures secure communication between clients and the ASP.NET Core API (SendAPI). It validates requests using a hashed signature derived from the request's body, method, URI, timestamp, and a secret key.

### Authorization Header Format
```
Authorization: hmacauth {Username}:{Signature}:{Nonce}:{Timestamp}
```

- **Username:** A unique ID assigned to each client.
- **Signature:** A Base64-encoded HMAC-SHA256 hash.
- **Nonce:** A unique, one-time-use identifier (like a GUID).
- **Timestamp:** Unix epoch time (in seconds).

### Signature Computation Formula
```
message = AppId + HttpMethod + UrlEncodedUri + Timestamp + Nonce + Base64(MD5(body))
signature = Base64(HMACSHA256(UTF8Bytes(message), Base64Decoded(secret)))
```

### Security Controls
- **Replay protection:** Timestamp is validated within a max age (Options.RequestMaxAgeInSeconds).
- **Body hash check:** Ensures integrity of the body using MD5.
- **Logging:** All requests are logged excluding Authorization headers.

### Required Headers (Client Side)

| Header | Description |
|--------|-------------|
| Authorization | HMAC string as described above |
| Content-Type | Typically `application/json` |

### Custom Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 1100 | Signature is Invalid | Signature mismatch |
| 1101 | Missing/Invalid Header | Bad format or missing auth |
| 1102 | Request expired | Timestamp too old |

### Client-Side C# Example
```csharp
using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

public class HMACClient
{
    public async Task SendRequestAsync()
    {
        string appId = "YourAppIdHere";
        string secret = "YourBase64EncodedSecretHere";
        string nonce = Guid.NewGuid().ToString("N");
        string timestamp = ((long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds).ToString();
        string url = "https://yourapi.com/api/endpoint";
        string method = "POST";
        string body = "{\"sample\":\"data\"}";

        string signature = ComputeSignature(appId, method, url, timestamp, nonce, body, secret);
        string authHeader = $"hmacauth {appId}:{signature}:{nonce}:{timestamp}";

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", authHeader);
        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content);
        string result = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Response: {result}");
    }

    private string ComputeSignature(string appId, string method, string url, string timestamp,
        string nonce, string body, string secretKey)
    {
        var uri = System.Web.HttpUtility.UrlEncode(url.ToLowerInvariant());
        var methodUpper = method.ToUpperInvariant();
        string bodyHash = "";

        if (!string.IsNullOrEmpty(body))
        {
            using var md5 = MD5.Create();
            byte[] contentBytes = Encoding.UTF8.GetBytes(body);
            byte[] hash = md5.ComputeHash(contentBytes);
            bodyHash = Convert.ToBase64String(hash);
        }

        var message = $"{appId}{methodUpper}{uri}{timestamp}{nonce}{bodyHash}";
        byte[] keyBytes = Convert.FromBase64String(secretKey);
        byte[] messageBytes = Encoding.UTF8.GetBytes(message);

        using var hmac = new HMACSHA256(keyBytes);
        byte[] signatureBytes = hmac.ComputeHash(messageBytes);
        return Convert.ToBase64String(signatureBytes);
    }
}
```

---

## 5.4 Process Flow (Send API)

### Step 1 — Get Customer
Call **GetCustomerByMobile**

**Case 1: Customer Not Found**
- Initiate SendOTP (Operation = CreateCustomer)
- Initiate CreateCustomer [ProcessID and OTP given by sender should match]

**Case 2: Customer Found**
- Follow the Customer KYC Integration Process (see Section 5.5)

### Step 2 — Create a Receiver with Mode of Payment
If the receiver is already in the response to GetCustomerByMobile, no need to add again.

**Case 1: Cash Payment** → Initiate CreateReceiver

**Case 2: Account Deposit** → Call AcPayBankBranchList → Take BankDetails → Initiate CreateReceiver

### Step 3 — Verify Customer Eligibility
- Check Customer Compliance; whether they can send transactions or not.
- Check the respective receiver details with available Payment types.
- Get Customer confirmation, along with receiver details and payment type.

### Step 4 — Get Service Charge
Initiate **GetServiceCharge** [Grab the required calculation]

### Step 5 — Send Transaction
- Initiate SendOTP (Operation = SendTransaction)
- Initiate **SendTransaction** [ProcessID and OTP given by the sender should be matched]

### Step 6 — Confirm Transaction
Initiate **ConfirmTransaction** [For each Transaction, you need to verify (Like Checker/Maker)]

### Step 7 — Search Transaction
Initiate **SearchTransaction** — Partners can view the status of the transaction by calling this method at any time.

### Step 8 — Register Complaint
Initiate **RegisterComplaint** — Partners can generate the ticket by raising their queries or complaints for Agent Registration, Customer Registration, Receiver Registration or Transaction inquiry.

### Step 9 — Track Complaint
Initiate **TrackComplaint** — Partners can track the complaint for closure.

---

## 5.5 Customer KYC Integration Process (for Partners)

Partners must capture **one of the following ID Types** during customer registration:

| ID Type | Description | Code |
|---------|-------------|------|
| Aadhaar Card | eKYC through biometric authentication (real-time) | 77 |
| Nepalese Citizenship | Manual verification (document upload) | 12 |
| Nepalese Passport | Manual verification (document upload) | 4 |

### A. Aadhaar Card (ID Type: 77)

Aadhaar KYC is verified in real time through **eKYC API (biometric authentication)**.

**API: GetCustomerByMobile** — Response parameters to check:
```json
{
  "ekycStatus": "",
  "onboardingStatus": ""
}
```

**Verification Logic:**
- If `ekycStatus = "Verified"` AND `onboardingStatus = "Success"` → **KYC Completed** (Customer is eligible for transactions)
- Else → **KYC Not Completed** → Partner should call the **Token-based eKYC API (JSON-based)** to complete eKYC.

**Token-based eKYC API process:**

**Case 1: eKYC Status is Unverified and Onboarding Status is Pending**

Base URL: `https://ekyc-sandbox.prabhuindia.com/test/v1`
1. Token Generate: `/auth/generatetoken`
2. eKYC Initiate: `/customer/ekycinitiate` → Partner must display redirected URL (*RBL Page) where teller will type customer details and submit
3. Partner provides landing page (static URL) for redirect
4. ekycuniquerefstatus: `/customer/ekycuniquerefstatus`
   - If Success → Go to Next API
   - If Failed → Call ekycinitiate API with new PartnerUniqueRefNo
5. eKYC Enrolment: `/customer/ekycenrollment`
6. Onboarding: `/customer/customeronboarding`

**Case 2: Customer EKYCStatus is Verified and OnboardingStatus is Pending** → Call the CustomerOnboarding API from Token-based eKYC API (JSON Based)

**Case 3: Customer EKYCStatus is Verified and OnboardingStatus is Success** → End → Go to Step 2 of Process Flow

### B. Nepalese Citizenship (ID Type: 12)
### C. Nepalese Passport (ID Type: 4)

Both follow **manual KYC verification** based on document upload and review by the Prabhu Money Transfer compliance team.

**API: GetCustomerByMobile** — Response parameters to check:
```json
{
  "status": "",
  "approveStatus": "",
  "approveComment": ""
}
```

**Verification Logic:**

| Response | Meaning | Action |
|----------|---------|--------|
| status: "Unverified", approveStatus: "NoDocument" | No document uploaded | Upload the KYC document |
| status: "Unverified", approveStatus: "Pending" | Document uploaded, under review | Wait for compliance approval |
| status: "Unverified", approveStatus: "Rejected" | Document rejected by compliance | Check the approveComment for the reason and re-upload |
| status: "Unverified", approveStatus: "Reviewed" | Document re-uploaded, under re-review | Wait for the compliance decision |
| status: "Verified", approveStatus: "Approved" | KYC approved | The customer can transact |

### Transaction Eligibility Summary

| ID Type | Verification Type | Eligibility Condition | Action if Not Verified |
|---------|-------------------|-----------------------|------------------------|
| 77 (Aadhaar) | Real-time eKYC | ekycStatus = Verified AND onboardingStatus = Success | Complete through Token-based eKYC API |
| 12 (Citizenship) | Document Upload | status = Verified AND approveStatus = Approved | Upload document / wait for approval |
| 4 (Passport) | Document Upload | status = Verified AND approveStatus = Approved | Upload document / wait for approval |

### Notes for Partners
1. Partners must **validate KYC status before initiating any transaction**.
2. KYC completion status must be checked using the **GetCustomerByMobile** method each time before transaction initiation.
3. In case of Aadhaar (77), if ekycStatus or onboardingStatus is not verified/success, partners must call the **Token-based eKYC API** to complete KYC.
4. For Citizenship (12) and Passport (4), partners must integrate the **document upload feature** and handle status polling until approveStatus becomes Approved.
5. **Transactions must be restricted until KYC is successfully completed and verified.**

---

## 5.6 Payment Type

| Payment Method | Description |
|----------------|-------------|
| **Cash Payment** | If you are sending transactions to pick up Cash with the Beneficiary Name & Valid Identity |
| **Account Deposit** | If you are sending transactions to deposit into the Account of Any Banks with the Beneficiary Name, Bank Name, and Account Number |

---

## 5.7 Transaction Status

| Status | Description |
|--------|-------------|
| **Hold** | Once the transaction is initiated, the first txnStatus shown is Hold. Hold means the partner has not yet verified the transaction. |
| **Un-Paid** | Once the transaction is verified by the partner, the transaction status will be marked as "Unpaid." All generated transactions will undergo sanction screening. |
| **Post** | After the screening is completed by Compliance, the status will be updated to "Post". The transaction is ready for collection or ready to be deposited in the payout system. If the transaction remains in "Post" status for an extended period (15 days), it will not be paid in Nepal and will be returned. |
| **Paid** | Once the payment is collected in pay-out side, then the transaction status will change to Paid. |
| **Cancelled** | If the sender requests cancellation within 15 days, it will be cancelled with OTP verification, and the collected amount will be refunded to the sender. |
| **Refunded** | If the sender requests a refund after 15 days, it will be cancelled with OTP verification, and only the principal amount (excluding the service charge) will be refunded. |

---

## 5.8 Account Pay Bank Branch List

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetAcPayBankBranchList`

> Note: Partner can also store the data and update the record in idle time (weekly or monthly basis).

### Request Header
```
Content-Type: application/json
Authorization: {{signature}}
```

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "country": "",
  "state": "",
  "district": "",
  "city": "",
  "bankName": "",
  "branchName": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "bankBranches": [
    {
      "bankBranchId": "",
      "bankName": "",
      "branchName": "",
      "branchCode": "",
      "routingCode": "",
      "country": "",
      "address": "",
      "state": "",
      "district": "",
      "city": "",
      "phoneNumber": ""
    }
  ]
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| Country | String | 10 | **Nepal** as Hardcode | M |
| State | String | 20 | — | O |
| District | String | 20 | — | O |
| City | String | 20 | — | O |
| BankName | String | 50 | — | O |
| BranchName | String | 50 | — | O |

### Error Codes

| Error Code | Message |
|-----------|---------|
| 021 | User Name Required |
| 022 | Password Required |
| 023 | Country Required |
| 666 | No Record Found |

---

## 5.9 Get Service Charge

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetServiceCharge`

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "country": "",
  "paymentMode": "",
  "transferAmount": "",
  "payoutAmount": "",
  "bankBranchId": "",
  "isNewAccount": "",
  "customerId": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "collectionAmount": 0,
  "collectionCurrency": "",
  "serviceCharge": 0,
  "transferAmount": 0,
  "exchangeRate": 0,
  "payoutAmount": 0,
  "payoutCurrency": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| Country | String | 5 | **NPL** as Hardcode | M |
| PaymentMode | String | 20 | **Cash Payment, Account Deposit** | M |
| TransferAmount | String | 5 | Send Amount without Service Charge | C |
| PayoutAmount | String | 5 | Mandatory if Transfer Amount not provided | C |
| BankBranchId | String | 20 | Get from AcPayBankBranchList | O |
| IsNewAccount | String | 1 | — | O |
| customerId | String | 20 | Get from GetCustomerByMobile response | M |

### Error Codes

| Error Code | Message |
|-----------|---------|
| 021 | User Name Required |
| 022 | Password Required |
| 023 | Country Required |
| 024 | Payment Mode Required |
| 026 | Invalid Payment Mode. Only 'ACCOUNT DEPOSIT' or 'CASH PAYMENT' are allowed |
| 027 | Customer id is required |
| 1001 | Commission is not define. Please contact to administrator |
| 1002 | Customer not found |
| 1003 | Transfer Amount or Payout Amount is Required!! |
| 1004 | Invalid Country. Only Nepal is allowed |
| 1006 | Amount is invalid !! The maximum sending cap is INR. 50000 including charge |

---

## 5.10 Get Static Data

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetStaticData`

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "type": ""
}
```

### Available Type Values

Gender, Nationality, IDType, SourceofFund, Relationship, PaymentMode, RemittanceReason, EntityType, Device, Connectivity, OffDay, SOURCEINCOMETYPE, CUSTOMERTYPE, CQualification, NepaleseIdType, Courses, Category, AnnualIncome, PhysicallyHandicapped, ComplainType, ComplainCategory

---

## 5.11 Get State District

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetStateDistrict`

> Note: Details for India are for registering the Sender and CSP, while details for Nepal are for registering the receiver.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "country": ""
}
```

**Country Values:** India or IND / Nepal or NPL

---

## 5.12 Get Customer by Mobile

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetCustomerByMobile`

This method retrieves details of an existing customer using the sender's mobile number, for all KYC types (i.e., 4, 12 & 77).

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "customerMobile": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "customers": [
    {
      "customerId": "",
      "name": "",
      "mobile": [""],
      "status": "",
      "approveStatus": "",
      "approveComment": "",
      "ids": [{"idType": ""}],
      "transactionCount": {
        "day": "",
        "month": "",
        "year": ""
      },
      "ekycStatus": "",
      "onboardingStatus": "",
      "receivers": [
        {
          "receiverId": "",
          "name": "",
          "paymentMode": "",
          "bankName": "",
          "acNumber": ""
        }
      ]
    }
  ]
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| CustomerMobile | String | 10 | Customer registered Mobile Number | M |

### Error Codes

| Error Code | Message |
|-----------|---------|
| 021 | User Name Required |
| 022 | Password Required |
| 023 | Customer Mobile Required |
| 666 | No Record Found |

---

## 5.13 Get Customer by ID

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetCustomerById`

This method retrieves details of an existing customer using the sender's ID number, for KYC types 4 & 12 only.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "customerIdNo": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| customerIdNo | Number | 50 | Customer registered ID Number | M |

---

## 5.14 Send OTP

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/SendOTP`

This method generates and sends an OTP to the customer's registered mobile number. The OTP validation process is applicable to **SendTransaction**, **CreateCSP**, and **CreateCustomer** operations.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "operation": "",
  "mobile": "",
  "customerId": "",
  "receiverId": "",
  "customerFullName": "",
  "pinNo": "",
  "paymentMode": "",
  "sendAmount": "",
  "cspMobile": "",
  "cspName": "",
  "IDType": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "processId": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| Operation | String | 20 | **CreateCustomer, SendTransaction, CreateCSP** | M |
| Mobile | String | 10 | Mandatory for CreateCustomer and SendTransaction | C |
| CustomerId | String | 10 | Mandatory for SendTransaction | C |
| ReceiverId | String | 10 | Mandatory for SendTransaction | C |
| customerFullName | String | 50 | Mandatory for CreateCustomer | C |
| PinNo | String | 20 | — | O |
| PaymentMode | String | 50 | Mandatory for SendTransaction | C |
| SendAmount | String | 5 | Mandatory for SendTransaction | C |
| cspMobile | String | 20 | Mandatory for CreateCSP | C |
| cspName | String | 50 | Mandatory for CreateCSP | C |
| IDType | String | 5 | Mandatory for CreateCustomer | C |

### Error Codes

| Error Code | Message |
|-----------|---------|
| 002 | Customer with Mobile already Exists |
| 006 | Provided Mobile Number does not belong to Customer with provided CustomerID |
| 007 | Provided Receiver does not belong to Customer |
| 009 | Provided Payment Type does not match with Payment type of Receiver |
| 021 | User Name Required |
| 022 | Password Required |
| 023 | Operation Required |
| 024 | Invalid Mobile Number |
| 025 | SendAmount Required |
| 026 | Invalid Operation, Value must either of CreateCustomer, SendTransaction, CreateCSP |
| 027 | CustomerId Required |
| 028 | PaymentMode Required |
| 029 | Id Type is Required |
| 030 | Customer Full Name is Required |
| 032 | Invalid PaymentMode |
| 033 | ReceiverId Required |
| 034 | Invalid Id Type, it should be either 77, 12 or 4 |
| 035 | CSP Mobile Number is Required |
| 036 | CSP Name is Required |
| 099 | Provided Payment Amount is greater than Transaction limit |

---

## 5.15 Create Customer

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/CreateCustomer`

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "firstName": "",
  "middleName": "",
  "lastName": "",
  "gender": "",
  "dobAD": "",
  "mobile": "",
  "temporaryAddress": "",
  "temporaryState": "",
  "temporaryDistrict": "",
  "temporaryCity": "",
  "temporaryPINCode": "",
  "nationality": "",
  "permanentAddress": "",
  "permanentState": "",
  "permanentDistrict": "",
  "permanentLocalLevel": "",
  "permanentWardNo": "",
  "fatherName": "",
  "email": "",
  "employer": "",
  "idType": "",
  "idNumber": "",
  "citizenshipNo": "",
  "idIssuedDateAD": "",
  "idExpiryDate": "",
  "idIssuedPlace": "",
  "otpProcessId": "",
  "otp": "",
  "customerType": "",
  "sourceIncomeType": "",
  "annualIncome": "",
  "cspCode": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "customerId": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| userName | String | 20 | api-key provided by Prabhu | M |
| password | String | 20 | api-secret provided by Prabhu | M |
| firstName | String | 50 | First Name of Remitter (Sender) | M |
| middleName | String | 50 | Middle Name of Remitter (Sender) | O |
| lastName | String | 50 | Last Name of Remitter (Sender) | O |
| gender | String | 10 | Get value from GetStaticData method (M / F / O) | M |
| dobAD | String | 10 | Format YYYY-MM-DD | M |
| mobile | String | 10 | Mobile Number of Sender | M |
| temporaryAddress | String | 100 | Residence Address of sender (India) | M |
| temporaryState | String | 50 | Residence State of Sender (India) — Get StateCode Value from GetStateDistrict | M |
| temporaryDistrict | String | 50 | Residence District of Sender (India) — Get from GetStateDistrict | M |
| temporaryCity | String | 50 | Residence City of the Sender (India) | M |
| temporaryPINCode | String | 6 | Residence PIN Code of the Sender (India) | M |
| nationality | String | 100 | Pass **NPL** as Hardcode | M |
| permanentAddress | String | 100 | Permanent Address of Sender (Nepal) | M |
| permanentState | String | 50 | Permanent State of Sender (Nepal) — Get from GetStateDistrict | M |
| permanentDistrict | String | 50 | Permanent District of Sender (Nepal) — Get from GetStateDistrict | M |
| permanentLocalLevel | String | 50 | Permanent Local Level of Sender (Nepal) — Get from GetStateDistrict | M |
| permanentWardNo | String | 2 | Permanent Ward No of Sender (Nepal) | M |
| fatherName | String | 50 | Father's Name of the Sender | O |
| email | String | 100 | Email ID of the Sender | O |
| employer | String | 100 | Name of Company Where Sender Works | M |
| idType | String | 50 | Get value from GetStaticData Method with type IDType | M |
| idNumber | String | 20 | ID Number of the Sender as per the IDType | M |
| citizenshipNo | String | 50 | A Nepalese Citizenship Number is mandatory when IDType is 4 | C |
| idIssuedDateAD | String | 10 | Format YYYY-MM-DD — Mandatory when IDType is 12 & 4 | C |
| idExpiryDate | String | 10 | Format YYYY-MM-DD — Mandatory when IDType is 4 | C |
| idIssuedPlace | String | 50 | ID Issued Place of Sender — Mandatory when IDType is 12 & 4 | C |
| otpProcessId | String | 200 | Get value from the response of the SendOTP Method | M |
| otp | String | 6 | Collect OTP from the Sender and pass it here | M |
| customerType | String | 5 | Get value from GetStaticData Method with type CustomerType | M |
| sourceIncomeType | String | 5 | Get value from GetStaticData Method with type SourceIncomeType | M |
| annualIncome | String | 5 | Get value from GetStaticData Method with type annualIncome | M |
| cspCode | String | 20 | Agent's unique identification number of Partner | M |

---

## 5.16 Upload Document

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/UploadDocument`

This method is used to upload the Customer Identification Document (ID scan copy) for compliance verification. **Applicable only for IDType 4 (Passport) and IDType 12 (Citizenship Card). Do NOT upload documents for IDType 77 (Aadhaar Card).**

### Three Files to Upload
1. **frontImgFileBase64** – ID Card (Front)
2. **backImgFileBase64** – ID Card (Back)
3. **additionalImgFileBase64** – Customer photograph holding the ID card in hand at the counter

> **Note:** The API may return a successful response even if the Base64 conversion is incorrect. Please verify the uploaded images in the PrabhuINDIA portal before going live.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "customerId": "",
  "idType": "",
  "frontImgFileBase64": "",
  "backImgFileBase64": "",
  "additionalImgFileBase64": ""
}
```

### Error Codes

| Error Code | Message |
|-----------|---------|
| 021 | User Name Required |
| 022 | Password Required |
| 024 | IdType is Required |
| 025 | CustomerId is Required |
| 026 | FrontImgFileBase64 is not a valid Base64 string |
| 027 | Front Image FileBase64 is Required |
| 028 | Back Image FileBase64 is Required |
| 029 | Additional Image FileBase64 is Required |
| 036 | Invalid Id Type / Mismatched Id Type While checking with the Customer Id |
| 100 | Customer KYC is Already Verified |
| 101 | Customer Record not Found |
| 999 | Uploading document failed |

---

## 5.17 Create Receiver

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/CreateReceiver`

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "customerId": "",
  "firstName": "",
  "middleName": "",
  "lastName": "",
  "gender": "",
  "mobile": "",
  "relationship": "",
  "address": "",
  "state": "",
  "district": "",
  "localLevel": "",
  "country": "",
  "paymentMode": "",
  "bankBranchId": "",
  "accountNumber": "",
  "nepaleseIdType": "",
  "nepaleseIdNumber": "",
  "nepaleseIdIssueDistrict": "",
  "nepaleseIdIssueDate": "",
  "nepaleseIdExpiryDate": "",
  "nepaleseIdIssueCountry": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "receiverId": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| userName | String | 20 | api-key provided by Prabhu | M |
| password | String | 20 | api-secret provided by Prabhu | M |
| customerId | String | 10 | Get from GetCustomerByMobile response | M |
| firstName | String | 50 | First Name of Receiver | M |
| middleName | String | 50 | Middle Name of Receiver | O |
| lastName | String | 50 | Last Name of Receiver | O |
| gender | String | 10 | Get value from GetStaticData method (M / F / O) | M |
| mobile | String | 50 | Mobile Number of Receiver | M |
| relationship | String | 50 | Get label from GetStaticData method with type Relationship | M |
| address | String | 100 | Address of Receiver (Nepal) | M |
| state | String | 50 | State of Receiver (Nepal) — Get from GetStateDistrict | M |
| district | String | 50 | District of Receiver (Nepal) — Get from GetStateDistrict | M |
| localLevel | String | 50 | Local Level of Receiver (Nepal) — Get from GetStateDistrict | M |
| country | String | 5 | **Nepal** as Hardcode | M |
| paymentMode | String | 20 | **Cash Payment, Account Deposit** | M |
| bankBranchId | String | 20 | Get from AcPayBankBranchList — Mandatory for Account Deposit | C |
| accountNumber | String | 20 | Receiver Bank Account Number — Mandatory for Account Deposit | C |
| nepaleseIdType | String | 20 | — | O |
| nepaleseIdNumber | String | 50 | — | O |
| nepaleseIdIssueDistrict | String | 50 | — | O |
| nepaleseIdIssueDate | String | 20 | — | O |
| nepaleseIdExpiryDate | String | 20 | — | O |
| nepaleseIdIssueCountry | String | 20 | — | O |

---

## 5.18 Send Transaction

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/SendTransaction`

> **Highly Important Instruction:**
> - Response Code **000** indicates Success.
> - Response Code **999** indicates a timeout from the PMT database.
> - If Response Code 999 is received, or if no response is received, mark the transaction status as **"Success Unknown"**, then verify the transaction using the **SearchTransaction API** with PartnerPinNo.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "customerId": 0,
  "senderName": "",
  "senderMobile": "",
  "senderIDType": "",
  "receiverId": 0,
  "receiverName": "",
  "sendCountry": "",
  "payoutCountry": "",
  "paymentMode": "",
  "collectedAmount": "",
  "serviceCharge": "",
  "sendAmount": "",
  "sendCurrency": "",
  "payAmount": "",
  "payCurrency": "",
  "exchangeRate": "",
  "accountNumber": "",
  "partnerPinNo": "",
  "remittanceReason": "",
  "SourceOfFund": "",
  "cspCode": "",
  "otpProcessId": "",
  "otp": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "transactionId": 0,
  "pinNo": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| userName | String | 20 | api-key provided by Prabhu | M |
| password | String | 20 | api-secret provided by Prabhu | M |
| customerId | integer | 10 | Get from GetCustomerByMobile response | M |
| senderName | String | 100 | As per the response in the GetCustomer Method | M |
| senderMobile | String | 10 | As per the response in the GetCustomer Method | M |
| senderIDType | String | 10 | As per the response in the GetCustomer Method | M |
| receiverId | integer | — | As per the response in the GetCustomer Method | M |
| receiverName | String | 50 | As per the response in the GetCustomer Method | M |
| sendCountry | String | 5 | **India** as Hardcode | M |
| payoutCountry | String | 5 | **Nepal** as Hardcode | M |
| paymentMode | String | 50 | As per the response in the GetCustomer Method | M |
| collectedAmount | Decimal | 5 | Total Amount Collected from Customer | M |
| serviceCharge | Decimal | 5 | Service charge from GetServiceCharge Method | M |
| sendAmount | Decimal | 5 | Send amount without service charge | M |
| sendCurrency | String | 3 | **INR** as Hardcode | M |
| payAmount | Decimal | 5 | PayoutAmount from GetServiceCharge Method | M |
| payCurrency | String | 3 | **NPR** as Hardcode | M |
| exchangeRate | Decimal | — | Exchange rate from GetServiceCharge Method | M |
| accountNumber | String | 22 | As per response in GetCustomer Method — Mandatory if PaymentMode is Account Deposit | C |
| partnerPinNo | String | 16 | Unique Transaction Identifier of Partner | M |
| remittanceReason | String | 20 | Get value from GetStaticData Method with type RemittanceReason | M |
| SourceOfFund | String | 20 | Get value from GetStaticData Method with type SourceOfFund | M |
| cspCode | String | 20 | CSP Code of the requested merchant — Unique Identification agent Code of the partner | M |
| otpProcessId | String | 200 | Get from the response of the Method SendOTP | M |
| otp | Number | 6 | Collect the OTP that comes to the registered mobile number of the remitter | M |

### Error Codes (Key ones)

| Error Code | Message |
|-----------|---------|
| 021 | User Name Required |
| 022 | Password Required |
| 055 | Partner PinNo Required |
| 056 | Remittance Reason Required |
| 057 | CSP Code Required |
| 058 | Invalid Payment Mode |
| 062 | OTPProcessId Required |
| 070 | OTP Required |
| 001 | Invalid Mobile OTP [001] |
| 101 | The transaction has been already generated with the same receiver's name and the same amount. If you want to send it again, please try after 5 min |
| 108 | Something went wrong. Service charge is Invalid. Please re-try it again |
| 110 | Service Charge Mismatch. Collected Amount and Send Amount Difference |
| 205 | Invalid Sender Name While Checking with Customer Detail |
| 211 | Invalid Sender Mobile While Checking with Customer Detail |
| 213 | Invalid Receiver Name While Checking with Receiver Detail |
| 217 | Invalid PaymentMode While Checking with Receiver Detail |
| 219 | Invalid ACNumber While Checking with Receiver Detail |
| 305 | CSPCode not Registered or Not enabled for Indo-Nepal Remittance |

---

## 5.19 Confirm Transaction (Verify Transaction)

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/ConfirmTransaction`

All the transactions need to be approved through this method to make them available for payment.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "pinNo": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "pinNo": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| PinNo | String | 20 | The Transactions which requesting approval | M |

---

## 5.20 Unverified Transaction

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/UnverifiedTransactions`

### JSON Request
```json
{
  "userName": "",
  "password": ""
}
```

---

## 5.21 Search Transaction

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/SearchTransaction`

The partner can retrieve the transaction status by calling this method. It also enables the partner to reconcile transactions within their system.

> **Note:** If the response is "Hold," then call the ConfirmTransaction method.

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "pinNo": "",
  "partnerPinNo": "",
  "fromDate": "",
  "toDate": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| UserName | String | 20 | api-key provided by Prabhu | M |
| Password | String | 20 | api-secret provided by Prabhu | M |
| PinNo | String | 20 | The PinNo whose status is to be known | O |
| PartnerPinNo | String | 100 | The PartnerPinNo whose status is to be known | O |
| FromDate | String | 10 | ISO8601 Date Standard (yyyy-mm-ddThh:mi:ss.mmm) | O |
| ToDate | String | 10 | ISO8601 Date Standard (yyyy-mm-ddThh:mi:ss.mmm) | O |

---

## 5.22 Get Balance

**URL:** `https://sandbox.prabhuindia.com/Sendapi/Send/GetBalance`

### JSON Request
```json
{
  "userName": "",
  "password": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "balance": "",
  "availableLimit": ""
}
```

---

## 5.23 Register Complaint

**URL:** `https://sandbox.prabhuindia.com/Sendapi//Send/RegisterComplaint`

### JSON Request
```json
{
  "userName": "",
  "password": "",
  "complainType": "",
  "mobileNumber": "",
  "referenceNumber": "",
  "ticketType": "",
  "category": "",
  "remarks": ""
}
```

### Request Fields

| Field Name | Data Type | Length | Description | M/O/C |
|-----------|-----------|--------|-------------|-------|
| userName | String | 20 | api-key provided by Prabhu | M |
| password | String | 20 | api-secret provided by Prabhu | M |
| complainType | String | 50 | Get value from GetStaticData Method with type ComplainType | M |
| mobileNumber | String | 10 | Mobile number of Remitter/Sender | M |
| referenceNumber | String | 16 | 16-digit transaction PIN — Mandatory if ComplainType is "Transaction" | C |
| ticketType | String | 10 | **Query, Complain** | M |
| category | String | 50 | Get value from GetStaticData Method with type ComplainCategory | M |
| remarks | String | 100 | Text Remarks on the complaint | M |

### Error Codes

| Error Code | Message |
|-----------|---------|
| 081 | Complain Type is Required |
| 082 | Ticket Type is Required |
| 083 | Complain Category is Required |
| 084 | Remarks is Required |
| 085 | Mobile Required |
| 087 | Reference Number is Required |
| 088 | Value Complain Type is not valid |
| 091 | Value is not valid Ticket Type. Should be either Query or Complain |
| 092 | The transaction with Reference No. not found |
| 093 | Sender Mobile is Invalid |

---

## 5.24 Track Complaint

**URL:** `https://sandbox.prabhuindia.com/Sendapi//Send/TrackComplaint`

### JSON Request
```json
{
  "userName": "{{api-key}}",
  "password": "{{api-secret}}",
  "complainId": ""
}
```

### JSON Response
```json
{
  "code": "",
  "message": "",
  "complains": [
    {
      "sno": "",
      "ticketNo": "",
      "complainType": "",
      "mobileNumber": "",
      "referenceNumber": "",
      "ticketType": "",
      "category": "",
      "remarks": "",
      "closedRemarks": "",
      "status": ""
    }
  ]
}
```

---

## 5.25 KYC Document Guidelines (ANNEXURE I)

KYC Document Guidelines for Physical KYC Approval (Citizenship '12' and Passport '4' as ID Types).

### Guidelines

1. **IDCardFront:** Upload the front side of the document with the OSV stamp, customer signature, and agent signature.
2. **IDCardBack:** Upload the back side of the KYC document.
3. **Additional:** Upload a photo of the customer holding their original ID in front of the sending counter, along with a proper authorization board.
4. Upload clear and legible copies of the documents.
5. The document must include:
   - Customer's signature
   - Customer's mobile number
6. The branch details must include:
   - Authorized signature
   - Shop/Agency name
   - Date
   - Mobile number
   - CSP Code

### Before Proceeding, Ensure the Following
- The customer photo clearly shows the customer holding their KYC document.
- The document is clear and readable.
- The branch OSV stamp and signature are present.
- The customer's signature is clearly visible.

---

# 6. POSTMAN ENVIRONMENT

> Source: SendAPI_JSON_PMT_postman_environment.json

## Environment Name: SendAPI_JSON_PMT

| Key | Value | Description |
|-----|-------|-------------|
| BaseURL | _(to be filled)_ | Base URL for the API |
| uri | _(to be filled)_ | URI |
| api-key | _(to be filled)_ | API Key (provided by Prabhu) |
| agentSessionId | _(to be filled)_ | Agent Session ID |
| protocol | _(to be filled)_ | Protocol |
| signature | _(to be filled)_ | HMAC Signature |
| agentTxnId | _(to be filled)_ | Agent Transaction ID |
| api-secret | _(to be filled)_ | API Secret (provided by Prabhu) |
| finalEncryptedString | _(to be filled)_ | Final Encrypted String |
| OTPProcessID | _(to be filled)_ | OTP Process ID |

> Exported at: 2026-03-23T08:44:16.869Z using Postman/11.86.5

---

## Quick Reference — All API Endpoints

### CSP Onboarding APIs (Base: `https://ekyc-sandbox.prabhuindia.com/testkya`)

| API | Full Endpoint |
|-----|--------------|
| Token Generation | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/auth/generatetoken` |
| E-KYA Initiate | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Initiate` |
| E-KYA Unique Ref Status | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Uniquerefstatus` |
| E-KYA Enrollment | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Enrollment` |
| Bio-KYC Requery | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/BioKYCRequery` |
| CSP Onboarding | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/onboarding` |
| Search CSP | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/SearchCSP` |
| Create CSP | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/CreateCSP` |
| CSP Mapping | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/CSPMapping` |
| Agent Consent Status | `https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/AgentConsent` |

### E-KYC APIs (Base: `https://ekyc-sandbox.prabhuindia.com/test/v1`)

| API | Full Endpoint |
|-----|--------------|
| Token Generation | `https://ekyc-sandbox.prabhuindia.com/test/v1/auth/generatetoken` |
| E-KYC Initiate | `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycinitiate` |
| E-KYC Unique Ref Status | `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycuniquerefstatus` |
| E-KYC Enrollment | `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/ekycenrollment` |
| Customer Onboarding | `https://ekyc-sandbox.prabhuindia.com/test/v1/customer/customeronboarding` |

### Send APIs (Base: `https://sandbox.prabhuindia.com/Sendapi`)

| API | Full Endpoint |
|-----|--------------|
| GetEcho | `https://sandbox.prabhuindia.com/Sendapi/Send/getEcho` |
| GetCustomerByMobile | `https://sandbox.prabhuindia.com/Sendapi/Send/GetCustomerByMobile` |
| GetCustomerById | `https://sandbox.prabhuindia.com/Sendapi/Send/GetCustomerById` |
| CreateCustomer | `https://sandbox.prabhuindia.com/Sendapi/Send/CreateCustomer` |
| CreateReceiver | `https://sandbox.prabhuindia.com/Sendapi/Send/CreateReceiver` |
| SendTransaction | `https://sandbox.prabhuindia.com/Sendapi/Send/SendTransaction` |
| ConfirmTransaction | `https://sandbox.prabhuindia.com/Sendapi/Send/ConfirmTransaction` |
| UnverifiedTransactions | `https://sandbox.prabhuindia.com/Sendapi/Send/UnverifiedTransactions` |
| SendOTP | `https://sandbox.prabhuindia.com/Sendapi/Send/SendOTP` |
| AcPayBankBranchList | `https://sandbox.prabhuindia.com/Sendapi/Send/GetAcPayBankBranchList` |
| GetServiceCharge | `https://sandbox.prabhuindia.com/Sendapi/Send/GetServiceCharge` |
| GetStateDistrict | `https://sandbox.prabhuindia.com/Sendapi/Send/GetStateDistrict` |
| GetStaticData | `https://sandbox.prabhuindia.com/Sendapi/Send/GetStaticData` |
| GetBalance | `https://sandbox.prabhuindia.com/Sendapi/Send/GetBalance` |
| UploadDocument | `https://sandbox.prabhuindia.com/Sendapi/Send/UploadDocument` |
| SearchTransaction | `https://sandbox.prabhuindia.com/Sendapi/Send/SearchTransaction` |
| RegisterComplaint | `https://sandbox.prabhuindia.com/Sendapi//Send/RegisterComplaint` |
| TrackComplaint | `https://sandbox.prabhuindia.com/Sendapi//Send/TrackComplaint` |

---

*Document compiled from all uploaded Prabhu Money Transfer API documents. All information is confidential and proprietary to Prabhu Money Transfer Private Limited.*
