---
id: executions
type: feature
status: review_required
tags: [execution, websocket, runtime, logging, security, replay-protection]
---

# Executions Module — Script Execution Pipeline

> **Module path:** `backend/src/modules/executions/`
> **Files:** `executions.routes.js`, `executions.controller.js`, `executions.service.js`, `executions.model.js`
> **WebSocket:** `config/websocket.js` (shared infrastructure)
> **Audit date:** 2026-06-26

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXECUTION PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Roblox Client          Backend API              PostgreSQL         │
│      │                     │                        │               │
│      │── POST /exec ──────►│                        │               │
│      │  (script_id,        ├── Auth check (JWT)     │               │
│      │   license_key,      ├── Rate limit check     │               │
│      │   script_args)      ├── License tier check   │               │
│      │                     ├── HWID verify          │               │
│      │                     ├── Script fetch (R2)    │               │
│      │                     ├──recordExecution()────►│               │
│      │                     │  UPSERT count          │               │
│      │◄── script_content ──┤                        │               │
│      │     + exec_token    │                        │               │
│      │                     │                        │               │
│      │── WS exec_status ──►│                        │               │
│      │  (streaming logs)   │── broadcastToTicket()  │               │
│      │                     │  (status events)       │               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Execution Counting (✅ Correct — Atomic UPSERT)

```javascript
// executions.model.js — recordExecution()
// Uses PostgreSQL UPSERT (ON CONFLICT ... DO UPDATE)
// This IS atomic — no race condition on execution counts
await pool.query(
  `INSERT INTO execution_logs (date, count) VALUES ($1, 1)
   ON CONFLICT (date) DO UPDATE SET count = execution_logs.count + 1`,
  [today]
);
```

**Verdict:** ✅ Correct. PostgreSQL's `ON CONFLICT ... DO UPDATE` is atomic. No known race condition.

---

## WebSocket Connection Lifecycle

### Current Implementation (`config/websocket.js`)

| Feature | Status | Details |
|---------|--------|---------|
| JWT auth on upgrade | ✅ | Via `Sec-WebSocket-Protocol` header or cookie |
| BOLA protection | ✅ | Non-staff cannot subscribe to other users' tickets |
| Heartbeat cleanup | ✅ | 30s ping → 10s timeout → `terminate()` |
| Rate limiting | ✅ | 30 msg/10s window per connection |
| Audit logging | ✅ | Staff access to non-owned tickets logged |
| **Payload encryption** | **❌** | All events are plain JSON |
| **Zombie cleanup bypass** | **❌** | Edge case in error handler |

---

## 🔴 Finding W1: No Application-Layer Payload Encryption

### Current State

```javascript
// websocket.js:50 — broadcast uses plain JSON
wss.clients.forEach((client) => {
  if (client.ticketId === ticketId) {
    client.send(JSON.stringify({ type: 'exec_update', ... }));
    //               ↑ Plaintext over WSS
  }
});
```

WSS (TLS) covers transport, but:
- Reverse proxy terminates TLS before forwarding to Express
- Internal network traffic is plain WS (not WSS)
- Any access to the HTTP server process memory can read WS payloads

### Attack Scenario

```
Attacker with proxy access:
1. Proxy terminates WSS (legitimate)
2. Forwards plain WS to Express (:5000)
3. Sniffs all execution payloads:
   - Script content (intellectual property)
   - License keys
   - HWID fingerprints
   - Execution results
```

### Mitigation: Ephemeral Per-Session Encryption

```javascript
// websocket.js — session key exchange on connect
const crypto = require('crypto');

// Per-connection session key
ws.sessionKey = crypto.randomBytes(32);
ws.sessionIV = crypto.randomBytes(16);

// Send session key to client (encrypted with RSA public key)
ws.send(JSON.stringify({
  type: 'session_init',
  key: crypto.publicEncrypt({
    key: SERVER_RSA_PUBLIC,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }, ws.sessionKey).toString('base64'),
  iv: ws.sessionIV.toString('hex'),
}));

// Encrypt all subsequent messages
function encryptWSMessage(ws, data) {
  const cipher = crypto.createCipheriv('aes-256-gcm', ws.sessionKey, ws.sessionIV);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return JSON.stringify({ type: 'encrypted', data: encrypted, authTag });
}
```

---

## ⚠️ Finding W2: Zombie Connection Edge Case

### Current Heartbeat Logic

```javascript
// websocket.js:264-273
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      logger.warn('WebSocket', 'Terminating stale connection', { userId: ws.userId });
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);
```

### Problem: The `ws.terminate()` runs INSIDE the `forEach` callback

```javascript
// ws.terminate() closes the socket synchronously
// BUT the forEach continues iterating over the same Set
// After terminate(), the socket is in CLOSED state
// Next iteration's ws.isAlive check will reference a CLOSED socket
```

This is a minor memory pressure issue (dead socket stays in `wss.clients` Set until the next full garbage collection cycle). In practice, the `close` handler fires and logs cleanup, but the socket reference is **not immediately removed from the Set** — JavaScript `Set.forEach` doesn't reflect removals made during iteration.

### Fix

```javascript
// ✅ Collect dead sockets and remove after iteration
const toTerminate = [];
wss.clients.forEach((ws) => {
  if (ws.isAlive === false) {
    toTerminate.push(ws);
  }
  ws.isAlive = false;
  ws.ping();
});

toTerminate.forEach((ws) => {
  logger.warn('WebSocket', 'Terminating stale connection', { userId: ws.userId });
  ws.terminate();
});
// OR use: ws.close(1001, 'Heartbeat timeout') for clean closing
```

---

## Finding W3: Missing Execution Result Integrity

### Current State

The execution pipeline records **counts only** — no execution payloads, no results, no timestamps per individual execution.

```sql
-- execution_logs schema
id          BIGSERIAL PRIMARY KEY,
date        DATE NOT NULL,
count       INT NOT NULL DEFAULT 0,
--           ↑ The count goes up, but we don't know:
--             • Which user executed
--             • Which script was executed
--             • When exactly (to the second)
--             • What the result was
--             • Execution duration
```

### Required Schema

```sql
-- Extended execution tracking
CREATE TABLE IF NOT EXISTS execution_records (
  id            BIGSERIAL PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  license_id    VARCHAR(36)   NOT NULL,
  script_id     VARCHAR(36)   NOT NULL,
  hwid_hash     VARCHAR(64)   NULL,
  ip_address    INET          NOT NULL,
  exec_start    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exec_end      TIMESTAMP     NULL,
  duration_ms   INT           NULL,
  result_status VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK(
    result_status IN ('pending','running','success','error','timeout')
  ),
  error_message TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exec_records_user ON execution_records(user_id);
CREATE INDEX idx_exec_records_license ON execution_records(license_id);
CREATE INDEX idx_exec_records_created ON execution_records(created_at DESC);
```

---

## WebSocket Replay Protection

### Current State

| Protection | Status | Notes |
|-----------|--------|-------|
| JWT auth on connect | ✅ | Validated at upgrade |
| Per-msg rate limit | ✅ | 30 msg/10s |
| BOLA subscription | ✅ | Ticket ownership verified |
| **Nonce/sequence check** | **❌** | Messages have no unique ID |
| **Timestamp validation** | **❌** | Messages have no recency check |

### Replay Attack Scenario

```
1. Attacker connects to WSS (valid JWT)
2. Captures a "close_ticket" WS message
3. Attacker's JWT expires
4. Attacker reconnects with new JWT
5. SAME close_ticket message from step 2 is replayed
6. If the original ticket is still open, it gets closed
   (Auth was valid at step 5, message is valid JSON)
```

### Mitigation

```javascript
// ✅ Message sequence + nonce validation
const lastSeq = new Map(); // ws -> last sequence number

ws.on('message', (raw) => {
  let data;
  try {
    data = JSON.parse(raw.toString());
  } catch { return; }

  // REQUIRED fields for action messages
  if (data.type !== 'subscribe' && data.type !== 'subscribe_dashboard') {
    if (!data.seq || !data.ts) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing seq/ts' }));
      return;
    }

    // Reject out-of-order messages
    const prevSeq = lastSeq.get(ws) || 0;
    if (data.seq <= prevSeq) {
      logger.warn('WebSocket', 'Replay detected', {
        userId: ws.userId, seq: data.seq, prevSeq
      });
      ws.send(JSON.stringify({ type: 'error', message: 'Replay detected' }));
      return;
    }

    // Reject messages older than 30s
    if (Date.now() - data.ts > 30000) {
      ws.send(JSON.stringify({ type: 'error', message: 'Message expired' }));
      return;
    }

    lastSeq.set(ws, data.seq);
  }
});
```

---

## Immediate Recommendations

1. 🟡 **Add per-session ephemeral encryption** — AES-256-GCM with session key exchange
2. 🟡 **Fix heartbeat cleanup** — collect dead sockets before `terminate()` calls
3. 🟡 **Add msg sequence/nonce for replay protection** — prevent WS replay attacks
4. 🟡 **Add detailed execution records table** — replace bare counters with full audit trail
5. 🟢 **Execution count UPSERT is atomic** — no change needed
6. 🟢 **Heartbeat timing (30s/10s)** — appropriate for up to 10k concurrent connections
