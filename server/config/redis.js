import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient;
let useInMemory = false;
const inMemoryStore = new Map();

try {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => {
    if (!useInMemory) {
      logger.warn('Redis unavailable, falling back to in-memory blacklist');
      useInMemory = true;
    }
  });
  await redisClient.connect();
  logger.info('Redis connected successfully');
} catch (err) {
  logger.warn('Redis connection failed, using in-memory blacklist fallback');
  useInMemory = true;
}

// Unified interface that works with both Redis and in-memory fallback
const redisService = {
  async get(key) {
    if (useInMemory) {
      const item = inMemoryStore.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        inMemoryStore.delete(key);
        return null;
      }
      return item.value;
    }
    try {
      return await redisClient.get(key);
    } catch {
      return null;
    }
  },

  async setEx(key, ttlSeconds, value) {
    if (useInMemory) {
      inMemoryStore.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    try {
      await redisClient.setEx(key, ttlSeconds, value);
    } catch {
      // Fallback to in-memory if Redis call fails
      inMemoryStore.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      });
    }
  },
};

export default redisService;
