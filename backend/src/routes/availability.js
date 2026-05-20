import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { availabilitySchema } from '../schemas.js';

const router = Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// The authenticated employee's own availability records
router.get('/mine', async (req, res) => {
  try {
    const availability = await prisma.availability.findMany({
      where: { employeeId: req.auth.employeeId },
      orderBy: { date: 'asc' },
    });
    res.json({ availability });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Set availability for a date (upsert) for the authenticated employee
router.put('/', validate(availabilitySchema), async (req, res) => {
  try {
    const { date, available } = req.body;
    const record = await prisma.availability.upsert({
      where: { employeeId_date: { employeeId: req.auth.employeeId, date } },
      update: { available },
      create: { employeeId: req.auth.employeeId, date, available },
    });
    res.json({ availability: record });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Manager view of an employee's availability (must be in the same business)
router.get('/employee/:id', async (req, res) => {
  try {
    if (!req.auth.isManager) {
      return res.status(403).json({ error: 'Manager access required' });
    }
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid employee ID format' });
    }
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee || employee.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    const availability = await prisma.availability.findMany({
      where: { employeeId: req.params.id },
      orderBy: { date: 'asc' },
    });
    res.json({ availability });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
