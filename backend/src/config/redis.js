/**
 * Redis Configuration - standard local Redis (ioredis)
 * Provides distributed caching and rate limiting support
 */

const Redis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

let redisClient = null;
let redisWrapper = null;

/**
 * Initialize Redis connection using standard client (ioredis)
 */
const connectRedis = async () => {
  if (!env.redis.host) {
    logger.warn('Redis', 'Redis host not configured. Rate limiting will use in-memory fallback.');
    return null;
  }

  try {
    const config = {
      host: env.redis.host,
      port: env.redis.port,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    };
    if (env.redis.password) {
      config.password = env.redis.password;
    }

    redisClient = new Redis(config);

    redisClient.on('error', (err) => {
      logger.error('Redis', 'Redis error event', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis', 'Redis connection established');
    });

    // Test connection with a ping
    const pong = await redisClient.ping();
    logger.info('Redis', 'Redis connected', { pong });

    // Upstash-compatible wrapper client
    redisWrapper = {
      async get(key) {
        const val = await redisClient.get(key);
        if (val === null || val === undefined) return null;
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      },

      async set(key, value, options = {}) {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const args = [key, serializedValue];

        if (options.ex || options.EX) {
          args.push('EX', options.ex || options.EX);
        }
        if (options.nx || options.NX) {
          args.push('NX');
        }

        return redisClient.set(...args);
      },

      async del(...keys) {
        if (keys.length === 0) return 0;
        // ioredis supports arrays or multiple arguments for del
        return redisClient.del(...keys);
      },

      async keys(pattern) {
        return redisClient.keys(pattern);
      },

      async incr(key) {
        return redisClient.incr(key);
      },

      async ttl(key) {
        return redisClient.ttl(key);
      },

      async ping() {
        return redisClient.ping();
      }
    };

    return redisWrapper;
  } catch (error) {
    logger.error('Redis', 'Redis connection failed', { error: error.message });
    logger.warn('Redis', 'Falling back to in-memory rate limiting');
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch (e) {
        // Ignore
      }
    }
    redisClient = null;
    redisWrapper = null;
    return null;
  }
};

/**
 * Get Redis instance (returns null if not connected)
 */
const getRedis = () => redisWrapper;

/**
 * Gracefully disconnect Redis
 */
const disconnectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {
      // Ignore
    }
    logger.info('Redis', 'Redis disconnected');
    redisClient = null;
    redisWrapper = null;
  }
};

module.exports = { connectRedis, getRedis, disconnectRedis };
