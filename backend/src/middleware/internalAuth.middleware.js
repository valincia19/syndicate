/**
 * Internal Auth Middleware
 *
 * Protects /v1/internal/* endpoints — only accessible from the bot service.
 * Uses a shared secret via X-Internal-Secret header.
 *
 * SECURITY:
 * - Never expose /v1/internal/* to public internet (use Nginx/Caddy rules if needed)
 * - Secret must be at least 32 characters and stored securely in .env
 * - Timing-safe comparison used to prevent timing attacks
 */

const crypto = require('crypto');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Middleware: authenticate internal bot-to-backend requests.
 * Expects: X-Internal-Secret: <INTERNAL_API_SECRET from .env>
 */
const internalAuth = (req, res, next) => {
  const providedSecret = req.headers['x-internal-secret'];

  if (!env.internalApiSecret) {
    logger.error('InternalAuth', 'INTERNAL_API_SECRET is not configured in environment');
    return res.status(503).json({
      status: 'error',
      statusCode: 503,
      message: 'Internal API not configured',
    });
  }

  if (!providedSecret) {
    logger.warn('InternalAuth', 'Missing X-Internal-Secret header', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedBuf = Buffer.from(env.internalApiSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');

  const isValid =
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!isValid) {
    logger.warn('InternalAuth', 'Invalid X-Internal-Secret', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: 'Forbidden',
    });
  }

  next();
};

module.exports = { internalAuth };
