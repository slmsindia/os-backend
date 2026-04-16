const axios = require('axios');
const crypto = require('crypto');
const prabhuService = require('../prabhu/prabhu.service');

const TOKEN_IDLE_MS = 25 * 60 * 1000;

const tokenStore = {
  accessToken: '',
  expiresAt: 0,
  lastUsedAt: 0,
  sessionTimeoutMs: TOKEN_IDLE_MS
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '');



const maskValue = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 6) return `${text.slice(0, 1)}***`;
  return `${text.slice(0, 4)}***${text.slice(-3)}`;
};

const buildSendBaseCandidates = (primaryBase = '') => {
  const values = [
    primaryBase,
    process.env.PRABHU_BASE_URL,
    process.env.PRABHU_BASE_URL,
    'https://sandbox.prabhuindia.com/IDFCSendAPI',
    'https://sandbox.prabhuindia.com/Sendapi'
  ];

  const unique = [];
  for (const value of values) {
    const normalized = trimSlash(value);
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
  }
  return unique;
};

const buildSendPathCandidates = () => {
  return ['/Send/SendOTP', '/api/Send/SendOTP'];
};

const isRetryableSendError = (error) => {
  const retryableCodes = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'EAI_AGAIN']);
  const errorCode = String(error?.code || '').trim().toUpperCase();
  if (retryableCodes.has(errorCode)) return true;

  const status = Number(error?.response?.status || 0);
  return status === 502 || status === 503 || status === 504;
};

const nextMidnightEpoch = () => {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime();
};

const getConfig = () => {
  // For login/token/E-KYC: use PRABHU_API_USERNAME/PRABHU_API_PASSWORD only
  // For remittance/send (GetCustomerByMobile): use PRABHU_API_KEY/PRABHU_API_PASSWORD/PRABHU_SEND_WSDL_URL
  const apiKey = String(process.env.PRABHU_API_KEY || '').trim();
  const agentCode = String(process.env.PRABHU_AGENT_CODE || '').trim();
  const userName = apiKey; // For remittance/send, use PRABHU_API_KEY as username
  const password = String(process.env.PRABHU_API_PASSWORD || '').trim();
  const requestBy = userName;
  const sendApiKey = apiKey;
  const sendApiSecret = password;
  const cspApiBase = trimSlash(process.env.PRABHU_CSP_BASE_URL || 'https://ekyc-sandbox.prabhuindia.com/testkya');
  const sendApiBase = trimSlash(process.env.PRABHU_SEND_WSDL_URL || 'https://sandbox.prabhuindia.com/Sendapi');
  const cspEkycPrefix = String(process.env.PRABHU_EKYC_PREFIX || '').trim();
  const cspOnboardingPrefix = String(process.env.PRABHU_ONBOARDING_PREFIX || '').trim();
  const sendUserName = apiKey;
  const sendPassword = password;
  return {
    apiKey,
    agentCode,
    userName,
    password,
    requestBy,
    cspEkycPrefix,
    cspOnboardingPrefix,
    cspApiBase,
    sendApiBase,
    sendUserName,
    sendPassword,
    sendApiKey,
    sendApiSecret,
    timeoutMs: toNumber(process.env.PRABHU_TIMEOUT_MS, 30000)
  };
};

const getPublicConfigMeta = () => {
  const config = getConfig();
  return {
    cspApiBase: config.cspApiBase,
    cspEkycPrefix: config.cspEkycPrefix,
    cspOnboardingPrefix: config.cspOnboardingPrefix,
    apiKeySource: config.apiKeySource,
    apiKeyMasked: maskValue(config.apiKey),
    agentCodeSource: config.agentCodeSource,
    agentCode: config.agentCode,
    userNameSource: config.userNameSource,
    userNameMasked: maskValue(config.userName),
    requestBy: config.requestBy
  };
};

const ensureConfigured = () => {
  const config = getConfig();
  if (!config.apiKey || !config.agentCode || !config.userName || !config.password) {
    throw new Error('CSP credentials missing. Set PRABHU_API_USERNAME, PRABHU_AGENT_CODE, PRABHU_API_USERNAME, PRABHU_API_PASSWORD.');
  }
  if (!config.sendUserName || !config.sendPassword) {
    throw new Error('CSP send credentials missing. Set PRABHU_API_USERNAME/PRABHU_API_PASSWORD.');
  }
  if (!config.sendApiKey || !config.sendApiSecret) {
    throw new Error('CSP send authorization missing. Set PRABHU_API_USERNAME/PRABHU_API_PASSWORD.');
  }
  return config;
};

const extractTokenPayload = (data = {}) => {
  if (!data || typeof data !== 'object') return {};
  if (data.AccessToken || data.accessToken || data.Token || data.token) return data;
  if (data.data && typeof data.data === 'object') return data.data;
  return data;
};

const isTokenExpired = () => {
  const now = Date.now();
  if (!tokenStore.accessToken) return true;
  if (now >= tokenStore.expiresAt) return true;
  if (now - tokenStore.lastUsedAt >= tokenStore.sessionTimeoutMs) return true;
  return false;
};

const generateToken = async () => {
  const config = ensureConfigured();
  const url = `${config.cspApiBase}/v1/auth/generatetoken`;

  const response = await axios.post(
    url,
    {
      UserName: config.userName,
      Password: config.password
    },
    {
      timeout: config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        APIKey: config.apiKey,
        AgentCode: config.agentCode
      }
    }
  );

  const payload = extractTokenPayload(response.data);
  const accessToken = String(payload.AccessToken || payload.accessToken || payload.Token || payload.token || '').trim();

  if (!accessToken) {
    throw new Error(payload.ResponseMessage || payload.message || 'Failed to generate CSP token.');
  }

  const now = Date.now();
  const sessionTimeoutSec = toNumber(payload.SessionTimeout, 0);
  const configuredIdleMs = sessionTimeoutSec > 0 ? sessionTimeoutSec * 1000 : TOKEN_IDLE_MS;
  const expiresAt = Math.min(now + configuredIdleMs, nextMidnightEpoch());

  tokenStore.accessToken = accessToken;
  tokenStore.expiresAt = expiresAt;
  tokenStore.lastUsedAt = now;
  tokenStore.sessionTimeoutMs = configuredIdleMs;

  return {
    AccessToken: accessToken,
    SessionTimeout: payload.SessionTimeout || Math.floor(configuredIdleMs / 1000),
    StatusCode: payload.StatusCode,
    ResponseMessage: payload.ResponseMessage || 'Token generated'
  };
};

const getAccessToken = async ({ forceRefresh = false } = {}) => {
  if (forceRefresh || isTokenExpired()) {
    await generateToken();
  }

  tokenStore.lastUsedAt = Date.now();
  return tokenStore.accessToken;
};

const isAuthError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status === 401 || status === 403) return true;

  const message = String(
    error?.response?.data?.ResponseMessage ||
    error?.response?.data?.message ||
    error?.message ||
    ''
  ).toLowerCase();

  return /token|unauthor|forbidden|expired|invalid/.test(message);
};

const callCspApi = async (path, body = {}, options = {}) => {
  const config = ensureConfigured();
  const requiresAuth = options.requiresAuth !== false;
  const shouldRetryAuth = options.retryAuth !== false;
  const forceRefresh = options.forceRefresh === true;
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const url = `${config.cspApiBase}/v1/${normalizedPath}`;

  const callOnce = async (forceRefresh = false) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      APIKey: config.apiKey,
      AgentCode: config.agentCode,
      RequestBy: config.requestBy
    };

    if (requiresAuth) {
      headers.AuthenticationToken = await getAccessToken({ forceRefresh });
    }

    const response = await axios.post(url, body || {}, {
      timeout: config.timeoutMs,
      headers
    });

    return response.data;
  };

  try {
    return await callOnce(forceRefresh);
  } catch (error) {
    if (requiresAuth && shouldRetryAuth && isAuthError(error)) {
      return callCspApi(path, body, { ...options, retryAuth: false, forceRefresh: true });
    }
    throw error;
  }
};

const xmlEscape = (value = '') => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const getSecretKeyBuffer = (secret) => {
  const value = String(secret || '').trim();
  if (!value) return Buffer.alloc(0);
  return Buffer.from(value, 'utf8');
};

const buildSignature = ({ apiKey, apiSecret, method, baseUrl, endpointPath, bodyString }) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = timestamp;
  const normalizedBase = String(baseUrl || '').replace(/\/$/, '');
  const requestUrl = encodeURIComponent(`${normalizedBase}${endpointPath}`).toLowerCase();
  const contentMd5Base64 = bodyString
    ? crypto.createHash('md5').update(bodyString, 'utf8').digest('base64')
    : '';

  const dataToSign = `${apiKey}${method}${requestUrl}${timestamp}${nonce}${contentMd5Base64}`;
  const secretKey = getSecretKeyBuffer(apiSecret);
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign, 'utf8')
    .digest('base64');

  return {
    authorization: `hmacauth ${apiKey}:${signature}:${nonce}:${timestamp}`
  };
};

const extractXmlValue = (xml = '', tag = '') => {
  if (!xml || !tag) return '';
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? String(match[1] || '').trim() : '';
};

const deepFindFirst = (value, keys = []) => {
  if (!value || typeof value !== 'object') return '';

  for (const key of keys) {
    const direct = value[key];
    if (typeof direct === 'string' || typeof direct === 'number') {
      const text = String(direct).trim();
      if (text) return text;
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (nestedValue && typeof nestedValue === 'object') {
      const found = deepFindFirst(nestedValue, keys);
      if (found) return found;
    }
  }

  return '';
};

const normalizeCspSendOtpResponse = (payload) => {
  if (typeof payload === 'string') {
    const code = extractXmlValue(payload, 'Code') || extractXmlValue(payload, 'code');
    const message = extractXmlValue(payload, 'Message') || extractXmlValue(payload, 'message');
    const processId =
      extractXmlValue(payload, 'ProcessId') ||
      extractXmlValue(payload, 'processId') ||
      extractXmlValue(payload, 'OTPProcessId') ||
      extractXmlValue(payload, 'OTPProcessID') ||
      extractXmlValue(payload, 'otpProcessId');

    return {
      code,
      message,
      processId,
      raw: payload
    };
  }

  if (payload && typeof payload === 'object') {
    const code = deepFindFirst(payload, ['Code', 'code', 'StatusCode', 'statusCode', 'ResponseCode', 'responseCode']);
    const message = deepFindFirst(payload, ['Message', 'message', 'ResponseMessage', 'responseMessage', 'Description', 'description']);
    const processId = deepFindFirst(payload, [
      'ProcessId',
      'processId',
      'ProcessID',
      'processID',
      'OTPProcessId',
      'OTPProcessID',
      'otpProcessId',
      'otpProcessID'
    ]);

    return {
      code,
      message,
      processId,
      raw: payload
    };
  }

  return {
    code: '',
    message: '',
    processId: '',
    raw: payload
  };
};

const sendCreateCspOtp = async ({ cspMobile = '', cspName = '' } = {}) => {
  const config = ensureConfigured();
  const requestBody = {
    userName: config.sendUserName,
    password: config.sendPassword,
    operation: 'CreateCSP',
    cspMobile,
    cspName
  };
  const rawBody = JSON.stringify(requestBody);
  const sendRetryAttempts = Math.max(1, Number(process.env.PRABHU_CSP_SEND_RETRY_ATTEMPTS || 3));

  const baseCandidates = buildSendBaseCandidates(config.sendApiBase);
  const pathCandidates = buildSendPathCandidates();

  let lastError;

  for (const baseUrl of baseCandidates) {
    for (const endpointPath of pathCandidates) {
      const signed = buildSignature({
        apiKey: config.sendApiKey,
        apiSecret: config.sendApiSecret,
        method: 'POST',
        baseUrl,
        endpointPath,
        bodyString: rawBody
      });

      const url = `${baseUrl}${endpointPath}`;

      for (let attempt = 1; attempt <= sendRetryAttempts; attempt += 1) {
        try {
          const response = await axios.post(url, requestBody, {
            timeout: config.timeoutMs,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: signed.authorization
            }
          });

          return normalizeCspSendOtpResponse(response.data);
        } catch (error) {
          lastError = error;
          const canRetrySameTarget = attempt < sendRetryAttempts && isRetryableSendError(error);
          if (canRetrySameTarget) {
            continue;
          }

          const status = Number(error?.response?.status || 0);
          const shouldTryNextTarget = status === 404 || status === 405 || status === 415 || status === 503;
          if (!shouldTryNextTarget) {
            throw error;
          }
          break;
        }
      }
    }
  }

  throw lastError || new Error('Unable to reach CSP SendOTP endpoint.');
};

const normalizeStateDistrict = (payload = {}) => {
  const source = payload?.data || payload || {};
  const rows = [
    ...(Array.isArray(source) ? source : []),
    ...(Array.isArray(source?.data) ? source.data : []),
    ...(Array.isArray(source?.dataList) ? source.dataList : []),
    ...(Array.isArray(source?.rows) ? source.rows : []),
    ...(Array.isArray(source?.locations) ? source.locations : []),
    ...(Array.isArray(source?.data?.dataList) ? source.data.dataList : []),
    ...(Array.isArray(source?.DataList?.Data) ? source.DataList.Data : []),
    ...(Array.isArray(source?.data?.DataList?.Data) ? source.data.DataList.Data : [])
  ].filter((item) => item && typeof item === 'object');

  const states = new Map();
  const districtsByState = {};

  rows.forEach((row) => {
    const state = String(row.state || row.State || '').trim();
    const district = String(row.district || row.District || '').trim();

    if (state) {
      states.set(state, { value: state, label: state });
      if (!districtsByState[state]) {
        districtsByState[state] = [];
      }
    }

    if (state && district) {
      if (!districtsByState[state].some((entry) => entry.value === district)) {
        districtsByState[state].push({ value: district, label: district });
      }
    }
  });

  return {
    states: Array.from(states.values()),
    districtsByState,
    rows
  };
};

const fetchStates = async (country = 'India', context = {}) => {
  const result = await prabhuService.callEndpoint('GetStateDistrict', { country }, context);
  return normalizeStateDistrict(result?.data || {});
};

module.exports = {
  getConfig,
  getPublicConfigMeta,
  generateToken,
  getAccessToken,
  callCspApi,
  sendCreateCspOtp,
  fetchStates
};
