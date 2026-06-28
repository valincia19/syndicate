/**
 * Security Headers Middleware
 * Implements OWASP security best practices
 */

const securityHeaders = (req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy - only applies to HTML responses
  // (CSP is browser-enforced; JSON/SQL/etc don't honor it)
  if (req.accepts('html')) {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = securityHeaders;
