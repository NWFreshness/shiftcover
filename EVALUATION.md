# ShiftCover — Evaluation & Progress Tracker

> Status snapshot: backend ~70% built and partially functional; frontend is a demo
> shell not yet wired to the API. Created 2026-05-20.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Critical fixes (do first)

### Secrets & dev DB committed to git
- [ ] Rotate all credentials in `backend/.env` (DATABASE_URL, Twilio SID/token, JWT_SECRET) — assume compromised **(user action — must be done in Twilio/DB consoles)**
- [x] `git rm --cached backend/.env backend/prisma/dev.db` (staged; commit when ready)
- [ ] Scrub secrets from git history (`git filter-repo`) before pushing to any remote **(destructive — needs your go-ahead)**
- [x] Add `backend/.env.example` with empty keys

### No authentication or tenant isolation
- [x] `middleware/auth.js` now verifies JWTs (`requireAuth`) and exposes `req.auth` + `requireManager` gate
- [x] All `/api/*` resource routes mounted behind `requireAuth` and scoped to `req.auth.businessId`; `GET /api/businesses` returns only the caller's business; mutations are manager-only
- [x] Real auth via `jsonwebtoken`; every query scoped to the authenticated business
- [x] 6-digit invite-code login: `POST /api/auth/login` + `POST /api/auth/register` (bootstraps business + manager); Employee schema gained `inviteCode`/`isManager`
- [ ] Frontend `login/page.tsx` still needs to call `/api/auth/login` (tracked under Frontend wiring)

### No rate limiting
- [x] `express-rate-limit` added: global limiter on `/api/*`, stricter limiter on `/api/auth`
- [x] CORS restricted to `CORS_ORIGIN` env (defaults to `http://localhost:3000`)

### Follow-ups created during this work
- [ ] Apply schema changes to the DB: run `npx prisma migrate dev` (adds `inviteCode`, `isManager` columns) once Postgres is reachable
- [x] Prisma version mismatch resolved early (client + CLI both pinned to 5.22.0) — was blocking client generation

---

## Bugs / correctness

- [x] Weekly-hours check undercount fixed: hours now summed over the full ISO week (Mon–Sun) from the business's shifts, and the target shift's own hours are included so `maxHoursPerWeek` is actually enforced
- [x] Dead/broken code removed: deleted unused `violatesRestPeriod`, `getEmployeeShiftsInRange` (referenced non-existent `shift.employeeId`), `timeToMinutes`, and stray `sanitizeError`
- [x] Rules now enforced: `noDoubleShiftHours` (reject a 2nd shift starting within N hours) and `preferredWorkerMap` (preferred employees for a site sorted first) applied in `findCoverage`
- [x] Overnight shifts handled consistently via a single `shiftInterval` helper (end rolls to next day when end<=start); used for duration, rest gaps, and double-shift checks
- [x] Timezone bug fixed: `getWeekStart` now parses date components in local time and always lands on Monday (verified Wed/Sun/Mon → same Monday)
- [x] Prisma version mismatch: aligned client + CLI to `5.22.0` across the workspace (clean reinstall); `@prisma/client` moved to dependencies. Also hardened `sms.js` to skip Twilio init unless `accountSid` starts with `AC` (was crashing boot with placeholder creds)
- [ ] No migrations: only `schema.prisma`, no `migrations/` folder, but README says `prisma migrate dev`. Generate a baseline migration

---

## Code quality / architecture

- [x] PrismaClient is now a shared singleton (`lib/prisma.js`) used by every route/service
- [x] Error handling unified — all routes sanitize errors; `employee.js` validates ownership/scope
- [x] zod validation added at route boundaries (`schemas.js` + `validate` middleware) on all mutating endpoints; phone enforced as E.164, email format checked, dates/times validated
- [x] First test suite added (`node --test`, 22 tests): pure scheduling engine extracted to `services/scheduling.js` and covered (overnight, rest, double-shift, weekly cap, preferred, week math) plus schema validation tests. Run with `npm test`
- [ ] Follow-up: route/integration tests (need a test DB) for the concurrency-sensitive claim/coverage paths

---

## Frontend wiring (currently demo-only)

- [x] `login/page.tsx` — calls `POST /api/auth/login`, stores the session, routes managers to `/manager` and employees to `/board`, shows errors
- [x] Added `lib/auth.ts` — token storage + `apiFetch` wrapper that attaches the Bearer token
- [x] `board/page.tsx` — uses `apiFetch('/api/shifts')`, claims with token identity (no `employeeId` in body), redirects to `/login` if unauthenticated
- [x] `manager/page.tsx` — auth + manager gate, real stats from `/api/coverage/stats`, employees from `/api/employees`, "Add Shift" now POSTs to `/api/shifts`
- [x] `ScheduleGrid` / `CoverageToggle` — updated to `apiFetch` + new token-scoped routes (dropped `businessId` props)
- [ ] Add a logout control and handle 401s globally (e.g. redirect to `/login` on expired token)

---

## New features to consider

### Close PRD gaps (promised, missing)
- [ ] Invite-code auth flow: generate → SMS → verify → issue session/JWT (unblocks everything else)
- [ ] CoverageRule CRUD endpoint (Auto-mode toggle has nothing to configure)
- [ ] Swap requests: model exists, no routes/UI
- [ ] Availability: PRD 3.4 not in schema; coverage engine should respect it
- [ ] Auto-detection of uncovered shifts + manager alerts ("uncovered > X hours", "couldn't fill") via scheduled job

### Beyond the PRD
- [ ] Real-time board updates (SSE/websockets) to avoid claim races (loser currently just gets 409)
- [ ] Inbound SMS ("reply YES to claim") via Twilio webhook — fits phone-first audience
- [ ] Audit log of claims/assignments for manager trust
- [ ] Coverage analytics dashboard (time-to-fill, % auto-covered) — surfaces PRD success metrics from existing `getCoverageStats`

---

## Suggested order

1. Security trio: untrack/rotate secrets → real auth + tenant isolation → rate limiting
2. Wire frontend to backend (depends on auth)
3. Coverage-engine bug-fix pass (`coverage.js`)
4. PRD-gap features (rules CRUD, availability, swaps)
5. Beyond-PRD enhancements

> Note: there is already an uncommitted modification to `backend/src/services/coverage.js` in the working tree — review it before the bug-fix pass.
