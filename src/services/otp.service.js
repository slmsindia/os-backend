const bcrypt = require("bcrypt");
const redis = require("../config/redis");
const { generateOtp } = require("../utils/otp");
const { sendOtpSMS } = require("./sms.service");

const OTP_EXPIRY = 600; // 10 minutes
const MAX_ATTEMPTS = 3;

const sendOtp = async (mobile) => {
  const code = generateOtp();
  const hash = await bcrypt.hash(code, 10);

  const key = `otp:${mobile}`;
  // store hash + tries
  await redis.set(key, JSON.stringify({
    hash,
    attempts: 0
  }), "EX", OTP_EXPIRY);

  return await sendOtpSMS(mobile, code);
};

const verifyOtp = async (mobile, otp) => {
  const key = `otp:${mobile}`;
  const data = await redis.get(key);

  if (!data) return { success: false, message: "expired" };

  const stored = JSON.parse(data);

  if (stored.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return { success: false, message: "max attempts reached" };
  }

  const match = await bcrypt.compare(otp, stored.hash);

  if (match) {
    await redis.del(key);
    // valid for 10m registration window
    await redis.set(`v:${mobile}`, "1", "EX", 600);
    return { success: true };
  } else {
    stored.attempts += 1;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.set(key, JSON.stringify(stored), "EX", ttl);
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
