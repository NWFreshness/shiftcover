import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOnboardingSteps } from '../src/routes/onboarding.js';
import { serializeDefaultShift } from '../src/routes/defaultShift.js';

test('buildOnboardingSteps: reports incomplete setup when lists are empty', () => {
  const steps = buildOnboardingSteps({
    name: 'ShiftCover Cafe',
    industryType: 'Food service',
    defaultShifts: [],
    employees: [],
    coverageRules: [],
  });

  assert.deepEqual(steps, {
    businessProfile: true,
    defaultShifts: false,
    employees: false,
    coverageRules: false,
  });
});

test('buildOnboardingSteps: requires business name and industry', () => {
  const steps = buildOnboardingSteps({
    name: '',
    industryType: 'Food service',
    defaultShifts: [{ id: 'shift-template' }],
    employees: [{ id: 'employee' }],
    coverageRules: [{ id: 'rule' }],
  });

  assert.equal(steps.businessProfile, false);
  assert.equal(steps.defaultShifts, true);
  assert.equal(steps.employees, true);
  assert.equal(steps.coverageRules, true);
});

test('serializeDefaultShift: parses stored weekday JSON for API responses', () => {
  const serialized = serializeDefaultShift({
    id: 'template-1',
    label: 'Morning opener',
    role: 'Barista',
    startTime: '07:00',
    endTime: '13:00',
    site: 'Front counter',
    daysOfWeek: '[1,2,3,4,5]',
  });

  assert.deepEqual(serialized.daysOfWeek, [1, 2, 3, 4, 5]);
});
