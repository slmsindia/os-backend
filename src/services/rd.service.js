const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/audit');
const https = require('https');

// Ignore self-signed SSL cert for local RD device
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class RdService {
  constructor() {
    // Try ports in order: 11100 (HTTP), 11101 (HTTPS for Mantra L1)
    this.ports = [
      { url: 'http://127.0.0.1:11100/rd/capture', agent: null },
      { url: 'https://127.0.0.1:11101/rd/capture', agent: httpsAgent },
      { url: 'https://localhost:11101/rd/capture', agent: httpsAgent },
    ];
    this.timeout = 20000; // 20 seconds
  }

  async callExternalApi(xmlBody) {
    if (!xmlBody || typeof xmlBody !== 'string') {
      throw new Error('Invalid XML body');
    }

    let lastError = null;

    for (const endpoint of this.ports) {
      try {
        logger.logAction({ action: 'RD_CAPTURE_TRY', metadata: { url: endpoint.url } });
        const response = await axios.post(endpoint.url, xmlBody, {
          headers: { 'Content-Type': 'text/xml' },
          timeout: this.timeout,
          ...(endpoint.agent ? { httpsAgent: endpoint.agent } : {})
        });

        if (!response.data) throw new Error('Empty response from RD Service');

        const result = await xml2js.parseStringPromise(response.data, { explicitArray: false, mergeAttrs: true });
        logger.logAction({ action: 'RD_CAPTURE_RESPONSE', metadata: { url: endpoint.url } });
        return result;
      } catch (error) {
        lastError = error;
        logger.logAction({ action: 'RD_CAPTURE_PORT_FAIL', metadata: { url: endpoint.url, error: error.message } });
        // ECONNREFUSED = port not open, try next port. TimeoutError = device busy, stop.
        if (error.code !== 'ECONNREFUSED' && error.code !== 'ECONNRESET') break;
      }
    }

    if (lastError) {
      if (lastError.code === 'ECONNABORTED') throw new Error('RD Service request timed out');
      throw lastError;
    }
  }
}

module.exports = new RdService();
