# VALINC SYNDICATE — Security Audit #4 (2026-06-28)

## Executive Summary
- Severity: 0 CRITICAL, 0 HIGH, 6 MEDIUM, 0 LOW
- Files audited: 30+ across backend + frontend
- Risk level: LOW (codebase well-maintained from prior audits)
- All 6 findings remediated with surgical patches

## Findings & Remediations

### M1: Error handler logs stack traces for 4xx errors
- File: `backend/src/middleware/errorHandler.middleware.js`
- Issue: 401/403/404 errors logged with full stack traces, creating noise
- Fix (Pattern D3): Stack trace only included for 5xx errors via conditional spread
- Status: FIXED

### M2: Voucher service dead code — cache invalidation unreachable
- File: `backend/src/modules/vouchers/vouchers.service.js`
- Issue: `return VoucherModel.create(...)` made `cacheUtility.del()` unreachable
- Fix: Store result in variable, invalidate cache, then return
- Status: FIXED

### M3: Math.random() for Discord username collision suffix
- File: `backend/src/modules/auth/auth.service.js`
- Issue: `Math.floor(1000 + Math.random() * 9000)` is not cryptographically secure
- Fix (Pattern I): Replaced with `crypto.randomInt(1000, 10000)`
- Status: FIXED

### M4: NOWPayments IPN signature comparison not timing-safe
- File: `backend/src/modules/payment/nowpayments.service.js`
- Issue: `expected === signature` vulnerable to timing attacks
- Fix: Replaced with `crypto.timingSafeEqual()` on Buffer comparison
- Status: FIXED

### M5: Missing rate limiters on public endpoints
- File: `backend/index.js`
- Issue: `/v1/releases/public` and `/v1/releases/game-info/:gameId` had no rate limiter
- Fix (Pattern B): Added `createRateLimiter` with 30 req/min and 20 req/min respectively
- Status: FIXED

### M6: JWT tokens missing jti claim for revocation support
- File: `backend/src/modules/auth/auth.service.js`
- Issue: All 4 `jwt.sign()` calls (register, login, getProfile, discordLogin) lacked `jti` claim
- Fix (Pattern O): Added `jti: crypto.randomUUID()` to all JWT payloads
- Status: FIXED

## Files Modified
1. `backend/src/middleware/errorHandler.middleware.js` — conditional stack trace
2. `backend/src/modules/vouchers/vouchers.service.js` — cache invalidation fix
3. `backend/src/modules/auth/auth.service.js` — crypto.randomInt + 4x jti
4. `backend/src/modules/payment/nowpayments.service.js` — timing-safe comparison
5. `backend/index.js` — rate limiters on public endpoints