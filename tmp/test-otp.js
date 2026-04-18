const axios = require('axios');

async function test() {
  try {
    console.log('Sending OTP request...');
    const res = await axios.post('http://localhost:3005/api/auth/send-otp', {
      mobile: '7000000020'
    });
    console.log('Response:', res.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

test();
