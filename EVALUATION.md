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

- [ ] Weekly-hours check undercounts: `findCoverage` loads shifts with `date >= shift.date` (`coverage.js:118-130`), hiding earlier-in-week shifts from `calculateWeeklyHours` → `maxHoursPerWeek` can be exceeded
- [ ] Dead/broken code: `violatesRestPeriod` (`coverage.js:27`) and `getEmployeeShiftsInRange` (`coverage.js:40`) are unused; the latter queries non-existent `shift.employeeId` (should be `assignedEmployeeId`)
- [ ] Rules never enforced: `noDoubleShiftHours` and `preferredWorkerMap` exist in schema but `findCoverage` ignores them (only rest hours + weekly cap checked)
- [ ] Overnight shifts inconsistent: `calculateWeeklyHours` adds 24h when end<start (`coverage.js:92`) but `shiftEndAsDate` (`coverage.js:20`) does not → wrong rest-period math for shifts crossing midnight
- [ ] Timezone bug: `getWeekStart` (`coverage.js:166`) does `new Date(dateStr)` (UTC) then reads with local getters → off-by-one near boundaries
- [x] Prisma version mismatch: aligned client + CLI to `5.22.0` across the workspace (clean reinstall); `@prisma/client` moved to dependencies. Also hardened `sms.js` to skip Twilio init unless `accountSid` starts with `AC` (was crashing boot with placeholder creds)
- [ ] No migrations: only `schema.prisma`, no `migrations/` folder, but README says `prisma migrate dev`. Generate a baseline migration

---

## Code quality / architecture

- [ ] PrismaClient instantiated per file (every route + service) → connection exhaustion; use a shared singleton
- [ ] Inconsistent error handling: `business.js` and `employee.js` leak raw `error.message` (info disclosure); others sanitize. `employee.js` also skips UUID validation
- [ ] No input validation library; add zod (or similar) at route boundaries. Validate phone (E.164 for Twilio) and email format
- [ ] No tests — especially needed for the concurrency-sensitive claim/coverage logic

---

## Frontend wiring (currently demo-only)

- [ ] `manager/page.tsx` — "Add Shift" is a `console.log` TODO (`:28`), stats hardcoded (`12/10/2`), uses `DEMO_BUSINESS_ID = 'demo'`
- [ ] `board/page.tsx` — fetches `/api/shifts/demo` and claims with `employeeId: 'demo-employee'`; neither is a UUID → backend 400
- [ ] `login/page.tsx` — any 6-digit code routes to `/board`; no backend call
- [ ] Replace demo IDs/handlers with real fetches + session state once auth lands

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
