/**
 * Structured Logger Configuration (Winston-based)
 * Centralized logging with levels for all modules
 */

const winston = require('winston');

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

// Color codes for console output levels
const COLORS = {
  error: '\x1b[31m',    // Red
  warn: '\x1b[33m',     // Yellow
  info: '\x1b[36m',     // Cyan
  debug: '\x1b[35m',    // Magenta
  reset: '\x1b[0m',     // Reset
};

// Custom format for dev console output: [Timestamp] [LEVEL] [Module] message {metadata}
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const rawLevel = level.toLowerCase();
    const color = COLORS[rawLevel] || COLORS.info;
    const formattedLevel = level.toUpperCase();
    
    const ctx = context ? ` [${context}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    
    return `${color}[${timestamp}] [${formattedLevel}]${ctx}${COLORS.reset} ${message}${metaStr}`;
  })
);

// Custom format for production JSON logging
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const winstonLogger = winston.createLogger({
  level: logLevel,
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      // Winston's built-in colorize can interfere with our custom format structure,
      // so we use our custom ANSI coloring wrapper inside the devFormat printf function.
      stderrLevels: ['error'],
    })
  ]
});

// Helper wrappers to match existing logger API: logger.info(module, message, data)
module.exports = {
  error: (module, message, data) => {
    winstonLogger.error(message, { context: module, ...data });
  },
  warn: (module, message, data) => {
    winstonLogger.warn(message, { context: module, ...data });
  },
  info: (module, message, data) => {
    winstonLogger.info(message, { context: module, ...data });
  },
  debug: (module, message, data) => {
    winstonLogger.debug(message, { context: module, ...data });
  },
  // Export direct winston logger instance if needed for streaming
  winstonLogger
};
