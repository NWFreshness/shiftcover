import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { claimSchema } from '../schemas.js';

const router = Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// Authenticated employee claims an open shift
router.post('/', validate(claimSchema), async (req, res) => {
  try {
    const { shiftId } = req.body;
    const employeeId = req.auth.employeeId;

    const result = await prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!shift || shift.businessId !== req.auth.businessId) {
        throw { status: 404, message: 'Shift not found' };
      }
      if (shift.status === 'filled') throw { status: 409, message: 'Shift already filled' };

      const claim = await tx.shiftClaim.create({ data: { shiftId, employeeId } });
      const updatedShift = await tx.shift.update({
        where: { id: shiftId },
        data: { assignedEmployeeId: employeeId, status: 'filled' },
        include: { assignedEmployee: true },
      });
      return { claim, shift: updatedShift };
    });

    res.status(201).json({ claim: result.claim, shift: result.shift });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get claims for a shift (within the authenticated business)
router.get('/shift/:shiftId', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.shiftId)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
    }
    const shift = await prisma.shift.findUnique({ where: { id: req.params.shiftId } });
    if (!shift || shift.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    const claims = await prisma.shiftClaim.findMany({
      where: { shiftId: req.params.shiftId },
      include: { employee: true },
    });
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get the authenticated employee's own claims
router.get('/mine', async (req, res) => {
  try {
    const claims = await prisma.shiftClaim.findMany({
      where: { employeeId: req.auth.employeeId },
      include: { shift: true },
    });
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
