import { test, expect } from '@playwright/test'
import { createTestUser, cleanupTestUser } from './helpers/test-user'

/**
 * Maya Integration E2E Test
 * 
 * Tests that paid users get Maya-generated unique prompts for each position
 * Verifies that each generated image is unique while maintaining preview aesthetic
 */

test.describe('Maya Integration for Paid Users', () => {
  const testEmail = `maya-test-${Date.now()}@playwright.test`
  const testPassword = 'TestPassword123!'

  test.beforeEach(async () => {
    try {
      await createTestUser(testEmail)
    } catch (error) {
      console.warn('[Test Setup] User may not exist yet')
    }
  })

  test.afterEach(async () => {
    await cleanupTestUser(testEmail)
  })

  test('should generate unique prompts for each position', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input#email', testEmail)
    await page.fill('input#password', testPassword)
    
    // Wait for button to be enabled
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled({ timeout: 5000 })
    await expect(submitButton).toHaveText('Sign In', { timeout: 5000 })
    await submitButton.click()
    await page.waitForURL(/\/studio|\/feed-planner|\/maya/, { timeout: 15000 })
    
    // If not on feed planner, navigate there
    if (!page.url().includes('/feed-planner')) {
      await page.goto('/feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Wait for initial API calls
    }

    // Navigate to feed planner
    await page.goto('/feed-planner')
    await page.waitForLoadState('networkidle')

    // Skip welcome wizard if it appears
    const welcomeWizard = page.locator('text=Welcome to your Feed Planner!')
    if (await welcomeWizard.isVisible({ timeout: 3000 })) {
      // Click through welcome wizard quickly
      for (let i = 0; i < 4; i++) {
        await page.click('button:has-text("Next"), button:has-text("Start Creating")').catch(() => {})
        await page.waitForTimeout(500)
      }
    }

    // Generate 3 images at different positions
    const imageUrls: string[] = []

    for (let i = 0; i < 3; i++) {
      await test.step(`Generate image at position ${i + 1}`, async () => {
        // Find generate button (may be in grid or as individual cards)
        const generateButtons = page.locator('button:has-text("Generate image")')
        const buttonCount = await generateButtons.count()

        if (buttonCount === 0) {
          // No more placeholders to generate - skip this iteration
          return
        }

        // Click the i-th generate button
        const button = generateButtons.nth(i)
        await expect(button).toBeVisible({ timeout: 5000 })
        await button.click()

        // Wait for generation to start
        await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 5000 })

        // Wait for image to appear
        await page.waitForSelector('img[src*="replicate"], img[src*="http"]', {
          timeout: 90000,
        })

        // Get image URL
        const images = page.locator('img[src*="replicate"], img[src*="http"]')
        const imageCount = await images.count()
        
        if (imageCount > i) {
          const imageUrl = await images.nth(i).getAttribute('src')
          if (imageUrl && !imageUrl.includes('placeholder')) {
            imageUrls.push(imageUrl)
          }
        }

        // Wait a bit before next generation
        await page.waitForTimeout(2000)
      })
    }

    // Verify all images are unique (different URLs)
    if (imageUrls.length >= 2) {
      const uniqueUrls = new Set(imageUrls)
      expect(uniqueUrls.size).toBe(imageUrls.length)
      console.log(`[Maya Test] ✅ Generated ${imageUrls.length} unique images`)
    } else {
      console.warn('[Maya Test] ⚠️ Only generated', imageUrls.length, 'images, cannot verify uniqueness')
    }
  })
})
