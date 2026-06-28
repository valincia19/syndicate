# 🔍 VALINC SYNDICATE - Comprehensive Security & Code Quality Audit
**Audit Date:** June 23, 2026  
**Auditor:** Kiro (Hermes Agent)  
**Scope:** Backend (Express.js) + Frontend (Next.js 16)  
**Total Files Audited:** Backend: 12 JS files (1,346 LOC) | Frontend: 96 TS/TSX files

---

## 📊 Executive Summary

**Critical Issues:** 2  
**High Severity:** 2  
**Medium Severity:** 5  
**Low Severity:** 3  
**Total Findings:** 12

**Risk Level:** 🔴 **HIGH** - Critical runtime crash bug and security vulnerabilities require immediate attention.

---

## 🚨 CRITICAL ISSUES (Immediate Action Required)

### 1. **Undefined Variable Causes Runtime Crash in Email Verification** 
**Severity:** 🔴 CRITICAL  
**Impact:** Complete feature failure, 500 errors on `/v1/auth/verify-email`  
**Location:** `backend/src/modules/auth/auth.service.js:316, 323, 337`

**Description:**
The `verifyEmailCode()` method references an undefined `verificationCodes` Map variable:
```javascript
const cachedData = verificationCodes.get(userId);  // ❌ ReferenceError
```

The `sendVerificationCode()` method correctly stores codes in **Redis** (line 285), but `verifyEmailCode()` tries to read from a **non-existent in-memory Map**.

**Reproduction:**
1. User calls `/v1/auth/send-verification` → code saved to Redis ✅
2. User submits code to `/v1/auth/verify-email` → crashes with `ReferenceError: verificationCodes is not defined` ❌

**Fix:**
Replace lines 316-337 in `auth.service.js`:
```javascript
// BEFORE (BROKEN)
const cachedData = verificationCodes.get(userId);

// AFTER (FIXED)
const redis = getRedis();
if (!redis) {
  throw new AppError('Verification service temporarily unavailable', 503);
}
const cachedCode = await redis.get(`verify_code:${userId}`);
if (!cachedCode) {
  throw new AppError('No verification code has been requested or code expired', 400);
}
if (cachedCode !== code.trim()) {
  throw new AppError('Invalid verification code', 400);
}
// Mark verified
await UserModel.update(userId, { verified: 1 });
// Delete code from Redis
await redis.del(`verify_code:${userId}`);
```

---

### 2. **SQL Injection Vulnerability in Dynamic UPDATE Query**
**Severity:** 🔴 CRITICAL  
**Impact:** Database compromise, privilege escalation, data exfiltration  
**Location:** `backend/src/modules/auth/auth.model.js:191-194`

**Description:**
The `UserModel.update()` method constructs SQL queries by interpolating **unvalidated field names** directly from user input:

```javascript
async update(id, updateData) {
  const fields = Object.keys(updateData);  // ❌ User-controlled
  const setClause = fields.map(f => `${f} = ?`).join(', ');  // ❌ Direct interpolation
  await pool.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
}
```

**Attack Vector:**
An attacker can inject SQL by passing malicious field names:
```javascript
await UserModel.update('victim-uuid', {
  'role = "owner" WHERE id = "attacker-uuid"; --': 'dummy'
});
```

**Fix:**
Whitelist allowed fields:
```javascript
async update(id, updateData) {
  const ALLOWED_FIELDS = ['name', 'username', 'avatar', 'email', 'discord_access_token', 'discord_id', 'role', 'verified', 'password'];
  const fields = Object.keys(updateData).filter(f => ALLOWED_FIELDS.includes(f));
  
  if (fields.length === 0) return this.findById(id);
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updateData[f]);
  await pool.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
  return this.findById(id);
}
```

---

## ⚠️ HIGH SEVERITY ISSUES

### 3. **Plaintext OAuth Token Storage in Database**
**Severity:** 🟠 HIGH  
**Impact:** Account takeover if database is breached  
**Location:** `backend/src/modules/auth/auth.service.js:88, 215, 238`

**Description:**
Discord `access_token` (OAuth credential) is stored in plaintext in the `discord_access_token` column. If the database is compromised, attackers gain full Discord API access for all users.

**Fix:**
- **Option A (Recommended):** Don't store access tokens - use session tokens only
- **Option B:** Encrypt tokens with AES-256-GCM before storage (use `crypto.createCipheriv`)
- **Option C:** Store only Discord ID and re-authenticate via refresh token when needed

---

### 4. **Production Middleware Exposes Internal State via console.log**
**Severity:** 🟠 HIGH  
**Impact:** Information disclosure, token leakage in logs  
**Location:** `frontend/src/middleware.ts:8, 13, 23`

**Description:**
Next.js middleware logs sensitive routing decisions and token prefixes to console:
```typescript
console.log(`[Middleware] Path: ${pathname} | Token present: ${!!token} | Token: ${token ? token.substring(0, 15) + '...' : 'none'}`);
```

This exposes:
- Protected route patterns
- Token existence per request
- Partial token values (first 15 chars)

**Fix:**
Replace with proper structured logging:
```typescript
import { logger } from '@/lib/logger'
logger.debug('MIDDLEWARE', 'Route guard triggered', { pathname, hasToken: !!token })
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 5. **XSS-Vulnerable Cookie Configuration**
**Severity:** 🟡 MEDIUM  
**Location:** `backend/src/modules/auth/auth.controller.js:142-147`

**Description:**
Auth cookie is set with `httpOnly: false`, making it readable by JavaScript:
```javascript
res.cookie('auth_token', token, {
  httpOnly: false,  // ❌ XSS attack vector
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

Comment acknowledges this is a deliberate trade-off to allow frontend token management, but it violates security best practices.

**Fix:**
Implement server-side logout endpoint:
```javascript
// backend/src/modules/auth/auth.routes.js
router.post('/logout', authenticateToken, authController.logout.bind(authController));

// auth.controller.js
async logout(req, res, next) {
  res.clearCookie('auth_token', { path: '/', sameSite: 'strict' });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
}
```

Then set `httpOnly: true` on the cookie.

---

### 6. **Missing Rate Limiting on Verification Endpoints**
**Severity:** 🟡 MEDIUM  
**Location:** `backend/src/modules/auth/auth.routes.js:19-20`

**Description:**
Email verification endpoints lack additional rate limiting:
- `/v1/auth/send-verification` - Can spam email codes
- `/v1/auth/verify-email` - Can brute-force 6-digit codes (1M combinations)

Global rate limiter (100 req/15min) is insufficient for these sensitive endpoints.

**Fix:**
Add endpoint-specific rate limiters:
```javascript
const verifyRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 3,  // 3 attempts per 10min
  message: 'Too many verification attempts. Try again in 10 minutes.',
});

router.post('/send-verification', authenticateToken, verifyRateLimiter, ...);
router.post('/verify-email', authenticateToken, verifyRateLimiter, ...);
```

---

### 7. **Weak Password Policy**
**Severity:** 🟡 MEDIUM  
**Location:** `backend/src/modules/auth/auth.service.js:49-52`

**Description:**
Password validation regex only requires:
- 8+ characters
- 1 uppercase, 1 lowercase, 1 number

Missing: special character requirement (`!@#$%^&*`)

**Fix:**
```javascript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  throw new AppError(
    'Password must contain at least one uppercase letter, lowercase letter, number, and special character (@$!%*?&)',
    400
  );
}
```

---

### 8. **No CSRF Protection**
**Severity:** 🟡 MEDIUM  
**Location:** Backend: missing CSRF middleware

**Description:**
Backend API has no CSRF token validation. While frontend uses `SameSite=Strict` cookies, this alone doesn't protect against:
- Subdomain attacks
- Browser bugs
- User configuration changes

**Fix:**
Implement CSRF tokens:
```bash
npm install csurf
```

```javascript
// backend/index.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Send CSRF token to frontend on auth
app.get('/v1/auth/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

### 9. **Insufficient Input Validation on Discord OAuth**
**Severity:** 🟡 MEDIUM  
**Location:** `backend/src/modules/auth/auth.service.js:196-206`

**Description:**
Discord user profile fields (`username`, `global_name`, `avatar`) are used without sanitization:
```javascript
const { id: discordId, username, email, avatar, global_name } = discordUser;
```

Malicious Discord usernames could contain:
- XSS payloads (if rendered unsafely in frontend)
- SQL injection patterns
- Unicode exploits (RTL override, zero-width chars)

**Fix:**
Sanitize all Discord fields:
```javascript
const sanitize = (str) => str ? str.replace(/[<>\"']/g, '').substring(0, 100) : null;

const username = sanitize(discordUser.username);
const global_name = sanitize(discordUser.global_name);
```

---

## 🔵 LOW SEVERITY ISSUES

### 10. **Insecure JWT Secret Fallback**
**Severity:** 🔵 LOW  
**Location:** `backend/src/config/env.js:61`

**Description:**
In development, if `JWT_SECRET` is missing, the app falls back to a hardcoded insecure secret:
```javascript
env.jwtSecret = 'default-insecure-secret-change-me';
```

While dev-only, this creates a false sense of security and could accidentally leak to production if env vars fail.

**Fix:**
Fail hard instead:
```javascript
if (!env.jwtSecret) {
  throw new Error('FATAL: JWT_SECRET is required. Set it in .env file.');
}
```

---

### 11. **Excessive console.log Usage**
**Severity:** 🔵 LOW  
**Location:** `backend/src/**/*.js` (37 occurrences)

**Description:**
Backend uses raw `console.log` instead of structured logging. This makes:
- Production debugging harder (no log levels)
- Log aggregation tools ineffective (no JSON format)
- Sensitive data leakage possible

**Fix:**
Implement Winston or Pino logger:
```bash
npm install pino pino-pretty
```

```javascript
// src/config/logger.js
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
module.exports = logger;

// Usage
logger.info({ userId, email }, 'User logged in');
logger.error({ error: err.message }, 'Database connection failed');
```

---

### 12. **Frontend Path Alias Inconsistency**
**Severity:** 🔵 LOW  
**Location:** Frontend codebase

**Description:**
Frontend uses `@/` path alias inconsistently. Some files use relative imports (`../../components`), others use alias (`@/components`).

**Fix:**
Run ESLint rule:
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": ["../**/components", "../*/lib"]
    }]
  }
}
```

---

## 📋 Code Quality Observations

### Positive Patterns ✅
1. **Modular Architecture** - Clean Routes → Controller → Service → Model separation
2. **Connection Pooling** - Proper pg pool with keepalive
3. **TLS Enforcement** - PostgreSQL SSL configured correctly
4. **Input Validation** - Zod schemas on frontend, regex validation on backend
5. **Graceful Shutdown** - SIGTERM/SIGINT handlers properly implemented

### Anti-Patterns ⚠️
1. **Mixed async/await and callbacks** - Inconsistent promise handling
2. **No TypeScript on backend** - Harder to catch type errors early
3. **No unit tests** - Zero test coverage on critical auth flows
4. **Hardcoded config values** - Magic numbers (bcrypt rounds, token expiry) not in env
5. **No API versioning** - `/v1/auth` will be hard to deprecate later

---

## 🛠️ Recommended Immediate Actions

### Priority 1 (Critical - Fix Today)
1. ✅ Fix `verificationCodes` undefined bug in `auth.service.js`
2. ✅ Add field whitelist to `UserModel.update()` to prevent SQL injection
3. ✅ Remove console.log from `middleware.ts`

### Priority 2 (High - Fix This Week)
4. ✅ Encrypt or remove Discord access_token from database
5. ✅ Set `httpOnly: true` on auth cookie + implement `/logout` endpoint
6. ✅ Add rate limiting to verification endpoints

### Priority 3 (Medium - Fix This Month)
7. ✅ Strengthen password policy (require special chars)
8. ✅ Implement CSRF protection
9. ✅ Sanitize Discord OAuth profile data

### Priority 4 (Low - Technical Debt)
10. ✅ Remove insecure JWT fallback
11. ✅ Replace console.log with structured logger
12. ✅ Enforce `@/` path alias via ESLint

---

## 📊 Metrics

| Category | Count | Status |
|----------|-------|--------|
| Security Vulnerabilities | 7 | 🔴 Action Required |
| Code Quality Issues | 3 | 🟡 Improvement Needed |
| Design Patterns | 2 | 🟢 Good |
| Total LOC Audited | 1,346 (backend) + ~5,000 (frontend) | ✅ Complete |
| Test Coverage | 0% | ❌ None |

---

## 🔐 Security Checklist for Production

- [ ] All CRITICAL issues fixed
- [ ] All HIGH issues fixed
- [ ] HTTPS enforced (HSTS header active)
- [ ] Database credentials rotated
- [ ] JWT_SECRET is cryptographically random (32+ bytes)
- [ ] Redis AUTH enabled
- [ ] CORS origins restricted to production domain only
- [ ] Rate limiting tuned for production traffic
- [ ] Logging configured (no console.log in prod)
- [ ] Error messages don't leak stack traces
- [ ] CSP headers prevent inline scripts
- [ ] Dependency audit clean (`npm audit`)

---

**End of Report**  
Generated by Kiro (Hermes Agent) - June 23, 2026
