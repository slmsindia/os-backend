const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.PRABHU_AUDIT_BASE_URL || 'http://localhost:3005';
const PREFIX = '/api/Prabhu';

const defaultPostBody = {
  agentSessionId: String(Math.round(Date.now() / 1000)),
  mobile: '9800000000',
  customerMobile: '9800000000',
  customerIdNo: 'ID-DEMO-001',
  pinNo: '1234567890',
  type: 'paymentMode',
  country: 'Nepal'
};

const endpoints = [
  { method: 'POST', path: '/GetStateDistrict', body: { country: 'Nepal' } },
  { method: 'POST', path: '/GetStaticData', body: { type: 'paymentMode' } },
  { method: 'POST', path: '/GetEcho', body: {} },
  { method: 'POST', path: '/GetCashPayLocationList', body: {} },
  { method: 'POST', path: '/GetAcPayBankBranchList', body: {} },
  { method: 'POST', path: '/GetBalance', body: {} },
  { method: 'POST', path: '/SendOTP', body: { customerMobile: '9800000000' } },
  { method: 'POST', path: '/GetServiceCharge', body: {} },
  { method: 'POST', path: '/GetServiceChargeByCollection', body: {} },
  { method: 'POST', path: '/CancelTransaction', body: { pinNo: '1234567890' } },
  { method: 'POST', path: '/UnverifiedTransactions', body: {} },
  { method: 'POST', path: '/ComplianceTransactions', body: {} },
  { method: 'POST', path: '/UploadDocument', body: {} },
  { method: 'POST', path: '/SendTransaction', body: {} },
  { method: 'POST', path: '/ConfirmTransaction', body: {} },
  { method: 'POST', path: '/SearchTransaction', body: { pinNo: '1234567890' } },
  { method: 'POST', path: '/ValidateBankAccount', body: {} },
  { method: 'POST', path: '/CreateReceiver', body: {} },
  { method: 'POST', path: '/CreateCustomer', body: {} },
  { method: 'POST', path: '/GetUnverifiedCustomers', body: {} },
  { method: 'POST', path: '/GetCustomerById', body: { customerIdNo: 'ID-DEMO-001' } },
  { method: 'POST', path: '/GetCustomerByMobile', body: { customerMobile: '9800000000' } },
  { method: 'GET', path: '/customers/search/mobile/9800000000' },
  { method: 'POST', path: '/customers/search/mobile', body: { mobile: '9800000000' } },
  { method: 'POST', path: '/RegisterComplaint', body: {} },
  { method: 'POST', path: '/TrackComplaint', body: {} },
  { method: 'GET', path: '/GetCustomerByIdNumber/ID-DEMO-001' },
  { method: 'GET', path: '/GetCustomerByMobile/9800000000' },
  { method: 'POST', path: '/VerifyTransaction/1234567890', body: {} },
  { method: 'POST', path: '/ekyc/generate-token', body: {} },
  { method: 'GET', path: '/ekyc/health-auth' },
  { method: 'POST', path: '/ekyc/health-auth', body: {} },
  { method: 'POST', path: '/ekyc/initiate', body: {} },
  { method: 'POST', path: '/ekyc/unique-ref-status', body: {} },
  { method: 'POST', path: '/ekyc/enrollment', body: {} },
  { method: 'POST', path: '/ekyc/customer-onboarding', body: {} },
  { method: 'POST', path: '/csp/initiate', body: {} },
  { method: 'POST', path: '/csp/unique-ref-status', body: {} },
  { method: 'POST', path: '/csp/enrollment', body: {} },
  { method: 'POST', path: '/csp/onboarding', body: {} },
  { method: 'POST', path: '/csp/search', body: {} },
  { method: 'POST', path: '/csp/create', body: {} },
  { method: 'POST', path: '/csp/agent-consent', body: {} },
  { method: 'POST', path: '/csp/mapping', body: {} },
  { method: 'POST', path: '/csp/bio-kyc-requery', body: {} }
];

const run = async () => {
  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    prefix: PREFIX,
    totalEndpoints: endpoints.length,
    results: []
  };

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${PREFIX}${endpoint.path}`;
    const requestBody = endpoint.method === 'POST'
      ? { ...defaultPostBody, ...(endpoint.body || {}) }
      : undefined;

    try {
      const response = await axios({
        method: endpoint.method,
        url,
        data: requestBody,
        timeout: 60000,
        validateStatus: () => true
      });

      output.results.push({
        method: endpoint.method,
        path: `${PREFIX}${endpoint.path}`,
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        requestBody: requestBody || null,
        response: response.data
      });
    } catch (error) {
      output.results.push({
        method: endpoint.method,
        path: `${PREFIX}${endpoint.path}`,
        status: error.response?.status || 0,
        ok: false,
        requestBody: requestBody || null,
        response: error.response?.data || { message: error.message }
      });
    }
  }

  const targetPath = path.join(process.cwd(), 'prabhu.json');
  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf8');

  const successCount = output.results.filter((item) => item.ok).length;
  console.log(`Saved ${output.results.length} endpoint results to ${targetPath}`);
  console.log(`HTTP 2xx: ${successCount}, non-2xx: ${output.results.length - successCount}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
