import { Router } from 'express';
import { applyCoverage, fillAllOpenShifts, getCoverageStats, findCoverage } from '../services/coverage.js';

const router = Router();

function sanitizeError(res, error) {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

router.post('/auto/:shiftId', async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }

    const result = await applyCoverage(businessId, shiftId);
    if (!result) {
      return res.json({ message: 'No candidate found', shiftId });
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

router.post('/fill-all', async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }

    const results = await fillAllOpenShifts(businessId);
    res.json({
      message: `Filled ${results.length} shifts`,
      results,
    });
  } catch (error) {
    sanitizeError(res, error);
  }
});

router.get('/preview/:shiftId', async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }

    const candidate = await findCoverage(businessId, shiftId);
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

router.get('/stats/:businessId', async (req, res) => {
  try {
    const stats = await getCoverageStats(req.params.businessId);
    res.json(stats);
  } catch (error) {
    sanitizeError(res, error);
  }
});

export default router;
