import { test, expect } from '@playwright/test'

/**
 * Debug Test: Onboarding Wizard Not Appearing
 * 
 * This test is designed to debug why the onboarding wizard doesn't appear
 * for new users. It logs API responses and page state.
 */

test.describe('Debug: Onboarding Wizard', () => {
  test('debug - check API responses and wizard state', async ({ page }) => {
    const testEmail = `debug-${Date.now()}@playwright.test`
    const testPassword = 'TestPassword123!'
    const testName = 'Debug Test User'

    // Intercept and log API responses
    const apiResponses: Record<string, any> = {}
    
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/api/user/onboarding-status') || 
          url.includes('/api/feed-planner/access') ||
          url.includes('/api/profile/personal-brand')) {
        try {
          const data = await response.json()
          apiResponses[url] = {
            status: response.status(),
            data: data,
          }
          console.log(`[DEBUG] API Response: ${url}`)
          console.log(`[DEBUG] Status: ${response.status()}`)
          console.log(`[DEBUG] Data:`, JSON.stringify(data, null, 2))
        } catch (e) {
          console.log(`[DEBUG] Failed to parse response from ${url}:`, e)
        }
      }
    })

    // === STEP 1: SIGN UP ===
    console.log('[DEBUG] Step 1: Signing up user...')
    await page.goto('/auth/sign-up')
    
    await page.fill('input#name', testName)
    await page.fill('input#email', testEmail)
    await page.fill('input#password', testPassword)
    await page.click('button[type="submit"]:has-text("Sign Up")')

    // Wait for redirect
    await page.waitForURL(/\/studio|\/auth\/sign-up-success|\/feed-planner/, { timeout: 15000 })
    console.log('[DEBUG] Redirected to:', page.url())

    // If redirected to sign-up-success, navigate to feed planner
    if (page.url().includes('/auth/sign-up-success')) {
      await page.goto('/feed-planner')
    }

    // === STEP 2: WAIT FOR FEED PLANNER TO LOAD ===
    console.log('[DEBUG] Step 2: Waiting for feed planner to load...')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000) // Wait for API calls

    // === STEP 3: CHECK API RESPONSES ===
    console.log('[DEBUG] Step 3: Checking API responses...')
    console.log('[DEBUG] API Responses captured:', Object.keys(apiResponses))

    // Log all API responses
    for (const [url, response] of Object.entries(apiResponses)) {
      console.log(`[DEBUG] ${url}:`, JSON.stringify(response, null, 2))
    }

    // === STEP 4: CHECK WIZARD STATE ===
    console.log('[DEBUG] Step 4: Checking wizard state...')
    
    // Check if wizard is in DOM (even if hidden)
    const wizardInDOM = await page.locator('[role="dialog"]').count()
    console.log('[DEBUG] Dialogs in DOM:', wizardInDOM)

    // Check for wizard text
    const welcomeText = await page.locator('text=Welcome').count()
    const step1Text = await page.locator('text=What do you do?').count()
    const step1Subtitle = await page.locator('text=Step 1 of 8').count()
    
    console.log('[DEBUG] Welcome text found:', welcomeText > 0)
    console.log('[DEBUG] Step 1 text found:', step1Text > 0)
    console.log('[DEBUG] Step 1 subtitle found:', step1Subtitle > 0)

    // Check for wizard backdrop
    const backdrop = await page.locator('.backdrop-blur-sm, .bg-stone-950\\/60').count()
    console.log('[DEBUG] Wizard backdrop found:', backdrop > 0)

    // Check page title
    const pageTitle = await page.title()
    console.log('[DEBUG] Page title:', pageTitle)

    // Check for any errors in console
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text())
      }
    })

    // === STEP 5: TAKE SCREENSHOT ===
    console.log('[DEBUG] Step 5: Taking screenshot...')
    await page.screenshot({ path: 'test-results/debug-wizard-state.png', fullPage: true })

    // === STEP 6: CHECK ONBOARDING STATUS API DIRECTLY ===
    console.log('[DEBUG] Step 6: Checking onboarding status API directly...')
    
    // Get auth cookies
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name.includes('supabase') || c.name.includes('auth'))
    
    if (authCookie) {
      try {
        const response = await page.request.get('http://localhost:3000/api/user/onboarding-status', {
          headers: {
            'Cookie': `${authCookie.name}=${authCookie.value}`,
          },
        })
        const data = await response.json()
        console.log('[DEBUG] Direct API call response:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('[DEBUG] Failed to call API directly:', e)
      }
    }

    // === STEP 7: CHECK FEED PLANNER ACCESS API ===
    console.log('[DEBUG] Step 7: Checking feed planner access API...')
    
    if (authCookie) {
      try {
        const response = await page.request.get('http://localhost:3000/api/feed-planner/access', {
          headers: {
            'Cookie': `${authCookie.name}=${authCookie.value}`,
          },
        })
        const data = await response.json()
        console.log('[DEBUG] Access API response:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('[DEBUG] Failed to call access API:', e)
      }
    }

    // === STEP 8: WAIT LONGER AND CHECK AGAIN ===
    console.log('[DEBUG] Step 8: Waiting 10 more seconds and checking again...')
    await page.waitForTimeout(10000)

    const wizardAfterWait = await page.locator('[role="dialog"]').count()
    const welcomeAfterWait = await page.locator('text=Welcome').count()
    
    console.log('[DEBUG] After 10s wait - Dialogs:', wizardAfterWait)
    console.log('[DEBUG] After 10s wait - Welcome text:', welcomeAfterWait > 0)

    // Final screenshot
    await page.screenshot({ path: 'test-results/debug-wizard-after-wait.png', fullPage: true })

    // Log console errors
    if (consoleMessages.length > 0) {
      console.log('[DEBUG] Console errors found:', consoleMessages)
    }

    // Don't fail the test - this is just for debugging
    // We'll analyze the output to find the root cause
  })
})
