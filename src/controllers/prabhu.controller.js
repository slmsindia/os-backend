// POST /api/csp/unique-ref-poll
exports.cspUniqueRefPoll = async (req, res) => {
  // For now, return a placeholder response. Replace with real logic as needed.
  const { partnerUniqueRefNo, branchCode } = req.body || {};
  if (!partnerUniqueRefNo || !branchCode) {
    return res.status(400).json({ success: false, message: 'Missing partnerUniqueRefNo or branchCode' });
  }
  // Simulate polling logic (replace with real status check)
  return res.json({ success: true, status: 'POLL_OK', partnerUniqueRefNo, branchCode });
};
const axios = require('axios');

// Utility: Validate required fields
function validateFields(obj, required) {
	const missing = [];
	for (const key of required) {
		if (obj[key] === undefined || obj[key] === null || obj[key] === '') missing.push(key);
	}
	return missing;
}

// POST /api/csp/enrollment
exports.enrollCSP = async (req, res) => {
	try {
		const body = req.body || {};
		const requiredFields = [
			'EncryptedPid', 'EncryptedHmac', 'SessionKeyValue', 'CertificateIdentifier',
			'RegisteredDeviceServiceId', 'RegisteredDeviceServiceVersion', 'RegisteredDeviceProviderId',
			'RegisteredDeviceCode', 'RegisteredDeviceModelId', 'RegisteredDevicePublicKey',
			'partnerUniqueRefNo', 'branchCode'
		];
		const missing = validateFields(body, requiredFields);
		if (missing.length) {
			return res.status(400).json({ success: false, message: 'Missing fields', missing });
		}
		// Prepare payload
		const payload = {
			EncryptedPid: String(body.EncryptedPid),
			EncryptedHmac: String(body.EncryptedHmac),
			SessionKeyValue: String(body.SessionKeyValue),
			CertificateIdentifier: Number(body.CertificateIdentifier),
			RegisteredDeviceServiceId: String(body.RegisteredDeviceServiceId),
			RegisteredDeviceServiceVersion: String(body.RegisteredDeviceServiceVersion),
			RegisteredDeviceProviderId: String(body.RegisteredDeviceProviderId),
			RegisteredDeviceCode: String(body.RegisteredDeviceCode),
			RegisteredDeviceModelId: String(body.RegisteredDeviceModelId),
			RegisteredDevicePublicKey: String(body.RegisteredDevicePublicKey),
			PartnerUniqueRefNo: String(body.partnerUniqueRefNo),
			BranchCode: Number(body.branchCode)
		};
		// Log request
		console.log('[ENROLLMENT] Request:', payload);
		// Prepare headers (from env)
		const headers = {
			APIKey: process.env.PRABHU_API_USERNAME,
			AgentCode: process.env.PRABHU_AGENT_CODE,
			AuthenticationToken: process.env.PRABHU_AUTH_TOKEN,
			RequestBy: process.env.PRABHU_USERNAME,
		};
		// Call Prabhu Enrollment API
		const prabhuResp = await axios.post(
			'https://ekyc-sandbox.prabhuindia.com/testkya/v1/csp/Enrollment',
			payload,
			{ headers, timeout: 20000 }
		);
		// Log response
		console.log('[ENROLLMENT] Response:', prabhuResp.data);
		const data = prabhuResp.data || {};
		if (data.StatusCode === 1) {
			return res.json({ success: true, data });
		} else {
			return res.status(400).json({ success: false, data, message: data.ResponseMessage || 'Enrollment failed' });
		}
	} catch (err) {
		console.error('[ENROLLMENT] Error:', err.message, err.response?.data);
		return res.status(500).json({ success: false, message: 'Enrollment API error', details: err.message, data: err.response?.data });
	}
};
