import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { applyCoverage, fillAllOpenShifts, getCoverageStats, findCoverage } from '../services/coverage.js';
import { notifyUncoveredShifts } from '../services/alerts.js';
import { requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { coverageRuleSchema } from '../schemas.js';
import { sanitizeError } from '../lib/utils.js';

const router = Router();

const RULE_DEFAULTS = {
  minRestHours: 10,
  noDoubleShiftHours: 8,
  maxHoursPerWeek: 40,
  preferredWorkerMap: {},
};

function serializeRules(rule) {
  if (!rule) return RULE_DEFAULTS;
  let preferredWorkerMap = {};
  try {
    preferredWorkerMap = JSON.parse(rule.preferredWorkerMap || '{}');
  } catch {
    preferredWorkerMap = {};
  }
  return {
    minRestHours: rule.minRestHours,
    noDoubleShiftHours: rule.noDoubleShiftHours,
    maxHoursPerWeek: rule.maxHoursPerWeek,
    preferredWorkerMap,
  };
}

// Get the business's auto-coverage rules (defaults if none saved yet)
router.get('/rules', requireManager, async (req, res) => {
  try {
    const rule = await prisma.coverageRule.findUnique({
      where: { businessId: req.auth.businessId },
    });
    res.json({ rules: serializeRules(rule) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Create or update the business's auto-coverage rules
router.put('/rules', requireManager, validate(coverageRuleSchema), async (req, res) => {
  try {
    const { minRestHours, noDoubleShiftHours, maxHoursPerWeek, preferredWorkerMap } = req.body;
    const data = {};
    if (minRestHours !== undefined) data.minRestHours = minRestHours;
    if (noDoubleShiftHours !== undefined) data.noDoubleShiftHours = noDoubleShiftHours;
    if (maxHoursPerWeek !== undefined) data.maxHoursPerWeek = maxHoursPerWeek;
    if (preferredWorkerMap !== undefined) {
      data.preferredWorkerMap = JSON.stringify(preferredWorkerMap);
    }

    const rule = await prisma.coverageRule.upsert({
      where: { businessId: req.auth.businessId },
      update: data,
      create: { businessId: req.auth.businessId, ...data },
    });
    res.json({ rules: serializeRules(rule) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

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
    res.status(500).json({ error: sanitizeError(error) });
  }
});

router.post('/fill-all', requireManager, async (req, res) => {
  try {
    const results = await fillAllOpenShifts(req.auth.businessId);
    res.json({ message: `Filled ${results.length} shifts`, results });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
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
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// Manually check for shifts that have been uncovered too long and alert managers
router.post('/check-uncovered', requireManager, async (req, res) => {
  try {
    const thresholdHours = Number(process.env.ALERT_THRESHOLD_HOURS) || 4;
    const summary = await notifyUncoveredShifts({
      businessId: req.auth.businessId,
      thresholdHours,
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getCoverageStats(req.auth.businessId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
