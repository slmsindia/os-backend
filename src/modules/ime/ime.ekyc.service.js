const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * IME Phase 2 eKYC Service
 * REST-based endpoints for Aadhar-based KYC
 * Documentation: ime.md Section 12
 */

const getEKycConfig = () => {
  return {
    active: String(process.env.IME_ACTIVE || 'false').toLowerCase() === 'true',
    baseUrl: (process.env.IME_BASE_URL || '').trim(),
    eKycBaseUrl: (process.env.IME_EKYC_BASE_URL || 'https://uiduat.rblbank.com/PrepaidCustomerLogin').trim(),
    accessCode: (process.env.IME_ACCESS_CODE || '').trim(),
    username: (process.env.IME_USERNAME || '').trim(),
    password: (process.env.IME_PASSWORD || '').trim(),
    partnerBranchId: (process.env.IME_PARTNER_BRANCH_ID || '').trim(),
    timeoutMs: Number(process.env.IME_TIMEOUT_MS || 30000)
  };
};

const generateAgentSessionId = () => {
  return `EKYC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const buildCredentials = (config, agentSessionId) => ({
  AccessCode: config.accessCode,
  UserName: config.username,
  Password: config.password,
  PartnerBranchId: config.partnerBranchId,
  AgentSessionId: agentSessionId
});

/**
 * Generate OTT (One-Time Token)
 * Returns URL for Aadhar validation
 * Endpoint: POST /GenerateOTT
 */
const generateOTT = async (entityType, entityId, owner, otpToken = null, otp = null) => {
  const config = getEKycConfig();
  if (!config.active) {
    throw new Error('IME eKYC is disabled');
  }

  const agentSessionId = generateAgentSessionId();
  
  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityType: String(entityType), // 201=CSP, 203=Customer
    EntityId: String(entityId),
    Owner: String(owner)
  };

  // OTT and OTP required only for Customer (203)
  if (String(entityType) === '203') {
    if (!otpToken || !otp) {
      throw new Error('OTPToken and OTP are required for Customer eKYC');
    }
    requestBody.OTPToken = otpToken;
    requestBody.OTP = otp;
  }

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/GenerateOTT`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;
    
    // Store OTT token in database for tracking
    if (result.Code === '0' && result.Url) {
      await prisma.iMECustomer.upsert({
        where: { mobileNo: String(entityId) },
        update: {
          eKycOttToken: result.OTPToken || '',
          eKycStatus: 'OTT_Generated'
        },
        create: {
          mobileNo: String(entityId),
          firstName: 'Pending',
          lastName: 'Pending',
          nationality: 'IND',
          maritalStatus: '1902',
          dateOfBirth: '1990/01/01',
          gender: '1801',
          fatherOrMotherName: 'Pending',
          occupation: '8081',
          permanentState: '',
          permanentDistrict: '',
          permanentAddress: 'Pending',
          tempState: '',
          tempDistrict: '',
          tempAddress: 'Pending',
          idType: 'AADHAR',
          idNumber: '',
          idIssueDate: '2020/01/01',
          eKycStatus: 'OTT_Generated',
          eKycOttToken: result.OTPToken || ''
        }
      });
    }

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status,
      url: result.Url
    };
  } catch (error) {
    throw new Error(`GenerateOTT failed: ${error.message}`);
  }
};

/**
 * Get Unique Identifier after Aadhar validation
 * Endpoint: POST /UniqueIdentifier
 */
const getUniqueId = async (entityType, entityId) => {
  const config = getEKycConfig();
  const agentSessionId = generateAgentSessionId();

  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityType: String(entityType),
    EntityId: String(entityId)
  };

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/UniqueIdentifier`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;

    if (result.Code === '0') {
      await prisma.iMECustomer.update({
        where: { mobileNo: String(entityId) },
        data: {
          eKycUniqueId: result.UniqueId || result.Status,
          eKycStatus: 'UniqueID_Retrieved'
        }
      });
    }

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status,
      uniqueId: result.UniqueId || result.Status
    };
  } catch (error) {
    throw new Error(`GetUniqueId failed: ${error.message}`);
  }
};

/**
 * Bio KYC - Submit biometric fingerprint data
 * Endpoint: POST /BioKyc
 */
const bioKyc = async (entityType, entityId, pid) => {
  const config = getEKycConfig();
  const agentSessionId = generateAgentSessionId();

  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityType: String(entityType),
    EntityId: String(entityId),
    Pid: String(pid) // Base64 encoded PID XML from biometric device
  };

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/BioKyc`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;

    // Handle response codes
    if (result.Code === '0') {
      await prisma.iMECustomer.update({
        where: { mobileNo: String(entityId) },
        data: {
          eKycStatus: 'BioKyc_Completed'
        }
      });
    } else if (result.Code === '102') {
      // Re-initiated - start from GenerateOTT again
      await prisma.iMECustomer.update({
        where: { mobileNo: String(entityId) },
        data: {
          eKycStatus: 'Re_Initiated'
        }
      });
    }

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status
    };
  } catch (error) {
    throw new Error(`BioKyc failed: ${error.message}`);
  }
};

/**
 * Customer Onboarding - Complete registration after eKYC
 * Endpoint: POST /CustomerOnboarding
 */
const customerOnboarding = async (mobileNo) => {
  const config = getEKycConfig();
  const agentSessionId = generateAgentSessionId();

  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityId: String(mobileNo)
  };

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/CustomerOnboarding`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;

    if (result.Code === '0') {
      await prisma.iMECustomer.update({
        where: { mobileNo: String(mobileNo) },
        data: {
          eKycStatus: 'Onboarding_Completed',
          kycStatus: 'Approved',
          amlStatus: true
        }
      });
    }

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status
    };
  } catch (error) {
    throw new Error(`CustomerOnboarding failed: ${error.message}`);
  }
};

/**
 * Customer Requery - Get full customer details
 * Endpoint: POST /CustomerRequery
 */
const customerRequery = async (mobileNo) => {
  const config = getEKycConfig();
  const agentSessionId = generateAgentSessionId();

  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityId: String(mobileNo)
  };

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/CustomerRequery`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;

    if (result.Code === '0') {
      // Update local database with IME data
      await prisma.iMECustomer.update({
        where: { mobileNo: String(mobileNo) },
        data: {
          kycStatus: result.KYCStatus || 'Pending',
          amlStatus: result.AMLStatus === 'True' || result.AMLStatus === true,
          imeCustomerId: result.CustomerId || result.EntityId
        }
      });
    }

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status,
      customerData: result
    };
  } catch (error) {
    throw new Error(`CustomerRequery failed: ${error.message}`);
  }
};

/**
 * Check Entity Status - Check onboarding progress
 * Endpoint: POST /CheckEntityStatus
 */
const checkEntityStatus = async (entityType, entityId) => {
  const config = getEKycConfig();
  const agentSessionId = generateAgentSessionId();

  const requestBody = {
    ...buildCredentials(config, agentSessionId),
    EntityType: String(entityType),
    EntityId: String(entityId)
  };

  try {
    const response = await axios.post(
      `${config.eKycBaseUrl}/CheckEntityStatus`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeoutMs
      }
    );

    const result = response.data;

    return {
      code: result.Code,
      message: result.Message,
      agentSessionId: result.AgentSessionId,
      status: result.Status,
      isEligibleForTxn: result.IsEligibleForTxn
    };
  } catch (error) {
    throw new Error(`CheckEntityStatus failed: ${error.message}`);
  }
};

/**
 * Aadhar Customer Registration (SOAP-based alternative)
 * Method Name: AadharCustomerRegistration
 */
const aadharCustomerRegistration = async (customerData) => {
  const { callIMEMethod } = require('./ime.service');
  
  const params = {
    MobileNo: customerData.mobileNo,
    FullName: customerData.fullName,
    MaritalStatus: customerData.maritalStatus,
    DOB: customerData.dob, // YYYY/MM/DD
    Gender: customerData.gender,
    Email: customerData.email,
    Occupation: customerData.occupation,
    SourceOfFund: customerData.sourceOfFund,
    EstimatedAnnualIncome: customerData.estimatedAnnualIncome,
    Country: customerData.country,
    State: customerData.state,
    District: customerData.district,
    Address: customerData.address,
    PinCode: customerData.pinCode,
    AadharNo: customerData.aadharNo,
    PhotoData: customerData.photoData || '',
    PhotoDataType: customerData.photoDataType || '',
    IdData: customerData.idData || '',
    IdDataType: customerData.idDataType || ''
  };

  try {
    const result = await callIMEMethod('AadharCustomerRegistration', params);
    
    // Store in database
    if (result.code === '0' && result.customerToken) {
      await prisma.iMECustomer.upsert({
        where: { mobileNo: customerData.mobileNo },
        update: {
          customerToken: result.customerToken,
          aadharNo: customerData.aadharNo,
          eKycStatus: 'Aadhar_Registered'
        },
        create: {
          mobileNo: customerData.mobileNo,
          firstName: customerData.fullName.split(' ')[0] || '',
          lastName: customerData.fullName.split(' ').slice(-1).join('') || '',
          nationality: 'IND',
          maritalStatus: customerData.maritalStatus,
          dateOfBirth: customerData.dob,
          gender: customerData.gender,
          email: customerData.email,
          occupation: customerData.occupation,
          sourceOfFund: customerData.sourceOfFund,
          permanentState: customerData.state,
          permanentDistrict: customerData.district,
          permanentAddress: customerData.address,
          tempState: customerData.state,
          tempDistrict: customerData.district,
          tempAddress: customerData.address,
          idType: 'AADHAR',
          idNumber: customerData.aadharNo,
          idIssueDate: '2020/01/01',
          customerToken: result.customerToken,
          aadharNo: customerData.aadharNo,
          eKycStatus: 'Aadhar_Registered'
        }
      });
    }

    return result;
  } catch (error) {
    throw new Error(`AadharCustomerRegistration failed: ${error.message}`);
  }
};

/**
 * Aadhar Entity Reprocess - Clear/reset Aadhar KYC process
 * Method Name: AadharEntityReprocess
 */
const aadharEntityReprocess = async (entityType, entityId, reprocessState) => {
  const { callIMEMethod } = require('./ime.service');
  
  const params = {
    EntityType: String(entityType), // 201=CSP, 203=Customer
    EntityId: String(entityId),
    ReprocessState: String(reprocessState) // From GetStaticData WSST-AERV1
  };

  try {
    const result = await callIMEMethod('AadharEntityReprocess', params);

    // Update database
    if (result.code === '0') {
      await prisma.iMECustomer.update({
        where: { mobileNo: String(entityId) },
        data: {
          eKycStatus: 'Reprocessed'
        }
      });
    }

    return result;
  } catch (error) {
    throw new Error(`AadharEntityReprocess failed: ${error.message}`);
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
