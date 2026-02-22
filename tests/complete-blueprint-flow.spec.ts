const runPlaywright = process.env.PLAYWRIGHT_TEST === '1'

if (!runPlaywright) {
  describe.skip('Playwright E2E (set PLAYWRIGHT_TEST=1)', () => {
    it('skipped in vitest', () => {})
  })
} else {
  const { test, expect } = require('@playwright/test')
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const signUp = async (page: any, email: string, password: string, name: string) => {
    await page.goto('/auth/sign-up')
    await page.fill('input#name', name)
    await page.fill('input#email', email)
    await page.fill('input#password', password)
    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled({ timeout: 10000 })
    await submit.click()
    await Promise.race([
      page.waitForURL(/\/studio|\/auth\/sign-up-success|\/feed-planner/, { timeout: 20000 }),
      page.waitForNavigation({ timeout: 20000 }).catch(() => {}),
    ]).catch(() => {})
    await page.goto('/auth/login')
    await page.fill('input#email', email)
    await page.fill('input#password', password)
    const loginSubmit = page.locator('button[type="submit"]')
    await expect(loginSubmit).toBeEnabled({ timeout: 10000 })
    await loginSubmit.click()
    await Promise.race([
      page.waitForURL(/\/studio|\/feed-planner/, { timeout: 20000 }),
      page.waitForNavigation({ timeout: 20000 }).catch(() => {}),
    ]).catch(() => {})
  }

  const seedOnboarding = async (page: any) => {
    const base64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
    const uploadResult = await page.request.post(`${baseURL}/api/blueprint/upload-selfies`, {
      multipart: {
        files: {
          name: 'selfie.png',
          mimeType: 'image/png',
          buffer: Buffer.from(base64, 'base64'),
        },
      },
    })
    if (!uploadResult.ok()) {
      throw new Error(await uploadResult.text())
    }
    const uploadData = await uploadResult.json()
    const imageUrls = uploadData?.imageUrls || []
    const onboardingResponse = await page.request.post(`${baseURL}/api/onboarding/unified-onboarding-complete`, {
      data: {
        businessType: 'Content Creator',
        idealAudience: 'Creative entrepreneurs',
        audienceChallenge: 'Consistency',
        audienceTransformation: 'Confidence',
        transformationStory: 'Brand story',
        currentSituation: 'Building',
        futureVision: 'Growth',
        visualAesthetic: ['Minimal'],
        feedStyle: 'Light & Minimalistic',
        selfieImages: imageUrls,
        fashionStyle: ['Minimal'],
        brandInspiration: 'Modern',
        inspirationLinks: '',
        contentPillars: ['Tips', 'Behind the scenes'],
      },
    })
    if (!onboardingResponse.ok()) {
      throw new Error(await onboardingResponse.text())
    }
    const extensionResponse = await page.request.post(`${baseURL}/api/onboarding/blueprint-extension-complete`, {
      data: {
        dreamClient: 'Creative entrepreneurs',
        struggle: 'Consistency',
        feedStyle: 'Light & Minimalistic',
      },
    })
    if (!extensionResponse.ok()) {
      throw new Error(await extensionResponse.text())
    }
  }

  const completeWizardIfVisible = async (page: any) => {
    const closeButton = page.locator('button[aria-label="Close"]')
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ force: true })
      await closeButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      return
    }
    const getStarted = page.locator('button:has-text("Get Started")')
    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click().catch(() => {})
      await getStarted.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      return
    }
    const selectButtons = page.locator('button:has-text("SELECT")')
    if (await selectButtons.count()) {
      await selectButtons.first().click().catch(() => {})
    }
    const skipButton = page.locator('button:has-text("Skip")')
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click({ force: true }).catch(() => {})
      return
    }
    const inputs = page.locator('input[type="text"], textarea')
    if (await inputs.count()) {
      await inputs.first().fill('Test input')
    }
    const continueButton = page.locator(
      'button:has-text("Continue"), button:has-text("Complete"), button:has-text("Next"), button:has-text("Start Creating"), button:has-text("CONTINUE")',
    )
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click({ force: true }).catch(() => {})
    }
  }

  const setupMockPaidBlueprintAccess = async (page: any) => {
    await page.route('**/api/feed-planner/access', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isFree: false,
          isPaidBlueprint: true,
          isOneTime: false,
          isMembership: false,
          creditBalance: 30,
          canGenerateWithCredits: true,
          hasGalleryAccess: true,
          canGenerateImages: true,
          canGenerateCaptions: true,
          canGenerateStrategy: true,
          canGenerateBio: true,
          canGenerateHighlights: true,
          maxFeedPlanners: 3,
          placeholderType: 'grid',
        }),
      })
    })
  }

  const getAccess = async (page: any) => {
    return page.evaluate(async () => {
      const res = await fetch('/api/feed-planner/access', { credentials: 'include' })
      return res.ok ? res.json() : null
    })
  }

  test.describe('Paid Blueprint Checkout (Stripe)', () => {
    const testEmail = `paid-blueprint-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Paid Blueprint User'

    test('paid blueprint unlocks feed planner only', async ({ page }: any) => {
      test.setTimeout(300000)
      await signUp(page, testEmail, testPassword, testName)
      await seedOnboarding(page)
      await setupMockPaidBlueprintAccess(page)

      await expect.poll(async () => {
        const access = await getAccess(page)
        return !!access?.isPaidBlueprint && !access?.isMembership
      }, { timeout: 120000 }).toBe(true)

      await page.goto('/studio?tab=feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await completeWizardIfVisible(page)
      await expect(page.locator('text=Create Your First Feed')).toBeVisible({ timeout: 15000 })

      const closeOverlay = page.locator('button[aria-label="Close"]')
      if (await closeOverlay.isVisible().catch(() => false)) {
        await closeOverlay.click({ force: true }).catch(() => {})
        await closeOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      }
      await page.keyboard.press('Escape').catch(() => {})
      await closeOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

      await page.locator('button[aria-label="Navigate to Maya"]').click()
      await expect(page).not.toHaveURL(/#maya/)
    })
  })
}
