const axios = require('axios');

async function run() {
  const payload = {
    operation: 'SendTransaction',
    mobile: '8488856251',
    customerId: '4029',
    receiverId: '3779894',
    paymentMode: 'Cash Payment',
    sendAmount: '1235'
  };
  
  try {
    const res = await axios.post(`http://localhost:3005/api/prabhu/SendOTP`, payload, {
      headers: {
        'Content-Type': 'application/json'
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
