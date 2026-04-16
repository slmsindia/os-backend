const imeService = require('./ime.service');
const imeDataService = require('./ime-data.service');

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

const proxyImeMethod = (methodName, successMessage, buildParams) => async (req, res) => {
  try {
    const params = typeof buildParams === 'function' ? buildParams(req) : (req.body || {});
    const result = await imeService.callIMEMethod(methodName, params || {});
    return ok(res, successMessage || `${methodName} completed`, result);
  } catch (error) {
    return fail(res, error);
  }
};

const fetchStaticType = (typeCode, successMessage, buildReference) => async (req, res) => {
  try {
    const referenceValue = typeof buildReference === 'function' ? buildReference(req) : '';
    const result = await imeService.getStaticData(typeCode, referenceValue || '');
    return ok(res, successMessage || `${typeCode} retrieved`, result);
  } catch (error) {
    return fail(res, error);
  }
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

const getImePayload = (result = {}) => {
  const dataArray = Array.isArray(result?.data) ? result.data : [];
  const envelopeObject = dataArray.find((item) => item && typeof item === 'object' && !Array.isArray(item));
  if (!envelopeObject) {
    return {};
  }

  const firstKey = Object.keys(envelopeObject)[0];
  return firstKey ? envelopeObject[firstKey] || {} : {};
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
      'PhoneNumber',
      'Nationality',
      'MaritalStatus',
      'FatherOrMotherName',
      'Occupation',
      'State',
      'District',
      'Municipality',
      'Address',
      'IDIssueDate',
      'IdData'
    ]);
    if (missing.length) {
      return badRequest(res, 'Missing required customer fields', missing);
    }

    if (!['M', 'F'].includes(req.body.Gender)) {
      return badRequest(res, 'Gender must be M or F');
    }

    if (!['PP', 'DL', 'NP_ID', 'AADHAR'].includes(req.body.IDType)) {
      return badRequest(res, 'IDType must be one of PP, DL, NP_ID, AADHAR');
    }

    const normalizedDob = String(req.body.DateOfBirth || '').trim();
    const normalizedIssueDate = String(req.body.IDIssueDate || '').trim();
    const idType = String(req.body.IDType || '').trim();
    const idNumber = String(req.body.IDNumber || '').trim();

    if (!/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(normalizedDob)) {
      return badRequest(res, 'DateOfBirth must be in YYYY-MM-DD or YYYY/MM/DD format');
    }

    if (!/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(normalizedIssueDate)) {
      return badRequest(res, 'IDIssueDate must be in YYYY-MM-DD or YYYY/MM/DD format');
    }

    if (idType === 'NP_ID') {
      if (!/^[0-9\-/]+$/.test(idNumber)) {
        return badRequest(res, 'For NP_ID, IDNumber must contain digits with optional - or /');
      }

      const compactId = idNumber.replace(/[^0-9]/g, '');
      if (compactId.length < 8) {
        return badRequest(res, 'For NP_ID, IDNumber must have at least 8 digits');
      }
    }

    if (idType === 'AADHAR') {
      const compactId = idNumber.replace(/\D/g, '');
      if (compactId.length !== 12) {
        return badRequest(res, 'For AADHAR, IDNumber must be exactly 12 digits');
      }
    }

    const nationality = String(req.body.Nationality || '').trim().toUpperCase();
    if (!['NPL', 'NP', 'NEPAL', 'IND', 'IN', 'INDIA'].includes(nationality)) {
      return badRequest(res, 'Nationality should be NPL (or NP/NEPAL) for Nepal profile');
    }

    const result = await imeService.createCustomer(req.body);

    const registrationMeta = getImeResponseMeta(result);
    if (registrationMeta.code && registrationMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: registrationMeta.message || 'Customer registration failed in IME',
        imeCode: registrationMeta.code,
        ...result
      });
    }

    const otp = String(req.body.OTP || '').trim();
    const otpToken = String(req.body.OTPToken || '').trim();
    const shouldAutoConfirm = Boolean(otp || otpToken);

    if (!shouldAutoConfirm) {
      return ok(res, 'Customer created successfully. Confirm with OTP to activate.', result);
    }

    if (!otp || !otpToken) {
      return badRequest(res, 'Both OTP and OTPToken are required for auto-confirm');
    }

    const registrationPayload = getImePayload(result);
    const customerToken = String(registrationPayload.CustomerToken || '').trim();
    if (!customerToken) {
      return res.status(400).json({
        success: false,
        message: 'Customer created but CustomerToken missing for OTP confirmation',
        registration: result
      });
    }

    const confirmation = await imeService.confirmCustomerRegistration({
      OTP: otp,
      OTPToken: otpToken,
      CustomerToken: customerToken
    });

    const confirmationMeta = getImeResponseMeta(confirmation);
    if (confirmationMeta.code && confirmationMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: confirmationMeta.message || 'Customer OTP confirmation failed in IME',
        imeCode: confirmationMeta.code,
        registration: result,
        confirmation
      });
    }

    return ok(res, 'Customer created and confirmed successfully', {
      registration: result,
      confirmation
    });
  } catch (error) {
    return fail(res, error);
  }
};

const sendCustomerOtp = async (req, res) => {
  try {
    const referenceValue = String(req.body?.ReferenceValue || req.body?.PhoneNumber || '').trim();
    if (!referenceValue) {
      return badRequest(res, 'Missing required OTP fields', ['ReferenceValue or PhoneNumber']);
    }

    const requestedModule = String(req.body.Module || process.env.IME_SEND_OTP_MODULE || 'CustomerRegistration').trim();
    const fallbackModules = String(
      process.env.IME_SEND_OTP_MODULE_FALLBACKS || 'CustomerRegistration,Customer,SenderRegistration,Registration'
    )
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    const moduleCandidates = [...new Set([requestedModule, ...fallbackModules])];

    let finalResult = null;
    let finalMeta = null;
    let moduleUsed = requestedModule;
    const attempts = [];

    for (const moduleName of moduleCandidates) {
      const result = await imeService.sendCustomerOtp(referenceValue, moduleName);
      const imeMeta = getImeResponseMeta(result);

      attempts.push({
        module: moduleName,
        imeCode: imeMeta.code || '',
        imeMessage: imeMeta.message || ''
      });

      finalResult = result;
      finalMeta = imeMeta;
      moduleUsed = moduleName;

      if (!imeMeta.code || imeMeta.code === '0') {
        break;
      }

      // Retry only when IME explicitly says module name is invalid.
      if (imeMeta.code !== '704') {
        break;
      }
    }

    if (finalMeta?.code && finalMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: finalMeta.message || 'Failed to send IME OTP',
        imeCode: finalMeta.code,
        moduleUsed,
        attempts,
        ...finalResult
      });
    }

    return ok(res, 'Customer OTP sent successfully', {
      ...finalResult,
      moduleUsed,
      attempts
    });
  } catch (error) {
    return fail(res, error);
  }
};

const confirmCustomer = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['CustomerToken', 'OTPToken', 'OTP']);
    if (missing.length) {
      return badRequest(res, 'Missing required confirmation fields', missing);
    }

    const result = await imeService.confirmCustomerRegistration(req.body);
    const imeMeta = getImeResponseMeta(result);
    if (imeMeta.code && imeMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: imeMeta.message || 'Customer confirmation failed in IME',
        imeCode: imeMeta.code,
        ...result
      });
    }

    return ok(res, 'Customer confirmed successfully', result);
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

const customerRequery = async (req, res) => {
  try {
    const entityId = String(req.query.entityId || req.query.mobile || '').trim();
    if (!entityId) {
      return badRequest(res, 'entityId or mobile query is required');
    }

    const [requeryResult, uniqueIdResult] = await Promise.allSettled([
      imeService.customerRequery(entityId),
      imeService.getUniqueId('Customer', entityId)
    ]);

    if (requeryResult.status === 'rejected' && uniqueIdResult.status === 'rejected') {
      throw requeryResult.reason || uniqueIdResult.reason;
    }

    const payload = {
      entityId,
      requery: requeryResult.status === 'fulfilled' ? requeryResult.value : null,
      uniqueId: uniqueIdResult.status === 'fulfilled' ? uniqueIdResult.value : null,
      warnings: {
        requery:
          requeryResult.status === 'rejected'
            ? String(requeryResult.reason?.message || requeryResult.reason || 'CustomerRequery failed')
            : null,
        uniqueId:
          uniqueIdResult.status === 'rejected'
            ? String(uniqueIdResult.reason?.message || uniqueIdResult.reason || 'GetUniqueId failed')
            : null
      }
    };

    const partialFailure = Boolean(payload.warnings.requery || payload.warnings.uniqueId);

    return ok(
      res,
      partialFailure
        ? 'Customer requery completed with partial data'
        : 'Customer requery completed',
      payload
    );
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

const getBankBranches = async (req, res) => {
  try {
    const { country, bank } = req.query;
    const result = await imeService.getBankBranches(country || 'NP', bank || '');
    return ok(res, 'Bank branches retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getStaticData = async (req, res) => {
  try {
    const { type, reference } = req.query;
    if (!String(type || '').trim()) {
      return badRequest(res, 'type query parameter is required');
    }

    const result = await imeService.getStaticData(type, reference || '');
    return ok(res, 'Static data retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

const getIssuePlaces = async (req, res) => {
  try {
    const { country, idType } = req.query;
    const result = await imeService.getIssuePlaces(country || 'NP', idType || '');
    return ok(res, 'Issue places retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Compliance & Verification
 */
const verifyKYC = async (req, res) => {
  try {
    const entityId = String(req.body?.EntityId || req.body?.CustomerId || '').trim();
    if (!entityId) {
      return badRequest(res, 'Missing required KYC fields', ['CustomerId or EntityId']);
    }

    const result = await imeService.verifyKYC({
      ...req.body,
      EntityId: entityId,
      EntityType: String(req.body?.EntityType || 'Customer').trim()
    });
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

/**
 * IME Data Storage Operations
 */
const listImeData = async (req, res) => {
  try {
    const data = await imeDataService.list();
    return ok(res, 'IME data fetched successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const createImeData = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['name', 'mobile', 'relationship']);
    if (missing.length) {
      return badRequest(res, 'Missing required IME data fields', missing);
    }

    const data = await imeDataService.create(req.body);
    return ok(res, 'IME data saved successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const updateImeData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return badRequest(res, 'id is required');
    }

    const missing = requiredFields(req.body || {}, ['name', 'mobile', 'relationship']);
    if (missing.length) {
      return badRequest(res, 'Missing required IME data fields', missing);
    }

    const data = await imeDataService.update(id, req.body);
    return ok(res, 'IME data updated successfully', { data });
  } catch (error) {
    return fail(res, error);
  }
};

const deleteImeData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return badRequest(res, 'id is required');
    }

    await imeDataService.remove(id);
    return ok(res, 'IME data deleted successfully');
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Legacy IME Contract Compatibility Endpoints (/api/IME/*)
 */
const amendTransactionLegacy = proxyImeMethod('AmendTransaction', 'Transaction amended successfully');
const balanceInquiryLegacy = proxyImeMethod('BalanceInquiry', 'Balance inquiry fetched', () => ({}));
const cspDocumentUploadLegacy = proxyImeMethod(
  'CSPDocumentUpload',
  'CSP document upload request submitted',
  (req) => {
    if (Array.isArray(req.body)) {
      return { DocumentList: req.body };
    }
    return req.body || {};
  }
);
const getAccountTypeLegacy = fetchStaticType('AccountType', 'Account type list retrieved');
const countriesLegacy = fetchStaticType('Country', 'Countries retrieved');
const statesLegacy = fetchStaticType('State', 'States retrieved', (req) => req.params.CountryId || '');
const districtsLegacy = fetchStaticType('District', 'Districts retrieved', (req) => req.params.StateId || '');
const gendersLegacy = fetchStaticType('Gender', 'Genders retrieved');
const maritalStatusLegacy = fetchStaticType('MaritalStatus', 'Marital status list retrieved');
const occupationLegacy = fetchStaticType('Occupation', 'Occupation list retrieved');
const purposeOfRemittanceLegacy = fetchStaticType('PurposeOfRemittance', 'Purpose of remittance list retrieved');
const transactionCancelReasonLegacy = fetchStaticType('TransactionCancelReason', 'Transaction cancel reasons retrieved');
const getIdTypesLegacy = fetchStaticType('IdType', 'ID types retrieved', (req) => req.query.countrycode || req.query.countryCode || '');
const getIdentityTypesLegacy = fetchStaticType('IdentityType', 'Identity types retrieved', (req) => req.query.countrycode || req.query.countryCode || '');
const cspRegistrationTypeListLegacy = fetchStaticType('CSPRegistrationTypeList', 'CSP registration types retrieved');
const cspAddressProofTypeListLegacy = fetchStaticType('CSPAddressProofTypeList', 'CSP address proof types retrieved');
const cspOwnerAddressProofTypeListLegacy = fetchStaticType('CSPOwnerAddressProofTypeList', 'CSP owner address proof types retrieved');
const cspBusinessTypeListLegacy = fetchStaticType('CSPBusinessTypeList', 'CSP business types retrieved');
const cspDocumentTypeListLegacy = fetchStaticType('CSPDocumentTypeList', 'CSP document types retrieved');
const ownerCategoryTypesLegacy = fetchStaticType('OwnerCategoryTypes', 'Owner category types retrieved');
const educationalQualificationListLegacy = fetchStaticType('EducationalQualificationList', 'Educational qualification list retrieved');
const municipalitiesLegacy = fetchStaticType('Municipality', 'Municipalities retrieved', (req) => req.params.DistrictId || '');
const relationshipListLegacy = fetchStaticType('Relationship', 'Relationship list retrieved');
const idPlaceOfIssueLegacy = async (req, res) => {
  try {
    const countryCode = req.query.countrycode || req.query.countryCode || 'NP';
    const idType = req.query.idType || '';
    const result = await imeService.getIssuePlaces(countryCode, idType);
    return ok(res, 'ID place of issue list retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};
const sourceOfFundListLegacy = fetchStaticType('SourceOfFund', 'Source of fund list retrieved');
const cspRegistrationLegacy = proxyImeMethod('CSPRegistration', 'CSP registration submitted');
const cancelTransactionLegacy = proxyImeMethod('CancelTransaction', 'Transaction cancel request submitted', (req) => ({
  RefNo: req.body?.refNo || req.body?.RefNo || req.body?.transactionId || '',
  CancelReason: req.body?.cancelReason || req.body?.CancelReason || req.body?.reason || '',
  OTPToken: req.body?.otpToken || req.body?.OTPToken || '',
  OTP: req.body?.otp || req.body?.OTP || ''
}));
const checkCSPLegacy = proxyImeMethod('CheckCSP', 'CSP status fetched', (req) => ({
  CSPCode: req.query.cspcode || req.query.CSPCode || req.query.cspCode || ''
}));
const checkCustomerLegacy = proxyImeMethod('CheckCustomer', 'Customer check completed', (req) => ({
  MobileNo: req.params.mobileNo || ''
}));
const confirmCustomerRegistrationLegacy = proxyImeMethod('ConfirmCustomerRegistration', 'Customer registration confirmed', (req) => ({
  OTP: req.body?.otp || req.body?.OTP || '',
  CustomerToken: req.body?.customerToken || req.body?.CustomerToken || '',
  OTPToken: req.body?.otpToken || req.body?.OTPToken || ''
}));
const confirmSendTransactionLegacy = proxyImeMethod('ConfirmSendTransaction', 'Send transaction confirmed', (req) => ({
  RefNo: req.body?.refNo || req.body?.RefNo || '',
  OTPToken: req.body?.otpToken || req.body?.OTPToken || '',
  OTP: req.body?.otp || req.body?.OTP || ''
}));
const customerMobileAmendmentLegacy = proxyImeMethod('CustomerMobileAmendment', 'Customer mobile amendment submitted');
const customerRegistrationLegacy = proxyImeMethod('CustomerRegistration', 'Customer registration submitted');
const getCalculationLegacy = proxyImeMethod('GetCalculation', 'Calculation fetched');
const sendOtpLegacy = proxyImeMethod('SendOTP', 'OTP sent');
const sendTransactionLegacy = proxyImeMethod('SendTransaction', 'Transaction send request submitted');
const transactionInquiryLegacy = proxyImeMethod('TransactionInquiry', 'Transaction inquiry fetched');
const transactionInquiryDefaultLegacy = proxyImeMethod('TransactionInquiryDefault', 'Transaction inquiry default fetched');
const bankListLegacy = async (req, res) => {
  try {
    const result = await imeService.getBankList(req.params.CountryId || 'NP');
    return ok(res, 'Bank list retrieved', result);
  } catch (error) {
    return fail(res, error);
  }
};
const bankBranchListLegacy = async (req, res) => {
  try {
    const countryCode = req.query.countrycode || req.query.countryCode || 'NP';
    const result = await imeService.getBankBranches(countryCode, req.params.BankId || '');
    return ok(res, 'Bank branch list retrieved', result);
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
  sendCustomerOtp,
  confirmCustomer,
  searchCustomerByMobile,
  customerRequery,
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
  getBankBranches,
  getStaticData,
  getIssuePlaces,

  // Compliance
  verifyKYC,
  getComplianceStatus,

  // Reporting
  getTransactionHistory,
  getExchangeRate,

  // IME Data
  listImeData,
  createImeData,
  updateImeData,
  deleteImeData,

  // Legacy IME endpoints (all required for /api/IME/*)
  getCalculation: getCalculationLegacy,
  sendOtp: sendOtpLegacy,
  sendTransaction: sendTransactionLegacy,
  customerRegistration: customerRegistrationLegacy,
  confirmCustomerRegistration: confirmCustomerRegistrationLegacy,
  balanceInquiry: balanceInquiryLegacy,
  checkCustomer: checkCustomerLegacy,
  confirmSendTransaction: confirmSendTransactionLegacy,
  transactionInquiry: transactionInquiryLegacy,
  transactionInquiryDefault: transactionInquiryDefaultLegacy,
  amendTransaction: amendTransactionLegacy,
  customerMobileAmendment: customerMobileAmendmentLegacy,
  getAccountType: getAccountTypeLegacy,
  countries: countriesLegacy,
  states: statesLegacy,
  districts: districtsLegacy,
  genders: gendersLegacy,
  maritalStatus: maritalStatusLegacy,
  occupation: occupationLegacy,
  purposeOfRemittance: purposeOfRemittanceLegacy,
  transactionCancelReason: transactionCancelReasonLegacy,
  getIdTypes: getIdTypesLegacy,
  getIdentityTypes: getIdentityTypesLegacy,
  bankList: bankListLegacy,
  bankBranchList: bankBranchListLegacy,
  cspRegistrationTypeList: cspRegistrationTypeListLegacy,
  cspAddressProofTypeList: cspAddressProofTypeListLegacy,
  cspOwnerAddressProofTypeList: cspOwnerAddressProofTypeListLegacy,
  cspBusinessTypeList: cspBusinessTypeListLegacy,
  cspDocumentTypeList: cspDocumentTypeListLegacy,
  ownerCategoryTypes: ownerCategoryTypesLegacy,
  educationalQualificationList: educationalQualificationListLegacy,
  municipalities: municipalitiesLegacy,
  relationshipList: relationshipListLegacy,
  idPlaceOfIssue: idPlaceOfIssueLegacy,
  sourceOfFundList: sourceOfFundListLegacy,
  cspRegistration: cspRegistrationLegacy,
  cancelTransaction: cancelTransactionLegacy,
  checkCSP: checkCSPLegacy,
  checkCustomer: checkCustomerLegacy,
  confirmCustomerRegistration: confirmCustomerRegistrationLegacy,
  confirmSendTransaction: confirmSendTransactionLegacy,
  customerRegistration: customerRegistrationLegacy,
  getCalculation: getCalculationLegacy,
  sendOtp: sendOtpLegacy,
  sendTransaction: sendTransactionLegacy,
  cspDocumentUpload: cspDocumentUploadLegacy
};
