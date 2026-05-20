import { Router } from 'express';
import { applyCoverage, fillAllOpenShifts, getCoverageStats, findCoverage } from '../services/coverage.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

function sanitizeError(res, error) {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

router.post('/auto/:shiftId', requireManager, async (req, res) => {
  try {
    const result = await applyCoverage(req.auth.businessId, req.params.shiftId);
    if (!result) {
      return res.json({ message: 'No candidate found', shiftId: req.params.shiftId });
    }
    res.json({ message: 'Shift filled automatically', ...result });
  } catch (error) {
    if (error.message === 'Shift not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Shift already filled') {
      return res.status(409).json({ error: error.message });
    }
    sanitizeError(res, error);
  }
});

router.post('/fill-all', requireManager, async (req, res) => {
  try {
    const results = await fillAllOpenShifts(req.auth.businessId);
    res.json({ message: `Filled ${results.length} shifts`, results });
  } catch (error) {
    sanitizeError(res, error);
  }
});

router.get('/preview/:shiftId', requireManager, async (req, res) => {
  try {
    const candidate = await findCoverage(req.auth.businessId, req.params.shiftId);
    if (!candidate) {
      return res.json({ candidate: null, message: 'No eligible employee found' });
    }
    res.json({ candidate: { id: candidate.id, name: candidate.name, phone: candidate.phone } });
  } catch (error) {
    if (error.message === 'Shift not found') {
      return res.status(404).json({ error: error.message });
    }
    sanitizeError(res, error);
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getCoverageStats(req.auth.businessId);
    res.json(stats);
  } catch (error) {
    sanitizeError(res, error);
  }
});

export default router;
