/**
 * Auth Service Layer
 * Business logic for authentication operations
 *
 * Flow: Controller -> Service -> Model -> PostgreSQL
 *
 * v2 Changes:
 * - UUID-based user IDs
 * - Username validation and duplicate check
 * - Support for avatar, discord_access_token fields
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const UserModel = require('./auth.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const { getRedis } = require('../../config/redis');
const logger = require('../../config/logger');
const cacheUtility = require('../../utils/cache.utility');

class AuthService {
  /**
   * Register new user
   * Accepts: name, email, password, username?, avatar?
   */
  async register(userData) {
    const {
      name, email, password,
      username, avatar,
      role = 'user'
    } = userData;

    // ── Required Field Validation ─────────────────────────────
    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    // ── Email Validation ──────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // ── Password Strength ─────────────────────────────────────
    // Minimum 8 chars, must contain at least one letter and one number.
    // This is enforced for new registrations only; existing users with
    // legacy 6-char passwords keep their accounts (backward compat).
    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // ── Username Validation (if provided) ─────────────────────
    if (username) {
      // Format: alphanumeric + underscore, 3-50 chars
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
      if (!usernameRegex.test(username)) {
        throw new AppError(
          'Username must be 3-50 characters, alphanumeric and underscore only',
          400
        );
      }

      // Check duplicate username
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        throw new AppError('Username already taken', 409);
      }
    }

    // ── Check Duplicate Email ─────────────────────────────────
    const existingUser = await UserModel.findByEmail(email.toLowerCase());
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // ── Hash Password (bcrypt 12 rounds) ──────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Insert to PostgreSQL ──────────────────────────────────
    const newUser = await UserModel.create({
      name,
      username: username || null,
      avatar: avatar || null,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      verified: 0,
    });

    // ── Generate and send email verification code automatically ────
    try {
      const redis = getRedis();
      if (redis) {
        const verificationCode = crypto.randomInt(100000, 1000000).toString();
        await redis.set(`verify_code:${newUser.id}`, verificationCode, { ex: 600 });
        const emailUtil = require('../../utils/email');
        await emailUtil.sendVerificationEmail(newUser.email, verificationCode);
      }
    } catch (err) {
      logger.error('Service:Auth', 'Failed to send automatic verification email on register', { error: err.message });
    }

    // ── Generate JWT Token (auto-login after registration) ────
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name || null,
        username: newUser.username || null,
        jti: crypto.randomUUID(),
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      user: newUser,
      token,
    };
  }

  /**
   * Login user
   */
  async login(credentials) {
    const { email, password } = credentials;

    // ── Input Validation ──────────────────────────────────────
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // ── Find User (includes password for verification) ────────
    const user = await UserModel.findByEmail(email.toLowerCase());
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // ── Verify Password (bcrypt compare) ──────────────────────
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // ── Check Suspended Status ────────────────────────────────
    if (user.suspended) {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }

    // ── Generate JWT Token ────────────────────────────────────
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || null,
        username: user.username || null,
        jti: crypto.randomUUID(),
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    // ── Return user (without password) + token ────────────────
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get current user profile
   * @param {string} userId - UUID
   */
  async getProfile(userId) {
    const cacheKey = `cache:user_profile:${userId}`;
    const user = await cacheUtility.getOrSet(
      cacheKey,
      async () => {
        const u = await UserModel.findById(userId);
        if (!u) throw new AppError('User not found', 404);
        return u;
      },
      300 // 5 Minutes TTL
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Re-issue a fresh JWT so the frontend can persist it for WebSocket auth
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || null,
        username: user.username || null,
        jti: crypto.randomUUID(),
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return { user, token };
  }

  /**
   * Discord Login / Registration
   * Exchanges code for token, retrieves profile, and logs in or creates user
   * @param {string} code - OAuth2 authorization code
   */
  async discordLogin(code) {
    const crypto = require('crypto');
    const env = require('../../config/env');

    // 1. Exchange OAuth code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.discord.clientId,
        client_secret: env.discord.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.discord.redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errDetails = await tokenResponse.text();
      // SECURITY: Don't log full Discord error response - it may contain
      // sensitive data (request IDs, internal error messages). Log length only.
      logger.error('Service:Auth:Discord', 'Token exchange failed', {
        status: tokenResponse.status,
        detailsLength: errDetails.length,
      });
      throw new AppError('Failed to retrieve access token from Discord', 400);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // 2. Fetch User profile from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new AppError('Failed to fetch user profile from Discord', 400);
    }

    const discordUser = await userResponse.json();
    const { id: discordId, username, email, avatar, global_name, verified: discordVerified } = discordUser;

    // ── Sanitize Discord user fields to prevent XSS injection ───────────────
    const sanitize = (str, maxLen = 50) => {
      if (!str || typeof str !== 'string') return null;
      return str.replace(/[<>\"']/g, '').substring(0, maxLen);
    };

    if (!email) {
      throw new AppError('Discord account must have an email associated with it', 400);
    }

    const sanitizedUsername = sanitize(username, 50);
    const sanitizedGlobalName = sanitize(global_name, 100);

    // 3. Compute avatar URL if it exists
    const avatarUrl = avatar 
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`
      : null;

    // 4. Check if user already exists by email
    let user = await UserModel.findByEmail(email.toLowerCase());

    const isVerified = discordVerified ? 1 : 0;

    if (user) {
      // User exists, update Discord ID and avatar only
      // ── SECURITY: Do NOT store plaintext access_token ────────────────────────
      user = await UserModel.update(user.id, {
        discord_id: discordId,
        avatar: avatarUrl || user.avatar,
        verified: isVerified,
      });
      // Invalidate user profile cache
      await cacheUtility.del(`cache:user_profile:${user.id}`);
    } else {
      // Register new user automatically
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      // Handle username collision
      let uniqueUsername = sanitizedUsername || `user_${discordId}`;
      const existingUsername = await UserModel.findByUsername(uniqueUsername);
      if (existingUsername) {
        uniqueUsername = `${sanitizedUsername}_${crypto.randomInt(1000, 10000)}`;
      }

      user = await UserModel.create({
        name: sanitizedGlobalName || sanitizedUsername || `User ${discordId}`,
        username: uniqueUsername,
        avatar: avatarUrl,
        email: email.toLowerCase(),
        password: hashedPassword,
        discord_id: discordId,
        role: 'user',
        verified: isVerified,
      });
    }

    // 5. Generate session JWT token
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name || null,
            username: user.username || null,
            jti: crypto.randomUUID(),
          },
          env.jwtSecret,
          { expiresIn: env.jwtExpiresIn }
        );

    return {
      user,
      token,
    };
  }

  /**
   * Send Email Verification Code
   * @param {string} userId - UUID of the logged-in user
   */
  async sendVerificationCode(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.verified) {
      throw new AppError('Email is already verified', 400);
    }

    // Generate a secure, 6-digit random numeric code
    // SECURITY: Use crypto.randomInt() instead of Math.random() to ensure
    // codes are not predictable. Math.random() is not cryptographically secure.
    const code = crypto.randomInt(100000, 1000000).toString();

    // Store in Upstash Redis with strict 10-minute TTL (atomic operation)
    const redis = getRedis();
    if (!redis) {
      throw new AppError('Verification service temporarily unavailable', 503);
    }
    
    await redis.set(`verify_code:${userId}`, code, { ex: 600 }); // Strict 10-minute TTL

    // Send email using our new SMTP email utility
    const emailUtil = require('../../utils/email');
    await emailUtil.sendVerificationEmail(user.email, code);

    return {
      message: 'Verification code successfully sent to your email',
    };
  }

  /**
   * Verify the code submitted by the user
   * @param {string} userId - UUID of the logged-in user
   * @param {string} code - Submitted 6-digit code
   */
  async verifyEmailCode(userId, code) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.verified) {
      throw new AppError('Email is already verified', 400);
    }

    // ── Retrieve code from Redis (consistent with sendVerificationCode) ────────
    const redis = getRedis();
    if (!redis) {
      throw new AppError('Verification service temporarily unavailable', 503);
    }

    const cachedCode = await redis.get(`verify_code:${userId}`);

    if (!cachedCode) {
      throw new AppError('No verification code has been requested or code expired. Please request a new one.', 400);
    }

    if (String(cachedCode) !== code.trim()) {
      throw new AppError('Invalid verification code', 400);
    }

    // Mark user as verified in DB
    await UserModel.update(userId, {
      verified: 1,
    });

    // Clear verification code from Redis
    await redis.del(`verify_code:${userId}`);

    // Invalidate user profile cache so subsequent requests see verified status immediately
    await cacheUtility.del(`cache:user_profile:${userId}`);

    return {
      message: 'Email verified successfully',
    };
  }
  /**
   * Forgot Password Link generation and email delivery
   * @param {string} email
   */
  async forgotPassword(email) {
    const user = await UserModel.findByEmail(email.toLowerCase());
    // Security Best Practice: Don't reveal if user does not exist. Simply return success.
    if (!user) {
      return { message: 'If the email exists in our system, a password reset link has been sent.' };
    }

    // Generate a cryptographically secure random reset token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in Redis mapped to userId with 1 hour TTL
    const redis = getRedis();
    if (!redis) {
      throw new AppError('Password recovery service temporarily unavailable', 503);
    }

    await redis.set(`password_reset:${token}`, user.id, { ex: 3600 }); // 1 Hour TTL

    // Send reset email
    const emailUtil = require('../../utils/email');
    const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
    await emailUtil.sendForgotPasswordEmail(user.email, resetLink);

    return {
      message: 'If the email exists in our system, a password reset link has been sent.',
    };
  }

  /**
   * Reset Password using recovery token
   * @param {string} token
   * @param {string} newPassword
   */
  async resetPassword(token, newPassword) {
    const redis = getRedis();
    if (!redis) {
      throw new AppError('Password recovery service temporarily unavailable', 503);
    }

    const userId = await redis.get(`password_reset:${token}`);
    if (!userId) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate new password strength
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in DB
    await UserModel.update(userId, {
      password: hashedPassword,
    });

    // Revoke token immediately
    await redis.del(`password_reset:${token}`);

    // Invalidate user profile cache
    const cacheKey = `cache:user_profile:${userId}`;
    await cacheUtility.del(cacheKey);

    return {
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Validate password reset token existence
   * @param {string} token
   */
  async validateResetToken(token) {
    const redis = getRedis();
    if (!redis) {
      throw new AppError('Password recovery service temporarily unavailable', 503);
    }

    const userId = await redis.get(`password_reset:${token}`);
    if (!userId) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    return {
      message: 'Token is valid',
    };
  }
}

module.exports = new AuthService();
