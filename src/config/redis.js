const Redis = require("ioredis");

const primaryOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying primary after 3 attempts
    return Math.min(times * 100, 3000);
  }
};

let redis = new Redis(primaryOptions);

redis.on("error", (err) => {
  if ((err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") && redis.options.host !== (process.env.LOCAL_REDIS_HOST || "127.0.0.1")) {
    console.log(`Primary Redis (${redis.options.host}) unavailable. Switching to local fallback...`);
    redis.disconnect();
    redis.options.host = process.env.LOCAL_REDIS_HOST || "127.0.0.1";
    redis.options.port = Number(process.env.LOCAL_REDIS_PORT) || 6379;
    redis.options.username = undefined;
    redis.options.password = undefined;
    redis.connect().catch(() => { });
  } else {
    console.error("redis error:", err);
  }
});

redis.on("connect", () => console.log(`redis connected to ${redis.options.host}`));

module.exports = redis;
