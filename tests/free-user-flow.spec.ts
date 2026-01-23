const runPlaywright = process.env.PLAYWRIGHT_TEST === '1'

if (!runPlaywright) {
  describe.skip('Playwright E2E (set PLAYWRIGHT_TEST=1)', () => {
    it('skipped in vitest', () => {})
  })
} else {
  const { test, expect } = require('@playwright/test')

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  const getCredits = async (page: any) => {
    const response = await page.request.get(`${baseURL}/api/user/credits`)
    if (!response.ok()) {
      throw new Error(await response.text())
    }
    const data = await response.json()
    return typeof data?.balance === 'number' ? data.balance : Number(data?.balance || 0)
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
    await seedOnboarding(page)
    const previewFeedResponse = await page.request.post(`${baseURL}/api/feed/create-free-example`, {
      data: { feedStyle: 'Light & Minimalistic' },
    })
    if (!previewFeedResponse.ok()) {
      throw new Error(await previewFeedResponse.text())
    }
    const previewFeed = await previewFeedResponse.json()
    const feedId = previewFeed.feedId
    await page.goto(`/feed-planner?feedId=${feedId}`)
    await page.waitForSelector('text=Preview Feed', { timeout: 20000 })
    await expect
      .poll(async () => {
        const feedResponse = await page.request.get(`${baseURL}/api/feed/${feedId}`)
        if (!feedResponse.ok()) return 0
        const feedData = await feedResponse.json()
        return Array.isArray(feedData?.posts) ? feedData.posts.length : 0
      }, { timeout: 30000 })
      .toBeGreaterThan(0)
    return feedId
  }

  const generatePreview = async (page: any) => {
    await expect(page.locator('text=Preparing your preview...')).toBeHidden({ timeout: 30000 })
    const button = page.locator('button:has-text("Generate Image"), button:has-text("Generate image")')
    await expect(button).toBeVisible({ timeout: 30000 })
    await button.click()
    await expect(page.locator('text=Generating your preview feed')).toBeVisible({ timeout: 20000 })
  }

  test.describe('Free User Flow', () => {
    const testEmail = `free-test-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Free Test User'

    test('free signup + preview credits', async ({ page }: any) => {
      test.setTimeout(240000)
      const feedId = await signUp(page, testEmail, testPassword, testName)
      await page.goto('/feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForLoadState('domcontentloaded')

      await expect.poll(() => getCredits(page), { timeout: 20000 }).toBe(2)
      await page.reload()
      await expect.poll(() => getCredits(page), { timeout: 20000 }).toBe(2)

      await generatePreview(page)
    })
  })
}