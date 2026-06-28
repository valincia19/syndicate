---
id: licenses
type: feature
status: stable
tags: [license, activation, monetization, hwid]
---

# Licenses Module — License Management System

> **Module path:** `backend/src/modules/licenses/`
> **Files:** `licenses.routes.js`, `licenses.controller.js`, `licenses.service.js`, `licenses.model.js`
> **Related:** [[features/redeem]], [[features/hwid]]

---

## Overview

Core monetization module. Manages license key lifecycle: creation, activation, tier enforcement, expiry, and HWID binding quotas.

---

## License Tiers

| Tier | Max HWID | Duration | Price | Key Prefix |
|------|----------|----------|-------|------------|
| **Free** | 1 | 7 days | Free | `FREE-` |
| **Premium** | 5 | 30 days | Paid | `PREM-` |
| **Pro** | 12 | 90 days | Paid | `PRO-` |
| **Syndicate** | Unlimited | Lifetime | Special | `SYNDICATE-` |

---

## License Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    LICENSE LIFECYCLE                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. GENERATION                                               │
│     Admin creates license key                                │
│     Format: SYNDICATE-XXXXXXXXXXXX                            │
│     { tier, maxHWID, durationDays }                           │
│       │                                                      │
│       ▼                                                      │
│  2. DISTRIBUTION                                             │
│     Key delivered to user (email, dashboard, reseller)       │
│       │                                                      │
│       ▼                                                      │
│  3. REDEMPTION (see [[features/redeem]])                      │
│     User enters key → POST /v1/redeem/activate               │
│     License activated → binding created                      │
│       │                                                      │
│       ▼                                                      │
│  4. ACTIVE                                                   │
│     License valid + not expired                              │
│     HWID bindings within tier limit                          │
│       │                                                      │
│       ├─ HWID added (up to maxHWID)                          │
│       ├─ HWID verified on each execution                     │
│       └─ Expiry timer counts down                            │
│       │                                                      │
│       ▼                                                      │
│  5. EXPIRY                                                   │
│     - Grace period? (optional: 24h extension)                │
│     - License marked as "expired"                            │
│     - HWID bindings preserved for X days                     │
│       │                                                      │
│       ▼                                                      │
│  6. REVOCATION / RENEWAL                                     │
│     - Admin can revoke active license                        │
│     - User can purchase renewal (extends expiry)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/licenses` | Admin | Create new license key |
| `GET` | `/v1/licenses` | User | List user's licenses |
| `GET` | `/v1/licenses/:id` | User | Get license details |
| `POST` | `/v1/licenses/:id/validate` | No (key-based) | Validate license key |
| `DELETE` | `/v1/licenses/:id` | Admin | Revoke license |
| `GET` | `/v1/licenses/:id/hwid` | User | List bound HWIDs |

---

## Validation Flow

```javascript
// licenses.service.js — validateLicense pseudocode
async function validateLicense(licenseKey, hwid) {
  // 1. Find license by key
  const license = await db.findByKey(licenseKey);
  if (!license) throw new Error('Invalid license key');
  
  // 2. Check status
  if (license.status === 'revoked') throw new Error('License revoked');
  
  // 3. Check expiry
  if (new Date() > new Date(license.expiresAt)) {
    await db.update(license.id, { status: 'expired' });
    throw new Error('License expired');
  }
  
  // 4. Check HWID binding
  const bindings = await hwidService.getBindings(license.id);
  const isBound = bindings.some(b => b.hwidHash === hwid);
  
  if (!isBound && bindings.length >= TIER_LIMITS[license.tier].maxHWID) {
    throw new Error('HWID limit reached');
  }
  
  // 5. Auto-bind if not bound
  if (!isBound) {
    await hwidService.bindHWID(license.id, hwid);
  }
  
  return { valid: true, license, tier: license.tier };
}
```

---

## Expiry Reminder System

The frontend portal displays color-coded expiry indicators:

| Days Remaining | Color | Badge |
|----------------|-------|-------|
| > 7 days | Green | `text-emerald-500` |
| ≤ 7 days | Orange | `text-amber-500` |
| ≤ 2 days | Red | `text-red-500` |

```typescript
// Frontend expiry timer logic
function getExpiryColor(daysRemaining: number): string {
  if (daysRemaining > 7) return 'text-emerald-500';
  if (daysRemaining > 2) return 'text-amber-500';
  return 'text-red-500';
}
```

---

## Database Schema

```sql
CREATE TABLE licenses (
  id            VARCHAR(36) PRIMARY KEY,
  key           VARCHAR(64) UNIQUE NOT NULL,
  tier          ENUM('free', 'premium', 'pro', 'syndicate') DEFAULT 'free',
  status        ENUM('active', 'expired', 'revoked') DEFAULT 'active',
  max_hwid      INT DEFAULT 1,
  duration_days INT DEFAULT 7,
  owner_id      VARCHAR(36),
  created_by    VARCHAR(36),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMP,
  revoked_at    TIMESTAMP,
  
  FOREIGN KEY (owner_id)  REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_license_key (key),
  INDEX idx_owner (owner_id),
  INDEX idx_expiry (expires_at)
);
```

---

## Security Notes

### Brute-Force Protection

```javascript
// Redeem endpoint rate limiting
// Max 5 failed attempts per IP per 15 minutes
const REDEEM_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  blockDuration: 60 * 60 * 1000, // 1 hour block
};
```

### Key Generation Algorithm

```javascript
// Secure key generation
const crypto = require('crypto');

function generateLicenseKey(tier) {
  const prefix = {
    free: 'FREE',
    premium: 'PREM',
    pro: 'PRO',
    syndicate: 'SYNDICATE',
  }[tier];
  
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}
```

### Anti-Sharing Enforcement

- HWID logged on every execution attempt
- Rapid HWID changes trigger flag
- Geo-discrepancy detection (same license, different countries within minutes)
