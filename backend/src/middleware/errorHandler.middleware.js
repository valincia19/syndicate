/**
 * Global Error Handler Middleware
 * OWASP A09 - Security Logging and Monitoring
 * Stack traces NEVER exposed to client in any environment
 */

const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;
  const isOperational = !!err.isOperational;

  // Normalize known error types
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please login again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please login again.';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource not found';
  }

  // A09 - Log everything server-side, tapi jangan expose detail ke client
  const logFn = statusCode >= 500 ? logger.error : logger.warn;
  logFn('ErrorHandler', 'Request error', {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    isOperational,
    // Stack hanya di log server, TIDAK di response
    ...(statusCode >= 500 && { stack: err.stack }),
  });

  // A09 - User-facing message: untuk 5xx non-operational, generic message
  // Stack trace TIDAK PERNAH dikirim ke client
  const userMessage = (statusCode >= 500 && !isOperational)
    ? 'Something went wrong. Please try again later.'
    : message;

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: userMessage,
    // TIDAK ada field: stack, error, details, trace
  });
};

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

module.exports = { errorHandler, notFoundHandler, AppError };
