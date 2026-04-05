const soap = require('soap');

const getConfig = () => {
  const active = String(process.env.IME_ACTIVE || 'false').toLowerCase() === 'true';
  const baseUrl = (process.env.IME_BASE_URL || '').trim();
  const accessCode = (process.env.IME_ACCESS_CODE || '').trim();
  const partnerBranchId = (process.env.IME_PARTNER_BRANCH_ID || '').trim();
  const agentSessionId = (process.env.IME_AGENT_SESSION_ID || '').trim();
  const username = (process.env.IME_USERNAME || '').trim();
  const password = (process.env.IME_PASSWORD || '').trim();
  const timeoutMs = Number(process.env.IME_TIMEOUT_MS || 20000);

  return {
    active,
    baseUrl,
    accessCode,
    partnerBranchId,
    agentSessionId,
    username,
    password,
    timeoutMs
  };
};

const ensureConfigured = () => {
  const config = getConfig();
  if (!config.active) {
    throw new Error('IME is disabled. Set IME_ACTIVE=true to enable it.');
  }
  if (!config.baseUrl || !config.username || !config.password) {
    throw new Error('IME credentials missing. Set IME_BASE_URL, IME_USERNAME, IME_PASSWORD.');
  }
  return config;
};

let cachedClient = null;

const createSoapClient = async () => {
  if (cachedClient) {
    return cachedClient;
  }

  const config = ensureConfigured();
  const wsdlUrl = config.baseUrl + '?wsdl';

  try {
    const client = await soap.createClientAsync(wsdlUrl, {
      wsdl_options: { timeout: config.timeoutMs }
    });
    cachedClient = client;
    return client;
  } catch (error) {
    throw new Error(`Failed to create IME SOAP client: ${error.message}`);
  }
};

const withTimeout = async (promise, timeoutMs, label) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`IME ${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const buildCredentials = (config) => ({
  AccessCode: config.accessCode,
  UserName: config.username,
  Password: config.password,
  PartnerBranchId: config.partnerBranchId,
  AgentSessionId: config.agentSessionId
});

const METHOD_ALIASES = {
  Authenticate: 'BalanceInquiry',
  Login: 'BalanceInquiry',
  ValidateCustomer: 'CheckCustomer',
  GetCustomer: 'CheckCustomer',
  SearchCustomerByMobile: 'CheckCustomer',
  SendMoney: 'SendTransaction',
  GetTransactionStatus: 'TransactionInquiry',
  CancelTransaction: 'CancelTransaction',
  CreateCustomer: 'CustomerRegistration',
  ConfirmCustomerRegistration: 'ConfirmCustomerRegistration',
  CreateReceiver: 'CustomerRegistration',
  GetReceiver: 'CheckCustomer',
  UpdateReceiver: 'CustomerMobileAmendment',
  GetPaymentModes: 'GetStaticData',
  ValidateBankAccount: 'GetCalculation_V2',
  GetBankList: 'GetStaticData',
  VerifyKYC: 'CheckCustomer',
  GetComplianceStatus: 'CheckCSP',
  GetTransactionHistory: 'ReconcileReport',
  GetExchangeRate: 'GetCalculation_V2'
};

const buildRequestPayload = (methodName, config, params = {}) => {
  const credentials = buildCredentials(config);

  switch (methodName) {
    case 'BalanceInquiry':
      return { BalanceInquiryRequest: { Credentials: credentials } };
    case 'SendOTP':
      return {
        SendOTPRequest: {
          Credentials: credentials,
          Module: params.Module || params.module || 'IME',
          ReferenceValue: params.ReferenceValue || params.referenceValue || ''
        }
      };
    case 'TransactionInquiry':
      return {
        TransactionInquiryRequest: {
          Credentials: credentials,
          RefNoType: params.RefNoType || params.refNoType || 'RefNo',
          RefNo: params.RefNo || params.refNo || params.TransactionId || params.transactionId || ''
        }
      };
    case 'ReconcileReport':
      return {
        ReconcileReportRequest: {
          Credentials: credentials,
          ReportType: params.ReportType || params.reportType || 'All',
          FromDate: params.FromDate || params.fromDate || '',
          ToDate: params.ToDate || params.toDate || ''
        }
      };
    case 'SOAReport':
      return {
        SOAReportRequest: {
          Credentials: credentials,
          ReportType: params.ReportType || params.reportType || 'All',
          FromDate: params.FromDate || params.fromDate || '',
          ToDate: params.ToDate || params.toDate || ''
        }
      };
    case 'CheckCustomer':
      return {
        CheckCustomerRequest: {
          Credentials: credentials,
          CustomerId: params.CustomerId || params.customerId || params.CustomerIdNo || params.customerIdNo || '',
          MobileNumber: params.MobileNumber || params.mobileNumber || params.Mobile || params.mobile || params.PhoneNumber || params.phoneNumber || ''
        }
      };
    case 'GetCalculation':
    case 'GetCalculation_V2':
      return {
        [methodName + 'Request']: {
          Credentials: credentials,
          TransferAmount: params.TransferAmount || params.transferAmount || params.Amount || params.amount || '',
          SourceCurrency: params.SourceCurrency || params.sourceCurrency || 'USD',
          DestinationCurrency: params.DestinationCurrency || params.destinationCurrency || 'NPR'
        }
      };
    case 'SendTransaction':
      return {
        SendTransactionRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'ConfirmSendTransaction':
      return {
        ConfirmSendTransactionRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'CustomerRegistration':
      return {
        CustomerRegistrationRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'ConfirmCustomerRegistration':
      return {
        ConfirmCustomerRegistrationRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'CustomerMobileAmendment':
      return {
        CustomerMobileAmendmentRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'CSPRegistration':
      return {
        CSPRegistrationRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'CSPDocumentUpload':
      return {
        CSPDocumentUploadRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'CheckCSP':
      return {
        CheckCSPRequest: {
          Credentials: credentials,
          ...params
        }
      };
    case 'GetStaticData':
      return {
        GetStaticDataRequest: {
          Credentials: credentials,
          Type: params.Type || params.type || ''
        }
      };
    default:
      return {
        [methodName + 'Request']: {
          Credentials: credentials,
          ...params
        }
      };
  }
};

const callIMEMethod = async (methodName, params = {}) => {
  const config = ensureConfigured();
  const client = await createSoapClient();
  const resolvedMethodName = METHOD_ALIASES[methodName] || methodName;
  const asyncMethodName = resolvedMethodName + 'Async';

  if (typeof client[asyncMethodName] !== 'function') {
    throw new Error(`IME method '${methodName}' is not supported by the current WSDL. Try '${resolvedMethodName}' or check the API document.`);
  }

  const methodParams = buildRequestPayload(resolvedMethodName, config, params);

  try {
    const result = await withTimeout(
      client[asyncMethodName](methodParams),
      config.timeoutMs,
      methodName
    );
    return {
      success: true,
      method: resolvedMethodName,
      requestedMethod: methodName,
      data: result
    };
  } catch (error) {
    throw new Error(`IME ${methodName} failed: ${error.message}`);
  }
};

/**
 * Authentication & Session Management
 */
const authenticate = async (additionalParams = {}) => {
  return await callIMEMethod('Authenticate', additionalParams);
};

const login = async (additionalParams = {}) => {
  return await callIMEMethod('Login', additionalParams);
};

/**
 * Customer Operations
 */
const createCustomer = async (customerData) => {
  return await callIMEMethod('CreateCustomer', customerData);
};

const getCustomer = async (customerId) => {
  return await callIMEMethod('GetCustomer', { CustomerId: customerId });
};

const searchCustomerByMobile = async (mobile) => {
  return await callIMEMethod('SearchCustomerByMobile', { MobileNumber: mobile });
};

const validateCustomer = async (customerData) => {
  return await callIMEMethod('ValidateCustomer', customerData);
};

/**
 * Remittance/Transaction Operations
 */
const sendMoney = async (transactionData) => {
  return await callIMEMethod('SendMoney', transactionData);
};

const getTransactionStatus = async (transactionId) => {
  return await callIMEMethod('GetTransactionStatus', { TransactionId: transactionId });
};

const cancelTransaction = async (transactionId, reason) => {
  return await callIMEMethod('CancelTransaction', { 
    TransactionId: transactionId,
    CancellationReason: reason
  });
};

/**
 * Receiver Management
 */
const createReceiver = async (receiverData) => {
  return await callIMEMethod('CreateReceiver', receiverData);
};

const getReceiver = async (receiverId) => {
  return await callIMEMethod('GetReceiver', { ReceiverId: receiverId });
};

const updateReceiver = async (receiverId, receiverData) => {
  return await callIMEMethod('UpdateReceiver', { 
    ReceiverId: receiverId,
    ...receiverData
  });
};

/**
 * Bank & Payment Operations
 */
const getPaymentModes = async () => {
  return await callIMEMethod('GetPaymentModes');
};

const validateBankAccount = async (bankCode, accountNumber, countryCode = 'NP') => {
  return await callIMEMethod('ValidateBankAccount', {
    BankCode: bankCode,
    AccountNumber: accountNumber,
    CountryCode: countryCode
  });
};

const getBankList = async (countryCode = 'NP') => {
  return await callIMEMethod('GetBankList', { CountryCode: countryCode });
};

/**
 * Compliance & Verification
 */
const verifyKYC = async (kycData) => {
  return await callIMEMethod('VerifyKYC', kycData);
};

const getComplianceStatus = async (customerId) => {
  return await callIMEMethod('GetComplianceStatus', { CustomerId: customerId });
};

/**
 * Reporting & Queries
 */
const getTransactionHistory = async (customerId, filters = {}) => {
  return await callIMEMethod('GetTransactionHistory', {
    CustomerId: customerId,
    ...filters
  });
};

const getExchangeRate = async (sourceCurrency, destinationCurrency) => {
  return await callIMEMethod('GetExchangeRate', {
    SourceCurrency: sourceCurrency,
    DestinationCurrency: destinationCurrency
  });
};

module.exports = {
  getConfig,
  ensureConfigured,
  createSoapClient,
  callIMEMethod,

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
