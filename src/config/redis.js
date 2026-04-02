const Redis = require("ioredis");

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });

redis.on("error", (err) => console.error("redis error:", err));
redis.on("connect", () => console.log("redis connected"));

module.exports = redis;
