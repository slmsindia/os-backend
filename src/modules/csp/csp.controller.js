const cspService = require('./csp.service');

const ok = (res, message, data) => res.json({ success: true, message, data });

const fail = (res, error) => {
  const status = error.response?.status || 500;
  const details = error.response?.data || { message: error.message };
  const detailsText = String(details?.message || details?.Message || error.message || '').toUpperCase();
  const isInvalidKeyCode = detailsText.includes('INVALID API KEY OR AGENT CODE');
  return res.status(status).json({
    success: false,
    message: error.message,
    error: details,
    ...(isInvalidKeyCode ? { debug: { activeCspConfig: cspService.getPublicConfigMeta() } } : {})
  });
};

const required = (body = {}, keys = []) => keys.filter((key) => !String(body[key] ?? '').trim());

const withPrefix = (value, prefix) => {
  const current = String(value || '').trim();
  const normalizedPrefix = String(prefix || '').trim();
  if (!current || !normalizedPrefix) return current;
  if (current.startsWith(normalizedPrefix)) return current;
  return `${normalizedPrefix}${current}`;
};

const badRequest = (res, message, missing = []) => {
  return res.status(400).json({
    success: false,
    message,
    ...(missing.length ? { missing } : {})
  });
};

const BIO_FIELD_MAP = {
  EncryptedPid: ['EncryptedPid', 'encryptedPid', 'EncryptedPID', 'PidData', 'pidData'],
  EncryptedHmac: ['EncryptedHmac', 'encryptedHmac', 'EncryptedHMAC', 'Hmac', 'hmac'],
  SessionKeyValue: ['SessionKeyValue', 'sessionKeyValue', 'SessionKey', 'Skey', 'skey'],
  CertificateIdentifier: ['CertificateIdentifier', 'certificateIdentifier', 'CertificateId', 'CertIdentifier'],
  RegisteredDeviceServiceId: ['RegisteredDeviceServiceId', 'registeredDeviceServiceId', 'RdServiceId', 'rdServiceId'],
  RegisteredDeviceServiceVersion: ['RegisteredDeviceServiceVersion', 'registeredDeviceServiceVersion', 'RdServiceVersion', 'rdServiceVersion'],
  RegisteredDeviceProviderId: ['RegisteredDeviceProviderId', 'registeredDeviceProviderId', 'RdProviderId', 'rdProviderId'],
  RegisteredDeviceCode: ['RegisteredDeviceCode', 'registeredDeviceCode', 'RdCode', 'rdCode'],
  RegisteredDeviceModelId: ['RegisteredDeviceModelId', 'registeredDeviceModelId', 'RdModelId', 'rdModelId'],
  RegisteredDevicePublicKey: ['RegisteredDevicePublicKey', 'registeredDevicePublicKey', 'RdPublicKey', 'rdPublicKey']
};

const pickFromSources = (sources = [], keys = []) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      const value = source[key];
      const text = String(value ?? '').trim();
      if (text) return text;
    }
  }
  return '';
};

const extractBiometricFields = (payload = {}) => {
  const sources = [
    payload,
    payload?.Device,
    payload?.device,
    payload?.Biometric,
    payload?.biometric,
    payload?.BioKyc,
    payload?.bioKyc,
    payload?.Data,
    payload?.data
  ];

  const normalized = {};
  for (const [canonicalKey, aliases] of Object.entries(BIO_FIELD_MAP)) {
    const value = pickFromSources(sources, aliases);
    if (value) normalized[canonicalKey] = value;
  }

  return normalized;
};

const token = async (req, res) => {
  try {
    const data = await cspService.generateToken();
    return ok(res, 'CSP token generated', data);
  } catch (error) {
    return fail(res, error);
  }
};

const search = async (req, res) => {
  const mobileNumber = String(req.body?.mobileNumber || '').trim();
  if (!mobileNumber) return badRequest(res, 'mobileNumber is required', ['mobileNumber']);

  try {
    const data = await cspService.callCspApi('csp/SearchCSP', { MobileNumber: mobileNumber });
    return ok(res, 'CSP search success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const sendOtp = async (req, res) => {
  const missing = required(req.body || {}, ['cspMobile', 'cspName']);
  if (missing.length) return badRequest(res, 'cspMobile and cspName are required', missing);

  try {
    const data = await cspService.sendCreateCspOtp({
      cspMobile: req.body.cspMobile,
      cspName: req.body.cspName
    });

    return ok(res, 'CSP OTP send response received', data);
  } catch (error) {
    return fail(res, error);
  }
};

const create = async (req, res) => {
  const missing = required(req.body || {}, ['PartnerIDCode', 'MobileNumber', 'PanCard', 'otpProcessId', 'otp']);
  if (missing.length) return badRequest(res, 'Missing required CreateCSP fields', missing);

  const config = cspService.getConfig();
  const payload = {
    ...(req.body || {}),
    PartnerIDCode: withPrefix(req.body?.PartnerIDCode, config.cspEkycPrefix),
    OTPProcessId: req.body.otpProcessId,
    OTP: req.body.otp,
    IsOwnBranch: 'N',
    IsMainBranch: 'N'
  };

  try {
    const data = await cspService.callCspApi('csp/CreateCSP', payload);
    return ok(res, 'CSP create success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const mapping = async (req, res) => {
  const missing = required(req.body || {}, ['partnerIdCode', 'branchCode', 'mobileNumber', 'panCard']);
  if (missing.length) return badRequest(res, 'Missing required CSP mapping fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/CSPMapping', {
      PartnerIDCode: withPrefix(req.body.partnerIdCode || req.body.PartnerIDCode, config.cspEkycPrefix),
      BranchCode: req.body.branchCode,
      MobileNumber: req.body.mobileNumber,
      PanCard: req.body.panCard
    });

    return ok(res, 'CSP mapping success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const initiate = async (req, res) => {
  const missing = required(req.body || {}, ['partnerUniqueRefNo', 'branchCode']);
  if (missing.length) return badRequest(res, 'Missing required Initiate fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/Initiate', {
      PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
      BranchCode: req.body.branchCode
    });

    const fallbackConsentUrl = String(process.env.PRABHU_CSP_OTP_CONSENT_URL || '').trim();
    const normalizedData = {
      ...(data || {})
    };

    if (!normalizedData.Url && !normalizedData.url && fallbackConsentUrl) {
      normalizedData.Url = fallbackConsentUrl;
      normalizedData.url = fallbackConsentUrl;
    }

    return ok(res, 'CSP initiate success', normalizedData);
  } catch (error) {
    return fail(res, error);
  }
};

const uniqueRefStatus = async (req, res) => {
  const missing = required(req.body || {}, ['partnerUniqueRefNo', 'branchCode']);
  if (missing.length) return badRequest(res, 'Missing required Uniquerefstatus fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/Uniquerefstatus', {
      PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
      BranchCode: req.body.branchCode
    });

    // Auto-capture device fields if success
    const statusCode = String(data?.StatusCode || data?.statusCode || data?.status || '').trim();
    if (statusCode === '1') {
      const normalizedData = {
        ...data
      };

      const fromUniqueRef = extractBiometricFields(data);
      Object.assign(normalizedData, fromUniqueRef);

      // Fallback: if UniqueRefStatus did not carry biometric blob, try one server-side BioKYCRequery.
      if (Object.keys(fromUniqueRef).length === 0) {
        try {
          const requeryData = await cspService.callCspApi('csp/BioKYCRequery', {
            PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
            BranchCode: req.body.branchCode
          });

          const fromRequery = extractBiometricFields(requeryData);
          if (Object.keys(fromRequery).length > 0) {
            Object.assign(normalizedData, fromRequery, {
              AutoFetchedBiometricSource: 'BioKYCRequery'
            });
          }
        } catch (_ignored) {
          // Requery fallback is best-effort; don't fail unique-ref success response.
        }
      }

      return ok(res, 'CSP unique ref status success', normalizedData);
    }

    return ok(res, 'CSP unique ref status success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const enrollment = async (req, res) => {
  const missing = required(req.body || {}, [
    'EncryptedPid',
    'EncryptedHmac',
    'SessionKeyValue',
    'CertificateIdentifier',
    'RegisteredDeviceServiceId',
    'RegisteredDeviceServiceVersion',
    'RegisteredDeviceProviderId',
    'RegisteredDeviceCode',
    'RegisteredDeviceModelId',
    'RegisteredDevicePublicKey',
    'partnerUniqueRefNo',
    'branchCode'
  ]);

  if (missing.length) return badRequest(res, 'Missing required Enrollment fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/Enrollment', {
      ...req.body,
      PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
      BranchCode: req.body.branchCode
    });

    return ok(res, 'CSP enrollment success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const bioKycRequery = async (req, res) => {
  const missing = required(req.body || {}, ['partnerUniqueRefNo', 'branchCode']);
  if (missing.length) return badRequest(res, 'Missing required BioKYC requery fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/BioKYCRequery', {
      PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
      BranchCode: req.body.branchCode
    });

    return ok(res, 'CSP BioKYC requery success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const onboarding = async (req, res) => {
  const missing = required(req.body || {}, ['partnerUniqueRefNo', 'branchCode', 'PartnerIDCode', 'MobileNumber', 'PanCard']);
  if (missing.length) return badRequest(res, 'Missing required Onboarding fields', missing);

  try {
    const config = cspService.getConfig();
    const data = await cspService.callCspApi('csp/onboarding', {
      ...(req.body || {}),
      PartnerIDCode: withPrefix(req.body?.PartnerIDCode, config.cspOnboardingPrefix || config.cspEkycPrefix),
      PartnerUniqueRefNo: withPrefix(req.body.partnerUniqueRefNo, config.cspEkycPrefix),
      BranchCode: req.body.branchCode
    });

    return ok(res, 'CSP onboarding success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const agentConsent = async (req, res) => {
  const missing = required(req.body || {}, ['mobileNumber', 'branchCode']);
  if (missing.length) return badRequest(res, 'Missing required AgentConsent fields', missing);

  try {
    const data = await cspService.callCspApi('csp/AgentConsent', {
      MobileNumber: req.body.mobileNumber,
      BranchCode: req.body.branchCode
    });

    return ok(res, 'CSP agent consent success', data);
  } catch (error) {
    return fail(res, error);
  }
};

const states = async (req, res) => {
  const country = String(req.query.country || 'India').trim();
  if (!country) return badRequest(res, 'country query is required', ['country']);

  try {
    const data = await cspService.fetchStates(country, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
      userId: req.user?.id || null
    });

    return ok(res, 'State and district list fetched', {
      country,
      ...data
    });
  } catch (error) {
    return fail(res, error);
  }
};

module.exports = {
  token,
  search,
  sendOtp,
  create,
  mapping,
  initiate,
  uniqueRefStatus,
  enrollment,
  bioKycRequery,
  onboarding,
  agentConsent,
  states
};
