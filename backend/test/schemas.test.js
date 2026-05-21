import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerSchema,
  loginSchema,
  shiftCreateSchema,
  employeeCreateSchema,
  employeeSelfUpdateSchema,
  defaultShiftCreateSchema,
  defaultShiftUpdateSchema,
  claimSchema,
  publishWeekSchema,
} from '../src/schemas.js';

const UUID = '11111111-1111-4111-8111-111111111111';

test('loginSchema: rejects non-6-digit codes', () => {
  assert.equal(loginSchema.safeParse({ code: 'abc' }).success, false);
  assert.equal(loginSchema.safeParse({ code: '12345' }).success, false);
  assert.equal(loginSchema.safeParse({ code: '123456' }).success, true);
});

test('registerSchema: requires all fields and a valid phone', () => {
  assert.equal(registerSchema.safeParse({ businessName: 'X' }).success, false);
  assert.equal(
    registerSchema.safeParse({
      businessName: 'Pub',
      industryType: 'Food',
      managerName: 'Ty',
      phone: '5035551234',
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({
      businessName: 'Pub',
      industryType: 'Food',
      managerName: 'Ty',
      phone: '+15035551234',
    }).success,
    true,
  );
});

test('shiftCreateSchema: rejects invalid dates and times', () => {
  assert.equal(
    shiftCreateSchema.safeParse({
      date: '2026-13-40',
      startTime: '99:00',
      endTime: '17:00',
      role: 'Bar',
    }).success,
    false,
  );
  assert.equal(
    shiftCreateSchema.safeParse({
      date: '2026-05-20',
      startTime: '09:00',
      endTime: '17:00',
      role: 'Bar',
    }).success,
    true,
  );
});

test('shiftCreateSchema: assignedEmployeeId must be a uuid when present', () => {
  assert.equal(
    shiftCreateSchema.safeParse({
      date: '2026-05-20',
      startTime: '09:00',
      endTime: '17:00',
      role: 'Bar',
      assignedEmployeeId: 'not-a-uuid',
    }).success,
    false,
  );
});

test('employeeCreateSchema: requires E.164 phone, accepts optional qualifications', () => {
  assert.equal(employeeCreateSchema.safeParse({ name: 'A', phone: '123', role: 'Bar' }).success, false);
  assert.equal(
    employeeCreateSchema.safeParse({
      name: 'A',
      phone: '+15035551234',
      role: 'Bar',
      qualifications: ['Bar'],
    }).success,
    true,
  );
});

test('employeeSelfUpdateSchema: supports employee profile confirmation', () => {
  assert.equal(employeeSelfUpdateSchema.safeParse({}).success, true);
  assert.equal(employeeSelfUpdateSchema.safeParse({ name: 'A', phone: '123' }).success, false);
  assert.equal(
    employeeSelfUpdateSchema.safeParse({
      name: 'A',
      phone: '+15055551234',
      email: 'a@example.com',
    }).success,
    true,
  );
});

test('defaultShiftCreateSchema: validates template times and weekdays', () => {
  assert.equal(
    defaultShiftCreateSchema.safeParse({
      label: 'Morning',
      role: 'Barista',
      startTime: '08:00',
      endTime: '14:00',
      daysOfWeek: [1, 2, 3],
    }).success,
    true,
  );
  assert.equal(
    defaultShiftCreateSchema.safeParse({
      label: 'Broken',
      role: 'Barista',
      startTime: '8:00',
      endTime: '14:00',
      daysOfWeek: [7],
    }).success,
    false,
  );
});

test('defaultShiftUpdateSchema: allows partial template updates', () => {
  assert.equal(defaultShiftUpdateSchema.safeParse({ startTime: '09:30' }).success, true);
  assert.equal(defaultShiftUpdateSchema.safeParse({ daysOfWeek: [-1] }).success, false);
});

test('claimSchema: requires a uuid shiftId', () => {
  assert.equal(claimSchema.safeParse({ shiftId: 'x' }).success, false);
  assert.equal(claimSchema.safeParse({ shiftId: UUID }).success, true);
});

test('publishWeekSchema: accepts empty body', () => {
  const result = publishWeekSchema.safeParse({});
  assert.equal(result.success, true);
});

test('publishWeekSchema: accepts a valid YYYY-MM-DD weekStart', () => {
  const result = publishWeekSchema.safeParse({ weekStart: '2026-05-25' });
  assert.equal(result.success, true);
  assert.equal(result.data.weekStart, '2026-05-25');
});

test('publishWeekSchema: rejects a non-date string', () => {
  const result = publishWeekSchema.safeParse({ weekStart: 'next-monday' });
  assert.equal(result.success, false);
});
