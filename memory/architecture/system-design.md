---
id: system-design
type: architecture
status: stable
tags: [nextjs, express, mysql, redis, jwt, websocket, architecture]
---

# System Design — VALINC SYNDICATE

## Tech Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  Next.js 16 (App Router) · React 19 · Tailwind CSS v4   │
│  Shadcn UI (base-nova) · Lucide Icons · TypeScript      │
├─────────────────────────────────────────────────────────┤
│             Route Groups (App Router)                    │
│  (marketing)  →  /                    Landing page       │
│  (auth)       →  /login, /register    Auth pages         │
│  (portal)     →  /portal/*            User dashboard     │
│  (studio)     →  /studio/*            Admin/Dev panel    │
├─────────────────────────────────────────────────────────┤
│                   API PROXY LAYER                        │
│  frontend/src/app/api/[...path]/route.ts                │
│  Proxies → http://backend:5000/v1/*                     │
├─────────────────────────────────────────────────────────┤
│               EXPRESS 5 API GATEWAY                      │
│  backend/index.js (entry point)                         │
│                                                         │
│  MIDDLEWARE PIPELINE:                                   │
│  1. security.middleware  → Helmet headers, CSP          │
│  2. cors.middleware      → CORS whitelist               │
│  3. rateLimiter.middleware → IP-based (in-memory)       │
│  4. auth.middleware      → JWT Bearer verification      │
│  5. errorHandler         → Global error boundary        │
│                                                         │
│  MODULAR ROUTES (Routes → Controller → Service → Model):│
│  /v1/auth/*        → Auth (register, login, profile)    │
│  /v1/licenses/*    → License management                 │
│  /v1/scripts/*     → Script CRUD                        │
│  /v1/hwid/*        → HWID binding                       │
│  /v1/executions/*  → Script execution logging           │
│  /v1/tickets/*     → Support tickets                    │
│  /v1/redeem/*      → License key redemption             │
│  /v1/releases/*    → Version distribution               │
│  /v1/admin/*       → Admin operations                   │
│  /health           → DB + Redis health check            │
├─────────────────────────────────────────────────────────┤
│                   DATA LAYER                             │
│  TiDB Cloud MySQL    → Primary relational store         │
│  Upstash Redis       → Cache layer (REST API)           │
│  In-Memory Fallback  → When Redis unreachable           │
└─────────────────────────────────────────────────────────┘
```

## Request Lifecycle

```
Browser
  │
  ▼
Next.js (SSR/CSR)
  │
  ├─ /api/* route handler
  │     │
  │     ▼ fetch() ──────────────────────────┐
  │                                          │
  ▼ (direct to backend)                      │
Express 5 Server                             │
  │                                          │
  ├─ cors.middleware                         │
  ├─ security.middleware (CSP, HSTS, etc.)   │
  ├─ rateLimiter.middleware                  │
  │     │                                    │
  │     └─ Check Redis/IP counter           │
  │                                          │
  ├─ auth.middleware (if protected route)    │
  │     │                                    │
  │     └─ Verify JWT → extract user.id      │
  │                                          │
  ├─ Feature Route Handler                   │
  │     │                                    │
  │     ├─ Controller: input validation      │
  │     ├─ Service: business logic           │
  │     └─ Model: DB query                   │
  │                                          │
  ▼                                          │
TiDB Cloud MySQL (mysql2/promise)  ◄─────────┘
  │
  └─ Connection pool with TLS 1.2+
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Account data, hashed passwords, roles |
| `licenses` | License keys, tiers, expiry, HWID binding |
| `hwid_bindings` | Device fingerprint → license mapping |
| `scripts` | Script metadata, status, author |
| `executions` | Execution log entries, timestamps |
| `tickets` | Support ticket threads |
| `releases` | Versioned script releases |

## WebSocket Architecture

```
backend/src/config/websocket.js

Client connects ──► WebSocket handshake
                     │
                     ├─ Auth: JWT token validation
                     ├─ Channel: user-specific room
                     │
                     ▼
              Execution events broadcast:
              - Script started
              - Script completed
              - Error/exception
              - HWID verification status
```

## Environment Variables

```
DB_HOST           → TiDB Cloud hostname
DB_USER           → Database user
DB_PASSWORD       → Database password
DB_NAME           → Database name
DB_PORT           → Database port (default: 4000)
JWT_SECRET        → JWT signing secret
JWT_EXPIRES_IN    → Token TTL (e.g., '7d')
REDIS_URL         → Upstash Redis REST endpoint
REDIS_TOKEN       → Upstash Redis auth token
PORT              → Backend server port (default: 5000)
```

## Deployment

| Service | Platform | Port |
|---------|----------|------|
| Frontend | Next.js (Node) | 3000 |
| Backend | Express.js (Node) | 5000 |
| DB | TiDB Cloud | 4000 (TLS) |
| Cache | Upstash Redis | 443 (REST) |

Docker Compose (`docker-compose.yml`) orchestrates both frontend and backend containers.
