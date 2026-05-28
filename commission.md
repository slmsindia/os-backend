# 📘 Commission API — Beginner Developer Guide

> **Yeh document un developers ke liye hai jo Commission module ko samajhna chahte hain.**  
> Har API endpoint ko simple bhasha mein explain kiya gaya hai — kya karta hai, kab use karte hain, aur request payload kaisi hoti hai.

---

## 📌 Table of Contents

1. [Commission Schemes (Schemes CRUD)](#1-commission-schemes)
2. [Commission Services](#2-commission-services)
3. [Commission Sub-Services](#3-commission-sub-services)
4. [Commission Share (Rules Setup)](#4-commission-share)
5. [Transactions](#5-transactions)
6. [Commission History](#6-commission-history)
7. [Wallet History](#7-wallet-history)
8. [Super Admin Income](#8-super-admin-income)
9. [Helper / Dropdown APIs](#9-helper--dropdown-apis)

---

## Kuch Zaroori Concepts (Pehle Padho)

| Term | Matlab |
|------|--------|
| **Commission Scheme** | Ek "plan" jisme define hota hai ki kaunse service pe kitna commission milega |
| **Service** | Jaise: Recharge, Bill Payment, Insurance |
| **Sub-Service** | Service ke andar ka type, jaise: Electricity Bill, Water Bill |
| **Admin** | Super Admin ka commission share |
| **State Partner** | State level partner ka share |
| **District Partner** | District level partner ka share |
| **Saathi** | Local level agent ka share |
| **Member** | End user ka share |
| **Referral** | Referral bonus |
| **commissionType** | `1` = Percentage, `2` = Flat Amount |
| **isActive** | `true` = Active, `false` = Inactive |
| **UUID** | Unique ID format — example: `"3fa85f64-5717-4562-b3fc-2c963f66afa6"` |

---

## 1. Commission Schemes

> **Scheme kya hoti hai?**  
> Soch lo ek "pricing plan" hai — jaise "Plan A" ya "Plan B". Alag-alag users ko alag scheme assign kar sakte ho. Har scheme mein different commission rules hote hain.

---

### 1.1 Sabhi Schemes List Karo

```
GET /api/Commission/GetCommissionSchemes
```

**Kab use karo:** Jab screen pe saari schemes dikhani ho dropdown ya table mein.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | ❌ No | Kisi specific user ki schemes filter karna ho |
| `isActive` | boolean | ❌ No | Sirf active ya inactive schemes chahiye? |

**Example Request URL:**
```
GET /api/Commission/GetCommissionSchemes?isActive=true
```

---

### 1.2 Ek Scheme Ka Detail Lo (ID se)

```
GET /api/Commission/GetCommissionSchemeById?Id={schemeId}
```

**Kab use karo:** Jab ek specific scheme ki detail page open karni ho.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Id` | UUID | ✅ Yes | Scheme ka unique ID |

---

### 1.3 Nayi Scheme Banao

```
POST /api/Commission/AddCommissionSchemes
```

**Kab use karo:** Jab admin ek naya commission plan banana chahta ho.

**Request Body (JSON):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Standard Plan"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ Yes | Naye scheme ka unique ID (frontend generate kare) |
| `name` | string | ✅ Yes | Scheme ka naam, jaise "Gold Plan" |

---

### 1.4 Scheme Update Karo

```
PUT /api/Commission/UpdateCommissionSchemes
```

**Kab use karo:** Jab existing scheme ka naam change karna ho.

**Request Body (JSON):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Updated Plan Name"
}
```

---

### 1.5 Scheme Ko Active/Inactive Karo

```
GET /api/Commission/UpdateCommissionSchemeStatus?schemeId={id}&isActive=true
```

**Kab use karo:** Toggle button se scheme enable/disable karna ho.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemeId` | UUID | ✅ Yes | Scheme ka ID |
| `isActive` | boolean | ✅ Yes | `true` = Active, `false` = Inactive |

---

## 2. Commission Services

> **Service kya hoti hai?**  
> Yeh top-level category hai — jaise "Mobile Recharge", "Electricity", "Insurance". Commission rules inhi services pe set hote hain.

---

### 2.1 Sabhi Services List Karo

```
GET /api/Commission/GetCommissionServices?isActive=true
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `isActive` | boolean | ❌ No | Filter active/inactive services |

---

### 2.2 Service Ka Status Change Karo

```
GET /api/Commission/UpdateCommissionServiceStatus?serviceId={id}&isActive=true
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceId` | UUID | ✅ Yes | Service ka ID |
| `isActive` | boolean | ✅ Yes | Enable ya disable karna |

---

## 3. Commission Sub-Services

> **Sub-Service kya hoti hai?**  
> Service ke andar aur categories — jaise "Electricity" service ke andar "MSEB", "BESCOM" alag sub-services hain.

---

### 3.1 Ek Service Ki Sub-Services Lo

```
GET /api/Commission/GetCommissionSubServices?serviceId={id}&isActive=true
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceId` | UUID | ✅ Yes | Jis service ki sub-services chahiye |
| `isActive` | boolean | ❌ No | Active/inactive filter |

---

### 3.2 Sub-Service Ka Status Change Karo

```
GET /api/Commission/UpdateCommissionSubServiceStatus?subServiceId={id}&isActive=true
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subServiceId` | UUID | ✅ Yes | Sub-service ka ID |
| `isActive` | boolean | ✅ Yes | Enable ya disable karna |

---

### 3.3 Services aur Sub-Services Saath Mein Lo

```
GET /api/Commission/GetServicesSubServices?isActive=true
```

**Kab use karo:** Jab ek hi call mein sari services aur unke sub-services ka nested data chahiye ho (form dropdown ke liye useful).

---

### 3.4 Kisi Scheme Ki Services aur Sub-Services Lo

```
GET /api/Commission/GetServiceSubServiceBySchemeId?SchemeID={id}
```

**Kab use karo:** Jab ek specific scheme pe kaun si services mapped hain, yeh dekhna ho.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SchemeID` | UUID | ✅ Yes | Scheme ka ID |

---

## 4. Commission Share

> **Commission Share kya hota hai?**  
> Yeh wo rule hai jisme batate hain ki ek transaction pe kitna % ya kitni flat amount — Admin ko milegi, State Partner ko milegi, Saathi ko milegi, etc.

---

### 4.1 Nayi Commission Share Rules Add Karo (Puri Scheme ke liye)

```
POST /api/Commission/AddCommissionShare
```

**Kab use karo:** Jab naye scheme ke liye pehli baar saare service/sub-service ke liye commission rules set karne ho.

**Request Body (JSON):**
```json
{
  "schemeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "services": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Electricity",
      "subServices": [
        {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "name": "MSEB",
          "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "serviceName": "Electricity",
          "type": 1,
          "baseType": 1,
          "admin": 10,
          "statePartner": 5,
          "districtPartner": 3,
          "saathi": 2,
          "member": 1,
          "referral": 0.5,
          "referralMinAmount": 100
        }
      ]
    }
  ]
}
```

**Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `schemeId` | UUID | Kis scheme ke liye rules set ho rahe hain |
| `services[].id` | UUID | Service ID |
| `services[].name` | string | Service naam |
| `subServices[].id` | UUID | Sub-service ID |
| `subServices[].name` | string | Sub-service naam |
| `subServices[].type` | int | Commission type: `1` = Percentage, `2` = Flat |
| `subServices[].baseType` | int | Base amount type |
| `subServices[].admin` | number | Admin ko milne wala share |
| `subServices[].statePartner` | number | State partner ka share |
| `subServices[].districtPartner` | number | District partner ka share |
| `subServices[].saathi` | number | Saathi ka share |
| `subServices[].member` | number | Member ka share |
| `subServices[].referral` | number | Referral bonus |
| `subServices[].referralMinAmount` | number | Referral ke liye minimum transaction amount |

---

### 4.2 Commission Share Update Karo (Puri Scheme)

```
PUT /api/Commission/UpdateCommissionShare
```

**Kab use karo:** Jab kisi scheme ke existing rules change karne ho.

**Request Body:** Same as `AddCommissionShare` — sirf existing values update ho jaati hain.

---

### 4.3 Sirf Ek Sub-Service Ka Commission Update Karo

```
POST /api/Commission/UpdateSingleCommissionShare
```

**Kab use karo:** Jab sirf ek specific sub-service ka commission rule change karna ho, puri scheme update kiye bina.

**Request Body (JSON):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "subServiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "schemeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "commissionType": 1,
  "admin": 10,
  "statePartner": 5,
  "districtPartner": 3,
  "saathi": 2,
  "member": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Is record ka ID (agar existing update ho) |
| `subServiceId` | UUID | Kaun si sub-service update ho rahi hai |
| `schemeId` | UUID | Kaun si scheme mein hai yeh rule |
| `commissionType` | int | `1` = Percentage, `2` = Flat Amount |
| `admin` | number | Admin share |
| `statePartner` | number | State partner share |
| `districtPartner` | number | District partner share |
| `saathi` | number | Saathi share |
| `member` | number | Member share |

---

## 5. Transactions

> **Transaction kya hota hai?**  
> Jab koi user koi service use karta hai (jaise bill payment), toh ek transaction record banta hai. Yahan pe unhe filter, search, aur export kar sakte ho.

---

### 5.1 Saari Transactions List Karo (Paginated + Filtered)

```
POST /api/Commission/GetAllTransactions
```

**Request Body (JSON):**
```json
{
  "pageNumber": 1,
  "pageSize": 10,
  "searchTerm": "John",
  "sortBy": "createdDate",
  "sortOrder": 0,
  "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "subServiceID": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-04-26T23:59:59.000Z",
  "transactionDoneById": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "transactionDoneForId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "isDataExport": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pageNumber` | int | ✅ Yes | Kaun sa page chahiye (1 se start karo) |
| `pageSize` | int | ✅ Yes | Ek page mein kitne records |
| `searchTerm` | string | ❌ No | Naam ya kuch aur search karna |
| `sortBy` | string | ❌ No | Kis column se sort karo |
| `sortOrder` | int | ❌ No | `0` = Ascending, `1` = Descending |
| `serviceId` | UUID | ❌ No | Specific service filter |
| `subServiceID` | UUID | ❌ No | Specific sub-service filter |
| `startDate` | datetime | ❌ No | Start date filter (ISO 8601 format) |
| `endDate` | datetime | ❌ No | End date filter |
| `transactionDoneById` | UUID | ❌ No | Kisne transaction kiya |
| `transactionDoneForId` | UUID | ❌ No | Kiske liye transaction hua |
| `isDataExport` | boolean | ❌ No | `true` karo agar Excel/CSV export karna ho |

---

## 6. Commission History

> **Commission History kya hoti hai?**  
> Jab bhi transaction hota hai, har partner/user ko jo commission mila — uska record yahan store hota hai. Isse track karte hain ki kisne kitna kamaya.

---

### 6.1 Commission History Add Karo (Manual)

```
GET /api/Commission/AddCommissionHistory
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | ✅ Yes | Kiska commission record add karna hai |
| `serviceId` | UUID | ✅ Yes | Kaun si service ke liye |
| `transactionId` | UUID | ✅ Yes | Kaun si transaction se linked hai |
| `amount` | number | ✅ Yes | Commission amount |

---

### 6.2 Commission History List Lo (Paginated + Filtered)

```
POST /api/Commission/GetCommissionHistory
```

**Request Body (JSON):**
```json
{
  "pageNumber": 1,
  "pageSize": 10,
  "searchTerm": "",
  "sortBy": "createdDate",
  "sortOrder": 0,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-04-26T23:59:59.000Z",
  "subServiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "transactionDoneById": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "transactionDoneForId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "isDataExport": false,
  "childId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "parentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "relationStartDate": "2026-01-01T00:00:00.000Z",
  "relationEndDate": "2026-04-26T23:59:59.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pageNumber`, `pageSize` | int | Pagination |
| `startDate`, `endDate` | datetime | Date range filter |
| `serviceId`, `subServiceId` | UUID | Service filter |
| `transactionDoneById` | UUID | Kisne transaction kiya |
| `transactionDoneForId` | UUID | Kiske liye kiya |
| `childId` | UUID | Child user ka filter (hierarchy ke liye) |
| `parentId` | UUID | Parent user ka filter |
| `relationStartDate`, `relationEndDate` | datetime | Parent-child relation ki date range |
| `isDataExport` | boolean | `true` = Export mode |

---

## 7. Wallet History

> **Wallet kya hota hai?**  
> Har user ke paas ek virtual wallet hota hai. Commission aane pe wallet credit hota hai, aur withdrawal pe debit. Yeh API wallet transactions show karti hai.

---

### 7.1 Wallet History Lo

```
POST /api/Commission/GetWalletHistory
```

**Request Body (JSON):**
```json
{
  "pageNumber": 1,
  "pageSize": 10,
  "searchTerm": "",
  "sortBy": "createdDate",
  "sortOrder": 0,
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-04-26T23:59:59.000Z",
  "accountType": "commission",
  "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "subServiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "isDataExport": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `userId` | UUID | Kiske wallet ki history chahiye |
| `accountType` | string | Account ka type — jaise `"commission"`, `"main"` |
| `serviceId`, `subServiceId` | UUID | Service filter |
| `isDataExport` | boolean | Export ke liye `true` |

---

## 8. Super Admin Income

> **Super Admin Income kya hoti hai?**  
> System mein jo bhi transactions hote hain, usme se admin ka share — yeh sab yahan track hota hai. Finance reporting ke liye use hota hai.

---

### 8.1 Super Admin Income List Lo

```
POST /api/Commission/GetSuperAdminIncome
```

**Request Body (JSON):**
```json
{
  "pageNumber": 1,
  "pageSize": 10,
  "searchTerm": "",
  "sortBy": "createdDate",
  "sortOrder": 0,
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-04-26T23:59:59.000Z",
  "transactionTypeFilter": "credit",
  "serviceFilter": "Electricity",
  "isDataExport": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `transactionTypeFilter` | string | Transaction type — jaise `"credit"`, `"debit"` |
| `serviceFilter` | string | Service naam se filter |
| `isDataExport` | boolean | `true` = Excel/CSV export |

---

## 9. Helper / Dropdown APIs

> Yeh APIs sirf dropdowns aur filters populate karne ke liye hain. Inhe UI components mein use karo.

---

### 9.1 Transaction "Credited By" Dropdown

```
GET /api/Commission/TransactionLogCredtedByDropdown
```

**Kab use karo:** Filter mein "credited by" ka dropdown banana ho.

---

### 9.2 Transaction "Credited For" Dropdown

```
GET /api/Commission/TransactionLogCredtedForDropdown
```

**Kab use karo:** Filter mein "credited for" ka dropdown banana ho.

---

## ⚡ Quick Reference — Saari APIs Ek Jagah

| # | Method | Endpoint | Kya karta hai |
|---|--------|----------|----------------|
| 1 | GET | `/Commission/GetCommissionSchemes` | Saari schemes list |
| 2 | GET | `/Commission/GetCommissionSchemeById` | Ek scheme detail |
| 3 | POST | `/Commission/AddCommissionSchemes` | Nayi scheme banao |
| 4 | PUT | `/Commission/UpdateCommissionSchemes` | Scheme update karo |
| 5 | GET | `/Commission/UpdateCommissionSchemeStatus` | Scheme active/inactive karo |
| 6 | GET | `/Commission/GetCommissionServices` | Services list |
| 7 | GET | `/Commission/UpdateCommissionServiceStatus` | Service active/inactive karo |
| 8 | GET | `/Commission/GetCommissionSubServices` | Sub-services list |
| 9 | GET | `/Commission/UpdateCommissionSubServiceStatus` | Sub-service active/inactive karo |
| 10 | GET | `/Commission/GetServicesSubServices` | Services + Sub-services saath |
| 11 | GET | `/Commission/GetServiceSubServiceBySchemeId` | Scheme ke mapped services |
| 12 | POST | `/Commission/AddCommissionShare` | Commission rules add karo |
| 13 | PUT | `/Commission/UpdateCommissionShare` | Commission rules update karo |
| 14 | POST | `/Commission/UpdateSingleCommissionShare` | Ek sub-service ka rule update |
| 15 | POST | `/Commission/GetAllTransactions` | Transactions list |
| 16 | GET | `/Commission/AddCommissionHistory` | Commission history add |
| 17 | POST | `/Commission/GetCommissionHistory` | Commission history list |
| 18 | GET | `/Commission/TransactionLogCredtedByDropdown` | "By" dropdown |
| 19 | GET | `/Commission/TransactionLogCredtedForDropdown` | "For" dropdown |
| 20 | POST | `/Commission/GetWalletHistory` | Wallet history |
| 21 | POST | `/Commission/GetSuperAdminIncome` | Admin income report |

---

## 🧭 Naya Developer — Kahan se Shuru Karo?

```
Step 1: Schemes samjho
  → GetCommissionSchemes call karo, saari schemes dekho

Step 2: Services dekho
  → GetCommissionServices se services list lo
  → GetCommissionSubServices se sub-services lo

Step 3: Commission rules dekho
  → GetServiceSubServiceBySchemeId se ek scheme ke rules dekho

Step 4: Transactions dekho
  → GetAllTransactions call karo basic filters ke saath

Step 5: Commission history dekho
  → GetCommissionHistory call karo date range filter ke saath
```

---

*Document Version: 1.0 | Last Updated: April 2026*
