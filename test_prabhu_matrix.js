require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const API_KEY = (process.env.PRABHU_API_KEY || "").trim();
const API_SECRET = (process.env.PRABHU_API_SECRET || "").trim();
const BASE_URL = (process.env.PRABHU_BASE_URL || "").trim();
const TIMEOUT_MS = Number(process.env.PRABHU_TIMEOUT_MS || 20000);

const SAFE_ENDPOINTS = [
  { name: "GetEcho", path: "/Send/getEcho", body: {} },
  { name: "GetStateDistrict", path: "/Send/GetStateDistrict", body: { country: "" } },
  { name: "GetStaticData", path: "/Send/GetStaticData", body: {} },
  { name: "GetBalance", path: "/Send/GetBalance", body: {} },
  { name: "GetCashPayLocationList", path: "/Send/GetCashPayLocationList", body: {} },
  { name: "GetAcPayBankBranchList", path: "/Send/GetAcPayBankBranchList", body: {} }
];

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

const normalizeBase = (value) => value.replace(/\/$/, "");

const buildBaseCandidates = () => {
  if (!BASE_URL) return [];

  const set = new Set();
  const normalized = normalizeBase(BASE_URL);
  set.add(normalized);

  try {
    const parsed = new URL(normalized);
    const origin = parsed.origin;
    set.add(origin);
    set.add(`${origin}/Api`);
    set.add(`${origin}/api`);
  } catch {
    // keep only raw base url
  }

  return [...set];
};

const buildSignModes = (baseUrl, endpointPath) => {
  const normalized = normalizeBase(baseUrl);

  const direct = () => `${normalized}${endpointPath}`;

  const postmanLike = () => {
    const parsed = new URL(normalized);
    const protocol = parsed.protocol + "//";
    const host = parsed.host;
    const pathPart = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${protocol}${host}${pathPart}${endpointPath}`;
  };

  return [
    { name: "direct-full-url", getStringToEncodeSource: direct },
    { name: "postman-like", getStringToEncodeSource: postmanLike }
  ];
};

const signRequest = ({ method, rawUrlForSign, bodyString }) => {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const nonce = timestamp;
  const requestUrl = encodeURIComponent(rawUrlForSign).toLowerCase();
  const bodyMd5Base64 = bodyString
    ? crypto.createHash("md5").update(bodyString, "utf8").digest("base64")
    : "";

  const dataToSign = `${API_KEY}${method}${requestUrl}${timestamp}${nonce}${bodyMd5Base64}`;
  const signature = crypto
    .createHmac("sha256", getSecretKeyBuffer(API_SECRET))
    .update(dataToSign, "utf8")
    .digest("base64");

  return `hmacauth ${API_KEY}:${signature}:${nonce}:${timestamp}`;
};

const callOnce = async ({ baseUrl, endpoint, signMode }) => {
  const requestBody = {
    userName: API_KEY,
    password: API_SECRET,
    ...endpoint.body
  };

  const bodyString = JSON.stringify(requestBody);
  const rawUrlForSign = signMode.getStringToEncodeSource();
  const authorization = signRequest({
    method: "POST",
    rawUrlForSign,
    bodyString
  });

  const url = `${normalizeBase(baseUrl)}${endpoint.path}`;

  try {
    const response = await axios.post(url, requestBody, {
      timeout: TIMEOUT_MS,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization
      }
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      endpoint: endpoint.name,
      url,
      signMode: signMode.name,
      response: response.data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      endpoint: endpoint.name,
      url,
      signMode: signMode.name,
      response: error.message
    };
  }
};

async function runMatrix() {
  if (!API_KEY || !API_SECRET || !BASE_URL) {
    console.error("Missing PRABHU_API_KEY / PRABHU_API_SECRET / PRABHU_BASE_URL");
    process.exitCode = 1;
    return;
  }

  const bases = buildBaseCandidates();
  const results = [];

  for (const base of bases) {
    for (const endpoint of SAFE_ENDPOINTS) {
      const modes = buildSignModes(base, endpoint.path);
      for (const signMode of modes) {
        const result = await callOnce({ baseUrl: base, endpoint, signMode });
        results.push(result);
        console.log(
          `${result.ok ? "OK" : "NO"} | ${result.status} | ${result.endpoint} | ${result.signMode} | ${result.url}`
        );
      }
    }
  }

  const successRows = results.filter((r) => r.ok);
  const non404Rows = results.filter((r) => r.status && r.status !== 404);

  console.log("\nSummary:");
  console.log(`Total calls: ${results.length}`);
  console.log(`2xx success: ${successRows.length}`);
  console.log(`Non-404 responses: ${non404Rows.length}`);

  if (successRows.length > 0) {
    console.log("\nWorking combinations:");
    successRows.forEach((row) => {
      console.log(`${row.endpoint} | ${row.signMode} | ${row.url} | ${row.status}`);
    });
  } else {
    console.log("\nNo 2xx responses found. Likely base URL/version mismatch or provider-side route restrictions.");
  }
}

runMatrix();
