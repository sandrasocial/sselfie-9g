# Decision 1: Credit System - End-to-End Testing Checklist

**Date:** 2026-01-XX  
**Decision:** Credit System for All Users  
**Status:** Testing Phase

---

## Test Environment Setup

- [ ] Dev server running (`npm run dev`)
- [ ] Database accessible (check `.env.local` has `DATABASE_URL`)
- [ ] Test user accounts ready (or create new ones)

---

## Test Scenarios

### Test 1: New User Signup → Credits Granted ✅

**Steps:**
1. Navigate to `/auth/sign-up`
2. Create a new test account:
   - Name: "Test User Decision1"
   - Email: "test-decision1-[timestamp]@sselfie.test"
   - Password: (any valid password)
3. Submit signup form
4. Check: User is redirected to `/studio`

**Verification:**
- [ ] User signed up successfully
- [ ] User redirected to Studio
- [ ] Database check: `SELECT * FROM user_credits WHERE user_id = (SELECT id FROM users WHERE email = 'test-decision1-...@sselfie.test')`
  - Expected: `balance = 2`, `total_purchased = 2`, `total_used = 0`
- [ ] Database check: `SELECT * FROM credit_transactions WHERE user_id = (SELECT id FROM users WHERE email = 'test-decision1-...@sselfie.test') AND transaction_type = 'bonus'`
  - Expected: Transaction with description "Free blueprint credits (welcome bonus)"

**Expected Result:** ✅ User gets 2 credits on signup

---

### Test 2: Blueprint Tab → Credit Display ✅

**Steps:**
1. Navigate to `/studio?tab=blueprint` (or click Blueprint tab in Studio)
2. Check UI for credit display

**Verification:**
- [ ] Blueprint tab opens successfully
- [ ] UI shows "Available Credits: 2" (or current balance)
- [ ] Helper text shows "Each grid generation uses 2 credits (2 images × 1 credit each)"
- [ ] Credit balance matches database balance

**Expected Result:** ✅ UI displays credit balance correctly

---

### Test 3: Generate Grid → Credits Deducted ✅

**Steps:**
1. Start blueprint flow (if no blueprint exists, go to `/blueprint` to create one)
2. Generate strategy (if not already generated)
3. Generate grid (requires 2 credits)
4. Check credit balance after generation

**Verification:**
- [ ] Grid generation starts successfully
- [ ] Database check BEFORE generation: `SELECT balance FROM user_credits WHERE user_id = '...'`
  - Expected: `balance = 2`
- [ ] Grid generation completes (poll `/api/blueprint/check-grid` or wait)
- [ ] Database check AFTER generation: `SELECT balance FROM user_credits WHERE user_id = '...'`
  - Expected: `balance = 0`
- [ ] Database check: `SELECT * FROM credit_transactions WHERE user_id = '...' AND transaction_type = 'image' ORDER BY created_at DESC LIMIT 1`
  - Expected: Transaction with `amount = -2`, description includes "Blueprint grid generation"
- [ ] UI updates to show "Available Credits: 0"

**Expected Result:** ✅ 2 credits deducted when grid generated

---

### Test 4: Insufficient Credits → Error Message ✅

**Steps:**
1. Use user with 0 credits (from Test 3)
2. Try to generate another grid
3. Check error message

**Verification:**
- [ ] API returns error status: `402 Payment Required` or `403 Forbidden`
- [ ] Error message includes: "Insufficient credits"
- [ ] Error message shows current balance and required amount
- [ ] UI displays error message clearly
- [ ] Grid generation does NOT start

**Expected Result:** ✅ User cannot generate grid with 0 credits

---

### Test 5: Paid Blueprint Purchase → Credits Granted ✅

**Steps:**
1. Purchase paid blueprint (via Stripe checkout)
2. Complete payment
3. Wait for webhook to process (or trigger manually)
4. Check credits granted

**Verification:**
- [ ] Payment completes successfully
- [ ] Stripe webhook processes payment
- [ ] Database check: `SELECT balance FROM user_credits WHERE user_id = '...'`
  - Expected: `balance = 60` (or previous balance + 60)
- [ ] Database check: `SELECT * FROM credit_transactions WHERE user_id = '...' AND transaction_type = 'purchase' ORDER BY created_at DESC LIMIT 1`
  - Expected: Transaction with `amount = 60`, description includes "Paid Blueprint purchase"
- [ ] Database check: `SELECT * FROM subscriptions WHERE user_id = '...' AND product_type = 'paid_blueprint' AND status = 'active'`
  - Expected: Subscription record exists
- [ ] UI shows updated credit balance

**Expected Result:** ✅ 60 credits granted on paid blueprint purchase

---

### Test 6: Credit Balance Persistence ✅

**Steps:**
1. User with credits navigates to Studio
2. Check credit balance displays correctly
3. Refresh page
4. Check credit balance still displays correctly

**Verification:**
- [ ] Credit balance displays on page load
- [ ] After refresh, credit balance still correct
- [ ] API `/api/blueprint/state` returns correct `creditBalance`
- [ ] No errors in console

**Expected Result:** ✅ Credit balance persists across page refreshes

---

## Edge Cases to Test

### Edge Case 1: User Already Has Blueprint (Existing User)
- [ ] Existing user with blueprint data sees correct credit balance
- [ ] Credit balance reflects any previous usage

### Edge Case 2: User Without Blueprint State
- [ ] New user without blueprint sees credit balance
- [ ] Credit balance shows even if no blueprint started

### Edge Case 3: Multiple Grid Generations
- [ ] User with 4 credits can generate 2 grids
- [ ] Credits deducted correctly for each generation

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Signup → Credits | ⏳ Pending | |
| Test 2: Credit Display | ⏳ Pending | |
| Test 3: Generate → Deduct | ⏳ Pending | |
| Test 4: Insufficient Credits | ⏳ Pending | |
| Test 5: Paid Purchase | ⏳ Pending | |
| Test 6: Balance Persistence | ⏳ Pending | |

**Overall Status:** ⏳ Testing in progress

---

## Issues Found

### Issue 1: (Title)
- **Description:** 
- **Severity:** Low / Medium / High
- **Status:** Open / Fixed / Won't Fix
- **Fix:** 

---

## Next Steps After Testing

- [ ] All tests pass → Create PR #1
- [ ] Issues found → Fix issues → Retest → Create PR #1
- [ ] Document any edge cases or improvements needed

---

**END OF TESTING CHECKLIST**
