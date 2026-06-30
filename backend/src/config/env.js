/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

require('dotenv').config();

/**
 * Parse durasi human-readable ke detik.
 * Contoh: '30m' → 1800, '1h' → 3600, '24h' → 86400
 * @param {string} val
 * @returns {number} detik
 */
function parseExpiry(val) {
  if (!val || typeof val !== 'string') return 86400;
  const trimmed = val.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)(m|h|s|d)$/);
  if (!match) return 86400;
  const num = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default:  return 86400;
  }
}

const env = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173'],

  // Cookie Configuration for Production / Cross-Subdomain
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  cookieSameSite: process.env.COOKIE_SAME_SITE || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'valinc_syndicate',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  },

  // Redis (Local/Regular)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Discord OAuth2
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5000/v1/auth/discord/callback',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  // Internal Bot → Backend shared secret
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',

  // Cloudflare R2
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },

  // Tokopay Payment Gateway
  TOKOPAY_BASE_URL: process.env.TOKOPAY_BASE_URL || 'https://api.tokopay.id',
  TOKOPAY_MERCHANT_ID: process.env.TOKOPAY_MERCHANT_ID || '',
  TOKOPAY_SECRET_KEY: process.env.TOKOPAY_SECRET_KEY || '',
  /**
   * Durasi expired order dalam detik.
   * Dibaca dari TOKOPAY_ORDER_EXPIRY dengan format: 30m | 1h | 2h | 24h
   * Default: 86400 (24 jam)
   */
  TOKOPAY_ORDER_EXPIRY_SECONDS: parseExpiry(process.env.TOKOPAY_ORDER_EXPIRY || '24h'),

  // NOWPayments Payment Gateway
  NOWPAYMENTS_BASE_URL: process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io',
  NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY || '',
  NOWPAYMENTS_IPN_SECRET: process.env.NOWPAYMENTS_IPN_SECRET || '',
  // Cloudflare Turnstile
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || '',
    siteKey: process.env.TURNSTILE_SITE_KEY || '',
  },
  linkvertise: {
    antiBypassToken: process.env.LINKVERTISE_ANTI_BYPASS_TOKEN || '',
  },
  smtp: {
    host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAIL_PORT || '2525', 10),
    user: process.env.MAIL_USERNAME || '',
    pass: process.env.MAIL_PASSWORD || '',
    fromEmail: process.env.MAIL_FROM_ADDRESS || 'noreply@valincsyndicate.com',
    fromName: (process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_NAME !== '${APP_NAME}')
      ? process.env.MAIL_FROM_NAME
      : 'VALINC SYNDICATE',
  },
};

// Validate critical environment variables
const validateEnv = () => {
  // ── FATAL: JWT_SECRET must be set in all environments ───────────────────────
  if (!env.jwtSecret) {
    throw new Error('FATAL: JWT_SECRET is required. Set it in .env file. Using a default is a security risk.');
  }
  // Validate JWT secret length (minimum 32 bytes recommended for HS256)
  if (env.jwtSecret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long for security.');
  }

  // Lazy-require logger to avoid circular deps at module load
  const logger = require('./logger');

  if (!env.database.host || !env.database.password) {
    logger.warn('Env', 'Database not fully configured');
  }

  if (!env.redis.host) {
    logger.warn('Env', 'Redis not configured. Using in-memory fallback.');
  }

  if (!env.discord.clientId || !env.discord.clientSecret) {
    logger.warn('Env', 'Discord Client ID or Client Secret not set. Discord login will be disabled.');
  }

  if (!env.discord.botToken || !env.discord.guildId) {
    logger.warn('Env', 'DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set. Auto-join guild feature will be disabled.');
  }

  if (!env.internalApiSecret || env.internalApiSecret.length < 32) {
    logger.warn('Env', 'INTERNAL_API_SECRET not set or too short (<32 chars). Internal bot API will be disabled.');
  }

  if (!env.r2.endpoint || !env.r2.accessKeyId || !env.r2.secretAccessKey || !env.r2.bucketName) {
    logger.warn('Env', 'Cloudflare R2 not fully configured. Object storage features will be unavailable.');
  }

  if (!env.TOKOPAY_MERCHANT_ID || !env.TOKOPAY_SECRET_KEY) {
    logger.warn('Env', 'TOKOPAY_MERCHANT_ID or TOKOPAY_SECRET_KEY not set. Payment gateway will fail.');
  }

  if (!env.NOWPAYMENTS_API_KEY || !env.NOWPAYMENTS_IPN_SECRET) {
    logger.warn('Env', 'NOWPAYMENTS_API_KEY or NOWPAYMENTS_IPN_SECRET not set. Crypto payment gateway will fail.');
  }

  if (!env.turnstile.secretKey) {
    logger.warn('Env', 'TURNSTILE_SECRET_KEY not set. Turnstile server-side siteverify will fail if enabled.');
  }

  if (!env.smtp.user || !env.smtp.pass) {
    logger.warn('Env', 'SMTP credentials not fully configured. Email verification/delivery will be disabled.');
  }
};

validateEnv();

module.exports = env;
