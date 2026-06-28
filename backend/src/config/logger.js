/**
 * Structured Logger Configuration
 * Centralized logging with levels for all modules
 */

// Log levels with numeric values for filtering
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Color codes for console output (development only)
const COLORS = {
  error: '\x1b[31m',    // Red
  warn: '\x1b[33m',     // Yellow
  info: '\x1b[36m',     // Cyan
  debug: '\x1b[35m',    // Magenta
  reset: '\x1b[0m',     // Reset
};

const isProduction = process.env.NODE_ENV === 'production';
const currentLogLevel = LOG_LEVELS[isProduction ? 'warn' : 'debug'];

const formatTimestamp = () => new Date().toISOString();

const formatMessage = (level, module, message, data = null) => {
  const timestamp = formatTimestamp();

  if (isProduction) {
    // Production: JSON format for log aggregation
    return JSON.stringify({
      timestamp,
      level,
      module,
      message,
      ...(data && { data }),
    });
  }

  // Development: Pretty console output
  const color = COLORS[level] || COLORS.info;
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `${color}${prefix}${COLORS.reset} ${message}${dataStr}`;
};

module.exports = {
  error: (module, message, data) => {
    if (LOG_LEVELS.error <= currentLogLevel) {
      console.error(formatMessage('error', module, message, data));
    }
  },
  warn: (module, message, data) => {
    if (LOG_LEVELS.warn <= currentLogLevel) {
      console.warn(formatMessage('warn', module, message, data));
    }
  },
  info: (module, message, data) => {
    if (LOG_LEVELS.info <= currentLogLevel) {
      console.log(formatMessage('info', module, message, data));
    }
  },
  debug: (module, message, data) => {
    if (LOG_LEVELS.debug <= currentLogLevel) {
      console.log(formatMessage('debug', module, message, data));
    }
  },
};
