import prisma from '../lib/prisma.js';
import { sendSms } from './sms.js';

const HOUR_MS = 60 * 60 * 1000;

// Find shifts that have been open longer than thresholdHours and haven't been
// alerted yet, then text each business's managers and mark them alerted.
// Pass a businessId to scope to one business (e.g. a manual trigger).
export async function notifyUncoveredShifts({ businessId = null, thresholdHours = 4 } = {}) {
  const cutoff = new Date(Date.now() - thresholdHours * HOUR_MS);
  const today = new Date().toISOString().split('T')[0];

  const shifts = await prisma.shift.findMany({
    where: {
      status: 'open',
      alertSentAt: null,
      createdAt: { lt: cutoff },
      date: { gte: today },
      ...(businessId ? { businessId } : {}),
    },
  });

  if (shifts.length === 0) return { businessesNotified: 0, shiftsAlerted: 0 };

  // Group uncovered shifts by business.
  const byBusiness = new Map();
  for (const shift of shifts) {
    if (!byBusiness.has(shift.businessId)) byBusiness.set(shift.businessId, []);
    byBusiness.get(shift.businessId).push(shift);
  }

  let businessesNotified = 0;
  let shiftsAlerted = 0;

  for (const [bizId, bizShifts] of byBusiness) {
    const managers = await prisma.employee.findMany({
      where: { businessId: bizId, isManager: true, status: 'active' },
    });

    const count = bizShifts.length;
    const message = `ShiftCover: ${count} shift${count === 1 ? '' : 's'} still uncovered. Open the dashboard to fill ${count === 1 ? 'it' : 'them'}.`;

    for (const manager of managers) {
      if (!manager.phone) continue;
      await sendSms(manager.phone, message).catch((err) =>
        console.error('Failed to send manager alert:', err),
      );
    }

    await prisma.shift.updateMany({
      where: { id: { in: bizShifts.map((s) => s.id) } },
      data: { alertSentAt: new Date() },
    });

    businessesNotified += 1;
    shiftsAlerted += count;
  }

  return { businessesNotified, shiftsAlerted };
}
