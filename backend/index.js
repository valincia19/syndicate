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
const cookieParser = require('cookie-parser');

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
const executionController = require('./src/modules/executions/executions.controller');
const paymentRoutes = require('./src/modules/payment/payment.routes');
const currencyRoutes = require('./src/modules/currency/currency.routes');
const voucherRoutes = require('./src/modules/vouchers/vouchers.routes');
const changelogRoutes = require('./src/modules/changelogs/changelogs.routes');
const activityRoutes = require('./src/modules/activity/activity.routes');

// WebSocket
const { setupWebSocket } = require('./src/config/websocket');

// Initialize Express app
const app = express();

// Create HTTP server (required for WebSocket upgrade)
const server = http.createServer(app);

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

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
app.get('/v1/releases/:prefix', createRateLimiter({ name: 'loader', windowMs: 60 * 1000, max: 60 }), releaseController.loader.bind(releaseController));
// Also support singular /v1/release/:prefix for loader
app.get('/v1/release/:prefix', createRateLimiter({ name: 'loader', windowMs: 60 * 1000, max: 60 }), releaseController.loader.bind(releaseController));

// Public executions stats
app.get('/v1/executions/stats', executionController.stats.bind(executionController));

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

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');

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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch' });
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // 2. Validate UUID matches stored session UUID
    if (session.uuid !== uuid) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'Session UUID mismatch' });
    }

    // 3. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch' });
    }

    // 4. Record bypass in PostgreSQL database
    const crypto = require('crypto');
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // 2. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch for session' });
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // 2. Validate IP matches session creator IP
    if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
      return res.status(403).json({ status: 'error', statusCode: 403, message: 'IP address mismatch for session' });
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

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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

// ============================================================
// ERROR HANDLERS (must be after all routes)
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

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
      console.log('');
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║                                                    ║');
      console.log('║    🚀 VALINCIA SYNDICATE Backend API Running 🚀     ║');
      console.log('║                                                    ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log('');
      console.log('📍 Server:      http://localhost:' + env.port);
      console.log('🌍 Environment: ' + env.nodeEnv);
      console.log('🔐 CORS:        ' + env.allowedOrigins.join(', '));
      console.log('🗄️  Database:    PostgreSQL (pg pool, limit ' + env.database.connectionLimit + ')');
      console.log('🔴 Redis:       ' + (require('./src/config/redis').getRedis() ? 'Connected' : 'Memory fallback'));
      console.log('🔌 WebSocket:   ws://localhost:' + env.port + '/ws');
      console.log('');
      console.log('Available Routes:');
      console.log('  GET    /health               - Health check');
      console.log('  POST   /v1/auth/register    - Register new user');
      console.log('  POST   /v1/auth/login       - Login user');
      console.log('  GET    /v1/auth/profile     - Get user profile (protected)');
      console.log('  POST   /v1/tickets          - Create a support ticket (protected)');
      console.log('  GET    /v1/tickets          - List tickets (protected)');
      console.log('  GET    /v1/tickets/:id      - Get ticket details (protected)');
      console.log('  POST   /v1/tickets/:id/messages - Reply to ticket (protected)');
      console.log('  PATCH  /v1/tickets/:id/status   - Update status (staff+)');
      console.log('');
      console.log('════════════════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const shutdown = async (signal) => {
  console.log('\n🛑 ' + signal + ' received, shutting down gracefully...');
  await disconnectRedis();
  await db.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  if (env.nodeEnv === 'production') process.exit(1);
});

// Start the server
startServer();

module.exports = app;
