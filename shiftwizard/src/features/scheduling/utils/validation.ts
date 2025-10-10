/**
 * Validation utilities for detecting conflicts and issues
 */
import {
  HumanConfig,
  ConflictItem,
  CoverageHealth,
  CostEstimate,
  CoverageInterval,
  Employee,
} from '../types';
import { timeToMinutes } from './normalization';

/**
 * Check for overlapping coverage intervals
 */
export function findOverlappingIntervals(
  intervals: CoverageInterval[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];

      const aStart = timeToMinutes(a.start);
      const aEnd = timeToMinutes(a.end);
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);

      // Check for overlap
      if ((aStart < bEnd && aEnd > bStart)) {
        conflicts.push({
          id: `overlap_${a.id}_${b.id}`,
          severity: 'error',
          category: 'coverage',
          message: `Coverage intervals overlap: ${a.start}-${a.end} and ${b.start}-${b.end}`,
          location: 'roles-coverage',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if coverage intervals fit within business hours
 */
export function validateCoverageWithinBusinessHours(
  config: HumanConfig
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  for (const role in config.coverage) {
    for (const day in config.coverage[role]) {
      const intervals = config.coverage[role][day];
      const businessHours = config.businessHours[day];

      if (!businessHours || businessHours.closed) continue;

      const openMins = timeToMinutes(businessHours.open);
      const closeMins = timeToMinutes(businessHours.close);

      for (const interval of intervals) {
        const startMins = timeToMinutes(interval.start);
        const endMins = timeToMinutes(interval.end);

        // Simple check (doesn't handle midnight crossing perfectly)
        if (!businessHours.crossesMidnight) {
          if (startMins < openMins || endMins > closeMins) {
            conflicts.push({
              id: `outside_hours_${role}_${day}_${interval.id}`,
              severity: 'error',
              category: 'coverage',
              message: `${role} coverage ${interval.start}-${interval.end} on ${day} falls outside business hours (${businessHours.open}-${businessHours.close})`,
              location: 'roles-coverage',
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Calculate coverage health score
 */
export function calculateCoverageHealth(config: HumanConfig): CoverageHealth {
  let totalSlots = 0;
  let understaffedSlots = 0;
  let overstaffedSlots = 0;

  // Count qualified employees per role
  const roleEmployeeCounts: Record<string, number> = {};
  for (const emp of config.employees) {
    for (const role of emp.roles) {
      roleEmployeeCounts[role] = (roleEmployeeCounts[role] || 0) + 1;
    }
  }

  // Check each coverage slot
  for (const role in config.coverage) {
    const qualifiedCount = roleEmployeeCounts[role] || 0;

    for (const day in config.coverage[role]) {
      const intervals = config.coverage[role][day];

      for (const interval of intervals) {
        totalSlots++;

        // Rough estimate: if min > (qualified employees / 2), might be understaffed
        if (interval.min > qualifiedCount / 2) {
          understaffedSlots++;
        }

        // If max is very high compared to qualified, might be overstaffed goal
        if (interval.max > qualifiedCount) {
          overstaffedSlots++;
        }
      }
    }
  }

  // Calculate score (0-100)
  const healthPenalty = (understaffedSlots * 10 + overstaffedSlots * 5);
  const score = Math.max(0, Math.min(100, 100 - healthPenalty));

  return {
    score,
    understaffedSlots,
    overstaffedSlots,
    totalSlots,
  };
}

/**
 * Estimate labor cost
 */
export function estimateLaborCost(config: HumanConfig): CostEstimate {
  let totalCost = 0;
  const byRole: Record<string, number> = {};
  let totalHours = 0;

  // Estimate based on minimum coverage requirements
  for (const role in config.coverage) {
    let roleHours = 0;

    for (const day in config.coverage[role]) {
      const intervals = config.coverage[role][day];

      for (const interval of intervals) {
        const startMins = timeToMinutes(interval.start);
        const endMins = timeToMinutes(interval.end);
        let durationHours = (endMins - startMins) / 60;

        if (durationHours < 0) durationHours += 24; // Handle midnight crossing

        roleHours += durationHours * interval.min;
      }
    }

    // Find median wage for this role
    const roleEmployees = config.employees.filter(emp => emp.roles.includes(role));
    const medianWage = roleEmployees.length > 0
      ? roleEmployees.reduce((sum, emp) => sum + emp.wage, 0) / roleEmployees.length
      : 15; // Default fallback

    const roleCost = roleHours * medianWage;
    byRole[role] = roleCost;
    totalCost += roleCost;
    totalHours += roleHours;
  }

  return {
    total: totalCost,
    byRole,
    breakdown: {
      regularHours: totalHours,
      overtimeHours: 0, // Can't estimate without schedule
      totalHours,
    },
  };
}

/**
 * Find all conflicts in configuration
 */
export function findAllConflicts(config: HumanConfig): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  // Check for overlapping coverage intervals
  for (const role in config.coverage) {
    for (const day in config.coverage[role]) {
      const intervals = config.coverage[role][day];
      conflicts.push(...findOverlappingIntervals(intervals));
    }
  }

  // Check coverage vs business hours
  conflicts.push(...validateCoverageWithinBusinessHours(config));

  // Check for employees with no roles
  config.employees.forEach(emp => {
    if (emp.roles.length === 0) {
      conflicts.push({
        id: `no_roles_${emp.id}`,
        severity: 'error',
        category: 'employee',
        message: `${emp.name} has no assigned roles`,
        location: 'employees',
      });
    }
  });

  // Check for impossible hour preferences
  config.employees.forEach(emp => {
    if (emp.preferredHours.min > emp.preferredHours.max) {
      conflicts.push({
        id: `invalid_hours_${emp.id}`,
        severity: 'error',
        category: 'employee',
        message: `${emp.name}: minimum hours (${emp.preferredHours.min}) exceeds maximum (${emp.preferredHours.max})`,
        location: 'employees',
      });
    }
  });

  // Budget feasibility check
  const costEstimate = estimateLaborCost(config);
  if (config.budget.weeklyLimit > 0 && costEstimate.total > config.budget.weeklyLimit * 1.5) {
    conflicts.push({
      id: 'budget_impossible',
      severity: 'warning',
      category: 'budget',
      message: `Minimum labor cost ($${costEstimate.total.toFixed(0)}) significantly exceeds budget ($${config.budget.weeklyLimit})`,
      location: 'budget',
    });
  }

  return conflicts;
}
