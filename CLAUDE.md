# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VINZHUB** (branded as "VALINC SYNDICATE") is a Roblox scripting platform with a landing page, user portal, and REST API. This is a **multi-project monorepo** with two independent projects (`frontend/` and `backend/`), each with its own `node_modules`, package manager, and development server.

## Repository Structure

```
.
+-- frontend/              # Next.js 16 + React 19 + TypeScript (port 3000)
+-- backend/               # Express.js 5 + JavaScript/CommonJS (port 5000)
+-- AGENTS.md              # Detailed architecture documentation
+-- portal-audit.md        # Portal audit documentation (may not exist yet)
```

**Critical**: Each project has separate `node_modules`. Always `cd` into the correct directory before running commands. Never share dependencies across projects.

## Commands

### Frontend (`frontend/`)

```bash
cd frontend
npm run dev          # Next.js dev server on port 3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (uses eslint.config.mjs)
npx knip             # Dead code detection (config in knip.json)
```

### Backend (`backend/`)

```bash
cd backend
npm run dev          # Nodemon with auto-reload on port 5000
npm start            # Production (node index.js)
npm test             # Not configured (placeholder)
```

## Architecture

### Frontend (Next.js 16 App Router)

**Stack**: Next.js 16.2.9, React 19.2.4, TypeScript 5, Tailwind CSS v4, shadcn/ui (base-nova style)

**Route Groups** (App Router):
- `/` -- Landing page with sections: hero, features, bento, pricing, FAQ, testimonials, CTA, logos, documentation
- `/login` and `/register` -- Authentication pages (route group: `(auth)`)
- `/portal/*` -- Protected user dashboard with sub-pages: overview, keys, license, scripts (route group: `(portal)`)

**Key Files**:
- Entry: `frontend/src/app/layout.tsx`
- Landing: `frontend/src/app/(marketing)/page.tsx`
- Portal layout: `frontend/src/app/(portal)/layout.tsx`
- Auth context: `frontend/src/context/auth-context.tsx`
- i18n: `frontend/src/config/i18n.ts` (EN, ID, FR — static dictionary via `LanguageProvider` context)
- Utils: `frontend/src/lib/utils.ts`

**Component Structure**:
- `src/components/ui/` — shadcn/ui components (25+ components)
- `src/components/landing/` — Landing page sections
- `src/components/portal/` — Portal-specific components
- `src/components/auth/` — Authentication components
- `src/components/layout/` — Header, footer
- `src/components/providers/` — Context providers
- `src/hooks/` — Custom hooks (useTheme, etc.)

**Conventions**:
- Path alias: `@/*` maps to `./src/*` (configured in tsconfig.json, strict mode)
- Icons: lucide-react
- Forms: react-hook-form with zod validation
- Theme: LocalStorage + class toggle (inline script in root `layout.tsx`); dark/light via class on `<html>`
- CSS: Tailwind CSS v4 with `@tailwindcss/postcss` (not classic plugin config)
- State management: zustand for global state

**Key Dependencies**: next 16, react 19, shadcn/ui, tailwindcss v4, lucide-react, recharts, zustand, zod, monaco-editor, sonner (toast), embla-carousel

**Configuration**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` (flat config), `components.json` (shadcn/ui), `knip.json` (dead code), `postcss.config.mjs`

### Backend (Express.js 5 — CommonJS)

**Stack**: Express.js 5.2.1, JavaScript (CommonJS), PostgreSQL (node-postgres pool), Upstash Redis (REST), JWT, WebSocket (ws)

**Architecture**: Modular feature-based structure following Routes → Controller → Service → Model pattern

**Directory Structure**:
```
backend/
+-- index.js                    # Entry point (server setup, DB/Redis/migrations, WebSocket)
+-- src/
    +-- config/
    |   +-- env.js              # Environment validation (JWT, DB, Redis, R2, Discord, Rate Limit)
    |   +-- database.js         # PostgreSQL connection pool (pg, TLS 1.2+, schema "vinzhub")
    |   +-- redis.js            # Upstash Redis REST client (graceful in-memory fallback)
    |   +-- websocket.js        # WSS server with JWT auth, BOLA protection, heartbeat, rate limit
    |   +-- logger.js           # Structured logger with levels, color output (dev) / JSON (prod)
    +-- middleware/
    |   +-- auth.middleware.js      # JWT verification and role authorization
    |   +-- cors.middleware.js      # CORS origin restriction
    |   +-- security.middleware.js  # OWASP security headers
    |   +-- rateLimiter.middleware.js # Per-IP rate limiting (100 req/15min)
    |   +-- errorHandler.middleware.js # Global error handler + 404 handler
    +-- modules/
        +-- auth/              # Register, login, profile, Discord OAuth2
        +-- admin/             # Admin panel routes
        +-- tickets/           # Support tickets (CRUD + messages)
        +-- licenses/          # License management
        +-- redeem/            # Code/key redemption
        +-- hwid/              # HWID management and binding
        +-- scripts/           # Script vault CRUD
        +-- releases/          # Release/public loader endpoints
        +-- executions/        # Execution tracking and stats
```

**Adding a new module**: Create `src/modules/<name>/` with routes/controller/service/model, import model in `index.js` (createTable), import routes and register with `app.use()`.

**API Endpoints**:
```
GET    /health                        — Health check (DB + Redis status)
GET    /                              — Root status

# Auth
POST   /v1/auth/register              — Register (name, email, password)
POST   /v1/auth/login                 — Login → JWT token
GET    /v1/auth/profile               — Protected profile
# Discord OAuth2 routes live under /v1/auth/discord/*

# Tickets (protected)
POST   /v1/tickets                    — Create ticket
GET    /v1/tickets                    — List tickets
GET    /v1/tickets/:id                — Get ticket details
POST   /v1/tickets/:id/messages       — Reply to ticket
PATCH  /v1/tickets/:id/status         — Update status (staff+)

# Other modules
/v1/admin/*                           — Admin routes
/v1/licenses/*                        — License management
/v1/redeem/*                          — Code redemption
/v1/hwid/*                            — HWID management
/v1/scripts/*                         — Script vault
/v1/releases/*                        — Public releases, loader, game info
/v1/executions/*                      — Execution stats

# WebSocket
ws://host/ws                          — JWT-authenticated (sub-protocol or cookie), BOLA-protected ticket subscription
```

**Security** (OWASP Top 10 compliant):
- JWT with bcrypt password hashing (12 salt rounds), minimum 32-char secret required
- Rate limiting: In-memory per-IP tracking (100 req/15min default)
- CORS origin whitelist
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, HSTS, CSP
- WebSocket: BOLA validation on ticket subscribe (users can only subscribe to own tickets)
- Input validation: email format, password strength (min 8 chars, uppercase, lowercase, number)
- Request body size limit: 10MB

**Conventions**:
- Pure JavaScript (no TypeScript) — CommonJS `require()` syntax
- Naming: kebab-case for files, camelCase for variables/functions
- Environment variables via `.env` file
- All models export a `createTable()` method called in `index.js` startup
- Config validation runs at module load in `env.js` (warns on missing optional config, throws on missing JWT_SECRET)

**Key Dependencies**: express 5, pg (PostgreSQL), @upstash/redis, bcryptjs, jsonwebtoken, ws (WebSocket), cors, dotenv, multer, cookie-parser, @aws-sdk/client-s3 (Cloudflare R2)

**Environment Variables**:
```
PORT=3000                              # Default; set to 5000 in .env
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
JWT_SECRET=<min 32 chars>
JWT_EXPIRES_IN=7d

# PostgreSQL (not TiDB/MySQL — uses pg driver)
DB_HOST=localhost, DB_PORT=5432, DB_NAME=vinzhub
DB_USER=<user>, DB_PASSWORD=<pass>
DB_SSL=true, DB_CONNECTION_LIMIT=20

# Redis (Upstash REST)
UPSTASH_REDIS_REST_URL=<url>, UPSTASH_REDIS_REST_TOKEN=<token>

# Discord OAuth2
DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI
FRONTEND_URL=http://localhost:3000

# Cloudflare R2 (S3-compatible)
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000, RATE_LIMIT_MAX_REQUESTS=100
```

**PostgreSQL Schema**: All tables created under the `vinzhub` schema. An `update_updated_at_column()` trigger function is auto-created on startup. Table creation is done via model `createTable()` methods in `index.js` startup sequence.

**WebSocket Details**:
- Path: `/ws`
- Auth: JWT via `Sec-WebSocket-Protocol` header (`bearer_<jwt>`) or `auth_token` cookie (httpOnly)
- Protocol: Messages are JSON with `type` field (`subscribe`, `subscribe_dashboard`)
- BOLA: Users can only subscribe to tickets they own (staff bypass)
- Heartbeat: Ping every 30s, terminate if no pong in 10s
- Rate limit: 30 messages per 10s window per connection
- Registry: `wssRegistry.broadcastToTicket(ticketId, event)` for server-side broadcast

## Key Files Reference

### Frontend
- **Entry**: `frontend/src/app/layout.tsx`
- **Landing page**: `frontend/src/app/(marketing)/page.tsx`
- **Portal**: `frontend/src/app/(portal)/portal/{overview,keys,license,scripts}/page.tsx`
- **Auth context**: `frontend/src/context/auth-context.tsx`
- **i18n**: `frontend/src/config/i18n.ts`
- **UI components**: `frontend/src/components/ui/*.tsx`
- **Theme CSS**: `frontend/src/app/globals.css`

### Backend
- **Entry**: `backend/index.js`
- **Config**: `backend/src/config/{env,database,redis,websocket,logger}.js`
- **Middleware**: `backend/src/middleware/*.js`
- **Auth module**: `backend/src/modules/auth/*`

## Testing

**No comprehensive test suites are configured** in any project:
- Frontend: No tests
- Backend: Placeholder test script (not implemented)

## CI/CD & Docker

**Not configured**: No GitHub Actions workflows, Dockerfiles, or docker-compose files found.

## Important Notes

1. **Next.js version warning**: The frontend uses Next.js 16, which may have breaking API changes from earlier versions. Always verify conventions against `node_modules/next/dist/docs/` before writing code.

2. **Separate dependency trees**: Both projects use separate `node_modules`. Never run commands from the wrong directory.

3. **No shared packages**: Unlike typical monorepos, these are two independent projects that happen to live in the same repository.

4. **Backend is PostgreSQL, not TiDB/MySQL**: The database driver is `pg` (node-postgres). There is no mysql2 dependency. The default port is 5432, not 3306.

5. **i18n pattern**: Frontend uses a static dictionary pattern (not next-intl or similar). Translations managed through `LanguageProvider` context. Three languages: EN, ID, FR.

6. **Backend database migrations**: Table creation is managed inline via model `createTable()` methods called at startup in `index.js`. There is no separate migration system.

7. **Authentication**: Two auth methods on the frontend — email/password (via API) and Discord OAuth2. Backend uses JWT with httpOnly cookies and `Authorization: Bearer` header.

## Documentation

- `AGENTS.md` — Detailed architecture documentation (legacy Qoder-format)
- `backend/README.md` — Backend API documentation
- `frontend/README.md` — Frontend setup guide
