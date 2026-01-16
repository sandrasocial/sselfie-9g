import { completeStripeCheckout } from './helpers/stripe-mock'

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
    if (page.url().includes('/auth/sign-up-success')) {
      await page.goto('/feed-planner')
    }
  }

  const completeWizardIfVisible = async (page: any) => {
    const closeButton = page.locator('button[aria-label="Close"]')
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
      await closeButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      return
    }
    const selector = 'button:has-text("Continue"), button:has-text("Complete"), button:has-text("Next"), button:has-text("Start Creating")'
    await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {})
    const buttons = page.locator(selector)
    for (let i = 0; i < 8; i++) {
      if (!(await buttons.count())) break
      const inputs = page.locator('input[type="text"], textarea')
      if (await inputs.count()) {
        await inputs.first().fill('Test input')
      }
      await buttons.first().click().catch(() => {})
      await page.waitForTimeout(600)
    }
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
      await closeButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    }
  }

  const getAccess = async (page: any) => {
    const res = await page.request.get(`${baseURL}/api/feed-planner/access`)
    return res.ok() ? res.json() : null
  }

  const getCredits = async (page: any) => {
    const res = await page.request.get(`${baseURL}/api/user/credits`)
    const data = await res.json()
    return Number(data?.balance || 0)
  }

  test.describe('Membership Checkout (Stripe)', () => {
    const testEmail = `member-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Studio Member'

    test('membership unlocks full app + credits', async ({ page }: any) => {
      test.setTimeout(300000)
      await signUp(page, testEmail, testPassword, testName)
      const session = await page.request.post(`${baseURL}/api/landing/checkout`, {
        data: { productId: 'sselfie_studio_membership' },
      })
      const sessionData = await session.json()
      expect(sessionData?.clientSecret).toBeTruthy()
      await page.goto(`/checkout?client_secret=${sessionData.clientSecret}&product_type=sselfie_studio_membership`)
      await completeStripeCheckout(page, testEmail)

      await expect.poll(async () => {
        const access = await getAccess(page)
        return !!access?.isMembership && !access?.isPaidBlueprint
      }, { timeout: 120000 }).toBe(true)

      await expect.poll(() => getCredits(page), { timeout: 120000 }).toBeGreaterThanOrEqual(200)

      await page.goto('/studio')
      await page.waitForLoadState('domcontentloaded')
      await completeWizardIfVisible(page)
      await page.locator('button[aria-label="Navigate to Maya"]').click()
      await expect(page).toHaveURL(/#maya/)
      await expect(page.locator('text=Upgrade Required')).not.toBeVisible()
    })
  })
}