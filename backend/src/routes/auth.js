import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas.js';
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

// Bootstrap a new business + its first manager
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { businessName, industryType, managerName, phone } = req.body;
    const inviteCode = await uniqueInviteCode();
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: businessName, industryType },
      });
      const manager = await tx.employee.create({
        data: {
          businessId: business.id,
          name: managerName,
          phone,
          role: 'Manager',
          isManager: true,
          inviteCode,
        },
      });
      return { business, manager };
    });

    const token = signToken({
      employeeId: result.manager.id,
      businessId: result.business.id,
      isManager: true,
    });
    res.status(201).json({
      token,
      businessId: result.business.id,
      employeeId: result.manager.id,
      isManager: true,
      inviteCode,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Log in with a 6-digit invite code
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { code } = req.body;
    const employee = await prisma.employee.findUnique({ where: { inviteCode: code } });
    if (!employee || employee.status !== 'active') {
      return res.status(401).json({ error: 'Invalid code' });
    }
    const token = signToken({
      employeeId: employee.id,
      businessId: employee.businessId,
      isManager: employee.isManager,
    });
    res.json({
      token,
      businessId: employee.businessId,
      isManager: employee.isManager,
      employee: { id: employee.id, name: employee.name, role: employee.role },
      needsOnboarding: !employee.onboardedAt,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
