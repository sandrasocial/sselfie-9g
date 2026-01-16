const runPlaywright = process.env.PLAYWRIGHT_TEST === '1'

if (!runPlaywright) {
  describe.skip('Playwright E2E (set PLAYWRIGHT_TEST=1)', () => {
    it('skipped in vitest', () => {})
  })
} else {
  const { test, expect } = require('@playwright/test')

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const getCredits = async (page: any) => {
    const menuButton = page.locator('button[aria-label="Menu"]')
    await expect(menuButton).toBeVisible({ timeout: 10000 })
    await menuButton.click()
    const menu = page.locator('[role="menu"]')
    await expect(menu).toBeVisible({ timeout: 5000 })
    const text = await menu.innerText()
    await page.keyboard.press('Escape')
    const match = text.match(/Your Credits\s+([0-9.]+)/i)
    return match ? Number(match[1]) : 0
  }

  const seedOnboarding = async (page: any) => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
    const uploadResult = await page.evaluate(async (url) => {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'selfie.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('files', file)
      const upload = await fetch('/api/blueprint/upload-selfies', { method: 'POST', body: formData, credentials: 'include' })
      if (!upload.ok) {
        throw new Error(await upload.text())
      }
      return upload.json()
    }, dataUrl)
    const imageUrls = uploadResult?.imageUrls || []
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
    if (page.url().includes('/auth/sign-up-success')) {
      await seedOnboarding(page)
      await page.goto('/feed-planner')
    }
  }

  const generatePreview = async (page: any, expectedCredits: number) => {
    const button = page.locator('button:has-text("Generate Image"), button:has-text("Generate image")')
    await expect(button).toBeVisible({ timeout: 10000 })
    await button.click()
    await expect(page.locator('text=Generating photo')).toBeVisible({ timeout: 8000 })
    await expect.poll(() => getCredits(page), { timeout: 60000 }).toBe(expectedCredits)
  }

  test.describe('Free User Flow', () => {
    const testEmail = `free-test-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Free Test User'

    test('free signup + preview credits', async ({ page }: any) => {
      test.setTimeout(240000)
      await signUp(page, testEmail, testPassword, testName)
      await page.goto('/feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      await expect.poll(() => getCredits(page), { timeout: 20000 }).toBe(2)
      await page.reload()
      await expect.poll(() => getCredits(page), { timeout: 20000 }).toBe(2)

      await generatePreview(page, 1)
      await generatePreview(page, 0)
      const upsell = page.locator('text=You\'ve Used Your Free Credits').or(page.locator('text=Buy Credits'))
      await expect(upsell).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Unlock Full Blueprint')).toBeVisible()
    })
  })
}