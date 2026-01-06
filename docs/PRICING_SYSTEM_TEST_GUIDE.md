# 🧪 PRICING SYSTEM TEST GUIDE

**Date:** 2025-01-XX  
**Purpose:** Comprehensive testing of $97/200 credits pricing system  
**Status:** Ready for execution

---

## PRE-TEST VERIFICATION

### ✅ Code Verification (Already Complete)

**1. Pricing Configuration:**
- ✅ `lib/products.ts` - Single source of truth
  - Creator Studio: $97/month (9700 cents), 200 credits
  - One-Time Session: $49 (4900 cents), 70 credits
  - Credit Top-ups: 100cr @ $45, 200cr @ $85

**2. Credit Grant Logic:**
- ✅ `lib/credits.ts` - `SUBSCRIPTION_CREDITS.sselfie_studio_membership = 200`
- ✅ `grantMonthlyCredits()` grants 200 credits correctly
- ✅ Webhook handler uses `grantMonthlyCredits()` for `invoice.payment_succeeded`

**3. Credit Costs:**
- ✅ Training: 25 credits
- ✅ Classic Mode: 1 credit
- ✅ Pro Mode: 2 credits (via `getStudioProCreditCost()`)
- ✅ Animation: 3 credits

**4. Checkout Flow:**
- ✅ `app/actions/landing-checkout.ts` uses `product.priceInCents` (9700 for Creator Studio)
- ✅ Uses `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` env var

---

## TEST 1: NEW SIGNUP ($97/MONTH)

### Steps:
1. Go to landing page
2. Click "Join the Studio" (Creator Studio)
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Complete account setup

### Verification Queries:

```sql
-- 1. Check subscription was created
SELECT 
  id,
  user_id,
  product_type,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  is_test_mode,
  created_at
FROM subscriptions
WHERE product_type = 'sselfie_studio_membership'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: product_type = 'sselfie_studio_membership', status = 'active'

-- 2. Check credits were granted (200 credits)
SELECT 
  ct.id,
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.balance_after,
  ct.created_at,
  uc.balance as current_balance
FROM credit_transactions ct
JOIN user_credits uc ON ct.user_id = uc.user_id
WHERE ct.transaction_type = 'subscription_grant'
  AND ct.amount = 200
ORDER BY ct.created_at DESC
LIMIT 1;

-- Expected: amount = 200, transaction_type = 'subscription_grant', balance_after = 200

-- 3. Check Stripe charge amount
-- Go to Stripe Dashboard → Payments → Find latest payment
-- Expected: Amount = $97.00

-- 4. Verify user balance
SELECT 
  u.email,
  uc.balance,
  s.product_type,
  s.status
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'test@example.com'  -- Replace with test email
ORDER BY s.created_at DESC
LIMIT 1;

-- Expected: balance = 200, product_type = 'sselfie_studio_membership'
```

### ✅ Success Criteria:
- [ ] Charged exactly $97.00 (not $79)
- [ ] User received 200 credits
- [ ] `credit_transactions` table has entry: `amount=200, type='subscription_grant'`
- [ ] `subscriptions` table shows: `product_type='sselfie_studio_membership'`

---

## TEST 2: SUBSCRIPTION RENEWAL

### Steps:
1. Wait for next billing cycle OR manually trigger renewal in Stripe test mode
2. In Stripe Dashboard: Go to subscription → "..." → "Trigger invoice"

### Verification Queries:

```sql
-- 1. Check for duplicate credit grants (should be 0)
SELECT 
  user_id,
  COUNT(*) as grant_count,
  SUM(amount) as total_credits
FROM credit_transactions
WHERE transaction_type = 'subscription_grant'
  AND user_id = 'USER_ID_HERE'  -- Replace with test user ID
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id;

-- Expected: grant_count = 1 (no duplicates)

-- 2. Check webhook event was logged
SELECT 
  stripe_event_id,
  processed_at
FROM webhook_events
WHERE processed_at >= NOW() - INTERVAL '1 hour'
ORDER BY processed_at DESC
LIMIT 5;

-- Expected: Latest event should be 'invoice.payment_succeeded'

-- 3. Verify credits were granted again
SELECT 
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
WHERE ct.user_id = 'USER_ID_HERE'  -- Replace with test user ID
  AND ct.transaction_type = 'subscription_grant'
ORDER BY ct.created_at DESC
LIMIT 2;

-- Expected: Two grants of 200 credits each, balance_after should increase
```

### ✅ Success Criteria:
- [ ] 200 credits granted on renewal
- [ ] No duplicate grants (idempotency check works)
- [ ] `webhook_events` table logged the event
- [ ] User balance increased by 200 credits

---

## TEST 3: CREDIT TOP-UP PURCHASE

### Steps:
1. Log in as test user
2. Go to dashboard → Buy Credits
3. Purchase 100 credits ($45)
4. Verify credits added
5. Purchase 200 credits ($85)
6. Verify credits added

### Verification Queries:

```sql
-- 1. Check 100 credit purchase
SELECT 
  ct.id,
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.stripe_payment_id,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
WHERE ct.transaction_type = 'purchase'
  AND ct.amount = 100
  AND ct.product_type = 'credit_topup'
ORDER BY ct.created_at DESC
LIMIT 1;

-- Expected: amount = 100, transaction_type = 'purchase', product_type = 'credit_topup'

-- 2. Check 200 credit purchase
SELECT 
  ct.id,
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.stripe_payment_id,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
WHERE ct.transaction_type = 'purchase'
  AND ct.amount = 200
  AND ct.product_type = 'credit_topup'
ORDER BY ct.created_at DESC
LIMIT 1;

-- Expected: amount = 200, transaction_type = 'purchase', product_type = 'credit_topup'

-- 3. Verify Stripe payments
-- Go to Stripe Dashboard → Payments
-- Expected: Two payments: $45.00 and $85.00

-- 4. Check final balance
SELECT 
  u.email,
  uc.balance,
  uc.total_purchased
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
WHERE u.email = 'test@example.com';  -- Replace with test email

-- Expected: balance should include all purchases
```

### ✅ Success Criteria:
- [ ] 100 credits purchase: Charged $45, credits added
- [ ] 200 credits purchase: Charged $85, credits added
- [ ] Both transactions logged in `credit_transactions`
- [ ] `stripe_payment_id` present for both

---

## TEST 4: CREDIT DEDUCTION

### Steps:
1. Ensure user has at least 3 credits
2. Generate Pro Mode image (should cost 2 credits)
3. Generate Classic Mode image (should cost 1 credit)
4. Try to generate with 0 credits (should show error)

### Verification Queries:

```sql
-- 1. Check Pro Mode deduction (2 credits)
SELECT 
  ct.id,
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
WHERE ct.transaction_type = 'image'
  AND ct.amount = -2  -- Negative for deduction
ORDER BY ct.created_at DESC
LIMIT 1;

-- Expected: amount = -2, transaction_type = 'image'

-- 2. Check Classic Mode deduction (1 credit)
SELECT 
  ct.id,
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
WHERE ct.transaction_type = 'image'
  AND ct.amount = -1  -- Negative for deduction
ORDER BY ct.created_at DESC
LIMIT 1;

-- Expected: amount = -1, transaction_type = 'image'

-- 3. Verify current balance matches deductions
SELECT 
  uc.balance,
  SUM(ct.amount) as calculated_balance
FROM user_credits uc
LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
WHERE uc.user_id = 'USER_ID_HERE'  -- Replace with test user ID
GROUP BY uc.balance;

-- Expected: balance should match sum of all transactions
```

### ✅ Success Criteria:
- [ ] Pro Mode: 2 credits deducted correctly
- [ ] Classic Mode: 1 credit deducted correctly
- [ ] With 0 credits: Error shown, "Buy Credits" modal appears
- [ ] All deductions logged in `credit_transactions`

---

## TEST 5: EXISTING CUSTOMER (GRANDFATHERED)

### Prerequisites:
- Test account with old $79 subscription
- Test account with old $149 subscription (if exists)

### Verification Queries:

```sql
-- 1. Check $79 customers still pay $79
SELECT 
  s.id,
  s.user_id,
  s.product_type,
  s.status,
  s.stripe_subscription_id,
  u.email
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.product_type = 'sselfie_studio_membership'
  AND s.status = 'active'
ORDER BY s.created_at ASC
LIMIT 5;

-- Then check Stripe Dashboard → Subscriptions → Find subscription
-- Expected: Price should be $79/month (old price)

-- 2. Check $79 customers get 150 credits (grandfathered)
SELECT 
  ct.user_id,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.created_at
FROM credit_transactions ct
WHERE ct.transaction_type = 'subscription_grant'
  AND ct.amount = 150  -- Old amount
ORDER BY ct.created_at DESC
LIMIT 5;

-- Expected: Old customers should still get 150 credits

-- 3. Check $149 customers (if any)
SELECT 
  s.id,
  s.user_id,
  s.product_type,
  s.status,
  u.email
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.product_type = 'brand_studio_membership'
  AND s.status = 'active';

-- Expected: Should still exist and work (grandfathered)
```

### ✅ Success Criteria:
- [ ] $79 customers: Still charged $79, get 150 credits
- [ ] $149 customers: Still charged $149, get 300 credits (if exists)
- [ ] No disruption to existing customers

---

## TEST 6: WEBHOOK VERIFICATION

### Steps:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Check webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. View recent events

### Verification Checklist:

**In Stripe Dashboard:**
- [ ] Webhook endpoint is active
- [ ] Recent events show `checkout.session.completed`
- [ ] Recent events show `invoice.payment_succeeded`
- [ ] No failed webhook deliveries
- [ ] No retries needed

**In Database:**
```sql
-- Check webhook event processing
SELECT 
  stripe_event_id,
  processed_at,
  COUNT(*) OVER (PARTITION BY stripe_event_id) as duplicates
FROM webhook_events
WHERE processed_at >= NOW() - INTERVAL '24 hours'
ORDER BY processed_at DESC
LIMIT 20;

-- Expected: No duplicates (each event_id appears once)

-- Check for webhook errors (if error logging exists)
SELECT 
  event_type,
  error_message,
  created_at
FROM webhook_errors  -- If this table exists
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Expected: No errors (or only non-critical errors)
```

### ✅ Success Criteria:
- [ ] All webhook events processed successfully
- [ ] No duplicate processing
- [ ] No critical errors
- [ ] Events logged in `webhook_events` table

---

## MANUAL TESTING CHECKLIST

### Frontend Verification:
- [ ] Landing page shows $97/month (not $79)
- [ ] Landing page shows "200 credits per month"
- [ ] Pricing cards display correct amounts
- [ ] Checkout flow works smoothly
- [ ] Credit purchase modal shows correct prices ($45/$85)
- [ ] Dashboard shows correct credit balance

### Error Handling:
- [ ] Insufficient credits shows proper error
- [ ] "Buy Credits" modal appears when needed
- [ ] Low credit warning appears at 30 credits
- [ ] Payment failures handled gracefully

---

## SQL QUERIES FOR QUICK VERIFICATION

### Get All Recent Credit Transactions:
```sql
SELECT 
  u.email,
  ct.amount,
  ct.transaction_type,
  ct.description,
  ct.balance_after,
  ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC
LIMIT 20;
```

### Get All Active Subscriptions:
```sql
SELECT 
  u.email,
  s.product_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.is_test_mode
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### Get User Credit Summary:
```sql
SELECT 
  u.email,
  uc.balance,
  uc.total_purchased,
  uc.total_used,
  s.product_type,
  s.status
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
ORDER BY u.created_at DESC
LIMIT 10;
```

---

## EXPECTED RESULTS SUMMARY

| Test | Expected Result | Status |
|------|----------------|--------|
| New Signup | $97 charged, 200 credits granted | ⏳ Pending |
| Renewal | 200 credits granted, no duplicates | ⏳ Pending |
| Top-up 100 | $45 charged, 100 credits added | ⏳ Pending |
| Top-up 200 | $85 charged, 200 credits added | ⏳ Pending |
| Pro Mode | 2 credits deducted | ⏳ Pending |
| Classic Mode | 1 credit deducted | ⏳ Pending |
| Zero Credits | Error shown, modal appears | ⏳ Pending |
| Grandfathered | Old pricing still works | ⏳ Pending |
| Webhooks | All events processed | ⏳ Pending |

---

## TROUBLESHOOTING

### Issue: Credits not granted
**Check:**
1. Webhook received? (Stripe Dashboard)
2. `invoice.payment_succeeded` event fired?
3. `product_type` in subscription = `sselfie_studio_membership`?
4. Check webhook logs for errors

### Issue: Wrong amount charged
**Check:**
1. `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` env var correct?
2. Stripe Price ID matches $97 price?
3. Check `app/actions/landing-checkout.ts` logs

### Issue: Duplicate credit grants
**Check:**
1. `webhook_events` table has duplicate event IDs?
2. Idempotency check working? (invoice period check)
3. Check webhook handler logs

---

## NEXT STEPS AFTER TESTING

1. ✅ Document any issues found
2. ✅ Fix critical issues before production
3. ✅ Re-test after fixes
4. ✅ Update this guide with actual results
5. ✅ Deploy to production

---

**End of Test Guide**

