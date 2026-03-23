const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

redis.on("error", (err) => console.error("redis error:", err));
redis.on("connect", () => console.log("redis connected"));

module.exports = redis;
