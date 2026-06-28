/**
 * Auth Routes
 * Defines authentication endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

// ── Endpoint-Specific Rate Limiter for Sensitive Operations ──────────────────
const verificationRateLimiter = async (req, res, next) => {
  const identifier = `verify:${req.ip}:${req.user?.id || 'anon'}`;
  const { getRedis } = require('../../config/redis');
  const redis = getRedis();
  
  // Fallback to global limiter if Redis unavailable
  if (!redis) return next();
  
  const key = `ratelimit:${identifier}`;
  const windowSeconds = 600; // 10 minutes
  const maxAttempts = 3;
  
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSeconds);
    
    if (current > maxAttempts) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        status: 'error',
        statusCode: 429,
        message: 'Too many verification attempts. Please try again later.',
        retryAfter: `${ttl} seconds`,
      });
    }
    next();
  } catch (error) {
    next(); // Fail open on Redis errors
  }
};

const validate = require('../../middleware/validate.middleware');
const { authRateLimiter } = require('../../middleware/rateLimiter.middleware');
const { registerSchema, loginSchema, verifyEmailSchema } = require('./auth.schema');

// Public routes (protected with aggressive anti-bruteforce rate limiting)
router.post('/register', authRateLimiter, validate(registerSchema, 'body'), authController.register.bind(authController));
router.post('/login', authRateLimiter, validate(loginSchema, 'body'), authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/discord', authController.discordRedirect.bind(authController));
router.get('/discord/callback', authController.discordCallback.bind(authController));

// Protected routes (require authentication)
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));
router.post('/send-verification', authenticateToken, verificationRateLimiter, authController.sendVerification.bind(authController));
router.post('/verify-email', authenticateToken, verificationRateLimiter, validate(verifyEmailSchema, 'body'), authController.verifyEmail.bind(authController));

module.exports = router;
