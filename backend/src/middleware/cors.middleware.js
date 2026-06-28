/**
 * CORS Middleware Configuration
 * Restricts cross-origin requests to allowed origins only
 */

const cors = require('cors');
const env = require('../config/env');
const logger = require('../config/logger');

const corsOptions = {
  origin: (origin, callback) => {
    // If no Origin header (same-origin, server-to-server, curl, or standard browser GET navigation)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin by removing trailing slashes
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    // 1. Check exact match in allowedOrigins (normalized)
    const allowed = env.allowedOrigins.some(o => o.replace(/\/+$/, '') === normalizedOrigin);
    if (allowed) {
      return callback(null, true);
    }

    // 2. Dynamic subdomain check based on cookieDomain (e.g. .vinzhub.com)
    if (env.cookieDomain) {
      const cleanDomain = env.cookieDomain.startsWith('.') ? env.cookieDomain.slice(1) : env.cookieDomain;
      try {
        const url = new URL(normalizedOrigin);
        if (url.hostname === cleanDomain || url.hostname.endsWith('.' + cleanDomain)) {
          return callback(null, true);
        }
      } catch (e) {
        // ignore URL parse errors
      }
    }
    
    logger.warn('CORS', `Blocked request from origin: ${origin}`);
    callback(null, false);
  },
  credentials: true, // Allow cookies and authorization headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

module.exports = cors(corsOptions);
