# ShiftCover

A lightweight B2B SaaS shift coverage application for small local businesses (5–50 employees) in Southwest Washington and Central Oregon.

## Features

- **Shift Management** — Create, edit, and manage employee shifts with role and site assignments
- **Open Shift Board** — Mobile-friendly view for employees to browse and claim open shifts
- **Auto Coverage** — One-toggle automation that fills open shifts based on employee availability and coverage history
- **SMS Notifications** — Twilio integration sends text messages when shifts open up or are auto-assigned
- **Manager Onboarding** — Guided setup for business profile, shift templates, team invites, and coverage rules
- **Employee Welcome Flow** — First-login profile confirmation and optional 7-day availability setup
- **PWA** — Works on mobile web — add to home screen for app-like experience

## Default Invite Codes (Dev)

These are hardcoded for local development. No registration needed — enter the code on the login page.

| Role     | Code     |
|----------|----------|
| Manager  | `789820` |
| Employee | `996976` |

The manager code grants access to the schedule dashboard, settings, and shift management. The employee code opens the shift board where open shifts can be claimed.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Express.js, Prisma ORM
- **Database**: PostgreSQL
- **SMS**: Twilio

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Docker)

### Backend Setup

```bash
cd backend
cp .env.example .env  # Configure DATABASE_URL and TWILIO credentials
npm install
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── backend/
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (SMS, coverage engine)
│   │   └── utils/           # Helpers
│   └── index.js             # Express entry
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── manager/     # Manager dashboard
│   │   │   └── board/       # Employee shift board
│   │   └── components/      # Reusable UI components
│   └── public/
│       └── manifest.json    # PWA manifest
└── docs/
    └── plans/               # Implementation plans
```

## API Endpoints

Routes are scoped to the authenticated business via the JWT. Frontend code calls these through relative `/api/*` paths.

### Auth
- `POST /api/auth/register` — Create a business and manager account
- `POST /api/auth/login` — Sign in with a 6-digit invite code

### Businesses
- `GET /api/businesses` — Get current business profile and SMS capability
- `PUT /api/businesses/:id` — Update the current business profile

### Onboarding
- `GET /api/onboarding/status` — Get manager onboarding step status
- `POST /api/onboarding/complete` — Mark manager onboarding complete

### Default Shift Templates
- `GET /api/default-shifts` — List default shift templates
- `POST /api/default-shifts` — Create a template
- `PUT /api/default-shifts/:id` — Update a template
- `DELETE /api/default-shifts/:id` — Delete a template

### Employees
- `GET /api/employees` — List employees for the current business
- `POST /api/employees` — Create an employee and invite code
- `GET /api/employees/me` — Get the authenticated employee profile
- `PUT /api/employees/me` — Update the authenticated employee profile
- `POST /api/employees/me/onboarded` — Mark employee first-run onboarding complete
- `GET /api/employees/:id` — Get one employee in the current business
- `PUT /api/employees/:id` — Update one employee
- `DELETE /api/employees/:id` — Delete one employee
- `POST /api/employees/:id/invite` — Send or show an employee invite code

### Shifts
- `GET /api/shifts` — List shifts for the current business
- `POST /api/shifts` — Create shift
- `GET /api/shifts/:id` — Get shift
- `PUT /api/shifts/:id` — Update shift
- `DELETE /api/shifts/:id` — Delete shift

### Claims
- `POST /api/claims` — Employee claims an open shift

### Availability
- `GET /api/availability/mine` — List authenticated employee availability
- `PUT /api/availability` — Upsert authenticated employee availability for a date
- `GET /api/availability/employee/:id` — Manager view of employee availability

### Swaps
- `GET /api/swaps` — List relevant swap requests
- `POST /api/swaps` — Create swap request
- `POST /api/swaps/:id/approve` — Approve swap request
- `POST /api/swaps/:id/reject` — Reject swap request

### Coverage
- `GET /api/coverage/stats` — Coverage totals for dashboard
- `GET /api/coverage/rules` — Get coverage rules
- `PUT /api/coverage/rules` — Update coverage rules
- `POST /api/coverage/auto/:shiftId` — Auto-fill one shift
- `POST /api/coverage/fill-all` — Auto-fill all open shifts
- `POST /api/coverage/check-uncovered` — Alert managers about long-uncovered shifts

## License

MIT
