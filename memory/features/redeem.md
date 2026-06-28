---
id: redeem
type: feature
status: review_required
tags: [redeem, activation, license, race-condition, security]
---

# Redeem Module — License Key Activation

> **Module path:** `backend/src/modules/redeem/`
> **Files:** `redeem.routes.js`, `redeem.controller.js`, `redeem.service.js`, `redeem.model.js`
> **Audit date:** 2026-06-26

---

## Current Architecture

```
Client                    Backend                      PostgreSQL
  │                         │                            │
  │ POST /redeem            │                            │
  │ { code: "ABCD-..." }   │                            │
  ├────────────────────────►│                            │
  │                         ├── RedeemModel.findByCode() │
  │                         ├───────────────────────────►│
  │                         │◄── { status: "unused" } ──┤
  │                         │                            │
  │                         ├── LicenseModel.create()    │
  │                         ├───────────────────────────►│
  │                         │◄── { license_id } ────────┤
  │                         │                            │
  │                         ├── RedeemModel.markUsed()   │
  │                         ├───────────────────────────►│
  │                         │◄── OK ────────────────────┤
  │                         │                            │
  │◄── { license, code } ───┤                            │
```

---

## 🔴 CRITICAL: Race Condition — No DB Transaction Isolation

### Code Analysis

```javascript
// redeem.service.js lines 60-93 - THE RACE WINDOW
async redeem(codeText, userId) {
  // ⚠️ Step 1: READ code WITHOUT row-level lock
  const code = await RedeemModel.findByCode(codeText.trim().toUpperCase());
  //                    ↑ NO "SELECT ... FOR UPDATE"
  //                    ↑ This is just a regular SELECT

  // ⚠️ Step 2: CHECK status — still outside transaction
  if (code.status === 'used') {
    throw new AppError('This redeem code has already been used', 400);
  }

  // ⚠️ Step 3: WRITE — creates license + marks code as "used"
  //        THIS IS 2 SEPARATE AUTO-COMMIT QUERIES
  const license = await LicenseModel.create({ ... });
  await RedeemModel.markUsed(code.id, userId);
}
```

### The Race Window (Δt → 0)

```
Time  ───────────────────────────────────────────────────────►

Request A                         Request B
  │                                 │
  ├─ SELECT (status = "unused")     │
  │  ✓ Code looks good              │
  │                                 │
  │                                 ├─ SELECT (status = "unused")
  │                                 │  ✓ Code looks good  ← RACE!
  │                                 │
  ├─ INSERT INTO licenses           │
  │  License #1 created             │
  │                                 │
  │                                 ├─ INSERT INTO licenses
  │                                 │  License #2 created
  │                                 │
  ├─ UPDATE status = "used"         │
  │                                 ├─ UPDATE status = "used"
  │                                 │  Already "used" (no conflict)

RESULT: 1 redeem code → 2+ active licenses issued
        Revenue loss: 100% × (illegal_activations - 1)
```

### Why This Works (`node-postgres` Pool)

```javascript
// database.js — connection pool
const pool = new Pool({ max: 20 });
// Each pool.query() may use a DIFFERENT connection
// Auto-commit mode means each query is its own transaction

await pool.query('SELECT * FROM redeem_codes WHERE code = $1', [code]);
//   ↑ Connection #3 from pool, auto-committed immediately

await pool.query('INSERT INTO licenses (...) VALUES (...)', [...]);
//   ↑ Connection #7 from pool, auto-committed immediately
//   ↑ There is NO link between the SELECT and INSERT queries
```

---

## Mitigation Approach 1: Row-Level Locking (PostgreSQL)

```javascript
// ✅ Atomic redeem with FOR UPDATE row lock
const { getPool } = require('../../config/database');

async redeem(codeText, userId) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // SELECT with row-level lock — blocks concurrent requests
    const result = await client.query(
      `SELECT * FROM redeem_codes 
       WHERE code = $1 
       FOR UPDATE`,  // ← KEY: Locks this row until COMMIT
      [codeText.trim().toUpperCase()]
    );

    const code = result.rows[0];
    if (!code) {
      await client.query('ROLLBACK');
      throw new AppError('Invalid redeem code', 404);
    }

    if (code.status === 'used') {
      await client.query('ROLLBACK');
      throw new AppError('This code has already been used', 400);
    }

    // Generate license
    const licenseId = crypto.randomUUID();
    const licenseKey = generateLicenseKey(); // SYNDICATE-XXXXXXXXXX

    await client.query(
      `INSERT INTO licenses (id, license_key, user_id, tier, status, expires_at)
       VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP + INTERVAL '30 days')`,
      [licenseId, licenseKey, userId, code.tier || 'premium']
    );

    // Mark code as used
    await client.query(
      `UPDATE redeem_codes 
       SET status = 'used', used_by = $1, used_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, code.id]
    );

    // Commit — releases the row lock
    await client.query('COMMIT');

    return { licenseId, licenseKey };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Lock Behavior

```
Client A: BEGIN → SELECT ... FOR UPDATE (locks row)
Client B: BEGIN → SELECT ... FOR UPDATE (BLOCKS — wait for A)
           ...
Client A: COMMIT (releases lock)
           ...
Client B: WAKES UP → reads row → status = "used" → ROLLBACK
           → Returns "Code already used"
```

---

## Mitigation Approach 2: Advisory Lock (lighter weight)

```javascript
// PostgreSQL advisory lock — no physical row locking
async redeem(codeText, userId) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Application-level lock keyed on code hash
    const lockKey = hashCode('redeem:' + codeText);
    // PostgreSQL bigint advisory lock
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);
    // ← Lock acquired, all other requests to this same code will wait here

    // Now safe to do read-check-write
    const result = await client.query(
      `SELECT * FROM redeem_codes WHERE code = $1`,
      [codeText.trim().toUpperCase()]
    );
    // ... rest of logic ...

    await client.query('COMMIT');
    // Lock auto-released when transaction commits
  } catch (err) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}
```

---

## Additional Edge Cases

### Edge Case 1: User-Agent + IP Session Blocking

```javascript
// Mitigate brute-force redeem attempts
async redeem(codeText, userId, req) {
  const redis = getRedis();
  const ipKey = `redeem:ip:${req.ip}`;
  const uaKey = `redeem:ua:${hashUA(req.headers['user-agent'] || '')}`;

  if (redis) {
    // Max 5 redeems per IP per hour
    const ipAttempts = await redis.incr(ipKey);
    if (ipAttempts === 1) await redis.expire(ipKey, 3600);
    if (ipAttempts > 5) {
      throw new AppError('Too many redeem attempts. Try again later.', 429);
    }
  }
  // ... proceed ...
}
```

### Edge Case 2: Code Entropy Validation

| Code Pattern | Example | Entropy | Secure? |
|-------------|---------|---------|---------|
| 8 alphanumeric | `ABC12345` | 47.6 bits | ❌ Brute-forceable (2.5 hrs @ 1000 req/s) |
| 12 alphanumeric | `SYND-ABCD-1234` | 71.4 bits | ⚠️ Marginal |
| 16 alphanumeric + prefix | `SYND-ABCD-EFGH-IJKL` | 95.2 bits | ✅ Brute-force infeasible |
| UUID v4 | `550e8400-e29b-41d4-...` | 122 bits | ✅ Best |

**Current:** `redeem.model.js` likely uses timeout-based IDs. Verify actual column type/structure.

### Edge Case 3: Code Expiry

```sql
-- Required: Add expiry column
ALTER TABLE redeem_codes ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE redeem_codes ADD COLUMN max_uses INT DEFAULT 1;

-- Cleanup expired unredeemed codes
DELETE FROM redeem_codes WHERE expires_at < CURRENT_TIMESTAMP AND status = 'unused';
```

---

## Database Schema Gaps

| Column | Current | Required | Reason |
|--------|---------|----------|--------|
| `expires_at` | ❌ Missing | `TIMESTAMP` | Codes should expire |
| `max_uses` | ❌ Missing | `INT DEFAULT 1` | For multi-use promo codes |
| `use_count` | ❌ Missing | `INT DEFAULT 0` | Track usage against max |
| `used_by` | ❌ Missing | `VARCHAR(36)` | User who redeemed |
| `used_at` | ❌ Missing | `TIMESTAMP` | When it was redeemed |
| `ip_created` | ❌ Missing | `INET` | Who generated the code |

---

## Immediate Recommendations

1. 🔴 **Add `SELECT ... FOR UPDATE` or advisory locks** — prevent race condition
2. 🔴 **Add granular rate limiting** — 5 req/min per IP for redeem endpoint
3. 🟠 **Add code expiry** — unexpired unredeemed codes are an attack surface
4. 🟠 **Add `max_uses` support** — for giveaways/promotional codes
5. 🟡 **Audit code generation** — ensure ≥ 80 bits of entropy per code
