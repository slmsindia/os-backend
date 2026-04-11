const express = require('express');
const router = express.Router();

const rdService = require('../services/rd.service');
const logger = require('../utils/audit');


// POST /api/rd/capture
router.post('/capture', async (req, res) => {
  try {
    // Validate request body (must be XML string)
    const xmlBody = req.body && typeof req.body === 'string' ? req.body : req.body.xml;
    if (!xmlBody || typeof xmlBody !== 'string') {
      logger.logAction({ action: 'RD_CAPTURE_INVALID_BODY', metadata: { body: req.body } });
      return res.status(400).json({ success: false, message: 'Invalid request body: XML string required' });
    }
    const result = await rdService.callExternalApi(xmlBody);
    // Extract and clean response for client
    const resp = result.PidData || {};
    const respInfo = resp.Resp || {};
    if (respInfo.errCode && respInfo.errCode !== '0') {
      return res.status(400).json({ success: false, message: respInfo.errInfo || 'Device error', errCode: respInfo.errCode });
    }
    const data = {
      EncryptedPid: resp.Data?._ || '',
      EncryptedHmac: resp.Hmac?._ || '',
      SessionKeyValue: resp.Skey?._ || '',
      CertificateIdentifier: resp.Skey?.ci ? Number(resp.Skey.ci) : undefined,
    };
    // DeviceInfo Params
    const params = (resp.DeviceInfo && resp.DeviceInfo.Param) ? (Array.isArray(resp.DeviceInfo.Param) ? resp.DeviceInfo.Param : [resp.DeviceInfo.Param]) : [];
    for (const p of params) {
      const name = (p.name || '').toLowerCase();
      if (name === 'dpid' || name === 'dpId') data.RegisteredDeviceProviderId = p._;
      if (name === 'rdsid' || name === 'rdsId') data.RegisteredDeviceServiceId = p._;
      if (name === 'rdsver' || name === 'rdsVer') data.RegisteredDeviceServiceVersion = p._;
      if (name === 'dc') data.RegisteredDeviceCode = p._;
      if (name === 'mi') data.RegisteredDeviceModelId = p._;
      if (name === 'mc') data.RegisteredDevicePublicKey = p._;
    }
    return res.json({ success: true, data });
  } catch (err) {
    logger.logAction({ action: 'RD_CAPTURE_ROUTE_ERROR', metadata: { error: err.message } });
    if (err.code === 'ECONNREFUSED') {
      return res.status(500).json({ success: false, message: 'Device not found: RD Service not running on client machine' });
    }
    if (err.message && err.message.includes('timed out')) {
      return res.status(504).json({ success: false, message: 'RD Service request timed out' });
    }
    return res.status(500).json({ success: false, message: 'RD Service error', details: err.message });
  }
});

// GET /api/rd/info
router.get('/info', async (req, res) => {
  try {
    const rdResp = await axios.get('http://127.0.0.1:11100/rd/info', { timeout: 5000 });
    res.status(200).send(rdResp.data);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Device not found: RD Service not reachable', details: err.message });
  }
});

module.exports = router;
