const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/audit'); // Use your logger utility or replace with console


class RdService {
  constructor() {
    this.apiUrl = process.env.EXTERNAL_API_URL || 'http://127.0.0.1:11100/rd/capture';
    this.timeout = 15000; // 15 seconds
  }

  async callExternalApi(xmlBody) {
    try {
      // Validate XML body
      if (!xmlBody || typeof xmlBody !== 'string') {
        throw new Error('Invalid XML body');
      }
      // Logging request
      logger.logAction({ action: 'RD_CAPTURE_REQUEST', metadata: { xmlBody } });
      const response = await axios.post(this.apiUrl, xmlBody, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: this.timeout,
      });
      if (!response.data) {
        throw new Error('Empty response from RD Service');
      }
      // Parse XML to JSON
      const result = await xml2js.parseStringPromise(response.data, { explicitArray: false, mergeAttrs: true });
      logger.logAction({ action: 'RD_CAPTURE_RESPONSE', metadata: { result } });
      return result;
    } catch (error) {
      logger.logAction({ action: 'RD_CAPTURE_ERROR', metadata: { error: error.message } });
      if (error.code === 'ECONNABORTED') {
        throw new Error('RD Service request timed out');
      }
      throw error;
    }
  }
}

module.exports = new RdService();
