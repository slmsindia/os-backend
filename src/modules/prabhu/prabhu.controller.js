// ...existing code...

// POST /api/csp/unique-ref-poll
const cspUniqueRefPoll = async (req, res) => {
  const { partnerUniqueRefNo, branchCode } = req.body || {};
  if (!partnerUniqueRefNo || !branchCode) {
    return res.status(400).json({ success: false, message: 'Missing partnerUniqueRefNo or branchCode' });
  }
  return res.json({ success: true, status: 'POLL_OK', partnerUniqueRefNo, branchCode });
};

const prabhuService = require('./prabhu.service');
const prabhuDataService = require('./prabhu-data.service');
const prabhuReceiverService = require('./prabhu-receiver.service');
const prabhuSenderService = require('./prabhu-sender.service');

const ok = (res, message, payload) => {
  return res.json({
    success: true,
    message,
    ...payload
  });
};

const requiredFields = (source, fields) => {
  return fields.filter((field) => source[field] === undefined || source[field] === null || source[field] === '');
};

const badRequest = (res, message, missing = []) => {
  return res.status(400).json({
    success: false,
    message,
    ...(missing.length ? { missing } : {})
  });
};

const getRequestContext = (req) => ({
  userId: req.user?.user_id || req.user?.id || null,
  tenantId: req.tenant_id || req.user?.tenant_id || null,
  ipAddress: req.ip,
  userAgent: req.get('user-agent') || null
});

const fail = (res, error) => {
  console.error("PRABHU API FAILURE DETAILS:");
  console.error(error);
  if (error.response) {
    console.error("Response body:", error.response.data);
    console.error("Response headers:", error.response.headers);
  }
  const status = error.response?.status || 500;
  const details = error.response?.data || { message: error.message };
  return res.status(status).json({
    success: false,
    message: error.message,
    error: details
  });
};

const proxyOperation = (operation, message) => async (req, res) => {
  try {
    const result = await prabhuService.callEndpoint(operation, req.body || {}, getRequestContext(req));
    return ok(res, message || `${operation} success`, { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const proxyEkycOperation = (operation, message) => async (req, res) => {
  try {
    const result = await prabhuService.callEkycEndpoint(operation, req.body || {}, {
      authorization: req.headers.authorization
    }, getRequestContext(req));
    return ok(res, message || `${operation} success`, { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const extractCustomerList = (payload = {}) => {
  return [
    ...toArray(payload.customers),
    ...toArray(payload.customerList),
    ...toArray(payload.dataList),
    ...toArray(payload.data?.customers),
    ...toArray(payload.data?.customerList),
    ...toArray(payload.data?.dataList)
  ].filter(Boolean);
};

const resolveCustomerId = (customer = {}) => (
  customer.customerId ||
  customer.CustomerId ||
  customer.customerID ||
  customer.customer_Id ||
  customer.id ||
  ''
);

const isCustomerFoundPayload = (payload = {}) => {
  const customers = extractCustomerList(payload);
  if (customers.length > 0) return true;

  return Boolean(resolveCustomerId(payload) || resolveCustomerId(payload.data || {}));
};

const extractReceiverList = (payload = {}) => {
  return [
    ...toArray(payload.receivers),
    ...toArray(payload.receiverList),
    ...toArray(payload.data?.receivers),
    ...toArray(payload.data?.receiverList),
    ...toArray(payload.dataList)
  ].filter(Boolean);
};

const extractStateDistrictRows = (payload = {}) => {
  return [
    ...toArray(payload.data),
    ...toArray(payload.dataList),
    ...toArray(payload.rows),
    ...toArray(payload.locations),
    ...toArray(payload.data?.data),
    ...toArray(payload.data?.dataList),
    ...toArray(payload.data?.rows),
    ...toArray(payload.data?.locations)
  ].filter((item) => item && typeof item === 'object');
};

const normalizeIndiaTemporaryStateCode = async (requestBody, context) => {
  const temporaryCountry = String(requestBody?.temporaryCountry || '').trim().toLowerCase();
  const rawTemporaryState = String(requestBody?.temporaryState || '').trim();
  if (!rawTemporaryState) return;

  if (temporaryCountry && !temporaryCountry.includes('india') && temporaryCountry !== 'ind') {
    return;
  }

  try {
    const stateDistrict = await prabhuService.callEndpoint('GetStateDistrict', { country: 'India' }, context);
    const rows = extractStateDistrictRows(stateDistrict?.data || {});

    const exactByCode = rows.find((row) => String(row?.stateCode || row?.StateCode || '').trim().toLowerCase() === rawTemporaryState.toLowerCase());
    if (exactByCode) {
      requestBody.temporaryState = String(exactByCode?.stateCode || exactByCode?.StateCode || '').trim() || rawTemporaryState;
      return;
    }

    const matchByStateName = rows.find((row) => String(row?.state || row?.State || '').trim().toLowerCase() === rawTemporaryState.toLowerCase());
    if (matchByStateName) {
      const stateCode = String(matchByStateName?.stateCode || matchByStateName?.StateCode || '').trim();
      requestBody.temporaryState = stateCode || rawTemporaryState;
    }
  } catch {
    // Keep original value if static location lookup fails.
  }
};

const getCustomerByIdNumber = async (req, res) => {
  try {
    const customerIdNo =
      req.body?.customerIdNo ||
      req.body?.customer_IdNo ||
      req.params?.customerIdNo;

    if (!customerIdNo) {
      return res.status(400).json({ success: false, message: 'customerIdNo is required' });
    }

    const result = await prabhuService.callEndpoint('GetCustomerById', {
      customerIdNo
    }, getRequestContext(req));

    return ok(res, 'Get customer by ID number success', { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const getCustomerByMobile = async (req, res) => {
  try {
    const customerMobile =
      req.body?.customerMobile ||
      req.body?.customer_Mobile ||
      req.params?.mobile;

    if (!customerMobile) {
      return res.status(400).json({ success: false, message: 'mobile is required' });
    }

    const result = await prabhuService.callEndpoint('GetCustomerByMobile', {
      customerMobile
    }, getRequestContext(req));

    return ok(res, 'Get customer by mobile success', { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const createCustomer = async (req, res) => {
  try {
    const configuredCspCode = (process.env.PRABHU_CSP_CODE || process.env.PRABHU_AGENT_CODE || '').trim();

    const requestBody = {
      ...(req.body || {})
    };

    const incomingCspCode = String(requestBody.cspCode || requestBody.CSPCode || '').trim();
    const effectiveCspCode = incomingCspCode || configuredCspCode;

    if (!effectiveCspCode) {
      return badRequest(res, 'CSPCode is required. Configure PRABHU_CSP_CODE in .env');
    }

    requestBody.cspCode = effectiveCspCode;
    requestBody.CSPCode = effectiveCspCode;

    await normalizeIndiaTemporaryStateCode(requestBody, getRequestContext(req));

    const result = await prabhuService.callEndpoint('CreateCustomer', requestBody, getRequestContext(req));
    const payload = result?.data || {};

    await prabhuSenderService.upsert({
      customerId: payload?.customerId || payload?.CustomerId || requestBody?.customerId || requestBody?.CustomerId || '',
      name:
        requestBody?.name ||
        requestBody?.customerFullName ||
        `${requestBody?.FirstName || ''} ${requestBody?.LastName || ''}`.trim() ||
        'Sender',
      mobile: requestBody?.PhoneNumber || requestBody?.mobile || requestBody?.phone || '',
      gender: requestBody?.gender,
      dateOfBirth: requestBody?.dob,
      address: requestBody?.address,
      city: requestBody?.city,
      district: requestBody?.district,
      state: requestBody?.state,
      nationality: requestBody?.nationality,
      email: requestBody?.email,
      idType: requestBody?.IDType || requestBody?.idType,
      idNumber: requestBody?.IDNumber || requestBody?.idNumber,
      idIssuedPlace: requestBody?.IdPlaceOfIssue || requestBody?.idIssuedPlace,
      idExpiryDate: requestBody?.ExpiryDate || requestBody?.idExpiryDate,
      sourceIncomeType: requestBody?.sourceIncomeType,
      customerType: requestBody?.customerType,
      status: 'Active'
    });

    return ok(res, 'Create customer success', { data: payload });
  } catch (error) {
    return fail(res, error);
  }
};

const workflowStep1Customer = async (req, res) => {
  try {
    const mobile = req.body?.mobile || req.body?.customerMobile || req.body?.customer_Mobile || '';
    if (!mobile) {
      return badRequest(res, 'mobile is required');
    }

    const customerLookup = await prabhuService.callEndpoint('GetCustomerByMobile', {
      customerMobile: mobile
    }, getRequestContext(req));

    const lookupData = customerLookup?.data || {};
    if (isCustomerFoundPayload(lookupData)) {
      const customers = extractCustomerList(lookupData);
      const customer = customers[0] || lookupData;
      const customerId = resolveCustomerId(customer);

      await prabhuSenderService.upsert({
        customerId,
        name: req.body?.name || req.body?.customerFullName || customer?.name || customer?.fullName || 'Existing Sender',
        mobile,
        status: 'Active'
      });

      return ok(res, 'Customer found. Continue with KYC and Step 2.', {
        data: {
          case: 'customer-found',
          nextStep: 2,
          customerId,
          customerLookup: lookupData
        }
      });
    }

    const otpProcessId = req.body?.otpProcessId || req.body?.processId || '';
    const otp = req.body?.otp || '';

    if (!otpProcessId || !otp) {
      const otpResponse = await prabhuService.callEndpoint('SendOTP', {
        operation: 'CreateCustomer',
        mobile,
        customerId: req.body?.customerId,
        customerFullName: req.body?.customerFullName || req.body?.name,
        cspMobile: req.body?.cspMobile,
        cspName: req.body?.cspName
      }, getRequestContext(req));

      return ok(res, 'Customer not found. CreateCustomer OTP sent.', {
        data: {
          case: 'customer-not-found-otp-initiated',
          nextStep: 'Resubmit this endpoint with otpProcessId, otp, and CreateCustomer fields',
          otpResponse: otpResponse.data
        }
      });
    }

    return createCustomer(req, res);
  } catch (error) {
    return fail(res, error);
  }
};

const workflowStep2Receiver = async (req, res) => {
  try {
    const customerMobile = req.body?.customerMobile || req.body?.mobile || '';
    const receiver = req.body?.receiver || req.body || {};
    const paymentMode = String(receiver.paymentMode || req.body?.paymentMode || '').trim();
    const receiverMobile = String(receiver.mobile || '').trim();

    if (!customerMobile) {
      return badRequest(res, 'customerMobile is required for Step 2');
    }

    if (!receiverMobile) {
      return badRequest(res, 'receiver.mobile is required for Step 2');
    }

    const customerLookup = await prabhuService.callEndpoint('GetCustomerByMobile', {
      customerMobile
    }, getRequestContext(req));

    const lookupData = customerLookup?.data || {};
    const receivers = extractReceiverList(lookupData);
    const existingReceiver = receivers.find((item) => {
      const itemMobile = String(item?.mobile || item?.receiverMobile || '').trim();
      return itemMobile && itemMobile === receiverMobile;
    });

    if (existingReceiver) {
      return ok(res, 'Receiver already exists. Proceed to Step 3.', {
        data: {
          case: 'receiver-already-exists',
          nextStep: 3,
          receiver: existingReceiver
        }
      });
    }

    const isAccountDeposit = /account|bank|deposit/i.test(paymentMode) && !/cash/i.test(paymentMode);
    if (isAccountDeposit && !receiver.bankBranchId) {
      const bankBranches = await prabhuService.callEndpoint('GetAcPayBankBranchList', {
        country: req.body?.country || 'Nepal',
        state: req.body?.state,
        district: req.body?.district,
        city: req.body?.city,
        bankName: receiver.bankName || req.body?.bankName,
        branchName: receiver.branchName || req.body?.branchName
      }, getRequestContext(req));

      return ok(res, 'Bank branch list loaded. Select branch and retry Step 2.', {
        data: {
          case: 'account-deposit-bank-selection-required',
          nextStep: 2,
          bankBranches: bankBranches.data
        }
      });
    }

    const createReceiverPayload = {
      ...(req.body?.createReceiver || {}),
      ...receiver,
      customerId: receiver.customerId || req.body?.customerId,
      mobile: receiverMobile,
      paymentMode
    };

    const createReceiverResponse = await prabhuService.callEndpoint('CreateReceiver', createReceiverPayload, getRequestContext(req));
    await prabhuReceiverService.upsert(createReceiverPayload);

    return ok(res, 'Receiver created. Proceed to Step 3.', {
      data: {
        case: isAccountDeposit ? 'account-deposit-receiver-created' : 'cash-receiver-created',
        nextStep: 3,
        receiver: createReceiverResponse.data
      }
    });
  } catch (error) {
    return fail(res, error);
  }
};

const searchCustomerByMobile = async (req, res) => {
  try {
    const customerMobile =
      req.body?.mobile ||
      req.body?.customerMobile ||
      req.body?.customer_Mobile ||
      req.params?.mobile;

    if (!customerMobile) {
      return res.status(400).json({ success: false, message: 'mobile is required' });
    }

    const result = await prabhuService.callEndpoint('GetCustomerByMobile', {
      customerMobile
    }, getRequestContext(req));

    return ok(res, 'Customer search by mobile success', { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const verifyTransaction = async (req, res) => {
  try {
    const pinNo = req.params.pinNo;
    if (!pinNo) {
      return res.status(400).json({ success: false, message: 'pinNo is required' });
    }

    const result = await prabhuService.callEndpoint('SearchTransaction', {
      pinNo,
      ...(req.body || {})
    }, getRequestContext(req));

    return ok(res, 'Verify transaction success', { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const ekycAuthHealth = async (req, res) => {
  const failPattern = /(invalid|fail|unauthor|denied|forbidden|blocked|error)/i;

  try {
    const result = await prabhuService.callEkycEndpoint('GenerateToken', req.body || {}, {
      authorization: req.headers.authorization
    }, getRequestContext(req));

    const data = result?.data || {};
    const statusCode = String(data.StatusCode ?? data.statusCode ?? '').trim();
    const responseMessage = String(data.ResponseMessage ?? data.message ?? '').trim();
    const token = data.Token || data.token || data.AccessToken || data.accessToken || '';
    const explicitFailCode = ['0', '-1', '401', '403'].includes(statusCode);
    const pass = Boolean(token) || (!explicitFailCode && !failPattern.test(responseMessage));

    return res.json({
      success: true,
      message: 'E-KYC auth health check completed',
      data: {
        pass,
        statusCode,
        responseMessage,
        checkedAt: new Date().toISOString(),
        raw: data
      }
    });
  } catch (error) {
    return res.json({
      success: true,
      message: 'E-KYC auth health check completed',
      data: {
        pass: false,
        statusCode: String(error.response?.status || ''),
        responseMessage: error.response?.data?.ResponseMessage || error.response?.data?.message || error.message,
        checkedAt: new Date().toISOString(),
        raw: error.response?.data || null
      }
    });
  }
};

const listPrabhuData = async (req, res) => {
  try {
    const data = await prabhuDataService.list();
    return ok(res, 'Prabhu data fetched successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const createPrabhuData = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['name', 'mobile', 'relationship']);
    if (missing.length) {
      return badRequest(res, 'Missing required Prabhu data fields', missing);
    }

    const data = await prabhuDataService.create(req.body);
    return ok(res, 'Prabhu data saved successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const updatePrabhuData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return badRequest(res, 'id is required');
    }

    const missing = requiredFields(req.body || {}, ['name', 'mobile', 'relationship']);
    if (missing.length) {
      return badRequest(res, 'Missing required Prabhu data fields', missing);
    }

    const data = await prabhuDataService.update(id, req.body);
    return ok(res, 'Prabhu data updated successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const deletePrabhuData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return badRequest(res, 'id is required');
    }

    await prabhuDataService.remove(id);
    return ok(res, 'Prabhu data deleted successfully');
  } catch (error) {
    return fail(res, error);
  }
};

const listPrabhuReceivers = async (req, res) => {
  try {
    const customerId = req.query.customerId || req.body?.customerId || '';
    const mobile = req.query.mobile || req.body?.mobile || '';
    const data = await prabhuReceiverService.list({ customerId, mobile });
    return ok(res, 'Prabhu receiver data fetched successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const upsertPrabhuReceiver = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['name', 'mobile']);
    if (missing.length) {
      return badRequest(res, 'Missing required receiver fields', missing);
    }

    const data = await prabhuReceiverService.upsert(req.body || {});
    return ok(res, 'Prabhu receiver saved successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const listPrabhuSenders = async (req, res) => {
  try {
    const customerId = req.query.customerId || req.body?.customerId || '';
    const mobile = req.query.mobile || req.body?.mobile || '';
    const data = await prabhuSenderService.list({ customerId, mobile });
    return ok(res, 'Prabhu sender data fetched successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const upsertPrabhuSender = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['name', 'mobile']);
    if (missing.length) {
      return badRequest(res, 'Missing required sender fields', missing);
    }

    const data = await prabhuSenderService.upsert(req.body || {});
    return ok(res, 'Prabhu sender saved successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const cspSendOtp = async (req, res) => {
  try {
    const { cspMobile, cspName } = req.body || {};
    const missing = requiredFields(req.body || {}, ['cspMobile', 'cspName']);
    if (missing.length) {
      return badRequest(res, 'Missing required CSP OTP fields', missing);
    }

    const result = await prabhuService.callEndpoint('SendOTP', {
      operation: 'CreateCSP',
      mobile: cspMobile,
      customerId: 'CSP_' + Date.now(),
      customerFullName: cspName
    }, getRequestContext(req));

    // Extract processId from response
    const processId = result?.data?.processId || 
                      result?.data?.ProcessId || 
                      result?.data?.process_id ||
                      '';

    return ok(res, 'CSP OTP send response received', {
      data: {
        code: result?.data?.code || result?.data?.Code || '',
        message: result?.data?.message || result?.data?.Message || '',
        processId: processId,
        raw: result?.data || {}
      }
    });
  } catch (error) {
    return fail(res, error);
  }
};

module.exports = {
  getStateDistrict: proxyOperation('GetStateDistrict', 'Get state/district success'),
  getStaticData: proxyOperation('GetStaticData', 'Get static data success'),
  getEcho: proxyOperation('GetEcho', 'Get echo success'),
  getCashPayLocationList: proxyOperation('GetCashPayLocationList', 'Get cash pay location list success'),
  getAcPayBankBranchList: proxyOperation('GetAcPayBankBranchList', 'Get bank branch list success'),
  getBalance: proxyOperation('GetBalance', 'Get balance success'),
  sendOTP: proxyOperation('SendOTP', 'Send OTP success'),
  getServiceCharge: proxyOperation('GetServiceCharge', 'Get service charge success'),
  getServiceChargeByCollection: proxyOperation('GetServiceChargeByCollection', 'Get service charge by collection success'),
  cancelTransaction: proxyOperation('CancelTransaction', 'Cancel transaction success'),
  unverifiedTransactions: proxyOperation('UnverifiedTransactions', 'Get unverified transactions success'),
  complianceTransactions: proxyOperation('ComplianceTransactions', 'Compliance transactions success'),
  uploadDocument: proxyOperation('UploadDocument', 'Upload document success'),
  sendTransaction: async (req, res) => {
    try {
      const payload = {
        ...req.body,
        cspCode: req.body.cspCode || process.env.PRABHU_CSP_CODE
      };
      const result = await prabhuService.callEndpoint('SendTransaction', payload, getRequestContext(req));
      return ok(res, 'Send transaction success', { data: result.data });
    } catch (error) {
      return fail(res, error);
    }
  },
  confirmTransaction: proxyOperation('ConfirmTransaction', 'Confirm transaction success'),
  getCustomerByIdNumber,
  searchTransaction: proxyOperation('SearchTransaction', 'Search transaction success'),
  validateBankAccount: proxyOperation('ValidateBankAccount', 'Validate bank account success'),
  createReceiver: proxyOperation('CreateReceiver', 'Create receiver success'),
  createCustomer,
  getUnverifiedCustomers: proxyOperation('GetUnverifiedCustomers', 'Get unverified customers success'),
  getCustomerByMobile,
  workflowStep1Customer,
  workflowStep2Receiver,
  searchCustomerByMobile,
  registerComplaint: proxyOperation('RegisterComplaint', 'Register complaint success'),
  trackComplaint: proxyOperation('TrackComplaint', 'Track complaint success'),
  verifyTransaction,

  ekycGenerateToken: proxyEkycOperation('GenerateToken', 'E-KYC token generated'),
  ekycAuthHealth,
  ekycInitiate: proxyEkycOperation('EkycInitiate', 'E-KYC initiate success'),
  ekycUniqueRefStatus: proxyEkycOperation('EkycUniqueRefStatus', 'E-KYC status success'),
  ekycEnrollment: proxyEkycOperation('EkycEnrollment', 'E-KYC enrollment success'),
  ekycCustomerOnboarding: proxyEkycOperation('CustomerOnboarding', 'E-KYC customer onboarding success'),
  cspInitiate: proxyEkycOperation('CspInitiate', 'CSP initiate success'),
  cspSendOtp,
  cspUniqueRefStatus: proxyEkycOperation('CspUniqueRefStatus', 'CSP status success'),
  cspEnrollment: proxyEkycOperation('CspEnrollment', 'CSP enrollment success'),
  cspOnboarding: proxyEkycOperation('CspOnboarding', 'CSP onboarding success'),
  cspSearch: proxyEkycOperation('SearchCsp', 'CSP search success'),
  cspCreate: proxyEkycOperation('CreateCsp', 'CSP create success'),
  cspAgentConsent: proxyEkycOperation('AgentConsent', 'CSP agent consent success'),
  cspMapping: proxyEkycOperation('CspMapping', 'CSP mapping success'),
  cspBioKycRequery: proxyEkycOperation('BioKycRequery', 'CSP BioKYC requery success'),

  listPrabhuData,
  createPrabhuData,
  updatePrabhuData,
  deletePrabhuData,
  listPrabhuReceivers,
  upsertPrabhuReceiver,
  listPrabhuSenders,
  upsertPrabhuSender,
  cspUniqueRefPoll
};