import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

export function buildOnboardingSteps(business) {
  return {
    businessProfile: !!(business.name && business.industryType),
    defaultShifts: business.defaultShifts.length > 0,
    employees: business.employees.length > 0,
    coverageRules: !!business.coverageRules,
  };
}

// GET /api/onboarding/status — returns completion status + step details
router.get('/status', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.auth.businessId },
      include: {
        employees: { where: { isManager: false }, select: { id: true } },
        coverageRules: { select: { id: true } },
        defaultShifts: { select: { id: true } },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const steps = buildOnboardingSteps(business);

    res.json({
      completedAt: business.onboardingCompletedAt,
      steps,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// POST /api/onboarding/complete — marks onboarding as done (manager only)
router.post('/complete', requireManager, async (req, res) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.auth.businessId },
      data: { onboardingCompletedAt: new Date() },
    });
    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
