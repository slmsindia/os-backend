require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const crypto = require('crypto');

const baseUrl = process.env.PRABHU_BASE_URL;
const username = process.env.PRABHU_API_USERNAME;
const password = process.env.PRABHU_API_PASSWORD;
const apiKey = process.env.PRABHU_API_KEY;

const method = 'POST';
const endpoint = '/Send/GetCustomerByMobile';
const url = `${baseUrl}${endpoint}`;

const bodyObj = {
  customerMobile: '7041897207'
};
const bodyString = JSON.stringify(bodyObj);

async function tryAuth(appId, secretLabel, secretStr) {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestUrl = encodeURIComponent(url).toLowerCase();
  
  const contentMd5Base64 = crypto.createHash('md5').update(bodyString, 'utf8').digest('base64');

  const dataToSign = `${appId}${method}${requestUrl}${timestamp}${nonce}${contentMd5Base64}`;
  
  let secretBytes;
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(secretStr) && secretStr.length % 4 === 0) {
    try {
      secretBytes = Buffer.from(secretStr, 'base64');
    } catch {
      secretBytes = Buffer.from(secretStr, 'utf8');
    }
  } else {
    secretBytes = Buffer.from(secretStr, 'utf8');
  }

  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(dataToSign, 'utf8')
    .digest('base64');

  const authHeader = `hmacauth ${appId}:${signature}:${nonce}:${timestamp}`;

  try {
    const res = await axios.post(url, bodyObj, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });
    if (res.data && res.data.code === '1100') {
      console.log(`❌ Failed with Secret=${secretLabel} ->`, res.data.message);
      return false;
    }
    console.log(`✅ SUCCESS with Secret=${secretLabel}`);
    console.log(res.data);
    return true;
  } catch (err) {
    console.log(`❌ Failed with Secret=${secretLabel} ->`, err.response?.data?.message || err.message);
    return false;
  }
}

async function run() {
  console.log(`Testing against URL: ${url}`);
  
  const appIds = [username, apiKey];
  const secretsToTest = [
    { label: 'PASSWORD', val: password },
    { label: 'API_KEY', val: apiKey },
    { label: 'BASE64_API_KEY', val: Buffer.from(apiKey).toString('base64') },
    { label: 'BASE64_PASSWORD', val: Buffer.from(password).toString('base64') }
  ];

  for (const appId of appIds) {
    console.log(`\nUsing AppId: ${appId}`);
    for (const s of secretsToTest) {
      if (await tryAuth(appId, s.label, s.val)) {
        console.log(`BINGO! AppId: ${appId}, Secret: ${s.label}`);
        return;
      }
    }
  }
}

run();
