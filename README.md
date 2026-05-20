# ShiftCover

A lightweight B2B SaaS shift coverage application for small local businesses (5–50 employees) in Southwest Washington and Central Oregon.

## Features

- **Shift Management** — Create, edit, and manage employee shifts with role and site assignments
- **Open Shift Board** — Mobile-friendly view for employees to browse and claim open shifts
- **Auto Coverage** — One-toggle automation that fills open shifts based on employee availability and coverage history
- **SMS Notifications** — Twilio integration sends text messages when shifts open up or are auto-assigned
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

### Businesses
- `GET /api/businesses` — List businesses
- `POST /api/businesses` — Create business
- `GET /api/businesses/:id` — Get business
- `PUT /api/businesses/:id` — Update business
- `DELETE /api/businesses/:id` — Delete business

### Employees
- `GET /api/employees/:businessId` — List employees
- `POST /api/employees` — Create employee
- `GET /api/employees/:id` — Get employee
- `PUT /api/employees/:id` — Update employee
- `DELETE /api/employees/:id` — Delete employee
- `POST /api/employees/invite` — Generate invite code

### Shifts
- `GET /api/shifts/:businessId` — List shifts
- `POST /api/shifts` — Create shift
- `GET /api/shifts/:id` — Get shift
- `PUT /api/shifts/:id` — Update shift
- `DELETE /api/shifts/:id` — Delete shift

### Claims
- `POST /api/claims` — Employee claims an open shift

### Coverage
- `POST /api/coverage/auto/:shiftId` — Auto-fill one shift
- `POST /api/coverage/fill-all` — Auto-fill all open shifts

## License

MIT
