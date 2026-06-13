# Survey Builder — Cloudflare Full-Stack Assignment

A full-stack survey-builder application built on the Cloudflare developer platform.

## Tech Stack

| Layer | Technology |
|---|---|
| **API** | [Hono](https://hono.dev/) on Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite) |
| **Session store** | Cloudflare KV |
| **Web** | React 18 + Vite 6 + TanStack Router v1 |
| **Shared types** | `packages/shared` — Zod schemas + TypeScript types |
| **Monorepo** | pnpm workspaces |
| **Lint/Format** | Biome |

---

## Project Structure

```
DocedoGoAssgnmnt/
├── api/                        # Cloudflare Worker (Hono)
│   ├── src/
│   │   ├── index.ts            # App entry — global middleware + routes
│   │   ├── env.ts              # Env bindings type (D1, KV)
│   │   ├── middleware/
│   │   │   ├── auth.ts         # requireAuth middleware
│   │   │   └── cors.ts         # CORS config
│   │   ├── routes/
│   │   │   ├── auth.ts         # /api/auth/* (magic-link, verify, me, logout)
│   │   │   ├── surveys.ts      # /api/surveys (CRUD, auth-protected)
│   │   │   ├── responses.ts    # /api/surveys/:id/responses (paginated)
│   │   │   └── public.ts       # /api/public/s/:id (no auth)
│   │   ├── services/
│   │   │   ├── auth.service.ts # Magic link + KV session management
│   │   │   ├── survey.service.ts
│   │   │   └── response.service.ts
│   │   └── db/
│   │       └── migrations/
│   │           └── 0001_init.sql
│   └── wrangler.json
├── web/                        # React SPA (Vite)
│   ├── src/
│   │   ├── api/client.ts       # Typed fetch wrappers (authApi, surveysApi, publicApi)
│   │   ├── hooks/useAuth.ts    # Auth state via React Query
│   │   ├── lib/utils.ts        # Formatting helpers
│   │   ├── styles/globals.css  # Dark-mode design system (CSS custom properties)
│   │   └── routes/
│   │       ├── __root.tsx      # Nav bar + layout
│   │       ├── index.tsx       # Redirect → /dashboard or /login
│   │       ├── login.tsx       # Magic-link form
│   │       ├── dashboard.tsx   # Survey list
│   │       ├── auth/verify.tsx # Handles ?token= from email link
│   │       ├── surveys/
│   │       │   ├── new.tsx
│   │       │   ├── $id.edit.tsx      # Survey builder (DnD questions, branding)
│   │       │   └── $id.responses.tsx # Paginated response viewer
│   │       └── s/
│   │           ├── $publicId.tsx         # Public survey form
│   │           └── $publicId_.thanks.tsx  # Thank-you page (flat route)
│   └── vite.config.ts
└── packages/
    └── shared/                 # Shared Zod schemas + TypeScript types
        └── src/
            ├── schemas/        # auth.ts, survey.ts, response.ts
            └── types/index.ts
```

---

## Local Development

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm i -g pnpm`
- **Wrangler** is installed as a dev dependency; no global install needed

### 1. Install dependencies

```bash
pnpm install
```

### 2. Apply the D1 migration (first-time setup)

```bash
pnpm --filter api exec wrangler d1 migrations apply survey-db --local
```

This creates the local SQLite database at `api/.wrangler/state/v3/d1/`.

### 3. Start both dev servers

```bash
pnpm dev
```

This runs concurrently:
- `wrangler dev` → API at **http://localhost:8787**
- `vite dev` → Web at **http://localhost:5173** (proxies `/api/*` to :8787)

### 4. Sign in

1. Open **http://localhost:5173**
2. Enter any email address → click **Send magic link ✦**
3. **Check the Wrangler console** — the magic link is printed there (no email client needed in dev):
   ```
   ✉️  Magic Link for you@example.com:
   http://localhost:5173/auth/verify?token=<TOKEN>
   ```
4. Click or paste the link — you'll be redirected to `/dashboard`.

---

## Authentication Flow

```
Browser → POST /api/auth/magic-link (email)
         → token stored in KV (15 min TTL)
         → link logged to console (dev) / sent via email (prod)

Browser → clicks magic link → frontend /auth/verify?token=<T>
         → POST /api/auth/verify { token }
         → token validated & deleted (one-time use)
         → session created in KV (7 day TTL)
         → Set-Cookie: session=<sessionId>; HttpOnly; SameSite=Lax
         → client-side navigate → /dashboard

All subsequent API calls → session cookie → requireAuth middleware
         → KV lookup → D1 user fetch → c.var.user attached
```

---

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/magic-link` | ❌ | Request magic link |
| POST | `/verify` | ❌ | Verify token (JSON body) → set cookie |
| GET | `/me` | ✅ | Return current user |
| POST | `/logout` | ✅ | Delete session, clear cookie |

### Surveys (`/api/surveys`) — all require auth

| Method | Path | Description |
|---|---|---|
| GET | `/` | List user's surveys (with response count) |
| POST | `/` | Create survey |
| GET | `/:id` | Get survey + questions |
| PATCH | `/:id` | Update survey + atomically replace questions |
| DELETE | `/:id` | Delete survey (cascades questions & responses) |
| GET | `/:id/responses` | Paginated responses (50/page) |

### Public (`/api/public`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/s/:publicId` | ❌ | Survey + questions (no owner PII, edge-cached 60s) |
| POST | `/s/:publicId/respond` | ❌ | Submit response (validates required fields) |

---

## Question Types

| Type | Description |
|---|---|
| `short_text` | Single-line text input |
| `long_text` | Multi-line textarea |
| `multiple_choice` | Radio buttons (2–20 options) |
| `rating` | 1–5 star/number rating |
| `date` | Date picker |

---

## Deployment (Cloudflare)

### 1. Create production D1 database

```bash
pnpm --filter api exec wrangler d1 create survey-db
```

Update the `database_id` in `api/wrangler.json` with the returned ID.

### 2. Apply migration to production

```bash
pnpm --filter api exec wrangler d1 migrations apply survey-db --remote
```

### 3. Create KV namespace

```bash
pnpm --filter api exec wrangler kv namespace create KV
pnpm --filter api exec wrangler kv namespace create KV --preview
```

Update the `id` and `preview_id` in `api/wrangler.json`.

### 4. Build & deploy API

```bash
pnpm --filter api exec wrangler deploy
```

### 5. Build & deploy Web (Cloudflare Pages)

```bash
pnpm --filter web build
# Deploy the web/dist folder to Cloudflare Pages
pnpm --filter api exec wrangler pages deploy web/dist --project-name survey-builder
```

Configure the Pages project to forward `/api/*` requests to your Worker.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start API + Web in parallel |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm check` | Biome lint + format check |
| `pnpm check:fix` | Biome lint + format auto-fix |
| `pnpm build` | Production build of web |

---

## Key Design Decisions

- **Magic-link auth** — No passwords; tokens are one-time use and stored in KV with a 15-min TTL. Sessions use a separate KV key with a 7-day TTL.
- **Atomic question replace** — `PATCH /surveys/:id` deletes all existing questions and re-inserts the full array in a single `db.batch()` call, avoiding drift between the client's sorted list and the DB.
- **Public survey isolation** — `owner_id` is stripped before returning public survey data. The `public_id` is a 16-character random hex slug, decoupled from the internal `id`.
- **Edge caching** — Public survey responses are cached for 60 seconds via `Cache-Control: public, max-age=60`.
- **IDOR protection** — All owner-scoped queries include `AND owner_id = ?` to prevent cross-user access.
