require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const crypto = require('crypto');

const baseUrl = process.env.PRABHU_BASE_URL.replace(/\/$/, '');
const username = process.env.PRABHU_API_USERNAME;
const password = process.env.PRABHU_API_PASSWORD;
const apiKey = process.env.PRABHU_API_KEY;

const endpoint = '/Send/GetCustomerByMobile';
const url = `${baseUrl}${endpoint}`;

const bodyStr1 = JSON.stringify({ customerMobile: '7041897207' });
const bodyStr2 = JSON.stringify({ CustomerMobile: '7041897207' });
const bodyStr3 = '';

async function tryCombo({
  appIdLabel, appId, secretLabel, secretStr, encodeMode, urlStr, bodyStr, methodMode
}) {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  let requestUrl = '';
  if (encodeMode === 'lowerFirst') {
    requestUrl = encodeURIComponent(urlStr.toLowerCase()).toLowerCase();
  } else if (encodeMode === 'lowerAfter') {
    requestUrl = encodeURIComponent(urlStr).toLowerCase();
  }

  const contentMd5Base64 = bodyStr ? crypto.createHash('md5').update(bodyStr, 'utf8').digest('base64') : '';
  const dataToSign = `${appId}${methodMode}${requestUrl}${timestamp}${nonce}${contentMd5Base64}`;
  
  let secretBytes;
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(secretStr) && secretStr.length % 4 === 0) {
    try { secretBytes = Buffer.from(secretStr, 'base64'); } 
    catch { secretBytes = Buffer.from(secretStr, 'utf8'); }
  } else {
    secretBytes = Buffer.from(secretStr, 'utf8');
  }

  const signature = crypto.createHmac('sha256', secretBytes).update(dataToSign, 'utf8').digest('base64');
  const authHeader = `hmacauth ${appId}:${signature}:${nonce}:${timestamp}`;

  try {
    const res = await axios({
      method: methodMode,
      url: urlStr,
      data: bodyStr ? JSON.parse(bodyStr) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (res.data && res.data.code === '1100') {
      return false; // Signature Invalid
    }
    
    console.log(`\n✅ BINGO!`);
    console.log(`AppId: ${appIdLabel}, Secret: ${secretLabel}`);
    console.log(`URL: ${urlStr}, Encode: ${encodeMode}, Body: ${bodyStr}, Method: ${methodMode}`);
    console.log(`Response:`, res.data);
    return true;
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      // wrong endpoint / method
      return false;
    }
    if (err.response?.data?.code === '1100') return false;
    
    console.log(`⚠️ OTHER ERROR ->`, err.response?.data || err.message);
    return false;
  }
}

async function run() {
  const secrets = [
    { label: 'PASSWORD', val: password },
    { label: 'API_KEY', val: apiKey }
  ];
  const encodes = ['lowerAfter']; // C# UrlEncode(url.ToLowerInvariant()) equals encodeURIComponent(url).toLowerCase();
  const urls = [ url, 'https://sandbox.prabhuindia.com/api/Send/GetCustomerByMobile' ];
  const bodies = [ bodyStr1, bodyStr2, bodyStr3 ];
  const methods = ['POST', 'GET'];

  console.log("Starting brutal force search...");

  for (const s of secrets) {
    for (const em of encodes) {
      for (const u of urls) {
        for (const b of bodies) {
          for (const m of methods) {
            // If body is empty, we must not send POST usually, but let's try anyway
            if (m === 'GET' && b !== '') continue;
            
            const hit = await tryCombo({
              appIdLabel: 'SHUBH_API',
              appId: username,
              secretLabel: s.label,
              secretStr: s.val,
              encodeMode: em,
              urlStr: u,
              bodyStr: b,
              methodMode: m
            });

            if (hit) {
              process.exit(0);
            }
          }
        }
      }
    }
  }
  
  console.log("❌ All combinations failed :(");
}

run();
