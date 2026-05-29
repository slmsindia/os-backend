<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
const memoryStorage = new Map();
const mockRedis = {
  get: async (key) => memoryStorage.get(key),
  set: async (key, value, mode, duration) => {
    memoryStorage.set(key, value);
    if (mode === "EX" && duration) {
      setTimeout(() => memoryStorage.delete(key), duration * 1000);
    }
    return "OK";
  },
  del: async (key) => memoryStorage.delete(key),
  ttl: async (key) => 600,
  on: () => {},
  off: () => {},
  options: { host: "mock-memory" }
};

const redis = mockRedis;

module.exports = redis;


module.exports = redis;

<<<<<<< HEAD
=======
const Redis = require("ioredis");

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });

redis.on("error", (err) => {
  console.error("redis connection error:", err.message);
});

redis.on("connect", () => console.log(`redis connected to ${redis.options.host}`));

module.exports = redis;
>>>>>>> main
=======
>>>>>>> origin/main
