# Paid Blueprint Purchase Debugging Guide

**Issue:** Purchase processed correctly, but:
1. No credits were granted to the account
2. User is stuck in free preview (blueprint) inside feed planner
3. Not accessing the complete feed planner

---

## Diagnosis Steps

### Step 1: Check Webhook Logs

Check the webhook logs in Vercel or your logging system for:
1. `checkout.session.completed` event for paid blueprint
2. Look for these log messages:
   - `[v0] 💎 PAID BLUEPRINT DETECTED`
   - `[v0] Payment status: {status}, isPaymentPaid: {true/false}`
   - `[v0] 💎 Paid Blueprint purchase from {email} - Payment confirmed`
   - `[v0] ✅ Granted 60 credits for paid blueprint purchase to user {userId}`
   - `[v0] ✅ Created paid_blueprint subscription entry for user {userId}`

### Step 2: Check Database Records

#### Check Subscriptions Table
```sql
SELECT * FROM subscriptions 
WHERE product_type = 'paid_blueprint' 
AND user_id = '{userId}'
ORDER BY created_at DESC;
```

**Expected:** Should have at least one row with:
- `product_type = 'paid_blueprint'`
- `status = 'active'`
- `user_id` matches the user

#### Check Credits
```sql
SELECT * FROM user_credits 
WHERE user_id = '{userId}';
```

**Expected:** Should show 60 credits added to balance

#### Check Credit Transactions
```sql
SELECT * FROM credit_transactions 
WHERE user_id = '{userId}' 
AND transaction_type = 'purchase'
AND description LIKE '%Paid Blueprint%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Should have a transaction for 60 credits

#### Check Stripe Payments
```sql
SELECT * FROM stripe_payments 
WHERE product_type = 'paid_blueprint'
AND user_id = '{userId}'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Should have a payment record

---

## Common Issues

### Issue 1: User ID Not Resolved

**Symptom:** Webhook logs show `❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`

**Cause:** 
- For authenticated users: `session.metadata.user_id` is missing
- For guest checkout: User lookup by email fails

**Check:**
```sql
-- Check if user exists
SELECT id, email FROM users WHERE email = '{customerEmail}';
```

**Solution:** Verify checkout session includes `user_id` in metadata for authenticated users

### Issue 2: Payment Status Not Confirmed

**Symptom:** Webhook logs show `⚠️ Paid Blueprint checkout completed but payment not confirmed`

**Cause:** 
- For discount codes ($0 payment): `payment_status = 'no_payment_required'`
- Logic should handle this (line 126-127), but check if `amount_total = 0`

**Check:** Verify webhook logic handles $0 payments correctly:
```typescript
const isPaymentPaid = session.payment_status === "paid" || 
  (session.payment_status === "no_payment_required" && session.amount_total === 0)
```

### Issue 3: Subscription INSERT Fails Silently

**Symptom:** Credits granted but no subscription record

**Cause:** 
- `ON CONFLICT DO NOTHING` silently fails if constraint violated
- No error logged

**Check:** Look for `ON CONFLICT DO NOTHING` in subscription INSERT (line 1163)

**Solution:** Add error logging or use `ON CONFLICT ... DO UPDATE` to see conflicts

### Issue 4: Subscription Created But Access Control Not Working

**Symptom:** Subscription exists but user still sees free mode

**Cause:** 
- Access control query not finding subscription
- Cache issue
- User ID mismatch

**Check:**
```sql
-- Verify subscription exists
SELECT * FROM subscriptions 
WHERE user_id = '{userId}' 
AND product_type = 'paid_blueprint' 
AND status = 'active';
```

**Test Access Control:**
- Call `/api/feed-planner/access` endpoint
- Check logs for `[Feed Planner Access]` messages
- Verify `hasPaidBlueprint` returns `true`

---

## Debugging Queries

### Find Recent Paid Blueprint Purchases
```sql
SELECT 
  sp.id,
  sp.stripe_payment_id,
  sp.user_id,
  sp.amount_cents,
  sp.status,
  sp.product_type,
  sp.created_at,
  u.email,
  uc.balance as credits_balance,
  s.product_type as subscription_type,
  s.status as subscription_status
FROM stripe_payments sp
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN user_credits uc ON sp.user_id = uc.user_id
LEFT JOIN subscriptions s ON sp.user_id = s.user_id AND s.product_type = 'paid_blueprint'
WHERE sp.product_type = 'paid_blueprint'
ORDER BY sp.created_at DESC
LIMIT 10;
```

### Check If User Has Access
```sql
SELECT 
  u.id,
  u.email,
  uc.balance as credits,
  s.product_type,
  s.status as subscription_status,
  CASE 
    WHEN s.product_type = 'paid_blueprint' AND s.status = 'active' THEN 'HAS ACCESS'
    ELSE 'NO ACCESS'
  END as access_status
FROM users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.product_type = 'paid_blueprint' AND s.status = 'active'
WHERE u.email = '{email}';
```

---

## Next Steps

1. Check webhook logs for the specific purchase
2. Run database queries to verify records
3. Test access control endpoint
4. Check if there are any errors in webhook processing
