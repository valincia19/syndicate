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
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new AppError('Password must contain at least one letter and one number', 400);
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
   * Send Email Verification Code (simulated)
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

    // Log delivery (NEVER include the code itself, even in dev)
    if (env.nodeEnv !== 'production') {
      logger.info('Service:Auth:Email', 'Verification code generated (simulated send)', {
        to: user.email,
        expiresIn: '10 minutes',
      });
    }

    return {
      message: 'Verification code generated and sent (simulated)',
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

    if (cachedCode !== code.trim()) {
      throw new AppError('Invalid verification code', 400);
    }

    // Mark user as verified in DB
    await UserModel.update(userId, {
      verified: 1,
    });

    // Clear verification code from Redis
    await redis.del(`verify_code:${userId}`);

    return {
      message: 'Email verified successfully',
    };
  }
}

module.exports = new AuthService();
