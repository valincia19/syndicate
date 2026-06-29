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
  <title>403 Forbidden</title>
  <style>
    body { background: #13111c; color: #e1e0e5; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { border: 1px solid rgba(255,255,255,0.1); background: #1b1924; padding: 24px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center; max-width: 380px; }
    h1 { color: #ff5555; margin-top: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
    p { font-size: 12px; color: #a19fb0; line-height: 1.5; margin: 16px 0 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>403 Forbidden</h1>
    <p>Direct script file access is restricted. Please execute via the loader in-game.</p>
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
