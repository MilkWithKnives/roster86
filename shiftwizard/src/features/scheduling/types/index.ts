/**
 * Type definitions for Roster86 scheduling system
 */

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
  crossesMidnight?: boolean;
}

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
    is24h: boolean;
    crossesMidnight?: boolean;
  };
}

export interface CoverageInterval {
  id: string;
  start: string;
  end: string;
  min: number;
  ideal: number;
  max: number;
}

export interface RoleCoverage {
  [role: string]: {
    [day: string]: CoverageInterval[];
  };
}

export interface AvailabilityBlock {
  day: DayOfWeek;
  start: string;
  end: string;
  type: 'hard' | 'soft'; // hard = unavailable, soft = prefer not
}

export interface Employee {
  id: string;
  name: string;
  roles: string[];
  wage: number;
  seniority: number; // 0-10
  preferredHours: {
    min: number;
    target: number;
    max: number;
  };
  preferredShiftLength: {
    min: number;
    max: number;
  };
  availability: AvailabilityBlock[];
  preferences: {
    prefersOpenings: boolean;
    prefersClosings: boolean;
  };
  pairing: {
    preferWith: string[];
    avoidWith: string[];
  };
}

export interface HardRules {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minRestHours: number;
  maxConsecutiveDays: number;
  noSplitShifts: boolean;
  requiredPresence: {
    role: string;
    intervals: { day: DayOfWeek; start: string; end: string }[];
  }[];
  breakPolicy: {
    requiredAfterHours: number;
    breakMinutes: number;
  }[];
  blackouts: {
    id: string;
    start: string; // ISO datetime
    end: string;
    reason: string;
  }[];
}

export interface SoftRules {
  fairnessBalance: number; // 0-100
  respectPreferredDaysOff: number;
  respectOpenClosePrefs: number;
  keepConsistentShiftTimes: number;
  keepConsistentDays: number;
  stayUnderBudget: number;
  minimizeOverstaff: number;
  minimizeUnderstaff: number;
  avoidOvertime: number;
}

export interface Budget {
  weeklyLimit: number;
  allowExceedBy: number; // percentage
}

export interface HumanConfig {
  businessHours: BusinessHours;
  roles: string[];
  coverage: RoleCoverage;
  employees: Employee[];
  hardRules: HardRules;
  softRules: SoftRules;
  budget: Budget;
}

export interface NormalizedConfig extends HumanConfig {
  // Normalized with defaults filled and validated
  softRuleWeights: {
    [key: string]: number; // 0.0 to 1.5
  };
}

export interface ConflictItem {
  id: string;
  severity: 'error' | 'warning';
  category: 'coverage' | 'employee' | 'rules' | 'budget';
  message: string;
  location: string; // tab/section to navigate to
  autoFix?: () => void;
}

export interface CoverageHealth {
  score: number; // 0-100
  understaffedSlots: number;
  overstaffedSlots: number;
  totalSlots: number;
}

export interface CostEstimate {
  total: number;
  byRole: { [role: string]: number };
  breakdown: {
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
  };
}
