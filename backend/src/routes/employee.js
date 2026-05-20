import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireManager } from '../middleware/auth.js';
import { generateInviteCode } from '../utils/codeGen.js';

const router = Router();

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

async function uniqueInviteCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const existing = await prisma.employee.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

// List employees for the authenticated business
router.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { businessId: req.auth.businessId },
    });
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Create employee with invite code
router.post('/', requireManager, async (req, res) => {
  try {
    const { name, phone, email, role, qualifications } = req.body;
    if (!name || !phone || !role) {
      return res.status(400).json({ error: 'name, phone, role required' });
    }
    const inviteCode = await uniqueInviteCode();
    const employee = await prisma.employee.create({
      data: {
        businessId: req.auth.businessId,
        name,
        phone,
        email,
        role,
        qualifications: JSON.stringify(qualifications || []),
        inviteCode,
      },
    });
    res.status(201).json({ employee, inviteCode });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Get single employee (must belong to the authenticated business)
router.get('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee || employee.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Update employee
router.put('/:id', requireManager, async (req, res) => {
  try {
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { name, phone, email, role, qualifications, status } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (qualifications) updateData.qualifications = JSON.stringify(qualifications);
    if (status) updateData.status = status;

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Delete employee
router.delete('/:id', requireManager, async (req, res) => {
  try {
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
