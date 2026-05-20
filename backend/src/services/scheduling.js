// Pure scheduling logic — no database access, fully unit-testable.

export const HOUR_MS = 60 * 60 * 1000;

// Build a Date from a "YYYY-MM-DD" date and "HH:MM" time, in local time.
export function dateTimeToDate(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, h, m);
}

// Return a shift's {start, end} as Dates. Overnight shifts (end <= start)
// roll the end to the following day so durations and gaps stay correct.
export function shiftInterval(shift) {
  const start = dateTimeToDate(shift.date, shift.startTime);
  let end = dateTimeToDate(shift.date, shift.endTime);
  if (end <= start) end = new Date(end.getTime() + 24 * HOUR_MS);
  return { start, end };
}

export function shiftHours(shift) {
  const { start, end } = shiftInterval(shift);
  return (end - start) / HOUR_MS;
}

// Gap in ms between two intervals; negative (-1) when they overlap.
export function gapBetween(a, b) {
  if (a.end <= b.start) return b.start - a.end;
  if (b.end <= a.start) return a.start - b.end;
  return -1;
}

// "YYYY-MM-DD" for a local Date.
export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
}

// Start of the ISO week (Monday) for a date, parsed in local time.
export function getWeekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diff);
  return toDateStr(date);
}

// True if assigning targetShift leaves less than minRestHours between it and
// any of the employee's existing shifts (overlap counts as a violation).
export function restViolation(targetShift, employeeShifts, minRestHours) {
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
export function doubleShiftViolation(targetShift, employeeShifts, noDoubleShiftHours) {
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
export function preferredForSite(preferredWorkerMap, site) {
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

// Normalize a CoverageRule (or null) into the effective values used here.
export function effectiveRules(rules) {
  return {
    minRestHours: Math.max(rules?.minRestHours || 8, 8), // hard floor of 8
    noDoubleShiftHours: rules?.noDoubleShiftHours ?? 8,
    maxHoursPerWeek: rules?.maxHoursPerWeek || 40,
    preferredWorkerMap: rules?.preferredWorkerMap || '{}',
  };
}

// Choose the best eligible employee for an open shift, or null if none qualify.
// `employees` are active employees; `allShifts` is every shift in the business.
// `unavailable` maps employeeId -> array of "YYYY-MM-DD" dates they can't work.
export function selectCandidate(shift, employees, allShifts, rules, unavailable = {}) {
  const { minRestHours, noDoubleShiftHours, maxHoursPerWeek, preferredWorkerMap } =
    effectiveRules(rules);

  const weekStart = getWeekStart(shift.date);
  const weekEnd = addDays(weekStart, 6);
  const targetHours = shiftHours(shift);
  const preferred = preferredForSite(preferredWorkerMap, shift.site);

  const candidates = employees
    .filter((emp) => !(unavailable[emp.id] || []).includes(shift.date))
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

  return candidates.length ? candidates[0].emp : null;
}
