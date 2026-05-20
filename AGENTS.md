# ShiftCover — Agent Guide

Shift-coverage app for small local businesses (5–50 employees). Managers build
schedules and post open shifts; employees claim or swap them from a mobile web
PWA. Read `PRD.md` for product intent and `README.md` for the feature list.

> **Read this before changing code.** It encodes conventions that aren't obvious
> from any single file. When code and docs disagree, **the code is the source of
> truth** — the README's API list is partially stale (see "Known doc drift").

---

## Repository layout

```
backend/    Express API (ESM), Prisma, JWT auth, zod validation
frontend/   Next.js 16 App Router + React 19 + Tailwind v4 (PWA)
docs/       plans/ — implementation notes
PRD.md, README.md, EVALUATION.md, e2e-test.mjs
```

This is an **npm workspaces** monorepo (`frontend`, `backend`). `node_modules` is
hoisted to the repo root — run `npm install` **from the root**, not per-package.
There are nested `package-lock.json` files; Next warns about "multiple lockfiles"
— harmless, but don't add more.

**Nested guide:** `frontend/AGENTS.md` exists and is authoritative for frontend
work — read it first when touching anything under `frontend/`.

---

## Setup & run

```bash
npm install                       # from repo root (workspaces)
cp backend/.env.example backend/.env   # then fill in values
npm run dev                       # runs backend + frontend together (concurrently)
```

- **Backend** listens on `PORT` (default **3001**).
- **Frontend** runs on **3000** and proxies `/api/*` → `http://localhost:3001`
  via `frontend/next.config.js` rewrites. Never hardcode the backend URL in
  frontend code — always call relative `/api/...`.
- `CORS_ORIGIN` (backend) must match the frontend origin; defaults to
  `http://localhost:3000`.

**Database (Prisma + PostgreSQL):**
```bash
cd backend
npx prisma migrate dev      # apply/create migrations
npx prisma generate         # regenerate client after schema edits
node prisma/seed.js         # seed (currently a stub)
```
Edit `backend/prisma/schema.prisma`, then migrate + generate. Use the shared
client at `backend/src/lib/prisma.js` — **never** `new PrismaClient()` elsewhere.

---

## Backend conventions (`backend/`)

- **ESM only** (`"type": "module"`). Use `import`/`export` and include the `.js`
  extension in relative imports (e.g. `import x from './lib/prisma.js'`).
- **Auth:** login is a 6-digit invite code → JWT (`src/routes/auth.js`,
  `src/middleware/auth.js`). All routers except `/api/auth` are mounted behind
  `requireAuth` in `src/index.js`; manager-only handlers use `requireManager`.
  `businessId` and role come **from the token**, not from URL params.
- **Mount new routers** in `src/index.js` under `/api/...` with the rate limiter
  and `requireAuth`.
- **Validate every request body** with a zod schema from `src/schemas.js` via the
  `validate(schema)` middleware (`src/middleware/validate.js`). It replaces
  `req.body` with parsed data and returns 400 on failure.
- **Services** hold business logic: `services/coverage.js`,
  `services/scheduling.js`, `services/alerts.js`, `services/sms.js`. Keep route
  handlers thin.
- **SMS is optional.** With no Twilio env vars, SMS is disabled — features must
  degrade gracefully, not hard-fail, when SMS is off.

## Frontend conventions (`frontend/`)

- **Next.js 16.2.6 is NOT the Next.js in your training data.** APIs/conventions
  differ. Per `frontend/AGENTS.md`, consult the bundled docs in
  `node_modules/next/dist/docs/` before writing Next code.
- **Tailwind v4** — configured in CSS via `@theme` inside
  `src/app/globals.css`. There is **no `tailwind.config.js`**; do not add one.
- **Use the design system; do not reintroduce generic defaults** (no Inter/Arial/
  system fonts, no indigo, no `bg-gray-50` white-shadow cards). The aesthetic is
  "The Timecard": warm paper + ink, deep pine, marigold accents.
  - Fonts via `next/font` (Bricolage Grotesque display, Hanken Grotesk body,
    IBM Plex Mono for times/codes) — wired in `src/app/layout.tsx`.
  - Color tokens: `paper`, `surface`, `ink`, `ink-soft`, `line`, `pine`
    (brand/primary), `marigold` (open/attention), `sage` (filled/success),
    `brick` (danger).
  - Reusable classes in `globals.css`: `.btn` (`.btn-primary` `.btn-accent`
    `.btn-ghost` `.btn-danger` `.btn-sm`), `.card`, `.chip` (`.chip-open`
    `.chip-filled` `.chip-danger` `.chip-info` `.chip-neutral`), `.field` /
    `.field-label`, `.banner`, `.label-stamp`, `.animate-rise`.
  - Status colors are semantic: **filled → sage/green, open → marigold.**
- **Always call the API through `apiFetch`** (`src/lib/auth.ts`) — it attaches
  the bearer token and JSON headers. Session lives in `localStorage` (`getToken`,
  `isManager`, `getEmployeeId`, `logout`). Don't call `fetch` directly for authed
  endpoints.
- Shared chrome: `components/TopBar.tsx` (brand + sign-out) and
  `components/Brand.tsx`. Reuse them rather than re-rolling page headers.

---

## Testing & checks

- **Backend:** `npm test --workspace=backend` (Node's built-in runner;
  `backend/test/*.test.js`).
- **Frontend:** `npm run lint --workspace=frontend` and
  `npm run build --workspace=frontend` (build also type-checks).
- `e2e-test.mjs` (repo root) is a manual end-to-end script against a running
  backend.

Run the relevant checks before claiming work is done.

---

## Known doc drift (verify against code)

- The README API list is intended to track live routes, but the code remains the
  source of truth. Trust `backend/src/routes/` and the `apiFetch` calls in
  `frontend/src` when they disagree.
- README says the backend entry is `index.js`; it's actually `src/index.js`.

## Don'ts

- Don't commit `backend/.env` or any secrets (`.env` is gitignored).
- Don't add a `tailwind.config.js` (Tailwind v4 is CSS-first).
- Don't bypass `requireAuth` / zod validation, or instantiate Prisma directly.
- Don't hardcode `localhost:3001` in the frontend — use `/api/*`.
- Don't skip hooks (`--no-verify`) or commit without running the checks above.
