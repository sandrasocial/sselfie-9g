/**
 * Stripe Mocking Helper for E2E Tests
 * 
 * Mocks Stripe checkout API calls to avoid actual payment processing
 */

import { Page } from '@playwright/test'

/**
 * Mock Stripe checkout session creation
 * 
 * Intercepts checkout API calls and returns mock session data
 * 
 * @param page - Playwright page instance
 */
export async function mockStripeCheckout(page: Page) {
  // Mock authenticated checkout (startProductCheckoutSession)
  await page.route('**/api/stripe/create-checkout-session', async (route) => {
    const request = route.request()
    const method = request.method()

    if (method === 'POST') {
      // Return mock client secret
      const mockClientSecret = `cs_test_playwright_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clientSecret: mockClientSecret,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock landing checkout (createLandingCheckoutSession)
  await page.route('**/api/landing/checkout', async (route) => {
    const request = route.request()
    const method = request.method()

    if (method === 'POST') {
      const mockClientSecret = `cs_test_playwright_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clientSecret: mockClientSecret,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock checkout session lookup
  await page.route('**/api/checkout-session*', async (route) => {
    const url = new URL(route.request().url())
    const sessionId = url.searchParams.get('session_id')

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: sessionId || 'test_session_playwright',
        email: 'test@playwright.test',
        amount_total: 4700, // $47 in cents
        currency: 'usd',
        status: 'complete',
      }),
    })
  })

  // Mock Stripe webhook (simulate successful payment)
  // Note: In real tests, webhook would be called by test helper after "payment"
  await page.route('**/api/webhooks/stripe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ received: true }),
    })
  })

  console.log('[Stripe Mock] ✅ Stripe checkout APIs mocked')
}

/**
 * Simulate successful Stripe checkout completion
 * 
 * This should be called after user "completes" checkout in the UI
 * It simulates the webhook that would normally be called by Stripe
 * 
 * @param page - Playwright page instance
 * @param userId - User ID to grant access to
 */
export async function simulateStripeWebhook(page: Page, userId: string) {
  // In a real scenario, this would be called by Stripe
  // For tests, we'll call the webhook handler directly via API
  const response = await page.request.post('http://localhost:3000/api/webhooks/stripe', {
    data: {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_playwright_${Date.now()}`,
          customer: `test_customer_${userId}`,
          amount_total: 4700,
          currency: 'usd',
          metadata: {
            product_id: 'paid_blueprint',
            user_id: userId,
          },
        },
      },
    },
  })

  if (!response.ok()) {
    console.error('[Stripe Mock] ❌ Failed to simulate webhook:', await response.text())
    throw new Error('Failed to simulate Stripe webhook')
  }

  console.log('[Stripe Mock] ✅ Simulated successful checkout webhook')
}
