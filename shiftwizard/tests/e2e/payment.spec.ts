import { test, expect } from '@playwright/test'

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display pricing page correctly', async ({ page }) => {
    await page.goto('/purchase')
    
    // Check that all plan cards are visible
    await expect(page.locator('[data-testid="starter-plan"]')).toBeVisible()
    await expect(page.locator('[data-testid="professional-plan"]')).toBeVisible()
    await expect(page.locator('[data-testid="enterprise-plan"]')).toBeVisible()
    
    // Check billing toggle
    await expect(page.locator('[data-testid="billing-toggle"]')).toBeVisible()
    
    // Check feature comparison table
    await expect(page.locator('[data-testid="feature-comparison"]')).toBeVisible()
  })

  test('should allow selecting a plan', async ({ page }) => {
    await page.goto('/purchase')
    
    // Click on Professional plan
    await page.click('[data-testid="professional-plan-button"]')
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    
    // Note: In a real test, you'd mock Stripe to avoid actual payments
    // For now, we'll just check that the button was clicked
  })

  test('should toggle between monthly and yearly billing', async ({ page }) => {
    await page.goto('/purchase')
    
    // Initially monthly
    await expect(page.locator('[data-testid="monthly-pricing"]')).toBeVisible()
    
    // Switch to yearly
    await page.click('[data-testid="billing-toggle"]')
    await expect(page.locator('[data-testid="yearly-pricing"]')).toBeVisible()
    
    // Switch back to monthly
    await page.click('[data-testid="billing-toggle"]')
    await expect(page.locator('[data-testid="monthly-pricing"]')).toBeVisible()
  })

  test('should show current plan status for existing subscribers', async ({ page }) => {
    // Mock user with existing subscription
    await page.route('**/api/payments/subscription-status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasSubscription: true,
          subscription: {
            id: 'sub_123',
            status: 'active',
            plan: 'Professional',
            currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000
          }
        })
      })
    })

    await page.goto('/purchase')
    
    // Should show current plan badge
    await expect(page.locator('[data-testid="current-plan-badge"]')).toBeVisible()
    
    // Current plan button should be disabled
    await expect(page.locator('[data-testid="professional-plan-button"]')).toBeDisabled()
  })
})
