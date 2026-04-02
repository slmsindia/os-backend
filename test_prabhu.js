require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const PRABHU_BASE_URL = (process.env.PRABHU_BASE_URL || "").trim();
const PRABHU_API_KEY = (process.env.PRABHU_API_KEY || "").trim();
const PRABHU_API_SECRET = (process.env.PRABHU_API_SECRET || "").trim();

const ENDPOINT_PATH = "/Send/getEcho";

const isHexString = (value = "") => /^[0-9A-Fa-f]+$/.test(value) && value.length % 2 === 0;

const isBase64String = (value = "") => {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return false;
  }
  try {
    return Buffer.from(value, "base64").toString("base64") === value;
  } catch {
    return false;
  }
};

const getSecretKeyBuffer = (secret) => {
  if (!secret) return Buffer.from("");
  if (isHexString(secret)) return Buffer.from(secret, "hex");
  if (isBase64String(secret)) return Buffer.from(secret, "base64");
  return Buffer.from(secret, "utf8");
};

const buildAuthorization = (method, endpointPath, bodyString) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = timestamp;
  const normalizedBase = PRABHU_BASE_URL.replace(/\/$/, "");
  const requestUrl = encodeURIComponent(`${normalizedBase}${endpointPath}`).toLowerCase();
  const bodyMd5Base64 = bodyString
    ? crypto.createHash("md5").update(bodyString, "utf8").digest("base64")
    : "";

  const dataToSign = `${PRABHU_API_KEY}${method}${requestUrl}${timestamp}${nonce}${bodyMd5Base64}`;
  const signature = crypto
    .createHmac("sha256", getSecretKeyBuffer(PRABHU_API_SECRET))
    .update(dataToSign, "utf8")
    .digest("base64");

  return `hmacauth ${PRABHU_API_KEY}:${signature}:${nonce}:${timestamp}`;
};

async function testPrabhuGetEcho() {
  const result = {
    success: false,
    message: "",
    endpoint: `${PRABHU_BASE_URL}${ENDPOINT_PATH}`,
    error: null,
    data: null
  };

  if (!PRABHU_BASE_URL || !PRABHU_API_KEY || !PRABHU_API_SECRET) {
    result.message = "Missing PRABHU_BASE_URL / PRABHU_API_KEY / PRABHU_API_SECRET in .env";
    console.error(result.message);
    return result;
  }

  try {
    const method = "POST";
    const body = {
      userName: PRABHU_API_KEY,
      password: PRABHU_API_SECRET
    };
    const bodyString = JSON.stringify(body);
    const authorization = buildAuthorization(method, ENDPOINT_PATH, bodyString);

    console.log("Testing Prabhu GetEcho:", result.endpoint);

    const response = await axios({
      method,
      url: result.endpoint,
      data: body,
      timeout: Number(process.env.PRABHU_TIMEOUT_MS || 30000),
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization
      }
    });

    result.success = true;
    result.message = "Prabhu GetEcho call successful";
    result.data = response.data;
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.message = "Prabhu GetEcho failed";
    result.data = error.response?.data || null;
  }

  console.log("Final Result:", JSON.stringify(result, null, 2));
  return result;
}

testPrabhuGetEcho().then(() => {
  console.log("Prabhu test completed");
});
