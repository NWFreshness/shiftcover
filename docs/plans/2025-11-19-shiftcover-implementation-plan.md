# ShiftCover Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build and launch a minimum viable ShiftCover application — a lightweight shift coverage SaaS for small local businesses (5–50 employees) with manual and automated coverage modes.

**Architecture:** Monolithic app with React frontend and Node.js/Express backend. SQLite for local development, PostgreSQL for production. SMS via Twilio. PWA for employee mobile access.

**Tech Stack:**
- Frontend: React 18 + Vite, Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- SMS: Twilio
- Auth: 6-digit code (no passwords)
- Hosting: Railway or Vercel (TBD)

---

## Phase 1: Project Foundation

### Task 1: Initialize project structure

**Objective:** Create the monorepo structure with frontend and backend directories.

**Files:**
- Create: `package.json` (root workspace)
- Create: `frontend/package.json`
- Create: `backend/package.json`

**Step 1: Create root package.json**

```json
{
  "name": "shiftcover",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

**Step 2: Create frontend/package.json**

```json
{
  "name": "shiftcover-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@headlessui/react": "^1.7.0",
    "heroicons": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

**Step 3: Create backend/package.json**

```json
{
  "name": "shiftcover-backend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.7.0",
    "cors": "^2.8.0",
    "dotenv": "^16.3.0",
    "twilio": "^4.19.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0"
  }
}
```

**Step 4: Initialize npm workspace**

Run: `cd ~/Documents/ShiftCover && npm install`

Expected output: packages installed, no errors.

**Step 5: Commit**

```bash
cd ~/Documents/ShiftCover
git init
git add package.json frontend/package.json backend/package.json
git commit -m "init: project structure with frontend/backend workspaces"
```

---

### Task 2: Configure Tailwind CSS for frontend

**Objective:** Set up Tailwind in the frontend for rapid styling.

**Files:**
- Create: `frontend/postcss.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`

**Step 1: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 2: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
}
```

**Step 3: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
```

**Step 4: Update frontend/index.html**

Create `frontend/index.html` with standard React boilerplate and Tailwind script.

**Step 5: Run build to verify**

Run: `cd ~/Documents/ShiftCover/frontend && npm install && npm run build`

Expected: success, `dist/` folder created.

**Step 6: Commit**

```bash
git add frontend/postcss.config.js frontend/tailwind.config.js frontend/src/index.css frontend/index.html
git commit -m "feat: configure Tailwind CSS"
```

---

### Task 3: Set up Prisma and SQLite database

**Objective:** Initialize Prisma ORM with SQLite for local development.

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/.env`
- Create: `backend/prisma/seed.js`

**Step 1: Install Prisma in backend**

Run: `cd ~/Documents/ShiftCover && npm install`

**Step 2: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Business {
  id           String   @id @default(uuid())
  name         String
  industryType String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  employees    Employee[]
  shifts       Shift[]
  coverageRules CoverageRule?
}

model Employee {
  id           String   @id @default(uuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id])
  name         String
  phone        String
  email         String?
  role         String
  qualifications String   @default("[]")
  status       String   @default("active")
  createdAt    DateTime @default(now())
  shifts       Shift[]
  shiftClaims  ShiftClaim[]
  swapRequests SwapRequest[]
  swapTargets  SwapRequest[] @relation("SwapTarget")
}

model Shift {
  id           String   @id @default(uuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id])
  date         String
  startTime    String
  endTime      String
  site         String?
  role         String
  assignedEmployeeId String?
  assignedEmployee   Employee? @relation(fields: [assignedEmployeeId], references: [id])
  status       String   @default("open")
  createdAt    DateTime @default(now())
  claims       ShiftClaim[]
  swapRequests SwapRequest[]
}

model CoverageRule {
  id                  String @id @default(uuid())
  businessId          String @unique
  business            Business @relation(fields: [businessId], references: [id])
  noDoubleShiftHours  Int    @default(8)
  minRestHours        Int    @default(10)
  maxHoursPerWeek     Int    @default(40)
  preferredWorkerMap  String @default("{}")
}

model ShiftClaim {
  id          String   @id @default(uuid())
  shiftId     String
  shift       Shift @relation(fields: [shiftId], references: [id])
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  claimedAt   DateTime @default(now())
  status      String   @default("confirmed")
}

model SwapRequest {
  id              String   @id @default(uuid())
  shiftId         String
  shift           Shift @relation(fields: [shiftId], references: [id])
  requesterId     String
  requester       Employee @relation("SwapRequester", fields: [requesterId], references: [id])
  targetEmployeeId String
  targetEmployee  Employee @relation("SwapTarget", fields: [targetEmployeeId], references: [id])
  status          String   @default("pending")
  createdAt       DateTime @default(now())
}
```

**Step 3: Create backend/.env**

```
DATABASE_URL="file:./dev.db"
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_token"
TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
JWT_SECRET="shiftcover-secret-change-in-production"
```

**Step 4: Initialize database**

Run: `cd ~/Documents/ShiftCover/backend && npx prisma db push`

Expected output: `Database created` or `Your database is in sync with your Prisma schema`.

**Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/.env backend/prisma/seed.js
git commit -m "feat: set up Prisma with SQLite, define schema"
```

---

## Phase 2: Backend Core (API)

### Task 4: Create Express server with basic routes

**Objective:** Set up Express server with business and employee CRUD endpoints.

**Files:**
- Create: `backend/src/index.js`
- Create: `backend/src/routes/business.js`
- Create: `backend/src/routes/employee.js`
- Create: `backend/src/middleware/auth.js`

**Step 1: Create backend/src/index.js**

```js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import businessRoutes from './routes/business.js';
import employeeRoutes from './routes/employee.js';
import shiftRoutes from './routes/shift.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/businesses', businessRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ShiftCover API running on port ${PORT}`);
});
```

**Step 2: Create auth middleware**

```js
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

**Step 3: Create business routes (stub)**

```js
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ businesses: [] });
});

router.post('/', (req, res) => {
  res.json({ id: 'todo', name: req.body.name });
});

export default router;
```

**Step 4: Create employee routes (stub)**

```js
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ employees: [] });
});

export default router;
```

**Step 5: Create shift routes (stub)**

```js
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ shifts: [] });
});

export default router;
```

**Step 6: Test server starts**

Run: `cd ~/Documents/ShiftCover/backend && npm run dev`

Expected: `ShiftCover API running on port 3001` — no errors.

**Step 7: Commit**

```bash
git add backend/src/index.js backend/src/routes/*.js backend/src/middleware/auth.js
git commit -m "feat: Express server with basic routes"
```

---

### Task 5: Implement business CRUD

**Objective:** Full CRUD for businesses via API.

**Files:**
- Modify: `backend/src/routes/business.js`

**Step 1: Write test**

Create `backend/src/routes/business.test.js` — test creation and listing of businesses.

**Step 2: Implement full business route**

```js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  const businesses = await prisma.business.findMany();
  res.json({ businesses });
});

router.post('/', async (req, res) => {
  const { name, industryType } = req.body;
  if (!name || !industryType) {
    return res.status(400).json({ error: 'name and industryType required' });
  }
  const business = await prisma.business.create({
    data: { name, industryType },
  });
  res.status(201).json({ business });
});

router.get('/:id', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: 'Not found' });
  res.json({ business });
});

router.put('/:id', async (req, res) => {
  const { name, industryType } = req.body;
  const business = await prisma.business.update({
    where: { id: req.params.id },
    data: { name, industryType },
  });
  res.json({ business });
});

router.delete('/:id', async (req, res) => {
  await prisma.business.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
```

**Step 3: Verify with curl**

Run: `curl -X POST http://localhost:3001/api/businesses -H "Content-Type: application/json" -d '{"name":"Test Pub","industryType":"food_beverage"}'`

Expected: JSON with created business.

**Step 4: Commit**

```bash
git add backend/src/routes/business.js backend/src/routes/business.test.js
git commit -m "feat: business CRUD endpoints"
```

---

### Task 6: Implement employee CRUD + invite codes

**Objective:** CRUD for employees with 6-digit invite code generation.

**Files:**
- Modify: `backend/src/routes/employee.js`
- Create: `backend/src/utils/codeGen.js`

**Step 1: Create code generator utility**

```js
export function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

**Step 2: Write test for employee creation with invite code**

**Step 3: Implement employee route**

```js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateInviteCode } from '../utils/codeGen.js';
const prisma = new PrismaClient();
const router = Router();

router.get('/:businessId', async (req, res) => {
  const employees = await prisma.employee.findMany({
    where: { businessId: req.params.businessId },
  });
  res.json({ employees });
});

router.post('/', async (req, res) => {
  const { businessId, name, phone, email, role, qualifications } = req.body;
  if (!businessId || !name || !phone || !role) {
    return res.status(400).json({ error: 'businessId, name, phone, role required' });
  }
  const inviteCode = generateInviteCode();
  const employee = await prisma.employee.create({
    data: {
      businessId,
      name,
      phone,
      email,
      role,
      qualifications: JSON.stringify(qualifications || []),
    },
  });
  res.status(201).json({ employee, inviteCode });
});

router.post('/invite', async (req, res) => {
  const { businessId, phone } = req.body;
  const employee = await prisma.employee.findFirst({
    where: { businessId, phone },
  });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const inviteCode = generateInviteCode();
  res.json({ employeeId: employee.id, inviteCode });
});

export default router;
```

**Step 4: Verify with curl**

Run: `curl -X POST http://localhost:3001/api/employees -H "Content-Type: application/json" -d '{"businessId":"<id>","name":"Jane","phone":"+15551234567","role":"bartender"}'`

Expected: Employee created with 6-digit code.

**Step 5: Commit**

```bash
git add backend/src/routes/employee.js backend/src/utils/codeGen.js backend/src/routes/employee.test.js
git commit -m "feat: employee CRUD with invite codes"
```

---

### Task 7: Implement shift management endpoints

**Objective:** CRUD for shifts with coverage status tracking.

**Files:**
- Modify: `backend/src/routes/shift.js`

**Step 1: Write tests**

- Create shift
- List shifts by business
- Mark shift as covered/uncovered
- Update assigned employee

**Step 2: Implement shift routes**

```js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.get('/:businessId', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    where: { businessId: req.params.businessId },
    include: { assignedEmployee: true },
  });
  res.json({ shifts });
});

router.post('/', async (req, res) => {
  const { businessId, date, startTime, endTime, site, role, assignedEmployeeId } = req.body;
  if (!businessId || !date || !startTime || !endTime || !role) {
    return res.status(400).json({ error: 'businessId, date, startTime, endTime, role required' });
  }
  const shift = await prisma.shift.create({
    data: {
      businessId,
      date,
      startTime,
      endTime,
      site,
      role,
      assignedEmployeeId,
      status: assignedEmployeeId ? 'filled' : 'open',
    },
  });
  res.status(201).json({ shift });
});

router.put('/:id/assign', async (req, res) => {
  const { employeeId } = req.body;
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: {
      assignedEmployeeId: employeeId,
      status: employeeId ? 'filled' : 'open',
    },
  });
  res.json({ shift });
});

router.put('/:id', async (req, res) => {
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ shift });
});

export default router;
```

**Step 3: Verify with curl**

Create a shift, then test the assign endpoint.

**Step 4: Commit**

```bash
git add backend/src/routes/shift.js backend/src/routes/shift.test.js
git commit -m "feat: shift CRUD and assignment endpoints"
```

---

### Task 8: Implement shift claim (employee claims open shift)

**Objective:** Endpoint for employees to claim open shifts.

**Files:**
- Modify: `backend/src/routes/shift.js`
- Create: `backend/src/routes/claim.js`

**Step 1: Write test**

Employee can claim an open shift, shift becomes filled, claim record created.

**Step 2: Implement claim route**

```js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.post('/', async (req, res) => {
  const { shiftId, employeeId } = req.body;
  if (!shiftId || !employeeId) {
    return res.status(400).json({ error: 'shiftId and employeeId required' });
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  if (shift.status === 'filled') {
    return res.status(409).json({ error: 'Shift already filled' });
  }

  const claim = await prisma.shiftClaim.create({
    data: { shiftId, employeeId },
  });

  const updatedShift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      assignedEmployeeId: employeeId,
      status: 'filled',
    },
    include: { assignedEmployee: true },
  });

  res.status(201).json({ claim, shift: updatedShift });
});

export default router;
```

**Step 3: Add route to index.js**

```js
import claimRoutes from './routes/claim.js';
app.use('/api/claims', claimRoutes);
```

**Step 4: Test with curl**

**Step 5: Commit**

```bash
git add backend/src/routes/claim.js
git commit -m "feat: shift claim endpoint"
```

---

### Task 9: Implement coverage automation engine

**Objective:** Core logic for auto-mode — finding available employees and assigning them to uncovered shifts.

**Files:**
- Create: `backend/src/services/coverageEngine.js`
- Create: `backend/src/routes/automation.js`

**Step 1: Create coverage engine**

```js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function findAvailableEmployees(shift, businessId) {
  const rules = await prisma.coverageRule.findUnique({
    where: { businessId },
  });

  if (!rules) {
    return await prisma.employee.findMany({
      where: { businessId, status: 'active' },
    });
  }

  const allEmployees = await prisma.employee.findMany({
    where: { businessId, status: 'active' },
  });

  const now = new Date();
  const shiftDateTime = new Date(`${shift.date}T${shift.startTime}`);

  return allEmployees.filter(emp => {
    const quals = JSON.parse(emp.qualifications || '[]');
    if (quals.length > 0 && !quals.includes(shift.role)) return false;
    return true;
  });
}

export async function autoCoverShift(shiftId) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.status === 'filled') return { covered: false, reason: 'Already filled' };

  const available = await findAvailableEmployees(shift, shift.businessId);

  for (const emp of available) {
    if (emp.id === shift.assignedEmployeeId) continue;

    try {
      const claim = await prisma.shiftClaim.create({
        data: { shiftId, employeeId: emp.id },
      });
      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          assignedEmployeeId: emp.id,
          status: 'filled',
        },
      });
      return { covered: true, employee: emp };
    } catch (e) {
      continue;
    }
  }

  return { covered: false, reason: 'No available employees' };
}
```

**Step 2: Create automation toggle endpoint**

```js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { autoCoverShift } from '../services/coverageEngine.js';
const prisma = new PrismaClient();
const router = Router();

router.post('/auto-cover/:shiftId', async (req, res) => {
  const result = await autoCoverShift(req.params.shiftId);
  res.json(result);
});

router.post('/set-mode/:businessId', async (req, res) => {
  const { autoMode } = req.body;
  // In v1, this is a boolean flag stored in business metadata
  // Full implementation would track this per-period
  res.json({ autoMode });
});

export default router;
```

**Step 3: Test the coverage engine logic manually**

**Step 4: Commit**

```bash
git add backend/src/services/coverageEngine.js backend/src/routes/automation.js
git commit -m "feat: coverage automation engine"
```

---

### Task 10: Add Twilio SMS integration

**Objective:** Send SMS notifications via Twilio when shifts need coverage.

**Files:**
- Create: `backend/src/services/smsService.js`

**Step 1: Create SMS service**

```js
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendShiftNotification(phone, shift, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
    console.log(`[SMS MOCK] To: ${phone} | ${message}`);
    return { sid: 'mock-sid' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return result;
  } catch (error) {
    console.error('SMS send failed:', error);
    throw error;
  }
}

export function formatShiftMessage(shift) {
  return `ShiftCover: ${shift.role} needed at ${shift.site || 'main'} on ${shift.date} at ${shift.startTime}. Reply YES to claim or open the app.`;
}
```

**Step 2: Integrate into coverage engine**

In `coverageEngine.js`, call `sendShiftNotification` when attempting to cover.

**Step 3: Commit**

```bash
git add backend/src/services/smsService.js
git commit -m "feat: Twilio SMS integration for shift notifications"
```

---

## Phase 3: Frontend Core

### Task 11: Set up React Router and basic app structure

**Objective:** React app with routing for manager and employee views.

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/ManagerDashboard.jsx`
- Create: `frontend/src/pages/EmployeeSchedule.jsx`
- Create: `frontend/src/pages/Login.jsx`

**Step 1: Install router**

Run: `cd ~/Documents/ShiftCover && npm install`

**Step 2: Set up App.jsx with Router**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeSchedule from './pages/EmployeeSchedule';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/manager/:businessId" element={<ManagerDashboard />} />
        <Route path="/employee/:employeeId" element={<EmployeeSchedule />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 3: Create Login page (simple entry point)**

```jsx
export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-80">
        <h1 className="text-2xl font-bold mb-4">ShiftCover</h1>
        <p className="text-gray-600 mb-4">Enter your invite code or business ID</p>
        <input
          type="text"
          placeholder="Enter code or ID"
          className="w-full border rounded px-3 py-2 mb-4"
        />
        <button className="w-full bg-blue-600 text-white rounded py-2">Continue</button>
      </div>
    </div>
  );
}
```

**Step 4: Create placeholder ManagerDashboard and EmployeeSchedule pages**

**Step 5: Verify app loads without errors**

Run: `cd ~/Documents/ShiftCover && npm run dev`

Expected: Vite dev server starts, no console errors.

**Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/*.jsx
git commit -m "feat: React router and basic page structure"
```

---

### Task 12: Build Manager Schedule View

**Objective:** Weekly schedule grid with draggable shifts.

**Files:**
- Modify: `frontend/src/pages/ManagerDashboard.jsx`
- Create: `frontend/src/components/ScheduleGrid.jsx`
- Create: `frontend/src/components/ShiftCard.jsx`

**Step 1: Create ScheduleGrid component**

Weeks view with employee rows and day columns. Color-coded shifts by role.

**Step 2: Create ShiftCard component**

Shows shift info, draggable, click to edit.

**Step 3: Build ManagerDashboard**

- Fetch shifts from API
- Display ScheduleGrid
- Show uncovered shifts highlighted
- "Add Shift" button opens modal

**Step 4: Test with API data**

**Step 5: Commit**

```bash
git add frontend/src/pages/ManagerDashboard.jsx frontend/src/components/ScheduleGrid.jsx frontend/src/components/ShiftCard.jsx
git commit -m "feat: manager schedule view with weekly grid"
```

---

### Task 13: Build Open Shift Board (Employee view)

**Objective:** Employee sees available shifts and can claim one.

**Files:**
- Modify: `frontend/src/pages/EmployeeSchedule.jsx`
- Create: `frontend/src/components/OpenShiftCard.jsx`

**Step 1: Create OpenShiftCard component**

Shows date, time, site, role. "Claim" button.

**Step 2: Build EmployeeSchedule page**

- Fetch employee's assigned shifts (their schedule)
- Fetch open shifts (the board)
- Display both sections
- "Claim" button calls claim API

**Step 3: Test claim flow**

**Step 4: Commit**

```bash
git add frontend/src/pages/EmployeeSchedule.jsx frontend/src/components/OpenShiftCard.jsx
git commit -m "feat: employee shift board with claim functionality"
```

---

### Task 14: Add Coverage Automation Toggle to Manager Dashboard

**Objective:** Toggle switch for Manual/Auto mode, visible at top of schedule.

**Files:**
- Modify: `frontend/src/pages/ManagerDashboard.jsx`
- Create: `frontend/src/components/CoverageToggle.jsx`

**Step 1: Create CoverageToggle component**

Simple switch: "Manual" | "Auto" with clear visual indicator.

**Step 2: Add to ManagerDashboard header**

**Step 3: Wire to API**

Toggle calls `POST /api/automation/set-mode/:businessId`

**Step 4: Commit**

```bash
git add frontend/src/components/CoverageToggle.jsx
git commit -m "feat: coverage automation toggle on manager dashboard"
```

---

### Task 15: Build Add/Edit Shift modal

**Objective:** Modal for creating and editing shifts.

**Files:**
- Create: `frontend/src/components/ShiftModal.jsx`
- Modify: `frontend/src/pages/ManagerDashboard.jsx`

**Step 1: Create ShiftModal component**

Form with: date, start time, end time, role, site/client, employee assignment dropdown.

**Step 2: Add to ManagerDashboard**

Click empty slot or "Add Shift" button opens modal.

**Step 3: Submit calls POST/PUT API**

**Step 4: Commit**

```bash
git add frontend/src/components/ShiftModal.jsx
git commit -m "feat: shift creation and edit modal"
```

---

## Phase 4: Polish & Launch Prep

### Task 16: Add PWA configuration for mobile web

**Objective:** Make the employee app installable as a PWA on mobile.

**Files:**
- Create: `frontend/vite.config.js` (PWA plugin)
- Create: `frontend/public/manifest.json`

**Step 1: Add vite-plugin-pwa**

Install and configure for offline-capable PWA.

**Step 2: Create manifest.json**

Simple manifest with ShiftCover icon, theme color.

**Step 3: Test on mobile**

Serve locally, open on phone, verify PWA install prompt.

**Step 4: Commit**

```bash
git add frontend/vite.config.js frontend/public/manifest.json
git commit -m "feat: PWA configuration for mobile install"
```

---

### Task 17: Final integration test

**Objective:** End-to-end test of the core flow.

**Step 1: Create a business (via API or dashboard)**

**Step 2: Add 3 employees**

**Step 3: Create 5 shifts (2 filled, 3 open)**

**Step 4: Employee claims an open shift**

**Step 5: Toggle auto mode on**

**Step 6: Verify SMS notification fires (check Twilio logs or mock output)**

**Step 7: Commit with test notes**

---

### Task 18: Write README.md

**Objective:** Documentation for running and deploying ShiftCover.

**Files:**
- Create: `README.md`

**Content:**
- Project overview
- Local setup instructions (npm install, prisma db push, npm run dev)
- Environment variables
- Deployment notes
- API endpoint reference

---

## Summary

**Total tasks:** 18

**Phase 1:** Project foundation (3 tasks)
**Phase 2:** Backend API (6 tasks)
**Phase 3:** Frontend (5 tasks)
**Phase 4:** Polish & launch (4 tasks)

**Estimated time:** 2–3 days for a solo developer

**Next steps after implementation:**
- Deploy backend to Railway
- Deploy frontend to Vercel
- Set up Twilio account and verify SMS
- Seed with 2–3 beta businesses for testing
- Gather feedback, prioritize v2 features (swap requests, availability preferences, etc.)