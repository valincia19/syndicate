---
id: hwid
type: feature
status: review_required
tags: [hwid, device-fingerprint, security, anti-spoof, entropy]
---

# HWID Module — Hardware Fingerprint System

> **Module path:** `backend/src/modules/hwid/`
> **Files:** `hwid.routes.js`, `hwid.controller.js`, `hwid.service.js`, `hwid.model.js`
> **Audit date:** 2026-06-26

---

## Current Architecture

The HWID system follows a standard CRUD pattern with license-gated access control.

```
Client (Roblox)         Backend API                PostgreSQL
      │                     │                         │
      │  POST /hwid         │                         │
      │  { hwid, license }  │                         │
      ├────────────────────►│                         │
      │                     │  INSERT INTO             │
      │                     │  hwid_devices            │
      │                     ├────────────────────────►│
      │                     │                         │
      │  { status: success }│                         │
      │◄────────────────────┤                         │
```

---

## 🔴 CRITICAL: Client-Only HWID — Zero Entropy Validation

### What the Code Actually Does

```sql
-- hwid.model.js table schema
hwid VARCHAR(255) NULL
```

The `hwid` column stores **any string the client sends**. The server:
- ✅ Stores it
- ✅ Checks if license_id matches
- ❌ **Never validates the hardware fingerprint**
- ❌ **Never cross-references hardware attributes**
- ❌ **Never computes an entropy score**

### The `inject-hwid.js` Supply Chain Attack

```javascript
// inject-hwid.js — delivered to and runs on the ROBLOX CLIENT
// ANY LINE OF THIS FILE CAN BE MODIFIED BY THE ATTACKER

function getHWID() {
  // Attacker can bypass simply by:
  // Option A: NOP the call → return a hardcoded string
  // Option B: MITM the injector → replace getHWID()
  // Option C: Modify POST body before send
  // Option D: Replay a captured HWID from another user
  return someClientGeneratedString;
}
```

### Fixed vs Spoofed Entropy

| Fingerprint Component | Genuine HWID | Spoofed HWID |
|----------------------|--------------|--------------|
| Motherboard Serial | `WD-WCC6Y1ZU9L7R` | `ABCDEF123456` |
| BIOS UUID | `A1B2C3D4-E5F6-7890-ABCD-EF1234567890` | `11111111-1111-1111-1111-111111111111` |
| CPU ID (CPUID 0x01) | `0x000306C3` (Haswell i7) | `0x00000000` |
| MAC Primary | `00:1A:2B:3C:4D:5E` | `00:00:00:00:00:00` |
| Disk Volume Serial | `D4E5F601` | `00000000` |
| TPM Endorsement Key | Hash of EKpub | `null` |

A genuine HWID has **high entropy (bits) across all 6 attributes**. A spoofed HWID has **~0 entropy across most attributes** — trivially detectable server-side.

---

## Required: Server-Side Multi-Factor HWID Architecture

### Entropy Scoring Model

```
┌────────────────────────────────────────────────────────────────┐
│ COMPONENT              BITS   WEIGHT   MAX SCORE  RELIABILITY  │
├────────────────────────────────────────────────────────────────┤
│ Motherboard Serial     64     0.30     19.2       HIGH         │
│ BIOS UUID              128    0.25     32.0       HIGH         │
│ CPUID Signature        32     0.15     4.8        MEDIUM       │
│ MAC Address (primary)  48     0.15     7.2        MEDIUM       │
│ TPM EK Hash            256    0.10     25.6       VERY HIGH    │
│ Disk Serial            32     0.05     1.6        LOW          │
├────────────────────────────────────────────────────────────────┤
│ TOTAL (weighted)               1.00     90.4                    │
└────────────────────────────────────────────────────────────────┘

THRESHOLD TABLE:
  > 75   → GENUINE hardware, accept
  40-75  → SUSPICIOUS, flag for review
  < 40   → REJECT, almost certainly spoofed/VM
```

### Server-Side HWID Verification (proposed)

```javascript
// ✅ Server-side HWID generation and verification
const crypto = require('crypto');

function verifyHWID(components, expectedHash, licenseSalt) {
  // 1. Compute entropy score
  const entropyScore = computeEntropyScore(components);
  
  if (entropyScore < ENTROPY_THRESHOLD) {
    return { valid: false, reason: 'INSUFFICIENT_HARDWARE_ENTROPY' };
  }
  
  // 2. Verify HMAC hash matches (prevents tampering of individual fields)
  const raw = [
    components.motherboardSerial,
    components.biosUuid,
    components.cpuId,
    components.macAddress,
    components.tpmEkHash,
    components.diskSerial,
  ].sort().join('|');
  
  const computedHash = crypto
    .createHmac('sha256', Buffer.from(licenseSalt, 'hex'))
    .update(raw)
    .digest('hex');
  
  if (computedHash !== expectedHash) {
    return { valid: false, reason: 'HWID_SIGNATURE_MISMATCH' };
  }
  
  return { valid: true, score: entropyScore, hash: computedHash };
}

function computeEntropyScore(components) {
  const weights = {
    motherboardSerial: 0.30,
    biosUuid: 0.25,
    cpuId: 0.15,
    macAddress: 0.15,
    tpmEkHash: 0.10,
    diskSerial: 0.05,
  };
  
  let score = 0;
  for (const [attr, weight] of Object.entries(weights)) {
    const value = components[attr];
    if (!value || value.length < 4) continue; // Missing or too short = 0 contribution
    
    // Shannon entropy per attribute
    const attrEntropy = computeShannonEntropy(value);
    score += attrEntropy * weight;
  }
  
  return score;
}
```

### HWID Lifecycle (should be)

```
┌────────────────────────────────────────────┐
│           HWID BINDING FLOW                │
├────────────────────────────────────────────┤
│                                            │
│  Client                    Server          │
│    │                         │             │
│    │── HWID_INIT(components)─►│            │
│    │                         ├─ entropy    │
│    │                         │  score ≥ 75?│
│    │                         │─ YES ────── │
│    │                         ├─ compute    │
│    │                         │  HMAC-SHA256 │
│    │◄── HWID_CHALLENGE(     │  │salt       │
│    │     nonce, salt)        │             │
│    │                         │             │
│    │── HWID_RESPONSE(       │             │
│    │   signature(nonce))    ─►│           │
│    │                         ├─ verify    │
│    │                         │  sig       │
│    │◄── HWID_BOUND ─────────┤            │
│    │     (hwid_hash, score) │             │
│                                            │
└────────────────────────────────────────────┘
```

---

## Security Bypass Vectors

### Vector 1: Direct DB Write via SQL Injection
**If** an attacker finds SQL injection elsewhere, they can `UPDATE hwid_devices SET hwid = 'AAA' WHERE license_id = 'X'`.  Mitigation: parameterized queries (✅ already used everywhere).

### Vector 2: HWID Reset API Abuse
The `/hwid/:licenseId/reset` endpoint allows HWID reset without re-verification. Attackers can reset a license's HWID, bind to a new device, unbind, repeat — effectively infinite device churn above the license tier limit.
- **Mitigation:** Enforce cooldown (e.g., 24h between resets), log each reset with IP/user-agent, require re-authentication for reset.

### Vector 3: HWID Replay Attack
An attacker captures a legitimate HWID payload and replays it from a different IP/location.
- **Mitigation:** Nonce-based challenge-response (see flow above), bind HWID to initial IP on creation and re-verify on suspicious IP changes.

---

## Database Schema Gaps

| Column | Current Type | Required Type | Reason |
|--------|-------------|---------------|--------|
| `hwid` | `VARCHAR(255)` | `VARCHAR(64)` | SHA-256 HMAC output is 64 hex chars max |
| *(missing)* | — | `hwid_score` `NUMERIC(5,2)` | Track entropy score per device |
| *(missing)* | — | `hwid_components` `JSONB` | Store raw component snapshot for audit |
| *(missing)* | — | `last_verified_at` `TIMESTAMP` | Track freshness of HWID binding |
| *(missing)* | — | `ip_bind` `INET` | Optional IP binding for anti-replay |
| *(missing)* | — | `reset_count` `INT DEFAULT 0` | Track resets for abuse detection |

---

## Immediate Recommendations

1. 🔴 **Kill `inject-hwid.js` as primary HWID source** — move HWID to server-verified multi-factor
2. 🔴 **Add entropy scoring middleware** — reject HWIDs with score < 40
3. 🟠 **Bind HWID to license salt** — per-license HMAC prevents cross-license replay
4. 🟠 **Add HWID reset cooldown** — 24h minimum between resets
5. 🟡 **Store HWID component snapshots** — JSONB column for forensic audit
