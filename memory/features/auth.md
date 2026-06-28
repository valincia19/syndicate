---
id: auth
type: feature
status: review_required
tags: [jwt, bcrypt, auth, authentication, security]
---

# Authentication Module

> **Module path:** `backend/src/modules/auth/`
> **Files:** `auth.routes.js`, `auth.controller.js`, `auth.service.js`, `auth.model.js`

---

## Overview

Handles user registration, login, JWT token issuance, and profile retrieval.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/auth/register` | No | Create user account (name, email, password) |
| `POST` | `/v1/auth/login` | No | Authenticate → JWT token |
| `GET` | `/v1/auth/profile` | Bearer | Get authenticated user profile |

---

## Data Flow

```
POST /v1/auth/register
  │
  ├─ Controller: validate input (name, email, password)
  │     │
  │     └─ Check: email unique?
  │           │
  │           ├─ YES → continue
  │           └─ NO  → 409 Conflict
  │
  ├─ Service: hash password (bcrypt, 12 rounds)
  │     │
  │     └─ Store user in TiDB (users table)
  │
  └─ Response: 201 Created + user object (no password)

POST /v1/auth/login
  │
  ├─ Controller: validate input (email, password)
  │
  ├─ Service: find user by email
  │     │
  │     └─ bcrypt.compare(password, hash)
  │           │
  │           ├─ MATCH → generate JWT
  │           └─ FAIL  → 401 Unauthorized
  │
  └─ Response: 200 OK + { token, user }

GET /v1/auth/profile
  │
  ├─ Middleware: auth.middleware → verify JWT
  │     │
  │     └─ Extract user.id from token payload
  │
  ├─ Controller: fetch user by ID
  │
  └─ Response: 200 OK + user object
```

---

## Security Implementation

### JWT Token Structure

```javascript
// Expected token payload
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",       // user | admin | developer | staff
  "iat": 1719400000,    // issued at
  "exp": 1720000000     // expiration (7 days default)
}
```

### Bcrypt Configuration

```javascript
const SALT_ROUNDS = 12;

// Hashing
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// Verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

---

## Security Gaps

### ⚠️ High: No Refresh Token Rotation

Current implementation issues a single long-lived JWT access token. If stolen, attacker has unlimited access for the full TTL window.

**Recommended fix:**
```
Login → issue access token (15 min) + refresh token (7 days, stored in DB)
       │
       ▼
Access token expires → client sends refresh token
       │
       ▼
Server validates refresh → rotates (invalidates old, issues new pair)
       │
       ▼
If old refresh reused → revoke ALL tokens for user (stolen token detection)
```

### ⚠️ Medium: No Token Revocation

No blacklist for revoked tokens. A compromised token remains valid until natural expiry.

**Recommended fix:** Redis-based token blacklist with TTL matching remaining token lifetime.

### ⚠️ Low: Missing Failed-Login Throttling

Global rate limiter protects all endpoints, but no per-endpoint or per-account throttling for auth routes.

**Recommended fix:** Add Redis-backed login attempt counter per IP + per email, with exponential backoff after 5 failures.

---

## Middleware Chain (Protected Routes)

```javascript
// auth.middleware.js pseudocode
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

## Database Model

```sql
-- users table (approximate schema)
CREATE TABLE users (
  id          VARCHAR(36) PRIMARY KEY,      -- UUID
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,         -- bcrypt hash
  role        ENUM('user', 'admin', 'developer', 'staff') DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
