# Coupon Code Debugging Guide

## Issue
When using a 100% off coupon code (e.g., "LIVE_TEST_100"), users complete checkout but don't receive:
- 60 credits
- `paid_blueprint` subscription entry
- Access to paid features

## Enhanced Logging Added

The webhook now includes detailed logging to help identify the issue. Look for these log markers in Vercel:

### 1. Payment Status Analysis
```
[v0] 🔍 PAYMENT STATUS ANALYSIS:
[v0]   payment_status: "no_payment_required" or "paid"
[v0]   amount_total: 0 (⚠️ $0 - COUPON DETECTED)
[v0]   isPaymentPaid RESULT: true/false
```

### 2. Critical Debug Info
```
[v0] 🔍 CRITICAL DEBUG FOR COUPON ISSUES:
[v0]   Session ID: cs_xxx
[v0]   Payment status: no_payment_required
[v0]   Amount total: 0 (⚠️ $0 PAYMENT - COUPON CODE USED)
[v0]   User ID from metadata: xxx or ❌ MISSING
[v0]   Product type from metadata: paid_blueprint or ❌ MISSING
```

### 3. Paid Blueprint Detection
```
[v0] 💎 PAID BLUEPRINT DETECTED
[v0] 🔍 DETAILED COUPON DEBUG FOR PAID_BLUEPRINT:
[v0]   isPaymentPaid: true/false
[v0]   Promo code: LIVE_TEST_100
```

## How to Test

1. **Use the test script:**
   ```bash
   npx tsx scripts/test-coupon-webhook.ts
   ```
   This simulates what should happen with a $0 payment.

2. **Test with real coupon:**
   - Go to checkout with "LIVE_TEST_100" coupon
   - Complete checkout
   - Check Vercel logs immediately after

3. **Check Vercel logs for:**
   - `🔍 PAYMENT STATUS ANALYSIS` - Shows if `isPaymentPaid` is calculated correctly
   - `💎 PAID BLUEPRINT DETECTED` - Confirms webhook reached paid_blueprint block
   - `❌ BLOCKED` - Shows why processing was skipped
   - `✅ Granted 60 credits` - Confirms credits were granted

## Common Issues to Check

### Issue 1: `isPaymentPaid` is FALSE
**Symptoms:**
- Log shows `isPaymentPaid RESULT: false`
- Log shows `❌ BLOCKED: This is why access is not being granted!`

**Possible causes:**
- `payment_status` is not exactly `"no_payment_required"` (check for typos/case)
- `amount_total` is not exactly `0` (might be `null` or undefined)
- Stripe is sending a different payment status for $0 payments

**Fix:** Check the exact values in logs and adjust the condition if needed.

### Issue 2: Missing `product_type` in metadata
**Symptoms:**
- Log shows `Product type from metadata: ❌ MISSING`
- Webhook skips `paid_blueprint` processing block

**Possible causes:**
- Coupon applied client-side removes metadata
- Checkout session created without metadata
- Metadata not preserved when coupon is applied

**Fix:** Verify `createLandingCheckoutSession` and `startProductCheckoutSession` always set metadata.

### Issue 3: Missing `user_id` in metadata
**Symptoms:**
- Log shows `User ID from metadata: ❌ MISSING`
- Webhook tries email lookup but fails

**Possible causes:**
- Guest checkout (unauthenticated)
- Email doesn't match existing user
- Metadata not set for authenticated users

**Fix:** Check if user is authenticated when coupon is used.

### Issue 4: Webhook not firing
**Symptoms:**
- No logs at all in Vercel
- Stripe Dashboard shows webhook event but no response

**Possible causes:**
- Webhook secret mismatch (test vs live)
- Webhook endpoint not receiving events
- Stripe not sending `checkout.session.completed` for $0 payments

**Fix:** Check Stripe Dashboard → Webhooks → Recent events.

## Database Checks

After testing, verify in database:

```sql
-- Check subscription
SELECT * FROM subscriptions 
WHERE user_id = 'USER_ID' 
AND product_type = 'paid_blueprint';

-- Check credits
SELECT balance, total_purchased FROM user_credits 
WHERE user_id = 'USER_ID';

-- Check credit transactions
SELECT * FROM credit_transactions 
WHERE user_id = 'USER_ID' 
AND transaction_type = 'purchase'
ORDER BY created_at DESC;

-- Check payment record
SELECT * FROM stripe_payments 
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

## Next Steps

1. Run test with coupon code
2. Capture Vercel logs immediately after
3. Look for the debug markers above
4. Share logs to identify exact issue
5. Fix based on what logs reveal
