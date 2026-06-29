const releaseService = require('./releases.service');
const ExecutionModel = require('../executions/executions.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');

class ReleaseController {
  async create(req, res, next) {
    try {
      const release = await releaseService.createRelease(req.body, req.user.id);
      res.status(201).json({ status: 'success', message: 'Release created', data: { release } });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const releases = await releaseService.getReleases(req.user.id, req.user.role)
      res.status(200).json({ status: 'success', data: { releases } })
    } catch (err) { next(err) }
  }

  async listPublic(req, res, next) {
    try {
      const releases = await releaseService.getAllPublic();
      res.status(200).json({ status: 'success', data: { releases } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const release = await releaseService.getReleaseById(req.params.id, req.user.id, req.user.role)
      res.status(200).json({ status: 'success', data: { release } })
    } catch (err) { next(err) }
  }

  async update(req, res, next) {
    try {
      const release = await releaseService.updateRelease(req.params.id, req.body, req.user.id, req.user.role)
      res.status(200).json({ status: 'success', message: 'Release updated', data: { release } })
    } catch (err) { next(err) }
  }

  async delete(req, res, next) {
    try {
      await releaseService.deleteRelease(req.params.id, req.user.id, req.user.role)
      res.status(200).json({ status: 'success', message: 'Release deleted' })
    } catch (err) { next(err) }
  }

  async gameInfo(req, res, next) {
    try {
      const { gameId } = req.params;
      if (!gameId || !gameId.trim()) throw new AppError('Game ID is required', 400);
      const info = await releaseService.fetchGameInfo(gameId.trim());
      res.status(200).json({ status: 'success', data: info });
    } catch (err) { next(err); }
  }

  async loader(req, res, next) {
    try {
      const { prefix } = req.params;
      const key = req.query.key || null;
      // Bypass loader for non-hex prefixes (game-info, UUIDs, etc.)
      const isHexPrefix = /^[0-9a-f]{32}$/i.test(prefix.replace(/\.lua$/i, ''));
      if (!isHexPrefix) {
        return next();
      }
      if (!prefix) throw new AppError('Prefix is required', 400);

      // Traffic Splitting & Masking Flow (ponytail: inline 403 response)
      const userAgent = req.headers['user-agent'] || '';
      const accept = req.headers['accept'] || '';
      const isExecutor = /RobloxApp/i.test(userAgent) || req.headers['x-executor'] || req.headers['x-valinc-handshake'];
      const isBlockedAgent = /Mozilla|Chrome|Safari|curl|wget/i.test(userAgent) || accept.includes('text/html');

      if (!isExecutor || isBlockedAgent) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied (403)</title>
  <style>
    body { background: #09090b; color: #f4f4f5; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
    .security-vault { position: relative; max-width: 480px; width: 100%; border: 1px solid rgba(239, 68, 68, 0.15); background: #121214; border-radius: 6px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .glow-red { position: absolute; z-index: 0; width: 320px; height: 320px; border-radius: 50%; background: rgba(239, 68, 68, 0.04); filter: blur(100px); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
    .header-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(239, 68, 68, 0.05); border-bottom: 1px solid rgba(239, 68, 68, 0.15); font-size: 10px; font-weight: bold; letter-spacing: 1.5px; color: #ef4444; }
    .ping-container { display: flex; align-items: center; gap: 8px; }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: flash 1.5s infinite; }
    .content-box { position: relative; z-index: 1; padding: 32px 24px; text-align: center; }
    .lock-icon { font-size: 28px; line-height: 1; margin-bottom: 20px; color: #ef4444; }
    h1 { font-size: 20px; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase; }
    p { font-size: 11px; color: #a1a1aa; line-height: 1.6; margin: 0 auto 28px; max-width: 360px; }
    .console-frame { border: 1px solid rgba(255,255,255,0.06); background: #0c0a0f; border-radius: 4px; overflow: hidden; text-align: left; }
    .console-title { padding: 8px 12px; font-size: 9px; font-weight: bold; color: #71717a; text-transform: uppercase; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); letter-spacing: 1px; }
    .console-logs { padding: 12px; font-size: 10px; line-height: 1.6; color: #d4d4d8; }
    .status-blocked { color: #f87171; font-weight: bold; }
    .status-info { color: #a1a1aa; }
    .status-dim { color: #52525b; }
    .action-btn { display: inline-block; padding: 10px 24px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #ef4444; color: #ffffff; border-radius: 4px; text-decoration: none; border: 1px solid #dc2626; transition: background-color 0.2s, box-shadow 0.2s; margin-top: 28px; cursor: pointer; }
    .action-btn:hover { background: #dc2626; box-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  </style>
</head>
<body>
  <div class="security-vault">
    <div class="glow-red"></div>
    <div class="header-bar">
      <span>SECURE ENGINE GATEWAY</span>
      <div class="ping-container">
        <span>GATEWAY ACTIVE</span>
        <div class="pulse-dot"></div>
      </div>
    </div>
    <div class="content-box">
      <div class="lock-icon">🔒</div>
      <h1>HTTP 403: Restricted</h1>
      <p>Direct query of script file asset is restricted. Please run within active RobloxApp executor client only.</p>
      
      <div class="console-frame">
        <div class="console-title">Security Trace Terminal</div>
        <div class="console-logs">
          <div><span class="status-blocked">[BLOCKED]</span> Connection request direct edge bypass</div>
          <div><span class="status-info">[RESOLVE]</span> Client handshake verified: FALSE</div>
          <div><span class="status-info">[SESSION]</span> Header mapping payload resolved to null</div>
          <div class="status-dim">[MONITOR] Security daemon waiting for valid executor context...</div>
        </div>
      </div>
      
      <a href="/" class="action-btn">Return to Base</a>
    </div>
  </div>
</body>
</html>`);
      }

      const result = await releaseService.getLoaderContent(prefix);
      // Record execution asynchronously with optional key tracking
      ExecutionModel.recordExecution(key).catch(err =>
        logger.error('Release:Loader', 'Failed to record execution', { error: err.message })
      );
      // Build response content: prepend key header if key provided.
      // SECURITY: Sanitize the key to prevent Lua injection. Only allow
      // alphanumeric, dash, and underscore. Anything else is stripped.
      let content = result.content;
      if (key) {
        const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
        if (safeKey) {
          content = `-- _G.Key = "${safeKey}"\n${content}`;
        }
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(content);
    } catch (err) { next(err); }
  }
}

module.exports = new ReleaseController();
