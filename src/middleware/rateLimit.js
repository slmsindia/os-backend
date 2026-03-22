const redis = require("../config/redis");

// rate limit: 1 request / 30s per mobile
const otpRateLimiter = async (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: "mobile required" });

  const key = `otp_limit:${mobile}`;
  const isLimited = await redis.get(key);

  if (isLimited) {
    return res.status(429).json({
      success: false,
      message: "wait 30s before resending"
    });
  }

  await redis.set(key, "1", "EX", 30);
  next();
};

module.exports = { otpRateLimiter };
