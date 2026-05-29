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
<<<<<<< HEAD
<<<<<<< HEAD
const walletService = require('../../services/wallet.service');
=======
>>>>>>> main
=======
const walletService = require('../../services/wallet.service');
>>>>>>> origin/main

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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
const normalizeReceiverIdentity = (receiver = {}) => ({
  receiverId: String(receiver?.receiverId || receiver?.ReceiverId || receiver?.id || '').trim(),
  receiverName: String(
    receiver?.name ||
    receiver?.receiverName ||
    receiver?.fullName ||
    ''
  ).trim(),
  receiverMobile: String(receiver?.mobile || receiver?.receiverMobile || '').trim(),
  paymentMode: String(receiver?.paymentMode || '').trim(),
  accountNumber: String(receiver?.accountNumber || receiver?.acNumber || '').trim(),
  bankBranchId: String(receiver?.bankBranchId || '').trim()
});

const findMatchingReceiver = (receivers = [], criteria = {}) => {
  const normalizedReceiverId = String(criteria.receiverId || '').trim();
  const normalizedReceiverMobile = String(criteria.receiverMobile || '').trim();
  const normalizedReceiverName = String(criteria.receiverName || '').trim().toLowerCase();

  return receivers.find((receiver) => {
    const identity = normalizeReceiverIdentity(receiver);

    if (normalizedReceiverId && identity.receiverId && identity.receiverId === normalizedReceiverId) {
      return true;
    }

    if (normalizedReceiverMobile && identity.receiverMobile && identity.receiverMobile === normalizedReceiverMobile) {
      return true;
    }

    if (normalizedReceiverName && identity.receiverName && identity.receiverName.toLowerCase() === normalizedReceiverName) {
      return true;
    }

    return false;
  }) || null;
};

const resolveReceiverDetails = async (payload = {}, context = {}) => {
  const receiverId = String(payload?.receiverId || payload?.ReceiverId || '').trim();
  const receiverName = String(payload?.receiverName || '').trim();
  const receiverMobile = String(payload?.receiverMobile || '').trim();
  const customerId = String(payload?.customerId || '').trim();
  const senderMobile = String(payload?.senderMobile || payload?.mobile || '').trim();

  const criteria = { receiverId, receiverName, receiverMobile };
  const candidates = [];

  if (senderMobile) {
    try {
      const lookup = await prabhuService.callEndpoint('GetCustomerByMobile', {
        customerMobile: senderMobile
      }, context);
      candidates.push(...extractReceiverList(lookup?.data || {}));
    } catch {
      // Ignore lookup errors and fall back to our local cache below.
    }
  }

  if (customerId || senderMobile) {
    try {
      const localReceivers = await prabhuReceiverService.list({
        customerId,
        mobile: senderMobile
      });
      candidates.push(...localReceivers);
    } catch {
      // Ignore local cache failures and keep the original payload.
    }
  }

  const match = findMatchingReceiver(candidates, criteria);
  if (!match) {
    return {};
  }

  const identity = normalizeReceiverIdentity(match);
  const resolved = {};

  if (identity.receiverId) resolved.receiverId = identity.receiverId;
  if (identity.receiverName) resolved.receiverName = identity.receiverName;
  if (identity.receiverMobile) resolved.receiverMobile = identity.receiverMobile;
  if (identity.paymentMode) resolved.paymentMode = identity.paymentMode;
  if (identity.accountNumber) resolved.accountNumber = identity.accountNumber;
  if (identity.bankBranchId) resolved.bankBranchId = identity.bankBranchId;

  return resolved;
};

<<<<<<< HEAD
=======
>>>>>>> main
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
<<<<<<< HEAD
    console.log('DEBUG - Prabhu CreateCustomer Request Body:', JSON.stringify(req.body, null, 2));

    const configuredCspCode = (process.env.PRABHU_CSPCODE || process.env.PRABHU_CSP_CODE || process.env.PRABHU_AGENT_CODE || '').trim();
=======
    const configuredCspCode = (process.env.PRABHU_CSP_CODE || process.env.PRABHU_AGENT_CODE || '').trim();
>>>>>>> main
=======
    console.log('DEBUG - Prabhu CreateCustomer Request Body:', JSON.stringify(req.body, null, 2));

    const configuredCspCode = (process.env.PRABHU_CSPCODE || process.env.PRABHU_CSP_CODE || process.env.PRABHU_AGENT_CODE || '').trim();
>>>>>>> origin/main

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

<<<<<<< HEAD
<<<<<<< HEAD
    console.log('DEBUG - CSP Code Set:', { configuredCspCode, effectiveCspCode, finalCspCode: requestBody.cspCode });

=======
>>>>>>> main
=======
    console.log('DEBUG - CSP Code Set:', { configuredCspCode, effectiveCspCode, finalCspCode: requestBody.cspCode });

>>>>>>> origin/main
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
      address: requestBody?.address,
      city: requestBody?.city,
      district: requestBody?.district,
      state: requestBody?.state,
      nationality: requestBody?.nationality,
>>>>>>> main
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
<<<<<<< HEAD
        cspName: req.body?.cspName,
        idType: req.body?.idType || req.body?.IDType || '12' // Defaulting to 12 if not provided
=======
        cspName: req.body?.cspName
>>>>>>> main
=======
        cspName: req.body?.cspName,
        idType: req.body?.idType || req.body?.IDType || '12' // Defaulting to 12 if not provided
>>>>>>> origin/main
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
<<<<<<< HEAD
  getBalance: proxyOperation('GetBalance', 'Get balance success'),
=======
  getBalance: async (req, res) => {
    try {
      const result = await prabhuService.callEndpoint('GetBalance', req.body || {}, getRequestContext(req));
      
      let balance = 0;
      try {
        const payload = result?.data || {};
        const rawBalance = payload.currentBalance || payload.balance || payload.balanceAmt || payload.Balance || 0;
        balance = parseFloat(rawBalance) || 0;
      } catch (e) {
        console.warn('Failed to parse Prabhu REST balance:', e.message);
      }

      if (!balance) {
        balance = 245000; // UAT Sandbox Mock Balance
      }

      return ok(res, 'Get balance success', {
        balance,
        data: result?.data
      });
    } catch (error) {
      console.warn('Prabhu GetBalance failed, falling back to UAT mock balance:', error.message);
      return ok(res, 'Get balance success (UAT Mock Fallback)', {
        balance: 245000,
        isMock: true,
        error: error.message
      });
    }
  },
>>>>>>> origin/main
  sendOTP: proxyOperation('SendOTP', 'Send OTP success'),
  getServiceCharge: proxyOperation('GetServiceCharge', 'Get service charge success'),
  getServiceChargeByCollection: proxyOperation('GetServiceChargeByCollection', 'Get service charge by collection success'),
  cancelTransaction: proxyOperation('CancelTransaction', 'Cancel transaction success'),
  unverifiedTransactions: proxyOperation('UnverifiedTransactions', 'Get unverified transactions success'),
  complianceTransactions: proxyOperation('ComplianceTransactions', 'Compliance transactions success'),
  uploadDocument: proxyOperation('UploadDocument', 'Upload document success'),
  sendTransaction: async (req, res) => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
    let deductedWallet = null;
    let transferAmount = 0;
    let walletRefunded = false;

    try {
      const appUserId = req.user?.user_id || req.user?.id;
      const tenantId = req.user?.tenant_id || req.tenant_id;
      const identity = req.user?.identity;

      if (!appUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      transferAmount = getTransferAmount(req.body || {});
      if (!transferAmount) {
        return res.status(400).json({
          success: false,
          message: 'Valid transfer amount is required'
        });
      }

      const { getLocationData } = require("../../utils/location");
      const loc = getLocationData(req);
      const resolvedReceiverDetails = await resolveReceiverDetails(req.body || {}, getRequestContext(req));

      await walletService.ensureSufficientBalance(appUserId, transferAmount, tenantId, identity);
      deductedWallet = await walletService.deductBalanceIfSufficient(appUserId, transferAmount, tenantId, identity, null, "Prabhu Remittance", null, loc);

      const payload = {
        ...req.body,
        ...resolvedReceiverDetails,
        cspCode: req.body.cspCode || process.env.PRABHU_CSP_CODE
      };
      const result = await prabhuService.callEndpoint('SendTransaction', payload, getRequestContext(req));
      const responseCode = String(result?.data?.code || '').trim();

      if (responseCode !== '000') {
        await walletService.updateBalance(deductedWallet.id, transferAmount);
        walletRefunded = true;
        return res.status(400).json({
          success: false,
          message: result?.data?.message || 'Send transaction failed',
          data: result.data
        });
      }

      // Process Admin Commission
      await walletService.processServiceCommission('PRABHU', tenantId, result?.data?.pinNo || result?.data?.partnerUniqueRefNo, appUserId);

      return ok(res, 'Send transaction success', {
        data: result.data,
        wallet: {
          id: deductedWallet.id,
          balance: deductedWallet.balance,
          debitedAmount: transferAmount
        }
      });
    } catch (error) {
      if (!walletRefunded && deductedWallet?.id && transferAmount > 0) {
        try {
          await walletService.updateBalance(deductedWallet.id, transferAmount);
          walletRefunded = true;
        } catch (refundError) {
          console.error('Failed to refund wallet after send transaction error:', refundError);
        }
      }

      if (error.code === 'WALLET_NOT_FOUND') {
        return res.status(404).json({ success: false, message: error.message });
      }

      if (error.code === 'WALLET_INACTIVE') {
        return res.status(403).json({ success: false, message: error.message });
      }

      if (error.code === 'INVALID_AMOUNT' || error.code === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          success: false,
          message: error.message,
          availableBalance: error.availableBalance,
          requiredAmount: error.requiredAmount
        });
      }

<<<<<<< HEAD
=======
    try {
      const payload = {
        ...req.body,
        cspCode: req.body.cspCode || process.env.PRABHU_CSP_CODE
      };
      const result = await prabhuService.callEndpoint('SendTransaction', payload, getRequestContext(req));
      return ok(res, 'Send transaction success', { data: result.data });
    } catch (error) {
>>>>>>> main
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
};

const getTransferAmount = (payload = {}) => {
  // collectionAmount includes transferAmount + serviceCharge
  // We prioritize this to ensure the full amount is deducted from the wallet.
  const candidates = [
    payload.collectionAmount, 
    payload.collectedAmount, 
    payload.totalAmount,
    payload.transferAmount, 
    payload.sendAmount
  ];

  for (const value of candidates) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};
<<<<<<< HEAD
=======
};
>>>>>>> main
=======
>>>>>>> origin/main
