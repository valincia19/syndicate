/**
 * Redis Configuration - Upstash Redis REST
 * Provides distributed caching and rate limiting support
 */

const { Redis } = require('@upstash/redis');
const env = require('./env');
const logger = require('./logger');

let redis = null;

/**
 * Initialize Redis connection using Upstash REST API
 */
const connectRedis = async () => {
  if (!env.redis.url || !env.redis.token) {
    logger.warn('Redis', 'Redis not configured. Rate limiting will use in-memory fallback.');
    return null;
  }

  try {
    redis = new Redis({
      url: env.redis.url,
      token: env.redis.token,
      automaticDeserialization: true,
    });

    // Test connection with a ping
    const pong = await redis.ping();
    logger.info('Redis', 'Redis connected (Upstash REST)', { pong });
    return redis;
  } catch (error) {
    logger.error('Redis', 'Redis connection failed', { error: error.message });
    logger.warn('Redis', 'Falling back to in-memory rate limiting');
    redis = null;
    return null;
  }
};

/**
 * Get Redis instance (returns null if not connected)
 */
const getRedis = () => redis;

/**
 * Gracefully disconnect Redis
 */
const disconnectRedis = async () => {
  if (redis) {
    logger.info('Redis', 'Redis disconnected');
    redis = null;
  }
};

module.exports = { connectRedis, getRedis, disconnectRedis };
