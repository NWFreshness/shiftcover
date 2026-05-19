# ShiftCover — Product Requirements Document

**Version:** 1.0
**Date:** 2025-11-19
**Status:** Draft

---

## 1. Concept & Vision

ShiftCover is a lightweight shift coverage app built for small local businesses (under 50 employees) in SW Washington and Central Oregon. It solves the "last-minute scramble" — managers constantly rebuilding schedules when people back out, and owners spending hours each week just keeping shifts covered.

The app lets managers build schedules, post open shifts to employees, and let workers claim or trade shifts. A "Coverage Automation" toggle allows owners to go hands-off when traveling or busy — the system works a priority list until shifts are filled.

**Tone:** Simple, calm, reliable. Like a good employee who never lets you down.

---

## 2. Target Customers

**Primary verticals** — any local shift-based business with 5–50 employees:

- **Food & Beverage** — pubs, restaurants, coffee shops, fast casual, food trucks
- **Cleaning & Janitorial** — commercial cleaning, residential cleaning, maid services
- **Hospitality** — hotels, motels, small lodges, event venues
- **Retail** — dispensaries, specialty retail, grocery
- **Healthcare support** — dental offices, clinics, physical therapy (front desk, assistants)
- **Field service** — HVAC, plumbing, electrical, landscaping

**Size:** 5–50 employees
**Tech comfort:** Basic. Mobile-first employees likely use phone browser, not an app store
**Pain:** Last-minute backing out, constant schedule rebuilding, no coverage when someone calls in

---

## 3. Core Features

### 3.1 Schedule Builder (Manager — Web)

- Weekly view with employee rows and shift columns
- Each shift shows: time, required role/site, assigned employee
- Click to create/edit/delete shifts
- Uncovered shifts shown as empty slots (highlighted)
- Color-coded by role or site
- View only — employees see only their own shifts

### 3.2 Open Shift Board (Employee-facing)

- Feed of available (uncovered) shifts
- Shows: date, time, site/client, role
- Employees tap to claim — first-come-first-served
- Immediate confirmation notification
- No manager involvement required for claims

### 3.3 Coverage Automation Toggle

- Switch at top of schedule screen: **Manual Mode** vs **Auto Mode**

**Manual Mode:**
- Uncovered shifts remain visible on the board
- Manager manually assigns or waits for claims
- Alerts sent to manager for any shift uncovered > X hours

**Auto Mode:**
- When a shift goes uncovered, system texts/notifies employees in priority order
- Owner sets rules once:
  - No double-shifts within 24h
  - Preferred worker for specific clients
  - Minimum rest hours between shifts
  - Maximum hours per week
- System loops through priority list until covered or reaches manager threshold
- Manager gets summary: "Shift covered" or "Couldn't fill — needs your input"

### 3.4 Employee App (PWA — Mobile Web)

- Access via URL, no app store required
- Login with a 6-digit code the owner sends (no email/password)
- View personal schedule
- Claim open shifts
- Request swaps with another employee (both agree, manager approves)
- Mark availability (available/not available for upcoming period)
- Receive SMS or push notifications

### 3.5 Notifications

- **Employee receives:** new shift available, shift claimed confirmation, reminder 24h before shift, swap request
- **Manager receives:** shift uncovered alert, shift covered, coverage automation — couldn't fill, employee requests swap

### 3.6 Business Setup (Manager)

- Add employees (name, phone, role, qualifications/sites they can work)
- Define default shift times
- Set coverage automation rules (once, reusable)
- Invite employees via SMS code

---

## 4. User Flows

### Flow 1: Owner builds weekly schedule

1. Owner opens web dashboard, sees blank week
2. Creates shifts by clicking time slots, assigning employee and site
3. If no employee assigned, shift appears as "open" on the board
4. Saves schedule — employees notified of their assignments

### Flow 2: Employee claims a shift (manual mode)

1. Employee receives SMS: "Open shift available — Pub, Sat 6pm bartender"
2. Opens ShiftCover on phone, sees open shift on board
3. Taps "Claim" — first come first served
4. Gets confirmation — shift added to their schedule
5. Manager sees coverage updated in real time

### Flow 3: Employee backs out last-second (auto mode on)

1. Employee texts/calls manager that they can't make Saturday shift
2. Manager marks shift as needing coverage (or system auto-detects)
3. Auto-mode activates: system texts available employees in priority order
4. Loop until someone says yes — up to threshold (e.g., 3 attempts)
5. If covered: manager gets "Shift covered by [Employee]" notification
6. If not covered: manager gets "Couldn't fill Sat 6pm bartender — needs your input" alert

### Flow 4: Owner on vacation

1. Owner enables Auto Mode before leaving
2. Sets automation rules (priority list, constraints)
3. Departs — no further involvement needed
4. System handles coverage, manager receives summaries
5. If system can't fill, alerts come to phone — owner decides from there

---

## 5. Data Model

### Business
- id, name, industry_type, created_at

### Employee
- id, business_id, name, phone, email (optional), role, qualifications (array), status (active/inactive)

### Shift
- id, business_id, date, start_time, end_time, site/client, role, assigned_employee_id, status (filled/unfilled/open), created_at

### CoverageRule (automation settings)
- id, business_id, rules_json (no_double_shifts_hours, min_rest_hours, max_hours_per_week, preferred_worker_map)

### ShiftClaim
- id, shift_id, employee_id, claimed_at, status (confirmed/pending/cancelled)

### SwapRequest
- id, shift_id, requester_id, target_employee_id, status (pending/approved/rejected)

---

## 6. Notification Strategy

- **Primary channel:** SMS (Twilio or equivalent) — ensures reach even without smartphone
- **Secondary:** Web push for employees who enable it
- **Manager dashboard:** always shows current coverage status

---

## 7. Pricing Tiers

### Starter — $X/mo
- Up to 10 employees
- Manual mode only
- Web dashboard
- Email/SMS notifications

### Plus — $Y/mo
- Unlimited employees
- Auto mode (coverage automation)
- SMS notifications
- Swap requests
- Priority support

*Prices TBD — benchmark against When I Work ($4/employee/mo) and Deputy ($5/employee/mo)*

---

## 8. Technical Approach

- **Web app:** React frontend (simple, fast) — manager dashboard + employee PWA
- **Backend:** Node.js or Python — TBD based on team preference
- **Database:** PostgreSQL (Supabase or self-hosted)
- **SMS:** Twilio
- **Auth:** 6-digit code login (stored in DB, expires in 24h)
- **Hosting:** Vercel/Railway or similar — keep ops simple

---

## 9. Out of Scope (v1)

- Payroll or time tracking
- HR features (hiring, onboarding)
- Multi-location management for same business
- Integration with point-of-sale or accounting software
- Advanced forecasting / AI scheduling suggestions

---

## 10. Success Metrics

- % of open shifts covered without manager intervention
- Average time from shift opening to coverage
- Owner time spent on schedule management per week (target: under 30 min)
- Employee activation rate (how many log in and check)
- Churn rate

---

## 11. Competitive Landscape

| Product | Good At | Weakness for our target |
|---|---|---|
| When I Work | Restaurants, large teams | Too complex for 10-person shop, expensive |
| HotSchedules | Restaurant scheduling | Same — enterprise feel, high price |
| Deputy | Hourly workers, compliance | Overkill for local pub or cleaning biz |
| Google Sheets | Cheap, flexible | No automation, manual, error-prone |

**ShiftCover advantage:** Built specifically for small local businesses, simple enough that a pub owner or cleaning biz operator can set up in 20 minutes, with automation that removes the burden entirely.