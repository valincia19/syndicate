const { getRedis } = require('../config/redis');
const logger = require('../config/logger');

// In-memory fallback cache store for high resilience
const memoryCache = new Map();

// Cleanup expired in-memory cache keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt && now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

class CacheUtility {
  /**
   * Get value from cache (Redis or in-memory fallback)
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    const redis = getRedis();
    if (redis) {
      try {
        const val = await redis.get(key);
        if (val !== null && val !== undefined) return val;
      } catch (err) {
        logger.warn('Cache', `Redis get error for key ${key}, falling back to memory`, { error: err.message });
      }
    }

    const item = memoryCache.get(key);
    if (item) {
      if (item.expiresAt && Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
      }
      return item.value;
    }
    return null;
  }

  /**
   * Set value in cache with explicit TTL in seconds
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 300) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(key, value, { ex: ttlSeconds });
      } catch (err) {
        logger.warn('Cache', `Redis set error for key ${key}, falling back to memory`, { error: err.message });
      }
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Delete specific key from cache
   * @param {string} key
   */
  async del(key) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(key);
      } catch (err) {
        logger.warn('Cache', `Redis del error for key ${key}`, { error: err.message });
      }
    }
    memoryCache.delete(key);
  }

  /**
   * Delete keys matching prefix (Cache-Aside invalidation)
   * @param {string} prefix
   */
  async delPrefix(prefix) {
    const redis = getRedis();
    if (redis) {
      try {
        const keys = await redis.keys(`${prefix}*`);
        if (keys && keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        logger.warn('Cache', `Redis delPrefix error for ${prefix}`, { error: err.message });
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * Cache-Aside Wrapper: Get from cache, or execute fetchFn, cache result with TTL, and return.
   * @param {string} key
   * @param {Function} fetchFn
   * @param {number} ttlSeconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

module.exports = new CacheUtility();
