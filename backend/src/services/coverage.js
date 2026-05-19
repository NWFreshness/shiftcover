import { PrismaClient } from '@prisma/client';
import { sendShiftNotification } from './sms.js';

const prisma = new PrismaClient();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeError(error) {
  console.error('Server error:', error);
  return 'Internal server error';
}

export async function findCoverage(businessId, shiftId) {
  if (!uuidRegex.test(businessId) || !uuidRegex.test(shiftId)) {
    throw new Error('Invalid ID format');
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'filled') throw new Error('Shift already filled');

  const employees = await prisma.employee.findMany({
    where: {
      businessId,
      status: 'active',
    },
  });

  if (employees.length === 0) return null;

  const candidates = employees
    .filter((emp) => {
      const quals = JSON.parse(emp.qualifications || '[]');
      return quals.includes(shift.role) || quals.length === 0;
    })
    .sort((a, b) => {
      const aClaims = a.claimedShifts?.length || 0;
      const bClaims = b.claimedShifts?.length || 0;
      return aClaims - bClaims;
    });

  if (candidates.length === 0) return null;
  return candidates[0];
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
