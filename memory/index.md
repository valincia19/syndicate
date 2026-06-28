---
id: memory-index
type: architecture
status: stable
tags: [moc, knowledge-base, system]
---

# VALINC SYNDICATE — Memory Hub

> **Monorepo Knowledge Base** — generated via Hermes Agent brain scan on 2026-06-26.
> All pages use standard Obsidian-flavored internal links (`[[path/file-name]]`).

## Architecture
- [[architecture/system-design]] — Global tech stack, data flow, infrastructure
- [[architecture/security-audit]] — OWASP threat assessment, attack surfaces, remediation

## Feature Modules
- [[features/auth]] — JWT auth + bcrypt hashing + route guards
- [[features/hwid]] — Hardware fingerprint binding + anti-spoof analysis
- [[features/executions]] — Script execution pipeline + WebSocket event broadcast
- [[features/licenses]] — License tier validation + key activation lifecycle
- [[features/scripts]] — Script CRUD + distribution
- [[features/admin]] — Admin dashboard + user management
- [[features/tickets]] — Support ticket system
- [[features/redeem]] — License key redemption
- [[features/releases]] — Versioned release distribution

## Repository Snapshot

| Layer | Technology | Directory |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, Shadcn UI | `frontend/` |
| Backend | Express.js 5 (CommonJS), modular feature-based | `backend/` |
| Database | TiDB Cloud MySQL (`mysql2/promise`) | — |
| Cache | Upstash Redis (REST-based + in-memory fallback) | — |
| Auth | JWT access tokens + bcrypt password hashing | — |
| Realtime | WebSocket layer (`backend/src/config/websocket.js`) | — |
| Design System | Vite + React standalone preview app | `design-assets-hub-v2/` |

## Critical Findings (Security)
- ⚠️ Client-side HWID injection script (`backend/scripts/inject-hwid.js`) is a potential spoofing vector
- ⚠️ Rate limiter is in-memory per-IP — resets on server restart, no persistence
- ⚠️ JWT refresh token rotation not detected — potential session hijack window
- ⚠️ `.env` file present in repo snapshot — secrets management risk

> **Next actions:** Move rate limiter to Redis sliding window, implement refresh token rotation, move HWID fingerprint to server-side, rotate all secrets.
