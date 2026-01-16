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

  test.describe('Paid Blueprint Checkout (Stripe)', () => {
    const testEmail = `paid-blueprint-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Paid Blueprint User'

    test('paid blueprint unlocks feed planner only', async ({ page }: any) => {
      test.setTimeout(300000)
      await signUp(page, testEmail, testPassword, testName)
      await page.goto('/checkout/blueprint')
      await page.waitForURL(/\/checkout\?client_secret=/, { timeout: 30000 })
      await completeStripeCheckout(page, testEmail)

      await expect.poll(async () => {
        const access = await getAccess(page)
        return !!access?.isPaidBlueprint && !access?.isMembership
      }, { timeout: 120000 }).toBe(true)

      await page.goto('/studio?tab=feed-planner')
      await page.waitForLoadState('domcontentloaded')
      await completeWizardIfVisible(page)
      await expect(page.locator('button:has-text("Generate image"), button:has-text("Generate Image")')).toBeVisible({ timeout: 15000 })

      await page.locator('button[aria-label="Navigate to Maya"]').click()
      await expect(page.locator('text=Upgrade Required')).toBeVisible({ timeout: 8000 })
      await expect(page).not.toHaveURL(/#maya/)
    })
  })
}