# Account API Documentation

A quick reference for all `/api/Account` endpoints. All requests use JSON bodies unless noted.

---

## 1. Create Add Money Request
**POST** `/api/Account/CreateAddMoneyRequest`

Submit a manual bank deposit request for wallet top-up.

| Field | Type | Description |
|---|---|---|
| `bankID` | uuid | Bank used for the deposit |
| `userId` | uuid | User making the request |
| `amount` | number | Amount to add |
| `transactionReferenceNo` | string | Bank transaction reference |
| `transactionDate` | datetime | Date/time of transaction |
| `reciept` | string | Base64-encoded receipt image |
| `recieptName` | string | File name of the receipt |

---

## 2. Get Add Money Requests
**POST** `/api/Account/GetAddMoneyRequests`

Fetch paginated list of deposit requests with filters.

| Field | Type | Description |
|---|---|---|
| `pageNumber` | int | Page index (starts at 0) |
| `pageSize` | int | Records per page |
| `searchTerm` | string | Filter by keyword |
| `sortBy` | string | Column to sort on |
| `sortOrder` | int | `0` = asc, `1` = desc |
| `startDate` | datetime | Filter from date |
| `endDate` | datetime | Filter to date |
| `status` | int | Request status filter |
| `bankId` | uuid | Filter by bank |
| `currentUserId` | uuid | Current logged-in user |
| `isDataExport` | bool | `true` to return all records for export |

---

## 3. Approve / Reject Request
**POST** `/api/Account/ApproveRejectRequest`

Approve or reject a pending deposit request.

| Field | Type | Description |
|---|---|---|
| `requestId` | uuid | ID of the deposit request |
| `status` | bool | `true` = approve, `false` = reject |
| `rejectReason` | string | Required when rejecting |
| `userId` | uuid | Admin performing the action |

---

## 4. Get Deposit Receipt (by path param)
**POST** `/api/Account/GetDepositReceipt/{requestId}`

Download receipt file for a deposit request.

| Param | Location | Description |
|---|---|---|
| `requestId` | path | ID of the deposit request |
| `requestId` | query | Same ID (also accepted as query param) |

---

## 5. Add Money via Payment Gateway
**POST** `/api/Account/AddMoneyByPaymentGateway`

Top up wallet through an online payment gateway.

| Field | Type | Description |
|---|---|---|
| `userId` | uuid | User receiving the funds |
| `amount` | number | Amount to add |
| `transactionReferenceNo` | string | Gateway transaction reference |

---

## 6. Wallet Deduct
**PUT** `/api/Account/WalletDeduct`

Deduct balance from a user's wallet. All params passed as query strings.

| Query Param | Type | Description |
|---|---|---|
| `deductUserId` | uuid | Target user's ID |
| `deductAmount` | double | Amount to deduct |
| `reason` | string | Reason for deduction |

---

## 7. Search User for Wallet Deduction
**GET** `/api/Account/SearchUserForWalletDeduction`

Search users before performing a manual wallet deduction.

| Query Param | Type | Description |
|---|---|---|
| `searchTerm` | string | Name, email, or ID to search |

---

## 8. NEFT/RTGS Payment Status
**POST** `/api/Account/NEFT_RTGSPaymentStatus`

Handle incoming payment status callback from NEFT/RTGS bank integration.

| Field | Type | Description |
|---|---|---|
| `bankType` | string | Bank type identifier |
| `encData` | string | Encrypted payload from bank |

---

## 9. Create NEFT/RTGS Request
**POST** `/api/Account/CreateNEFT_RTGSRequest`

Manually register an NEFT/RTGS transfer into the system.

| Field | Type | Description |
|---|---|---|
| `utrno` | string | Unique Transaction Reference number |
| `tranID` | string | Bank transaction ID |
| `amount` | string | Transfer amount |
| `tranDate` | string | Date of transfer |
| `van` | string | Virtual Account Number |
| `tranType` | string | Transaction type (NEFT / RTGS) |
| `errorCode` | string | Error code if transfer failed |

---

## 10. Get Deposit Receipt (by query param)
**GET** `/api/Account/GetDepositeReceipt`

Download receipt for a deposit. Same purpose as endpoint #4, accessed via GET.

| Query Param | Type | Description |
|---|---|---|
| `requestId` | uuid | ID of the deposit request |

---

## Notes

- All `uuid` fields follow the format `3fa85f64-5717-4562-b3fc-2c963f66afa6`.
- `datetime` fields use ISO 8601 format: `2026-04-26T14:07:55.431Z`.
- Receipt files (`reciept`) should be Base64-encoded strings.
- All endpoints return HTTP `200 OK` on success.
