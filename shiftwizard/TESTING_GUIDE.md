# Roster86 Testing Guide

## 🧪 Testing Strategy

Roster86 uses a comprehensive testing approach with three levels:

1. **Unit Tests** - Test individual functions and components
2. **Integration Tests** - Test API endpoints and data flow
3. **E2E Tests** - Test complete user journeys

## 🚀 Quick Start

### Install Testing Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage

# With UI
npm run test:ui
```

## 📋 Test Structure

```
src/
├── test/
│   ├── setup.ts              # Test setup and mocks
│   └── api.test.ts           # API tests
├── features/
│   └── scheduling/
│       └── __tests__/
│           ├── useSchedulingStore.test.ts
│           ├── BusinessHoursTab.test.tsx
│           └── RolesCoverageTab.test.tsx
└── components/
    └── ui/
        └── __tests__/
            ├── Button.test.tsx
            └── Card.test.tsx

tests/
└── e2e/
    ├── auth.spec.ts          # Authentication flow
    ├── payment.spec.ts       # Payment flow
    ├── scheduling.spec.ts    # Scheduling features
    └── admin.spec.ts         # Admin functions
```

## 🔧 Unit Testing

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Testing Zustand Stores

```typescript
import { useSchedulingStore } from '@/features/scheduling/store/useSchedulingStore'

describe('Scheduling Store', () => {
  beforeEach(() => {
    useSchedulingStore.getState().reset()
  })

  it('should add a role', () => {
    const { addRole } = useSchedulingStore.getState()
    addRole({ name: 'Server', color: '#FF0000' })
    
    const state = useSchedulingStore.getState()
    expect(state.config.roles).toHaveLength(1)
  })
})
```

### Testing API Functions

```typescript
import { createCheckoutSession } from '@/api/payments'

// Mock axios
vi.mock('axios')

describe('Payment API', () => {
  it('should create checkout session', async () => {
    const mockAxios = await import('axios')
    mockAxios.default.create().post.mockResolvedValue({
      data: { sessionId: 'cs_test_123', url: 'https://checkout.stripe.com' }
    })

    const result = await createCheckoutSession('price_123', 'Pro')
    expect(result.sessionId).toBe('cs_test_123')
  })
})
```

## 🌐 E2E Testing

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('user can create a schedule', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'admin@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="login-button"]')

  // Navigate to schedules
  await page.goto('/schedules')
  await page.click('[data-testid="create-schedule"]')

  // Fill schedule form
  await page.fill('[data-testid="schedule-name"]', 'Week 1 Schedule')
  await page.fill('[data-testid="start-date"]', '2024-01-01')
  await page.click('[data-testid="save-schedule"]')

  // Verify schedule was created
  await expect(page.locator('[data-testid="schedule-list"]'))
    .toContainText('Week 1 Schedule')
})
```

### Test Data Attributes

Use consistent `data-testid` attributes:

```jsx
<button data-testid="login-button">Login</button>
<input data-testid="email-input" type="email" />
<div data-testid="error-message">Error occurred</div>
```

## 📊 Coverage Requirements

### Minimum Coverage Targets:
- **Unit Tests**: 80% line coverage
- **Component Tests**: 90% branch coverage
- **API Tests**: 95% endpoint coverage

### Generate Coverage Report:
```bash
npm run test:coverage
```

Open `coverage/index.html` to view detailed coverage report.

## 🐛 Debugging Tests

### Debug Unit Tests
```bash
# Run specific test file
npm test useSchedulingStore.test.ts

# Run with debug output
DEBUG=* npm test

# Run single test
npm test -- --grep "should add a role"
```

### Debug E2E Tests
```bash
# Run with UI
npm run test:e2e:ui

# Run in headed mode
npx playwright test --headed

# Debug specific test
npx playwright test auth.spec.ts --debug
```

## 🔄 CI/CD Integration

### GitHub Actions Example:
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 📝 Best Practices

### 1. Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Keep tests focused and atomic

### 2. Mocking
- Mock external dependencies
- Use realistic mock data
- Reset mocks between tests

### 3. Assertions
- Use specific assertions
- Test both happy path and edge cases
- Verify error handling

### 4. Performance
- Keep unit tests fast (< 100ms each)
- Use `vi.hoisted()` for expensive setup
- Parallelize E2E tests when possible

## 🚨 Common Issues

### 1. Async Testing
```typescript
// ❌ Wrong
test('async operation', () => {
  someAsyncFunction()
  expect(result).toBe(expected) // This runs before async completes
})

// ✅ Correct
test('async operation', async () => {
  const result = await someAsyncFunction()
  expect(result).toBe(expected)
})
```

### 2. Component Testing
```typescript
// ❌ Wrong
test('component renders', () => {
  render(<Component />)
  // Missing assertions
})

// ✅ Correct
test('component renders', () => {
  render(<Component />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### 3. E2E Timing
```typescript
// ❌ Wrong
await page.click('[data-testid="button"]')
await page.click('[data-testid="next-button"]') // Might fail if first click is slow

// ✅ Correct
await page.click('[data-testid="button"]')
await page.waitForSelector('[data-testid="next-button"]')
await page.click('[data-testid="next-button"]')
```

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this guide if needed

For questions or issues with testing, check the GitHub issues or contact the development team.
