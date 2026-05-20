# ShiftCover — Onboarding Flow Implementation Plan

> **For implementers:** Tasks are ordered. Backend tasks (Phase 1) unblock the
> frontend. Follow repo conventions in `/AGENTS.md` and `frontend/AGENTS.md`:
> backend is ESM + Prisma singleton + zod `validate` + `requireAuth`/`requireManager`;
> frontend uses the "Timecard" design system and the `apiFetch` wrapper. Write
> backend tests with `node --test` (see `backend/test/`).

**Goal:** Give a new business owner a real entry path into ShiftCover — sign up,
get guided through setup (business profile → default shift templates → add &
invite employees → coverage rules), and give first-time employees a short welcome
(confirm details + set availability) when they redeem their invite code.

**Confirmed scope:**
- Manager **signup** + guided **setup wizard**.
- **Employee first-run** onboarding after code login.
- Invite delivery: **show & copy code in-app + optional SMS** (graceful no-op when
  Twilio is unconfigured).
- **Default shift times**: new `DefaultShift` model + migration + wizard step + API.

**Non-goals (v1):** auto-generating a week's schedule from templates (templates are
stored and reusable, but "apply template → create shifts" is a follow-up);
email/password auth; multi-manager invite roles; editing another business.

---

## Current state (what already exists)

Backend (no UI yet for most of it):
- `POST /api/auth/register` → creates `Business` + first manager `Employee`,
  returns `{ token, businessId, inviteCode }` (`backend/src/routes/auth.js`).
- `POST /api/auth/login` → 6-digit code → `{ token, businessId, isManager, employee }`.
- Employee CRUD `GET/POST/PUT/DELETE /api/employees` (create returns `inviteCode`),
  manager-gated for writes (`backend/src/routes/employee.js`).
- `GET/PUT /api/businesses` (`business.js`), `GET/PUT /api/coverage/rules` (already
  wired to `/manager/settings`).
- `sendSms(phone, message)` + `isSMSEnabled()` (`backend/src/services/sms.js`).

Frontend gaps this plan fills:
- No `/signup`; login is code-only.
- No employee-management UI; no invite-code surfacing.
- No guided first-run for managers or employees.
- No default-shift concept anywhere.

---

## Phase 1 — Backend: data model, onboarding state, self-service

### Task 1: Schema changes + migration

**Objective:** Add the `DefaultShift` model and onboarding-tracking fields.

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev --name onboarding` (run from `backend/`)

**Step 1: Edit schema**

```prisma
model Business {
  // ...existing fields...
  onboardingCompletedAt DateTime?
  defaultShifts         DefaultShift[]
}

model Employee {
  // ...existing fields...
  onboardedAt DateTime?
}

model DefaultShift {
  id          String   @id @default(uuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id])
  label       String          // e.g. "Morning bar"
  role        String
  startTime   String          // "HH:MM"
  endTime     String          // "HH:MM"
  site        String?
  daysOfWeek  String  @default("[]") // JSON array of 0-6 (Sun-Sat), like qualifications
  createdAt   DateTime @default(now())
}
```

**Step 2:** `npx prisma migrate dev --name onboarding` then `npx prisma generate`.
(Postgres datasource — confirm `DATABASE_URL` is set first.)

**Notes:** `daysOfWeek` follows the existing JSON-string-in-a-String pattern used by
`Employee.qualifications` / `CoverageRule.preferredWorkerMap`; parse/stringify at the
route boundary.

---

### Task 2: Default-shift schemas + routes

**Objective:** Manager CRUD for shift templates.

**Files:**
- Modify: `backend/src/schemas.js`
- Create: `backend/src/routes/defaultShift.js`
- Modify: `backend/src/index.js` (mount router)
- Create: `backend/test/defaultShift.test.js`

**Step 1: Schemas**

```js
const timeStr = /* reuse existing timeStr */;
export const defaultShiftCreateSchema = z.object({
  label: z.string().min(1),
  role: z.string().min(1),
  startTime: timeStr,
  endTime: timeStr,
  site: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});
export const defaultShiftUpdateSchema = defaultShiftCreateSchema.partial();
```

**Step 2: Routes** (pattern-match `employee.js`: `requireManager` on writes, scope by
`req.auth.businessId`, parse/stringify `daysOfWeek`):
- `GET /api/default-shifts` (auth) → list for business
- `POST /api/default-shifts` (manager) → create
- `PUT /api/default-shifts/:id` (manager) → update (ownership check)
- `DELETE /api/default-shifts/:id` (manager) → delete (ownership check)

**Step 3: Mount** in `index.js`:
```js
import defaultShiftRoutes from './routes/defaultShift.js';
app.use('/api/default-shifts', apiLimiter, requireAuth, defaultShiftRoutes);
```

**Step 4: Tests** — create/list/scope-isolation/ownership-404.

---

### Task 3: Onboarding status + complete endpoints

**Objective:** Let the frontend gate the wizard and mark it done.

**Files:**
- Create: `backend/src/routes/onboarding.js`
- Modify: `backend/src/index.js`
- Create: `backend/test/onboarding.test.js`

**Endpoints (manager-gated):**
- `GET /api/onboarding/status` →
  ```json
  {
    "completedAt": null,
    "steps": {
      "businessProfile": true,
      "defaultShifts": false,
      "employees": false,
      "coverageRules": false
    }
  }
  ```
  Compute: `businessProfile` = name & industryType present; `defaultShifts` =
  count > 0; `employees` = non-manager employee count > 0; `coverageRules` =
  a `CoverageRule` row exists for the business.
- `POST /api/onboarding/complete` → sets `Business.onboardingCompletedAt = now()`,
  returns the business.

**Tests:** status reflects created data; complete sets timestamp.

---

### Task 4: Employee self-service endpoints

**Objective:** Employees confirm their own profile + flag first-run done.

**Files:**
- Modify: `backend/src/routes/employee.js`
- Modify: `backend/src/schemas.js`
- Modify: `backend/test/` (extend employee tests)

**Step 1: Schema** — `employeeSelfUpdateSchema` (name/phone/email only; no role/status).

**Step 2: Routes** (auth, scoped to `req.auth.employeeId` — NOT manager-gated):
- `GET /api/employees/me` → current employee (include `onboardedAt`).
- `PUT /api/employees/me` → update name/phone/email.
- `POST /api/employees/me/onboarded` → set `onboardedAt = now()`.

> **Ordering caveat:** define `/me` routes **before** the existing `/:id` routes in
> the router so `me` isn't captured as an `:id` param.

**Step 3:** In `auth.js` login response, add `needsOnboarding: !employee.onboardedAt`
so the client can route first-time employees without an extra request.

---

### Task 5: Invite delivery endpoint + SMS availability

**Objective:** Manager can (re)send an invite code by SMS; UI knows if SMS is live.

**Files:**
- Modify: `backend/src/routes/employee.js`
- Modify: `backend/src/routes/business.js`
- Create/extend: `backend/test/` invite test (mock `sendSms`)

**Step 1: Invite endpoint** (manager, ownership check):
```js
// POST /api/employees/:id/invite
// ensures the employee has an inviteCode (generate if missing), then texts it
const msg = `ShiftCover: Your access code is ${code}. Open ${appUrl} and enter it to sign in.`;
const result = await sendSms(employee.phone, msg); // {success:false, reason:'SMS disabled'} when off
res.json({ code, smsEnabled: isSMSEnabled(), sent: result.success });
```
- `appUrl` from `process.env.APP_URL` (fallback to `CORS_ORIGIN`).
- Never fails the request when SMS is disabled — returns `sent:false`.

**Step 2: Expose SMS availability** — add `smsEnabled: isSMSEnabled()` to the
`GET /api/businesses` response so the wizard can show/hide the "Text invite" button.

**Step 3: Register response** — extend `POST /api/auth/register` to also return
`employeeId` and `isManager:true` so the frontend `saveSession(token, isManager, employeeId)`
works identically to login.

---

## Phase 2 — Frontend: manager signup + setup wizard

Design-system reminder: use `.btn`/`.btn-primary`/`.btn-accent`/`.btn-ghost`,
`.card`, `.field`/`.field-label`, `.chip`, `.banner`, `.label-stamp`,
`.animate-rise`; route all calls through `apiFetch` (`src/lib/auth.ts`).

### Task 6: Signup page + auth lib

**Objective:** New owners create a business and land in the wizard.

**Files:**
- Create: `frontend/src/app/signup/page.tsx`
- Modify: `frontend/src/app/login/page.tsx` (add "Create a business" link)
- Modify: `frontend/src/lib/auth.ts` (optional `register()` helper)

**Behavior:**
- Fields: business name, **industry** (select: Food & Beverage, Cleaning & Janitorial,
  Hospitality, Retail, Healthcare support, Field service — from PRD §2), manager name,
  phone. Include a phone helper that normalizes to E.164 (default `+1`), since the
  backend requires `^\+[1-9]\d{6,14}$`.
- `POST /api/auth/register` → `saveSession(token, true, employeeId)` →
  show the manager's own invite code (copyable) → continue to `/manager/onboarding`.
- Reuse the "Timecard" card styling from the login page.

---

### Task 7: Wizard shell + stepper + gating

**Objective:** A resumable multi-step container.

**Files:**
- Create: `frontend/src/app/manager/onboarding/page.tsx`
- Create: `frontend/src/components/onboarding/Stepper.tsx`
- Create: `frontend/src/components/onboarding/WizardShell.tsx`

**Behavior:**
- On mount: `getToken()`/`isManager()` guards; fetch `GET /api/onboarding/status`.
- Steps: **1 Business · 2 Shift templates · 3 Team · 4 Rules · Done**. Stepper shows
  completion via `.chip-filled`/`.chip-neutral`. Steps are individually skippable;
  "Done" enabled anytime.
- Local `step` state; each step component gets `onNext`/`onBack` and re-fetches status
  after writes so the stepper stays accurate.

---

### Task 8: Step — Business profile

**Files:** `frontend/src/components/onboarding/StepBusiness.tsx`
- Pre-fill from `GET /api/businesses`; `PUT /api/businesses` on save (name, industry).

### Task 9: Step — Default shift templates

**Files:**
- `frontend/src/components/onboarding/StepDefaultShifts.tsx`
- `frontend/src/components/DefaultShiftForm.tsx` (reusable)

**Behavior:** list existing templates (`GET /api/default-shifts`); add/edit/delete
(label, role, start/end time, optional site, optional day-of-week toggles).
Times use mono inputs (design system already styles `type="time"`).

### Task 10: Step — Team (add + invite employees)

**Objective:** Add staff and surface invite codes with copy + optional SMS. This is
the heart of onboarding.

**Files:**
- `frontend/src/components/onboarding/StepTeam.tsx`
- `frontend/src/components/EmployeeManager.tsx` (shared — also used by Task 12)
- `frontend/src/components/InviteCard.tsx`
- `frontend/src/components/CopyButton.tsx`

**Behavior:**
- Add-employee form (name, phone E.164 helper, role, optional email, optional
  qualifications) → `POST /api/employees`; show returned `inviteCode`.
- Employee list with each person's `inviteCode` in mono, a **Copy** button, and —
  when `smsEnabled` (from `GET /api/businesses`) — a **Text invite** button →
  `POST /api/employees/:id/invite` (toast on `sent`/disabled).
- Edit/remove via existing `PUT`/`DELETE /api/employees/:id`.

### Task 11: Step — Coverage rules + finish

**Files:**
- `frontend/src/components/onboarding/StepRules.tsx`
- Refactor: extract the rules form from `frontend/src/app/manager/settings/page.tsx`
  into a shared `CoverageRulesForm` component used by both the wizard and Settings.
- Finish action → `POST /api/onboarding/complete` → `router.replace('/manager')`.

---

### Task 12: Standalone employee management page

**Objective:** Employee management remains available after onboarding.

**Files:**
- Create: `frontend/src/app/manager/employees/page.tsx` (renders shared
  `EmployeeManager` inside `TopBar`).
- Modify: `frontend/src/app/manager/page.tsx` — add a "Team" link in the `TopBar`.

---

## Phase 3 — Frontend: employee first-run

### Task 13: Employee welcome flow

**Objective:** First-time employees confirm details and set availability.

**Files:**
- Create: `frontend/src/app/welcome/page.tsx`
- Modify: `frontend/src/app/login/page.tsx` — on employee login, if
  `needsOnboarding`, `router.push('/welcome')` instead of `/board`.

**Behavior (2 short steps):**
1. Confirm name + phone (`GET /api/employees/me` → `PUT /api/employees/me`).
2. Mark availability for the next ~7 days (reuse `PUT /api/availability`; can skip).
3. `POST /api/employees/me/onboarded` → `router.replace('/board')`.

---

## Phase 4 — Gating, tests, docs

### Task 14: Route gating

**Files:** `frontend/src/app/manager/page.tsx`, `frontend/src/app/login/page.tsx`
- Manager dashboard: on load, `GET /api/onboarding/status`; if `completedAt` is null,
  `router.replace('/manager/onboarding')`. (Wizard has an explicit "skip to dashboard"
  escape so it's not a hard trap.)
- Login redirect honors `isManager` (→ status check) and `needsOnboarding` (→ `/welcome`).

### Task 15: Tests & checks
- Backend: `npm test --workspace=backend` — new suites for default-shifts, onboarding
  status/complete, employee `me` + invite (mock `sendSms`).
- Frontend: `npm run lint --workspace=frontend` and `npm run build --workspace=frontend`
  (type-check). Manually click signup → wizard → employee welcome against a running API.

### Task 16: Docs
- Update `README.md` API list (new endpoints) and `/AGENTS.md` "Known doc drift" if
  routes change.
- Note new env var `APP_URL` (used in invite SMS) in `backend/.env.example`.

---

## Build order / dependencies

1. **Phase 1** (Tasks 1→5) first — migration + endpoints unblock everything.
2. **Phase 2** (Tasks 6→12) — signup then wizard; Task 10 builds the shared
   `EmployeeManager` that Task 12 reuses; Task 11 extracts `CoverageRulesForm`.
3. **Phase 3** (Task 13) — independent of the wizard; depends on Task 4 endpoints.
4. **Phase 4** (Tasks 14→16) — wire gating last, then tests + docs.

## Risks / decisions
- **Phone format:** backend enforces E.164 — the signup/employee forms must normalize
  or users will hit validation errors. Build the helper early (Task 6).
- **`/me` route ordering** must precede `/:id` (Task 4) or it 404s.
- **SMS disabled in dev:** every SMS path must degrade to "code shown for manual share"
  — the invite endpoint already returns `sent:false` rather than erroring.
- **Default shifts are templates only** in v1; "generate shifts from templates" is a
  flagged follow-up, not in this plan.
