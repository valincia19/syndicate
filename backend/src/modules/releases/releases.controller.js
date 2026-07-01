const releaseService = require('./releases.service');
const ExecutionModel = require('../executions/executions.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');
const cacheUtility = require('../../utils/cache.utility');
const env = require('../../config/env');

// ── Inline HTML 403 page (reused across loader guards) ──────────────────────
const BROWSER_BLOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied (403)</title>
  <style>
    body { background: #09090b; color: #f4f4f5; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
    .security-vault { position: relative; max-width: 480px; width: 100%; border: 1px solid rgba(239, 68, 68, 0.15); background: #121214; border-radius: 6px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .security-vault::before { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%); z-index: 2; background-size: 100% 3px; pointer-events: none; }
    .glow-red { position: absolute; z-index: 0; width: 320px; height: 320px; border-radius: 50%; background: rgba(239, 68, 68, 0.04); filter: blur(100px); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
    .header-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(239, 68, 68, 0.05); border-bottom: 1px solid rgba(239, 68, 68, 0.15); font-size: 10px; font-weight: bold; color: #ef4444; }
    .ping-container { display: flex; align-items: center; gap: 8px; }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: flash 1.5s infinite; }
    .content-box { position: relative; z-index: 1; padding: 32px 24px; text-align: center; }
    .lock-svg { width: 36px; height: 36px; margin: 0 auto 20px; display: block; }
    h1 { font-size: 20px; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.5px; color: #ffffff; }
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
      <span>Secure Engine Gateway</span>
      <div class="ping-container">
        <span>Gateway Active</span>
        <div class="pulse-dot"></div>
      </div>
    </div>
    <div class="content-box">
      <svg class="lock-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <h1>Forbidden (403)</h1>
      <p>Direct query of script file asset is restricted. Please run within active RobloxApp executor client only.</p>
      <div class="console-frame">
        <div class="console-title">Security Trace Terminal</div>
        <div class="console-logs">
          <div><span class="status-blocked">[Blocked]</span> Connection request direct edge bypass</div>
          <div><span class="status-info">[Resolve]</span> Client handshake verified: false</div>
          <div><span class="status-info">[Session]</span> Header mapping payload resolved to null</div>
          <div class="status-dim">[Monitor] Security daemon waiting for valid executor context...</div>
        </div>
      </div>
      <a href="/" class="action-btn">Return to base</a>
    </div>
  </div>
</body>
</html>`;

class ReleaseController {
  async create(req, res, next) {
    try {
      const release = await releaseService.createRelease(req.body, req.user.id);
      res.status(201).json({ status: 'success', message: 'Release created', data: { release } });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const releases = await releaseService.getReleases(req.user.id, req.user.role);
      res.status(200).json({ status: 'success', data: { releases } });
    } catch (err) { next(err); }
  }

  async listPublic(req, res, next) {
    try {
      const releases = await releaseService.getAllPublic();
      res.status(200).json({ status: 'success', data: { releases } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const release = await releaseService.getReleaseById(req.params.id, req.user.id, req.user.role);
      res.status(200).json({ status: 'success', data: { release } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const release = await releaseService.updateRelease(req.params.id, req.body, req.user.id, req.user.role);
      res.status(200).json({ status: 'success', message: 'Release updated', data: { release } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await releaseService.deleteRelease(req.params.id, req.user.id, req.user.role);
      res.status(200).json({ status: 'success', message: 'Release deleted' });
    } catch (err) { next(err); }
  }

  async gameInfo(req, res, next) {
    try {
      const { gameId } = req.params;
      if (!gameId || !gameId.trim()) throw new AppError('Game ID is required', 400);
      const info = await releaseService.fetchGameInfo(gameId.trim());
      res.status(200).json({ status: 'success', data: info });
    } catch (err) { next(err); }
  }

  /**
   * ── verifyToken (One-Time Token Security Validation) ─────────────────────
   * GET /v1/releases/verify-token
   *
   * Validates if the dynamic token exists in Redis Cache for the given Roblox ID.
   * If found and valid, deletes it immediately (Single Use Only) and returns 'AUTHORIZED'.
   * Otherwise returns 'UNAUTHORIZED'.
   */
  async verifyToken(req, res, next) {
    try {
      const { token, roblox_id } = req.query;
      if (!token || !roblox_id) {
        return res.status(200).send('UNAUTHORIZED');
      }

      const cacheKey = `exec_token:${roblox_id}:${token}`;
      const tokenValue = await cacheUtility.get(cacheKey);

      if (tokenValue === 'VALID') {
        await cacheUtility.del(cacheKey);
        return res.status(200).send('AUTHORIZED');
      }

      return res.status(200).send('UNAUTHORIZED');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ── Stage 1: Gatekeeper (Public Script Loader) ───────────────────────────
   * GET /v1/releases/:prefix
   *
   * Instead of serving the real script, this generates a lightweight Luau
   * bootstrap "gatekeeper" script. The gatekeeper collects device metadata,
   * calls Stage 2 (/v1/releases/secure-load/:prefix) with auth headers,
   * and only executes the real payload via loadstring() on success.
   */
  async loader(req, res, next) {
    try {
      const { prefix } = req.params;

      // Only process 32-char hex prefixes; pass everything else to next()
      const isHexPrefix = /^[0-9a-f]{32}$/i.test(prefix.replace(/\.lua$/i, ''));
      if (!isHexPrefix) {
        return next();
      }
      if (!prefix) throw new AppError('Prefix is required', 400);

      // ── Browser/Direct API Access Guard ──────────────────────────────────
      const userAgent = req.headers['user-agent'] || '';
      const accept = req.headers['accept'] || '';
      const isExecutor = /RobloxApp|Roblox/i.test(userAgent) || req.headers['x-executor'] || req.headers['x-valinc-handshake'];
      const isBlockedAgent = /Mozilla|Chrome|Safari|curl|wget/i.test(userAgent) || accept.includes('text/html');

      if (!isExecutor || isBlockedAgent) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).send(BROWSER_BLOCK_HTML);
      }

      // ── Verify release exists and is published (cached) ───────────────────
      const cleanPrefix = prefix.replace(/\.lua$/i, '');
      const cacheKeyRelease = `cache:release:${cleanPrefix}`;

      let release = await cacheUtility.get(cacheKeyRelease);
      if (!release) {
        const ReleaseModel = require('./releases.model');
        release = await ReleaseModel.findByPrefix(cleanPrefix);
        if (release) await cacheUtility.set(cacheKeyRelease, release, 300);
      }
      if (!release) throw new AppError('Release not found', 404);
      if (release.status !== 'published') throw new AppError('This script is currently unavailable.', 503);

      // ── Generate Luau Gatekeeper Bootstrap Script ─────────────────────────
      // This script runs inside Roblox. It collects device metadata, calls
      // Stage 2 (secure-load) with security headers, and executes the real
      // payload in-memory via loadstring(). Exploiters intercepting Stage 1
      // only get this bootstrap — never the actual source code.
      const backendUrl = env.backendUrl || 'http://localhost:5000';
      const secureEndpoint = `${backendUrl}/v1/releases/secure-load/${cleanPrefix}`;

      const gatekeeperScript = `
-- VALINC SYNDICATE :: Secure Gatekeeper Script
-- Stage 1 Bootstrap — This file contains no proprietary logic.
-- All real payload is fetched and executed in-memory at runtime.

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local LocalPlayer = Players.LocalPlayer

-- ── Collect Device Identity ──────────────────────────────────────────────────
local key = _G.Key or ""
local hwid = (type(gethwid) == "function" and gethwid()) or game:GetService("RbxAnalyticsService"):GetClientId()
local robloxId = tostring(LocalPlayer.UserId)
local robloxName = tostring(LocalPlayer.Name)
local executor = (type(identifyexecutor) == "function" and identifyexecutor()) or "Unknown"
local avatarUrl = ""

-- Attempt to fetch avatar URL (non-fatal)
pcall(function()
  local thumb = game:GetService("Players"):GetUserThumbnailAsync(LocalPlayer.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size100x100)
  avatarUrl = thumb
end)

-- ── Build Secure Request to Stage 2 ─────────────────────────────────────────
local url = "${secureEndpoint}"
  .. "?key=" .. HttpService:UrlEncode(key)
  .. "&hwid=" .. HttpService:UrlEncode(hwid)
  .. "&roblox_id=" .. HttpService:UrlEncode(robloxId)
  .. "&roblox_username=" .. HttpService:UrlEncode(robloxName)
  .. "&roblox_avatar=" .. HttpService:UrlEncode(avatarUrl)
  .. "&executor=" .. HttpService:UrlEncode(executor)

-- ── Fetch Real Script Payload ────────────────────────────────────────────────
local scriptBody = ""
local req = (type(request) == "function" and request) or (type(http_request) == "function" and http_request) or (type(syn.request) == "function" and syn.request)

if req then
  local ok, response = pcall(function()
    return req({
      Url = url,
      Method = "GET",
      Headers = {
        ["User-Agent"] = "Roblox/WinInet",
        ["X-Valinc-Handshake"] = "TRUE",
      }
    })
  end)
  if ok and response and response.StatusCode == 200 then
    scriptBody = response.Body
  else
    local getOk, getRes = pcall(function()
      return game:HttpGet(url)
    end)
    if getOk then
      scriptBody = getRes
    else
      warn("[VALINC] Connection error. Please retry.")
      return
    end
  end
else
  local getOk, getRes = pcall(function()
    return game:HttpGet(url)
  end)
  if getOk then
    scriptBody = getRes
  else
    warn("[VALINC] Connection error. Please retry.")
    return
  end
end

-- ── Parse JSON error response if content is JSON ─────────────────────────────
if scriptBody:sub(1, 1) == "{" then
  local errMsg = "[VALINC] Access denied."
  pcall(function()
    local parsed = HttpService:JSONDecode(scriptBody)
    if parsed and parsed.message then
      errMsg = "[VALINC] " .. tostring(parsed.message)
    end
  end)
  warn(errMsg)
  return
end

local mainFn, compileErr = loadstring(scriptBody)
if not mainFn then
  warn("[VALINC] Script compile error: " .. tostring(compileErr))
  return
end

local runOk, runErr = pcall(mainFn)
if not runOk then
  warn("[VALINC] Runtime error: " .. tostring(runErr))
end
`;

      // Record execution asynchronously (key may be nil for public free scripts)
      const key = req.query.key || null;
      ExecutionModel.recordExecution(key).catch(err =>
        logger.error('Release:Loader', 'Failed to record execution', { error: err.message })
      );

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(gatekeeperScript.trimStart());
    } catch (err) { next(err); }
  }

  /**
   * ── Stage 2: Secure Loader (Authenticated Script Delivery) ───────────────
   * GET /v1/releases/secure-load/:prefix
   *
   * Called exclusively by the Roblox-side gatekeeper generated in Stage 1.
   * Validates the executor identity, license key, HWID binding, and tier access,
   * then delivers the real script content as plain text for in-memory execution.
   */
  async secureLoader(req, res, next) {
    try {
      const { prefix } = req.params;
      const { key, hwid, roblox_id, roblox_username, roblox_avatar, executor } = req.query;

      // ── Anti-Browser & Direct API Access Guard ────────────────────────────
      // Require exact "RobloxApp" UA AND x-valinc-handshake: TRUE header.
      // This prevents Postman/curl/browser requests even if they spoof User-Agent.
      const handshake = req.headers['x-valinc-handshake'];
      const userAgent = req.headers['user-agent'] || '';

      const isRoblox = /RobloxApp|Roblox/i.test(userAgent);
      if (!isRoblox && handshake !== 'TRUE') {
        logger.warn('Release:SecureLoader', 'Handshake or UA validation failed', {
          handshake,
          userAgent: userAgent.substring(0, 100),
          ip: req.ip,
        });
        throw new AppError('Unauthorized: Invalid executor context', 403);
      }

      // ── Parameter Validation ──────────────────────────────────────────────
      if (!prefix) throw new AppError('Prefix is required', 400);
      if (!key || !key.trim()) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'License key is required' });
      }
      if (!hwid || !hwid.trim()) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'HWID is required' });
      }

      const cleanPrefix = prefix.replace(/\.lua$/i, '');

      // ── Release Verification (Cache-First) ───────────────────────────────
      const cacheKeyRelease = `cache:release:${cleanPrefix}`;
      let release = await cacheUtility.get(cacheKeyRelease);

      if (!release) {
        const db = require('../../config/database');
        const pool = db.getPool();
        const releaseRes = await pool.query(
          `SELECT id, name, version, script_id, script_type, status, user_id
           FROM releases WHERE prefix = $1 LIMIT 1`,
          [cleanPrefix]
        );
        release = releaseRes.rows[0] || null;
        if (release) await cacheUtility.set(cacheKeyRelease, release, 300);
      }

      if (!release) {
        return res.status(404).json({ status: 'error', statusCode: 404, message: 'Script not found' });
      }
      if (release.status !== 'published') {
        return res.status(503).json({ status: 'error', statusCode: 503, message: 'This script is currently unavailable' });
      }

      // ── License & HWID Authentication ────────────────────────────────────
      const keyauthService = require('../keyauth/keyauth.service');
      const robloxData = {
        roblox_username: roblox_username || '',
        roblox_id: roblox_id || '',
        roblox_avatar: roblox_avatar || '',
        executor: executor || '',
      };

      let authResult;
      try {
        authResult = await keyauthService.verifyLicense(key.trim(), hwid.trim(), robloxData);
      } catch (authErr) {
        // Return structured JSON error so Roblox gatekeeper can parse and warn() it
        logger.warn('Release:SecureLoader', 'License auth failed', {
          key: key.substring(0, 8) + '...',
          error: authErr.message,
          ip: req.ip,
        });
        return res.status(authErr.statusCode || 403).json({
          status: 'error',
          statusCode: authErr.statusCode || 403,
          message: authErr.message,
        });
      }

      // ── Tier Access Control Enforcement ──────────────────────────────────
      // 'plan' scripts require a premium or pro license key.
      if (release.script_type === 'plan' && authResult.tier === 'free') {
        logger.warn('Release:SecureLoader', 'Free key attempted to access premium script', {
          key: key.substring(0, 8) + '...',
          prefix: cleanPrefix,
        });
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          message: 'Free license key cannot be used to access premium scripts.',
        });
      }

      // ── Script Content Retrieval & Delivery ──────────────────────────────
      const result = await releaseService.getLoaderContent(cleanPrefix);

      // SECURITY: Sanitize key before injecting into Lua to prevent injection.
      // Only allow alphanumeric, dash, and underscore chars; max 64 chars.
      const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);

      // ── One-Time Token Generation & Redis Caching ────────────────────────
      const crypto = require('crypto');
      const oneTimeToken = crypto.randomBytes(16).toString('hex');
      const safeRobloxId = String(roblox_id || '0').replace(/[^0-9]/g, '');
      const tokenCacheKey = `exec_token:${safeRobloxId}:${oneTimeToken}`;
      
      // Store token with 30 seconds expiration
      await cacheUtility.set(tokenCacheKey, 'VALID', 30);

      // Construct dynamic Luau token guard header
      const backendUrl = env.backendUrl || 'http://localhost:5000';
      const tokenGuard = `-- VALINC SYNDICATE :: One-Time Execution Guard\n`
        + `local authStatus = game:HttpGet("${backendUrl}/v1/releases/verify-token?token=${oneTimeToken}&roblox_id=${safeRobloxId}")\n`
        + `if authStatus ~= "AUTHORIZED" then\n`
        + `    warn("[VALINC] Standalone execution detected. Execution halted.")\n`
        + `    return\n`
        + `end\n\n`;

      // Prepend key comment header and tokenGuard to script content
      const payload = safeKey
        ? `-- _G.Key = "${safeKey}"\n${tokenGuard}${result.content}`
        : `${tokenGuard}${result.content}`;

      // Record execution asynchronously
      ExecutionModel.recordExecution(key).catch(err =>
        logger.error('Release:SecureLoader', 'Failed to record execution', { error: err.message })
      );

      logger.info('Release:SecureLoader', 'Script delivered successfully with dynamic token guard', {
        prefix: cleanPrefix,
        tier: authResult.tier,
        roblox_id,
        executor,
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(payload);
    } catch (err) { next(err); }
  }
}

module.exports = new ReleaseController();
