/**
 * Security Headers Middleware
 * OWASP Top 10 compliant — A01/A02/A03/A05
 */

const env = require('../config/env');

const securityHeaders = (req, res, next) => {
  // A05 - Remove server fingerprinting
  res.removeHeader('X-Powered-By');

  // A05 - Clickjacking prevention
  res.setHeader('X-Frame-Options', 'DENY');

  // A05 - MIME sniffing prevention
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // A03 - XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // A01 - Referrer leak prevention
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // A05 - Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

  // A05 - HSTS: deteksi production via COOKIE_DOMAIN juga (tidak hanya NODE_ENV)
  const isProduction = env.nodeEnv === 'production' || !!(env.cookieDomain && !env.cookieDomain.includes('localhost'));
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // A02 - Cache-Control: sensitive endpoints tidak boleh di-cache browser/proxy
  const sensitivePrefixes = ['/v1/auth', '/v1/admin', '/v1/licenses', '/v1/payment', '/v1/hwid'];
  if (sensitivePrefixes.some(p => req.path.startsWith(p))) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // A03 - CSP hanya untuk HTML responses, tidak untuk JSON API
  if (req.accepts('html')) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://cdn.discordapp.com https://cdn.vinzhub.com",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
  }

  next();
};

module.exports = securityHeaders;
