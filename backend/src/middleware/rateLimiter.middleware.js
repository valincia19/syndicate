/**
 * Rate Limiting Middleware (Redis-backed + In-Memory Fallback)
 * OWASP A04 - Insecure Design prevention
 *
 * Strategy: Atomic INCR + EXPIRE (tidak ada race condition)
 * - INCR buat key baru otomatis dengan value 1
 * - EXPIRE di-set hanya pada request pertama (count === 1)
 * - Tidak perlu GET dulu → tidak ada TOCTOU race condition
 */

const env = require('../config/env');
const { getRedis } = require('../config/redis');
const logger = require('../config/logger');

// Helper to get clean client IP (prioritizes Cloudflare and reverse proxy headers)
const getClientIp = (req) => {
  if (!req) return 'unknown';
  let ip = req.headers['cf-connecting-ip'] || 
           req.headers['x-real-ip'] || 
           req.ip || 
           (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
           req.socket?.remoteAddress || 
           'unknown';
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return ip;
};

// ============================================================
// IN-MEMORY FALLBACK
// ============================================================
const memoryStore = new Map();

const checkMemoryRate = (identifier, windowMs = env.rateLimit.windowMs, max = env.rateLimit.maxRequests) => {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    memoryStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  record.count++;
  if (record.count > max) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  return { allowed: true, remaining: max - record.count };
};

// Cleanup stale in-memory records setiap jam
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of memoryStore.entries()) {
    if (now > record.resetTime) memoryStore.delete(id);
  }
}, 60 * 60 * 1000);

// ============================================================
// REDIS RATE LIMITER — ATOMIC (no race condition)
// ============================================================
/**
 * Gunakan INCR + EXPIRE yang fully atomic:
 * - INCR: jika key tidak ada, Redis buat dengan value 1 (atomic)
 * - EXPIRE: set TTL hanya pada first request (count === 1)
 * - Tidak ada GET dulu → tidak ada TOCTOU race
 */
const checkRedisRate = async (key, windowSeconds, max) => {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const count = await redis.incr(key);

    // Set expiry hanya pada request pertama — atomic dengan INCR
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > max) {
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : windowSeconds;
      return { allowed: false, retryAfter, remaining: 0 };
    }

    return { allowed: true, remaining: max - count };
  } catch (error) {
    logger.warn('RateLimiter', 'Redis error, falling back to memory', { error: error.message });
    return null;
  }
};

// ============================================================
// MAIN MIDDLEWARE (global rate limit)
// ============================================================
const rateLimiter = async (req, res, next) => {
  const identifier = getClientIp(req);
  const windowSeconds = Math.ceil(env.rateLimit.windowMs / 1000);
  const max = env.rateLimit.maxRequests;
  const key = `ratelimit:global:${identifier}`;

  let result = await checkRedisRate(key, windowSeconds, max);
  let source = 'redis';

  if (!result) {
    result = checkMemoryRate(`global:${identifier}`);
    source = 'memory';
  }

  res.set('X-RateLimit-Limit', max);
  if (result.remaining !== undefined) {
    res.set('X-RateLimit-Remaining', Math.max(0, result.remaining));
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

// ============================================================
// FACTORY — custom rate limiter per endpoint
// ============================================================
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 60;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const name = options.name || 'custom';

  return async (req, res, next) => {
    const identifier = getClientIp(req);
    const key = `ratelimit:${name}:${identifier}`;

    let result = await checkRedisRate(key, windowSeconds, max);

    if (!result) {
      result = checkMemoryRate(`${name}:${identifier}`, windowMs, max);
    }

    if (!result.allowed) {
      return res.status(429).json({
        status: 'error',
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: `${result.retryAfter} seconds`,
      });
    }

    next();
  };
};

// Auth: 10 attempts per 15 menit (anti-bruteforce A07)
const authRateLimiter = createRateLimiter({
  name: 'auth_bruteforce',
  windowMs: 15 * 60 * 1000,
  max: 10,
});

// WebSocket upgrade: 100 connections per menit per IP
const checkWsUpgradeRate = async (ip) => {
  const key = `ratelimit:ws_upgrade:${ip}`;
  const result = await checkRedisRate(key, 60, 100);
  if (result) return result;
  return checkMemoryRate(`ws_upgrade:${ip}`, 60 * 1000, 100);
};

module.exports = rateLimiter;
module.exports.createRateLimiter = createRateLimiter;
module.exports.authRateLimiter = authRateLimiter;
module.exports.checkWsUpgradeRate = checkWsUpgradeRate;
