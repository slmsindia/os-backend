const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const buildSignature = (bodyString, endpointPath) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = timestamp;
  const requestUrl = encodeURIComponent(`https://sandbox.prabhuindia.com/Sendapi${endpointPath}`).toLowerCase();
  const md5Base64 = crypto.createHash('md5').update(bodyString, 'utf8').digest('base64');
  const dataToSign = `${process.env.PRABHU_API_KEY}POST${requestUrl}${timestamp}${nonce}${md5Base64}`;
  const sig = crypto.createHmac('sha256', Buffer.from(process.env.PRABHU_API_PASSWORD, 'utf8')).update(dataToSign, 'utf8').digest('base64');
  return `hmacauth ${process.env.PRABHU_API_KEY}:${sig}:${nonce}:${timestamp}`;
};

async function run() {
  const payload = {
    userName: process.env.PRABHU_API_KEY,
    password: process.env.PRABHU_API_PASSWORD,
    operation: 'SendTransaction',
    customerMobile: '9800000000',
    customerId: '6853',
    receiverId: '4761',
    paymentMode: 'Cash Pay',
    sendAmount: '100',
    customerFullName: 'TEST CUSTOMER'
  };
  const bodyString = JSON.stringify(payload);
  const endpointPath = '/Send/SendOTP';
  console.log("URL:", `https://sandbox.prabhuindia.com/Sendapi${endpointPath}`);
  console.log("Body:", bodyString);
  const auth = buildSignature(bodyString, endpointPath);
  console.log("Auth:", auth);
  
  try {
    const res = await axios.post(`https://sandbox.prabhuindia.com/Sendapi${endpointPath}`, bodyString, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (e) {
    console.log("ERROR:");
    if (e.response) {
      console.log(e.response.status, e.response.data);
    } else {
      console.log(e.message);
    }
  }
}
run();
