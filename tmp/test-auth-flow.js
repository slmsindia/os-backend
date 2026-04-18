const axios = require('axios');

async function test() {
  const mobile = '7000000020';
  const otp = '947550';
  const password = 'Test@1234';
  const baseUrl = 'http://localhost:3005/api/auth';

  try {
    // 1. Verify OTP
    console.log('--- Step 2: Verify OTP ---');
    const verifyRes = await axios.post(`${baseUrl}/verify-otp`, { mobile, otp });
    console.log('Verify Response:', verifyRes.data);

    // 2. Register
    console.log('\n--- Step 3: Register ---');
    const registerRes = await axios.post(`${baseUrl}/register`, {
      mobile,
      password,
      fullName: 'Test User',
      gender: 'MALE',
      dateOfBirth: '1990-01-01',
      email: 'test@example.com'
    });
    console.log('Register Response:', registerRes.data);

    // 3. Login
    console.log('\n--- Step 4: Login ---');
    const loginRes = await axios.post(`${baseUrl}/login`, {
      mobile,
      password
    });
    console.log('Login Response:', loginRes.data);
    
    if (loginRes.data.accessToken) {
      console.log('\n✅ TEST SUCCESSFUL: User registered and logged in!');
    }

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

test();
