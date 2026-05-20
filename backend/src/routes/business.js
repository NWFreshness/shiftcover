import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// Get the authenticated user's business
router.get('/', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.auth.businessId },
    });
    if (!business) return res.status(404).json({ error: 'Not found' });
    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

router.put('/', requireManager, async (req, res) => {
  try {
    const { name, industryType } = req.body;
    if (!name && !industryType) {
      return res.status(400).json({ error: 'At least one field (name or industryType) is required' });
    }
    const updateData = {};
    if (name) updateData.name = name;
    if (industryType) updateData.industryType = industryType;
    const business = await prisma.business.update({
      where: { id: req.auth.businessId },
      data: updateData,
    });
    res.json({ business });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
