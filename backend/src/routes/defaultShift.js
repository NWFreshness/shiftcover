import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { requireManager } from '../middleware/auth.js';
import { defaultShiftCreateSchema, defaultShiftUpdateSchema, publishWeekSchema } from '../schemas.js';
import { sanitizeError } from '../lib/utils.js';
import { addDays, nextMonday, toDateStr } from '../services/scheduling.js';

const router = Router();

export function serializeDefaultShift(shift) {
  return { ...shift, daysOfWeek: JSON.parse(shift.daysOfWeek) };
}

// GET /api/default-shifts — list all for the business (auth required)
router.get('/', async (req, res) => {
  try {
    const shifts = await prisma.defaultShift.findMany({
      where: { businessId: req.auth.businessId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ defaultShifts: shifts.map(serializeDefaultShift) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// POST /api/default-shifts/publish-week — materialize default shifts into concrete shifts (manager only)
router.post('/publish-week', requireManager, validate(publishWeekSchema), async (req, res) => {
  try {
    const weekStart = req.body.weekStart ?? nextMonday();
    const today = toDateStr(new Date());

    const templates = await prisma.defaultShift.findMany({
      where: { businessId: req.auth.businessId },
    });

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      const daysOfWeek = JSON.parse(template.daysOfWeek || '[]');
      for (const dow of daysOfWeek) {
        // Monday=1→offset 0, Tue=2→1, …, Sat=6→5, Sun=0→6
        const offset = dow === 0 ? 6 : dow - 1;
        const date = addDays(weekStart, offset);

        if (date < today) {
          skipped++;
          continue;
        }

        const existing = await prisma.shift.findFirst({
          where: {
            businessId: req.auth.businessId,
            date,
            startTime: template.startTime,
            role: template.role,
          },
        });

        if (existing) {
          skipped++;
        } else {
          await prisma.shift.create({
            data: {
              businessId: req.auth.businessId,
              date,
              startTime: template.startTime,
              endTime: template.endTime,
              role: template.role,
              site: template.site,
              status: 'open',
            },
          });
          created++;
        }
      }
    }

    res.json({ created, skipped, weekStart });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// POST /api/default-shifts — create (manager only)
router.post('/', requireManager, validate(defaultShiftCreateSchema), async (req, res) => {
  try {
    const { label, role, startTime, endTime, site, daysOfWeek } = req.body;
    const shift = await prisma.defaultShift.create({
      data: {
        businessId: req.auth.businessId,
        label,
        role,
        startTime,
        endTime,
        site,
        daysOfWeek: JSON.stringify(daysOfWeek || []),
      },
    });
    res.status(201).json({ defaultShift: serializeDefaultShift(shift) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// PUT /api/default-shifts/:id — update (manager only, ownership check)
router.put('/:id', requireManager, validate(defaultShiftUpdateSchema), async (req, res) => {
  try {
    const existing = await prisma.defaultShift.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { label, role, startTime, endTime, site, daysOfWeek } = req.body;
    const updated = await prisma.defaultShift.update({
      where: { id: req.params.id },
      data: {
        ...(label !== undefined && { label }),
        ...(role !== undefined && { role }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(site !== undefined && { site }),
        ...(daysOfWeek !== undefined && { daysOfWeek: JSON.stringify(daysOfWeek) }),
      },
    });
    res.json({ defaultShift: serializeDefaultShift(updated) });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

// DELETE /api/default-shifts/:id — delete (manager only, ownership check)
router.delete('/:id', requireManager, async (req, res) => {
  try {
    const existing = await prisma.defaultShift.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.businessId !== req.auth.businessId) {
      return res.status(404).json({ error: 'Not found' });
    }
    await prisma.defaultShift.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error) });
  }
});

export default router;
