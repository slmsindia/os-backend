const bcrypt = require("bcrypt");
const redis = require("../config/redis");
const { generateOtp } = require("../utils/otp");
const { sendOtpSMS } = require("./sms.service");

const OTP_EXPIRY = 600; // 10 minutes
const MAX_ATTEMPTS = 3;

const sendOtp = async (mobile) => {
  console.log("Generating OTP for", mobile);
  const code = generateOtp();
  console.log("OTP code:", code);
  const hash = await bcrypt.hash(code, 10);
  console.log("Hash generated");

  const key = `otp:${mobile}`;
  try {
    console.log("Storing in Redis key:", key);
    // store hash + tries
    await redis.set(key, JSON.stringify({
      hash,
      attempts: 0
    }), "EX", OTP_EXPIRY);
    console.log("Stored in Redis");
  } catch (err) {
    console.error("Redis error (OTP store):", err.message);
    // continue to send OTP anyway
  }

  console.log("Sending SMS");
  const result = await sendOtpSMS(mobile, code);
  console.log("SMS result:", result);
  return result;
};

const verifyOtp = async (mobile, otp) => {
  const key = `otp:${mobile}`;
  let data;
  try {
    data = await redis.get(key);
  } catch (err) {
    console.error("Redis error (OTP get):", err.message);
    return { success: false, message: "OTP verification unavailable (Redis error)" };
  }

  if (!data) return { success: false, message: "expired" };

  let stored;
  try {
    stored = JSON.parse(data);
  } catch (err) {
    return { success: false, message: "OTP data corrupted" };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    try { await redis.del(key); } catch (err) { console.error("Redis error (OTP del):", err.message); }
    return { success: false, message: "max attempts reached" };
  }

  const match = await bcrypt.compare(otp, stored.hash);

  if (match) {
    try {
      await redis.del(key);
      // valid for 10m registration window
      await redis.set(`v:${mobile}`, "1", "EX", 600);
    } catch (err) {
      console.error("Redis error (OTP cleanup):", err.message);
    }
    return { success: true };
  } else {
    stored.attempts += 1;
    try {
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        await redis.set(key, JSON.stringify(stored), "EX", ttl);
      }
    } catch (err) {
      console.error("Redis error (OTP update attempts):", err.message);
    }
    return { success: false, message: "wrong otp" };
  }
};

const isMobileVerified = async (mobile) => {
  const val = await redis.get(`v:${mobile}`);
  return val === "1";
};

module.exports = {
  sendOtp,
  verifyOtp,
  isMobileVerified
};
