require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

async function testPrabhuConnection() {
  console.log("Starting Prabhu API Connection Test...\n");

  const cspBaseUrl = process.env.PRABHU_CSP_BASE_URL;
  const username = process.env.PRABHU_API_USERNAME;
  const password = process.env.PRABHU_API_PASSWORD;
  const apiKey = process.env.PRABHU_API_KEY;
  const agentCode = process.env.PRABHU_AGENT_CODE;

  if (!cspBaseUrl || !username || !password || !apiKey || !agentCode) {
    console.error("❌ Missing required Prabhu environment variables in .env!");
    return;
  }

  const tokenUrl = `${cspBaseUrl}/v1/auth/generatetoken`;
  
  console.log(`Endpoint: ${tokenUrl}`);
  console.log(`AgentCode: ${agentCode}`);
  
  try {
    const response = await axios.post(
      tokenUrl,
      {
        UserName: username,
        Password: password
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'APIKey': apiKey,
          'AgentCode': agentCode
        },
        timeout: 10000
      }
    );

    const data = response.data;
    console.log("\n✅ Prabhu API Connection Successful!");
    console.log("Response Data:", data);

    if (data.StatusCode === 1 || data.StatusCode === '1' || data.AccessToken) {
      console.log("\n🔒 Token successfully generated. Authentication is working!");
    } else {
      console.log("\n⚠️ Connection reached, but token was not generated. Check credentials.");
    }
  } catch (error) {
    console.error("\n❌ Prabhu API Connection Failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Message:", error.message);
    }
  }
}

testPrabhuConnection();
