# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Repository Structure

This is a **multi-project monorepo** for "VINZHUB" (branded as "VALINC SYNDICATE") — a Roblox scripting platform with a landing page, user portal, and REST API.

There are **two independent projects** with separate `node_modules`:

| Directory | Stack | Package Manager | Dev Port |
|-----------|-------|----------------|----------|
| `frontend/` | Next.js 16 + React 19 + TypeScript | npm | 3000 |
| `backend/` | Express.js 5 + JavaScript (CommonJS) | npm | 5000 |

**Important**: Each project has its own `node_modules`. Always `cd` into the correct directory before running commands.

## Commands

### Frontend (`frontend/`)
```bash
cd frontend
npm run dev       # Next.js dev server
npm run build     # Production build
npm run lint      # ESLint
npx knip          # Dead code detection (config in knip.json)
```

### Backend (`backend/`)
```bash
cd backend
npm run dev       # Nodemon with auto-reload
npm start         # Production (node index.js)
```

There are **no test suites** configured in any project.

## Architecture

### Frontend (Next.js 16 App Router)

Uses the **App Router** with these route groups:

- **`/`** — Landing page composed of section components (`hero`, `features`, `bento`, `pricing`, `faq`, `testimonials`, `cta`, `logos`, `documentation`)
- **`/login`** and **`/register`** — Authentication pages
- **`/portal/*`** — Protected user dashboard with its own layout (`overview`, `keys`, `license`, `scripts` sub-pages)

**Key conventions:**
- Path alias: `@/*` maps to `./src/*` (configured in tsconfig.json)
- UI components use **shadcn/ui** (`base-nova` style) located in `src/components/ui/`
- **Tailwind CSS v4** with `@tailwindcss/postcss` (not the classic `tailwindcss` plugin config)
- i18n is handled via a static dictionary in `src/config/i18n.ts` supporting `EN`, `ID`, `FR` — managed through `LanguageProvider` context
- Dark/light theme uses a `localStorage` + class toggle pattern (set in root `layout.tsx` inline script)
- Icons from `lucide-react`

### Backend (Express.js 5 — CommonJS)

**Modular feature-based architecture** following Routes → Controller → Service → Model:

```
backend/src/
├── config/          # env.js, database.js (TiDB Cloud MySQL), redis.js (Upstash)
├── middleware/       # auth, cors, security headers, rate limiter, error handler
└── modules/
    └── auth/        # Each module: routes → controller → service → model
```

**Key details:**
- Entry point: `backend/index.js` — connects DB, runs migrations, connects Redis, starts server
- Database: **TiDB Cloud** via `mysql2/promise` with TLS 1.2+ connection pooling
- Redis: **Upstash** (REST-based) with in-memory fallback
- Auth: JWT tokens + bcrypt password hashing
- Rate limiting: In-memory per-IP tracking (100 req/15min default)
- Adding a new module: create `src/modules/<name>/` with routes/controller/service/model, then register routes in `index.js`
- Environment variables via `.env` file (see backend README for schema)

## API Endpoints

```
GET    /health               — Health check (DB + Redis status)
POST   /v1/auth/register    — Register (name, email, password)
POST   /v1/auth/login       — Login (email, password) → JWT token
GET    /v1/auth/profile     — Protected (requires Authorization: Bearer <token>)
```

## Important Notes

- The frontend `AGENTS.md` notes that this Next.js version may have breaking API changes — always verify conventions against `node_modules/next/dist/docs/` before writing code
- Backend is pure JavaScript (no TypeScript) — use CommonJS `require()` syntax
- Both projects use separate dependency trees; never share `node_modules` across them
