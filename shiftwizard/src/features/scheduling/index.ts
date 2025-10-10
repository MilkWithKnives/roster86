/**
 * Roster86 Scheduling Configuration System
 * Production-ready exports
 */

// Main component
export { SchedulingConfigurator } from './components/SchedulingConfigurator';

// Store
export { useSchedulingStore } from './store/useSchedulingStore';

// Types
export type {
  HumanConfig,
  NormalizedConfig,
  BusinessHours,
  CoverageInterval,
  Employee,
  HardRules,
  SoftRules,
  Budget,
  ConflictItem,
  CoverageHealth,
  CostEstimate,
  DayOfWeek,
} from './types';

// Schemas
export {
  HumanConfigSchema,
  BusinessHoursSchema,
  EmployeeSchema,
  HardRulesSchema,
  SoftRulesSchema,
  BudgetSchema,
} from './schemas';

// Utilities
export {
  normalizeHumanConfig,
  sliderToWeight,
  normalizeCoverageInterval,
  splitCrossMidnightInterval,
  timeToMinutes,
  minutesToTime,
  crossesMidnight,
} from './utils/normalization';

export {
  findAllConflicts,
  calculateCoverageHealth,
  estimateLaborCost,
  findOverlappingIntervals,
  validateCoverageWithinBusinessHours,
} from './utils/validation';

// Tab components (for custom layouts)
export { BusinessHoursTab } from './components/tabs/BusinessHoursTab';
export { RolesCoverageTab } from './components/tabs/RolesCoverageTab';
export { EmployeesTab } from './components/tabs/EmployeesTab';
export { RulesTab } from './components/tabs/RulesTab';
export { BudgetTab } from './components/tabs/BudgetTab';
export { ReviewSimulateTab } from './components/tabs/ReviewSimulateTab';

// Shared components
export { SummaryBar } from './components/shared/SummaryBar';
