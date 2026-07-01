/**
 * HTTP Request Logging Middleware (Morgan + Winston integration)
 * Centralizes all web request tracking
 */

const morgan = require('morgan');
const logger = require('../config/logger');

// Custom morgan token to retrieve client IP (supporting reverse proxies like Cloudflare/Nginx)
morgan.token('client-ip', (req) => {
  let ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return ip;
});

const isProduction = process.env.NODE_ENV === 'production';

let requestLogger;

if (isProduction) {
  // Production: Log requests as a structured JSON object (under context 'HTTPServer')
  requestLogger = morgan((tokens, req, res) => {
    const logData = {
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: parseInt(tokens.status(req, res) || '500', 10),
      responseTime: parseFloat(tokens['response-time'](req, res) || '0'),
      ip: tokens['client-ip'](req),
      userAgent: tokens['user-agent'](req),
    };

    logger.info('HTTPServer', 'HTTP Request', logData);
    return null; // Morgan expects a string to write to stream; returning null prevents writing to default stdout
  });
} else {
  // Development: Rich readable colorized console formatting
  // Format: [HTTPServer] INFO: GET /api/v1/users 200 - 45ms
  requestLogger = morgan((tokens, req, res) => {
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const status = tokens.status(req, res);
    const responseTime = tokens['response-time'](req, res);
    const message = `${method} ${url} ${status} - ${responseTime}ms`;
    
    logger.info('HTTPServer', message);
    return null; // Return null to skip writing duplicate messages to process.stdout
  });
}

module.exports = requestLogger;
