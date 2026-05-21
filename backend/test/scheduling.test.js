import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shiftHours,
  getWeekStart,
  addDays,
  restViolation,
  doubleShiftViolation,
  preferredForSite,
  selectCandidate,
  nextMonday,
} from '../src/services/scheduling.js';

const emp = (id, quals = []) => ({ id, qualifications: JSON.stringify(quals) });
const shift = (id, date, startTime, endTime, extra = {}) => ({
  id,
  date,
  startTime,
  endTime,
  assignedEmployeeId: null,
  ...extra,
});

test('shiftHours: normal daytime shift', () => {
  assert.equal(shiftHours(shift('s', '2026-05-20', '09:00', '17:00')), 8);
});

test('shiftHours: overnight shift rolls past midnight', () => {
  assert.equal(shiftHours(shift('s', '2026-05-20', '22:00', '02:00')), 4);
});

test('getWeekStart: Wed, Sun, and Mon all map to the same Monday', () => {
  assert.equal(getWeekStart('2026-05-20'), '2026-05-18'); // Wednesday
  assert.equal(getWeekStart('2026-05-24'), '2026-05-18'); // Sunday
  assert.equal(getWeekStart('2026-05-18'), '2026-05-18'); // Monday
});

test('addDays handles month rollover', () => {
  assert.equal(addDays('2026-05-30', 3), '2026-06-02');
});

test('restViolation: shift the next day with >8h gap is allowed', () => {
  const target = shift('t', '2026-05-21', '09:00', '17:00');
  const existing = [shift('a', '2026-05-20', '09:00', '17:00', { assignedEmployeeId: 'e' })];
  assert.equal(restViolation(target, existing, 8), false);
});

test('restViolation: overlapping shift violates', () => {
  const target = shift('t', '2026-05-20', '12:00', '20:00');
  const existing = [shift('a', '2026-05-20', '09:00', '17:00', { assignedEmployeeId: 'e' })];
  assert.equal(restViolation(target, existing, 8), true);
});

test('restViolation: only 2h between shifts violates an 8h minimum', () => {
  const target = shift('t', '2026-05-20', '19:00', '23:00');
  const existing = [shift('a', '2026-05-20', '09:00', '17:00', { assignedEmployeeId: 'e' })];
  assert.equal(restViolation(target, existing, 8), true);
});

test('doubleShiftViolation: second shift starting within window is flagged', () => {
  const target = shift('t', '2026-05-20', '14:00', '18:00');
  const existing = [shift('a', '2026-05-20', '09:00', '12:00', { assignedEmployeeId: 'e' })];
  assert.equal(doubleShiftViolation(target, existing, 8), true);
});

test('doubleShiftViolation: shifts far apart are fine', () => {
  const target = shift('t', '2026-05-25', '09:00', '17:00');
  const existing = [shift('a', '2026-05-20', '09:00', '17:00', { assignedEmployeeId: 'e' })];
  assert.equal(doubleShiftViolation(target, existing, 8), false);
});

test('preferredForSite: parses both single and array values', () => {
  assert.deepEqual(preferredForSite('{"Pub":"e1"}', 'Pub'), ['e1']);
  assert.deepEqual(preferredForSite('{"Pub":["e1","e2"]}', 'Pub'), ['e1', 'e2']);
  assert.deepEqual(preferredForSite('{"Pub":"e1"}', 'Cafe'), []);
  assert.deepEqual(preferredForSite('not json', 'Pub'), []);
});

test('selectCandidate: skips employees not qualified for the role', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Bartender' });
  const employees = [emp('e1', ['Server']), emp('e2', ['Bartender'])];
  const chosen = selectCandidate(target, employees, [], null);
  assert.equal(chosen.id, 'e2');
});

test('selectCandidate: empty qualifications means eligible for any role', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Bartender' });
  const chosen = selectCandidate(target, [emp('e1', [])], [], null);
  assert.equal(chosen.id, 'e1');
});

test('selectCandidate: returns null when no one qualifies', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Chef' });
  const chosen = selectCandidate(target, [emp('e1', ['Server'])], [], null);
  assert.equal(chosen, null);
});

test('selectCandidate: enforces weekly hours cap including the target shift', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Server' }); // 8h
  const employees = [emp('e1', ['Server'])];
  // e1 already has 36h Mon-Tue that week; +8 would be 44 > 40 cap.
  const existing = [
    shift('a', '2026-05-18', '08:00', '20:00', { assignedEmployeeId: 'e1' }), // 12h
    shift('b', '2026-05-19', '08:00', '20:00', { assignedEmployeeId: 'e1' }), // 12h
    shift('c', '2026-05-22', '08:00', '20:00', { assignedEmployeeId: 'e1' }), // 12h
  ];
  const chosen = selectCandidate(target, employees, existing, { maxHoursPerWeek: 40 });
  assert.equal(chosen, null);
});

test('selectCandidate: preferred worker for the site is chosen first', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Server', site: 'Pub' });
  const employees = [emp('e1', ['Server']), emp('e2', ['Server'])];
  const rules = { preferredWorkerMap: '{"Pub":"e2"}' };
  const chosen = selectCandidate(target, employees, [], rules);
  assert.equal(chosen.id, 'e2');
});

test('selectCandidate: excludes an employee marked unavailable for the date', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Server' });
  const employees = [emp('e1', ['Server']), emp('e2', ['Server'])];
  const unavailable = { e1: ['2026-05-20'] };
  const chosen = selectCandidate(target, employees, [], null, unavailable);
  assert.equal(chosen.id, 'e2');
});

test('selectCandidate: unavailability on a different date does not exclude', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Server' });
  const employees = [emp('e1', ['Server'])];
  const unavailable = { e1: ['2026-05-21'] };
  const chosen = selectCandidate(target, employees, [], null, unavailable);
  assert.equal(chosen.id, 'e1');
});

test('selectCandidate: load-balances toward the employee with fewer upcoming shifts', () => {
  const target = shift('t', '2026-05-20', '09:00', '17:00', { role: 'Server' });
  const employees = [emp('e1', ['Server']), emp('e2', ['Server'])];
  // e1 already has an upcoming shift well clear of rest/double-shift windows; e2 has none.
  const existing = [shift('x', '2026-05-28', '09:00', '17:00', { assignedEmployeeId: 'e1' })];
  const chosen = selectCandidate(target, employees, existing, null);
  assert.equal(chosen.id, 'e2');
});

test('nextMonday: from a Monday returns the following Monday (7 days)', () => {
  // 2026-05-18 is a Monday
  assert.equal(nextMonday(new Date(2026, 4, 18)), '2026-05-25');
});

test('nextMonday: from a Wednesday returns the next Monday (5 days)', () => {
  // 2026-05-20 is a Wednesday
  assert.equal(nextMonday(new Date(2026, 4, 20)), '2026-05-25');
});

test('nextMonday: from a Sunday returns the very next day (Monday)', () => {
  // 2026-05-24 is a Sunday
  assert.equal(nextMonday(new Date(2026, 4, 24)), '2026-05-25');
});

test('nextMonday: from a Saturday returns 2 days later (Monday)', () => {
  // 2026-05-23 is a Saturday
  assert.equal(nextMonday(new Date(2026, 4, 23)), '2026-05-25');
});
