# IME Development Flow and User Features

## Overview
This document explains the development flow and features implemented for the IME (Online Saathi) application, focusing on user registration and OTP functionality.

## Development Flow

### 1. User Registration Process
- **Step 1**: User enters mobile number
- **Step 2**: OTP verification via SMS
- **Step 3**: User fills registration form (name, gender, DOB, password)
- **Step 4**: Account creation as normal user

### 2. Key Features Implemented

#### OTP Sending
- **Development Mode**: Previously skipped SMS sending in development. Now sends SMS if API credentials are configured.
- **Production Mode**: Always sends SMS if credentials are set.
- **Fallback**: If SMS API fails, logs error but doesn't break the flow.

#### User Registration
- **Account Type**: Removed "Requested Account Type" selection for first-time users.
- **Default Role**: All new users register as "USER" (normal user).
- **Validation**: Mobile number validation (10 digits, starts with 6-9), password strength, required fields.

#### Database Seeding
- **Tenants**: Localhost, localhost:5173, localhost:5174
- **Roles**: ADMIN, STATE_PARTNER, DISTRICT_PARTNER, AGENT, USER
- **Permissions**: VIEW_DASHBOARD, MANAGE_USERS, SEND_OTP

### 3. Technical Changes

#### Backend (os-backend)
- **sms.service.js**: Modified to send SMS in development if API configured
- **auth.controller.js**: Register function defaults to USER identity
- **seed.js**: Enhanced error logging for debugging

#### Frontend (os-frontend)
- **RegisterPage.jsx**: Removed userType state and account type select field
- **AuthContext.jsx**: Register function passes data to API

### 4. Environment Variables Required
Add these to `.env` file in os-backend:

```
# IME UAT Credentials (added)
IME_BASE_URL=https://api.imeforex-txn.net/SendWsApi/IMEForexSendService.asmx
IME_ACCESS_CODE=IMEIN7821
IME_PARTNER_BRANCH_ID=IMEIN7821
IME_AGENT_SESSION_ID=SAATHI108
IME_USERNAME=subhlaxmi
IME_PASSWORD=subhlaxmi@123
IME_ACTIVE=true

# Other required vars
SMS_API_URL=...
SMS_API_KEY=...
SENDER_ID=...
DLT_TEMPLATE_ID=...
SMS_PEID=...
REDIS_URL=redis://localhost:6379
NODE_ENV=development
DATABASE_URL=postgresql://...
```

### 5. Testing
- Start backend: `npm run dev` in os-backend
- Start frontend: `npm run dev` in os-frontend
- Register with mobile 7041897207 to test OTP flow

### 6. IME UAT Login Test Result
- **Status:** FAILED
- **Reason:** Connection timeout (ETIMEDOUT) to IME server
- **URL:** https://api.imeforex-txn.net/SendWsApi/IMEForexSendService.asmx?wsdl

## Next Steps
- Contact IME support to whitelist IP 122.173.72.96 for UAT access
- Once whitelisted, re-run test_ime.js to verify login
- Add IME UAT credentials to env
- Test SMS sending in development
- Deploy to production

## IME Endpoint Mapping

All IME requests exposed in Swagger go through the backend route prefix `/api/ime`, then the service layer converts them into SOAP calls against `IME_BASE_URL`.

| Swagger Path | Backend Route | Controller | IME Service Method | Upstream SOAP Operation |
| --- | --- | --- | --- | --- |
| `/api/ime/authenticate` | `POST /api/ime/authenticate` | `authenticate` | `authenticate()` | `BalanceInquiry` |
| `/api/ime/login` | `POST /api/ime/login` | `login` | `login()` | `BalanceInquiry` |
| `/api/ime/customers` | `POST /api/ime/customers` | `createCustomer` | `createCustomer()` | `CustomerRegistration` |
| `/api/ime/customers/{customerId}` | `GET /api/ime/customers/:customerId` | `getCustomer` | `getCustomer()` | `CheckCustomer` |
| `/api/ime/customers/search/mobile/{mobile}` | `GET /api/ime/customers/search/mobile/:mobile` | `searchCustomerByMobile` | `searchCustomerByMobile()` | `CheckCustomer` |
| `/api/ime/customers/validate` | `POST /api/ime/customers/validate` | `validateCustomer` | `validateCustomer()` | `CheckCustomer` |
| `/api/ime/transactions/send` | `POST /api/ime/transactions/send` | `sendMoney` | `sendMoney()` | `SendTransaction` |
| `/api/ime/transactions/{transactionId}/status` | `GET /api/ime/transactions/:transactionId/status` | `getTransactionStatus` | `getTransactionStatus()` | `TransactionInquiry` |
| `/api/ime/transactions/{transactionId}/cancel` | `POST /api/ime/transactions/:transactionId/cancel` | `cancelTransaction` | `cancelTransaction()` | `CancelTransaction` |
| `/api/ime/receivers` | `POST /api/ime/receivers` | `createReceiver` | `createReceiver()` | `CustomerRegistration` |
| `/api/ime/receivers/{receiverId}` | `GET /api/ime/receivers/:receiverId` | `getReceiver` | `getReceiver()` | `CheckCustomer` |
| `/api/ime/receivers/{receiverId}` | `PATCH /api/ime/receivers/:receiverId` | `updateReceiver` | `updateReceiver()` | `CustomerMobileAmendment` |
| `/api/ime/payment-modes` | `GET /api/ime/payment-modes` | `getPaymentModes` | `getPaymentModes()` | `GetStaticData` |
| `/api/ime/bank-accounts/validate` | `POST /api/ime/bank-accounts/validate` | `validateBankAccount` | `validateBankAccount()` | `GetCalculation_V2` |
| `/api/ime/banks` | `GET /api/ime/banks` | `getBankList` | `getBankList()` | `GetStaticData` |
| `/api/ime/kyc/verify` | `POST /api/ime/kyc/verify` | `verifyKYC` | `verifyKYC()` | `CheckCustomer` |
| `/api/ime/compliance/{customerId}/status` | `GET /api/ime/compliance/:customerId/status` | `getComplianceStatus` | `getComplianceStatus()` | `CheckCSP` |
| `/api/ime/customers/{customerId}/transactions` | `GET /api/ime/customers/:customerId/transactions` | `getTransactionHistory` | `getTransactionHistory()` | `ReconcileReport` |
| `/api/ime/exchange-rate` | `GET /api/ime/exchange-rate?from=USD&to=NPR` | `getExchangeRate` | `getExchangeRate()` | `GetCalculation_V2` |

### Notes
- The Swagger route is the public API your frontend should call.
- The backend service then calls the IME SOAP provider using `IME_BASE_URL` from `.env`.
- For customer mobile lookup, use `GET /api/ime/customers/search/mobile/{mobile}`.
- Current live IME UAT responses are returning `Code: 101` until the provider unlocks the account.