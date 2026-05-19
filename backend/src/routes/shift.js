import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// Get all shifts for a business
router.get('/:businessId', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.businessId)) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }
    const shifts = await prisma.shift.findMany({
      where: { businessId: req.params.businessId },
      include: { assignedEmployee: true },
      orderBy: { date: 'asc' },
    });
    res.json({ shifts });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Create a shift
router.post('/', async (req, res) => {
  try {
    const { businessId, date, startTime, endTime, site, role, assignedEmployeeId } = req.body;
    if (!businessId || !date || !startTime || !endTime || !role) {
      return res.status(400).json({ error: 'businessId, date, startTime, endTime, role required' });
    }
    if (!uuidRegex.test(businessId)) {
      return res.status(400).json({ error: 'Invalid business ID format' });
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
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get single shift
router.get('/id/:id', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
    }
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: { assignedEmployee: true },
    });
    if (!shift) return res.status(404).json({ error: 'Not found' });
    res.json({ shift });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Assign employee to shift
router.put('/:id/assign', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
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
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Update shift
router.put('/:id', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
    }
    const { date, startTime, endTime, site, role, assignedEmployeeId, status } = req.body;
    const updateData = {};
    if (date) updateData.date = date;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (site !== undefined) updateData.site = site;
    if (role) updateData.role = role;
    if (assignedEmployeeId !== undefined) {
      updateData.assignedEmployeeId = assignedEmployeeId;
      updateData.status = assignedEmployeeId ? 'filled' : 'open';
    }
    if (status) updateData.status = status;

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: updateData,
      include: { assignedEmployee: true },
    });
    res.json({ shift });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Delete shift
router.delete('/:id', async (req, res) => {
  try {
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid shift ID format' });
    }
    await prisma.shift.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;