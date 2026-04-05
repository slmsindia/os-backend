const imeService = require('../services/ime.service');

const ok = (res, message, data = {}) => {
  return res.json({
    success: true,
    message,
    ...data
  });
};

const fail = (res, error, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message: error.message || 'IME operation failed',
    error: error.message
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

const getImeResponseMeta = (result = {}) => {
  const dataArray = Array.isArray(result?.data) ? result.data : [];
  const envelopeObject = dataArray.find((item) => item && typeof item === 'object' && !Array.isArray(item));

  if (!envelopeObject) {
    return { code: '', message: '' };
  }

  const firstKey = Object.keys(envelopeObject)[0];
  const body = firstKey ? envelopeObject[firstKey] : null;
  const response = body?.Response || {};

  return {
    code: String(response.Code || ''),
    message: response.Message || ''
  };
};

/**
 * Authentication & Session Management
 */
const authenticate = async (req, res) => {
  try {
    const result = await imeService.authenticate(req.body);
    return ok(res, 'IME Authentication successful', result);
  } catch (error) {
    return fail(res, error);
  }
};

const login = async (req, res) => {
  try {
    const result = await imeService.login(req.body);
    return ok(res, 'IME Login successful', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Customer Operations
 */
const createCustomer = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'FirstName',
      'LastName',
      'Gender',
      'DateOfBirth',
      'IDType',
      'IDNumber',
      'PhoneNumber'
    ]);
    if (missing.length) {
      return badRequest(res, 'Missing required customer fields', missing);
    }

    if (!['M', 'F'].includes(req.body.Gender)) {
      return badRequest(res, 'Gender must be M or F');
    }

    if (!['PP', 'DL', 'NP_ID'].includes(req.body.IDType)) {
      return badRequest(res, 'IDType must be one of PP, DL, NP_ID');
    }

    const result = await imeService.createCustomer(req.body);
    return ok(res, 'Customer created successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }
    const result = await imeService.getCustomer(customerId);
    return ok(res, 'Customer retrieved successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

const searchCustomerByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;
    if (!mobile) {
      return badRequest(res, 'mobile is required');
    }

    const normalizedMobile = String(mobile).trim();
    if (normalizedMobile.length < 7) {
      return badRequest(res, 'mobile must be at least 7 digits');
    }

    const result = await imeService.searchCustomerByMobile(normalizedMobile);
    return ok(res, 'Customer search by mobile completed', result);
  } catch (error) {
    return fail(res, error);
  }
};

const validateCustomer = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['CustomerId']);
    if (missing.length) {
      return badRequest(res, 'Missing required validation fields', missing);
    }

    const result = await imeService.validateCustomer(req.body);
    return ok(res, 'Customer validation completed', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Remittance/Transaction Operations
 */
const sendMoney = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'SenderCustomerId',
      'ReceiverCustomerId',
      'Amount',
      'SourceCurrency',
      'DestinationCurrency',
      'PaymentMode'
    ]);
    if (missing.length) {
      return badRequest(res, 'Missing required transaction fields', missing);
    }

    if (Number(req.body.Amount) <= 0) {
      return badRequest(res, 'Amount must be greater than 0');
    }

    if (!['CASH', 'BANK'].includes(req.body.PaymentMode)) {
      return badRequest(res, 'PaymentMode must be CASH or BANK');
    }

    const result = await imeService.sendMoney(req.body);
    return ok(res, 'Money sent successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }
    const result = await imeService.getTransactionStatus(transactionId);
    return ok(res, 'Transaction status retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

const cancelTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }
    const result = await imeService.cancelTransaction(transactionId, reason);
    return ok(res, 'Transaction cancelled successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Receiver Management
 */
const createReceiver = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'CustomerId',
      'FirstName',
      'LastName',
      'IDType',
      'IDNumber',
      'PhoneNumber'
    ]);
    if (missing.length) {
      return badRequest(res, 'Missing required receiver fields', missing);
    }

    if (!['PP', 'DL', 'NP_ID'].includes(req.body.IDType)) {
      return badRequest(res, 'IDType must be one of PP, DL, NP_ID');
    }

    const result = await imeService.createReceiver(req.body);

    const imeMeta = getImeResponseMeta(result);
    if (imeMeta.code && imeMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: imeMeta.message || 'Receiver creation failed in IME',
        imeCode: imeMeta.code,
        ...result
      });
    }

    return ok(res, 'Receiver created successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getReceiver = async (req, res) => {
  try {
    const { receiverId } = req.params;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }
    const result = await imeService.getReceiver(receiverId);
    return ok(res, 'Receiver retrieved successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

const updateReceiver = async (req, res) => {
  try {
    const { receiverId } = req.params;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }
    const result = await imeService.updateReceiver(receiverId, req.body);
    return ok(res, 'Receiver updated successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Bank & Payment Operations
 */
const getPaymentModes = async (req, res) => {
  try {
    const result = await imeService.getPaymentModes();
    return ok(res, 'Payment modes retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

const validateBankAccount = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['BankCode', 'AccountNumber']);
    if (missing.length) {
      return badRequest(res, 'Missing required bank account fields', missing);
    }

    const result = await imeService.validateBankAccount(
      req.body.BankCode,
      req.body.AccountNumber,
      req.body.CountryCode || 'NP'
    );
    return ok(res, 'Bank account validated', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getBankList = async (req, res) => {
  try {
    const { country } = req.query;
    const result = await imeService.getBankList(country || 'NP');
    return ok(res, 'Bank list retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Compliance & Verification
 */
const verifyKYC = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['CustomerId', 'IDType', 'IDNumber']);
    if (missing.length) {
      return badRequest(res, 'Missing required KYC fields', missing);
    }

    const result = await imeService.verifyKYC(req.body);
    return ok(res, 'KYC verification completed', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getComplianceStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }
    const result = await imeService.getComplianceStatus(customerId);
    return ok(res, 'Compliance status retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Reporting & Queries
 */
const getTransactionHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }
    const filters = req.query;
    const result = await imeService.getTransactionHistory(customerId, filters);
    return ok(res, 'Transaction history retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getExchangeRate = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return badRequest(res, 'Both "from" and "to" currency codes are required');
    }

    const source = String(from).toUpperCase();
    const destination = String(to).toUpperCase();

    if (!['AUD', 'USD', 'NZD', 'CAD', 'GBP'].includes(source)) {
      return badRequest(res, 'from must be one of AUD, USD, NZD, CAD, GBP');
    }

    if (destination !== 'NPR') {
      return badRequest(res, 'to must be NPR');
    }

    const result = await imeService.getExchangeRate(source, destination);
    return ok(res, 'Exchange rate retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

module.exports = {
  // Auth
  authenticate,
  login,

  // Customer
  createCustomer,
  searchCustomerByMobile,
  getCustomer,
  validateCustomer,

  // Remittance
  sendMoney,
  getTransactionStatus,
  cancelTransaction,

  // Receiver
  createReceiver,
  getReceiver,
  updateReceiver,

  // Payment
  getPaymentModes,
  validateBankAccount,
  getBankList,

  // Compliance
  verifyKYC,
  getComplianceStatus,

  // Reporting
  getTransactionHistory,
  getExchangeRate
};
