import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { employeeCreateSchema, employeeUpdateSchema, employeeSelfUpdateSchema } from '../schemas.js';
import { generateInviteCode } from '../utils/codeGen.js';
import { sendSms, isSMSEnabled } from '../services/sms.js';
import { sanitizeError } from '../lib/utils.js';

const router = Router();

async function uniqueInviteCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const existing = await prisma.employee.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

// GET /api/employees/me — current employee profile (auth, not manager-gated)
router.get('/me', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.auth.employeeId },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// PUT /api/employees/me — update own profile (auth, not manager-gated)
router.put('/me', validate(employeeSelfUpdateSchema), async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const employee = await prisma.employee.update({
      where: { id: req.auth.employeeId },
      data: updateData,
    });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// POST /api/employees/me/onboarded — mark first-run onboarding as complete
router.post('/me/onboarded', async (req, res) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: req.auth.employeeId },
      data: { onboardedAt: new Date() },
    });
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

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
router.post('/', requireManager, validate(employeeCreateSchema), async (req, res) => {
  try {
    const { name, phone, email, role, qualifications } = req.body;
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
router.put('/:id', requireManager, validate(employeeUpdateSchema), async (req, res) => {
  try {
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { qualifications, ...rest } = req.body;
    const updateData = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    if (qualifications !== undefined) updateData.qualifications = JSON.stringify(qualifications);

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

// POST /api/employees/:id/invite — (re)send invite code via SMS (manager only)
router.post('/:id/invite', requireManager, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!employee || employee.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Ensure the employee has an invite code
    let code = employee.inviteCode;
    if (!code) {
      code = await uniqueInviteCode();
      await prisma.employee.update({
        where: { id: employee.id },
        data: { inviteCode: code },
      });
    }

    // Send SMS if available
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const msg = `ShiftCover: Your access code is ${code}. Open ${appUrl} and enter it to sign in.`;
    const smsResult = await sendSms(employee.phone, msg);

    res.json({
      code,
      smsEnabled: isSMSEnabled(),
      sent: smsResult.success,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
