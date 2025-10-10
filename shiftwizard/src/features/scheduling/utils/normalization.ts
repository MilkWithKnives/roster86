/**
 * Normalization utilities to convert human-friendly config to solver-ready format
 */
import { HumanConfig, NormalizedConfig, CoverageInterval } from '../types';

/**
 * Convert slider value (0-100) to weight (0.0-1.5)
 */
export function sliderToWeight(value: number): number {
  return (value / 100) * 1.5;
}

/**
 * Auto-fill missing ideal/max values in coverage intervals
 */
export function normalizeCoverageInterval(interval: CoverageInterval): CoverageInterval {
  const normalized = { ...interval };

  // If ideal is not set or equals 0, default to min
  if (!normalized.ideal || normalized.ideal === 0) {
    normalized.ideal = normalized.min;
  }

  // If max is not set or equals 0, default to ideal + 1
  if (!normalized.max || normalized.max === 0) {
    normalized.max = normalized.ideal + 1;
  }

  // Ensure min <= ideal <= max
  normalized.ideal = Math.max(normalized.min, normalized.ideal);
  normalized.max = Math.max(normalized.ideal, normalized.max);

  return normalized;
}

/**
 * Split cross-midnight intervals into two separate day intervals
 */
export function splitCrossMidnightInterval(
  day: string,
  interval: CoverageInterval
): { day: string; interval: CoverageInterval }[] {
  const [startHour, startMin] = interval.start.split(':').map(Number);
  const [endHour, endMin] = interval.end.split(':').map(Number);

  const startMins = startHour * 60 + startMin;
  const endMins = endHour * 60 + endMin;

  // If end is before start, it crosses midnight
  if (endMins < startMins) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentIndex = days.indexOf(day);
    const nextDay = days[(currentIndex + 1) % 7];

    return [
      {
        day,
        interval: {
          ...interval,
          id: `${interval.id}_p1`,
          end: '23:59',
        },
      },
      {
        day: nextDay,
        interval: {
          ...interval,
          id: `${interval.id}_p2`,
          start: '00:00',
        },
      },
    ];
  }

  return [{ day, interval }];
}

/**
 * Normalize the entire human config
 */
export function normalizeHumanConfig(human: HumanConfig): NormalizedConfig {
  // Convert soft rule sliders to weights
  const softRuleWeights = {
    fairnessBalance: sliderToWeight(human.softRules.fairnessBalance),
    respectPreferredDaysOff: sliderToWeight(human.softRules.respectPreferredDaysOff),
    respectOpenClosePrefs: sliderToWeight(human.softRules.respectOpenClosePrefs),
    keepConsistentShiftTimes: sliderToWeight(human.softRules.keepConsistentShiftTimes),
    keepConsistentDays: sliderToWeight(human.softRules.keepConsistentDays),
    stayUnderBudget: sliderToWeight(human.softRules.stayUnderBudget),
    minimizeOverstaff: sliderToWeight(human.softRules.minimizeOverstaff),
    minimizeUnderstaff: sliderToWeight(human.softRules.minimizeUnderstaff),
    avoidOvertime: sliderToWeight(human.softRules.avoidOvertime),
  };

  // Normalize coverage intervals
  const normalizedCoverage: NormalizedConfig['coverage'] = {};
  for (const role in human.coverage) {
    normalizedCoverage[role] = {};
    for (const day in human.coverage[role]) {
      const intervals = human.coverage[role][day];
      const normalizedIntervals: CoverageInterval[] = [];

      for (const interval of intervals) {
        const normalized = normalizeCoverageInterval(interval);
        const split = splitCrossMidnightInterval(day, normalized);

        // Add all resulting intervals (1 if no split, 2 if split)
        for (const { interval: splitInterval } of split) {
          normalizedIntervals.push(splitInterval);
        }
      }

      normalizedCoverage[role][day] = normalizedIntervals;
    }
  }

  // Fill employee shift length defaults if missing
  const normalizedEmployees = human.employees.map(emp => ({
    ...emp,
    preferredShiftLength: {
      min: emp.preferredShiftLength.min || 4,
      max: emp.preferredShiftLength.max || 8,
    },
  }));

  return {
    ...human,
    coverage: normalizedCoverage,
    employees: normalizedEmployees,
    softRuleWeights,
  };
}

/**
 * Parse time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if time range crosses midnight
 */
export function crossesMidnight(start: string, end: string): boolean {
  return timeToMinutes(end) < timeToMinutes(start);
}
