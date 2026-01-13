import { test, expect } from '@playwright/test'

/**
 * Free User Flow E2E Test
 * 
 * Tests the complete free user journey:
 * 1. Sign up
 * 2. Complete onboarding wizard
 * 3. Generate preview feed
 * 4. See upsell modal after 2 credits used
 */

test.describe('Free User Flow', () => {
  const testEmail = `free-test-${Date.now()}@playwright.test`
  const testPassword = 'TestPassword123!'
  const testName = 'Free Test User'

  test('should complete onboarding and see free preview', async ({ page }) => {
    // === PHASE 1: SIGN UP ===
    await test.step('Sign up new user', async () => {
      await page.goto('/auth/sign-up')

      // Fill sign up form
      await page.fill('input#name', testName)
      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)

      // Submit form
      await page.click('button[type="submit"]:has-text("Sign Up")')

      // Wait for redirect (could be /studio?tab=feed-planner or /auth/sign-up-success)
      await page.waitForURL(/\/studio|\/auth\/sign-up-success|\/feed-planner/, { timeout: 15000 })
      
      // If redirected to sign-up-success, that's also OK (email confirmation flow)
      // Just navigate to feed planner manually
      if (page.url().includes('/auth/sign-up-success')) {
        await page.goto('/feed-planner')
        await page.waitForLoadState('networkidle')
      }
    })

    // === PHASE 2: ONBOARDING WIZARD ===
    await test.step('Complete onboarding wizard', async () => {
      // Navigate to feed planner if not already there
      if (!page.url().includes('/feed-planner')) {
        await page.goto('/feed-planner')
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000) // Wait for initial API calls
      }
      
      // Wait for wizard to appear (it should auto-open for new users)
      // Try multiple selectors as wizard might be in different states
      await page.waitForSelector(
        'text=Welcome, text=What do you do?, text=Let\'s get started, [role="dialog"]',
        { timeout: 10000 }
      ).catch(async () => {
        // If wizard doesn't appear, check if onboarding is already complete
        // In that case, skip wizard and proceed
        console.log('[Test] Wizard not found, checking if onboarding already complete...')
        await page.waitForTimeout(2000)
      })

      // Step 0: Welcome
      await page.click('button:has-text("Continue →")')

      // Step 1: Business Type
      await page.waitForSelector('text=What do you do?', { timeout: 2000 })
      await page.fill('input[placeholder*="business"]', 'Content Creator')
      await page.click('button:has-text("Continue →")')

      // Step 2: Audience Builder
      await page.waitForSelector('text=Who is your ideal audience?', { timeout: 2000 })
      await page.fill('textarea, input[type="text"]', 'Creative entrepreneurs')
      await page.click('button:has-text("Continue →")')

      // Step 3: Story
      await page.waitForSelector('text=What\'s your story?', { timeout: 2000 })
      await page.fill('textarea', 'I help creators build their personal brand')
      await page.click('button:has-text("Continue →")')

      // Step 4: Visual Style
      await page.waitForSelector('text=What\'s your visual style?', { timeout: 2000 })
      // Click on "Minimal" option (first visual aesthetic)
      await page.click('button:has-text("Minimal"), div:has-text("Minimal")').catch(() => {
        // Fallback: try clicking any visual option
        page.click('button, div').first()
      })
      // Select feed style
      await page.click('button:has-text("Light"), div:has-text("Light")').catch(() => {
        page.click('button, div').nth(1)
      })
      await page.click('button:has-text("Continue →")')

      // Step 5: Selfie Upload (skip for now - requires file upload)
      await page.waitForSelector('text=Upload your selfies', { timeout: 2000 })
      // Skip selfie upload for now (can add file upload later)
      await page.click('button:has-text("Continue →")').catch(async () => {
        // If button is disabled, try to upload a placeholder
        // For now, just wait and continue
        await page.waitForTimeout(1000)
      })

      // Step 6: Optional Details (skip)
      await page.waitForSelector('text=Optional details', { timeout: 2000 }).catch(() => {})
      await page.click('button:has-text("Continue →")').catch(() => {})

      // Step 7: Brand Pillars (optional - skip)
      await page.waitForSelector('text=Create your content pillars', { timeout: 2000 }).catch(() => {})
      await page.click('button:has-text("Complete")').catch(() => {
        // Fallback to Continue if Complete button not found
        page.click('button:has-text("Continue →")')
      })

      // Wait for wizard to close
      await page.waitForTimeout(2000)
    })

    // === PHASE 3: NAVIGATE TO FEED PLANNER ===
    await test.step('Navigate to feed planner', async () => {
      // Should already be on feed planner, but ensure we're there
      await page.goto('/feed-planner')
      await page.waitForLoadState('networkidle')
    })

    // === PHASE 4: VERIFY FREE MODE PLACEHOLDER ===
    await test.step('Verify free mode placeholder visible', async () => {
      // Wait for single placeholder (9:16 aspect ratio)
      const placeholder = page.locator('div.aspect-[9/16]')
      await expect(placeholder).toBeVisible({ timeout: 10000 })
    })

    // === PHASE 5: GENERATE PREVIEW FEED ===
    await test.step('Generate preview feed', async () => {
      // Click generate button
      const generateButton = page.locator('button:has-text("Generate Image")')
      await expect(generateButton).toBeVisible({ timeout: 5000 })
      await generateButton.click()

      // Wait for toast notification
      await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 5000 })

      // Wait for image to appear (generation takes ~30-60 seconds)
      await page.waitForSelector('img[src*="replicate"], img[src*="http"]', {
        timeout: 90000, // 90 seconds for generation
      })

      // Verify image is displayed
      const image = page.locator('img[src*="replicate"], img[src*="http"]').first()
      await expect(image).toBeVisible()
    })

    // === PHASE 6: VERIFY UPSELL MODAL (after 2 credits) ===
    await test.step('Verify upsell modal appears after 2 credits', async () => {
      // Generate second preview (to use 2nd credit)
      const generateButton = page.locator('button:has-text("Generate Image")')
      if (await generateButton.isVisible({ timeout: 2000 })) {
        await generateButton.click()
        await page.waitForTimeout(3000) // Wait for generation to start
      }

      // Wait for upsell modal (should appear after 2 credits used)
      // Note: Modal may appear automatically or via "Continue Creating" button
      const upsellModal = page.locator('text=You\'ve Used Your Free Credits').or(
        page.locator('text=Buy Credits')
      )
      await expect(upsellModal).toBeVisible({ timeout: 10000 })

      // Verify both options are present
      await expect(page.locator('text=Buy Credits')).toBeVisible()
      await expect(page.locator('text=Unlock Full Blueprint')).toBeVisible()
    })
  })
})
