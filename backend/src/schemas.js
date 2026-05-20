import { z } from 'zod';

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'date is not a valid calendar date');

const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM (24h)');

// E.164-ish phone: leading + and 7-15 digits.
const phone = z.string().regex(/^\+[1-9]\d{6,14}$/, 'phone must be E.164 format, e.g. +15035551234');

const email = z
  .string()
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'invalid email')
  .optional();

const qualifications = z.array(z.string()).optional();

export const registerSchema = z.object({
  businessName: z.string().min(1),
  industryType: z.string().min(1),
  managerName: z.string().min(1),
  phone,
});

export const loginSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'a 6-digit code is required'),
});

export const businessUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    industryType: z.string().min(1).optional(),
  })
  .refine((d) => d.name !== undefined || d.industryType !== undefined, {
    message: 'at least one field (name or industryType) is required',
  });

export const employeeCreateSchema = z.object({
  name: z.string().min(1),
  phone,
  email,
  role: z.string().min(1),
  qualifications,
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: phone.optional(),
  email,
  role: z.string().min(1).optional(),
  qualifications,
  status: z.enum(['active', 'inactive']).optional(),
});

export const shiftCreateSchema = z.object({
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr,
  site: z.string().optional(),
  role: z.string().min(1),
  assignedEmployeeId: z.string().uuid().optional(),
});

export const shiftUpdateSchema = z.object({
  date: dateStr.optional(),
  startTime: timeStr.optional(),
  endTime: timeStr.optional(),
  site: z.string().optional(),
  role: z.string().min(1).optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'filled']).optional(),
});

export const shiftAssignSchema = z.object({
  employeeId: z.string().uuid().nullable().optional(),
});

export const claimSchema = z.object({
  shiftId: z.string().uuid(),
});
