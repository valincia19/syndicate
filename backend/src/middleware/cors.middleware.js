/**
 * CORS Middleware Configuration
 * Restricts cross-origin requests to allowed origins only
 */

const cors = require('cors');
const env = require('../config/env');

const corsOptions = {
  origin: (origin, callback) => {
    // If no Origin header (same-origin, server-to-server, or standard browser GET navigation like OAuth links)
    if (!origin) {
      return callback(null, true);
    }
    
    if (env.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

module.exports = cors(corsOptions);
