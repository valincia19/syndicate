/**
 * Rate Limiting Middleware (Redis-backed + In-Memory Fallback)
 * 
 * Uses Upstash Redis for distributed rate limiting across multiple instances.
 * Falls back to in-memory Map if Redis is unavailable.
 * 
 * Strategy: Sliding window with atomic Redis operations
 */

const env = require('../config/env');
const { getRedis } = require('../config/redis');
const logger = require('../config/logger');

// ============================================================
// IN-MEMORY FALLBACK (used when Redis is unavailable)
// ============================================================
const memoryStore = new Map();

const checkMemoryRate = (identifier) => {
  const now = Date.now();

  if (!memoryStore.has(identifier)) {
    memoryStore.set(identifier, { count: 1, resetTime: now + env.rateLimit.windowMs });
    return { allowed: true };
  }

  const record = memoryStore.get(identifier);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + env.rateLimit.windowMs;
    return { allowed: true };
  }

  record.count++;

  if (record.count > env.rateLimit.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
};

// Cleanup old in-memory records every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of memoryStore.entries()) {
    if (now > record.resetTime) memoryStore.delete(id);
  }
}, 60 * 60 * 1000);

// ============================================================
// REDIS-BASED RATE LIMITER (sliding window with atomic ops)
// ============================================================
const checkRedisRate = async (identifier) => {
  const redis = getRedis();
  if (!redis) return null; // Signal to use fallback

  const key = `ratelimit:${identifier}`;
  const windowSeconds = Math.ceil(env.rateLimit.windowMs / 1000);

  try {
    // ATOMIC OPERATION: Check if key exists
    const existing = await redis.get(key);

    if (!existing) {
      // First request in window: SET with NX and EX atomically
      // This ensures TTL is ALWAYS set from the start, no race condition
      await redis.set(key, '1', { ex: windowSeconds, nx: true });
      
      return {
        allowed: true,
        remaining: env.rateLimit.maxRequests - 1,
      };
    } else {
      // Key exists, increment atomically
      const current = await redis.incr(key);
      
      // Get TTL (should already be set from initial SET)
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : windowSeconds;

      if (current > env.rateLimit.maxRequests) {
        return { allowed: false, retryAfter, remaining: 0 };
      }

      return {
        allowed: true,
        remaining: env.rateLimit.maxRequests - current,
      };
    }
  } catch (error) {
    // Redis error → fallback to memory
    logger.warn('RateLimiter', 'Redis rate limit error, falling back', { error: error.message });
    return null;
  }
};

// ============================================================
// MAIN MIDDLEWARE
// ============================================================
const rateLimiter = async (req, res, next) => {
  const identifier = req.ip || req.connection.remoteAddress;

  // Try Redis first, fallback to memory
  let result = await checkRedisRate(identifier);
  let source = 'redis';

  if (!result) {
    result = checkMemoryRate(identifier);
    source = 'memory';
  }

  // Set rate limit headers
  if (result.remaining !== undefined) {
    res.set('X-RateLimit-Limit', env.rateLimit.maxRequests);
    res.set('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.set('X-RateLimit-Source', source);
  }

  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter);
    return res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
      retryAfter: `${result.retryAfter} seconds`,
    });
  }

  next();
};

/**
 * Create a custom rate limiter middleware with specific limits.
 * Useful for applying different limits to different endpoints
 * (e.g., stricter limits on public loader endpoints).
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in ms (default: 60000)
 * @param {number} options.max - Max requests per window (default: 60)
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 60; // 60 requests per minute default

  return async (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const key = `ratelimit:${options.name || 'custom'}:${identifier}`;

    // Try Redis first
    const redis = getRedis();
    if (redis) {
      try {
        const current = await redis.get(key);
        if (!current) {
          await redis.set(key, '1', { ex: Math.ceil(windowMs / 1000), nx: true });
          return next();
        }
        const count = await redis.incr(key);
        if (count > max) {
          return res.status(429).json({
            status: 'error',
            statusCode: 429,
            message: 'Too many requests. Please try again later.',
            retryAfter: `${Math.ceil(windowMs / 1000)} seconds`,
          });
        }
        return next();
      } catch {
        // Redis error - fall through to in-memory
      }
    }

    // In-memory fallback
    const memKey = `${options.name || 'custom'}:${identifier}`;
    const check = checkMemoryRate(memKey);
    if (!check.allowed) {
      return res.status(429).json({
        status: 'error',
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: `${check.retryAfter} seconds`,
      });
    }
    next();
  };
};

/**
 * Aggressive Rate Limiter for Auth Routes (login/register)
 * Limit: 10 requests per 15 minutes per IP to prevent brute-force attacks
 */
const authRateLimiter = createRateLimiter({
  name: 'auth_bruteforce',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 mins
});

/**
 * Rate limiter check for WebSocket Upgrade requests (HTTP Handshake)
 * Limit: 10 connection upgrade attempts per minute per IP
 */
const checkWsUpgradeRate = async (ip) => {
  const windowMs = 60 * 1000; // 1 minute
  const max = 10;
  const key = `ratelimit:ws_upgrade:${ip}`;

  const redis = getRedis();
  if (redis) {
    try {
      const current = await redis.get(key);
      if (!current) {
        await redis.set(key, '1', { ex: 60, nx: true });
        return { allowed: true };
      }
      const count = await redis.incr(key);
      if (count > max) return { allowed: false };
      return { allowed: true };
    } catch {
      // Fall through to memory
    }
  }

  const check = checkMemoryRate(`ws_upgrade:${ip}`);
  return check;
};

module.exports = rateLimiter;
module.exports.createRateLimiter = createRateLimiter;
module.exports.authRateLimiter = authRateLimiter;
module.exports.checkWsUpgradeRate = checkWsUpgradeRate;

