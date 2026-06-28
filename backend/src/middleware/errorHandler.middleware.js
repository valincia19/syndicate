/**
 * Global Error Handler Middleware
 * Centralized error handling for all routes
 */

const env = require('../config/env');
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
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token. Please login again.';
    error.statusCode = 401;
    error.isOperational = true;
  }
  
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired. Please login again.';
    error.statusCode = 401;
    error.isOperational = true;
  }
  
  // Validation Errors
  if (err.name === 'ValidationError') {
    error.message = 'Invalid input data';
    error.statusCode = 400;
    error.isOperational = true;
  }

  const isOperational = !!(err.isOperational || error.isOperational);

  // Log error for debugging - 4xx are expected client errors (warn), 5xx are real errors
  // Only include stack traces for 5xx errors; 4xx stack traces are noise.
  const logFn = error.statusCode >= 500 ? logger.error : logger.warn;
  logFn('ErrorHandler', 'Request error', {
    message: err.message || error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    isOperational,
    ...(error.statusCode >= 500 && { stack: err.stack }),
  });
  
  // Determine user-facing error message
  let userMessage = error.message;
  if (env.nodeEnv === 'production' && !isOperational) {
    userMessage = 'Something went wrong. Please try again later.';
  }
  
  // Send standardized error response (clean/rapih — no stack trace in body)
  res.status(error.statusCode).json({
    status: 'error',
    statusCode: error.statusCode,
    message: userMessage,
  });
};

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = { errorHandler, notFoundHandler, AppError };
