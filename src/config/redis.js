const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

redis.on("error", (err) => console.error("redis error:", err));
redis.on("connect", () => console.log("redis connected"));

module.exports = redis;
