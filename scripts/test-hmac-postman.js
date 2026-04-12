const axios = require('axios');
const crypto = require('crypto');

const appId = 'SHUBH_API';
const secretStr = 'Subhalaxmi#12345';
const timestamp = Math.round(Date.now() / 1000).toString();
const nonce = timestamp; // Postman uses requestTimeStamp for nonce too

const rawBody = `{"userName":"SHUBH_API","password":"Subhalaxmi#12345","customerMobile":"9800000000"}`;

const requestUrlNormal = "https://sandbox.prabhuindia.com/Sendapi/Send/GetCustomerByMobile";
const requestUrlDouble = "https://sandbox.prabhuindia.com/Sendapi/Sendapi/Send/GetCustomerByMobile";

const encodedNormal = encodeURIComponent(requestUrlNormal).toLowerCase();
const encodedDouble = encodeURIComponent(requestUrlDouble).toLowerCase();

let secretBytes;
try {
  secretBytes = Buffer.from(secretStr, 'base64');
  if (secretBytes.toString('base64') !== secretStr) throw new Error();
} catch {
  secretBytes = Buffer.from(secretStr, 'utf8');
}

const contentMd5Base64 = crypto.createHash('md5').update(rawBody, 'utf8').digest('base64');

console.log("MD5 Base64:", contentMd5Base64);

async function attempt(urlMode, encodedUrl) {
  const dataToSign = `${appId}POST${encodedUrl}${timestamp}${nonce}${contentMd5Base64}`;
  const signature = crypto.createHmac('sha256', secretBytes).update(dataToSign, 'utf8').digest('base64');
  const authHeader = `hmacauth ${appId}:${signature}:${nonce}:${timestamp}`;

  console.log(`\nTesting with ${urlMode} URL encoding...`);
  try {
    const res = await axios.post(
      requestUrlNormal,
      rawBody, // send RAW string!
      {
        headers: {
           'Content-Type': 'application/json',
           'Authorization': authHeader
        }
      }
    );
    if (res.data && res.data.code === '1100') {
      console.log(`❌ Failed: Signature is Invalid`);
    } else {
      console.log(`✅ SUCCESS! HTTP 200`);
      console.log(res.data);
    }
  } catch(err) {
    console.log(`❌ Failed:`, err.response?.data || err.message);
  }
}

async function run() {
  await attempt("NORMAL", encodedNormal);
  await attempt("DOUBLE", encodedDouble);
}

run();
