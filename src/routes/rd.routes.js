const express = require('express');
const router = express.Router();
const axios = require('axios');

const rdService = require('../services/rd.service');
const logger = require('../utils/audit');

// POST /api/rd/capture
router.post('/capture', async (req, res) => {
  try {
    // Accept both JSON { xml: '...' } and raw string body
    const xmlBody = req.body && typeof req.body === 'string' ? req.body : req.body?.xml;
    if (!xmlBody || typeof xmlBody !== 'string') {
      logger.logAction({ action: 'RD_CAPTURE_INVALID_BODY', metadata: { body: req.body } });
      return res.status(400).json({ success: false, message: 'Invalid request body: XML string required' });
    }

    const result = await rdService.callExternalApi(xmlBody);

    // Extract and clean response for client
    const resp = result.PidData || {};
    const respInfo = resp.Resp || {};

    // Check errCode (mergeAttrs:true means attributes come as direct properties)
    const errCode = String(respInfo.errCode || '0');
    if (errCode !== '0') {
      return res.status(400).json({ success: false, message: respInfo.errInfo || 'Device error', errCode });
    }

    const data = {
      EncryptedPid: resp.Data?._ || resp.Data || '',
      EncryptedHmac: resp.Hmac?._ || resp.Hmac || '',
      SessionKeyValue: resp.Skey?._ || resp.Skey || '',
      CertificateIdentifier: String(resp.Skey?.ci || ''),
    };

    // DeviceInfo attributes come as direct properties with mergeAttrs:true
    const devInfo = resp.DeviceInfo || {};
    data.RegisteredDeviceProviderId = devInfo.dpId || '';
    data.RegisteredDeviceServiceId = devInfo.rdsId || '';
    data.RegisteredDeviceServiceVersion = devInfo.rdsVer || '';
    data.RegisteredDeviceCode = devInfo.dc || '';
    data.RegisteredDeviceModelId = devInfo.mi || '';
    data.RegisteredDevicePublicKey = devInfo.mc || '';

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
