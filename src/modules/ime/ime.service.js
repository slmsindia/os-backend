const soap = require('soap');
const fs = require('fs');
const path = require('path');
const https = require('https');

const getConfig = () => {
  const active = String(process.env.IME_ACTIVE || 'false').toLowerCase() === 'true';
  const baseUrl = (process.env.IME_BASE_URL || '').trim();
  const accessCode = (process.env.IME_ACCESS_CODE || '').trim();
  const partnerBranchId = (process.env.IME_PARTNER_BRANCH_ID || '').trim();
  const agentSessionId = (process.env.IME_AGENT_SESSION_ID || '').trim();
  const username = (process.env.IME_USERNAME || '').trim();
  const password = (process.env.IME_PASSWORD || '').trim();
  const timeoutMs = Number(process.env.IME_TIMEOUT_MS || 20000);
  const caBundlePath = (process.env.IME_CA_BUNDLE_PATH || path.join(process.cwd(), 'certs', 'ime-ca-bundle.pem')).trim();

  return {
    active,
    baseUrl,
    accessCode,
    partnerBranchId,
    agentSessionId,
    username,
    password,
    timeoutMs,
    caBundlePath
  };
};

const getTrustedCABundle = (caBundlePath) => {
  try {
    const resolvedPath = path.isAbsolute(caBundlePath)
      ? caBundlePath
      : path.resolve(process.cwd(), caBundlePath);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return null;
    }

    const certBuffer = fs.readFileSync(resolvedPath);
    return certBuffer.length ? certBuffer : null;
  } catch {
    return null;
  }
};

const fetchWsdlWithTrustedCa = (wsdlUrl, trustedCa, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const req = https.get(wsdlUrl, {
      ca: trustedCa,
      rejectUnauthorized: true,
      timeout: timeoutMs
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`WSDL download failed with status ${res.statusCode}`));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve(body);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`WSDL download timed out after ${timeoutMs}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
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
  const trustedCa = getTrustedCABundle(config.caBundlePath);

  try {
    let client;

    if (trustedCa) {
      const wsdlXml = await fetchWsdlWithTrustedCa(wsdlUrl, trustedCa, config.timeoutMs);
      const wsdlCachePath = path.join(process.cwd(), 'certs', 'ime-runtime.wsdl');
      fs.mkdirSync(path.dirname(wsdlCachePath), { recursive: true });
      fs.writeFileSync(wsdlCachePath, wsdlXml, 'utf8');

      client = await soap.createClientAsync(wsdlCachePath, {
        wsdl_options: { timeout: config.timeoutMs }
      });

      client.setEndpoint(config.baseUrl);
      client.setSecurity(
        new soap.ClientSSLSecurity(undefined, undefined, [trustedCa], {
          rejectUnauthorized: true
        })
      );
    } else {
      client = await soap.createClientAsync(wsdlUrl, {
        wsdl_options: { timeout: config.timeoutMs }
      });
    }

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
  ValidateBankAccount: 'GetCalculation',
  GetBankList: 'GetStaticData',
  VerifyKYC: 'CheckCustomer',
  GetComplianceStatus: 'CheckCSP',
  GetTransactionHistory: 'ReconcileReport',
  GetExchangeRate: 'GetCalculation'
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const asString = (...values) => {
  const picked = firstNonEmpty(...values);
  return picked === '' ? '' : String(picked);
};

const normalizePaymentType = (value, fallback = 'C') => {
  const raw = asString(value, fallback).trim().toUpperCase();

  if (raw === 'C' || raw === 'CASH' || raw === 'CASH PICKUP' || raw === 'CASHPAY' || raw === 'CASH PAY') {
    return 'C';
  }

  if (raw === 'B' || raw === 'BANK' || raw === 'BANK TRANSFER' || raw === 'ACCOUNT DEPOSIT TO BANK') {
    return 'B';
  }

  return fallback;
};

const normalizeImeDate = (value, fallback = '1990/01/01') => {
  const raw = asString(value, fallback).trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.replace(/-/g, '/');
  }

  return raw;
};

const normalizeNationality = (value, fallback = 'NPL') => {
  const raw = asString(value, fallback).trim().toUpperCase();

  if (raw === 'NP' || raw === 'NPL' || raw === 'NEPAL') {
    return 'NPL';
  }

  if (raw === 'IN' || raw === 'IND' || raw === 'INDIA') {
    return 'IND';
  }

  return raw || fallback;
};

const normalizeImeIdType = (value, fallback = '1301') => {
  const raw = asString(value, fallback).trim().toUpperCase();

  if (raw === 'NP_ID' || raw === 'CITIZENSHIP' || raw === '1301') {
    return '1301';
  }

  if (raw === 'PP' || raw === 'PASSPORT' || raw === '1302') {
    return '1302';
  }

  return raw || fallback;
};

const normalizeOccupation = (value, fallback = '8081') => {
  const raw = asString(value, fallback).trim().toUpperCase();

  if (raw === '8080' || raw === 'BUSINESSMAN' || raw === 'BUSINESS') {
    return '8080';
  }
  if (raw === '8081' || raw === 'SALARIED' || raw === 'SERVICE') {
    return '8081';
  }
  if (raw === '8082' || raw === 'SELF EMPLOYED' || raw === 'SELF_EMPLOYED') {
    return '8082';
  }
  if (raw === '8084' || raw === 'STUDENT') {
    return '8084';
  }

  return raw || fallback;
};

const normalizeSourceOfFund = (value, fallback = '8051') => {
  const raw = asString(value, fallback).trim().toUpperCase();

  if (raw === '8051' || raw === 'SALARY') {
    return '8051';
  }
  if (raw === '8052' || raw === 'BUSINESS') {
    return '8052';
  }
  if (raw === '8073' || raw === 'SAVINGS' || raw === 'SAVING') {
    return '8073';
  }

  return raw || fallback;
};

const normalizeIdNumber = (idType, value) => {
  const raw = asString(value).trim();
  if (!raw) {
    return '';
  }

  const type = asString(idType).toUpperCase();
  if (type === 'NP_ID') {
    // IME validates Nepali ID as compact numeric value.
    return raw.replace(/[^0-9]/g, '');
  }

  return raw.replace(/\s+/g, '');
};

const nowRef = () => `TXN-${Date.now()}`;

const extractSoapBody = (serviceResult) => {
  const dataArray = Array.isArray(serviceResult?.data) ? serviceResult.data : [];
  return dataArray.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
};

const parseErrorLogId = (message = '') => {
  const match = String(message).match(/Error\s+Log\s+ID\s*:\s*(\d+)/i);
  return match ? match[1] : '';
};

const maskSensitiveValue = (key, value) => {
  const keyLower = String(key || '').toLowerCase();
  const asText = String(value ?? '');

  if (/password|secret/.test(keyLower)) {
    return '***';
  }

  if (/otp|token/.test(keyLower)) {
    return '***';
  }

  if (/iddata|photodata|applicationdata/.test(keyLower)) {
    return asText.length > 12 ? `${asText.slice(0, 12)}...` : '***';
  }

  if (/idnumber|idno/.test(keyLower)) {
    return asText.length > 4 ? `***${asText.slice(-4)}` : '***';
  }

  if (/mobile|phone/.test(keyLower)) {
    return asText.length > 4 ? `***${asText.slice(-4)}` : '***';
  }

  return value;
};

const sanitizeForLog = (value, parentKey = '') => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, parentKey));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, innerValue] of Object.entries(value)) {
      if (innerValue && typeof innerValue === 'object') {
        output[key] = sanitizeForLog(innerValue, key);
      } else {
        output[key] = maskSensitiveValue(key, innerValue);
      }
    }
    return output;
  }

  if (parentKey) {
    return maskSensitiveValue(parentKey, value);
  }

  return value;
};

const extractImeResponseMeta = (serviceResult) => {
  const body = extractSoapBody(serviceResult);
  const firstKey = Object.keys(body)[0];
  const payload = firstKey ? body[firstKey] : {};
  const response = payload?.Response || {};
  const code = String(response.Code || '');
  const message = String(response.Message || '');

  return {
    code,
    message,
    logId: parseErrorLogId(message)
  };
};

const extractCalculationMeta = (serviceResult) => {
  const body = extractSoapBody(serviceResult);
  const payload = body.GetCalculationResponse || body.GetCalculation_V2Response || body.GetCalculationResult || {};
  return {
    code: String(payload?.Response?.Code || ''),
    forexSessionId: asString(payload?.ForexSessionId),
    collectAmount: asString(payload?.CollectAmount),
    payoutAmount: asString(payload?.PayoutAmount)
  };
};

const buildRegisterCustomerPayload = (credentials, params = {}) => {
  const mobileNo = asString(
    params.MobileNo,
    params.mobileNo,
    params.PhoneNumber,
    params.phoneNumber,
    params.MobileNumber,
    params.mobileNumber,
    '9800000000'
  );

  const firstName = asString(params.FirstName, params.firstName, params.Name, params.name, 'NA');
  const lastName = asString(params.LastName, params.lastName, 'NA');
  const fullName = `${firstName} ${lastName}`.trim();
  const idType = normalizeImeIdType(params.IDType, params.IdType, params.idType, '1301');

  return {
    RegisterCustomerRequest: {
      Credentials: credentials,
      CustomerDetails: {
        MobileNo: mobileNo,
        MembershipId: asString(params.MembershipId, params.membershipId),
        FirstName: firstName,
        MiddleName: asString(params.MiddleName, params.middleName),
        LastName: lastName,
        Nationality: normalizeNationality(params.Nationality, params.nationality, 'NPL'),
        MaritalStatus: asString(params.MaritalStatus, params.maritalStatus, 'Single'),
        DOB: normalizeImeDate(params.DateOfBirth, params.DOB, params.dob, '1990/01/01'),
        Gender: asString(params.Gender, params.gender, 'M'),
        FatherOrMotherName: asString(params.FatherOrMotherName, params.fatherOrMotherName, fullName),
        Email: asString(params.Email, params.email),
        Occupation: normalizeOccupation(params.Occupation, params.occupation, '8081'),
        SourceOfFund: normalizeSourceOfFund(params.SourceOfFund, params.sourceOfFund, '8051')
      },
      PermanentAddresss: {
        State: asString(params.State, params.PermanentState, params.permanentState, 'Bagmati'),
        District: asString(params.District, params.PermanentDistrict, params.permanentDistrict, 'Kathmandu'),
        Municipality: asString(params.Municipality, params.PermanentMunicipality, params.permanentMunicipality, 'Kathmandu'),
        Address: asString(params.Address, params.PermanentAddress, params.permanentAddress, 'Kathmandu')
      },
      TemporaryAddress: {
        State: asString(params.TempState, params.State, 'Bagmati'),
        District: asString(params.TempDistrict, params.District, 'Kathmandu'),
        Municipality: asString(params.TempMunicipality, params.Municipality, 'Kathmandu'),
        Address: asString(params.TempAddress, params.Address, 'Kathmandu')
      },
      IdentityDetails: {
        IdType: idType,
        IdNo: normalizeIdNumber(idType, asString(params.IDNumber, params.IdNo, params.idNumber, '')),
        IdPlaceOfIssue: asString(params.IdPlaceOfIssue, params.idPlaceOfIssue),
        IssueDate: normalizeImeDate(params.IDIssueDate, params.IssueDate, params.issueDate, '2000/01/01'),
        ExpiryDate: asString(params.ExpiryDate, params.expiryDate),
        IdNoCitizenship: asString(params.IdNoCitizenship, params.idNoCitizenship),
        IdIssuePlaceCitizenship: asString(params.IdIssuePlaceCitizenship, params.idIssuePlaceCitizenship),
        IdIssueDateCitizenship: asString(params.IdIssueDateCitizenship, params.idIssueDateCitizenship),
        PhotoData: asString(params.PhotoData, params.photoData),
        PhotoDataType: asString(params.PhotoDataType, params.photoDataType, 'image/jpeg'),
        IdData: asString(params.IdData, params.idData, '.'),
        IdDataType: asString(params.IdDataType, params.idDataType, 'image/jpeg')
      }
    }
  };
};

const prepareSendTransactionParams = async (params = {}) => {
  const nextParams = { ...params };

  const hasCoreAmounts =
    asString(nextParams.ForexSessionId, nextParams.forexSessionId) !== '' &&
    asString(nextParams.CollectAmount, nextParams.collectAmount, nextParams.Amount, nextParams.amount) !== '' &&
    asString(nextParams.PayoutAmount, nextParams.payoutAmount) !== '';

  if (hasCoreAmounts) {
    return nextParams;
  }

  const calcRequest = {
    RemitAmount: asString(nextParams.Amount, nextParams.CollectAmount, nextParams.collectAmount, '100'),
    PaymentType: normalizePaymentType(firstNonEmpty(nextParams.PaymentType, nextParams.PaymentMode, nextParams.paymentMode), 'C'),
    PayoutCountry: asString(nextParams.PayoutCountry, nextParams.ReceiverCountry, nextParams.receiverCountry, 'NPL'),
    CalcBy: asString(nextParams.CalcBy, nextParams.calcBy, 'P'),
    CustomerId: asString(
      nextParams.SenderCustomerId,
      nextParams.CustomerId,
      nextParams.customerId,
      process.env.IME_DEFAULT_CUSTOMER_ID,
      '1'
    )
  };

  const calcResult = await callIMEMethod('GetCalculation', calcRequest);
  const calcMeta = extractCalculationMeta(calcResult);

  if (calcMeta.code !== '0' || !calcMeta.forexSessionId) {
    return nextParams;
  }

  nextParams.ForexSessionId = asString(nextParams.ForexSessionId, calcMeta.forexSessionId);
  nextParams.CollectAmount = asString(nextParams.CollectAmount, nextParams.Amount, calcMeta.collectAmount);
  nextParams.PayoutAmount = asString(nextParams.PayoutAmount, calcMeta.payoutAmount);

  return nextParams;
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
      {
        const mobile = params.MobileNo || params.mobileNo || params.MobileNumber || params.mobileNumber || params.Mobile || params.mobile || params.PhoneNumber || params.phoneNumber || '';
      return {
        CheckCustomerRequest: {
          Credentials: credentials,
          MobileNo: mobile
        }
      };
      }
    case 'GetCalculation':
      return {
        GetCalculationRequest: {
          Credentials: credentials,
          PayoutAgentId: asString(params.PayoutAgentId, params.payoutAgentId, params.BankCode, params.bankCode),
          RemitAmount: asString(params.RemitAmount, params.TransferAmount, params.Amount, params.amount, '100'),
          PaymentType: normalizePaymentType(firstNonEmpty(params.PaymentType, params.paymentType, params.PaymentMode, params.paymentMode), 'C'),
          PayoutCountry: asString(params.PayoutCountry, params.CountryCode, params.countryCode, 'NPL'),
          CalcBy: asString(params.CalcBy, params.calcBy, 'P')
        }
      };
    case 'GetCalculation_V2':
      return {
        GetCalculationRequest_V2: {
          Credentials: credentials,
          PayoutAgentId: asString(params.PayoutAgentId, params.payoutAgentId, params.BankCode, params.bankCode),
          RemitAmount: asString(params.RemitAmount, params.TransferAmount, params.Amount, params.amount, '100'),
          PaymentType: normalizePaymentType(firstNonEmpty(params.PaymentType, params.paymentType, params.PaymentMode, params.paymentMode), 'C'),
          PayoutCountry: asString(params.PayoutCountry, params.CountryCode, params.countryCode, 'NPL'),
          CalcBy: asString(params.CalcBy, params.calcBy, 'P'),
          CustomerId: asString(params.CustomerId, params.customerId, params.SenderCustomerId, process.env.IME_DEFAULT_CUSTOMER_ID, '1')
        }
      };
    case 'SendTransaction':
      return {
        SendTransactionRequest: {
          Credentials: credentials,
          SenderDetails: {
            SenderName: asString(params.SenderName, params.senderName, params.SenderFullName, params.senderFullName, 'NA'),
            SenderMobileNo: asString(params.SenderMobileNo, params.senderMobileNo, params.SenderPhoneNumber, params.PhoneNumber, '9800000000'),
            Occupation: asString(params.Occupation, params.occupation, 'Service')
          },
          ReceiverDetails: {
            ReceiverName: asString(params.ReceiverName, params.receiverName, 'NA'),
            ReceiverAddress: asString(params.ReceiverAddress, params.receiverAddress, params.Address, 'Kathmandu'),
            ReceiverGender: asString(params.ReceiverGender, params.receiverGender, params.Gender, 'M'),
            ReceiverMobileNo: asString(params.ReceiverMobileNo, params.receiverMobileNo, params.PhoneNumber, '9800000000'),
            ReceiverCity: asString(params.ReceiverCity, params.receiverCity),
            ReceiverCountry: asString(params.ReceiverCountry, params.receiverCountry, params.CountryCode, 'NPL'),
            ReceiverState: asString(params.ReceiverState, params.receiverState, params.State, 'Bagmati'),
            ReceiverDistrict: asString(params.ReceiverDistrict, params.receiverDistrict, params.District, 'Kathmandu'),
            ReceiverMunicipality: asString(params.ReceiverMunicipality, params.receiverMunicipality, params.Municipality, 'Kathmandu')
          },
          TransactionDetails: {
            ForexSessionId: asString(params.ForexSessionId, params.forexSessionId),
            AgentTxnRefId: asString(params.AgentTxnRefId, params.agentTxnRefId, nowRef()),
            CollectAmount: asString(params.CollectAmount, params.collectAmount, params.Amount, params.amount, '100'),
            PayoutAmount: asString(params.PayoutAmount, params.payoutAmount, params.Amount, params.amount, '10000'),
            SourceOfFund: asString(params.SourceOfFund, params.sourceOfFund, 'Salary'),
            Relationship: asString(params.Relationship, params.relationship, 'Self'),
            PurposeOfRemittance: asString(params.PurposeOfRemittance, params.purposeOfRemittance, 'Family Support'),
            PaymentType: normalizePaymentType(firstNonEmpty(params.PaymentType, params.paymentType, params.PaymentMode, params.paymentMode), 'C'),
            BankId: asString(params.BankId, params.bankId, params.BankCode, params.bankCode),
            BankBranchId: asString(params.BankBranchId, params.bankBranchId),
            BankAccountNumber: asString(params.BankAccountNumber, params.bankAccountNumber, params.AccountNumber, params.accountNumber),
            CalcBy: asString(params.CalcBy, params.calcBy, 'P')
          }
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
      return buildRegisterCustomerPayload(credentials, params);
    case 'ConfirmCustomerRegistration':
      return {
        ConfirmCustomerRequest: {
          Credentials: credentials,
          OTP: asString(params.OTP, params.otp),
          CustomerToken: asString(params.CustomerToken, params.customerToken),
          OTPToken: asString(params.OTPToken, params.otpToken)
        }
      };
    case 'CustomerMobileAmendment':
      return {
        CustomerMobileAmendment: {
          Credentials: credentials,
          OldMobieNo: asString(params.OldMobieNo, params.OldMobileNo, params.oldMobileNo),
          NewMobileNo: asString(params.NewMobileNo, params.newMobileNo),
          FullName: asString(params.FullName, params.fullName, 'NA'),
          Nationality: asString(params.Nationality, params.nationality, 'NP'),
          DOB: normalizeImeDate(params.DOB, params.DateOfBirth, '1990/01/01'),
          IdType: asString(params.IdType, params.IDType, params.idType, 'NP_ID'),
          IdNo: asString(params.IdNo, params.IDNumber, params.idNumber, 'NA'),
          Address: asString(params.Address, params.address, 'Kathmandu'),
          ApplicationData: asString(params.ApplicationData, params.applicationData, '.'),
          ApplicationDataType: asString(params.ApplicationDataType, params.applicationDataType, 'image/jpeg'),
          IdData: asString(params.IdData, params.idData, '.'),
          IdDataType: asString(params.IdDataType, params.idDataType, 'image/jpeg'),
          OTP: asString(params.OTP, params.otp),
          OTPToken: asString(params.OTPToken, params.otpToken)
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
          TypeCode: asString(params.TypeCode, params.Type, params.type, 'PaymentType'),
          ReferenceValue: asString(params.ReferenceValue, params.referenceValue, params.CountryCode, params.countryCode)
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

  const resolvedParams = resolvedMethodName === 'SendTransaction'
    ? await prepareSendTransactionParams(params)
    : params;

  const methodParams = buildRequestPayload(resolvedMethodName, config, resolvedParams);

  try {
    const result = await withTimeout(
      client[asyncMethodName](methodParams),
      config.timeoutMs,
      methodName
    );

    const meta = extractImeResponseMeta(result);
    if (meta.code && meta.code !== '0') {
      const context = {
        requestedMethod: methodName,
        resolvedMethod: resolvedMethodName,
        code: meta.code,
        message: meta.message,
        ...(meta.logId ? { logId: meta.logId } : {}),
        params: sanitizeForLog(resolvedParams)
      };
      console.log('[IME] Non-zero response:', JSON.stringify(context));
    }

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

const sendCustomerOtp = async (mobileNumber, moduleName = process.env.IME_SEND_OTP_MODULE || 'CustomerRegistration') => {
  return await callIMEMethod('SendOTP', {
    Module: moduleName,
    ReferenceValue: mobileNumber
  });
};

const confirmCustomerRegistration = async (confirmData) => {
  return await callIMEMethod('ConfirmCustomerRegistration', confirmData);
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
    RefNo: transactionId,
    CancelReason: reason || 'Cancelled by user',
    OTPToken: 'NA',
    OTP: '000000'
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
  return await callIMEMethod('GetPaymentModes', { TypeCode: 'PaymentType' });
};

const validateBankAccount = async (bankCode, accountNumber, countryCode = 'NP') => {
  return await callIMEMethod('ValidateBankAccount', {
    PayoutAgentId: bankCode,
    BankCode: bankCode,
    AccountNumber: accountNumber,
    CountryCode: countryCode,
    PaymentType: 'B',
    RemitAmount: '100',
    CalcBy: 'P'
  });
};

const getBankList = async (countryCode = 'NP') => {
  return await callIMEMethod('GetBankList', { TypeCode: 'Bank', CountryCode: countryCode });
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
    DestinationCurrency: destinationCurrency,
    RemitAmount: '1000',
    PaymentType: 'C',
    PayoutCountry: destinationCurrency === 'NPR' ? 'NPL' : destinationCurrency,
    CalcBy: 'P'
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
  sendCustomerOtp,
  confirmCustomerRegistration,
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
