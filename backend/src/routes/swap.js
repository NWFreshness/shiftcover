import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { swapCreateSchema } from '../schemas.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

const swapInclude = {
  shift: true,
  requester: { select: { id: true, name: true } },
  targetEmployee: { select: { id: true, name: true } },
};

// Load a swap and confirm it belongs to the caller's business.
async function ownedSwap(id, businessId) {
  if (!uuidRegex.test(id)) return null;
  const swap = await prisma.swapRequest.findUnique({ where: { id }, include: swapInclude });
  if (!swap || swap.shift.businessId !== businessId) return null;
  return swap;
}

// Requester proposes handing their assigned shift to another employee
router.post('/', validate(swapCreateSchema), async (req, res) => {
  try {
    const { shiftId, targetEmployeeId } = req.body;
    const requesterId = req.auth.employeeId;

    if (targetEmployeeId === requesterId) {
      return res.status(400).json({ error: 'Cannot swap a shift with yourself' });
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    if (shift.assignedEmployeeId !== requesterId) {
      return res.status(403).json({ error: 'You can only swap a shift assigned to you' });
    }

    const target = await prisma.employee.findUnique({ where: { id: targetEmployeeId } });
    if (!target || target.businessId !== req.auth.businessId || target.status !== 'active') {
      return res.status(404).json({ error: 'Target employee not found' });
    }

    const swap = await prisma.swapRequest.create({
      data: { shiftId, requesterId, targetEmployeeId },
      include: swapInclude,
    });
    res.status(201).json({ swap });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// List swaps: managers see all in the business, employees see ones involving them
router.get('/', async (req, res) => {
  try {
    const where = { shift: { businessId: req.auth.businessId } };
    if (!req.auth.isManager) {
      where.OR = [
        { requesterId: req.auth.employeeId },
        { targetEmployeeId: req.auth.employeeId },
      ];
    }
    const swaps = await prisma.swapRequest.findMany({
      where,
      include: swapInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ swaps });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Target employee accepts the swap (both parties now agree)
router.put('/:id/accept', async (req, res) => {
  try {
    const swap = await ownedSwap(req.params.id, req.auth.businessId);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.targetEmployeeId !== req.auth.employeeId) {
      return res.status(403).json({ error: 'Only the target employee can accept' });
    }
    if (swap.status !== 'pending') {
      return res.status(409).json({ error: `Swap is already ${swap.status}` });
    }
    const updated = await prisma.swapRequest.update({
      where: { id: swap.id },
      data: { status: 'accepted' },
      include: swapInclude,
    });
    res.json({ swap: updated });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Target employee or a manager rejects the swap
router.put('/:id/reject', async (req, res) => {
  try {
    const swap = await ownedSwap(req.params.id, req.auth.businessId);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    const isTarget = swap.targetEmployeeId === req.auth.employeeId;
    if (!isTarget && !req.auth.isManager) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (swap.status === 'approved' || swap.status === 'rejected') {
      return res.status(409).json({ error: `Swap is already ${swap.status}` });
    }
    const updated = await prisma.swapRequest.update({
      where: { id: swap.id },
      data: { status: 'rejected' },
      include: swapInclude,
    });
    res.json({ swap: updated });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Manager approves an accepted swap, reassigning the shift to the target
router.put('/:id/approve', requireManager, async (req, res) => {
  try {
    const swap = await ownedSwap(req.params.id, req.auth.businessId);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.status !== 'accepted') {
      return res.status(409).json({ error: 'Swap must be accepted by the target first' });
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.shift.update({
        where: { id: swap.shiftId },
        data: { assignedEmployeeId: swap.targetEmployeeId, status: 'filled' },
      });
      return tx.swapRequest.update({
        where: { id: swap.id },
        data: { status: 'approved' },
        include: swapInclude,
      });
    });
    res.json({ swap: result });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
