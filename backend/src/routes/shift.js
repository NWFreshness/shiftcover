import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { shiftCreateSchema, shiftUpdateSchema, shiftAssignSchema } from '../schemas.js';
import { uuidRegex, sanitizeError } from '../lib/utils.js';

const router = Router();

async function ownedShift(id, businessId) {
  if (!uuidRegex.test(id)) return null;
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift || shift.businessId !== businessId) return null;
  return shift;
}

// Get all shifts for the authenticated business
router.get('/', async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { businessId: req.auth.businessId },
      include: { assignedEmployee: true },
      orderBy: { date: 'asc' },
    });
    res.json({ shifts });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Create a shift
router.post('/', requireManager, validate(shiftCreateSchema), async (req, res) => {
  try {
    const { date, startTime, endTime, site, role, assignedEmployeeId } = req.body;
    const shift = await prisma.shift.create({
      data: {
        businessId: req.auth.businessId,
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
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get single shift
router.get('/id/:id', async (req, res) => {
  try {
    const shift = await ownedShift(req.params.id, req.auth.businessId);
    if (!shift) return res.status(404).json({ error: 'Not found' });
    const full = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: { assignedEmployee: true },
    });
    res.json({ shift: full });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Assign employee to shift
router.put('/:id/assign', requireManager, validate(shiftAssignSchema), async (req, res) => {
  try {
    if (!(await ownedShift(req.params.id, req.auth.businessId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { employeeId } = req.body;
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        assignedEmployeeId: employeeId,
        status: employeeId ? 'filled' : 'open',
      },
      include: { assignedEmployee: true },
    });
    res.json({ shift });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Update shift
router.put('/:id', requireManager, validate(shiftUpdateSchema), async (req, res) => {
  try {
    if (!(await ownedShift(req.params.id, req.auth.businessId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { assignedEmployeeId } = req.body;
    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([, v]) => v !== undefined)
    );
    if ('assignedEmployeeId' in updateData) {
      updateData.status = assignedEmployeeId ? 'filled' : 'open';
    }

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: updateData,
      include: { assignedEmployee: true },
    });
    res.json({ shift });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Delete shift
router.delete('/:id', requireManager, async (req, res) => {
  try {
    if (!(await ownedShift(req.params.id, req.auth.businessId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    await prisma.shift.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
