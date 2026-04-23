# IME API Documentation — Complete Archive

## UAT Link

```
https://testsendapi.imeforex-txn.net/SendWsApi/IMEForexSendService.asmx
```

---

## File List

- Integration API Document (1.6) — without Aadhar — Phase 1
- AadharEntityReprocess — Phase 2
- API Integration for eKYC through Aadhar — Phase 2
- Master_Data_India_Updated.xlsx
- TERMS AND CONDITIONS OF INDO NEPAL MONEY TRANSFER SERVICE.docx
- UAT_Link.txt

---

## Terms and Conditions of Indo Nepal Money Transfer Service

The transaction is subject to the following:

- Payment is executed by the principal bank and **IME India Private Limited** (erstwhile IME Forex India Pvt Ltd) as per Reserve Bank of India guidelines on Indo Nepal Remittance Service.
- The customer alone is responsible for the accuracy of particulars in the payment order.
- The Bank and IME India Private Limited shall not be responsible for any loss caused due to wrong details furnished by the customer.
- The payment order becomes irrevocable once paid to the Beneficiary.
- The PIN/ICN No. is confidential and should only be disclosed to the intended beneficiary.
- Payment to the beneficiary in Nepal will be made per Nepal Rastra Bank guidelines.
- Credit to beneficiary bank account will take place within **1 working day (24 hours)**.
- The beneficiary must collect payment within **7 days** from date of transaction (RBI guidelines). In case of non-payment, the customer receives an SMS with OTP to present at the originating agent location for a refund (amount excluding charges).
- All issues are subject to the jurisdiction of courts at **Mumbai**.
- Queries: **+91-0120-4798200** | **support@imeindia.com** | **www.imeindia.com**

---

# PHASE 1 — Integration API Document v1.6 (Without Aadhar)

**IME FOREX — Web Service Interface Document — Indo Nepal Send API**
Version 1.6 | April 8, 2020 | www.imeforex.com

---

## 1. List of Methods — Web Service

| S.N. | Method Name | Description |
|------|-------------|-------------|
| 1 | GetStaticData | Get static data needed for other methods |
| 2 | CSPRegistration | Register the CSP |
| 3 | CSPDocumentUpload | Upload the CSP Documents |
| 4 | CSPCheck | Check the CSP status and its documents status |
| 5 | BalanceInquiry | Get available balance of agent |
| 6 | CheckCustomer | Verify the customer, whether customer is registered or not |
| 7 | SendOTP | Send OTP on customer number |
| 8 | CustomerRegistration | Register sending customer |
| 9 | ConfirmCustomerRegistration | Confirm CreateCustomer data with OTP verification |
| 10 | GetCalculation | Get the latest Exchange Rate and Service Charges |
| 11 | SendTransaction | Creates a new transaction. Requires ForexSessionID from GetCalculation |
| 12 | ConfirmSendTransaction | Confirm SendTransaction data with OTP verification |
| 13 | TransactionInquiry | Inquiry the status of transaction performed by agent |
| 14 | AmendmentTransaction | Modify transaction performed by agent |
| 15 | CancelTransaction | Cancel transaction performed by agent |
| 16 | ReconcileReport | Get list of transactions performed by agent |
| 17 | SOAReport | Statement of Account report of Agent |

---

## 2. Common Possible Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

## 3. Data Dictionary (GetStaticData)

**Method Name:** `GetStaticData`

### Request Codes

| S.N. | Type Code | Description (Static Data Name) |
|------|-----------|-------------------------------|
| 1 | WSST-CONV1 | Country List |
| 2 | WSST-STTV1 | Country State List |
| 3 | WSST-DISV1 | State District List |
| 4 | WSST-MUNV1 | District Municipality List |
| 5 | WSST-GDRV1 | Gender List |
| 6 | WSST-MSSV1 | Marital Status List |
| 7 | WSST-OCPV1 | Occupation List |
| 8 | WSST-SOFV1 | Source of Fund List |
| 9 | WSST-IDTV1 | Identification Type List |
| 10 | WSST-POIV1 | Place of Issue List |
| 11 | WSST-RELV1 | Relationship List |
| 12 | WSST-PORV1 | Purpose of Remit List |
| 13 | WSST-TCRV1 | Transaction Cancel Reason List |
| 14 | WSST-BKLV1 | Bank List |
| 15 | WSST-BBLV1 | Bank Branch List |
| 16 | WSST-REGV1 | CSP Registration Type List |
| 17 | WSST-ADPV1 | CSP Address Proof Type List |
| 18 | WSST-BUSV1 | CSP BusinessType List |
| 19 | WSST-ADOV1 | CSP Document Type List |
| 20 | WSST-ACCV1 | Account Type List |
| 21 | WSST-DEVV1 | Device List |
| 22 | WSST-CTVV1 | Connectivity Type List |
| 23 | WSST-CATV1 | Owner Category Type List |
| 24 | WSST-OAPV1 | Owner Address Proof Type List |
| 25 | WSST-PHCV1 | Physically Handicapped Type List |
| 26 | WSST-AOCV1 | Alternate Occupation Type List |
| 27 | WSST-OIDV1 | Owner Id Type List |
| 28 | WSST-EDQV1 | Educational Qualification List |
| 29 | WSST-ADCV1 | AdditionalCourse List |

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
            <ime:TypeCode>string</ime:TypeCode>
            <ime:ReferenceValue>string</ime:ReferenceValue>
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
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code of Partner |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| TypeCode | String | Y | 10 | Code that is used to fetch static data |
| ReferenceValue | String | N | 30 | Type Code reference value if needed |

### GetStaticData Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| RequestedTypeCode | Requested Type Code |
| Id | Data Id |
| Value | Data Name/Value |

**Note on ReferenceValue:**
- For Country State List (WSST-STTV1): Country code — `NPL` (Nepal), `IND` (India)
- For District List (WSST-DISV1): State ID of India or Nepal
- For Municipality List (WSST-MUNV1): District ID of Nepal
- For Identification Type List (WSST-IDTV1): Country code — `NPL` or `IND`
- For Issue Place List (WSST-POIV1): Identification Type ID
- For Bank Branch List (WSST-BBLV1): Bank ID

---

## 4. CSP Module

### CSP Module Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 603 | Parameter Missing |
| 604 | Bad Request (Invalid Input Value) |
| 605 | Balance Details Not Found |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 4.1 CSP Registration

**Method Name:** `CSPRegistration`

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
          <ContractExpiryDate>string</ContractExpiryDate>
          <ContractRenewalDate>string</ContractRenewalDate>
          <PANNumber>string</PANNumber>
        </CompanyProfile>
        <CompanyInfoDetails>
          <Country>string</Country>
          <State>string</State>
          <District>string</District>
          <City>string</City>
          <HouseNumber>string</HouseNumber>
          <RoadName>string</RoadName>
          <PINCode>string</PINCode>
          <AddressProofType>string</AddressProofType>
        </CompanyInfoDetails>
        <ContactPersonDetails>
          <ContactPersonName>string</ContactPersonName>
          <MobileNumber1>string</MobileNumber1>
          <MobileNumber2>string</MobileNumber2>
          <LandlineNumber>string</LandlineNumber>
          <Email>string</Email>
        </ContactPersonDetails>
        <BankDetails>
          <Bank>string</Bank>
          <AccountType>string</AccountType>
          <AccountNo>string</AccountNo>
          <IFSC>string</IFSC>
        </BankDetails>
        <DeviceConnectivityDetails>
          <Device>string</Device>
          <ConnectivityType>string</ConnectivityType>
          <Provider>string</Provider>
        </DeviceConnectivityDetails>
        <BusinessHourDetails>
          <StartTime>string</StartTime>
          <EndTime>string</EndTime>
          <HasWeekendOff>string</HasWeekendOff>
          <OffDay>string</OffDay>
        </BusinessHourDetails>
        <OwnerDetails>
          <OwnersInfoDetails>
            <OwnersName>string</OwnersName>
            <Gender>string</Gender>
            <DOB>string</DOB>
            <FatherName>string</FatherName>
            <SpouseName>string</SpouseName>
            <Category>string</Category>
            <PhysicallyHandicapped>string</PhysicallyHandicapped>
            <MobileNumber>string</MobileNumber>
            <ContactNumber>string</ContactNumber>
            <Email>string</Email>
            <AlternateOccupationType>string</AlternateOccupationType>
          </OwnersInfoDetails>
          <OwnerDocumentDetails>
            <PanCard>string</PanCard>
            <IdType>string</IdType>
            <IDTypeNumber>string</IDTypeNumber>
          </OwnerDocumentDetails>
          <OwnerAddressDetails>
            <Country>string</Country>
            <State>string</State>
            <District>string</District>
            <City>string</City>
            <HouseNumber>string</HouseNumber>
            <RoadName>string</RoadName>
            <PINCode>string</PINCode>
            <ResidentialAddressVillageCode>string</ResidentialAddressVillageCode>
            <AddressProofType>string</AddressProofType>
          </OwnerAddressDetails>
          <OwnerEducationDetails>
            <EducationalQualification>string</EducationalQualification>
            <AdditionalCourse>string</AdditionalCourse>
            <InstituteName>string</InstituteName>
            <DateofPassed>string</DateofPassed>
          </OwnerEducationDetails>
        </OwnerDetails>
      </CSPRegisterRequest>
    </CSPRegistration>
  </soap:Body>
</soapenv:Envelope>
```

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code of Partner |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| **CompanyProfile** | | | | |
| PartnerCSPCode | String | Y | 10 | Unique CSP Code in Partner System |
| CSPName | String | Y | 100 | Name of CSP |
| RegistrationType | String | Y | 10 | Registration Type (Id from GetStaticData) |
| RegistrationNumber | String | Y | 20 | Registration Number |
| BusinessType | String | Y | 10 | Business Type (Id from GetStaticData) |
| ContractExpiryDate | Date | Y | 20 | Format: YYYY/MM/DD |
| ContractRenewalDate | Date | Y | 20 | Format: YYYY/MM/DD |
| PANNumber | String | Y | 20 | CSP PAN Number |
| **CompanyInfoDetails** | | | | |
| Country | String | Y | 10 | Country Id from GetStaticData |
| State | String | Y | 10 | State Id from GetStaticData |
| District | String | Y | 10 | District Id from GetStaticData |
| City | String | Y | 100 | City Name |
| HouseNumber | String | Y | 20 | House Number |
| RoadName | String | Y | 200 | Road Name |
| PINCode | String | Y | 6 | PIN Code |
| AddressProofType | String | Y | 10 | Address Proof Type Id from GetStaticData |
| **ContactPersonDetails** | | | | |
| ContactPersonName | String | Y | 250 | Contact Person Name |
| MobileNumber1 | String | Y | 10 | Mobile Number 1 |
| MobileNumber2 | String | N | 10 | Mobile Number 2 |
| LandlineNumber | String | N | 11 | Landline Number |
| Email | String | Y | 100 | Contact Person Email |
| **BankDetails** (one or more) | | | | |
| Bank | String | Y | 10 | Bank Id (from GetStaticData, India) |
| AccountType | String | Y | 10 | Account Type Id from GetStaticData |
| AccountNo | String | Y | 30 | Bank Account Number |
| IFSC | String | Y | 30 | Bank IFSC |
| **DeviceConnectivityDetails** | | | | |
| Device | String | Y | 10 | Device Id from GetStaticData |
| ConnectivityType | String | Y | 10 | Connectivity Type Id from GetStaticData |
| Provider | String | Y | 100 | Internet Provider Name |
| **BusinessHourDetails** | | | | |
| StartTime | Time | Y | 10 | Format: HH:mm:ss |
| EndTime | Time | Y | 10 | Format: HH:mm:ss |
| HasWeekendOff | String | Y | 1 | Y = Yes, N = No |
| OffDay | String | N | 10 | Weekday Id from GetStaticData (mandatory if HasWeekendOff = Y) |
| **OwnerDetails** (one or more) | | | | |
| OwnersName | String | Y | 50 | CSP Owner Name |
| Gender | String | Y | 10 | Gender Id from GetStaticData |
| DOB | Date | Y | 20 | Format: YYYY/MM/DD |
| FatherName | String | Y | 50 | Father Name |
| SpouseName | String | N | 50 | Spouse Name |
| Category | String | N | 10 | Category Id from GetStaticData |
| PhysicallyHandicapped | String | N | 10 | Physically Handicapped Id from GetStaticData |
| MobileNumber | String | Y | 10 | Mobile Number |
| ContactNumber | String | N | 11 | Contact Number |
| Email | String | N | 50 | Owner Email |
| AlternateOccupationType | String | N | 10 | Alternate Occupation Type Id from GetStaticData |
| PanCard | String | Y | 20 | Owner PAN Card Number |
| IdType | String | Y | 10 | Id Type from GetStaticData |
| IDTypeNumber | String | Y | 50 | Owner Id Type Number |
| ResidentialAddressVillageCode | String | Y | 10 | Residential Address Village Code |
| EducationalQualification | String | Y | 10 | Educational Qualification Id from GetStaticData |
| AdditionalCourse | String | Y | 10 | Additional Course Id from GetStaticData |
| InstituteName | String | Y | 50 | Name of Institute |
| DateofPassed | String | Y | 50 | Date of Passed in Year |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| CSPName | Name of CSP |
| PartnerCSPCode | Unique CSP Code in Partner System |
| Status | Y – Active, N – Inactive |
| OwnerId | Owner Id in IME Forex System |
| OwnerName | Owner Name |
| BankId | Bank Id in IME Forex System |
| BankName | Bank Name |
| DocumentType | Document Type Id |
| Status (doc) | True – uploaded, False – not uploaded |
| ReferenceId | CSPCode / BankId / OwnerId |
| IsRequired | Yes – Mandatory, No – Optional |

---

### 4.2 CSP Document Upload

**Method Name:** `CSPDocumentUpload`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code of Partner |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| DocumentType | String | Y | 10 | Document Type Id from GetStaticData |
| ReferenceId | String | Y | 10 | Reference Id from CSPRegistration or CheckCSP |
| DocumentData | String | Y | 2 MB | Document data in Base64 String Format |
| DocumentFormat | String | Y | 10 | Supported: pdf, jpg, jpeg, png (no dot) |

---

### 4.3 Check CSP

**Method Name:** `CheckCSP`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code of Partner |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |

Response is identical to CSP Registration response.

---

### 4.4 Balance Inquiry

**Method Name:** `BalanceInquiry`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| Balance | Current Balance of Agent |

---

## 5. Customer Module

### Customer Module Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 503 | Parameter Missing |
| 504 | Bad Request (Invalid Input Value) |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 5.1 Register Customer

**Method Name:** `CustomerRegistration`

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
               <ime:MembershipId>string</ime:MembershipId>
               <ime:FirstName>string</ime:FirstName>
               <ime:MiddleName>string</ime:MiddleName>
               <ime:LastName>string</ime:LastName>
               <ime:Nationality>string</ime:Nationality>
               <ime:MaritalStatus>string</ime:MaritalStatus>
               <ime:DOB>date</ime:Dob>
               <ime:Gender>string</ime:Gender>
               <ime:FatherOrMotherName>string</ime:FatherOrMotherName>
               <ime:Email>string</ime:Email>
               <ime:Occupation>string</ime:Occupation>
               <ime:SourceOfFund>string</ime:SourceOfFund>
            </ime:CustomerDetails>
            <ime:PermanentAddresss>
               <ime:State>string</ime:State>
               <ime:District>string</ime:District>
               <ime:Municipality>string</ime:Municipality>
               <ime:Address>string</ime:Address>
               <ime:WardNo>string</ime:WardNo>
               <ime:Tole>string</ime:Tole>
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
               <ime:IssueDate>date</ime:IssueDate>
               <ime:ExpiryDate>date</ime:ExpiryDate>
               <ime:IdNoCitizenship>string</ime:IdNoCitizenship>
               <ime:IdIssuePlaceCitizenship>string</ime:IdIssuePlaceCitizenship>
               <ime:IdIssueDateCitizenship>date</ime:IdIssueDateCitizenship>
               <ime:PhotoData>string</ime:PhotoData>
               <ime:PhotoDataType>string</ime:PhotoDataType>
               <ime:IdData>string</ime:IdData>
               <ime:IdDataType>string</ime:IdDataType>
            </ime:IdentityDetails>
         </ime:RegisterCustomerRequest>
      </ime:CustomerRegistration>
   </soapenv:Body>
</soapenv:Envelope>
```

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| MobileNo | String | Y | 15 | Customer Mobile number |
| MembershipId | String | N | 10 | IME Forex Membership ID |
| FirstName | String | Y | 20 | Customer First Name |
| MiddleName | String | N | 20 | Customer Middle Name |
| LastName | String | Y | 20 | Customer Last Name |
| Nationality | String | Y | 3 | Country Id from GetStaticData |
| MaritalStatus | String | Y | 10 | Marital Status Id from GetStaticData |
| DOB | Date | Y | 20 | Format: YYYY/MM/DD |
| Gender | String | Y | 10 | Gender Id from GetStaticData |
| FatherOrMotherName | String | Y | 50 | Father or Mother Name |
| Email | String | N | 30 | Customer Email |
| Occupation | String | Y | 10 | Occupation Id from GetStaticData |
| SourceOfFund | String | N | 10 | Source of Fund Id from GetStaticData |
| **Permanent Address** | | | | |
| State | String | Y | 10 | State Id (per Nationality Country) |
| District | String | Y | 10 | District Id per State |
| Municipality | String | N | 10 | Mandatory if Nationality = NPL |
| Address | String | Y | 50 | Customer Permanent Address |
| WardNo | String | N | 10 | Ward Number |
| HouseNo | String | N | 20 | House Number |
| **Temporary Address** | | | | |
| State | String | Y | 10 | Temporary State of India |
| District | String | Y | 10 | Temporary District |
| Address | String | Y | 50 | Temporary Address |
| PostalCode | String | N | 20 | Temporary Postal Code |
| HouseNo | String | N | 20 | Temporary House Number |
| **Identity Details** | | | | |
| IdType | String | Y | 10 | Identity Type per Nationality |
| IdNo | String | Y | 20 | Identity Number |
| IDPlaceofIssue | String | N | 10 | Mandatory if Nationality = NPL |
| IssueDate | Date | Y | 20 | Format: YYYY/MM/DD |
| ExpiryDate | Date | N | 20 | Mandatory if ID has expiry |
| IdNoCitizenship | String | Mandatory if NPL & not Citizenship | 20 | Nepalese Citizenship Number |
| IdIssuePlaceCitizenship | String | Mandatory if NPL & not Citizenship | 10 | Nepal Id Issue Place |
| IdIssueDateCitizenship | Date | Mandatory if NPL & not Citizenship | 20 | Citizenship Date of Issue |
| PhotoData | String | N | 500KB | Base64 Personal Photo |
| PhotoDataType | String | N | 5 | pdf, jpg, jpeg, png |
| IdData | String | Y | 500KB | ID Image in Base64 |
| IdDataType | String | Y | 5 | pdf, jpg, jpeg, png |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| CustomerToken | Unique customer token id for confirm customer registration |

---

### 5.2 Send OTP

**Method Name:** `SendOTP`

#### Send OTP Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 703 | Parameter Missing |
| 704 | Bad Request (Invalid Input Value) |
| 706 | Sending OTP Very Quick / OTP Limit Exceeded |
| 708 | Transaction with REF No not found for CT, ST, MT, CR module |
| 901 | Technical Error |
| 999 | Internal Server Error |

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| Module | String | Y | 2 | CR / ST / MT / CT |
| ReferenceValue | String | Y | 20 | Reference number from respective module |

**Module values:**
- `CR` – Customer Registration (reference from CustomerRegistration)
- `ST` – Send Transaction (reference from SendTransaction)
- `MT` – Modify Transaction (ICN from ConfirmSendTransaction)
- `CT` – Cancel Transaction (ICN from ConfirmSendTransaction)

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| OTPToken | Unique Token ID for OTP verification |

---

### 5.3 Confirm Customer Registration

**Method Name:** `ConfirmCustomerRegistration`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| OTP | String | Y | 6 | OTP sent to customer mobile |
| CustomerToken | String | Y | 15 | Token from CustomerRegistration |
| OTPToken | String | Y | 100 | Token from SendOTP |

---

### 5.4 Check Customer

**Method Name:** `CheckCustomer`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| MobileNo | String | Y | 10 | Customer Mobile Number |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| Name | Name of Customer |
| MobileNo | Mobile number of Customer |
| AMLStatus | True – Eligible, False – Not Eligible for Indo Nepal Transaction |
| KYCStatus | Approved / Pending / Rejected |
| RejectedReason | If KYC Status is Rejected, gives rejected reason |
| NewMobileNo | New Mobile Number of customer |
| AmendmentStatus | Pending / Approved / Rejected |
| AmendmentMessage | Amendment message as per status |

---

## 6. Transaction Creation

### Transaction Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 103 | Required Field |
| 104 | Bad Request (Invalid Input Value) |
| 105 | Setup Required |
| 106 | Limit/Balance Expired or Not Enough |
| 107 | Forex ID expired or Already Used |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 6.1 Exchange Rate and Service Charge

**Method Name:** `GetCalculation`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| PayoutAgentId | String | N | 10 | Payout Bank Id (mandatory if PaymentType = B) |
| RemitAmount | String | Y | 20 | Amount for service charge calculation |
| PaymentType | String | Y | 10 | C = Cash Payment, B = Bank Deposit |
| PayoutCountry | String | Y | 15 | NPL (Nepal) |
| CalcBy | String | Y | 3 | C = Collection Amount, P = Payout Amount |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| ForexSessionId | Unique Session ID for Exchange Rate |
| CollectAmount | Total Amount to be collected from Customer including service charge |
| ServiceCharge | Service Charge in Collect Currency |
| ExchangeRate | Exchange Rate as of date |
| PayoutAmount | Total Payout Amount to Payout Country |
| PayoutCurrency | Payout Currency |

---

### 6.2 Send Transaction

**Method Name:** `SendTransaction`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| **Sender Details** | | | | |
| SenderName | String | Y | 100 | Sender Full Name |
| SenderMobileNo | String | Y | 15 | Registered Customer Mobile No (verify via CheckCustomer) |
| Occupation | String | Y | 10 | Occupation Id from GetStaticData |
| **Receiver Details** | | | | |
| ReceiverName | String | Y | 100 | Receiver Full Name |
| ReceiverAddress | String | Y | 100 | Receiver Address |
| ReceiverGender | String | Y | 15 | Receiver Gender |
| ReceiverMobileNo | String | Y | 15 | Receiver Mobile Number |
| ReceiverCity | String | N | 30 | Receiver City |
| ReceiverCountry | String | Y | 3 | Nepal |
| ReceiverState | String | Y | 10 | Receiver State Id from GetStaticData |
| ReceiverDistrict | String | Y | 10 | Receiver District Id from GetStaticData |
| ReceiverMunicipality | String | Y | 10 | Receiver Municipality Id from GetStaticData |
| **Transaction Details** | | | | |
| ForexSessionId | String | Y | 10 | From GetCalculation (must be unique) |
| AgentTxnRefId | String | Y | 20 | Unique Transaction ID of Agent |
| CollectAmount | String | Y | 20 | Amount collected from sender incl. service charge |
| PayoutAmount | String | Y | 20 | Amount receiver gets (in payout currency) |
| SourceOfFund | String | Y | 10 | Source of Fund Id from GetStaticData |
| Relationship | String | Y | 10 | Relationship Id from GetStaticData |
| PurposeOfRemittance | String | Y | 10 | Purpose of Remittance Id from GetStaticData |
| PaymentType | String | Y | 3 | C = Cash, B = Bank Deposit |
| BankId | String | Mandatory if Bank | 10 | Bank Id from GetStaticData |
| BankBranchId | String | Mandatory if Bank | 100 | Bank Branch Id from GetStaticData |
| BankAccountNumber | String | Mandatory if Bank | 30 | Beneficiary Bank Account Number |
| CalcBy | String | Y | 3 | C = Collection Amount, P = Payout Amount |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| RefNo | Unique reference number for confirm transaction |
| AgentTxnRefId | Unique Transaction ID of Agent |
| CollectAmount | Total Amount to be collected from Customer |
| ServiceCharge | Service Charge in Collect Currency |
| ExchangeRate | Exchange Rate as of date |
| PayoutAmount | Total Payout Amount |
| PayoutCurrency | Payout Currency |

---

### 6.3 Send OTP (for transaction)

Refer to Section 5.2. Use Module = `ST` and ReferenceValue = RefNo from SendTransaction.

---

### 6.4 Confirm Send Transaction

**Method Name:** `ConfirmSendTransaction`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| RefNo | String | Y | 20 | Reference number from SendTransaction |
| OTPToken | String | Y | 100 | Token from SendOTP |
| OTP | String | Y | 6 | OTP sent to sender mobile |

#### Response Parameters

| Field | Description |
|-------|-------------|
| RefNo | Unique ICN — beneficiary must provide this at payout location |
| AgentTxnRefId | Unique Transaction ID of Agent |
| CollectAmount | Total Amount to be collected |
| ServiceCharge | Service Charge |
| ExchangeRate | Exchange Rate |
| PayoutAmount | Total Payout Amount |
| PayoutCurrency | Payout Currency |

---

## 7. Modify Transaction

### Modify Transaction Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 103 | Parameter Missing |
| 104 | Bad Request (Invalid Input Value) |
| 108 | Transaction Not Found of supplied RefNo |
| 109 | Unauthorized |
| 403 | Parameter Missing (Amendment) |
| 404 | Bad Request (Amendment) |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 7.1 Transaction Inquiry

**Method Name:** `TransactionInquiry`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| RefNoType | String | Y | 1 | 1 = IME Forex Reference (ICN), 2 = Agent Transaction Reference Id |
| RefNo | String | Y | 20 | Reference number (per RefNoType) |

#### Response Parameters

| Field | Description |
|-------|-------------|
| RefNo | Unique ICN |
| SenderName | Sender Name |
| SenderGender | Sender Gender |
| SenderCountry | Sender Country |
| SenderMobileNo | Sender Mobile Number |
| SenderIdType | Sender Id Type |
| SenderEmail | Sender Email Address |
| ReceiverName | Receiver Name |
| ReceiverGender | Receiver Gender |
| ReceiverCountry | Receiver Country |
| ReceiverAddress | Receiver Address |
| ReceiverMobileNo | Receiver Mobile Number |
| ReceiverRelationWithSender | Receiver Relationship with Sender |
| TransferAmount | Transfer Amount (sending currency, without service charge) |
| ServiceCharge | Transaction Service Charge |
| CollectedAmount | Total Collected Amount |
| ExchangeRate | Exchange Rate |
| PayoutAmount | Total Payout Amount |
| PayoutCurrency | Payout Currency |
| SendingBranch | Sending Agent Branch |
| PaymentMethod | Payment Method |
| PurposeOfRemit | Purpose of Remittance |
| SourceOfFund | Source of Fund |
| TransactionDate | Transaction Creation Date |
| Status | Transaction status |
| PaidDate | Paid Date (if paid) |
| CancelDate | Cancel Date (if cancelled) |
| CancelCharge | Cancel Charge Amount (if cancelled) |

---

### 7.2 Modify Transaction

**Method Name:** `AmendmentTransaction`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| RefNo | String | Y | 20 | Unique ICN / transaction number |
| ReceiverName | String | — | 50 | Receiver Full Name |
| ReceiverGender | String | — | 10 | Receiver Gender |
| ReceiverAddress | String | — | 30 | Receiver Address |
| RelationWithSender | String | At least one mandatory | 10 | Relationship Id |
| PurposeOfRemittance | String | — | 10 | Purpose of Remittance Id |
| SourceOfFund | String | — | 10 | Source of Fund Id |
| ReceiverMobileNo | String | — | 15 | Receiver Mobile Number |
| BankId | String | — | 100 | Bank Id |
| BankBranchId | String | — | 10 | Bank Branch Id |
| AccountNo | String | — | 20 | Beneficiary Bank Account Number |
| OTP | String | Y | 6 | OTP sent to sender mobile |
| OTPToken | String | Y | 100 | Token from SendOTP |

---

## 8. Cancel Transaction

### Cancel Transaction Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 303 | Parameter Missing |
| 304 | Bad Request |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 8.1 Cancel Transaction

**Method Name:** `CancelTransaction`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| RefNo | String | Y | 20 | Unique ICN / transaction number |
| CancelReason | String | Y | 10 | Cancel Reason Id from GetStaticData |
| OTP | String | Y | 6 | OTP sent to sender mobile |
| OTPToken | String | Y | 100 | Token from SendOTP |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |
| RefId | Unique ICN |
| CollectedAmount | Total Collected Amount |
| ExchangeRate | Exchange Rate |
| ServiceCharge | Service Charge |
| PayoutAmount | Total Payout Amount |
| PayoutCurrency | Payout Currency |

---

## 9. Reports

### Reports Response Codes

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 803 | Parameter Missing |
| 804 | Bad Request |
| 809 | Report Record Not Found |
| 901 | Technical Error |
| 999 | Internal Server Error |

---

### 9.1 Reconcile Report

**Method Name:** `ReconcileReport`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| ReportType | String | Y | 1 | A = All, S = Sent Only, C = Cancel Only |
| FromDate | Date | Y | 20 | Format: YYYY/MM/DD |
| ToDate | Date | Y | 20 | Format: YYYY/MM/DD |

#### Response Parameters

| Field | Description |
|-------|-------------|
| RefNo | Unique ICN |
| AgentTxnRefId | Agent Transaction Reference |
| SenderName | Sender Name |
| ReceiverName | Receiver Name |
| ReceiverCountry | Receiver Country |
| ServiceCharge | Service Charge |
| ServiceChargeCurrency | Service Charge Currency |
| CollectedAmount | Collected Amount |
| CollectedAmountCurrency | Collection Amount Currency |
| PayoutAmount | Total Payout Amount |
| PayoutCurrency | Payout Currency |
| SendingAgent | Sending Agent |
| SendingBranch | Sending Agent Branch |
| TransactionDate | Transaction Creation Date |
| Status | Transaction status |
| PaidDate | Transaction Paid Date |
| PayoutAgent | Transaction paying Agent |
| CancelDate | Transaction Cancel Date |
| CancelCharge | Transaction Cancel Charge |

---

### 9.2 Statement of Account

**Method Name:** `SOAReport`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| FromDate | Date | Y | 20 | Format: YYYY/MM/DD |
| ToDate | Date | Y | 20 | Format: YYYY/MM/DD |

#### Response Parameters

| Field | Description |
|-------|-------------|
| Date | Date |
| Particulars | Particulars of transaction |
| DR | Debit Amount |
| CR | Credit Amount |
| Balance | Amount after DR or CR |
| Indicator | Debit (DR) or Credit (CR) |
| Narration | Remark for the transaction |

---

# PHASE 2 — Aadhar Entity Reprocess

**IME FOREX — Web Service Interface Document — Version 1.2 | April 8, 2020**

---

## 1. Aadhar Entity Reprocess

This method clears processes of entities enrolled through Aadhar.

**Method Name:** `AadharEntityReprocess`

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
| AccessCode | String | Y | 10 | Unique code assigned to Agent |
| UserName | String | Y | 20 | Username of Agent |
| Password | String | Y | 20 | Password of Agent |
| PartnerBranchId | String | Y | 10 | Unique Partner Branch Id or CSP Code of Partner |
| AgentSessionId | String | Y | 30 | Unique Session ID of Agent |
| EntityType | String | Y | 10 | 201 = CSP, 203 = Customer |
| EntityId | String | Y | 20 | For CSP: Partner Branch ID. For Customer: Mobile Number |
| ReProcessState | String | Y | — | Value from StaticData TYPE CODE = WSST-AERV1 |

### Response Parameters

| Field | Description |
|-------|-------------|
| Code | 0 if Success otherwise error code |
| Message | Success/Error Message |
| AgentSessionId | Unique Session ID of Agent |

---

# PHASE 2 — API Integration for eKYC through Aadhar

**IME India Private Limited — CSP and Customer Registration through RBL**
Version 1.1 | June 6, 2025 | www.imeindia.com

---

## 1. List of Methods — eKYC Web Service

| S.N. | Method Name | Description |
|------|-------------|-------------|
| 1 | GetStaticData | Get static data needed for other methods |
| 2 | GetUniqueId | Opening URL to retrieve unique identifier per entity type |
| 3 | GenerateOTT | Generate a One-Time Token (OTT) for Customer or CSP |
| 4 | BioKyc | Process Biometric data with PID base64 encoded |
| 5 | CSPOnboarding | CSP Onboarding after KYC Verification |
| 6 | CSPConsent | Register CSP details and Sync status |
| 7 | CheckEntityStatus | Check current process and Txn eligibility |
| 8 | AadharCustomerRegistration | Aadhar Customer Enrollment |
| 9 | SendOTP | Send OTP for confirmation |
| 10 | CustomerOnboarding | Customer Onboarding after KYC verification |
| 11 | CustomerRequery | Retrieves comprehensive customer information |

---

## 2. Common Response Codes (eKYC)

| Response Code | Response Message |
|---------------|-----------------|
| 0 | Success |
| 101 | Authentication Failed |
| 102 | Need to change Password. Contact HO |
| 901 | Technical Error |
| 999 | Internal Server Error |
| Others | Validation or Database Errors |

---

## 3. Additional Static Data Codes (Phase 2 additions)

In addition to Phase 1 codes, Phase 2 adds:

| S.N. | Type Code | Description |
|------|-----------|-------------|
| 30 | WSST-OBAV1 | Owner By Agent List |
| 31 | WSST-BBAV1 | Bank By Agent List |
| 32 | WSST-CAIV1 | Customer Annual Income List |

**Note:** ReferenceValue for WSST-OBAV1 and WSST-BBAV1 = Agent Id

---

## 4. CSP Registration — eKYC Phase 2

OTP Consent URL:
```
https://uiduat.rblbank.com/PrepaidCustomerLogin/PPIAgentEkyc.aspx?ref=n4VqHQe13IbA/4uRcwC7/Q==
```

### 4.1 Generate OTT

**Method:** POST | **Endpoint:** `/GenerateOTT`

Generates a One-Time Token (OTT) for Customer or CSP to facilitate secure transactions/validations. Geo-location must be enabled when accessing the OTT URL.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code for authentication |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID for the agent |
| EntityType | String | Y | 3 | 201 = CSP, 203 = Customer |
| EntityId | String | Y | 30 | For CSP: Partner Branch ID. For Customer: Mobile Number |
| OTPToken | String | N | 100 | Required only for Customer entity (203) |
| OTP | String | N | 4 | Required only for Customer entity (203) |
| Owner | String | Y | 10 | Owner information |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | Response code (0 = success) |
| Message | Response message |
| AgentSessionId | Session ID for the agent |
| Status | Current status of OTT generation |
| Url | URL to be opened for further processing (geo-location required) |

---

### 4.2 Get Unique ID

**Method:** POST | **Endpoint:** `/UniqueIdentifier`

Called after opening the URL from GenerateOTT and successfully validating Aadhaar number.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | 201 = CSP, 203 = Customer |
| EntityId | String | Y | 30 | For CSP: Partner Branch ID. For Customer: Mobile Number |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 if Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | Current status: RBLUnique Identifier |

---

### 4.3 Bio KYC

**Method:** POST | **Endpoint:** `/BioKyc`

Processes biometric KYC verification via integration with RBL eKYC service.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | 201 = CSP, 203 = Customer |
| EntityId | String | Y | 30 | For CSP: Partner Branch ID. For Customer: Mobile Number |
| Pid | String | Y | — | Base64 encoded biometric data (PID XML) |

#### Bio KYC Response Codes

| Response Code | Response Message | Description |
|---------------|-----------------|-------------|
| 0 | Success | KYC verification completed successfully |
| 102 | Re-initiated | Restart from GenerateOTT |
| 504 | Invalid Entity Type | The provided EntityType is invalid |
| 504 | Three attempts done. Please Contact HO. | Maximum attempts reached |
| 504 | Invalid Pid Data | Biometric data is invalid or malformed |
| 999 | Internal Server Error | Internal server error |

**Important Notes:**
- If response code ≠ 0 and message contains "Three attempts done" → contact HO to reinitiate.
- After HO reinitiation, BioKYC returns code 102 ("Re-initiated, Proceed from GenerateOTT") — restart from GenerateOTT.
- Normal Success: code = 0 → proceed.
- Reinitiated: code = 102 → start from GenerateOTT.

---

### 4.4 CSP Onboarding

**Method:** POST | **Endpoint:** `/CSPOnboarding`

Used to onboard CSP after KYC is complete.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityId | String | Y | 30 | CSP: Partner Branch ID |
| **Additional Info** | | | | |
| Accountnumber | String | Y | 30 | Agent Account Number |
| AgentAccountName | String | Y | 100 | Agent Account Name |
| Ifsccode | String | Y | 100 | Bank IFSC Code |
| Bankname | String | Y | 100 | Agent Bank Name |
| Branchname | String | Y | 100 | Bank Branch Name |
| Institutename | String | Y | 100 | Agent Educational Institute Name |
| Dateofpassing | String | Y | — | Format: YYYY/MM/DD |
| Nooftransactionperday | String | Y | 10 | No of transactions per day |
| Transferamountperday | String | Y | 10 | Transfer amount per day |
| Settlementdays | String | Y | 10 | Settlement time in days |
| Expectedannualturnover | String | Y | 10 | Expected annual turnover in Amount |
| Expectedannualincome | String | Y | 10 | Expected annual income in Amount |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 if Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | CSPOnboarding |
| PanValidationStatus | Status of name match between Aadhar and PAN |

**Notes:**
- If PanValidationStatus = "Success" → proceed to call OTP consent URL → after OTP validation, agent is approved → call CSP Consent API.
- If PanValidationStatus = "Name not matched, Verification pending with OPS" → do NOT call OTP consent URL; call CSP Consent API after a while.

---

### 4.5 CSP Consent

**Method:** POST | **Endpoint:** `/CSPConsent`

Registers CSP details and syncs status.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityId | String | Y | 30 | CSP: Partner Branch ID |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 if Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | Request status |
| PanValidationStatus | Status of name match between Aadhar and PAN |
| BankApprovalStatus | 0=Pending, 1=On Process, 2=Details Required, 3=Hold, 4=Validation Completed, 5=Document Uploaded, 6=Approved, 7=Rejected, 8=Blocked, 9=CP APPROVED LIST, 10=Re-Upload, 11=Bank Maker verified |
| Remarks | Agent(eKYC) / Verification pending with OPS / OTP consent pending / Approved by RBLOPS / Rejected by RBL OPS Team |

**BankApprovalStatus Handling:**

| Status | Remarks | Action |
|--------|---------|--------|
| 6 | Agent(eKYC) | Success |
| 6 | Verification pending with RBL OPS | Wait for OPS response; check status (TAT 24 hrs) |
| 6 | Approved By RBLOPS | Success |
| 7 | Rejected by RBL OPS Team | Rejected; upload documents manually |

---

### 4.6 Check Entity Status

**Method:** POST | **Endpoint:** `/CheckEntityStatus`

Checks current CSP/Customer onboarding stage and transaction eligibility.

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityType | String | Y | 3 | 201 = CSP, 203 = Customer |
| EntityId | String | Y | 30 | For CSP: Partner Branch ID. For Customer: Mobile Number |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 if Success |
| Message | Response message |
| AgentSessionId | Session ID |
| Status | Current status |
| IsEligibleForTxn | Y = Eligible, N = Not Eligible for Transaction |

---

### 4.7 Existing Agent Match

**Method:** POST | **Endpoint:** `/ExistingAgentMatch`

Used in case of existing name match during CSP onboarding.

Request and response parameters are same as CSP Consent (section 4.5).

---

## 5. Customer Registration — eKYC Phase 2

### 5.1 Aadhar Customer Registration

**Method Name:** `AadharCustomerRegistration`

#### Request XML Example

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
    <PhotoData />
    <PhotoDataType />
    <IdData />
    <IdDataType />
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
| FullName | String | Y | 100 | Customer Full Name |
| MaritalStatus | String | Y | 10 | Marital Status Id |
| DOB | String | Y | 10 | Format: YYYY/MM/DD |
| Occupation | String | Y | 10 | Occupation Id |
| Email | String | Y | 30 | Valid email format |
| MobileNo | String | Y | 10 | Exactly 10 digits |
| Gender | String | Y | 10 | Gender Id |
| SourceOfFund | String | Y | 10 | Source of Fund Id |
| EstimatedAnnualIncome | String | Y | 10 | Annual Income Id |
| Country | String | Y | 10 | Country Id |
| State | String | Y | 10 | State Id |
| District | String | Y | 10 | District Id |
| Address | String | Y | 100 | Full Address |
| PinCode | String | Y | 30 | Valid postal code |
| AadharNo | String | Y | 12 | Valid Aadhaar format |
| PhotoData | String | N | 500KB | Base64 personal photo |
| PhotoDataType | String | N | 5 | pdf, jpg, jpeg, png |
| IdData | String | N | 500KB | Base64 ID image |
| IdDataType | String | N | 5 | pdf, jpg, jpeg, png |

#### Response Parameters

| Parameter | Description |
|-----------|-------------|
| Code | 0 if Success |
| Message | Response message |
| AgentSessionId | Session ID |
| CustomerToken | Unique customer token id for confirm customer registration |

---

### 5.2 Send OTP (Customer Registration)

Same as Phase 1 Section 5.2. Use Module = `CR`.

---

### 5.3–5.4 Generate OTT / Get Unique ID (for Customer)

Same as CSP sections 4.1 and 4.2 but with EntityType = `203` (Customer) and EntityId = Mobile Number.

For GenerateOTT in customer context, OTPToken and OTP are mandatory.

---

### 5.5 Bio KYC (for Customer)

Same as CSP section 4.3. Use EntityType = `203`.

---

### 5.6 Customer Onboarding

**Method:** POST | **Endpoint:** `/CustomerOnboarding`

#### Request Parameters

| Parameter | Type | Mandatory | Length | Description |
|-----------|------|-----------|--------|-------------|
| AccessCode | String | Y | 10 | Access code |
| UserName | String | Y | 20 | Username |
| Password | String | Y | 20 | Password |
| PartnerBranchId | String | Y | 10 | Partner branch ID |
| AgentSessionId | String | Y | 30 | Session ID |
| EntityId | String | Y | 30 | Customer Mobile Number |

**Response Status:** `CustomerOnboarding`

---

### 5.7 Customer Requery

**Method:** POST | **Endpoint:** `/CustomerRequery`

Retrieves comprehensive customer information.

Request parameters same as Customer Onboarding. Response Status: `Success`.

---

### 5.8 Check Entity Status (for Customer)

Same as CSP section 4.6. Use EntityType = `203`.

---

# Master Data — India (Static Values)

## Gender List

| ID | Name |
|----|------|
| 1801 | Male |
| 1802 | Female |
| 1803 | Third |

## Marital Status List

| ID | Name |
|----|------|
| 1901 | Married |
| 1902 | UnMarried |

## Occupation List

| ID | Name |
|----|------|
| 8080 | Businessman |
| 8081 | Salaried |
| 8082 | Self employed |
| 8083 | Retiree |
| 8084 | Student |
| 8085 | Housewife |
| 8086 | Armed police personnel (Police, Army etc.) |
| 8087 | Government employee |
| 8088 | Professional worker (farmer, teacher, engineer, doctor, lawyer etc.) |
| 8089 | Unemployed |

## Source Of Fund List

| ID | Name |
|----|------|
| 8051 | Salary |
| 8052 | Business |
| 8070 | Salary / Wages |
| 8071 | Bonus / Commission |
| 8073 | Savings or accumulated |
| 8074 | Part time job |
| 8075 | Own business |
| 8076 | Investment |
| 8077 | Lottery |
| 8078 | Gifts and donation |
| 8079 | Loan from bank |

## Id Type Nepal List

| ID | Name |
|----|------|
| 1301 | Citizenship |
| 1302 | Passport |

## Place Of Issue List (Nepal)

| ID | Name |
|----|------|
| 5001 | Ilam |
| 5002 | Jhapa |
| 5003 | Panchthar |
| 5004 | Taplejung |
| 5005 | Bhojpur |
| 5006 | Dhankuta |
| 5007 | Morang |
| 5008 | Sankhuwasabha |
| 5009 | Sunsari |
| 5010 | Terhathum |
| 5011 | Khotang |
| 5012 | Okhaldhunga |
| 5013 | Saptari |
| 5014 | Siraha |
| 5015 | Solukhumbu |
| 5016 | Udayapur |
| 5017 | Dhanusa |
| 5018 | Dolakha |
| 5019 | Mahottari |
| 5020 | Ramechhap |
| 5021 | Sarlahi |
| 5022 | Sindhuli |
| 5023 | Bhaktapur |
| 5024 | Dhading |
| 5025 | Kathmandu |
| 5026 | Kavrepalanchok |
| 5027 | Lalitpur |
| 5028 | Nuwakot |
| 5029 | Rasuwa |
| 5030 | Sindhupalchok |
| 5031 | Gorkha |
| 5032 | Kaski |
| 5033 | Lamjung |
| 5034 | Manang |
| 5035 | Syangja |
| 5036 | Tanahu |
| 5037 | Bara |
| 5038 | Chitawan |
| 5039 | Makwanpur |
| 5040 | Parsa |
| 5041 | Rautahat |
| 5042 | Dolpa |
| 5043 | Humla |
| 5044 | Jumla |
| 5045 | Kalikot |
| 5046 | Mugu |
| 5047 | Dang |
| 5048 | Pyuthan |
| 5049 | Rolpa |
| 5050 | Rukum |
| 5051 | Salyan |
| 5052 | Banke |
| 5053 | Bardiya |
| 5054 | Dailekh |
| 5055 | Jajarkot |
| 5056 | Surkhet |
| 5057 | Achham |
| 5058 | Bajhang |
| 5059 | Bajura |
| 5060 | Doti |
| 5061 | Kailali |
| 5062 | Baglung |
| 5063 | Mustang |
| 5064 | Myagdi |
| 5065 | Parbat |
| 5066 | Arghakhanchi |
| 5067 | Gulmi |
| 5068 | Kapilvastu |
| 5069 | Nawalparasi |
| 5070 | Palpa |
| 5071 | Rupandehi |
| 5072 | Baitadi |
| 5073 | Dadeldhura |
| 5074 | Darchula |
| 5075 | Kanchanpur |
| 5076 | Rukum West |
| 5077 | Nawalparasi West |

## Relationship List

| ID | Name |
|----|------|
| 2101 | Father |
| 2102 | Mother |
| 2103 | Grand Father |
| 2104 | Grand Mother |
| 2105 | Husband |
| 2106 | Wife |
| 2107 | Father in Law |
| 2108 | Mother in Law |
| 2109 | Brother |
| 2110 | Brother in Law |
| 2111 | Sister |
| 2112 | Sister in Law |
| 2113 | Son |
| 2114 | Daughter |
| 2115 | Uncle |
| 2116 | Aunty |
| 2117 | Cousin |
| 2118 | Nephew |
| 2119 | Niece |
| 2121 | Self |
| 8011 | Spouse |

## Purpose Of Remittance List

| ID | Name |
|----|------|
| 3801 | Family Maintenance |

## Cancel Reason List

| ID | Name |
|----|------|
| 7701 | Sender Has Cancel by themselves |
| 7703 | Remittance Amount is wrong |
| 7704 | Beneficiary is unable to collect the funds |

## CSP Registration Type List

| ID | Name |
|----|------|
| 4501 | Proprietorship Firm |
| 4502 | Partnership Firm |
| 15203 | Company |

## CSP Business Type List

| ID | Name |
|----|------|
| 6200 | Remittance |
| 6201 | Commercial Bank |
| 6202 | Development Bank |
| 6203 | Finance |
| 6204 | Cooperative |
| 6205 | Travel Agency |
| 6206 | Cyber |

## CSP Address Proof Type List

| ID | Name |
|----|------|
| 16901 | Establishment Certificate |
| 16902 | Business License |
| 16903 | Electricity Bill |
| 16904 | Telephone Bill |

## Bank Account Type List

| ID | Name |
|----|------|
| 16201 | Current |
| 16202 | Personal |

## Device List

| ID | Name |
|----|------|
| 16001 | Laptop/Desktop |
| 16002 | Handheld |

## Connectivity Type List

| ID | Name |
|----|------|
| 16101 | Landline |
| 16102 | Mobile |
| 16103 | VSAT |

## Category List (Owner)

| ID | Name |
|----|------|
| 16301 | GENERAL |
| 16302 | OBC |
| 16303 | SC |
| 16304 | ST |

## Physically Handicapped List

| ID | Name |
|----|------|
| 16401 | Handicapped |
| 16402 | Not Handicapped |

## Alternate Occupation Type List

| ID | Name |
|----|------|
| 16501 | Government |
| 16502 | Public Sector |
| 16503 | Self Employed |
| 16504 | Private |
| 16505 | Other |
| 16506 | None |

## Owner Id Type List

| ID | Name |
|----|------|
| 16801 | Adhaar Card |
| 16802 | Voters Id Card |
| 16803 | Driver License |
| 16804 | NREGA Card |
| 16805 | Passport |

## Educational Qualification List

| ID | Name |
|----|------|
| 16601 | Under 10th |
| 16602 | 10th |
| 16603 | 12th |
| 16604 | Private |
| 16605 | Graduate |
| 16606 | Post Graduate |
| 16607 | Others |

## Additional Course List

| ID | Name |
|----|------|
| 16701 | IIBF Advance |
| 16702 | IIBF Basic Certified By Bank |
| 16703 | None |

## Owners Address Proof List

| ID | Name |
|----|------|
| 17101 | Adhaar Card |
| 17102 | Voters Id Card |
| 17103 | Driver License |
| 17104 | NREGA Card |
| 17105 | Passport Number |

## Document Type List

| ID | Name |
|----|------|
| 17001 | CompanyPANCard |
| 17002 | CompanyEstablishmentCertificate |
| 17003 | CompanyAddressProof |
| 17004 | CompanyCancelledCheque |
| 17005 | CSPForm |
| 17006 | OwnersPANCard |
| 17007 | OwnersAddressProof |
| 17008 | MOA |
| 17009 | AOA |
| 17010 | Board Resolution |
| 17011 | Pan Card of the CA |
| 17012 | Certificate of Incorporation |
| 17013 | KYC of Directors |
| 17014 | KYC of authorized signatory |
| 17015 | Shareholding Pattern |

---

*End of IME API Documentation Archive*
