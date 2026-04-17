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

