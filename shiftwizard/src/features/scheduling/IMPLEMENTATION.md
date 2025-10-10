# Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install zustand zod @radix-ui/react-tabs @radix-ui/react-switch lucide-react
```

### 2. Add to Your App

```tsx
// app/schedule/configure/page.tsx
import { SchedulingConfigurator } from '@/features/scheduling/components/SchedulingConfigurator';

export default function ScheduleConfigPage() {
  const handleSave = async (config) => {
    await fetch('/api/schedule/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  };

  const handleRun = async (config) => {
    const response = await fetch('/api/schedule/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    const result = await response.json();
    // Navigate to results page
    router.push(`/schedule/results/${result.scheduleId}`);
  };

  return (
    <SchedulingConfigurator
      onSave={handleSave}
      onRun={handleRun}
    />
  );
}
```

### 3. Backend Integration

```typescript
// pages/api/schedule/run.ts
import { normalizeHumanConfig } from '@/features/scheduling/utils/normalization';
import { HumanConfigSchema } from '@/features/scheduling/schemas';

export default async function handler(req, res) {
  // Validate
  const validation = HumanConfigSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.errors });
  }

  // Normalize
  const normalized = normalizeHumanConfig(validation.data);

  // Run solver
  const schedule = await runSchedulingSolver(normalized);

  res.json({ scheduleId: schedule.id });
}
```

## Extending Components

### Adding a New Tab

1. Create tab component:

```tsx
// components/tabs/MyNewTab.tsx
import React from 'react';
import { useSchedulingStore } from '../../store/useSchedulingStore';

export function MyNewTab() {
  const { config, updateConfig } = useSchedulingStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>My New Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your UI here */}
      </CardContent>
    </Card>
  );
}
```

2. Add to main configurator:

```tsx
// SchedulingConfigurator.tsx
import { MyNewTab } from './tabs/MyNewTab';

// In TabsList:
<TabsTrigger value="my-feature">My Feature</TabsTrigger>

// In Tabs content:
<TabsContent value="my-feature">
  <MyNewTab />
</TabsContent>
```

### Custom Validation

Add custom validation rules to schemas:

```typescript
// schemas/index.ts
export const CustomRuleSchema = z.object({
  myField: z.string(),
}).refine(
  (data) => myCustomValidation(data.myField),
  { message: 'Custom validation failed', path: ['myField'] }
);
```

### Custom Normalization

Extend normalization for special handling:

```typescript
// utils/normalization.ts
export function normalizeCustomField(value: any): any {
  // Your normalization logic
  return normalized;
}
```

## State Management Patterns

### Reading State

```tsx
function MyComponent() {
  // Get specific values
  const { config, conflicts, costEstimate } = useSchedulingStore();

  // Or subscribe to specific slices
  const activeTab = useSchedulingStore(state => state.activeTab);
}
```

### Updating State

```tsx
function MyComponent() {
  const { setBusinessHours, addRole, updateEmployee } = useSchedulingStore();

  const handleUpdate = () => {
    setBusinessHours('monday', {
      open: '09:00',
      close: '22:00',
      closed: false,
      is24h: false,
    });
  };
}
```

### Custom Actions

Add to store:

```typescript
// store/useSchedulingStore.ts
export const useSchedulingStore = create<SchedulingState>()(
  (set, get) => ({
    // ... existing actions

    myCustomAction: (params) => {
      set((state) => ({
        config: {
          ...state.config,
          // your updates
        },
      }));
      get().recompute(); // Trigger validation
    },
  })
);
```

## Testing

### Unit Tests

```typescript
// __tests__/normalization.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeHumanConfig, sliderToWeight } from '../utils/normalization';

describe('Normalization', () => {
  it('converts slider values to weights', () => {
    expect(sliderToWeight(0)).toBe(0);
    expect(sliderToWeight(50)).toBe(0.75);
    expect(sliderToWeight(100)).toBe(1.5);
  });

  it('fills default ideal/max values', () => {
    const config = {
      // ... minimal config
      coverage: {
        Server: {
          monday: [{
            id: '1',
            start: '11:00',
            end: '14:00',
            min: 3,
            ideal: 0,
            max: 0,
          }],
        },
      },
    };

    const normalized = normalizeHumanConfig(config);
    expect(normalized.coverage.Server.monday[0].ideal).toBe(3);
    expect(normalized.coverage.Server.monday[0].max).toBe(4);
  });
});
```

### Component Tests

```typescript
// __tests__/BusinessHoursTab.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BusinessHoursTab } from '../components/tabs/BusinessHoursTab';

describe('BusinessHoursTab', () => {
  it('renders all days of the week', () => {
    render(<BusinessHoursTab />);
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
  });

  it('allows changing hours', () => {
    render(<BusinessHoursTab />);
    const openInput = screen.getAllByLabelText('Open')[0];
    fireEvent.change(openInput, { target: { value: '10:00' } });
    // Assert state changed
  });
});
```

### E2E Tests

```typescript
// e2e/scheduling-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete scheduling configuration flow', async ({ page }) => {
  await page.goto('/schedule/configure');

  // Set business hours
  await page.click('text=Business Hours');
  await page.fill('[data-testid="monday-open"]', '09:00');
  await page.fill('[data-testid="monday-close"]', '22:00');

  // Add roles
  await page.click('text=Roles & Coverage');
  await page.click('text=Add Role');
  await page.fill('[data-testid="role-name"]', 'Bartender');

  // Verify no conflicts
  await page.click('text=Review & Run');
  await expect(page.locator('text=No errors')).toBeVisible();

  // Run scheduler
  await page.click('text=Run Scheduler');
  await expect(page).toHaveURL(/\/schedule\/results/);
});
```

## Performance Optimization

### Memoization

Use React.memo for expensive components:

```tsx
import { memo } from 'react';

export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Heavy rendering logic
  return <div>{/* ... */}</div>;
});
```

### Selector Optimization

Use specific selectors to avoid re-renders:

```tsx
// ❌ Bad: Re-renders on any state change
const state = useSchedulingStore();

// ✅ Good: Re-renders only when conflicts change
const conflicts = useSchedulingStore(state => state.conflicts);
```

### Debounce Updates

For real-time inputs:

```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdate = useDebouncedCallback((value) => {
  updateCoverageInterval(role, day, id, { min: value });
}, 300);
```

## Deployment Checklist

- [ ] All Zod schemas validate correctly
- [ ] Normalization handles edge cases (midnight crossing, etc.)
- [ ] Conflict detection catches major issues
- [ ] Cost estimation reasonably accurate
- [ ] Export/import works with large configs
- [ ] Mobile responsive (at least for viewing)
- [ ] Accessibility: keyboard navigation, screen reader labels
- [ ] Error boundaries for graceful failures
- [ ] Loading states for async operations
- [ ] Confirm dialogs for destructive actions
- [ ] Undo/redo or confirmation before reset

## Troubleshooting

### "Cannot find module 'zustand'"

```bash
npm install zustand
```

### State not persisting

Check localStorage is enabled and not full:

```typescript
localStorage.getItem('roster86-scheduling-config');
```

### Validation errors not showing

Ensure Zod schemas are imported and applied:

```typescript
const result = HumanConfigSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.errors);
}
```

### Store not updating UI

Verify you're using the hook correctly:

```tsx
// ❌ Wrong: Doesn't subscribe
const store = useSchedulingStore();

// ✅ Correct: Subscribes to changes
const { config } = useSchedulingStore();
```

## Support

- GitHub Issues: https://github.com/roster86/issues
- Docs: https://docs.roster86.com
- Discord: https://discord.gg/roster86
