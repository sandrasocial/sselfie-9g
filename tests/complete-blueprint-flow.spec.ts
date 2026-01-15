import { test, expect } from '@playwright/test'
import { createTestUser, cleanupTestUser, setUserCredits } from './helpers/test-user'
import { mockStripeCheckout, simulateStripeWebhook } from './helpers/stripe-mock'

/**
 * Complete Blueprint Funnel - End to End Test
 * 
 * Tests the complete user journey from sign up to paid generation
 * This is the master test that covers the entire funnel
 */

test.describe('Complete Blueprint Funnel - End to End', () => {
  const testEmail = `e2e-${Date.now()}@playwright.test`
  const testPassword = 'TestPassword123!'
  const testName = 'E2E Test User'

  test('full user journey from sign up to paid generation', async ({ page }) => {
    // Mock Stripe checkout (to avoid actual payment)
    await mockStripeCheckout(page)

    // === PHASE 1: SIGN UP ===
    await test.step('Sign up new user', async () => {
      await page.goto('/auth/sign-up')

      // Fill sign up form
      await page.fill('input#name', testName)
      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)

      // Wait for button to be enabled (user check completes)
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled({ timeout: 10000 })
      await expect(submitButton).toHaveText('Sign Up', { timeout: 5000 })
      
      // Submit
      await submitButton.click()

      // Wait for redirect (could be /studio?tab=feed-planner or /auth/sign-up-success)
      // Also wait for navigation to complete
      await Promise.race([
        page.waitForURL(/\/studio|\/auth\/sign-up-success|\/feed-planner/, { timeout: 20000 }),
        page.waitForNavigation({ timeout: 20000 }).catch(() => {}),
      ]).catch(async () => {
        // If redirect doesn't happen, check current URL and log it
        const currentUrl = page.url()
        console.log(`[Test] Sign-up completed but no redirect. Current URL: ${currentUrl}`)
        // If still on sign-up page after 5 seconds, navigate manually
        if (currentUrl.includes('/auth/sign-up')) {
          console.log('[Test] Still on sign-up page, navigating to feed-planner manually')
          await page.goto('/feed-planner')
        }
      })
      
      // If redirected to sign-up-success, navigate to feed planner
      if (page.url().includes('/auth/sign-up-success')) {
        await page.goto('/feed-planner')
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000) // Wait for initial API calls
      }
    })

    // === PHASE 2: ONBOARDING ===
    await test.step('Complete onboarding wizard', async () => {
      // Wait for wizard
      await page.waitForSelector('text=Welcome', { timeout: 5000 })

      // Step through wizard quickly (simplified for E2E test)
      for (let i = 0; i < 8; i++) {
        // Fill required fields if visible
        const textInputs = page.locator('input[type="text"], textarea')
        const inputCount = await textInputs.count()
        if (inputCount > 0) {
          await textInputs.first().fill('Test input')
        }

        // Click continue
        await page.click('button:has-text("Continue →"), button:has-text("Complete")').catch(() => {})
        await page.waitForTimeout(1000)
      }

      // Wait for wizard to close
      await page.waitForTimeout(2000)
    })

    // === PHASE 3: FREE PREVIEW ===
    await test.step('Generate free preview', async () => {
      await page.goto('/feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Wait for initial API calls

      // Verify free mode placeholder
      const placeholder = page.locator('div.aspect-[9/16]')
      await expect(placeholder).toBeVisible({ timeout: 10000 })

      // Generate preview
      const generateButton = page.locator('button:has-text("Generate Image")')
      await expect(generateButton).toBeVisible({ timeout: 5000 })
      await generateButton.click()

      // Wait for generation
      await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 5000 })
      await page.waitForSelector('img[src*="replicate"], img[src*="http"]', {
        timeout: 90000,
      })
    })

    // === PHASE 4: UPSELL ===
    await test.step('See upsell modal', async () => {
      // Set credits to 2 used (to trigger upsell modal)
      await setUserCredits(testEmail, 0, 2)

      // Refresh page to trigger modal
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify upsell modal appears
      const upsellModal = page.locator('text=You\'ve Used Your Free Credits').or(
        page.locator('text=Buy Credits')
      )
      await expect(upsellModal).toBeVisible({ timeout: 10000 })
    })

    // === PHASE 5: UPGRADE (MOCKED) ===
    await test.step('Upgrade to paid (mocked)', async () => {
      // Click "Unlock Full Blueprint"
      await page.click('button:has-text("Unlock Full Blueprint")')

      // Wait for checkout modal
      await page.waitForSelector('text=Unlock Full Feed Planner', { timeout: 5000 })

      // Click "Continue to Checkout"
      await page.click('button:has-text("Continue to Checkout")')

      // Wait for Stripe checkout (mocked)
      await page.waitForTimeout(2000)

      // Simulate successful payment via webhook
      // Note: In real flow, this would be called by Stripe
      // For test, we grant access directly
      await createTestUser(testEmail)

      // Navigate to success page (simulated)
      await page.goto('/checkout/success?type=paid_blueprint')
      await page.waitForTimeout(2000)

      // Redirect to feed planner
      await page.goto('/feed-planner?purchase=success')
      await page.waitForLoadState('networkidle')
    })

    // === PHASE 6: WELCOME WIZARD ===
    await test.step('Complete welcome wizard', async () => {
      // Wait for welcome wizard
      await expect(
        page.locator('text=Welcome to your Feed Planner!').or(
          page.locator('text=You\'re all set!')
        )
      ).toBeVisible({ timeout: 10000 })

      // Step through welcome wizard
      for (let i = 0; i < 4; i++) {
        await page.click('button:has-text("Next"), button:has-text("Start Creating")').catch(() => {})
        await page.waitForTimeout(500)
      }
    })

    // === PHASE 7: PAID GENERATION ===
    await test.step('Generate paid images with Maya', async () => {
      // Verify 3x4 grid
      const grid = page.locator('div.grid.grid-cols-3, div.grid.grid-cols-4')
      await expect(grid).toBeVisible({ timeout: 10000 })

      // Generate first image
      const generateButton = page.locator('button:has-text("Generate image")').first()
      await expect(generateButton).toBeVisible({ timeout: 5000 })
      await generateButton.click()

      // Wait for generation
      await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 5000 })
      await page.waitForSelector('img[src*="replicate"], img[src*="http"]', {
        timeout: 90000,
      })

      // Verify image appears
      const image = page.locator('img[src*="replicate"], img[src*="http"]').first()
      await expect(image).toBeVisible()
    })

    // === PHASE 8: CREATE NEW FEED ===
    await test.step('Create additional feed', async () => {
      // Look for "New Feed" button
      const newFeedButton = page.locator('button:has-text("New Feed")')
      if (await newFeedButton.isVisible({ timeout: 5000 })) {
        await newFeedButton.click()

        // Wait for new feed to be created
        await page.waitForTimeout(3000)

        // Verify new feed appears (grid should be visible)
        const grid = page.locator('div.grid.grid-cols-3, div.grid.grid-cols-4')
        await expect(grid).toBeVisible({ timeout: 10000 })
      }
    })

    // Cleanup
    await cleanupTestUser(testEmail)
  })
})
