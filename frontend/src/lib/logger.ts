/**
 * Centralized Global Client-Side Logger Service
 * Tiered verbosity levels: DEBUG (0), INFO (1), WARN (2), ERROR (3), OFF (4)
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF'

const LOG_WEIGHTS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  OFF: 4,
}

// Parse log level from environment
function parseLogLevel(): LogLevel {
  if (typeof window === 'undefined') return 'OFF'
  const envLevel = 'INFO'
  return (Object.keys(LOG_WEIGHTS).includes(envLevel) ? envLevel : 'INFO') as LogLevel
}

const currentLevel = parseLogLevel()
const currentWeight = LOG_WEIGHTS[currentLevel]

// Timestamp utility
function getTimestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12)
}

// Styled console output
function formatLog(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const weight = LOG_WEIGHTS[level]
  if (weight < currentWeight) return

  const colors: Record<LogLevel, string> = {
    DEBUG: 'color: #64748b; font-weight: 600',
    INFO: 'color: #3b82f6; font-weight: 600',
    WARN: 'color: #f59e0b; font-weight: 600',
    ERROR: 'color: #ef4444; font-weight: 600',
    OFF: 'color: #999',
  }

  const timestamp = getTimestamp()
  const prefix = `%c[${timestamp}] [${level}:${tag}]`

  if (data !== undefined) {
    console.log(prefix, colors[level], message, data)
  } else {
    console.log(prefix, colors[level], message)
  }
}

export const logger = {
  debug: (tag: string, message: string, data?: unknown) =>
    formatLog('DEBUG', tag, message, data),
  info: (tag: string, message: string, data?: unknown) =>
    formatLog('INFO', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) =>
    formatLog('WARN', tag, message, data),
  error: (tag: string, message: string, data?: unknown) =>
    formatLog('ERROR', tag, message, data),
}
