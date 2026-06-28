/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 * 
 * Token sources (checked in order):
 * 1. Authorization: Bearer <token> header (primary)
 * 2. auth_token cookie (fallback - httpOnly cookie for XSS protection)
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./errorHandler.middleware');
const logger = require('../config/logger');
const UserModel = require('../modules/auth/auth.model');
const cacheUtility = require('../utils/cache.utility');

const authenticateToken = async (req, res, next) => {
  const httpMethod = req.method;
  const path = req.originalUrl || req.path;
  const context = 'MIDDLEWARE:AUTH';

  try {
    let token = null;
    let source = 'none';

    // 1. Try Authorization header (primary method)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      source = 'header';
    }

    // 2. Fallback: httpOnly cookie (automatically sent by browser)
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      source = 'cookie';
    }

    if (!token) {
      logger.warn(context, 'Access denied: No authentication token provided', {
        httpMethod,
        path,
        tokenStatus: 'missing',
        decision: 'REJECT_AND_REDIRECT',
      });
      throw new AppError('No token provided. Please login.', 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn(context, 'Access denied: Authentication token has expired', {
          httpMethod,
          path,
          tokenSource: source,
          tokenStatus: 'expired',
          decision: 'REJECT_AND_REDIRECT',
        });
        throw new AppError('Token expired. Please login again.', 401);
      }
      logger.warn(context, 'Access denied: Authentication token is invalid', {
        httpMethod,
        path,
        tokenSource: source,
        tokenStatus: 'invalid',
        decision: 'REJECT_AND_REDIRECT',
      });
      throw new AppError('Invalid token. Please login again.', 401);
    }

    // Fetch latest user status from Redis cache / DB (5 min TTL)
    const cacheKey = `cache:user_profile:${decoded.id}`;
    const user = await cacheUtility.getOrSet(
      cacheKey,
      async () => {
        return UserModel.findById(decoded.id);
      },
      300
    );

    // ── SECURITY ENFORCEMENT: Account existence & suspension checks ────────
    if (!user) {
      logger.warn(context, `Access denied: User ID ${decoded.id} no longer exists`, {
        httpMethod,
        path,
        userId: decoded.id,
        decision: 'REJECT_AND_REDIRECT',
      });
      throw new AppError('Account no longer exists.', 401);
    }

    const isSuspended = Number(user.suspended) === 1 || Boolean(user.suspended) === true || user.suspended == 1;
    if (isSuspended) {
      await cacheUtility.del(cacheKey);
      logger.warn(context, `Access denied: Account suspended for email=${user.email}`, {
        httpMethod,
        path,
        userId: user.id,
        email: user.email,
        decision: 'REJECT_SUSPENDED',
      });
      throw new AppError('Your account has been suspended.', 403);
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || null,
      username: user.username || null,
      verified: Boolean(user.verified === true || user.verified === 1 || user.verified == 1),
      discord_id: user.discord_id || null,
    };

    logger.info(context, `Protected route access granted for email=${user.email}`, {
      httpMethod,
      path,
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenSource: source,
      decision: 'ALLOW',
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

// Email verification requirement middleware
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  // Bypass email verification for Discord-linked users or verified users
  if (!req.user.verified && !req.user.discord_id) {
    return next(new AppError('Email verification required. Please verify your email first.', 403));
  }

  next();
};

module.exports = { authenticateToken, authorizeRoles, requireEmailVerified };
