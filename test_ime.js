require('dotenv').config();
const soap = require('soap');

const IME_BASE_URL = process.env.IME_BASE_URL;
const IME_ACCESS_CODE = process.env.IME_ACCESS_CODE;
const IME_PARTNER_BRANCH_ID = process.env.IME_PARTNER_BRANCH_ID;
const IME_AGENT_SESSION_ID = process.env.IME_AGENT_SESSION_ID;
const IME_USERNAME = process.env.IME_USERNAME;
const IME_PASSWORD = process.env.IME_PASSWORD;

async function testIMELogin() {
  const result = {
    success: false,
    message: '',
    url: '',
    error: null
  };

  try {
    console.log('Testing IME UAT Login...');
    result.url = IME_BASE_URL;
    console.log('IME_BASE_URL:', IME_BASE_URL);

    const wsdlUrl = IME_BASE_URL + '?wsdl';
    console.log('WSDL URL:', wsdlUrl);
    result.url = wsdlUrl;

    // Create SOAP client
    const client = await soap.createClientAsync(wsdlUrl);

    console.log('SOAP Client created successfully');
    result.success = true;
    result.message = 'SOAP client created, but login method not tested yet';

    // Get available methods
    const methods = Object.keys(client).filter(key => typeof client[key] === 'function');
    console.log('Available methods:', methods);

    // Try to call a login or authenticate method
    if (client.Login) {
      console.log('Calling Login method...');
      const loginResult = await client.LoginAsync({
        AccessCode: IME_ACCESS_CODE,
        PartnerBranchId: IME_PARTNER_BRANCH_ID,
        AgentSessionId: IME_AGENT_SESSION_ID,
        Username: IME_USERNAME,
        Password: IME_PASSWORD
      });

      console.log('Login Result:', JSON.stringify(loginResult, null, 2));
      result.success = true;
      result.message = 'IME UAT Login SUCCESSFUL';
    } else if (client.Authenticate) {
      console.log('Calling Authenticate method...');
      const authResult = await client.AuthenticateAsync({
        username: IME_USERNAME,
        password: IME_PASSWORD
      });

      console.log('Authenticate Result:', JSON.stringify(authResult, null, 2));
      result.success = true;
      result.message = 'IME UAT Login SUCCESSFUL';
    } else {
      result.message = 'No Login or Authenticate method found. Available methods: ' + methods.join(', ');
      console.log(result.message);
    }

  } catch (error) {
    console.error('IME UAT Login FAILED');
    result.success = false;
    result.error = error.message;
    result.message = 'Login failed: ' + error.message;
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
      result.message += ' | Response: ' + JSON.stringify(error.response.data);
    }
    if (error.code) {
      console.error('Error Code:', error.code);
      result.message += ' | Code: ' + error.code;
    }
  }

  console.log('Final Result:', JSON.stringify(result, null, 2));
  return result;
}

testIMELogin().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Uncaught error:', err);
});

testIMELogin();