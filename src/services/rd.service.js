/**
 * rd.service.js
 *
 * Backend RD Service — communicates with the Mantra fingerprint device.
 *
 * Mantra uses NON-STANDARD HTTP methods:
 *   RDSERVICE  →  https://<host>/          (discovery)
 *   CAPTURE    →  https://<host>/rd/capture (fingerprint — some versions use POST)
 *
 * Discovery scans ports 11100–11105 automatically.
 */

const axios   = require('axios');
const xml2js  = require('xml2js');
const logger  = require('../utils/audit');
const https   = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const RD_PORTS  = [11100, 11101, 11102, 11103, 11104, 11105];
const PROTOCOLS = ['https', 'http'];

class RdService {
  constructor() {
    this.timeout          = 20000; // 20s — fingerprint scan takes time
    this._discoveredBase  = null;  // cached discovered base URL
    this._capturePath     = '/rd/capture';
  }

  // ── Discover: scan all ports with RDSERVICE method ──────────────────────────
  async discover() {
    for (const protocol of PROTOCOLS) {
      for (const port of RD_PORTS) {
        const base = `${protocol}://127.0.0.1:${port}`;
        try {
          const resp = await axios({
            method: 'RDSERVICE',
            url:    `${base}/`,
            timeout: 3000,
            headers: { 'Content-Type': 'text/xml' },
            ...(protocol === 'https' ? { httpsAgent } : {}),
          });

          const xml = typeof resp.data === 'string' ? resp.data : String(resp.data || '');
          if (!xml.includes('RDService') && !xml.includes('Interface')) continue;

          // Extract capture path from XML
          const captureMatch = xml.match(/id="CAPTURE"[^>]*path="([^"]+)"/i)
                            || xml.match(/path="([^"]+)"[^>]*id="CAPTURE"/i);

          this._discoveredBase = base;
          this._capturePath    = captureMatch?.[1] || '/rd/capture';
          this._protocol       = protocol;

          logger.logAction({
            action: 'RD_DISCOVERED',
            metadata: { base, capturePath: this._capturePath }
          });

          return { base, capturePath: this._capturePath };

        } catch (err) {
          // 405 = port is open, try default paths
          if (err.response?.status === 405) {
            this._discoveredBase = base;
            this._capturePath    = '/rd/capture';
            this._protocol       = protocol;
            return { base, capturePath: '/rd/capture' };
          }
          // Connection refused / TLS / timeout = try next
          continue;
        }
      }
    }

    throw new Error('Mantra RD Service not found on ports 11100–11105');
  }

  // ── callExternalApi: discover → capture ────────────────────────────────────
  async callExternalApi(xmlBody) {
    if (!xmlBody || typeof xmlBody !== 'string') {
      throw new Error('Invalid XML body');
    }

    // Discover (use cached if available)
    if (!this._discoveredBase) {
      await this.discover();
    }

    const captureUrl = `${this._discoveredBase}${this._capturePath}`;

    // Try CAPTURE method first (UIDAI standard), then POST (compatibility)
    const methods = ['CAPTURE', 'POST'];
    let lastError = null;

    for (const method of methods) {
      try {
        logger.logAction({ action: 'RD_CAPTURE_TRY', metadata: { method, url: captureUrl } });

        const response = await axios({
          method,
          url: captureUrl,
          data: xmlBody,
          headers: { 'Content-Type': 'text/xml' },
          timeout: this.timeout,
          ...(this._protocol === 'https' ? { httpsAgent } : {}),
        });

        if (!response.data) throw new Error('Empty response from RD Service');

        const result = await xml2js.parseStringPromise(response.data, {
          explicitArray: false,
          mergeAttrs: true,
        });

        logger.logAction({ action: 'RD_CAPTURE_SUCCESS', metadata: { method, url: captureUrl } });
        return result;

      } catch (error) {
        lastError = error;
        logger.logAction({
          action: 'RD_CAPTURE_METHOD_FAIL',
          metadata: { method, url: captureUrl, error: error.message }
        });

        // 405 = method not allowed, try next method
        if (error.response?.status === 405) continue;

        // Connection refused = discovered port died, reset cache and throw
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
          this._discoveredBase = null; // reset cache
        }

        // Timeout
        if (error.code === 'ECONNABORTED') {
          throw new Error('RD Service request timed out');
        }

        break;
      }
    }

    if (lastError) throw lastError;
  }

  // ── resetDiscovery: force re-discover on next call ─────────────────────────
  resetDiscovery() {
    this._discoveredBase = null;
  }
}

module.exports = new RdService();
