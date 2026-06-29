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
  <title>403 Forbidden</title>
  <style>
    body { background: #13111c; color: #e1e0e5; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
    .container { position: relative; display: flex; flex-direction: column; items-center: justify-content: center; text-align: center; max-width: 440px; width: 100%; gap: 24px; }
    .glow { position: absolute; z-index: -1; width: 280px; height: 280px; border-radius: 50%; background: rgba(158, 77, 245, 0.08); filter: blur(80px); top: 50%; left: 50%; transform: translate(-50%, -50%); }
    .badge { width: 56px; height: 56px; border-radius: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    h1 { font-size: 10px; font-weight: bold; tracking: 0.3em; color: #ef4444; text-transform: uppercase; margin: 0 0 8px; letter-spacing: 3px; }
    h2 { font-size: 22px; font-weight: 800; color: #ffffff; text-transform: uppercase; margin: 0 0 12px; }
    p { font-size: 12px; color: #8f8d9b; line-height: 1.6; margin: 0 0 24px; }
    .terminal { border: 1px solid rgba(255,255,255,0.08); background: rgba(21, 20, 28, 0.9); border-radius: 8px; overflow: hidden; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 100%; }
    .term-hdr { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #8f8d9b; letter-spacing: 1px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
    .term-body { padding: 16px; font-mono: monospace; font-size: 10px; line-height: 1.5; color: #a19fb0; }
    .red-txt { color: #f87171; }
    .dim-txt { color: #52525b; }
    .btn { display: inline-block; padding: 10px 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: #ffffff; color: #13111c; border-radius: 6px; text-decoration: none; font-family: monospace; transition: opacity 0.2s; margin-top: 24px; }
    .btn:hover { opacity: 0.9; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="glow"></div>
    <div>
      <div class="badge">⚠️</div>
      <h1>Error Code: 403_ACCESS_DENIED</h1>
      <h2>Security Check Failed</h2>
      <p>Direct script file access is restricted. Please execute via the loader in-game.</p>
      
      <div class="terminal">
        <div class="term-hdr">
          <span>Syndicate Security Daemon</span>
          <div class="dot"></div>
        </div>
        <div class="term-body">
          <div class="red-txt">[ERROR] HTTP-403: Access to raw asset blocked</div>
          <div>[TRACE] Handshake failed: Executor credentials nil</div>
          <div>[CACHE] Edge bypass: Blocked direct request</div>
          <div class="dim-txt">[SYSTEM] Awaiting RobloxApp executor environment...</div>
        </div>
      </div>
      
      <a href="/" class="btn">Return to Base</a>
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
