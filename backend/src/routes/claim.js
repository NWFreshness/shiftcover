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

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const result = await prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!shift) throw { status: 404, message: 'Shift not found' };
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
