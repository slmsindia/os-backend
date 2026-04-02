const axios = require("axios");
const crypto = require("crypto");

const ENDPOINTS = {
  GetStateDistrict: "/Send/GetStateDistrict",
  GetStaticData: "/Send/GetStaticData",
  GetEcho: "/Send/getEcho",
  GetCashPayLocationList: "/Send/GetCashPayLocationList",
  GetAcPayBankBranchList: "/Send/GetAcPayBankBranchList",
  GetBalance: "/Send/GetBalance",
  SendOTP: "/Send/SendOTP",
  GetServiceCharge: "/Send/GetServiceCharge",
  GetServiceChargeByCollection: "/api/Send/GetServiceChargeByCollection",
  CancelTransaction: "/api/Send/CancelTransaction",
  UnverifiedTransactions: "/Send/UnverifiedTransactions",
  ComplianceTransactions: "/api/Send/ComplianceTransactions",
  UploadDocument: "/Send/UploadDocument",
  SendTransaction: "/Send/SendTransaction",
  ConfirmTransaction: "/Send/ConfirmTransaction",
  GetCustomerById: "/Send/GetCustomerById",
  SearchTransaction: "/Send/SearchTransaction",
  ValidateBankAccount: "/api/Send/ValidateBankAccount",
  CreateReceiver: "/Send/CreateReceiver",
  CreateCustomer: "/Send/CreateCustomer",
  GetUnverifiedCustomers: "/api/Send/GetUnverifiedCustomers",
  GetCustomerByMobile: "/Send/GetCustomerByMobile",
  RegisterComplaint: "/Send/RegisterComplaint",
  TrackComplaint: "/Send/TrackComplaint"
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
  const apiKey = (process.env.PRABHU_API_KEY || "").trim();
  const apiSecret = (process.env.PRABHU_API_SECRET || "").trim();

  return {
    active,
    baseUrl,
    apiKey,
    apiSecret,
    timeoutMs: Number(process.env.PRABHU_TIMEOUT_MS || 30000)
  };
};

const ensureConfigured = () => {
  const config = getConfig();
  if (!config.active) {
    throw new Error("PRABHU is disabled. Set PRABHU_ACTIVE=true to enable it.");
  }
  if (!config.baseUrl || !config.apiKey || !config.apiSecret) {
    throw new Error("PRABHU credentials missing. Set PRABHU_BASE_URL, PRABHU_API_KEY, PRABHU_API_SECRET.");
  }
  return config;
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

const withAuthDefaults = (payload, apiKey, apiSecret) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return {
    userName: payload.userName || apiKey,
    password: payload.password || apiSecret,
    ...payload
  };
};

const callEndpoint = async (operation, payload = {}) => {
  const endpointPath = ENDPOINTS[operation];
  if (!endpointPath) {
    throw new Error(`Unsupported PRABHU operation: ${operation}`);
  }

  const config = ensureConfigured();
  const method = "POST";
  const url = `${config.baseUrl.replace(/\/$/, "")}${endpointPath}`;
  const requestBody = withAuthDefaults(payload, config.apiKey, config.apiSecret);
  const bodyString = requestBody ? JSON.stringify(requestBody) : "";

  const signed = buildSignature({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    method,
    baseUrl: config.baseUrl,
    endpointPath,
    bodyString
  });

  const response = await axios({
    method,
    url,
    data: requestBody,
    timeout: config.timeoutMs,
    headers: {
      "Content-Type": "application/json",
      Authorization: signed.authorization
    }
  });

  return {
    operation,
    endpointPath,
    status: response.status,
    data: response.data
  };
};

module.exports = {
  ENDPOINTS,
  callEndpoint,
  getConfig
};
