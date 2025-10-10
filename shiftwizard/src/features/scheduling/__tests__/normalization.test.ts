/**
 * Tests for normalization utilities
 */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  sliderToWeight,
  normalizeCoverageInterval,
  splitCrossMidnightInterval,
  normalizeHumanConfig,
  timeToMinutes,
  minutesToTime,
  crossesMidnight,
} from '../utils/normalization';
import { HumanConfig } from '../types';

describe('sliderToWeight', () => {
  it('converts 0 to 0.0', () => {
    expect(sliderToWeight(0)).toBe(0);
  });

  it('converts 50 to 0.75', () => {
    expect(sliderToWeight(50)).toBe(0.75);
  });

  it('converts 100 to 1.5', () => {
    expect(sliderToWeight(100)).toBe(1.5);
  });
});

describe('normalizeCoverageInterval', () => {
  it('fills ideal when not provided', () => {
    const interval = {
      id: '1',
      start: '11:00',
      end: '14:00',
      min: 3,
      ideal: 0,
      max: 5,
    };

    const normalized = normalizeCoverageInterval(interval);
    expect(normalized.ideal).toBe(3);
  });

  it('fills max when not provided', () => {
    const interval = {
      id: '1',
      start: '11:00',
      end: '14:00',
      min: 3,
      ideal: 4,
      max: 0,
    };

    const normalized = normalizeCoverageInterval(interval);
    expect(normalized.max).toBe(5);
  });

  it('ensures min <= ideal <= max', () => {
    const interval = {
      id: '1',
      start: '11:00',
      end: '14:00',
      min: 5,
      ideal: 3,
      max: 4,
    };

    const normalized = normalizeCoverageInterval(interval);
    expect(normalized.ideal).toBe(5);
    expect(normalized.max).toBe(5);
  });
});

describe('splitCrossMidnightInterval', () => {
  it('does not split intervals within same day', () => {
    const interval = {
      id: '1',
      start: '11:00',
      end: '14:00',
      min: 3,
      ideal: 4,
      max: 5,
    };

    const result = splitCrossMidnightInterval('monday', interval);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe('monday');
  });

  it('splits intervals crossing midnight', () => {
    const interval = {
      id: '1',
      start: '22:00',
      end: '02:00',
      min: 2,
      ideal: 3,
      max: 4,
    };

    const result = splitCrossMidnightInterval('monday', interval);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe('monday');
    expect(result[0].interval.end).toBe('23:59');
    expect(result[1].day).toBe('tuesday');
    expect(result[1].interval.start).toBe('00:00');
  });
});

describe('timeToMinutes', () => {
  it('converts midnight to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts noon to 720', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('minutesToTime', () => {
  it('converts 0 to midnight', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('converts 720 to noon', () => {
    expect(minutesToTime(720)).toBe('12:00');
  });

  it('converts 1439 to 23:59', () => {
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('crossesMidnight', () => {
  it('returns false for same-day ranges', () => {
    expect(crossesMidnight('09:00', '17:00')).toBe(false);
  });

  it('returns true for ranges crossing midnight', () => {
    expect(crossesMidnight('22:00', '02:00')).toBe(true);
  });
});

describe('normalizeHumanConfig', () => {
  const minimalConfig: HumanConfig = {
    businessHours: {
      monday: {
        open: '09:00',
        close: '17:00',
        closed: false,
        is24h: false,
      },
    },
    roles: ['Server'],
    coverage: {
      Server: {
        monday: [
          {
            id: '1',
            start: '11:00',
            end: '14:00',
            min: 3,
            ideal: 0,
            max: 0,
          },
        ],
      },
    },
    employees: [
      {
        id: '1',
        name: 'Test Employee',
        roles: ['Server'],
        wage: 15,
        seniority: 5,
        preferredHours: { min: 20, target: 30, max: 40 },
        preferredShiftLength: { min: 0, max: 0 },
        availability: [],
        preferences: { prefersOpenings: false, prefersClosings: false },
        pairing: { preferWith: [], avoidWith: [] },
      },
    ],
    hardRules: {
      maxHoursPerDay: 12,
      maxHoursPerWeek: 40,
      minRestHours: 10,
      maxConsecutiveDays: 6,
      noSplitShifts: true,
      requiredPresence: [],
      breakPolicy: [],
      blackouts: [],
    },
    softRules: {
      fairnessBalance: 70,
      respectPreferredDaysOff: 80,
      respectOpenClosePrefs: 60,
      keepConsistentShiftTimes: 50,
      keepConsistentDays: 50,
      stayUnderBudget: 70,
      minimizeOverstaff: 50,
      minimizeUnderstaff: 90,
      avoidOvertime: 60,
    },
    budget: {
      weeklyLimit: 5000,
      allowExceedBy: 10,
    },
  };

  it('converts soft rules to weights', () => {
    const normalized = normalizeHumanConfig(minimalConfig);
    expect(normalized.softRuleWeights.fairnessBalance).toBeCloseTo(1.05);
    expect(normalized.softRuleWeights.minimizeUnderstaff).toBeCloseTo(1.35);
  });

  it('fills coverage interval defaults', () => {
    const normalized = normalizeHumanConfig(minimalConfig);
    const interval = normalized.coverage.Server.monday[0];
    expect(interval.ideal).toBe(3);
    expect(interval.max).toBe(4);
  });

  it('fills employee shift length defaults', () => {
    const normalized = normalizeHumanConfig(minimalConfig);
    const employee = normalized.employees[0];
    expect(employee.preferredShiftLength.min).toBe(4);
    expect(employee.preferredShiftLength.max).toBe(8);
  });
});
