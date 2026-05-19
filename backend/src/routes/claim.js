import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// Employee claims an open shift
router.post('/', async (req, res) => {
  try {
    const { shiftId, employeeId } = req.body;
    
    if (!shiftId || !employeeId) {
      return res.status(400).json({ error: 'shiftId and employeeId required' });
    }
    
    if (!uuidRegex.test(shiftId) || !uuidRegex.test(employeeId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
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
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get claims for a shift
router.get('/shift/:shiftId', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.shiftId)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
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

// Get claims for an employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID format' });
    }
    const claims = await prisma.shiftClaim.findMany({
      where: { employeeId: req.params.employeeId },
      include: { shift: true },
    });
    res.json({ claims });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
