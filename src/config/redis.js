const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
});

redis.on("error", (err) => {
  console.error("redis connection error:", err.message);
});

redis.on("connect", () => console.log(`redis connected to ${redis.options.host}`));

module.exports = redis;
