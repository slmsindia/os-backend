const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.IME_AUDIT_BASE_URL || 'http://localhost:3005';
const PREFIX = '/api/ime';

const randomDigits = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
const testMobile = `98${randomDigits(8)}`;
const txRef = `TXN-${Date.now()}`;

const defaultBody = {
  CustomerId: 'CUS-DEMO-001',
  ReceiverId: 'RCV-DEMO-001',
  customerId: 'CUS-DEMO-001',
  receiverId: 'RCV-DEMO-001',
  transactionId: '__TXN_REF__',
  mobile: '__MOBILE__',
  PhoneNumber: '__MOBILE__',
  reason: 'Test cancellation'
};

const customerPayload = {
  MobileNo: '__MOBILE__',
  FirstName: 'Test',
  LastName: 'Customer',
  Gender: 'M',
  DateOfBirth: '1990-01-01',
  IDType: 'PP',
  IDNumber: `N${randomDigits(7)}`,
  IdPlaceOfIssue: 'KATHMANDU',
  PhoneNumber: '__MOBILE__',
  Nationality: 'NPL',
  MaritalStatus: 'Single',
  FatherOrMotherName: 'Demo Parent',
  Occupation: 'Service',
  State: 'Bagmati',
  District: 'Kathmandu',
  Municipality: 'Kathmandu',
  Address: 'Test Address',
  IDIssueDate: '2020-01-01',
  IdNoCitizenship: `${randomDigits(4)}${randomDigits(6)}`,
  IdIssuePlaceCitizenship: 'KATHMANDU',
  IdIssueDateCitizenship: '2018/01/01',
  IdData: '.',
  PhotoData: '.',
  PhotoDataType: 'image/jpeg',
  IdDataType: 'image/jpeg'
};

const receiverPayload = {
  CustomerId: 'CUS-DEMO-001',
  FirstName: 'Recv',
  LastName: 'One',
  IDType: 'PP',
  IDNumber: `R${randomDigits(7)}`,
  IdPlaceOfIssue: 'KATHMANDU',
  IDIssueDate: '2020-01-01',
  IdNoCitizenship: `${randomDigits(4)}${randomDigits(6)}`,
  IdIssuePlaceCitizenship: 'KATHMANDU',
  IdIssueDateCitizenship: '2018/01/01',
  PhoneNumber: '__MOBILE__'
};

const sendMoneyPayload = {
  SenderCustomerId: 'CUS-DEMO-001',
  ReceiverCustomerId: 'RCV-DEMO-001',
  SenderName: 'Sandesh Pandey',
  ReceiverName: 'Ram Bahadur',
  SenderMobileNo: '__MOBILE__',
  ReceiverMobileNo: '__MOBILE__',
  ReceiverAddress: 'Kathmandu',
  ReceiverCountry: 'NPL',
  ReceiverState: 'Bagmati',
  ReceiverDistrict: 'Kathmandu',
  ReceiverMunicipality: 'Kathmandu',
  AgentTxnRefId: '__TXN_REF__',
  Amount: 1000,
  SourceCurrency: 'INR',
  DestinationCurrency: 'NPR',
  PaymentMode: 'CASH'
};

const endpoints = [
  { method: 'POST', path: '/authenticate', body: {} },
  { method: 'POST', path: '/login', body: {} },

  { method: 'POST', path: '/customers', body: customerPayload },
  { method: 'POST', path: '/customers/send-otp', body: { PhoneNumber: '__MOBILE__', Module: 'IME' } },
  { method: 'POST', path: '/customers/confirm', body: { CustomerToken: '__CUSTOMER_TOKEN__', OTPToken: '__OTP_TOKEN__', OTP: '123456' } },
  { method: 'GET', path: '/customers/search/mobile/__MOBILE__' },
  { method: 'GET', path: '/customers/CUS-DEMO-001' },
  { method: 'POST', path: '/customers/validate', body: { CustomerId: 'CUS-DEMO-001' } },

  { method: 'POST', path: '/transactions/send', body: sendMoneyPayload },
  { method: 'GET', path: '/transactions/__TXN_REF__/status' },
  { method: 'POST', path: '/transactions/__TXN_REF__/cancel', body: { reason: 'Test cancel reason' } },

  { method: 'POST', path: '/receivers', body: receiverPayload },
  { method: 'GET', path: '/receivers/RCV-DEMO-001' },
  { method: 'PATCH', path: '/receivers/RCV-DEMO-001', body: { NewMobileNo: '9800000002' } },

  { method: 'GET', path: '/data' },
  { method: 'POST', path: '/data', body: { name: 'IME Test User', mobile: '9800000000', relationship: 'Self', sendAmountInr: 1000, receiveAmountNpr: 1600 } },
  { method: 'PATCH', path: '/data/__IME_DATA_ID__', body: { name: 'IME Test User Updated', mobile: '9800000000', relationship: 'Self', sendAmountInr: 1200, receiveAmountNpr: 1920 } },
  { method: 'DELETE', path: '/data/__IME_DATA_ID__' },

  { method: 'GET', path: '/payment-modes' },
  { method: 'POST', path: '/bank-accounts/validate', body: { BankCode: 'NABIL', AccountNumber: '1234567890', CountryCode: 'NP' } },
  { method: 'GET', path: '/banks?country=NP' },

  { method: 'POST', path: '/kyc/verify', body: { CustomerId: 'CUS-DEMO-001', IDType: 'NP_ID', IDNumber: '1234567890' } },
  { method: 'GET', path: '/compliance/CUS-DEMO-001/status' },

  { method: 'GET', path: '/customers/CUS-DEMO-001/transactions' },
  { method: 'GET', path: '/exchange-rate?from=USD&to=NPR' }
];

const replaceTokensInString = (input, ctx) => {
  return String(input)
    .replace(/__MOBILE__/g, ctx.mobile)
    .replace(/__TXN_REF__/g, ctx.txRef)
    .replace(/__IME_DATA_ID__/g, ctx.imeDataId || 'IME-DATA-DEMO-ID')
    .replace(/__CUSTOMER_TOKEN__/g, ctx.customerToken || 'demo-customer-token')
    .replace(/__OTP_TOKEN__/g, ctx.otpToken || 'demo-otp-token');
};

const deepReplaceTokens = (value, ctx) => {
  if (Array.isArray(value)) {
    return value.map((item) => deepReplaceTokens(item, ctx));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepReplaceTokens(v, ctx)]));
  }
  if (typeof value === 'string') {
    return replaceTokensInString(value, ctx);
  }
  return value;
};

const firstSoapObject = (responseData) => {
  const arr = Array.isArray(responseData?.data) ? responseData.data : [];
  return arr.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
};

const captureDynamicValues = (ctx, endpoint, responseData) => {
  if (!responseData || typeof responseData !== 'object') return;

  if (endpoint.path === '/data' && endpoint.method === 'POST') {
    ctx.imeDataId = responseData?.data?.id || responseData?.id || ctx.imeDataId;
  }

  const soap = firstSoapObject(responseData);
  const sendOtp = soap.SendOTPResponse;
  if (sendOtp?.OTPToken) {
    ctx.otpToken = String(sendOtp.OTPToken);
  }

  const customerReg = soap.CustomerRegistrationResult;
  if (customerReg?.CustomerToken) {
    ctx.customerToken = String(customerReg.CustomerToken);
  }

  const sendTx = soap.SendTransactionResponse;
  if (sendTx?.RefNo) {
    ctx.txRef = String(sendTx.RefNo);
  }
};

const run = async () => {
  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    prefix: PREFIX,
    totalEndpoints: endpoints.length,
    results: []
  };

  const context = {
    mobile: testMobile,
    txRef,
    imeDataId: null,
    customerToken: null,
    otpToken: null
  };

  for (const endpoint of endpoints) {
    const endpointPath = replaceTokensInString(endpoint.path, context);
    const url = `${BASE_URL}${PREFIX}${endpointPath}`;
    const requestBody = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(endpoint.method)
      ? deepReplaceTokens({ ...defaultBody, ...(endpoint.body || {}) }, context)
      : undefined;

    try {
      const response = await axios({
        method: endpoint.method,
        url,
        data: requestBody,
        timeout: 60000,
        validateStatus: () => true
      });

      const responseData = response.data;
      captureDynamicValues(context, endpoint, responseData);

      output.results.push({
        method: endpoint.method,
        path: `${PREFIX}${endpointPath}`,
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        requestBody: requestBody || null,
        response: responseData
      });
    } catch (error) {
      output.results.push({
        method: endpoint.method,
        path: `${PREFIX}${endpointPath}`,
        status: error.response?.status || 0,
        ok: false,
        requestBody: requestBody || null,
        response: error.response?.data || { message: error.message }
      });
    }
  }

  const targetPath = path.join(process.cwd(), 'ime.json');
  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf8');

  const successCount = output.results.filter((item) => item.ok).length;
  console.log(`Saved ${output.results.length} endpoint results to ${targetPath}`);
  console.log(`HTTP 2xx: ${successCount}, non-2xx: ${output.results.length - successCount}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
