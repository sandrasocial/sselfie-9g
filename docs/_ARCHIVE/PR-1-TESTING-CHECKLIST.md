# PR-1: Paid Blueprint Checkout - Testing Checklist

Use this checklist to verify PR-1 works correctly before moving to PR-2.

---

## ☑️ SETUP (Do Once)

### Stripe Setup
- [ ] Created Stripe product in **test mode**: "SSELFIE Brand Blueprint"
- [ ] Created price: $47.00 USD one-time
- [ ] Copied Price ID: `price_________________`
- [ ] Added to `.env.local`: `STRIPE_PAID_BLUEPRINT_PRICE_ID=price_________`

### Database Setup
- [ ] Ran SQL migration:
  ```bash
  psql $DATABASE_URL < scripts/migrations/create-paid-blueprint-feature-flag.sql
  ```
- [ ] Verified flag exists:
  ```sql
  SELECT * FROM admin_feature_flags WHERE key = 'paid_blueprint_enabled';
  ```

### Dev Server
- [ ] Restarted dev server: `npm run dev`
- [ ] Server running on http://localhost:3000

---

## ☑️ TEST 1: Feature Flag OFF (Default State)

**Expected:** Checkout page returns 404 when flag is disabled

- [ ] Ensure flag is OFF:
  ```sql
  SELECT value FROM admin_feature_flags WHERE key = 'paid_blueprint_enabled';
  -- Should return FALSE
  ```

- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@example.com

- [ ] **PASS:** Page shows 404 Not Found
- [ ] **PASS:** Console shows: `[Blueprint Checkout] Feature disabled, returning 404`

---

## ☑️ TEST 2: Missing Email Parameter

**Expected:** Redirects to blueprint page when email is missing

- [ ] Enable flag:
  ```sql
  UPDATE admin_feature_flags SET value = TRUE WHERE key = 'paid_blueprint_enabled';
  ```

- [ ] Visit: http://localhost:3000/checkout/blueprint

- [ ] **PASS:** Redirects to `/blueprint?message=complete_free_first`
- [ ] **PASS:** Console shows: `[Blueprint Checkout] No email provided`

---

## ☑️ TEST 3: Valid Email, No Promo

**Expected:** Creates checkout session and loads Stripe embedded checkout

- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai

- [ ] **PASS:** Redirects to `/checkout?client_secret=cs_test_...&product_type=paid_blueprint`
- [ ] **PASS:** Page loads Stripe embedded checkout
- [ ] **PASS:** Shows product: "SSELFIE Brand Blueprint"
- [ ] **PASS:** Shows price: $47.00
- [ ] **PASS:** Promotion code field is visible
- [ ] **PASS:** Console shows:
  ```
  [Blueprint Checkout] Creating session for email: test@sselfie.ai
  [v0] Creating checkout session for product: paid_blueprint
  [v0] Using Stripe Price ID: price_...
  [Blueprint Checkout] Session created, redirecting to checkout
  ```

---

## ☑️ TEST 4: Valid Promo Code

**Expected:** Applies discount and hides promo field

**Setup:**
- [ ] Created promo code in Stripe Dashboard: `BLUEPRINT10` (10% off)

**Test:**
- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai&promo=BLUEPRINT10

- [ ] **PASS:** Stripe checkout shows discounted price ($42.30)
- [ ] **PASS:** Promotion code field is hidden (discount pre-applied)
- [ ] **PASS:** Console shows: `[v0] ✅ Valid promotion code found: BLUEPRINT10`

---

## ☑️ TEST 5: Invalid Promo Code

**Expected:** Shows full price, allows manual promo entry

- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai&promo=INVALID99

- [ ] **PASS:** Stripe checkout shows full price ($47.00)
- [ ] **PASS:** Promotion code field is visible
- [ ] **PASS:** Console shows promo validation failures (expected)

---

## ☑️ TEST 6: Complete Test Purchase

**Expected:** Payment succeeds, redirects to success page

**Steps:**
1. [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai

2. [ ] Fill in Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/28`
   - CVC: `123`
   - Name: Test User
   - Email: test@sselfie.ai

3. [ ] Click "Pay $47.00"

**Verify:**
- [ ] **PASS:** Payment succeeds (green checkmark)
- [ ] **PASS:** Redirects to `/checkout/success?session_id=cs_test_...`
- [ ] **PASS:** Success page loads (shows generic success message - expected for PR-1)

**Check Stripe Dashboard:**
- [ ] **PASS:** Payment appears in Stripe Dashboard → Payments
- [ ] **PASS:** Session metadata includes:
  ```json
  {
    "product_id": "paid_blueprint",
    "product_type": "paid_blueprint",
    "credits": "0",
    "source": "landing_page"
  }
  ```

**Check Webhook:**
- [ ] **PASS:** Webhook received `checkout.session.completed` event
- [ ] **NOTE:** Webhook won't process this yet (expected - PR-2 work)

---

## ☑️ TEST 7: Missing Stripe Price ID

**Expected:** Shows helpful error message

**Setup:**
- [ ] Comment out in `.env.local`:
  ```bash
  # STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxxxx
  ```

- [ ] Restart dev server

**Test:**
- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai

**Verify:**
- [ ] **PASS:** Error page shows:
  ```
  Error: Stripe Price ID not configured for paid_blueprint
  Environment variable needed: STRIPE_PAID_BLUEPRINT_PRICE_ID
  ```

**Cleanup:**
- [ ] Uncomment `STRIPE_PAID_BLUEPRINT_PRICE_ID` in `.env.local`
- [ ] Restart dev server

---

## ☑️ TEST 8: Rollback (Disable Feature)

**Expected:** Instant rollback without code deployment

- [ ] Disable flag:
  ```sql
  UPDATE admin_feature_flags SET value = FALSE WHERE key = 'paid_blueprint_enabled';
  ```

- [ ] Visit: http://localhost:3000/checkout/blueprint?email=test@sselfie.ai

- [ ] **PASS:** Returns 404 (feature disabled)
- [ ] **PASS:** No errors in console

**Re-enable for next tests:**
- [ ] Re-enable flag:
  ```sql
  UPDATE admin_feature_flags SET value = TRUE WHERE key = 'paid_blueprint_enabled';
  ```

---

## ☑️ ACCEPTANCE CRITERIA (Final Check)

- [ ] All 8 test cases passed
- [ ] No linting errors: `npm run lint`
- [ ] No TypeScript errors: `npm run type-check` (if available)
- [ ] Existing checkout routes still work:
  - [ ] `/checkout/one-time` still works
  - [ ] `/checkout/membership` still works
  - [ ] `/checkout/credits` still works
- [ ] Feature flag defaults to OFF (safe)
- [ ] Rollback works instantly (disable flag)

---

## 📊 RESULTS SUMMARY

**Date Tested:** _______________  
**Tested By:** _______________  
**Environment:** [ ] Local [ ] Staging [ ] Production

**Test Results:**
- Feature Flag OFF: [ ] PASS [ ] FAIL
- Missing Email: [ ] PASS [ ] FAIL
- Valid Email: [ ] PASS [ ] FAIL
- Valid Promo: [ ] PASS [ ] FAIL
- Invalid Promo: [ ] PASS [ ] FAIL
- Complete Purchase: [ ] PASS [ ] FAIL
- Missing Price ID: [ ] PASS [ ] FAIL
- Rollback: [ ] PASS [ ] FAIL

**Issues Found:**
- 
- 
- 

**Ready for Production:** [ ] YES [ ] NO (explain why not)

**Notes:**
- 
- 
- 

---

## ✅ SIGN-OFF

**Engineering:** _______________  
**QA:** _______________  
**Product (Sandra):** _______________  

**Date:** _______________

---

**Next:** After all tests pass, proceed with PR-2 (Webhook Handler)
