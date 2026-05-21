# High-Value Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to ShiftCover — Publish Week (generate shifts from templates), My Upcoming Shifts (employee view), and Stale Open Alert Banner (manager in-app alert).

**Architecture:** All features are additive — no schema migrations, no new dependencies. Backend changes are new routes/service fields; frontend changes are new pages/components plus updates to two existing pages. Pure utility functions are tested with Node's built-in test runner; route and DB logic is verified manually via the dev server.

**Tech Stack:** Express + Prisma + zod (backend), Next.js 16 App Router + React 19 + Tailwind v4 (frontend), Node built-in test runner (`node:test` + `node:assert/strict`).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/src/services/scheduling.js` | Modify | Add `nextMonday()` date helper |
| `backend/src/schemas.js` | Modify | Add `publishWeekSchema` |
| `backend/src/routes/defaultShift.js` | Modify | Add `POST /publish-week` handler; import from `utils.js` |
| `backend/src/routes/shift.js` | Modify | Add `GET /mine` handler before wildcard routes |
| `backend/src/services/coverage.js` | Modify | Add `staleOpen` count to `getCoverageStats` |
| `backend/test/scheduling.test.js` | Modify | Add `nextMonday` tests |
| `frontend/src/components/MyShiftCard.tsx` | Create | Sage-accented card for assigned shifts |
| `frontend/src/app/shifts/page.tsx` | Create | Employee "My Shifts" page |
| `frontend/src/app/board/page.tsx` | Modify | Add "My Shifts" nav link |
| `frontend/src/app/manager/page.tsx` | Modify | Publish Week button + stale open banner |

---

## Task 1: Add `nextMonday` to scheduling.js

**Files:**
- Modify: `backend/src/services/scheduling.js`
- Modify: `backend/test/scheduling.test.js`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `backend/test/scheduling.test.js`:

```js
import {
  shiftHours,
  getWeekStart,
  addDays,
  restViolation,
  doubleShiftViolation,
  preferredForSite,
  selectCandidate,
  nextMonday,           // add this import
} from '../src/services/scheduling.js';
```

Then add these tests at the bottom of the file:

```js
test('nextMonday: from a Monday returns the following Monday (7 days)', () => {
  // 2026-05-18 is a Monday
  assert.equal(nextMonday(new Date(2026, 4, 18)), '2026-05-25');
});

test('nextMonday: from a Wednesday returns the next Monday (5 days)', () => {
  // 2026-05-20 is a Wednesday
  assert.equal(nextMonday(new Date(2026, 4, 20)), '2026-05-25');
});

test('nextMonday: from a Sunday returns the very next day (Monday)', () => {
  // 2026-05-24 is a Sunday
  assert.equal(nextMonday(new Date(2026, 4, 24)), '2026-05-25');
});

test('nextMonday: from a Saturday returns 2 days later (Monday)', () => {
  // 2026-05-23 is a Saturday
  assert.equal(nextMonday(new Date(2026, 4, 23)), '2026-05-25');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=backend
```

Expected: 4 failures mentioning `nextMonday is not a function`.

- [ ] **Step 3: Add `nextMonday` to scheduling.js**

Add this function at the bottom of `backend/src/services/scheduling.js`, after the existing exports:

```js
// Returns the YYYY-MM-DD of the Monday that starts NEXT week — always at least 1 day away.
export function nextMonday(fromDate = new Date()) {
  const dow = fromDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = dow === 0 ? 1 : 8 - dow;
  return addDays(toDateStr(fromDate), daysUntilMonday);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test --workspace=backend
```

Expected: all tests pass, including the 4 new `nextMonday` tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/scheduling.js backend/test/scheduling.test.js
git commit -m "feat: add nextMonday date helper to scheduling utils"
```

---

## Task 2: Add `publishWeekSchema` to schemas.js

**Files:**
- Modify: `backend/src/schemas.js`

- [ ] **Step 1: Add import and write the failing tests**

In `backend/test/schemas.test.js`, update the import at the top of the file to add `publishWeekSchema`:

```js
import {
  registerSchema,
  loginSchema,
  shiftCreateSchema,
  employeeCreateSchema,
  employeeSelfUpdateSchema,
  defaultShiftCreateSchema,
  defaultShiftUpdateSchema,
  claimSchema,
  publishWeekSchema,
} from '../src/schemas.js';
```

Then add these tests at the bottom of `backend/test/schemas.test.js`:

```js
test('publishWeekSchema: accepts empty body', () => {
  const result = publishWeekSchema.safeParse({});
  assert.equal(result.success, true);
});

test('publishWeekSchema: accepts a valid YYYY-MM-DD weekStart', () => {
  const result = publishWeekSchema.safeParse({ weekStart: '2026-05-25' });
  assert.equal(result.success, true);
  assert.equal(result.data.weekStart, '2026-05-25');
});

test('publishWeekSchema: rejects a non-date string', () => {
  const result = publishWeekSchema.safeParse({ weekStart: 'next-monday' });
  assert.equal(result.success, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=backend
```

Expected: module load error — `SyntaxError: The requested module does not provide an export named 'publishWeekSchema'`.

- [ ] **Step 3: Add `publishWeekSchema` to schemas.js**

Add at the bottom of `backend/src/schemas.js`:

```js
export const publishWeekSchema = z.object({
  weekStart: dateStr.optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test --workspace=backend
```

Expected: all tests pass, including the 3 new schema tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/schemas.js backend/test/schemas.test.js
git commit -m "feat: add publishWeekSchema for publish-week endpoint"
```

---

## Task 3: Add `POST /publish-week` to defaultShift route

**Files:**
- Modify: `backend/src/routes/defaultShift.js`

- [ ] **Step 1: Update imports at the top of the file**

Replace the top of `backend/src/routes/defaultShift.js` (the import block and local `sanitizeError`) with:

```js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { requireManager } from '../middleware/auth.js';
import { defaultShiftCreateSchema, defaultShiftUpdateSchema, publishWeekSchema } from '../schemas.js';
import { sanitizeError } from '../lib/utils.js';
import { addDays, nextMonday } from '../services/scheduling.js';

const router = Router();
```

Remove the old `function sanitizeError(...) { ... }` block that follows.

- [ ] **Step 2: Add the `POST /publish-week` handler**

Add this route **before** the existing `POST /` handler (so it isn't swallowed by it — Express matches routes in registration order):

```js
// Generate shifts for next week from all default shift templates (manager only)
router.post('/publish-week', requireManager, validate(publishWeekSchema), async (req, res) => {
  try {
    const weekStart = req.body.weekStart || nextMonday();
    const today = new Date().toISOString().split('T')[0];

    const templates = await prisma.defaultShift.findMany({
      where: { businessId: req.auth.businessId },
    });

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      const daysOfWeek = JSON.parse(template.daysOfWeek || '[]');
      for (const dow of daysOfWeek) {
        // Map day-of-week (0=Sun … 6=Sat) to offset from Monday (weekStart).
        // Monday=1 → 0, Tuesday=2 → 1, …, Saturday=6 → 5, Sunday=0 → 6.
        const offset = dow === 0 ? 6 : dow - 1;
        const date = addDays(weekStart, offset);

        if (date < today) {
          skipped++;
          continue;
        }

        const existing = await prisma.shift.findFirst({
          where: {
            businessId: req.auth.businessId,
            date,
            startTime: template.startTime,
            role: template.role,
          },
        });

        if (existing) {
          skipped++;
        } else {
          await prisma.shift.create({
            data: {
              businessId: req.auth.businessId,
              date,
              startTime: template.startTime,
              endTime: template.endTime,
              role: template.role,
              site: template.site,
              status: 'open',
            },
          });
          created++;
        }
      }
    }

    res.json({ created, skipped, weekStart });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});
```

- [ ] **Step 3: Start the dev server and manually verify**

```bash
npm run dev
```

In another terminal (replace `<TOKEN>` with a manager JWT from logging in):

```bash
curl -X POST http://localhost:3001/api/default-shifts/publish-week \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response: `{"created":N,"skipped":M,"weekStart":"YYYY-MM-DD"}` with no 500 error.

Also test idempotency — run the same curl again:

Expected: `created` drops to 0, `skipped` increases (all shifts already exist).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/defaultShift.js
git commit -m "feat: add POST /api/default-shifts/publish-week endpoint"
```

---

## Task 4: Add `GET /mine` to shift route

**Files:**
- Modify: `backend/src/routes/shift.js`

- [ ] **Step 1: Add the `/mine` route**

Open `backend/src/routes/shift.js`. Find the existing `router.get('/', ...)` handler (the "Get all shifts" route at line 24). Insert the new `/mine` route **before** the `router.get('/id/:id', ...)` route, right after `router.get('/', ...)`:

```js
// Get the authenticated employee's upcoming assigned shifts
router.get('/mine', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const shifts = await prisma.shift.findMany({
      where: {
        assignedEmployeeId: req.auth.employeeId,
        date: { gte: today },
      },
      include: { assignedEmployee: true },
      orderBy: { date: 'asc' },
    });
    res.json({ shifts });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});
```

The route must appear **before** `router.get('/id/:id', ...)` in the file. In Express, routes are matched in registration order; a wildcard `:id` at a similar position would swallow `/mine`.

- [ ] **Step 2: Verify manually**

With the dev server running, call as an employee (use an employee JWT, not a manager JWT):

```bash
curl http://localhost:3001/api/shifts/mine \
  -H "Authorization: Bearer <EMPLOYEE_TOKEN>"
```

Expected: `{"shifts":[...]}` — an array of shifts where `assignedEmployeeId` matches the employee and `date >= today`. Empty array is fine if no shifts are assigned yet.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/shift.js
git commit -m "feat: add GET /api/shifts/mine for employee upcoming shifts"
```

---

## Task 5: Add `staleOpen` to `getCoverageStats`

**Files:**
- Modify: `backend/src/services/coverage.js`

- [ ] **Step 1: Update `getCoverageStats`**

Replace the entire `getCoverageStats` function in `backend/src/services/coverage.js` with:

```js
export async function getCoverageStats(businessId) {
  if (!uuidRegex.test(businessId)) {
    throw new Error('Invalid business ID format');
  }

  const thresholdHours = Number(process.env.ALERT_THRESHOLD_HOURS) || 4;
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const today = new Date().toISOString().split('T')[0];

  const [totalShifts, filledShifts, openShifts, staleOpen] = await Promise.all([
    prisma.shift.count({ where: { businessId } }),
    prisma.shift.count({ where: { businessId, status: 'filled' } }),
    prisma.shift.count({ where: { businessId, status: 'open' } }),
    prisma.shift.count({
      where: {
        businessId,
        status: 'open',
        date: { gte: today },
        createdAt: { lt: cutoff },
      },
    }),
  ]);

  return {
    total: totalShifts,
    filled: filledShifts,
    open: openShifts,
    staleOpen,
    coverageRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0,
  };
}
```

- [ ] **Step 2: Verify manually**

```bash
curl http://localhost:3001/api/coverage/stats \
  -H "Authorization: Bearer <MANAGER_TOKEN>"
```

Expected: `{"total":N,"filled":N,"open":N,"staleOpen":N,"coverageRate":N}` — `staleOpen` is present. Its value depends on how old your test shifts are.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/coverage.js
git commit -m "feat: add staleOpen count to coverage stats"
```

---

## Task 6: Create `MyShiftCard` component

**Files:**
- Create: `frontend/src/components/MyShiftCard.tsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/MyShiftCard.tsx` with this content:

```tsx
interface MyShiftCardProps {
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    site: string | null;
  };
}

export default function MyShiftCard({ shift }: MyShiftCardProps) {
  const date = new Date(shift.date);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="card relative flex flex-col overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1 bg-sage" />
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <span className="chip chip-filled mb-2">Scheduled</span>
          <div className="font-display text-lg font-bold leading-tight text-ink">{shift.role}</div>
          {shift.site && <div className="mt-0.5 text-sm text-ink-soft">{shift.site}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-base font-bold text-pine">{weekday}</div>
          <div className="font-mono text-xs text-ink-soft">{monthDay}</div>
        </div>
      </div>
      <div className="flex items-center border-t border-line bg-surface-sunk px-4 py-3">
        <span className="font-mono text-sm tabular-nums text-ink">
          {shift.startTime}–{shift.endTime}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run build --workspace=frontend 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors, none from `MyShiftCard`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MyShiftCard.tsx
git commit -m "feat: add MyShiftCard component for scheduled shifts"
```

---

## Task 7: Create `/shifts` page and add nav link

**Files:**
- Create: `frontend/src/app/shifts/page.tsx`
- Modify: `frontend/src/app/board/page.tsx`

- [ ] **Step 1: Create the shifts page**

Create `frontend/src/app/shifts/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MyShiftCard from '@/components/MyShiftCard';
import TopBar from '@/components/TopBar';
import { apiFetch, getToken } from '@/lib/auth';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string | null;
}

export default function MyShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch('/api/shifts/mine')
      .then((res) => res.json())
      .then((data) => {
        setShifts(data.shifts || []);
        setLoading(false);
      });
  }, [router]);

  return (
    <>
      <TopBar>
        <Link href="/board" className="btn btn-ghost btn-sm">
          Open Shifts
        </Link>
        <Link href="/swaps" className="btn btn-ghost btn-sm">
          Swaps
        </Link>
        <Link href="/availability" className="btn btn-ghost btn-sm">
          Availability
        </Link>
      </TopBar>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Your schedule</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            My Shifts
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {!loading && shifts.length > 0
              ? `${shifts.length} upcoming shift${shifts.length === 1 ? '' : 's'}`
              : !loading
                ? 'No upcoming shifts.'
                : ''}
          </p>
        </div>

        {!loading && shifts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center animate-rise">
            <p className="font-display text-lg font-bold text-ink">No upcoming shifts</p>
            <p className="max-w-xs text-sm text-ink-soft">
              You don&apos;t have any scheduled shifts coming up.
            </p>
            <Link href="/board" className="btn btn-primary btn-sm mt-2">
              Browse Open Shifts
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift, i) => (
              <div
                key={shift.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <MyShiftCard shift={shift} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add "My Shifts" nav link to the employee board**

In `frontend/src/app/board/page.tsx`, find the `<TopBar>` block:

```tsx
<TopBar>
  <Link href="/swaps" className="btn btn-ghost btn-sm">
    Swaps
  </Link>
  <Link href="/availability" className="btn btn-ghost btn-sm">
    Availability
  </Link>
</TopBar>
```

Replace it with:

```tsx
<TopBar>
  <Link href="/shifts" className="btn btn-ghost btn-sm">
    My Shifts
  </Link>
  <Link href="/swaps" className="btn btn-ghost btn-sm">
    Swaps
  </Link>
  <Link href="/availability" className="btn btn-ghost btn-sm">
    Availability
  </Link>
</TopBar>
```

- [ ] **Step 3: Verify it builds**

```bash
npm run build --workspace=frontend 2>&1 | tail -20
```

Expected: build succeeds with no new TypeScript errors.

- [ ] **Step 4: Verify manually in the browser**

Start the dev server (`npm run dev`), log in as an employee, and navigate to `/shifts`. Verify:
- Page renders with "My Shifts" heading
- Empty state shows if no shifts are assigned, with "Browse Open Shifts" link
- "My Shifts" link appears in the nav bar on the `/board` page

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shifts/page.tsx frontend/src/app/board/page.tsx
git commit -m "feat: add My Shifts page and nav link for employees"
```

---

## Task 8: Update manager dashboard — Publish Week button + stale open banner

**Files:**
- Modify: `frontend/src/app/manager/page.tsx`

- [ ] **Step 1: Add `publishing` state and `handlePublishWeek` handler**

In `frontend/src/app/manager/page.tsx`, add `publishing` to the state declarations (near the top of `ManagerDashboard`):

```tsx
const [publishing, setPublishing] = useState(false);
```

Add the `handlePublishWeek` function after `handleCheckUncovered`:

```tsx
const handlePublishWeek = async () => {
  setPublishing(true);
  try {
    const res = await apiFetch('/api/default-shifts/publish-week', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const weekDate = new Date(data.weekStart + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      });
      setStatus(
        data.created > 0
          ? `Published ${data.created} shift${data.created === 1 ? '' : 's'} for the week of ${weekDate}`
          : 'All shifts for next week already exist',
      );
      setTimeout(() => setStatus(null), 5000);
      loadData();
    }
  } finally {
    setPublishing(false);
  }
};
```

- [ ] **Step 2: Update the `Stats` interface and initial state**

Change the `Stats` interface at the top of the file:

```tsx
interface Stats {
  total: number;
  filled: number;
  open: number;
  staleOpen: number;
}
```

Change the initial `stats` state:

```tsx
const [stats, setStats] = useState<Stats>({ total: 0, filled: 0, open: 0, staleOpen: 0 });
```

- [ ] **Step 3: Add "Publish Week" button to the header**

Find the header actions `<div>` containing "Check Uncovered" and "Add Shift":

```tsx
<div className="flex items-center gap-2">
  <button onClick={handleCheckUncovered} className="btn btn-ghost btn-sm">
    Check Uncovered
  </button>
  <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
    <span className="text-base leading-none">+</span> Add Shift
  </button>
</div>
```

Replace it with:

```tsx
<div className="flex items-center gap-2">
  <button onClick={handleCheckUncovered} className="btn btn-ghost btn-sm">
    Check Uncovered
  </button>
  <button onClick={handlePublishWeek} disabled={publishing} className="btn btn-ghost btn-sm">
    {publishing ? 'Publishing…' : 'Publish Week'}
  </button>
  <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
    <span className="text-base leading-none">+</span> Add Shift
  </button>
</div>
```

- [ ] **Step 4: Add the stale open banner**

Find the coverage meter card (ends with `</div>` after the progress bar). After it, and before the `<CoverageToggle />` div, insert:

```tsx
{stats.staleOpen > 0 && (
  <div className="banner banner-error mb-6 flex items-center justify-between animate-rise">
    <span>
      {stats.staleOpen} shift{stats.staleOpen === 1 ? '' : 's'} open for over 4h
    </span>
    <button onClick={handleCheckUncovered} className="btn btn-danger btn-sm ml-4 shrink-0">
      Alert Managers
    </button>
  </div>
)}
```

- [ ] **Step 5: Verify it builds**

```bash
npm run build --workspace=frontend 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Verify manually in the browser**

With the dev server running, log in as a manager and:
1. Click "Publish Week" — confirm the success banner appears and the schedule grid refreshes.
2. Click "Publish Week" again — confirm the "already exist" message appears.
3. If any open shifts are older than the threshold, confirm the brick-colored stale open banner appears above the schedule grid.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/manager/page.tsx
git commit -m "feat: add Publish Week button and stale-open alert banner to manager dashboard"
```

---

## Task 9: Push to GitHub

- [ ] **Step 1: Verify all tests still pass**

```bash
npm test --workspace=backend
```

Expected: all tests pass.

- [ ] **Step 2: Verify frontend lint**

```bash
npm run lint --workspace=frontend
```

Expected: no errors.

- [ ] **Step 3: Push**

```bash
git push origin main
```
