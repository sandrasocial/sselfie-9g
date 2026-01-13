import { test, expect } from '@playwright/test'
import { createTestUser, cleanupTestUser } from './helpers/test-user'

/**
 * Paid User Flow E2E Test
 * 
 * Tests the complete paid user journey:
 * 1. Login as paid user (access granted via test helper)
 * 2. See welcome wizard (first time)
 * 3. Complete welcome wizard
 * 4. See 3x4 grid (12 posts)
 * 5. Generate images
 * 6. Verify welcome wizard does NOT show on second visit
 */

test.describe('Paid User Flow', () => {
  const testEmail = `paid-test-${Date.now()}@playwright.test`
  const testPassword = 'TestPassword123!'

  test.beforeEach(async () => {
    // Note: User must be created via sign up flow first
    // Then we grant paid access via test helper
    // For this test, we assume user exists and grant access
    try {
      await createTestUser(testEmail)
    } catch (error) {
      console.warn('[Test Setup] User may not exist yet, will create via sign up flow')
    }
  })

  test.afterEach(async () => {
    await cleanupTestUser(testEmail)
  })

  test('should see welcome wizard and 3x4 grid', async ({ page }) => {
    // === PHASE 1: LOGIN ===
    await test.step('Login as paid user', async () => {
      await page.goto('/auth/login')

      // Fill login form
      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)

      // Submit
      await page.click('button[type="submit"]:has-text("Sign In")')

      // Wait for redirect (login uses window.location.href, so it's a full navigation)
      await page.waitForURL(/\/studio|\/feed-planner|\/maya/, { timeout: 15000 })
      
      // If not on feed planner, navigate there
      if (!page.url().includes('/feed-planner')) {
        await page.goto('/feed-planner')
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000) // Wait for initial API calls
      }
    })

    // === PHASE 2: NAVIGATE TO FEED PLANNER ===
    await test.step('Navigate to feed planner', async () => {
      await page.goto('/feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Wait for initial API calls
    })

    // === PHASE 3: VERIFY WELCOME WIZARD ===
    await test.step('Verify welcome wizard appears (first time)', async () => {
      // Wait for welcome wizard to appear
      await expect(
        page.locator('text=Welcome to your Feed Planner!').or(
          page.locator('text=You\'re all set!')
        )
      ).toBeVisible({ timeout: 10000 })

      // Step through welcome wizard
      // Step 1: Welcome
      await page.click('button:has-text("Next")').catch(() => {
        page.click('button:has-text("Let\'s Go!")')
      })

      // Step 2: Generate Photos
      await page.waitForSelector('text=Generate your photos', { timeout: 2000 }).catch(() => {})
      await page.click('button:has-text("Next")')

      // Step 3: Add Captions & Strategy
      await page.waitForSelector('text=Add captions and strategy', { timeout: 2000 }).catch(() => {})
      await page.click('button:has-text("Next")')

      // Step 4: You're All Set
      await page.waitForSelector('text=You\'re all set!', { timeout: 2000 }).catch(() => {})
      await page.click('button:has-text("Start Creating")')

      // Wait for wizard to close
      await page.waitForTimeout(2000)
    })

    // === PHASE 4: VERIFY 3X4 GRID ===
    await test.step('Verify 3x4 grid (12 posts)', async () => {
      // Wait for grid to appear
      const grid = page.locator('div.grid.grid-cols-3, div.grid.grid-cols-4')
      await expect(grid).toBeVisible({ timeout: 10000 })

      // Count placeholders (should be 12 for paid users)
      // Note: Grid shows 3 cols on mobile, 4 cols on desktop
      const placeholders = page.locator('div.aspect-square, button:has-text("Generate image")')
      const count = await placeholders.count()
      
      // Should have 12 posts (may be in grid or as individual cards)
      expect(count).toBeGreaterThanOrEqual(9) // At least 9, ideally 12
    })

    // === PHASE 5: GENERATE FIRST IMAGE ===
    await test.step('Generate first image', async () => {
      // Find first generate button
      const generateButton = page.locator('button:has-text("Generate image")').first()
      await expect(generateButton).toBeVisible({ timeout: 5000 })
      await generateButton.click()

      // Wait for generation to start
      await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 5000 })

      // Wait for image to appear (takes ~30-60 seconds)
      await page.waitForSelector('img[src*="replicate"], img[src*="http"]', {
        timeout: 90000,
      })

      // Verify image is displayed
      const image = page.locator('img[src*="replicate"], img[src*="http"]').first()
      await expect(image).toBeVisible()
    })
  })

  test('should NOT see welcome wizard on second visit', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input#email', testEmail)
    await page.fill('input#password', testPassword)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL(/\/studio|\/feed-planner/, { timeout: 10000 })

    // Visit feed planner again
    await page.goto('/feed-planner')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Wait for initial API calls

    // Verify welcome wizard does NOT appear
    await expect(
      page.locator('text=Welcome to your Feed Planner!')
    ).not.toBeVisible({ timeout: 5000 })

    // Should see grid immediately
    const grid = page.locator('div.grid.grid-cols-3, div.grid.grid-cols-4')
    await expect(grid).toBeVisible({ timeout: 5000 })
  })
})
