import prisma from '../lib/prisma.js';
import { sendShiftNotification } from './sms.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HOUR_MS = 60 * 60 * 1000;

// Build a Date from a "YYYY-MM-DD" date and "HH:MM" time, in local time.
function dateTimeToDate(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, h, m);
}

// Return a shift's {start, end} as Dates. Overnight shifts (end <= start)
// roll the end to the following day so durations and gaps stay correct.
function shiftInterval(shift) {
  const start = dateTimeToDate(shift.date, shift.startTime);
  let end = dateTimeToDate(shift.date, shift.endTime);
  if (end <= start) end = new Date(end.getTime() + 24 * HOUR_MS);
  return { start, end };
}

function shiftHours(shift) {
  const { start, end } = shiftInterval(shift);
  return (end - start) / HOUR_MS;
}

// Gap in ms between two intervals; negative (-1) when they overlap.
function gapBetween(a, b) {
  if (a.end <= b.start) return b.start - a.end;
  if (b.end <= a.start) return a.start - b.end;
  return -1;
}

// "YYYY-MM-DD" for a local Date.
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
}

// Start of the ISO week (Monday) for a date, parsed in local time.
function getWeekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diff);
  return toDateStr(date);
}

// True if assigning targetShift leaves less than minRestHours between it and
// any of the employee's existing shifts (overlap counts as a violation).
function restViolation(targetShift, employeeShifts, minRestHours) {
  const target = shiftInterval(targetShift);
  const restMs = minRestHours * HOUR_MS;
  for (const shift of employeeShifts) {
    if (shift.id === targetShift.id) continue;
    if (gapBetween(target, shiftInterval(shift)) < restMs) return true;
  }
  return false;
}

// True if the employee already has a shift starting within noDoubleShiftHours
// of the target shift (the PRD's "no double shift" rule).
function doubleShiftViolation(targetShift, employeeShifts, noDoubleShiftHours) {
  if (!noDoubleShiftHours) return false;
  const target = shiftInterval(targetShift);
  const limitMs = noDoubleShiftHours * HOUR_MS;
  for (const shift of employeeShifts) {
    if (shift.id === targetShift.id) continue;
    if (Math.abs(shiftInterval(shift).start - target.start) < limitMs) return true;
  }
  return false;
}

// Employee IDs preferred for a given site, from the rules' JSON map.
function preferredForSite(preferredWorkerMap, site) {
  if (!site) return [];
  try {
    const map = JSON.parse(preferredWorkerMap || '{}');
    const val = map[site];
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  } catch {
    return [];
  }
}

export async function findCoverage(businessId, shiftId) {
  if (!uuidRegex.test(businessId) || !uuidRegex.test(shiftId)) {
    throw new Error('Invalid ID format');
  }

  let rules = await prisma.coverageRule.findUnique({ where: { businessId } });
  if (!rules) {
    rules = { noDoubleShiftHours: 8, minRestHours: 8, maxHoursPerWeek: 40, preferredWorkerMap: '{}' };
  }

  // Hard floor: minRestHours cannot be below 8
  const minRestHours = Math.max(rules.minRestHours || 8, 8);
  const noDoubleShiftHours = rules.noDoubleShiftHours ?? 8;
  const maxHoursPerWeek = rules.maxHoursPerWeek || 40;

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'filled') throw new Error('Shift already filled');

  const employees = await prisma.employee.findMany({
    where: { businessId, status: 'active' },
  });
  if (employees.length === 0) return null;

  // All shifts for the business, used to evaluate each employee's existing load.
  const allShifts = await prisma.shift.findMany({ where: { businessId } });

  const weekStart = getWeekStart(shift.date);
  const weekEnd = addDays(weekStart, 6);
  const targetHours = shiftHours(shift);
  const preferred = preferredForSite(rules.preferredWorkerMap, shift.site);

  const candidates = employees
    .filter((emp) => {
      const quals = JSON.parse(emp.qualifications || '[]');
      return quals.length === 0 || quals.includes(shift.role);
    })
    .map((emp) => ({
      emp,
      empShifts: allShifts.filter((s) => s.assignedEmployeeId === emp.id),
    }))
    .filter(({ empShifts }) => !restViolation(shift, empShifts, minRestHours))
    .filter(({ empShifts }) => !doubleShiftViolation(shift, empShifts, noDoubleShiftHours))
    .filter(({ empShifts }) => {
      const weekHours = empShifts
        .filter((s) => s.date >= weekStart && s.date <= weekEnd)
        .reduce((sum, s) => sum + shiftHours(s), 0);
      return weekHours + targetHours <= maxHoursPerWeek;
    })
    .sort((a, b) => {
      // Preferred workers for the site come first.
      const aPref = preferred.includes(a.emp.id) ? 0 : 1;
      const bPref = preferred.includes(b.emp.id) ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      // Then load-balance by fewest upcoming assigned shifts.
      const aUpcoming = a.empShifts.filter((s) => s.date >= shift.date).length;
      const bUpcoming = b.empShifts.filter((s) => s.date >= shift.date).length;
      return aUpcoming - bUpcoming;
    });

  if (candidates.length === 0) return null;
  return candidates[0].emp;
}

export async function applyCoverage(businessId, shiftId) {
  const candidate = await findCoverage(businessId, shiftId);
  if (!candidate) return null;

  const result = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status === 'filled') return null;

    const claim = await tx.shiftClaim.create({
      data: { shiftId, employeeId: candidate.id },
    });

    const updatedShift = await tx.shift.update({
      where: { id: shiftId },
      data: { assignedEmployeeId: candidate.id, status: 'filled' },
      include: { assignedEmployee: true },
    });

    return { claim, shift: updatedShift, employee: candidate };
  });

  // Send SMS notification to assigned employee
  if (result && result.employee?.phone) {
    sendShiftNotification(result.employee.phone, {
      date: result.shift.date,
      startTime: result.shift.startTime,
      endTime: result.shift.endTime,
      site: result.shift.site,
      role: result.shift.role,
    }).catch((err) => console.error('Failed to send SMS:', err));
  }

  return result;
}

export async function fillAllOpenShifts(businessId) {
  if (!uuidRegex.test(businessId)) {
    throw new Error('Invalid business ID format');
  }

  const openShifts = await prisma.shift.findMany({
    where: { businessId, status: 'open' },
    orderBy: { date: 'asc' },
  });

  const results = [];
  for (const shift of openShifts) {
    const result = await applyCoverage(businessId, shift.id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function getCoverageStats(businessId) {
  if (!uuidRegex.test(businessId)) {
    throw new Error('Invalid business ID format');
  }

  const totalShifts = await prisma.shift.count({ where: { businessId } });
  const filledShifts = await prisma.shift.count({
    where: { businessId, status: 'filled' },
  });
  const openShifts = await prisma.shift.count({
    where: { businessId, status: 'open' },
  });

  return {
    total: totalShifts,
    filled: filledShifts,
    open: openShifts,
    coverageRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0,
  };
}
