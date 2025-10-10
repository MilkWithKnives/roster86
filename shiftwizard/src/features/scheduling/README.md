# Roster86 Scheduling Configuration System

## Overview

Production-ready restaurant auto-scheduling parameter configuration UI with:
- **Zero-config defaults** with power-user expandability
- **Live validation** with friendly microcopy
- **What-If simulator** for previewing schedule feasibility
- **Conflict detection** with auto-resolution suggestions

## Architecture

```
src/features/scheduling/
├── types/          # TypeScript interfaces
├── schemas/        # Zod validation schemas
├── store/          # Zustand state management
├── utils/          # Normalization & validation utilities
├── components/     # React components
│   ├── SchedulingConfigurator.tsx    # Main tabbed interface
│   ├── tabs/                          # Tab components
│   │   ├── BusinessHoursTab.tsx
│   │   ├── RolesCoverageTab.tsx
│   │   ├── EmployeesTab.tsx
│   │   ├── RulesTab.tsx
│   │   ├── BudgetTab.tsx
│   │   └── ReviewSimulateTab.tsx
│   ├── shared/                        # Reusable components
│   │   ├── TimeRangePicker.tsx
│   │   ├── WeeklyGrid.tsx
│   │   ├── CoverageTimeline.tsx
│   │   ├── ConflictBadge.tsx
│   │   └── SummaryBar.tsx
│   └── presets/                       # Quick setup presets
└── README.md
```

## State Management

Uses Zustand with:
- **Persistence**: Configs saved to localStorage
- **Devtools**: Redux DevTools integration for debugging
- **Computed values**: Conflicts, coverage health, cost estimates auto-recompute

## Validation Flow

1. **Input** → Human-friendly config
2. **Validate** → Zod schemas catch errors immediately
3. **Normalize** → Convert to solver-ready format
4. **Simulate** → Preview conflicts and feasibility

## Key Features

### 1. Business Hours Tab
- Visual weekly grid with drag handles
- 24h and closed day toggles
- Cross-midnight handling

### 2. Roles & Coverage Tab
- Timeline editor for min/ideal/max coverage per role/day
- Smart defaults (ideal = min, max = ideal + 1)
- Duplicate to weekdays/weekends
- Overlap detection

### 3. Employees Tab
- Quick-add with role multi-select
- Visual availability grid (paintable blocks)
- Pairing preferences (prefer/avoid coworkers)
- Auto-estimate target hours

### 4. Rules Tab
**Hard Rules** (must satisfy):
- Max hours per day/week
- Min rest between shifts
- Required manager-on-duty
- Break policies

**Soft Rules** (preferences, 0-100 sliders → 0.0-1.5 weights):
- Fairness balance
- Respect preferences
- Budget adherence
- Minimize over/understaff

### 5. Budget Tab
- Weekly labor budget input
- Live cost estimate
- Allow budget overrun by X%

### 6. Review & Simulate Tab
- Read-only config summary
- Conflict list with jump-to links
- Feasibility score (green/amber/red)
- **What-If Simulator**:
  - Add/remove coverage
  - Adjust rules
  - See immediate impact on cost & feasibility

## Usage

```tsx
import { SchedulingConfigurator } from '@/features/scheduling/components/SchedulingConfigurator';

function SchedulePage() {
  return (
    <div className="container mx-auto">
      <SchedulingConfigurator
        onSave={(config) => saveToAPI(config)}
        onRun={(config) => runSolver(config)}
      />
    </div>
  );
}
```

## Data Flow

```
User Input → Zustand Store → Validation → Normalization → Solver API
     ↓                           ↓            ↓
  UI State ←── Conflicts ←── Computed Values
```

## Presets

### Quick Setup (Lunch/Dinner)
- Server coverage: 11a-2p (3-5), 5p-9p (4-6)
- Standard business hours: 9a-10p

### Bar-Forward
- Heavy bartender coverage evenings
- Reduced daytime needs

### Weekend Heavy
- Increased Friday-Sunday coverage
- Lighter weekday staffing

## Normalization

Human config → Solver format:
1. **Slider values** (0-100) → weights (0.0-1.5)
2. **Empty ideal** → defaults to min
3. **Empty max** → defaults to ideal + 1
4. **Cross-midnight** → split into two days
5. **Defaults filled**: minRest=10, preferredShiftLength=4-8

## Testing

```bash
npm run test:scheduling  # Unit tests
npm run test:e2e         # Playwright E2E tests
```

## API

### Store Methods

```typescript
const store = useSchedulingStore();

// Configuration
store.setBusinessHours(day, hours);
store.addRole(role);
store.addCoverageInterval(role, day, interval);
store.addEmployee(employee);

// Rules
store.setHardRules({ maxHoursPerWeek: 40 });
store.setSoftRules({ fairnessBalance: 80 });
store.setBudget({ weeklyLimit: 5000 });

// Presets
store.loadPreset('lunch-dinner');

// Export/Import
const json = store.exportConfig();
store.importConfig(json);
```

### Computed Values

```typescript
const {
  conflicts,      // ConflictItem[]
  coverageHealth, // { score, understaffed, overstaffed }
  costEstimate,   // { total, byRole, breakdown }
} = useSchedulingStore();
```

## Microcopy Examples

✅ **Good**:
- "Min can't exceed ideal. We've adjusted ideal to match."
- "This coverage (11a-2p) falls outside business hours (12p-9p). Adjust business hours or shift this coverage."
- "Budget is tight! Minimum labor ($4,200) leaves only 10% margin under your $4,500 budget."

❌ **Bad**:
- "Invalid constraint: min > ideal"
- "Coverage outside operational window"
- "Budget constraint violated"

## Future Enhancements

- [ ] Template library (save custom presets)
- [ ] Multi-location support
- [ ] Schedule comparison mode
- [ ] Labor law compliance checks (CA, NY, etc.)
- [ ] Mobile-responsive drag & drop
- [ ] Undo/redo history
- [ ] Collaborative editing

## Support

For issues or questions:
- GitHub Issues: https://github.com/roster86/issues
- Docs: https://docs.roster86.com
