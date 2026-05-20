import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import employeeRoutes from './routes/employee.js';
import shiftRoutes from './routes/shift.js';
import claimRoutes from './routes/claim.js';
import coverageRoutes from './routes/coverage.js';
import availabilityRoutes from './routes/availability.js';
import swapRoutes from './routes/swap.js';
import defaultShiftRoutes from './routes/defaultShift.js';
import onboardingRoutes from './routes/onboarding.js';
import { notifyUncoveredShifts } from './services/alerts.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/businesses', apiLimiter, requireAuth, businessRoutes);
app.use('/api/employees', apiLimiter, requireAuth, employeeRoutes);
app.use('/api/shifts', apiLimiter, requireAuth, shiftRoutes);
app.use('/api/claims', apiLimiter, requireAuth, claimRoutes);
app.use('/api/coverage', apiLimiter, requireAuth, coverageRoutes);
app.use('/api/availability', apiLimiter, requireAuth, availabilityRoutes);
app.use('/api/swaps', apiLimiter, requireAuth, swapRoutes);
app.use('/api/default-shifts', apiLimiter, requireAuth, defaultShiftRoutes);
app.use('/api/onboarding', apiLimiter, requireAuth, onboardingRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ShiftCover API running on port ${PORT}`);
});

// Optional background job: alert managers about long-uncovered shifts.
// Enable by setting ALERT_INTERVAL_MIN (minutes) in the environment.
const alertIntervalMin = Number(process.env.ALERT_INTERVAL_MIN);
if (alertIntervalMin > 0) {
  const thresholdHours = Number(process.env.ALERT_THRESHOLD_HOURS) || 4;
  setInterval(() => {
    notifyUncoveredShifts({ thresholdHours }).catch((err) =>
      console.error('Uncovered-shift alert job failed:', err),
    );
  }, alertIntervalMin * 60 * 1000);
  console.log(`Uncovered-shift alerts every ${alertIntervalMin} min (threshold ${thresholdHours}h)`);
}
