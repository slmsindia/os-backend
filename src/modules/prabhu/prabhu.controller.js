const prabhuService = require('./prabhu.service');
const prabhuDataService = require('./prabhu-data.service');

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
  sendTransaction: proxyOperation('SendTransaction', 'Send transaction success'),
  confirmTransaction: proxyOperation('ConfirmTransaction', 'Confirm transaction success'),
  getCustomerByIdNumber,
  searchTransaction: proxyOperation('SearchTransaction', 'Search transaction success'),
  validateBankAccount: proxyOperation('ValidateBankAccount', 'Validate bank account success'),
  createReceiver: proxyOperation('CreateReceiver', 'Create receiver success'),
  createCustomer: proxyOperation('CreateCustomer', 'Create customer success'),
  getUnverifiedCustomers: proxyOperation('GetUnverifiedCustomers', 'Get unverified customers success'),
  getCustomerByMobile,
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
  deletePrabhuData
};