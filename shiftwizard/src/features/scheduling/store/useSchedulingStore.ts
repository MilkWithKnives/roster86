/**
 * Zustand store for scheduling configuration state
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  HumanConfig,
  ConflictItem,
  CoverageHealth,
  CostEstimate,
  DAYS_OF_WEEK,
} from '../types';
import { findAllConflicts, calculateCoverageHealth, estimateLaborCost } from '../utils/validation';
import { normalizeHumanConfig } from '../utils/normalization';

interface SchedulingState {
  // Configuration
  config: HumanConfig;

  // Computed values
  conflicts: ConflictItem[];
  coverageHealth: CoverageHealth;
  costEstimate: CostEstimate;

  // UI state
  activeTab: string;
  isDirty: boolean;

  // Actions
  setBusinessHours: (day: string, hours: HumanConfig['businessHours'][string]) => void;
  addRole: (role: string) => void;
  removeRole: (role: string) => void;
  addCoverageInterval: (role: string, day: string, interval: any) => void;
  updateCoverageInterval: (role: string, day: string, intervalId: string, updates: any) => void;
  removeCoverageInterval: (role: string, day: string, intervalId: string) => void;
  duplicateDaySchedule: (role: string, fromDay: string, toDays: string[]) => void;
  addEmployee: (employee: any) => void;
  updateEmployee: (id: string, updates: any) => void;
  removeEmployee: (id: string) => void;
  setHardRules: (rules: Partial<HumanConfig['hardRules']>) => void;
  setSoftRules: (rules: Partial<HumanConfig['softRules']>) => void;
  setBudget: (budget: Partial<HumanConfig['budget']>) => void;
  setActiveTab: (tab: string) => void;
  loadPreset: (presetName: string) => void;
  reset: () => void;
  recompute: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

const DEFAULT_CONFIG: HumanConfig = {
  businessHours: DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = {
      open: '09:00',
      close: '22:00',
      closed: false,
      is24h: false,
    };
    return acc;
  }, {} as HumanConfig['businessHours']),
  roles: ['Server', 'Cook', 'Host', 'Manager'],
  coverage: {},
  employees: [],
  hardRules: {
    maxHoursPerDay: 12,
    maxHoursPerWeek: 40,
    minRestHours: 10,
    maxConsecutiveDays: 6,
    noSplitShifts: true,
    requiredPresence: [],
    breakPolicy: [
      { requiredAfterHours: 5, breakMinutes: 30 },
    ],
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

export const useSchedulingStore = create<SchedulingState>()(
  devtools(
    persist(
      (set, get) => ({
        config: DEFAULT_CONFIG,
        conflicts: [],
        coverageHealth: { score: 100, understaffedSlots: 0, overstaffedSlots: 0, totalSlots: 0 },
        costEstimate: { total: 0, byRole: {}, breakdown: { regularHours: 0, overtimeHours: 0, totalHours: 0 } },
        activeTab: 'business-hours',
        isDirty: false,

        setBusinessHours: (day, hours) => {
          set((state) => ({
            config: {
              ...state.config,
              businessHours: {
                ...state.config.businessHours,
                [day]: hours,
              },
            },
            isDirty: true,
          }));
          get().recompute();
        },

        addRole: (role) => {
          set((state) => ({
            config: {
              ...state.config,
              roles: [...state.config.roles, role],
              coverage: {
                ...state.config.coverage,
                [role]: DAYS_OF_WEEK.reduce((acc, day) => {
                  acc[day] = [];
                  return acc;
                }, {} as any),
              },
            },
            isDirty: true,
          }));
          get().recompute();
        },

        removeRole: (role) => {
          set((state) => {
            const newCoverage = { ...state.config.coverage };
            delete newCoverage[role];

            return {
              config: {
                ...state.config,
                roles: state.config.roles.filter(r => r !== role),
                coverage: newCoverage,
              },
              isDirty: true,
            };
          });
          get().recompute();
        },

        addCoverageInterval: (role, day, interval) => {
          set((state) => {
            const roleCoverage = state.config.coverage[role] || {};
            const dayIntervals = roleCoverage[day] || [];

            return {
              config: {
                ...state.config,
                coverage: {
                  ...state.config.coverage,
                  [role]: {
                    ...roleCoverage,
                    [day]: [...dayIntervals, interval],
                  },
                },
              },
              isDirty: true,
            };
          });
          get().recompute();
        },

        updateCoverageInterval: (role, day, intervalId, updates) => {
          set((state) => {
            const roleCoverage = state.config.coverage[role] || {};
            const dayIntervals = roleCoverage[day] || [];

            return {
              config: {
                ...state.config,
                coverage: {
                  ...state.config.coverage,
                  [role]: {
                    ...roleCoverage,
                    [day]: dayIntervals.map(interval =>
                      interval.id === intervalId ? { ...interval, ...updates } : interval
                    ),
                  },
                },
              },
              isDirty: true,
            };
          });
          get().recompute();
        },

        removeCoverageInterval: (role, day, intervalId) => {
          set((state) => {
            const roleCoverage = state.config.coverage[role] || {};
            const dayIntervals = roleCoverage[day] || [];

            return {
              config: {
                ...state.config,
                coverage: {
                  ...state.config.coverage,
                  [role]: {
                    ...roleCoverage,
                    [day]: dayIntervals.filter(interval => interval.id !== intervalId),
                  },
                },
              },
              isDirty: true,
            };
          });
          get().recompute();
        },

        duplicateDaySchedule: (role, fromDay, toDays) => {
          set((state) => {
            const roleCoverage = state.config.coverage[role] || {};
            const sourceIntervals = roleCoverage[fromDay] || [];
            const newRoleCoverage = { ...roleCoverage };

            toDays.forEach(toDay => {
              newRoleCoverage[toDay] = sourceIntervals.map(interval => ({
                ...interval,
                id: `${toDay}_${Date.now()}_${Math.random()}`,
              }));
            });

            return {
              config: {
                ...state.config,
                coverage: {
                  ...state.config.coverage,
                  [role]: newRoleCoverage,
                },
              },
              isDirty: true,
            };
          });
          get().recompute();
        },

        addEmployee: (employee) => {
          set((state) => ({
            config: {
              ...state.config,
              employees: [...state.config.employees, employee],
            },
            isDirty: true,
          }));
          get().recompute();
        },

        updateEmployee: (id, updates) => {
          set((state) => ({
            config: {
              ...state.config,
              employees: state.config.employees.map(emp =>
                emp.id === id ? { ...emp, ...updates } : emp
              ),
            },
            isDirty: true,
          }));
          get().recompute();
        },

        removeEmployee: (id) => {
          set((state) => ({
            config: {
              ...state.config,
              employees: state.config.employees.filter(emp => emp.id !== id),
            },
            isDirty: true,
          }));
          get().recompute();
        },

        setHardRules: (rules) => {
          set((state) => ({
            config: {
              ...state.config,
              hardRules: {
                ...state.config.hardRules,
                ...rules,
              },
            },
            isDirty: true,
          }));
          get().recompute();
        },

        setSoftRules: (rules) => {
          set((state) => ({
            config: {
              ...state.config,
              softRules: {
                ...state.config.softRules,
                ...rules,
              },
            },
            isDirty: true,
          }));
          get().recompute();
        },

        setBudget: (budget) => {
          set((state) => ({
            config: {
              ...state.config,
              budget: {
                ...state.config.budget,
                ...budget,
              },
            },
            isDirty: true,
          }));
          get().recompute();
        },

        setActiveTab: (tab) => {
          set({ activeTab: tab });
        },

        loadPreset: (presetName) => {
          const presets: Record<string, Partial<HumanConfig>> = {
            'lunch-dinner': {
              coverage: {
                Server: DAYS_OF_WEEK.reduce((acc, day) => {
                  acc[day] = [
                    { id: `${day}_lunch`, start: '11:00', end: '14:00', min: 3, ideal: 4, max: 5 },
                    { id: `${day}_dinner`, start: '17:00', end: '21:00', min: 4, ideal: 5, max: 6 },
                  ];
                  return acc;
                }, {} as any),
              },
            },
            'bar-forward': {
              roles: ['Bartender', 'Server', 'Host', 'Manager'],
              coverage: {
                Bartender: DAYS_OF_WEEK.reduce((acc, day) => {
                  acc[day] = [
                    { id: `${day}_bar`, start: '16:00', end: '23:00', min: 2, ideal: 3, max: 4 },
                  ];
                  return acc;
                }, {} as any),
              },
            },
            'weekend-heavy': {
              coverage: {
                Server: {
                  friday: [{ id: 'fri', start: '17:00', end: '23:00', min: 5, ideal: 6, max: 8 }],
                  saturday: [{ id: 'sat', start: '17:00', end: '23:00', min: 6, ideal: 7, max: 9 }],
                  sunday: [{ id: 'sun', start: '11:00', end: '21:00', min: 4, ideal: 5, max: 7 }],
                },
              },
            },
          };

          const preset = presets[presetName];
          if (preset) {
            set((state) => ({
              config: {
                ...state.config,
                ...preset,
              },
              isDirty: true,
            }));
            get().recompute();
          }
        },

        reset: () => {
          set({
            config: DEFAULT_CONFIG,
            isDirty: false,
          });
          get().recompute();
        },

        recompute: () => {
          const state = get();
          const conflicts = findAllConflicts(state.config);
          const coverageHealth = calculateCoverageHealth(state.config);
          const costEstimate = estimateLaborCost(state.config);

          set({
            conflicts,
            coverageHealth,
            costEstimate,
          });
        },

        exportConfig: () => {
          const normalized = normalizeHumanConfig(get().config);
          return JSON.stringify(normalized, null, 2);
        },

        importConfig: (json) => {
          try {
            const config = JSON.parse(json);
            set({
              config,
              isDirty: true,
            });
            get().recompute();
            return true;
          } catch (error) {
            console.error('Failed to import config:', error);
            return false;
          }
        },
      }),
      {
        name: 'roster86-scheduling-config',
      }
    )
  )
);
