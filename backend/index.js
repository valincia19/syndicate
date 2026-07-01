/** 
 * Main Entry Point - Express.js Backend API
 * VALINCIA SYNDICATE Backend Boilerplate
 *
 * Modular, scalable, and secure REST API with:
 * - PostgreSQL (node-postgres connection pool)
 * - Upstash Redis (distributed rate limiting)
 * - JWT Authentication (bcrypt + jsonwebtoken)
 * - OWASP Security Headers
 * - WebSocket (real-time chat via ws library)
 */

const express = require('express');
const http = require('http');
const env = require('./src/config/env');
const db = require('./src/config/database');
const { connectRedis, disconnectRedis } = require('./src/config/redis');
const logger = require('./src/config/logger');
const UserModel = require('./src/modules/auth/auth.model');
const TicketModel = require('./src/modules/tickets/tickets.model');
const LicenseModel = require('./src/modules/licenses/licenses.model');
const RedeemModel = require('./src/modules/redeem/redeem.model');
const HwidModel = require('./src/modules/hwid/hwid.model');
const ScriptModel = require('./src/modules/scripts/scripts.model');
const ReleaseModel = require('./src/modules/releases/releases.model');
const ExecutionModel = require('./src/modules/executions/executions.model');
const PaymentTransactionModel = require('./src/modules/payment/payment-transactions.model');
const CurrencyModel = require('./src/modules/currency/currency.model');
const VoucherModel = require('./src/modules/vouchers/vouchers.model');
const ChangelogModel = require('./src/modules/changelogs/changelogs.model');
const ActivityModel = require('./src/modules/activity/activity.model');

// Middleware imports
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityHeaders = require('./src/middleware/security.middleware');
const rateLimiter = require('./src/middleware/rateLimiter.middleware');
const { createRateLimiter } = require('./src/middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler.middleware');
const { internalAuth } = require('./src/middleware/internalAuth.middleware');
const cookieParser = require('cookie-parser');
const requestLogger = require('./src/middleware/requestLogger.middleware');

// Route imports
const authRoutes = require('./src/modules/auth/auth.routes');
const ticketRoutes = require('./src/modules/tickets/tickets.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');
const licenseRoutes = require('./src/modules/licenses/licenses.routes');
const redeemRoutes = require('./src/modules/redeem/redeem.routes');
const hwidRoutes = require('./src/modules/hwid/hwid.routes');
const scriptsRoutes = require('./src/modules/scripts/scripts.routes');
const releaseRoutes = require('./src/modules/releases/releases.routes');
const releaseController = require('./src/modules/releases/releases.controller');
const paymentRoutes = require('./src/modules/payment/payment.routes');
const currencyRoutes = require('./src/modules/currency/currency.routes');
const voucherRoutes = require('./src/modules/vouchers/vouchers.routes');
const changelogRoutes = require('./src/modules/changelogs/changelogs.routes');
const activityRoutes = require('./src/modules/activity/activity.routes');
const keyauthRoutes = require('./src/modules/keyauth/keyauth.routes');

// WebSocket
const { setupWebSocket } = require('./src/config/websocket');

// Initialize Express app
const app = express();

// Intercept app.use to record mounting paths on router layers (required for dynamic route printing in Express 5)
const originalUse = app.use;
app.use = function (path, ...fns) {
  if (typeof path === 'string') {
    fns.forEach(fn => {
      if (fn && typeof fn === 'function' && fn.stack) {
        fn._mountPath = path;
      }
    });
  }
  return originalUse.apply(this, arguments);
};

// Create HTTP server (required for WebSocket upgrade)
const server = http.createServer(app);

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Helper to get clean client IP (trusts req.ip parsed via Express 'trust proxy' setting, falls back to cf-connecting-ip)
function getClientIp(req) {
  if (!req) return 'unknown';
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  let ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return ip;
}

// ============================================================
// GLOBAL MIDDLEWARE STACK
// ============================================================
// Silently swallow legacy script heartbeat requests to keep logs clean
app.use((req, res, next) => {
  if (req.path === '/heartbeat' || (req.originalUrl && req.originalUrl.includes('heartbeat'))) {
    return res.status(200).send();
  }
  next();
});

app.use(requestLogger);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(rateLimiter);

// ============================================================
// ROOT ENDPOINT & HEALTH CHECK
// ============================================================
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    statusCode: 200,
    message: 'VALINCIA SYNDICATE Backend API is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
});

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const pool = db.getPool();
    const result = await pool.query('SELECT 1 AS ok');
    dbStatus = result.rows[0].ok === 1 ? 'connected' : 'error';
  } catch (e) {
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'success',
    statusCode: 200,
    message: 'Server is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      database: dbStatus,
      redis: !!require('./src/config/redis').getRedis(),
    },
  });
});

// ============================================================
// API ROUTES (Modular Structure)
// ============================================================
// Public endpoints (no auth, rate-limited)
app.get('/v1/releases/public', createRateLimiter({ name: 'releases_public', windowMs: 60 * 1000, max: 30 }), releaseController.listPublic.bind(releaseController));
app.get('/v1/releases/game-info/:gameId', createRateLimiter({ name: 'game_info', windowMs: 60 * 1000, max: 20 }), releaseController.gameInfo.bind(releaseController));
// Stage 2: Authenticated secure delivery (must be registered before wildcard /:prefix)
app.get('/v1/releases/secure-load/:prefix', createRateLimiter({ name: 'secure_loader', windowMs: 60 * 1000, max: 30 }), releaseController.secureLoader.bind(releaseController));
// Stage 1: Gatekeeper bootstrap generator (public loader)
app.get('/v1/releases/:prefix', createRateLimiter({ name: 'loader', windowMs: 60 * 1000, max: 60 }), releaseController.loader.bind(releaseController));
// Also support singular /v1/release/:prefix for loader
app.get('/v1/release/:prefix', createRateLimiter({ name: 'loader', windowMs: 60 * 1000, max: 60 }), releaseController.loader.bind(releaseController));

// Public executions stats (disabled — executionController import pending feature completion)
// app.get('/v1/executions/stats', executionController.stats.bind(executionController));

// Public free key — no auth required, rate-limited to 3 claims per IP per hour
const licenseController = require('./src/modules/licenses/licenses.controller');
app.post('/v1/licenses/free', createRateLimiter({ name: 'free_key', windowMs: 60 * 60 * 1000, max: 3 }), licenseController.freeKey.bind(licenseController));

// Endpoint to create a new verification session with Redis TTL (15 min)
app.post('/v1/bypass/session', createRateLimiter({ name: 'bypass_session', windowMs: 60 * 1000, max: 10 }), async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Verification session system unavailable' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');

    // VPN/Proxy detection via Cloudflare headers and request characteristics
    const cfWorker = req.headers['cf-worker'];
    const isDatacenterUA = /node-fetch|axios|go-http-client|python-requests|curl|wget|postman/i.test(userAgent);
    if (cfWorker || isDatacenterUA) {
      const loggerMod = require('./src/config/logger');
      loggerMod.warn('Security', 'VPN/Proxy or Bot detected via request headers', { ip, userAgent, cfWorker });
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'VPN/Proxy Detected! Please disable your VPN, proxy, or server-relay to claim a free key.'
      });
    }

    const session_id = crypto.randomUUID();
    const uuid = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const sessionData = {
      session_id,
      uuid,
      ip,
      fingerprint,
      captcha: false,
      shortlink: false,
      created_at: now,
      expires_at: now + 900
    };

    await redis.set(`session:${session_id}`, JSON.stringify(sessionData), { ex: 900 });

    return res.status(201).json({
      status: 'success',
      statusCode: 201,
      message: 'Verification session created successfully',
      data: { session_id, uuid }
    });
  } catch (err) {
    next(err);
  }
});

// Endpoint to check if a session exists and is still valid in Redis
app.get('/v1/bypass/session/:session_id', async (req, res, next) => {
  try {
    const { session_id } = req.params;
    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Redis unavailable' });
    }

    const session = await redis.get(`session:${session_id}`);
    if (!session) {
      return res.status(404).json({ status: 'error', statusCode: 404, message: 'Session not found or expired' });
    }

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: { valid: true }
    });
  } catch (err) {
    next(err);
  }
});

// Endpoint to check if a license key is valid (exists in database and not expired)
app.get('/v1/bypass/check-key/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT expires_at, status FROM licenses WHERE license_key = $1 LIMIT 1',
      [key.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', statusCode: 404, message: 'License key not found' });
    }

    const license = result.rows[0];
    const isExpired = license.expires_at && new Date(license.expires_at) < new Date();
    if (isExpired) {
      return res.status(400).json({ status: 'error', statusCode: 400, message: 'License key expired' });
    }

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: { valid: true }
    });
  } catch (err) {
    next(err);
  }
});

// Endpoint to verify Cloudflare Turnstile captcha token server-side
app.post('/v1/bypass/verify-captcha', createRateLimiter({ name: 'verify_captcha', windowMs: 60 * 1000, max: 20 }), async (req, res, next) => {
  try {
    const { session_id, turnstile_token } = req.body;
    if (!session_id) {
      return res.status(400).json({ status: 'error', statusCode: 400, message: 'session_id is required' });
    }

    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Redis unavailable' });
    }

    const rawSession = await redis.get(`session:${session_id}`);
    if (!rawSession) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Invalid or expired session' });
    }

    let session = typeof rawSession === 'string' ? JSON.parse(rawSession) : rawSession;
    const ip = getClientIp(req);

    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch' });
    }

    const crypto = require('crypto');
    const userAgent = req.headers['user-agent'] || '';
    const currentFingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
    if (session.fingerprint && session.fingerprint !== currentFingerprint) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session fingerprint mismatch (switching browsers/devices is not allowed)' });
    }

    const env = require('./src/config/env');
    const adminService = require('./src/modules/admin/admin.service');
    const freeKeySettings = await adminService.getSystemSetting('free_key_settings');
    const turnstileEnabled = freeKeySettings ? (freeKeySettings.turnstile_enabled !== false) : true;

    if (turnstileEnabled) {
      if (!turnstile_token) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'Turnstile captcha token is required' });
      }
      const secret = env.turnstile.secretKey;
      if (secret) {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: turnstile_token, remoteip: ip })
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success !== true) {
          return res.status(403).json({ status: 'error', statusCode: 403, message: 'Captcha verification failed on server' });
        }
      }
    } else {
      const loggerMod = require('./src/config/logger');
      loggerMod.warn('BypassSystem', 'Turnstile captcha bypass enabled by admin config — captcha auto-approved without verification', { sessionId: session_id, ip });
    }

    session.captcha = true;
    await redis.set(`session:${session_id}`, JSON.stringify(session), { ex: 900 });

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Captcha verified successfully',
      data: { session_id, captcha_verified: true }
    });
  } catch (err) {
    next(err);
  }
});

// REWRITE: Public endpoint for custom Valinc Link bypass click verification (FAIL-CLOSED)
app.post('/v1/bypass/verify', createRateLimiter({ name: 'bypass_verify', windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const { uuid, session_id } = req.body;
    if (!uuid || !session_id) {
      return res.status(400).json({ status: 'error', statusCode: 400, message: 'UUID and session_id are required' });
    }

    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Verification system unavailable' });
    }

    // 1. Validate session exists in Redis
    const rawSession = await redis.get(`session:${session_id}`);
    if (!rawSession) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Invalid or expired verification session' });
    }

    let session = typeof rawSession === 'string' ? JSON.parse(rawSession) : rawSession;
    const ip = getClientIp(req);

    // 2. Validate UUID matches stored session UUID
    if (session.uuid !== uuid) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session UUID mismatch' });
    }

    // 3. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch' });
    }

    const crypto = require('crypto');
    const userAgent = req.headers['user-agent'] || '';
    const currentFingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
    if (session.fingerprint && session.fingerprint !== currentFingerprint) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session fingerprint mismatch (switching browsers/devices is not allowed)' });
    }

    // 3.5. Time-lock validation to prevent instant checkpoint bypass
    const adminService = require('./src/modules/admin/admin.service');
    const freeKeySettings = await adminService.getSystemSetting('free_key_settings');
    const checkpoints = freeKeySettings ? (freeKeySettings.valinc_checkpoints ?? 2) : 2;
    const countdown = freeKeySettings ? (freeKeySettings.valinc_countdown_seconds ?? 10) : 10;
    const requiredSeconds = checkpoints * countdown;

    const elapsedSeconds = Math.floor(Date.now() / 1000) - session.created_at;
    if (elapsedSeconds < requiredSeconds) {
      const logger = require('./src/config/logger');
      logger.warn('BypassSystem', `Bypass attempt detected (completed too fast): Session: ${session_id}, Elapsed: ${elapsedSeconds}s, Required: ${requiredSeconds}s`);
      return res.status(403).json({ 
        status: 'error', 
        statusCode: 403, 
        message: 'Verifikasi selesai terlalu cepat. Silakan ikuti proses secara normal.' 
      });
    }

    // 4. Record bypass in PostgreSQL database
    const id = crypto.randomUUID();
    const logger = require('./src/config/logger');

    await db.getPool().query(
      'INSERT INTO valinc_bypasses (id, uuid, ip) VALUES ($1, $2, $3)',
      [id, uuid, ip]
    );

    // 5. Mark shortlink as completed in Redis
    session.shortlink = true;
    await redis.set(`session:${session_id}`, JSON.stringify(session), { ex: 900 });

    logger.info('BypassSystem', `Verified custom Valinc Link bypass for UUID: ${uuid}, Session: ${session_id} from IP: ${ip}`);

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Gateway verification completed successfully',
      data: { id, uuid, session_id, ip, shortlink_verified: true }
    });
  } catch (err) {
    // FAIL CLOSED: Return 403 on error so frontend shows retry UI
    return res.status(403).json({ status: 'error', statusCode: 403, message: 'Bypass verification failed. Please retry.' });
  }
});

// Public endpoint for Linkvertise Anti-Bypass server-side hash verification (FAIL-CLOSED)
app.post('/v1/bypass/verify-linkvertise', createRateLimiter({ name: 'bypass_verify_linkvertise', windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const { session_id, hash } = req.body;
    if (!session_id || !hash) {
      return res.status(400).json({ status: 'error', statusCode: 400, message: 'session_id and hash are required' });
    }

    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Verification system unavailable' });
    }

    // 1. Validate session exists in Redis
    const rawSession = await redis.get(`session:${session_id}`);
    if (!rawSession) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Invalid or expired verification session' });
    }

    let session = typeof rawSession === 'string' ? JSON.parse(rawSession) : rawSession;
    const ip = getClientIp(req);

    // 2. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch for session' });
    }

    const crypto = require('crypto');
    const userAgent = req.headers['user-agent'] || '';
    const currentFingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
    if (session.fingerprint && session.fingerprint !== currentFingerprint) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session fingerprint mismatch (switching browsers/devices is not allowed)' });
    }

    // 3. Get Linkvertise Anti-Bypass token from admin settings or environment
    const adminService = require('./src/modules/admin/admin.service');
    const freeKeySettings = await adminService.getSystemSetting('free_key_settings');
    const env = require('./src/config/env');
    const linkvertiseToken = (freeKeySettings && freeKeySettings.linkvertise_anti_bypass_token) 
      || process.env.LINKVERTISE_ANTI_BYPASS_TOKEN 
      || (env.linkvertise && env.linkvertise.antiBypassToken);

    if (linkvertiseToken) {
      // Perform server-to-server verification with Linkvertise Anti-Bypass API
      const verifyUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(linkvertiseToken)}&hash=${encodeURIComponent(hash)}`;
      const verifyRes = await fetch(verifyUrl, { method: 'POST' });
      const responseText = (await verifyRes.text()).trim();

      if (responseText !== 'TRUE' && responseText !== 'true' && responseText !== '{"status":true}') {
        const logger = require('./src/config/logger');
        logger.warn('BypassSystem', `Linkvertise Anti-Bypass verification failed for Session: ${session_id}, Hash: ${hash}, Response: ${responseText}`);
        return res.status(403).json({ status: 'error', statusCode: 403, message: 'Linkvertise anti-bypass verification failed. Completion hash is invalid or expired.' });
      }
    }

    // 4. Mark shortlink as completed in Redis
    session.shortlink = true;
    await redis.set(`session:${session_id}`, JSON.stringify(session), { ex: 900 });

    const logger = require('./src/config/logger');
    logger.info('BypassSystem', `Verified Linkvertise Anti-Bypass hash for Session: ${session_id} from IP: ${ip}`);

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Linkvertise anti-bypass verification completed successfully',
      data: { session_id, ip, shortlink_verified: true }
    });
  } catch (err) {
    return res.status(403).json({ status: 'error', statusCode: 403, message: 'Linkvertise anti-bypass verification error. Please retry.' });
  }
});

// Public endpoint for Work.ink Anti-Bypass / Key System token server-side verification (FAIL-CLOSED)
app.post('/v1/bypass/verify-workink', createRateLimiter({ name: 'bypass_verify_workink', windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const { session_id, token } = req.body;
    if (!session_id || !token) {
      return res.status(400).json({ status: 'error', statusCode: 400, message: 'session_id and token are required' });
    }

    const redisModule = require('./src/config/redis');
    const redis = redisModule.getRedis();
    if (!redis) {
      return res.status(503).json({ status: 'error', statusCode: 503, message: 'Verification system unavailable' });
    }

    // 1. Validate session exists in Redis
    const rawSession = await redis.get(`session:${session_id}`);
    if (!rawSession) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Invalid or expired verification session' });
    }

    let session = typeof rawSession === 'string' ? JSON.parse(rawSession) : rawSession;
    const ip = getClientIp(req);

    // 2. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch for session' });
    }

    const crypto = require('crypto');
    const userAgent = req.headers['user-agent'] || '';
    const currentFingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
    if (session.fingerprint && session.fingerprint !== currentFingerprint) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session fingerprint mismatch (switching browsers/devices is not allowed)' });
    }

    // 3. Perform server-to-server verification with Work.ink API v2
    const verifyUrl = `https://work.ink/_api/v2/token/isValid/${encodeURIComponent(token)}?deleteToken=1`;
    const verifyRes = await fetch(verifyUrl, { method: 'GET' });
    const verifyData = await verifyRes.json().catch(() => ({}));

    if (verifyData.valid !== true) {
      const logger = require('./src/config/logger');
      logger.warn('BypassSystem', `Work.ink verification failed for Session: ${session_id}, Token: ${token}, Data: ${JSON.stringify(verifyData)}`);
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Work.ink verification failed. Token is invalid or expired.' });
    }

    // 4. Mark shortlink as completed in Redis
    session.shortlink = true;
    await redis.set(`session:${session_id}`, JSON.stringify(session), { ex: 900 });

    const logger = require('./src/config/logger');
    logger.info('BypassSystem', `Verified Work.ink token for Session: ${session_id} from IP: ${ip}`);

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'Work.ink verification completed successfully',
      data: { session_id, ip, shortlink_verified: true }
    });
  } catch (err) {
    return res.status(403).json({ status: 'error', statusCode: 403, message: 'Work.ink verification error. Please retry.' });
  }
});

// Public endpoint to fetch public bypass settings (Turnstile status, checkpoints count, and countdown seconds)
app.get('/v1/bypass/settings', async (req, res, next) => {
  try {
    const adminService = require('./src/modules/admin/admin.service');
    const freeKeySettings = await adminService.getSystemSetting('free_key_settings');
    
    // Default fallback
    const config = freeKeySettings || {
      key_prefix: 'SYNDICATE',
      duration_days: 7,
      duration_unit: 'days',
      hwid_limit: 1,
      is_enabled: true,
      turnstile_enabled: true,
      valinc_checkpoints: 2,
      valinc_countdown_seconds: 10,
      max_keys_per_ip: 2,
      checkpoint1_url: '',
      checkpoint2_url: '',
      checkpoint3_url: ''
    };

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const crypto = require('crypto');
    const fingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');

    let userClaimCount = 0;
    try {
      const countRes = await db.getPool().query(
        "SELECT COUNT(*)::int AS count FROM licenses WHERE source = 'free_key' AND (claim_ip = $1 OR claim_fingerprint = $2)",
        [ip, fingerprint]
      );
      userClaimCount = countRes.rows[0]?.count || 0;
    } catch (e) {
      // ignore
    }

    const maxKeys = config.max_keys_per_ip ?? 2;

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: {
        is_enabled: config.is_enabled ?? true,
        turnstile_enabled: config.turnstile_enabled ?? true,
        valinc_checkpoints: config.valinc_checkpoints ?? 2,
        valinc_countdown_seconds: config.valinc_countdown_seconds ?? 10,
        max_keys_per_ip: maxKeys,
        user_claim_count: userClaimCount,
        is_limit_reached: userClaimCount >= maxKeys,
        duration_days: config.duration_days ?? 7,
        duration_unit: config.duration_unit || 'days',
        checkpoint1_url: config.checkpoint1_url || '',
        checkpoint2_url: config.checkpoint2_url || '',
        checkpoint3_url: config.checkpoint3_url || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

app.use('/v1/auth', authRoutes);
app.use('/v1/tickets', ticketRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/licenses', licenseRoutes);
app.use('/v1/redeem', redeemRoutes);
app.use('/v1/hwid', hwidRoutes);
app.use('/v1/scripts', scriptsRoutes);
app.use('/v1/releases', releaseRoutes);
app.use('/v1/payment', paymentRoutes);
app.use('/v1/currency', currencyRoutes);
app.use('/v1/vouchers', voucherRoutes);
app.use('/v1/changelogs', changelogRoutes);
app.use('/v1/activity', activityRoutes);
app.use('/v1/keys', keyauthRoutes);

// ── Internal Bot API (protected via X-Internal-Secret) ────────────────────
// Only accessible from within the Docker network (bot service → backend)
const internalRouter = express.Router();

// Health check
internalRouter.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Internal API is operational', data: { uptime: process.uptime() } });
});

// GET /v1/internal/keys/:discordId — fetch non-free licenses for a Discord user
internalRouter.get('/keys/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const pool = db.getPool();

    // Find user by discord_id
    const userResult = await pool.query(
      'SELECT id, name, username FROM users WHERE discord_id = $1 LIMIT 1',
      [discordId]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: true, data: { keys: [], message: 'No linked account found' } });
    }

    const user = userResult.rows[0];

    // Fetch non-free licenses for this user
    const keysResult = await pool.query(
      `SELECT license_key, tier, status, expires_at, created_at, hwid_limit, uses
       FROM licenses
       WHERE user_id = $1 AND tier != 'free'
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: { name: user.name, username: user.username },
        keys: keysResult.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/v1/internal', internalAuth, internalRouter);

// ============================================================
// ERROR HANDLERS (must be after all routes)
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// SERVER BANNER & ROUTE INFO (Winston logger)
// ============================================================
function getExpressRoutes(appInstance) {
  const routes = [];

  function traverse(router, prefix = '') {
    if (!router || !router.stack) return;
    
    router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        const path = (prefix + layer.route.path).replace(/\/+/g, '/');
        methods.forEach(method => {
          // Avoid duplicate entries if any
          if (!routes.some(r => r.method === method && r.path === path)) {
            routes.push({ method, path });
          }
        });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const mountPath = layer.handle._mountPath || '';
        traverse(layer.handle, prefix + mountPath);
      }
    });
  }

  if (appInstance.router && appInstance.router.stack) {
    appInstance.router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        methods.forEach(method => {
          if (!routes.some(r => r.method === method && r.path === layer.route.path)) {
            routes.push({ method, path: layer.route.path });
          }
        });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const mountPath = layer.handle._mountPath || '';
        traverse(layer.handle, mountPath);
      }
    });
  }

  return routes;
}

function displayServerInfo() {
  const context = 'System';
  
  logger.info(context, '==================================================');
  logger.info(context, '🚀 VALINCIA SYNDICATE Backend API Running 🚀');
  logger.info(context, '==================================================');
  logger.info(context, `📍 Server      : http://localhost:${env.port}`);
  logger.info(context, `🌍 Environment : ${env.nodeEnv}`);
  logger.info(context, `🗄️  Database    : PostgreSQL (connected, pool: ${env.database.connectionLimit})`);
  logger.info(context, `🔴 Redis       : ${require('./src/config/redis').getRedis() ? 'Connected' : 'Memory fallback'}`);
  logger.info(context, `🔌 WebSocket   : ws://localhost:${env.port}/ws`);
  logger.info(context, '--------------------------------------------------');

  logger.info('ServerRouter', 'Available Routes:');
  const routes = getExpressRoutes(app);
  
  // Sort routes alphabetically by path for clean presentation
  routes.sort((a, b) => a.path.localeCompare(b.path));

  routes.forEach(r => {
    const paddedMethod = r.method.padEnd(6, ' ');
    const paddedPath = r.path.padEnd(45, ' ');
    logger.info('ServerRouter', `  ${paddedMethod} ${paddedPath}`);
  });
  logger.info('System', '==================================================');
}

// ============================================================
// START SERVER
// ============================================================
const startServer = async () => {
  try {
    // 1. Connect to PostgreSQL
    await db.connect();

    // 2. Run database migrations (create tables)
    await UserModel.createTable();
    await TicketModel.createTable();
    await LicenseModel.createTable();
    await RedeemModel.createTable();
    await HwidModel.createTable();
    await ScriptModel.createTable();
    await ReleaseModel.createTable();
    await ExecutionModel.createTable();
    await PaymentTransactionModel.createTable();
    await CurrencyModel.createTable();
    await VoucherModel.createTable();
    await ChangelogModel.createTable();
    await ActivityModel.createTable();

    // Create valinc_bypasses table for tracking custom bypass clicks
    await db.getPool().query(`
      CREATE TABLE IF NOT EXISTS valinc_bypasses (
        id          VARCHAR(36)   PRIMARY KEY,
        uuid        VARCHAR(100)  NOT NULL,
        ip          VARCHAR(45)   NOT NULL,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_settings table for dynamic configuration variables
    await db.getPool().query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key_name    VARCHAR(100)  PRIMARY KEY,
        key_value   JSONB         NOT NULL,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default settings for free key configuration
    const defaultSettings = {
      key_prefix: 'SYNDICATE',
      duration_days: 7,
      duration_unit: 'days',
      hwid_limit: 1,
      is_enabled: true,
      turnstile_enabled: true,
      valinc_checkpoints: 2,
      valinc_countdown_seconds: 10,
      max_keys_per_ip: 2,
      checkpoint1_url: '',
      checkpoint2_url: '',
      checkpoint3_url: ''
    };
    await db.getPool().query(`
      INSERT INTO system_settings (key_name, key_value)
      VALUES ($1, $2)
      ON CONFLICT (key_name) DO NOTHING
    `, ['free_key_settings', JSON.stringify(defaultSettings)]);

    // 3. Connect to Redis (non-blocking, falls back gracefully)
    await connectRedis();

    // 4. Set up WebSocket server (attached to the same HTTP server)
    setupWebSocket(server);

    // 5. Run initial expired license cleanup and schedule recurring cleanup (every 6 hours)
    LicenseModel.cleanupExpired().catch(err => logger.error('Startup', 'License cleanup failed', { error: err.message }));
    setInterval(() => {
      LicenseModel.cleanupExpired().catch(err => logger.error('Cleanup', 'Scheduled license cleanup failed', { error: err.message }));
    }, 6 * 60 * 60 * 1000);

    // 6. Start listening
    server.listen(env.port, () => {
      displayServerInfo();
    });
  } catch (error) {
    logger.error('Startup', 'Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const shutdown = async (signal) => {
  logger.info('System', `${signal} received, shutting down gracefully...`);
  await disconnectRedis();
  await db.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('System', 'Unhandled Promise Rejection', { error: err.message, stack: err.stack });
  if (env.nodeEnv === 'production') process.exit(1);
});

// Start the server
startServer();

module.exports = app;
