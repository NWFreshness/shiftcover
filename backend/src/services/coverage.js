import prisma from '../lib/prisma.js';
import { sendShiftNotification } from './sms.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

// Parse time "HH:MM" to minutes since midnight
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Get shift end time as a Date object for calculations
function shiftEndAsDate(shiftDate, shiftEndTime) {
  const [year, month, day] = shiftDate.split('-').map(Number);
  const [endH, endM] = shiftEndTime.split(':').map(Number);
  return new Date(year, month - 1, day, endH, endM);
}

// Check if two shifts overlap or violate rest period
function violatesRestPeriod(shift1End, shift1Date, shift1EndTime, shift2Date, shift2StartTime, minRestHours) {
  const shift2Start = shiftEndAsDate(shift2Date, shift2StartTime);
  const shift1EndDate = shiftEndAsDate(shift1Date, shift1EndTime);

  // Convert rest hours to milliseconds
  const restMs = minRestHours * 60 * 60 * 1000;

  // If shift1 ends after shift2 starts (with rest period buffer), they violate the rule
  // shift1 end + minRestHours > shift2 start
  const restPeriodEnd = new Date(shift1EndDate.getTime() + restMs);
  return restPeriodEnd > shift2Start;
}

async function getEmployeeShiftsInRange(employeeId, businessId, startDate, endDate) {
  return prisma.shift.findMany({
    where: {
      employeeId: employeeId,
      businessId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
}

function checkViolation(employee, targetShift, businessShifts, minRestHours) {
  const targetEnd = shiftEndAsDate(targetShift.date, targetShift.endTime);
  const targetStart = shiftEndAsDate(targetShift.date, targetShift.startTime);
  const restMs = minRestHours * 60 * 60 * 1000;

  for (const shift of businessShifts) {
    if (shift.id === targetShift.id) continue;
    if (shift.assignedEmployeeId !== employee.id) continue;

    const shiftEnd = shiftEndAsDate(shift.date, shift.endTime);
    const shiftStart = shiftEndAsDate(shift.date, shift.startTime);

    // Check rest period violations in both directions
    // Does target shift start too soon after the employee's existing shift ended?
    const targetStartWithRest = new Date(shiftEnd.getTime() + restMs);
    if (targetStartWithRest > targetStart) {
      return `Rest period violation: only ${Math.round((targetStart - shiftEnd) / (60 * 60 * 1000) * 10) / 10}h between shifts (minimum ${minRestHours}h required)`;
    }

    // Does target shift end too soon before the employee's existing shift starts?
    const shiftStartWithRest = new Date(targetEnd.getTime() + restMs);
    if (shiftStartWithRest > shiftStart) {
      return `Rest period violation: only ${Math.round((shiftStart - targetEnd) / (60 * 60 * 1000) * 10) / 10}h between shifts (minimum ${minRestHours}h required)`;
    }
  }

  return null; // No violation
}

function calculateWeeklyHours(shifts, weekStartDate) {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  weekEndDate.setDate(weekEndDate.getDate() - 1); // End on the 7th day

  let totalMinutes = 0;
  for (const shift of shifts) {
    if (shift.date >= weekStartDate && shift.date <= weekEndDate.toISOString().split('T')[0]) {
      const startMins = timeToMinutes(shift.startTime);
      const endMins = timeToMinutes(shift.endTime);
      totalMinutes += (endMins - startMins + (endMins < startMins ? 24 * 60 : 0));
    }
  }
  return totalMinutes / 60;
}

export async function findCoverage(businessId, shiftId) {
  if (!uuidRegex.test(businessId) || !uuidRegex.test(shiftId)) {
    throw new Error('Invalid ID format');
  }

  // Load coverage rules for this business
  let rules = await prisma.coverageRule.findUnique({ where: { businessId } });
  if (!rules) {
    // Create default rules if none exist
    rules = { noDoubleShiftHours: 8, minRestHours: 8, maxHoursPerWeek: 40, preferredWorkerMap: '{}' };
  }

  // Hard floor: minRestHours cannot be below 8
  const minRestHours = Math.max(rules.minRestHours || 8, 8);

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'filled') throw new Error('Shift already filled');

  // Get all employees for the business with their claimed shifts
  const employees = await prisma.employee.findMany({
    where: {
      businessId,
      status: 'active',
    },
    include: {
      shifts: {
        where: {
          date: { gte: shift.date },
        },
      },
    },
  });

  if (employees.length === 0) return null;

  // Get all shifts in the system for rest period checking (across all employees)
  const allShifts = await prisma.shift.findMany({
    where: { businessId },
  });

  const candidates = employees
    .filter((emp) => {
      const quals = JSON.parse(emp.qualifications || '[]');
      return quals.includes(shift.role) || quals.length === 0;
    })
    .filter((emp) => {
      // Check rest period violations using all shifts for this employee
      const violation = checkViolation(emp, shift, allShifts, minRestHours);
      return violation === null;
    })
    .filter((emp) => {
      // Check weekly hours limit
      const weekStart = getWeekStart(shift.date);
      const weeklyHours = calculateWeeklyHours(emp.shifts, weekStart);
      return weeklyHours < (rules.maxHoursPerWeek || 40);
    })
    .sort((a, b) => {
      const aClaims = a.shifts?.length || 0;
      const bClaims = b.shifts?.length || 0;
      return aClaims - bClaims;
    });

  if (candidates.length === 0) return null;
  return candidates[0];
}

// Helper to get ISO week start date (Monday)
function getWeekStart(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
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
