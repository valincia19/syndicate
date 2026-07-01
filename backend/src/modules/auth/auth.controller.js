/**
 * Auth Controller Layer
 * Handles HTTP requests and responses for authentication
 */

const authService = require('./auth.service');
const logger = require('../../config/logger');
const { AppError } = require('../../middleware/errorHandler.middleware');

// Cookie options helper - consistent across all auth endpoints
// Logic: jika COOKIE_DOMAIN di-set (production), anggap HTTPS dan pakai Secure flag.
// Ini memutus ketergantungan pada NODE_ENV yang sering lupa diupdate.
function getAuthCookieOptions(env) {
  const hasProductionDomain = !!(env.cookieDomain && !env.cookieDomain.includes('localhost'));
  const isProduction = env.nodeEnv === 'production' || hasProductionDomain;
  const sameSiteMode = env.cookieSameSite || (isProduction ? 'none' : 'lax');
  // SameSite=None WAJIB Secure=true atau browser akan drop cookie
  const needsSecure = sameSiteMode.toLowerCase() === 'none';

  const options = {
    httpOnly: true,
    secure: isProduction || needsSecure,
    sameSite: sameSiteMode,
    maxAge: 15 * 60 * 1000, // 15 minutes — mirrors JWT_EXPIRES_IN
    path: '/',
  };

  if (env.cookieDomain) {
    options.domain = env.cookieDomain;
  }

  return options;
}

/**
 * Cookie options for the long-lived refresh token.
 * HttpOnly + Secure + narrow path (/v1/auth/refresh) to reduce attack surface.
 */
function getRefreshCookieOptions(env) {
  const hasProductionDomain = !!(env.cookieDomain && !env.cookieDomain.includes('localhost'));
  const isProduction = env.nodeEnv === 'production' || hasProductionDomain;
  const sameSiteMode = env.cookieSameSite || (isProduction ? 'none' : 'lax');
  const needsSecure = sameSiteMode.toLowerCase() === 'none';

  const options = {
    httpOnly: true,
    secure: isProduction || needsSecure,
    sameSite: sameSiteMode,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — mirrors REFRESH_TOKEN_EXPIRES_IN
    path: '/',
  };

  if (env.cookieDomain) {
    options.domain = env.cookieDomain;
  }

  return options;
}

// Helper to resolve the correct frontend URL dynamically from environment or request headers
function getFrontendUrl(req, env) {
  if (env.frontendUrl && !env.frontendUrl.includes('localhost')) {
    return env.frontendUrl.replace(/\/+$/, '');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  if (host.includes('api.')) {
    return `${proto}://${host.replace('api.', '')}`;
  }
  return env.frontendUrl || `${proto}://${host}`;
}

// Helper to resolve the correct backend URL dynamically
function getBackendUrl(req, env) {
  if (env.backendUrl && !env.backendUrl.includes('localhost')) {
    return env.backendUrl.replace(/\/+$/, '');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return env.backendUrl || `${proto}://${host}`;
}

class AuthController {
  /**
   * Register new user
   * POST /v1/auth/register
   */
  async register(req, res, next) {
    try {
      const userData = req.body;
      const result = await authService.register(userData);
      const { token, refreshToken, user } = result;
      const env = require('../../config/env');

      logger.info('Auth:Register', `User registered successfully: email=${user.email} username=${user.username || 'N/A'} id=${user.id}`);

      res.cookie('auth_token', token, getAuthCookieOptions(env));
      res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(env));

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'User registered successfully',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Login user
   * POST /v1/auth/login
   */
  async login(req, res, next) {
    try {
      const credentials = req.body;
      const result = await authService.login(credentials);
      const { token, refreshToken, user } = result;
      const env = require('../../config/env');

      logger.info('Auth:Login', `User logged in successfully: email=${user.email} username=${user.username || 'N/A'} id=${user.id}`);

      res.cookie('auth_token', token, getAuthCookieOptions(env));
      res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(env));

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Login successful',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get current user profile
   * GET /v1/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id; // From auth middleware
      const env = require('../../config/env');
      const { user, token, refreshToken } = await authService.getProfile(userId);

      let inDiscordGuild = false;
      if (user.discord_id) {
        inDiscordGuild = await authService.checkDiscordMembership(user.discord_id);
      }

      // Rotate both cookies on profile fetch so tokens stay fresh
      res.cookie('auth_token', token, getAuthCookieOptions(env));
      res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(env));

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            ...user,
            in_discord_guild: inDiscordGuild
          },
          token
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Redirect to Discord OAuth2 URL
   * GET /v1/auth/discord
   */
  async discordRedirect(req, res, next) {
    try {
      const env = require('../../config/env');
      const crypto = require('crypto');
      const { getRedis } = require('../../config/redis');
      
      const clientId = env.discord.clientId;
      let targetRedirect = env.discord.redirectUri;
      if (!targetRedirect || targetRedirect.includes('localhost')) {
        targetRedirect = `${getBackendUrl(req, env)}/v1/auth/discord/callback`;
      }
      const redirectUri = encodeURIComponent(targetRedirect);
      
      const state = crypto.randomBytes(32).toString('hex');
      
      const redis = getRedis();
      if (redis) {
        await redis.set(`discord_state:${state}`, 'valid', { ex: 600 });
      } else {
        // SECURITY: Fail closed - never bypass state validation. CSRF protection
        // is critical; degraded service is preferable to a vulnerable one.
        logger.error('Auth:Discord', 'Redis unavailable - Discord login disabled (fail-closed)');
        throw new AppError('Discord login temporarily unavailable. Please try again later.', 503);
      }
      
      // guilds.join scope is required so the bot can add the user to the configured guild
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email%20guilds.join&state=${state}`;
      
      res.redirect(discordAuthUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Discord OAuth2 Callback
   * GET /v1/auth/discord/callback
   */
  async discordCallback(req, res, next) {
    const env = require('../../config/env');
    const targetFrontend = getFrontendUrl(req, env);
    let targetRedirect = env.discord.redirectUri;
    if (!targetRedirect || targetRedirect.includes('localhost')) {
      targetRedirect = `${getBackendUrl(req, env)}/v1/auth/discord/callback`;
    }
    try {
      const { code, state } = req.query;
      const { getRedis } = require('../../config/redis');
      
      if (!code) {
        return res.redirect(`${targetFrontend}/login?error=discord_code_missing`);
      }
      
      const redis = getRedis();
      if (!redis) {
        // SECURITY: Fail closed - never bypass state validation. If Redis went down
        // between redirect and callback, reject the request rather than skip CSRF check.
        logger.error('Auth:Discord:Callback', 'Redis unavailable - OAuth callback rejected (fail-closed)');
        return res.status(503).json({ status: 'error', message: 'Authentication service temporarily unavailable' });
      }

      if (!state) {
        return res.status(403).json({ status: 'error', message: 'Missing OAuth state parameter' });
      }

      const stateKey = `discord_state:${state}`;
      const isValid = await redis.get(stateKey);

      if (!isValid) {
        return res.status(403).json({ status: 'error', message: 'Invalid or expired OAuth state' });
      }

      await redis.del(stateKey);
      
      const { token, user, refreshToken } = await authService.discordLogin(code, targetRedirect);
      logger.info('Auth:Discord', `Discord OAuth login successful: email=${user?.email || 'N/A'} username=${user?.username || 'N/A'} id=${user?.id || 'N/A'}`);
      
      res.cookie('auth_token', token, getAuthCookieOptions(env));
      res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(env));
      
      res.redirect(`${targetFrontend}/callback?token=${token}`);
    } catch (error) {
      logger.error('Auth:Discord', 'OAuth callback error', { error: error.message });
      res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(error.message || 'discord_auth_failed')}`);
    }
  }

  /**
   * Logout user - clear auth cookie
   * POST /v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const env = require('../../config/env');
      const clearOptions = getAuthCookieOptions(env);
      delete clearOptions.maxAge;

      const clearRefreshOptions = getRefreshCookieOptions(env);
      delete clearRefreshOptions.maxAge;

      res.clearCookie('auth_token', clearOptions);
      res.clearCookie('refresh_token', clearRefreshOptions);
      
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Silent token refresh
   * POST /v1/auth/refresh
   *
   * Reads the `refresh_token` httpOnly cookie, verifies it, fetches the user
   * from the database, and issues a fresh access token + new refresh token
   * (token rotation). No request body is required.
   */
  async refresh(req, res, next) {
    try {
      const env = require('../../config/env');
      const { AppError } = require('../../middleware/errorHandler.middleware');

      const incomingRefreshToken = req.cookies?.refresh_token;
      if (!incomingRefreshToken) {
        throw new AppError('No refresh token provided', 401);
      }

      // Verify the refresh token (throws AppError 401 if invalid/expired)
      const userId = authService.verifyRefreshToken(incomingRefreshToken);

      // Fetch the current user to embed up-to-date claims
      const { user, token, refreshToken } = await authService.getProfile(userId);

      let inDiscordGuild = false;
      if (user.discord_id) {
        inDiscordGuild = await authService.checkDiscordMembership(user.discord_id);
      }

      logger.info('Auth:Refresh', `Token rotated successfully for userId=${userId}`);

      // Rotate both cookies: new short-lived access token + new long-lived refresh token
      res.cookie('auth_token', token, getAuthCookieOptions(env));
      res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(env));

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Token refreshed successfully',
        data: {
          token,
          user: {
            ...user,
            in_discord_guild: inDiscordGuild
          }
        },
      });
    } catch (error) {
      next(error);
    }
  }


  /**
   * Send email verification code
   * POST /v1/auth/send-verification
   */
  async sendVerification(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.sendVerificationCode(userId);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email verification code
   * POST /v1/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Verification code is required',
        });
      }

      const result = await authService.verifyEmailCode(userId, code);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset link
   * POST /v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password using token
   * POST /v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate password reset token
   * GET /v1/auth/reset-password/validate
   */
  async validateResetToken(req, res, next) {
    try {
      const { token } = req.query;
      const result = await authService.validateResetToken(token);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
