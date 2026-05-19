import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import businessRoutes from './routes/business.js';
import employeeRoutes from './routes/employee.js';
import shiftRoutes from './routes/shift.js';
import claimRoutes from './routes/claim.js';
import coverageRoutes from './routes/coverage.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/businesses', businessRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/coverage', coverageRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ShiftCover API running on port ${PORT}`);
});