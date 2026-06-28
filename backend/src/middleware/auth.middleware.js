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
  try {
    let token = null;
    let source = 'none';
    
    logger.debug('AuthMiddleware', 'Incoming request', { 
      path: req.path, 
      hasAuthHeader: !!req.headers.authorization,
      hasCookie: !!(req.cookies && req.cookies.auth_token),
    });
    
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
      logger.debug('AuthMiddleware', 'No token found', { path: req.path });
      throw new AppError('No token provided. Please login.', 401);
    }
    
    // Verify token
    const decoded = jwt.verify(token, env.jwtSecret);
    
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
      throw new AppError('Account no longer exists.', 401);
    }

    const isSuspended = Number(user.suspended) === 1 || Boolean(user.suspended) === true || user.suspended == 1;
    if (isSuspended) {
      await cacheUtility.del(cacheKey);
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
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please login again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again.', 401));
    }
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
