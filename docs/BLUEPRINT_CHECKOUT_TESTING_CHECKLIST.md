# Blueprint Checkout End-to-End Testing Checklist

## Test Environment Setup

**Prerequisites:**
- [ ] Dev server running (`npm run dev`)
- [ ] Stripe test mode configured
- [ ] `STRIPE_PAID_BLUEPRINT_PRICE_ID` environment variable set
- [ ] Feature flag `FEATURE_PAID_BLUEPRINT_ENABLED=true` or DB flag enabled
- [ ] Test Stripe card: `4242 4242 4242 4242` (any future expiry, any CVC)

---

## Test Scenario 1: Authenticated User Purchases Paid Blueprint

### Steps:
1. [ ] Sign in to Studio as an authenticated user
2. [ ] Navigate to Blueprint tab (`/studio?tab=blueprint`)
3. [ ] Click "Upgrade to Paid Blueprint" or navigate to `/checkout/blueprint`
4. [ ] Verify embedded Stripe checkout form loads
5. [ ] Enter test card: `4242 4242 4242 4242`
6. [ ] Complete checkout
7. [ ] **Verify:** Redirects to `/studio?tab=blueprint&purchase=success` (after ~2 seconds)
8. [ ] **Verify:** Blueprint tab is active
9. [ ] **Verify:** Credits balance shows 60 credits (refresh if needed)

### Database Verification:
Run verification script:
```bash
npx tsx scripts/test-blueprint-checkout.ts --user-id {USER_ID} --test authenticated
```

**Expected Results:**
- [ ] `subscriptions` table: Entry with `product_type='paid_blueprint'`, `status='active'`, `user_id={USER_ID}`
- [ ] `user_credits` table: Balance = 60 (or previous balance + 60)
- [ ] `credit_transactions` table: Transaction with `transaction_type='purchase'`, `credits=60`, description includes "Paid blueprint credits"
- [ ] `blueprint_subscribers` table: Record with `user_id={USER_ID}`, `paid_blueprint_purchased=TRUE`
- [ ] `stripe_payments` table: Payment record with `product_type='paid_blueprint'`, `status='succeeded'`

---

## Test Scenario 2: Unauthenticated User Purchases Paid Blueprint

### Steps:
1. [ ] Sign out (if logged in)
2. [ ] Navigate to `/checkout/blueprint` (or from landing page)
3. [ ] Verify embedded Stripe checkout form loads
4. [ ] Enter test card: `4242 4242 4242 4242`
5. [ ] Enter email: `test-{timestamp}@example.com` (use unique email)
6. [ ] Complete checkout
7. [ ] **Verify:** Redirects to `/checkout/success?session_id={ID}&email={EMAIL}&type=paid_blueprint`
8. [ ] **Verify:** Account creation form is shown (name, password fields)
9. [ ] Enter name: "Test User"
10. [ ] Enter password: "TestPassword123"
11. [ ] Confirm password: "TestPassword123"
12. [ ] Click "LET'S GO"
13. [ ] **Verify:** Redirects to `/studio?tab=blueprint&purchase=success` after account creation
14. [ ] **Verify:** Blueprint tab is active
15. [ ] **Verify:** Credits balance shows 60 credits

### Database Verification:
Run verification script:
```bash
npx tsx scripts/test-blueprint-checkout.ts --email {EMAIL} --test unauthenticated
```

**Expected Results:**
- [ ] `users` table: New user record with `email={EMAIL}`
- [ ] `subscriptions` table: Entry with `product_type='paid_blueprint'`, `status='active'`, `user_id={USER_ID}`
- [ ] `user_credits` table: Balance = 60
- [ ] `credit_transactions` table: Transaction with `credits=60`
- [ ] `blueprint_subscribers` table: Record with `email={EMAIL}`, `user_id={USER_ID}` (linked after signup), `paid_blueprint_purchased=TRUE`
- [ ] `stripe_payments` table: Payment record with `product_type='paid_blueprint'`

---

## Test Scenario 3: Verify Credits Granted (60 credits for paid blueprint)

### Steps:
1. [ ] Complete a paid blueprint purchase (authenticated or unauthenticated)
2. [ ] Navigate to Studio → Account tab
3. [ ] Check credits balance
4. [ ] **Verify:** Credits show 60 (or previous balance + 60)

### Database Verification:
```sql
SELECT 
  uc.balance,
  ct.credits,
  ct.transaction_type,
  ct.description,
  ct.created_at
FROM user_credits uc
LEFT JOIN credit_transactions ct ON ct.user_id = uc.user_id
WHERE uc.user_id = '{USER_ID}'
  AND ct.description LIKE '%Paid blueprint%'
ORDER BY ct.created_at DESC
LIMIT 5;
```

**Expected Results:**
- [ ] `user_credits.balance` = 60 (or previous + 60)
- [ ] `credit_transactions` has entry with:
  - `transaction_type = 'purchase'`
  - `credits = 60`
  - `description` contains "Paid blueprint credits"
  - `stripe_payment_id` matches payment intent ID

---

## Test Scenario 4: Verify Subscription Entry Created (product_type='paid_blueprint')

### Steps:
1. [ ] Complete a paid blueprint purchase
2. [ ] Wait for webhook to process (usually immediate)

### Database Verification:
```sql
SELECT 
  id,
  user_id,
  product_type,
  status,
  stripe_customer_id,
  created_at,
  updated_at
FROM subscriptions
WHERE user_id = '{USER_ID}'
  AND product_type = 'paid_blueprint'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Record exists with:
  - `product_type = 'paid_blueprint'`
  - `status = 'active'`
  - `user_id = {USER_ID}`
  - `stripe_customer_id` is set (if authenticated checkout)
  - `created_at` matches purchase time

---

## Test Scenario 5: Verify blueprint_subscribers Linked to user_id (Authenticated Users)

### Steps:
1. [ ] Complete a paid blueprint purchase as authenticated user
2. [ ] Wait for webhook to process

### Database Verification:
```sql
SELECT 
  id,
  user_id,
  email,
  name,
  paid_blueprint_purchased,
  paid_blueprint_purchased_at,
  paid_blueprint_stripe_payment_id,
  converted_to_user,
  converted_at,
  created_at,
  updated_at
FROM blueprint_subscribers
WHERE user_id = '{USER_ID}'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Record exists with:
  - `user_id = {USER_ID}` (NOT NULL)
  - `paid_blueprint_purchased = TRUE`
  - `paid_blueprint_purchased_at` is set (timestamp)
  - `paid_blueprint_stripe_payment_id` matches payment intent ID
  - `converted_to_user = TRUE`
  - `converted_at` is set

### Verification for Guest Checkout (Unauthenticated):
```sql
SELECT 
  id,
  user_id,
  email,
  paid_blueprint_purchased,
  paid_blueprint_purchased_at
FROM blueprint_subscribers
WHERE email = '{EMAIL}'
  AND paid_blueprint_purchased = TRUE
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results (Guest):**
- [ ] Record exists with:
  - `email = {EMAIL}`
  - `user_id` may be NULL (will be linked when user signs up)
  - `paid_blueprint_purchased = TRUE`
- [ ] After signup, `user_id` should be linked (via email matching)

---

## Edge Cases & Additional Tests

### Test 6: Duplicate Purchase Prevention
1. [ ] Complete paid blueprint purchase
2. [ ] Attempt to purchase again (if allowed)
3. [ ] **Verify:** Subscription entry not duplicated (should use `ON CONFLICT DO NOTHING`)
4. [ ] **Verify:** Credits not double-granted

### Test 7: Webhook Idempotency
1. [ ] Complete paid blueprint purchase
2. [ ] Manually trigger webhook again (if possible)
3. [ ] **Verify:** No duplicate records created
4. [ ] **Verify:** Credits not double-granted

### Test 8: Credit Balance Display
1. [ ] Navigate to Blueprint tab after purchase
2. [ ] **Verify:** Credit balance shows correctly in Blueprint screen
3. [ ] **Verify:** Credit balance updates immediately after purchase

### Test 9: Studio Purchase Success Handling
1. [ ] Complete paid blueprint purchase (authenticated)
2. [ ] **Verify:** Redirects to `/studio?tab=blueprint&purchase=success`
3. [ ] **Verify:** Blueprint tab is active
4. [ ] **Verify:** `purchase=success` query param removed after 3 seconds
5. [ ] **Verify:** Credits refresh automatically

### Test 10: Checkout Session Metadata
1. [ ] Check server logs during checkout
2. [ ] **Verify:** Log shows `user_id` in session metadata (for authenticated)
3. [ ] **Verify:** Log shows `product_type='paid_blueprint'` in metadata

---

## Automated Verification Script

Run the automated verification script:

```bash
# For authenticated user
npx tsx scripts/test-blueprint-checkout.ts --user-id {USER_ID} --test authenticated

# For unauthenticated user (by email)
npx tsx scripts/test-blueprint-checkout.ts --email {EMAIL} --test unauthenticated

# Verify specific payment
npx tsx scripts/test-blueprint-checkout.ts --payment-id {PAYMENT_INTENT_ID}
```

---

## Expected Flow Summary

### Authenticated User Flow:
```
1. User clicks "Upgrade to Paid Blueprint"
   → /checkout/blueprint
2. Server creates checkout session (with user_id in metadata)
   → redirects to /checkout?client_secret={secret}&product_type=paid_blueprint
3. User completes payment
   → Stripe webhook fires: checkout.session.completed
4. Webhook:
   - Creates subscription entry (product_type='paid_blueprint')
   - Grants 60 credits
   - Links blueprint_subscribers to user_id
5. Client redirects
   → /checkout/success?session_id={ID}&email={EMAIL}&type=paid_blueprint
6. Success page detects authenticated user
   → auto-redirects to /studio?tab=blueprint&purchase=success (after 2s)
7. Studio page:
   - Sets activeTab to "blueprint"
   - Shows purchase success
   - Refreshes credits
   - Removes purchase=success param after 3s
```

### Unauthenticated User Flow:
```
1. User navigates to /checkout/blueprint
2. Server creates checkout session (without user_id)
   → redirects to /checkout?client_secret={secret}&product_type=paid_blueprint
3. User completes payment (enters email in Stripe form)
   → Stripe webhook fires: checkout.session.completed
4. Webhook:
   - Creates blueprint_subscribers record with email (user_id NULL)
   - No credits granted yet (no user_id)
   - No subscription entry yet (no user_id)
5. Client redirects
   → /checkout/success?session_id={ID}&email={EMAIL}&type=paid_blueprint
6. Success page shows account creation form
7. User creates account
   → POST /api/complete-account
8. Server:
   - Creates user account
   - Links blueprint_subscribers to user_id (email match)
   - Grants 60 credits (if not already granted)
   - Creates subscription entry
9. Redirects to /studio?tab=blueprint&purchase=success
10. Studio page handles same as authenticated flow
```

---

## Success Criteria

All tests pass when:
- [x] Authenticated users can purchase and are redirected correctly
- [x] Unauthenticated users can purchase and create account
- [x] 60 credits are granted after purchase
- [x] Subscription entry is created with correct product_type
- [x] blueprint_subscribers is linked to user_id for authenticated users
- [x] Credits display correctly in Blueprint tab
- [x] Purchase success is handled gracefully
- [x] No duplicate records created
- [x] Webhook is idempotent

---

## Known Issues / Notes

- Guest checkout users will have blueprint_subscribers record with `user_id=NULL` initially
- Credits will be granted after account creation (email matching)
- Subscription entry will be created after account creation (webhook may retry)

---

## Rollback Plan

If issues occur:
1. Remove subscription entries: `DELETE FROM subscriptions WHERE product_type='paid_blueprint' AND user_id='{USER_ID}'`
2. Reverse credits: `UPDATE user_credits SET balance = balance - 60 WHERE user_id='{USER_ID}'`
3. Delete credit transactions: `DELETE FROM credit_transactions WHERE user_id='{USER_ID}' AND description LIKE '%Paid blueprint%'`
4. Update blueprint_subscribers: `UPDATE blueprint_subscribers SET paid_blueprint_purchased=FALSE WHERE user_id='{USER_ID}'`
