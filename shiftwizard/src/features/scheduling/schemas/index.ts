/**
 * Zod validation schemas for scheduling configuration
 */
import { z } from 'zod';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const TimeSchema = z.string().regex(timeRegex, 'Must be in HH:MM format');

export const DayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export const BusinessHoursEntrySchema = z.object({
  open: TimeSchema,
  close: TimeSchema,
  closed: z.boolean().default(false),
  is24h: z.boolean().default(false),
  crossesMidnight: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.closed || data.is24h) return true;
    const [openHour, openMin] = data.open.split(':').map(Number);
    const [closeHour, closeMin] = data.close.split(':').map(Number);
    const openMins = openHour * 60 + openMin;
    const closeMins = closeHour * 60 + closeMin;
    return openMins !== closeMins; // Not the same time
  },
  { message: 'Open and close times cannot be identical' }
);

export const BusinessHoursSchema = z.record(
  DayOfWeekSchema,
  BusinessHoursEntrySchema
);

export const CoverageIntervalSchema = z.object({
  id: z.string(),
  start: TimeSchema,
  end: TimeSchema,
  min: z.number().int().min(0, 'Minimum must be at least 0'),
  ideal: z.number().int().min(0, 'Ideal must be at least 0'),
  max: z.number().int().min(0, 'Maximum must be at least 0'),
}).refine(
  (data) => data.min <= data.ideal,
  { message: 'Minimum cannot exceed ideal', path: ['ideal'] }
).refine(
  (data) => data.ideal <= data.max,
  { message: 'Ideal cannot exceed maximum', path: ['max'] }
);

export const RoleCoverageSchema = z.record(
  z.string(),
  z.record(DayOfWeekSchema, z.array(CoverageIntervalSchema))
);

export const AvailabilityBlockSchema = z.object({
  day: DayOfWeekSchema,
  start: TimeSchema,
  end: TimeSchema,
  type: z.enum(['hard', 'soft']),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  roles: z.array(z.string()).min(1, 'At least one role required'),
  wage: z.number().min(0, 'Wage must be positive'),
  seniority: z.number().int().min(0).max(10, 'Seniority must be 0-10'),
  preferredHours: z.object({
    min: z.number().min(0),
    target: z.number().min(0),
    max: z.number().min(0),
  }).refine(
    (data) => data.min <= data.target && data.target <= data.max,
    { message: 'Hours must be: min ≤ target ≤ max' }
  ),
  preferredShiftLength: z.object({
    min: z.number().min(2, 'Minimum shift length should be at least 2 hours'),
    max: z.number().max(16, 'Maximum shift length should not exceed 16 hours'),
  }).refine(
    (data) => data.min <= data.max,
    { message: 'Min shift length cannot exceed max' }
  ),
  availability: z.array(AvailabilityBlockSchema),
  preferences: z.object({
    prefersOpenings: z.boolean(),
    prefersClosings: z.boolean(),
  }),
  pairing: z.object({
    preferWith: z.array(z.string()),
    avoidWith: z.array(z.string()),
  }),
});

export const HardRulesSchema = z.object({
  maxHoursPerDay: z.number().min(1).max(24).default(12),
  maxHoursPerWeek: z.number().min(1).max(168).default(40),
  minRestHours: z.number().min(0).max(24).default(10),
  maxConsecutiveDays: z.number().int().min(1).max(7).default(6),
  noSplitShifts: z.boolean().default(true),
  requiredPresence: z.array(z.object({
    role: z.string(),
    intervals: z.array(z.object({
      day: DayOfWeekSchema,
      start: TimeSchema,
      end: TimeSchema,
    })),
  })).default([]),
  breakPolicy: z.array(z.object({
    requiredAfterHours: z.number().min(0),
    breakMinutes: z.number().int().min(0),
  })).default([]),
  blackouts: z.array(z.object({
    id: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    reason: z.string(),
  })).default([]),
});

export const SoftRulesSchema = z.object({
  fairnessBalance: z.number().min(0).max(100).default(70),
  respectPreferredDaysOff: z.number().min(0).max(100).default(80),
  respectOpenClosePrefs: z.number().min(0).max(100).default(60),
  keepConsistentShiftTimes: z.number().min(0).max(100).default(50),
  keepConsistentDays: z.number().min(0).max(100).default(50),
  stayUnderBudget: z.number().min(0).max(100).default(70),
  minimizeOverstaff: z.number().min(0).max(100).default(50),
  minimizeUnderstaff: z.number().min(0).max(100).default(90),
  avoidOvertime: z.number().min(0).max(100).default(60),
});

export const BudgetSchema = z.object({
  weeklyLimit: z.number().min(0),
  allowExceedBy: z.number().min(0).max(100).default(10),
});

export const HumanConfigSchema = z.object({
  businessHours: BusinessHoursSchema,
  roles: z.array(z.string()).min(1, 'At least one role required'),
  coverage: RoleCoverageSchema,
  employees: z.array(EmployeeSchema),
  hardRules: HardRulesSchema,
  softRules: SoftRulesSchema,
  budget: BudgetSchema,
});

export type HumanConfigInput = z.infer<typeof HumanConfigSchema>;
