import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateInviteCode } from '../utils/codeGen.js';

const prisma = new PrismaClient();
const router = Router();

// Get all employees for a business
router.get('/:businessId', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { businessId: req.params.businessId },
    });
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee with invite code
router.post('/', async (req, res) => {
  try {
    const { businessId, name, phone, email, role, qualifications } = req.body;
    if (!businessId || !name || !phone || !role) {
      return res.status(400).json({ error: 'businessId, name, phone, role required' });
    }
    const inviteCode = generateInviteCode();
    const employee = await prisma.employee.create({
      data: {
        businessId,
        name,
        phone,
        email,
        role,
        qualifications: JSON.stringify(qualifications || []),
      },
    });
    res.status(201).json({ employee, inviteCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single employee
router.get('/id/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
    });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
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
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Regenerate invite code for existing employee
router.post('/invite', async (req, res) => {
  try {
    const { businessId, phone } = req.body;
    if (!businessId || !phone) {
      return res.status(400).json({ error: 'businessId and phone required' });
    }
    const employee = await prisma.employee.findFirst({
      where: { businessId, phone },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const inviteCode = generateInviteCode();
    res.json({ employeeId: employee.id, inviteCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;