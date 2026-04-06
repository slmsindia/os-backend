const axios = require("axios");
const crypto = require("crypto");
const soap = require("soap");
const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// SOAP operations for Prabhu Send Service
const SOAP_OPERATIONS = {
  GetStateDistrict: "GetStateDistrict",
  GetStaticData: "GetStaticData",
  GetEcho: "GetEcho",
  GetCashPayLocationList: "GetCashPayLocationList",
  GetAcPayBankBranchList: "GetAcPayBankBranchList",
  GetBalance: "GetBalance",
  SendOTP: "SendOTP",
  GetServiceCharge: "GetServiceCharge",
  GetServiceChargeByCollection: "GetServiceChargeByCollection",
  CancelTransaction: "CancelTransaction",
  UnverifiedTransactions: "UnverifiedTransactions",
  ComplianceTransactions: "ComplianceTransactions",
  UploadDocument: "UploadDocument",
  SendTransaction: "SendTransaction",
  ConfirmTransaction: "ConfirmTransaction",
  GetCustomerById: "GetCustomerById",
  SearchTransaction: "SearchTransaction",
  ValidateBankAccount: "ValidateBankAccount",
  CreateReceiver: "CreateReceiver",
  CreateCustomer: "CreateCustomer",
  GetUnverifiedCustomers: "GetUnverifiedCustomers",
  GetCustomerByMobile: "GetCustomerByMobile",
  RegisterComplaint: "RegisterComplaint",
  TrackComplaint: "TrackComplaint"
};

// Store for SOAP client (cached)
let soapClient = null;

const SENSITIVE_KEYS = new Set([
  "password",
  "api-secret",
  "apiSecret",
  "api_key",
  "apiKey",
  "authorization",
  "Authorization"
]);

const sanitizeForLog = (value, parentKey = "") => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, parentKey));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, currentValue]) => {
      acc[key] = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(parentKey)
        ? "[redacted]"
        : sanitizeForLog(currentValue, key);
      return acc;
    }, {});
  }

  return value;
};

const buildLogContext = (context = {}) => ({
  userId: context.userId || null,
  tenantId: context.tenantId || null,
  ipAddress: context.ipAddress || null,
  userAgent: context.userAgent || null
});

const recordPrabhuApiLog = async ({
  operation,
  integration,
  endpointPath,
  requestMethod,
  requestPayload,
  responsePayload,
  statusCode,
  success,
  errorMessage,
  errorPayload,
  durationMs,
  context = {}
}) => {
  try {
    await prisma.prabhuApiLog.create({
      data: {
        id: generateUuid(),
        operation,
        integration,
        endpointPath,
        requestMethod,
        requestPayload: requestPayload ? sanitizeForLog(requestPayload) : null,
        responsePayload: responsePayload ? sanitizeForLog(responsePayload) : null,
        statusCode: typeof statusCode === "number" ? statusCode : null,
        success: Boolean(success),
        errorMessage: errorMessage || null,
        errorPayload: errorPayload ? sanitizeForLog(errorPayload) : null,
        durationMs: typeof durationMs === "number" ? durationMs : null,
        ...buildLogContext(context)
      }
    });
  } catch (err) {
    console.error("Prabhu API log failed:", err.message);
  }
};

const EKYC_ENDPOINTS = {
  GenerateToken: { path: "/auth/generatetoken", routeKey: "baseRoute2" },
  EkycInitiate: { path: "/customer/ekycinitiate", routeKey: "baseRoute2" },
  EkycUniqueRefStatus: { path: "/customer/ekycuniquerefstatus", routeKey: "baseRoute2" },
  EkycEnrollment: { path: "/customer/ekycenrollment", routeKey: "baseRoute2" },
  CustomerOnboarding: { path: "/customer/customeronboarding", routeKey: "baseRoute2" },
  CspInitiate: { path: "/csp/Initiate", routeKey: "baseRoute" },
  CspUniqueRefStatus: { path: "/csp/Uniquerefstatus", routeKey: "baseRoute" },
  CspEnrollment: { path: "/csp/Enrollment", routeKey: "baseRoute" },
  CspOnboarding: { path: "/csp/onboarding", routeKey: "baseRoute" },
  SearchCsp: { path: "/csp/searchcsp", routeKey: "baseRoute" },
  CreateCsp: { path: "/csp/Createcsp", routeKey: "baseRoute" },
  AgentConsent: { path: "/csp/AgentConsent", routeKey: "baseRoute" },
  CspMapping: { path: "/csp/CSPMapping", routeKey: "baseRoute" },
  BioKycRequery: { path: "/csp/BioKYCRequery", routeKey: "baseRoute" }
};

const isHexString = (value = "") => /^[0-9A-Fa-f]+$/.test(value) && value.length % 2 === 0;

const isBase64String = (value = "") => {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return false;
  }

  try {
    return Buffer.from(value, "base64").toString("base64") === value;
  } catch {
    return false;
  }
};

const getSecretKeyBuffer = (secret) => {
  if (!secret) return Buffer.from("");
  if (isHexString(secret)) return Buffer.from(secret, "hex");
  if (isBase64String(secret)) return Buffer.from(secret, "base64");
  return Buffer.from(secret, "utf8");
};

const getConfig = () => {
  const active = String(process.env.PRABHU_ACTIVE || "false").toLowerCase() === "true";
  const baseUrl = (process.env.PRABHU_BASE_URL || "").trim();
  const wsdlUrl = (process.env.PRABHU_SEND_WSDL || "").trim();
  const apiKey = (process.env.PRABHU_API_KEY || "").trim();
  const apiSecret = (process.env.PRABHU_API_SECRET || "").trim();

  return {
    active,
    baseUrl,
    wsdlUrl,
    apiKey,
    apiSecret,
    timeoutMs: Number(process.env.PRABHU_TIMEOUT_MS || 30000)
  };
};

const getEkycConfig = () => {
  const active = String(process.env.PRABHU_EKYC_ACTIVE || process.env.PRABHU_ACTIVE || "false").toLowerCase() === "true";
  const userName = (process.env.PRABHU_EKYC_USERNAME || "").trim();
  const password = (process.env.PRABHU_EKYC_PASSWORD || "").trim();
  const apiKey = (process.env.PRABHU_EKYC_API_KEY || "").trim();
  const baseUrl = (process.env.PRABHU_EKYC_BASE_URL || "").trim();
  const baseRoute = (process.env.PRABHU_EKYC_BASE_ROUTE || "").trim();
  const baseRoute2 = (process.env.PRABHU_EKYC_BASE_ROUTE2 || "").trim();
  const agentCodeRaw = (process.env.PRABHU_EKYC_AGENT_CODE || "").trim();

  return {
    active,
    userName,
    password,
    apiKey,
    baseUrl,
    baseRoute,
    baseRoute2,
    agentCode: agentCodeRaw ? Number(agentCodeRaw) : undefined,
    timeoutMs: Number(process.env.PRABHU_EKYC_TIMEOUT_MS || process.env.PRABHU_TIMEOUT_MS || 30000)
  };
};

const ensureConfigured = () => {
  const config = getConfig();
  if (!config.active) {
    throw new Error("PRABHU is disabled. Set PRABHU_ACTIVE=true to enable it.");
  }
  if (!config.wsdlUrl || !config.apiKey || !config.apiSecret) {
    throw new Error("PRABHU Send credentials missing. Set PRABHU_SEND_WSDL, PRABHU_API_KEY, PRABHU_API_SECRET.");
  }
  return config;
};

const ensureEkycConfigured = () => {
  const config = getEkycConfig();
  if (!config.active) {
    throw new Error("PRABHU E-KYC is disabled. Set PRABHU_EKYC_ACTIVE=true to enable it.");
  }

  if (!config.userName || !config.password || !config.apiKey || !config.baseUrl) {
    throw new Error("PRABHU E-KYC credentials missing. Set PRABHU_EKYC_USERNAME, PRABHU_EKYC_PASSWORD, PRABHU_EKYC_API_KEY, PRABHU_EKYC_BASE_URL.");
  }

  return config;
};

const joinPath = (...parts) => {
  const normalized = parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .map((part, idx) => {
      if (idx === 0) return part.replace(/\/+$/, "");
      return part.replace(/^\/+/, "").replace(/\/+$/, "");
    });

  return normalized.join("/");
};

const withEkycDefaults = (payload, config) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return {
    UserName: payload.UserName || config.userName,
    Password: payload.Password || config.password,
    APIKey: payload.APIKey || config.apiKey,
    AgentCode: payload.AgentCode || config.agentCode,
    ...payload
  };
};

const callEkycEndpoint = async (operation, payload = {}, options = {}, context = {}) => {
  const endpoint = EKYC_ENDPOINTS[operation];
  if (!endpoint) {
    throw new Error(`Unsupported PRABHU E-KYC operation: ${operation}`);
  }

  const config = ensureEkycConfigured();
  const route = endpoint.routeKey === "baseRoute2" ? config.baseRoute2 : config.baseRoute;
  const url = joinPath(config.baseUrl, route, endpoint.path);
  const requestBody = withEkycDefaults(payload, config);
  const startedAt = Date.now();

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": config.apiKey
  };

  if (options.authorization) {
    headers.Authorization = options.authorization;
  }

  try {
    const response = await axios({
      method: "POST",
      url,
      data: requestBody,
      timeout: config.timeoutMs,
      headers
    });

    await recordPrabhuApiLog({
      operation,
      integration: "EKYC",
      endpointPath: url,
      requestMethod: "POST",
      requestPayload: requestBody,
      responsePayload: response.data,
      statusCode: response.status,
      success: true,
      durationMs: Date.now() - startedAt,
      context
    });

    return {
      operation,
      url,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    await recordPrabhuApiLog({
      operation,
      integration: "EKYC",
      endpointPath: url,
      requestMethod: "POST",
      requestPayload: requestBody,
      responsePayload: error.response?.data || null,
      statusCode: error.response?.status,
      success: false,
      errorMessage: error.message,
      errorPayload: error.response?.data || { message: error.message },
      durationMs: Date.now() - startedAt,
      context
    });

    throw error;
  }
};

const buildSignature = ({ apiKey, apiSecret, method, baseUrl, endpointPath, bodyString }) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = timestamp;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const requestUrl = encodeURIComponent(`${normalizedBase}${endpointPath}`).toLowerCase();
  const contentMd5Base64 = bodyString
    ? crypto.createHash("md5").update(bodyString, "utf8").digest("base64")
    : "";

  const dataToSign = `${apiKey}${method}${requestUrl}${timestamp}${nonce}${contentMd5Base64}`;
  const secretKey = getSecretKeyBuffer(apiSecret);
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign, "utf8")
    .digest("base64");

  return {
    authorization: `hmacauth ${apiKey}:${signature}:${nonce}:${timestamp}`,
    timestamp,
    nonce,
    requestUrl,
    contentMd5Base64
  };
};

// Initialize SOAP client for Prabhu Send Service
const initializeSoapClient = async () => {
  if (soapClient) {
    return soapClient;
  }

  const config = ensureConfigured();
  
  return new Promise((resolve, reject) => {
    soap.createClient(config.wsdlUrl, {
      timeout: config.timeoutMs,
      disableCache: true,
      options: {
        timeout: config.timeoutMs,
        stream: false
      }
    }, (err, client) => {
      if (err) {
        reject(new Error(`Failed to initialize SOAP client: ${err.message}`));
      } else {
        soapClient = client;
        resolve(client);
      }
    });
  });
};

const callSendRestEndpoint = async (operation, payload = {}, context = {}) => {
  const config = ensureConfigured();
  const endpointPath = "/Send/getEcho";
  const method = "POST";
  const requestBody = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const bodyString = requestBody ? JSON.stringify(requestBody) : "";
  const startedAt = Date.now();

  const signed = buildSignature({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    method,
    baseUrl: config.baseUrl,
    endpointPath,
    bodyString
  });

  try {
    const response = await axios({
      method,
      url: `${config.baseUrl.replace(/\/$/, "")}${endpointPath}`,
      data: requestBody,
      timeout: config.timeoutMs,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/octet-stream",
        Authorization: signed.authorization
      }
    });

    await recordPrabhuApiLog({
      operation,
      integration: "SEND",
      endpointPath,
      requestMethod: method,
      requestPayload: requestBody,
      responsePayload: response.data,
      statusCode: response.status,
      success: true,
      durationMs: Date.now() - startedAt,
      context
    });

    return {
      operation,
      endpointPath,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    await recordPrabhuApiLog({
      operation,
      integration: "SEND",
      endpointPath,
      requestMethod: method,
      requestPayload: requestBody,
      responsePayload: error.response?.data || null,
      statusCode: error.response?.status,
      success: false,
      errorMessage: error.message,
      errorPayload: error.response?.data || { message: error.message },
      durationMs: Date.now() - startedAt,
      context
    });

    throw error;
  }
};

// Call Prabhu Send API operation via SOAP/WSDL
const callEndpoint = async (operation, payload = {}, context = {}) => {
  if (operation === "GetEcho") {
    return callSendRestEndpoint(operation, payload, context);
  }

  if (!SOAP_OPERATIONS[operation]) {
    throw new Error(`Unsupported PRABHU Send operation: ${operation}`);
  }

  const config = ensureConfigured();
  
  // SOAP request body with PascalCase fields for .NET WSDL
  const requestBody = {
    UserName: payload.UserName || payload.userName || config.apiKey,
    Password: payload.Password || payload.password || config.apiSecret,
    ...payload
  };
  const startedAt = Date.now();
  const endpointPath = `SOAP:${operation}`;

  try {
    const client = await initializeSoapClient();
    
    // Map operation name to SOAP method (handle both direct and camelCase variants)
    const soapMethod = SOAP_OPERATIONS[operation];
    if (!client[soapMethod] || typeof client[soapMethod] !== 'function') {
      throw new Error(`SOAP method '${soapMethod}' not found in WSDL`);
    }

    return new Promise((resolve, reject) => {
      client[soapMethod](requestBody, (err, result) => {
        if (err) {
          recordPrabhuApiLog({
            operation,
            integration: "SEND",
            endpointPath,
            requestMethod: "SOAP",
            requestPayload: requestBody,
            responsePayload: err.response?.data || null,
            statusCode: err.response?.status,
            success: false,
            errorMessage: err.message,
            errorPayload: err.response?.data || { message: err.message },
            durationMs: Date.now() - startedAt,
            context
          }).finally(() => reject(err));
        } else {
          recordPrabhuApiLog({
            operation,
            integration: "SEND",
            endpointPath,
            requestMethod: "SOAP",
            requestPayload: requestBody,
            responsePayload: result,
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            context
          }).finally(() => resolve({
            operation,
            status: 200,
            data: result
          }));
        }
      });
    });
  } catch (error) {
    throw new Error(`PRABHU Send API error (${operation}): ${error.message}`);
  }
};

module.exports = {
  SOAP_OPERATIONS,
  EKYC_ENDPOINTS,
  callEndpoint,
  callEkycEndpoint,
  getConfig,
  getEkycConfig,
  initializeSoapClient,
  resetSoapClient: () => { soapClient = null; }
};
