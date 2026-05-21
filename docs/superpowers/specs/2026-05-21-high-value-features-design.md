# Design: High-Value Feature Set
**Date:** 2026-05-21
**Status:** Approved

## Overview

Three additive features for ShiftCover that require no database migrations and touch only existing patterns:

1. **Publish Week** — generate actual shifts from `DefaultShift` templates for the next week
2. **My Upcoming Shifts** — employee view of their own assigned shifts
3. **Stale Open Alert Banner** — in-app manager alert when open shifts exceed the SMS threshold age

---

## Feature 1: Publish Week

### Problem
Managers define `DefaultShift` templates (label, role, startTime, endTime, site, daysOfWeek) but today those templates only serve the onboarding wizard UI. There is no way to generate actual `Shift` records from them. Managers must create each shift by hand every week.

### Backend

**New endpoint:** `POST /api/default-shifts/publish-week` (manager only, behind `requireAuth` + `requireManager`)

**Request body (optional):**
```json
{ "weekStart": "2026-05-25" }
```
`weekStart` must be a `YYYY-MM-DD` string and defaults to next Monday (the Monday on or after tomorrow). Validated by a new `publishWeekSchema` in `schemas.js`:
```js
export const publishWeekSchema = z.object({
  weekStart: dateStr.optional(),
});
```

**Logic:**
1. Resolve `weekStart`: if not provided, compute next Monday using the same `getWeekStart` / `addDays` utilities already in `services/scheduling.js`.
2. Fetch all `DefaultShift` records for `req.auth.businessId`.
3. For each template, iterate over its `daysOfWeek` array (integers 0–6, where 0 = Sunday). Calculate the target date for each day within the `weekStart … weekStart+6` range.
4. Skip dates before today (past dates are never generated).
5. For each (template, date) pair, check whether a shift with matching `businessId + date + startTime + role` already exists. If it does, count it as `skipped`; otherwise create it as `status: 'open'`.
6. All creates run sequentially (not in a single transaction) to avoid locking; partial success is acceptable for a publish action.

**Response:**
```json
{ "created": 4, "skipped": 2, "weekStart": "2026-05-25" }
```

**Error cases:**
- 400 if `weekStart` fails zod validation
- 500 on unexpected DB error

### Frontend

**Location:** `frontend/src/app/manager/page.tsx`

**Change:** Add a "Publish Week" button in the header actions row, next to the existing "+ Add Shift" button. The button calls `POST /api/default-shifts/publish-week` (no body — always targets next week), shows a loading state (`disabled` + "Publishing…" label), then:
- On success: sets the existing `status` state to `"Published N shifts for the week of [weekStart date]"` (or `"All shifts for next week already exist"` when `created === 0`). Calls `loadData()` to refresh stats and the schedule grid.
- On error: sets `status` to an error message.

The button is only rendered for the manager view (already gated by `isManager()` redirect in the `useEffect`).

---

## Feature 2: My Upcoming Shifts

### Problem
Employees can see open shifts to claim but have no view of shifts they are already assigned to. They must ask their manager or check a paper schedule.

### Backend

**New route:** `GET /api/shifts/mine` added to `backend/src/routes/shift.js`.

Must be registered **before** the `GET /api/shifts/id/:id` and `PUT /api/shifts/:id` wildcard routes to avoid Express matching `mine` as an `:id` parameter.

**Query:**
```js
prisma.shift.findMany({
  where: {
    assignedEmployeeId: req.auth.employeeId,
    date: { gte: today },   // today in YYYY-MM-DD, local time
  },
  orderBy: { date: 'asc' },
  include: { assignedEmployee: true },
})
```

**Response:** `{ shifts: [...] }` — same shape as the existing `GET /api/shifts` response.

No auth changes; the existing `requireAuth` middleware on the `/api/shifts` mount is sufficient.

### Frontend

**New page:** `frontend/src/app/shifts/page.tsx`

- Fetches `GET /api/shifts/mine` on mount.
- Redirects to `/login` if no token.
- Shows a list of `MyShiftCard` components (see below).
- Empty state: "You have no upcoming shifts." with a link to `/board` to pick up open shifts.

**New component:** `frontend/src/components/MyShiftCard.tsx`

Same structural layout as `OpenShiftCard` — left accent bar, role/site, date, time range — but:
- Accent bar is `bg-sage` instead of `bg-marigold`
- Chip is `chip-filled` ("Scheduled") instead of `chip-open`
- No claim button; shows the assigned employee name if the viewer is a manager (not needed on this employee-facing page, so just omit the action area)

**Nav link:** Add `<Link href="/shifts">My Shifts</Link>` to the employee `TopBar` in `frontend/src/app/board/page.tsx`.

---

## Feature 3: Stale Open Alert Banner

### Problem
The SMS alert notifies managers about long-uncovered shifts, but it requires Twilio to be configured and only fires on an interval. Managers with no SMS configured, or who are actively working in the dashboard, have no in-app signal that shifts are stale.

### Backend

**Update:** `getCoverageStats` in `backend/src/services/coverage.js` gains a `staleOpen` field.

```js
const thresholdHours = Number(process.env.ALERT_THRESHOLD_HOURS) || 4;
const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
const today = new Date().toISOString().split('T')[0];

const staleOpen = await prisma.shift.count({
  where: {
    businessId,
    status: 'open',
    date: { gte: today },
    createdAt: { lt: cutoff },
  },
});
```

**Updated response:**
```json
{ "total": 10, "filled": 7, "open": 3, "staleOpen": 2, "coverageRate": 70 }
```

Unlike the SMS job, this count includes shifts that have already had `alertSentAt` set — the banner should persist until the shifts are filled, not just until the first alert fires.

### Frontend

**Update:** `frontend/src/app/manager/page.tsx`

- Add `staleOpen: number` to the `Stats` interface.
- When `stats.staleOpen > 0`, render a brick-toned banner above the schedule grid:

```
⚠ 2 shifts have been open for over 4h  [Alert Managers]
```

The "Alert Managers" inline button calls the existing `handleCheckUncovered` handler (same as the "Check Uncovered" button already in the header). The threshold displayed in the banner reads from a constant; it can be hardcoded to `4` for now since the frontend has no way to read env vars — the count already incorporates the correct threshold from the backend.

The banner uses the existing `.banner` class with a `brick`-toned style consistent with the design system.

---

## File Changelist

| File | Change |
|---|---|
| `backend/src/schemas.js` | Add `publishWeekSchema` |
| `backend/src/routes/defaultShift.js` | Add `POST /publish-week` handler |
| `backend/src/routes/shift.js` | Add `GET /mine` handler (before wildcard routes) |
| `backend/src/services/coverage.js` | Add `staleOpen` to `getCoverageStats` |
| `frontend/src/app/manager/page.tsx` | Publish Week button + stale open banner |
| `frontend/src/app/shifts/page.tsx` | New page (My Upcoming Shifts) |
| `frontend/src/components/MyShiftCard.tsx` | New component |
| `frontend/src/app/board/page.tsx` | Add "My Shifts" nav link |

No database migrations required. No new dependencies.
