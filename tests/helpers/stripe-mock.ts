import { Page } from '@playwright/test'

const CARD = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123',
  postal: '12345',
}

async function findStripeTarget(page: Page, selectors: string[], timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        try {
          if (await frame.locator(selector).count()) {
            return { frame, selector }
          }
        } catch {}
      }
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`Stripe element not found: ${selectors.join(', ')}`)
}

async function fillIfPresent(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  if (await input.count()) {
    await input.first().fill(value)
  }
}

async function tryFillStripe(page: Page, selectors: string[], value: string) {
  try {
    const { frame, selector } = await findStripeTarget(page, selectors, 5000)
    await frame.locator(selector).first().fill(value)
  } catch {}
}

export async function completeStripeCheckout(page: Page, email: string) {
  await page.waitForSelector('iframe')
  await fillIfPresent(page, 'input[type="email"]', email)
  await tryFillStripe(page, ['input[type="email"]', 'input[name="email"]'], email)
  await tryFillStripe(page, [
    'input[name="name"]',
    'input[name="cardholder-name"]',
    'input[autocomplete="cc-name"]',
    'input[placeholder*="Full name"]',
    'input[placeholder*="Name"]',
  ], 'Test User')

  const card = await findStripeTarget(page, [
    'input[name="cardnumber"]',
    'input[name="cardNumber"]',
    'input[autocomplete="cc-number"]',
  ])
  await card.frame.locator(card.selector).first().scrollIntoViewIfNeeded()
  await card.frame.locator(card.selector).first().fill(CARD.number)
  const exp = await findStripeTarget(page, [
    'input[name="exp-date"]',
    'input[name="expDate"]',
    'input[autocomplete="cc-exp"]',
    'input[placeholder*="MM"]',
  ])
  await exp.frame.locator(exp.selector).first().scrollIntoViewIfNeeded()
  await exp.frame.locator(exp.selector).first().fill(CARD.exp)
  const cvc = await findStripeTarget(page, [
    'input[name="cvc"]',
    'input[autocomplete="cc-csc"]',
    'input[placeholder*="CVC"]',
  ])
  await cvc.frame.locator(cvc.selector).first().scrollIntoViewIfNeeded()
  await cvc.frame.locator(cvc.selector).first().fill(CARD.cvc)
  await tryFillStripe(page, [
    'input[name="postal"]',
    'input[name="postalCode"]',
    'input[autocomplete="postal-code"]',
    'input[placeholder*="ZIP"]',
    'input[placeholder*="Postal"]',
  ], CARD.postal)

  const pay = await findStripeTarget(page, [
    'button:has-text("Pay")',
    'button:has-text("Subscribe")',
    'button:has-text("Complete")',
    'button:has-text("Place")',
  ])
  await pay.frame.locator(pay.selector).first().click()
  const errorLocator = pay.frame
    .locator('text=live mode')
    .or(pay.frame.locator('text=declined'))
    .or(pay.frame.locator('text=failed'))
  const errorPromise = errorLocator.waitFor({ state: 'visible', timeout: 120000 }).then(async () => {
    const message = await errorLocator.first().innerText().catch(() => 'Stripe checkout failed')
    throw new Error(`Stripe checkout failed: ${message}`)
  })
  await Promise.race([
    page.waitForURL(/\/checkout\/success/, { timeout: 120000 }),
    errorPromise,
  ])
}
