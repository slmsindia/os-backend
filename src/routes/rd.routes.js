/**
 * rd.routes.js
 *
 * Mantra RD Service uses NON-STANDARD HTTP methods:
 *   RDSERVICE  →  https://<host>/          (discovery)
 *   CAPTURE    →  https://<host>/rd/capture (fingerprint)
 *   GET        →  https://<host>/rd/info    (device info)
 *
 * Flow:
 *   1. Discover: scan ports 11100–11105 using RDSERVICE method
 *   2. Parse XML to get actual paths for DEVICEINFO + CAPTURE
 *   3. Use discovered port/paths for subsequent requests
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const https   = require('https');

const rdService = require('../services/rd.service');
const logger    = require('../utils/audit');

// ─── Shared HTTPS agent (ignore self-signed cert) ─────────────────────────────
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Ports to scan ────────────────────────────────────────────────────────────
const RD_PORTS  = [11100, 11101, 11102, 11103, 11104, 11105];
const PROTOCOLS = ['https', 'http']; // HTTPS first (Mantra MFS110 confirmed)

// ─── discoverRdService ────────────────────────────────────────────────────────
/**
 * Scans ports 11100-11105 using the RDSERVICE custom HTTP method.
 * Returns the first responding device info.
 *
 * @returns {{ found: boolean, base?: string, port?: number, protocol?: string,
 *             infoPath?: string, capturePath?: string, raw?: string }}
 */
async function discoverRdService() {
  for (const protocol of PROTOCOLS) {
    for (const port of RD_PORTS) {
      const base = `${protocol}://127.0.0.1:${port}`;
      try {
        const resp = await axios({
          method: 'RDSERVICE',
          url: `${base}/`,
          timeout: 3000,
          headers: { 'Content-Type': 'text/xml' },
          ...(protocol === 'https' ? { httpsAgent } : {}),
        });

        if (!resp.data) continue;
        const xml = typeof resp.data === 'string' ? resp.data : String(resp.data);
        if (!xml.includes('RDService') && !xml.includes('Interface')) continue;

        // Parse paths AND methods from XML:
        // <Interface id="DEVICEINFO" path="/rd/info" />
        // <Interface id="CAPTURE"    path="/rd/capture" />
        // The id attribute IS the HTTP method to use!
        const infoMatch    = xml.match(/id="DEVICEINFO"[^>]*path="([^"]+)"/i)
                          || xml.match(/path="([^"]+)"[^>]*id="DEVICEINFO"/i);
        const captureMatch = xml.match(/id="CAPTURE"[^>]*path="([^"]+)"/i)
                          || xml.match(/path="([^"]+)"[^>]*id="CAPTURE"/i);

        return {
          found:       true,
          base,
          port,
          protocol,
          infoPath:    infoMatch?.[1]    || '/rd/info',
          infoMethod:  'DEVICEINFO',  // ← Mantra uses custom method, not GET
          capturePath: captureMatch?.[1] || '/rd/capture',
          raw:         xml,
        };
      } catch (err) {
        // ECONNREFUSED = port not open → try next
        // 405 = port open but RDSERVICE method rejected → try GET on /rd/info anyway
        if (
          err.code === 'ECONNREFUSED' ||
          err.code === 'ECONNRESET'   ||
          err.code === 'ETIMEDOUT'    ||
          err.code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
          err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          err.message?.includes('self signed') ||
          err.message?.includes('certificate') ||
          err.message?.includes('timeout')
        ) continue;

        if (err.response?.status === 405) {
          // Port is open — service reachable but doesn't support RDSERVICE method
          // Try as if it's the device anyway with default paths
          return {
            found:       true,
            base,
            port,
            protocol,
            infoPath:    '/rd/info',
            infoMethod:  'DEVICEINFO',
            capturePath: '/rd/capture',
            raw:         null,
            note:        `405 on RDSERVICE — using default paths`,
          };
        }
      }
    }
  }

  return { found: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rd/discover
// Scan all ports and return which one has the RD Service
// ─────────────────────────────────────────────────────────────────────────────
router.get('/discover', async (req, res) => {
  const result = await discoverRdService();

  if (!result.found) {
    return res.status(404).json({
      success: false,
      message: 'Mantra RD Service not found on any port (11100–11105).',
      hint: 'Ensure the Mantra RD Service is running (check system tray icon).',
    });
  }

  return res.json({
    success:     true,
    message:     `RD Service found on ${result.base}`,
    port:        result.port,
    protocol:    result.protocol,
    base:        result.base,
    infoPath:    result.infoPath,
    capturePath: result.capturePath,
    rawXml:      result.raw,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rd/info
// Discover service first, then fetch device info
// ─────────────────────────────────────────────────────────────────────────────
router.get('/info', async (req, res) => {
  // Step 1: discover
  const device = await discoverRdService();

  if (!device.found) {
    return res.status(500).json({
      success: false,
      message: 'Mantra RD Service not found on ports 11100–11105.',
      hint:    'Start the Mantra RD Service from the system tray.',
    });
  }

  // Step 2: fetch device info
  // Mantra uses custom 'DEVICEINFO' HTTP method (same pattern as RDSERVICE/CAPTURE)
  const infoUrl = `${device.base}${device.infoPath}`;
  const methods = [
    device.infoMethod || 'DEVICEINFO', // ← primary: custom method from XML
    'GET',                              // ← fallback: standard HTTP
    'POST',                             // ← last resort
  ];

  const infoErrors = [];
  for (const method of methods) {
    try {
      const resp = await axios({
        method,
        url: infoUrl,
        timeout: 5000,
        headers: {
          'Content-Type': 'text/xml',
          'Connection':   'close',     // prevent socket hang up
        },
        ...(device.protocol === 'https' ? { httpsAgent } : {}),
      });
      return res.status(200).send(resp.data);
    } catch (err) {
      const summary = `[${method} ${infoUrl}]: ${err.code || err.response?.status} — ${err.message}`;
      infoErrors.push(summary);
      console.log('[RD /info]', summary);

      // 405 or socket hang up → try next method
      if (
        err.response?.status === 405 ||
        err.message?.includes('socket hang up') ||
        err.message?.includes('ECONNRESET')
      ) continue;

      // Any other error — stop
      logger.logAction({ action: 'RD_INFO_ERROR', metadata: { url: infoUrl, error: err.message } });
      return res.status(500).json({
        success:     false,
        message:     'Failed to get device info',
        details:     err.message,
        triedMethod: method,
        discoveredAt: device.base,
      });
    }
  }

  return res.status(500).json({
    success:  false,
    message:  'Device info not available (all methods failed)',
    infoErrors,
    discoveredAt: device.base,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rd/capture
// Discover service first, then capture fingerprint
//
// ⚠️  Only works when backend is on the SAME machine as the RD device.
//     For web-based capture, use frontend rdService.js directly.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/capture', async (req, res) => {
  try {
    // Accept both JSON { xml: '...' } and raw XML string body
    const xmlBody =
      req.body && typeof req.body === 'string'
        ? req.body
        : req.body?.xml;

    if (!xmlBody || typeof xmlBody !== 'string') {
      logger.logAction({ action: 'RD_CAPTURE_INVALID_BODY', metadata: { body: req.body } });
      return res.status(400).json({
        success: false,
        message: 'Invalid request body: XML string required in body.xml or as raw text',
      });
    }

    const result = await rdService.callExternalApi(xmlBody);

    const resp     = result.PidData || {};
    const respInfo = resp.Resp       || {};
    const errCode  = String(respInfo.errCode || '0');

    if (errCode !== '0') {
      return res.status(400).json({
        success: false,
        message: respInfo.errInfo || `Device error (code ${errCode})`,
        errCode,
      });
    }

    const devInfo = resp.DeviceInfo || {};
    const data = {
      EncryptedPid:                   resp.Data?._ || resp.Data || '',
      EncryptedHmac:                  resp.Hmac?._ || resp.Hmac || '',
      SessionKeyValue:                resp.Skey?._ || resp.Skey || '',
      CertificateIdentifier:          String(resp.Skey?.ci || ''),
      RegisteredDeviceProviderId:     devInfo.dpId   || '',
      RegisteredDeviceServiceId:      devInfo.rdsId  || '',
      RegisteredDeviceServiceVersion: devInfo.rdsVer || '',
      RegisteredDeviceCode:           devInfo.dc     || '',
      RegisteredDeviceModelId:        devInfo.mi     || '',
      RegisteredDevicePublicKey:      devInfo.mc     || '',
    };

    logger.logAction({ action: 'RD_CAPTURE_SUCCESS', metadata: { model: data.RegisteredDeviceModelId } });
    return res.json({ success: true, data });

  } catch (err) {
    logger.logAction({ action: 'RD_CAPTURE_ROUTE_ERROR', metadata: { error: err.message } });

    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      return res.status(500).json({
        success: false,
        message: 'RD Service not found. Use GET /api/rd/discover to check which port is active.',
      });
    }
    if (err.message?.includes('timed out') || err.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: 'Fingerprint scan timed out. Place finger firmly and try again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'RD Service error',
      details: err.message,
    });
  }
});

module.exports = router;
