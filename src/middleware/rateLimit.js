const redis = require("../config/redis");

// 30s limit per mobile/IP
const otpRateLimiter = async (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: "mobile required" });

  const ip = req.ip || req.get("x-forwarded-for") || "unknown";
  const mobileKey = `otp_limit:mobile:${mobile}`;
  const ipKey = `otp_limit:ip:${ip}`;

  const isMobileLimited = await redis.get(mobileKey);
  const isIpLimited = await redis.get(ipKey);

  if (isMobileLimited || isIpLimited) {
    return res.status(429).json({
      success: false,
      message: "Resend timeout. Please wait 30s."
    });
  }

  await redis.set(mobileKey, "1", "EX", 30);
  await redis.set(ipKey, "1", "EX", 30);
  next();
};

module.exports = { otpRateLimiter };
