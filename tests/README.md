# E2E Tests Documentation - Blueprint Funnel

**Date:** January 2025  
**Status:** ✅ Test Suite Created

---

## DISCOVERED FLOW

See `tests/AUDIT_FINDINGS.md` for complete audit of actual user flow, routes, components, and selectors.

### Key Routes
- Sign Up: `/auth/sign-up`
- Login: `/auth/login`
- Feed Planner: `/feed-planner`
- Checkout Success: `/checkout/success`
- Account/Credits: `/account?tab=credits`

### Key Components
- Sign Up: `app/auth/sign-up/page.tsx`
- Onboarding: `components/onboarding/unified-onboarding-wizard.tsx` (8 steps)
- Free Preview: `components/feed-planner/feed-single-placeholder.tsx`
- Paid Grid: `components/feed-planner/feed-grid.tsx` (3x4 = 12 posts)
- Buy Blueprint: `components/sselfie/buy-blueprint-modal.tsx`
- Upsell Modal: `components/feed-planner/free-mode-upsell-modal.tsx`
- Welcome Wizard: `components/feed-planner/welcome-wizard.tsx` (4 steps)

### Key API Endpoints
- Credit Balance: `GET /api/credits/balance`
- Generate Single: `POST /api/feed/${feedId}/generate-single`
- Welcome Status: `GET /api/feed-planner/welcome-status`
- Welcome Status Update: `POST /api/feed-planner/welcome-status`
- Feed Planner Access: `GET /api/feed-planner/access`

---

## RUNNING TESTS

### Install Dependencies
```bash
pnpm install
npx playwright install chromium
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/free-user-flow.spec.ts
npx playwright test tests/paid-user-flow.spec.ts
npx playwright test tests/maya-integration.spec.ts
npx playwright test tests/complete-blueprint-flow.spec.ts
```

### Run with UI (Recommended for Development)
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Specific Test
```bash
npx playwright test -g "should complete onboarding"
```

---

## TEST STRUCTURE

### Test Files

1. **`free-user-flow.spec.ts`**
   - Tests free tier user journey
   - Sign up → Onboarding → Preview generation → Upsell modal

2. **`paid-user-flow.spec.ts`**
   - Tests paid tier user journey
   - Login → Welcome wizard → 3x4 grid → Image generation
   - Verifies welcome wizard doesn't show on second visit

3. **`maya-integration.spec.ts`**
   - Tests Maya AI integration
   - Verifies unique prompts for each position
   - Verifies images are unique while maintaining aesthetic

4. **`complete-blueprint-flow.spec.ts`**
   - Full end-to-end test
   - Sign up → Onboarding → Preview → Upsell → Upgrade → Welcome → Paid generation

### Test Helpers

1. **`helpers/test-user.ts`**
   - `createTestUser(email)` - Grants paid blueprint access to user
   - `cleanupTestUser(email)` - Removes test subscriptions and resets credits
   - `setUserCredits(email, balance, totalUsed)` - Sets credit amounts for testing

2. **`helpers/stripe-mock.ts`**
   - `mockStripeCheckout(page)` - Mocks Stripe checkout APIs
   - `simulateStripeWebhook(page, userId)` - Simulates successful payment webhook

---

## TEST SETUP REQUIREMENTS

### Environment Variables
- `DATABASE_URL` - Neon database connection string (required for test helpers)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for checkout mocking)

### Database Setup
- Test helpers require direct database access
- Users must be created via sign up flow first (Supabase auth)
- Test helpers then grant paid access by updating database records

### Test User Creation Flow
1. User signs up via `/auth/sign-up` (creates Supabase auth user)
2. Test helper `createTestUser()` grants paid access:
   - Creates subscription record
   - Grants 60 credits
   - Updates blueprint_subscribers
   - Resets welcome wizard flag

---

## TEST NOTES

### Image Generation Timing
- Image generation takes **30-60 seconds** per image
- Tests use `timeout: 90000` (90 seconds) for generation
- Consider increasing timeout if generation is slow

### Welcome Wizard
- Shows only once per user (stored in `user_personal_brand.feed_planner_welcome_shown`)
- Test helpers reset this flag to test welcome wizard flow

### Credit-Based Upsell
- Upsell modal appears when `total_used >= 2`
- Use `setUserCredits()` helper to set credit usage for testing

### Stripe Checkout
- Stripe checkout is **mocked** to avoid payment processing
- `mockStripeCheckout()` intercepts API calls
- `simulateStripeWebhook()` simulates successful payment

### Onboarding Wizard
- 8 steps total (including welcome)
- Some steps are optional (selfie upload, brand pillars)
- Tests may need to handle optional steps gracefully

---

## TROUBLESHOOTING

### Tests Fail: "User not found"
- **Solution:** User must be created via sign up flow first
- Test helpers cannot create Supabase auth users
- Create user manually or via sign up test first

### Tests Fail: "Timeout waiting for element"
- **Solution:** Increase timeout or check if element selector is correct
- Use `--debug` mode to see what's happening
- Check browser console for errors

### Tests Fail: "Image generation timeout"
- **Solution:** Generation may take longer than 90 seconds
- Increase timeout in test: `timeout: 120000` (2 minutes)
- Check if Replicate API is responding

### Tests Fail: "Database connection error"
- **Solution:** Ensure `DATABASE_URL` is set in environment
- Test helpers require database access
- Check database connection string format

---

## CONTINUOUS INTEGRATION

### CI Configuration
Tests are configured to:
- Retry failed tests 2 times in CI
- Run with 1 worker in CI (sequential)
- Generate HTML report
- Capture screenshots on failure
- Capture video on failure

### CI Environment Variables
```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
CI=true
```

---

## NEXT STEPS

1. ✅ Audit complete
2. ✅ Playwright installed
3. ✅ Test helpers created
4. ✅ Test files created
5. ⏳ **Run tests and fix any issues**
6. ⏳ **Add more test coverage as needed**

---

**Status:** ✅ Test Suite Ready for Execution
