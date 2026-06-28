/**
 * Secure WebSocket Server Configuration
 * ─────────────────────────────────────
 * Production-ready WebSocket with:
 * - JWT authentication via sub-protocol header (not query params)
 * - BOLA validation on ticket subscription
 * - Ping/pong heartbeat for stale connection cleanup
 * - Per-connection rate limiting
 * - Graceful broadcast to ticket subscribers
 */

const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('./env');
const logger = require('./logger');
const { checkWsUpgradeRate } = require('../middleware/rateLimiter.middleware');

// ─── Constants & Validation Schemas ───────────────────────────────
const AUTH_PREFIX = 'bearer_';
const HEARTBEAT_INTERVAL = 30_000;    // ping every 30s
const HEARTBEAT_TIMEOUT = 10_000;     // terminate if no pong in 10s
const MSG_RATE_LIMIT = 30;            // max messages per window
const MSG_RATE_WINDOW = 10_000;       // rate window (10s)
const MAX_PAYLOAD_BYTES = 4096;       // 4KB limit to prevent Memory DoS
const RECONNECT_MAX_DELAY = 30_000;
const PROTOCOL_CHANNEL = 'ticket-ws.v1';

const subscribePayloadSchema = z.object({
  type: z.literal('subscribe'),
  ticketId: z.string().uuid('ticketId must be a valid UUID'),
});

const dashboardPayloadSchema = z.object({
  type: z.literal('subscribe_dashboard'),
});

const wsMessageSchema = z.discriminatedUnion('type', [
  subscribePayloadSchema,
  dashboardPayloadSchema,
]);

// ─── WSS Registry (singleton, avoids circular deps) ──────────────
const wssRegistry = {
  instance: null,

  set(instance) {
    this.instance = instance;
  },

  get() {
    return this.instance;
  },

  /**
   * Broadcast a JSON event to all clients subscribed to a ticket.
   * @param {string} ticketId
   * @param {object} event - will be JSON.stringify'd
   */
  broadcastToTicket(ticketId, event) {
    const wss = this.instance;
    if (!wss) return;

    const payload = JSON.stringify(event);
    let sent = 0;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Send to subscribers of this specific ticket
        if (client.ticketId === ticketId) {
          client.send(payload);
          sent++;
        }
        // Also send to dashboard subscribers (ticket list pages)
        if (client.isDashboard) {
          // Wrap with ticketId so the list page knows which ticket to update
          const dashboardPayload = JSON.stringify({
            ...event,
            ticketId, // attach the ticket context
          });
          client.send(dashboardPayload);
        }
      }
    });

    if (sent > 0) {
      logger.debug('WebSocket', 'Broadcast', { ticketId, type: event.type, recipients: sent });
    }
  },

  /**
   * Terminate open sockets for a specific user (force logout/evict)
   * @param {string} userId
   * @param {string} reason
   */
  terminateUser(userId, reason = 'Account suspended or deleted') {
    const wss = this.instance;
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.userId === userId) {
        logger.info('WebSocket', 'Force terminating connection for user', { userId, reason });
        try {
          client.send(JSON.stringify({ type: 'error', code: 'FORCE_LOGOUT', message: reason }));
          client.terminate();
        } catch {
          // ignore error if socket already closed
        }
      }
    });
  },
};

/**
 * Extract and verify JWT from the Sec-WebSocket-Protocol header.
 * Returns decoded payload or null.
 */
function authenticateUpgrade(req) {
  // 1. Try Sec-WebSocket-Protocol header (sent via new WebSocket(url, protocols))
  const protocolHeader = req.headers['sec-websocket-protocol'];
  if (protocolHeader) {
    // Format: "ticket-ws.v1, bearer_<jwt>"
    const protocols = protocolHeader
      .split(',')
      .map((s) => s.trim());
    
    const authProtocol = protocols.find((p) => p.startsWith(AUTH_PREFIX));
    if (authProtocol) {
      const token = authProtocol.slice(AUTH_PREFIX.length);
      if (token) {
        try {
          return jwt.verify(token, env.jwtSecret);
        } catch (err) {
          logger.warn('WebSocket', 'JWT verification failed', {
            error: err.message,
          });
          return null;
        }
      }
    }
  }

  // 2. Try httpOnly auth_token cookie (same-origin auto-send)
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    try {
      return jwt.verify(token, env.jwtSecret);
    } catch (err) {
      logger.warn('WebSocket', 'Cookie JWT verification failed', {
        error: err.message,
      });
      return null;
    }
  }

  return null;
}

/**
 * Set up WebSocket server on an existing HTTP server.
 * @param {import('http').Server} server
 */
function setupWebSocket(server) {
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      if (protocols.includes(PROTOCOL_CHANNEL)) {
        return PROTOCOL_CHANNEL;
      }
      return false;
    }
  });

  wssRegistry.set(wss);

  // ─── HTTP → WebSocket Upgrade Handler ──────────────────────────
  server.on('upgrade', async (req, socket, head) => {
    const remoteIp = req.socket.remoteAddress;
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Only handle our WS path
    if (url.pathname !== '/ws') {
      logger.debug('WebSocket', 'Ignoring non-WS upgrade request', { pathname: url.pathname, ip: remoteIp });
      socket.destroy();
      return;
    }

    // Rate limiting check on connection upgrade (anti-bruteforce)
    const rateCheck = await checkWsUpgradeRate(remoteIp);
    if (!rateCheck.allowed) {
      logger.warn('WebSocket', 'Upgrade REJECTED - Rate limit exceeded', { ip: remoteIp });
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }

    logger.info('WebSocket', 'Upgrade request received', { ip: remoteIp });

    // Authenticate BEFORE upgrade (req #1: no query param auth)
    const decoded = authenticateUpgrade(req);
    if (!decoded) {
      logger.warn('WebSocket', 'Upgrade REJECTED - no valid JWT found', {
        ip: remoteIp,
        hasCookie: !!((req.headers.cookie || '').match(/auth_token=/)),
        hasSubProtocol: !!(req.headers['sec-websocket-protocol'] || '').includes('bearer_'),
      });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Check user status in cache / DB
    const UserModel = require('../modules/auth/auth.model');
    const cacheUtility = require('../utils/cache.utility');
    const user = await cacheUtility.getOrSet(
      `cache:user_profile:${decoded.id}`,
      () => UserModel.findById(decoded.id),
      300
    );

    if (!user) {
      logger.warn('WebSocket', 'Upgrade REJECTED - user no longer exists', { userId: decoded.id });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (user.suspended) {
      logger.warn('WebSocket', 'Upgrade REJECTED - user suspended', { userId: decoded.id });
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    logger.info('WebSocket', 'JWT & Account verified during upgrade', {
      userId: user.id,
      role: user.role || 'user',
      ip: remoteIp,
    });

    // Attach user to the request for the connection handler
    req.wsUser = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // ─── Connection Handler ─────────────────────────────────────────
  wss.on('connection', (ws, req) => {
    const user = req.wsUser;
    ws.userId = user.id;
    ws.userRole = user.role;
    ws.ticketId = null;

    // Heartbeat init
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Rate limiting state
    ws.msgCount = 0;
    ws.msgWindowStart = Date.now();

    logger.info('WebSocket', 'Client connected', {
      userId: user.id,
      role: user.role,
      ip: req.socket.remoteAddress,
    });

    // Confirm connection
    ws.send(JSON.stringify({ type: 'connected', userId: user.id, role: user.role }));

    // ─── Incoming Message Handler ─────────────────────────────────
    ws.on('message', (raw) => {
      // 1. Buffer size payload check (4KB max) to prevent Memory DoS
      const payloadLength = Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw);
      if (payloadLength > MAX_PAYLOAD_BYTES) {
        logger.warn('WebSocket', 'Payload size limit exceeded', { userId: user.id, bytes: payloadLength });
        ws.send(JSON.stringify({ type: 'error', message: 'Payload size exceeds 4KB limit.' }));
        return;
      }

      // 2. Rate limiting
      const now = Date.now();
      if (now - ws.msgWindowStart > MSG_RATE_WINDOW) {
        ws.msgCount = 0;
        ws.msgWindowStart = now;
      }
      ws.msgCount++;
      if (ws.msgCount > MSG_RATE_LIMIT) {
        logger.warn('WebSocket', 'Rate limit exceeded', { userId: user.id });
        ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please slow down.' }));
        return;
      }

      // 3. Parse JSON and validate against schema
      let jsonPayload;
      try {
        jsonPayload = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON.' }));
        return;
      }

      const parseResult = wsMessageSchema.safeParse(jsonPayload);
      if (!parseResult.success) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message payload format.',
          errors: parseResult.error.errors.map(e => e.message),
        }));
        return;
      }

      const data = parseResult.data;

      if (data.type === 'subscribe_dashboard') {
        ws.isDashboard = true;
        ws.send(JSON.stringify({ type: 'subscribed_dashboard' }));
        logger.debug('WebSocket', 'Client subscribed to dashboard', { userId: user.id });
        return;
      }

      if (data.type === 'subscribe') {
        // ─── Subscribe Handler with BOLA check ─────────────────
        handleSubscribe(ws, data.ticketId).catch((err) => {
          logger.error('WebSocket', 'Subscribe error', { userId: user.id, ticketId: data.ticketId, error: err.message });
          ws.send(JSON.stringify({ type: 'error', message: 'Internal error.' }));
        });
      }
    });

    // ─── Close Handler ────────────────────────────────────────────
    ws.on('close', (code, reason) => {
      logger.info('WebSocket', 'Client disconnected', {
        userId: user.id,
        ticketId: ws.ticketId,
        code,
        reason: reason ? reason.toString() : undefined,
      });
    });

    // ─── Error Handler ────────────────────────────────────────────
    ws.on('error', (err) => {
      logger.error('WebSocket', 'Connection error', { userId: user.id, error: err.message });
    });
  });

  // ─── Heartbeat Interval ─────────────────────────────────────────
  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.warn('WebSocket', 'Terminating stale connection', { userId: ws.userId });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  // ─── Cleanup on server close ────────────────────────────────────
  wss.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  logger.info('WebSocket', 'Server ready', { path: '/ws' });

  return wss;
}

/**
 * Validate ticket access (BOLA protection) and subscribe the client.
 * Users can only subscribe to tickets they own (regular users) or any ticket (staff+).
 */
async function handleSubscribe(ws, ticketId) {
  if (!ticketId || typeof ticketId !== 'string') {
    ws.send(JSON.stringify({ type: 'error', message: 'ticketId is required.' }));
    return;
  }

  const ticketModel = require('../modules/tickets/tickets.model');
  const STAFF_ROLES = ['staff', 'admin', 'developer', 'owner'];

  let ticket;
  try {
    ticket = await ticketModel.findById(ticketId);
  } catch (err) {
    logger.error('WebSocket', 'DB error during subscribe', { ticketId, error: err.message });
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to verify ticket access.' }));
    return;
  }

  if (!ticket) {
    ws.send(JSON.stringify({ type: 'error', message: 'Ticket not found.' }));
    return;
  }

  // BOLA check: non-staff can only subscribe to own tickets
  const isStaff = STAFF_ROLES.includes(ws.userRole);
  if (!isStaff && ticket.user_id !== ws.userId) {
    logger.warn('WebSocket', 'BOLA blocked', {
      userId: ws.userId,
      ticketOwnerId: ticket.user_id,
      ticketId,
    });
    ws.send(JSON.stringify({ type: 'error', message: 'Access denied to this ticket.' }));
    return;
  }

  // Audit logging: staff accessing another user's ticket
  if (isStaff && ticket.user_id !== ws.userId) {
    logger.info('WebSocket', 'Staff accessed user ticket', {
      staffId: ws.userId,
      staffRole: ws.userRole,
      ticketId,
      ticketOwnerId: ticket.user_id,
    });
  }

  // Subscribe
  ws.ticketId = ticketId;
  ws.send(JSON.stringify({ type: 'subscribed', ticketId }));
  logger.debug('WebSocket', 'Client subscribed', { userId: ws.userId, ticketId });
}

module.exports = { setupWebSocket, wssRegistry };
