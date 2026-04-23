const imeEKycService = require('./ime.ekyc.service');

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
    message: error.message || 'IME eKYC operation failed',
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

/**
 * Generate OTT (One-Time Token)
 * POST /api/ime/ekyc/generate-ott
 */
const generateOTT = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'EntityType',
      'EntityId',
      'Owner'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { EntityType, EntityId, Owner, OTPToken, OTP } = req.body;

    // For Customer (203), OTP and OTPToken are required
    if (String(EntityType) === '203' && (!OTPToken || !OTP)) {
      return badRequest(res, 'OTPToken and OTP are required for Customer eKYC');
    }

    const result = await imeEKycService.generateOTT(
      EntityType,
      EntityId,
      Owner,
      String(EntityType) === '203' ? OTPToken : null,
      String(EntityType) === '203' ? OTP : null
    );

    return ok(res, 'OTT generated successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Get Unique Identifier after Aadhar validation
 * POST /api/ime/ekyc/get-unique-id
 */
const getUniqueId = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'EntityType',
      'EntityId'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { EntityType, EntityId } = req.body;

    const result = await imeEKycService.getUniqueId(EntityType, EntityId);

    return ok(res, 'Unique ID retrieved successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Bio KYC - Submit biometric fingerprint data
 * POST /api/ime/ekyc/bio-kyc
 */
const bioKyc = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'EntityType',
      'EntityId',
      'Pid'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { EntityType, EntityId, Pid } = req.body;

    const result = await imeEKycService.bioKyc(EntityType, EntityId, Pid);

    return ok(res, 'Bio KYC completed successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Customer Onboarding - Complete registration after eKYC
 * POST /api/ime/ekyc/customer-onboarding
 */
const customerOnboarding = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['MobileNo']);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { MobileNo } = req.body;

    const result = await imeEKycService.customerOnboarding(MobileNo);

    return ok(res, 'Customer onboarding completed successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Customer Requery - Get full customer details
 * POST /api/ime/ekyc/customer-requery
 */
const customerRequery = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, ['MobileNo']);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { MobileNo } = req.body;

    const result = await imeEKycService.customerRequery(MobileNo);

    return ok(res, 'Customer details retrieved successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Check Entity Status - Check onboarding progress
 * POST /api/ime/ekyc/check-entity-status
 */
const checkEntityStatus = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'EntityType',
      'EntityId'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { EntityType, EntityId } = req.body;

    const result = await imeEKycService.checkEntityStatus(EntityType, EntityId);

    return ok(res, 'Entity status retrieved successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Aadhar Customer Registration
 * POST /api/ime/ekyc/aadhar-registration
 */
const aadharCustomerRegistration = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'MobileNo',
      'FullName',
      'MaritalStatus',
      'DOB',
      'Gender',
      'Email',
      'Occupation',
      'SourceOfFund',
      'EstimatedAnnualIncome',
      'Country',
      'State',
      'District',
      'Address',
      'PinCode',
      'AadharNo'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const customerData = req.body;

    const result = await imeEKycService.aadharCustomerRegistration(customerData);

    return ok(res, 'Aadhar customer registration initiated', result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Aadhar Entity Reprocess - Clear/reset Aadhar KYC process
 * POST /api/ime/ekyc/aadhar-reprocess
 */
const aadharEntityReprocess = async (req, res) => {
  try {
    const missing = requiredFields(req.body || {}, [
      'EntityType',
      'EntityId',
      'ReprocessState'
    ]);

    if (missing.length) {
      return badRequest(res, 'Missing required fields', missing);
    }

    const { EntityType, EntityId, ReprocessState } = req.body;

    const result = await imeEKycService.aadharEntityReprocess(
      EntityType,
      EntityId,
      ReprocessState
    );

    return ok(res, 'Aadhar entity reprocessed successfully', result);
  } catch (error) {
    return fail(res, error);
  }
};

module.exports = {
  generateOTT,
  getUniqueId,
  bioKyc,
  customerOnboarding,
  customerRequery,
  checkEntityStatus,
  aadharCustomerRegistration,
  aadharEntityReprocess
};
