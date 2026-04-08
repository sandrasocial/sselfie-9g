# Testing Paid Blueprint Access - Quick Guide

## Problem
You need to test the full paid feed planner but:
1. Webhook processing is delayed or not working
2. Discount codes aren't working in test mode
3. You need immediate access for testing

## Solution 1: Manually Grant Access (Fastest)

Use the manual grant script to immediately give yourself paid blueprint access:

```bash
# Grant access by email
npx tsx scripts/grant-paid-blueprint-access.ts your-email@example.com

# Or grant access by user ID
npx tsx scripts/grant-paid-blueprint-access.ts c15e91f4-6711-4801-bfe5-7482e6d6703e
```

This script will:
- ✅ Update/create `blueprint_subscribers` record with `paid_blueprint_purchased = TRUE`
- ✅ Create `subscriptions` entry with `product_type = 'paid_blueprint'`
- ✅ Link `user_id` if available
- ✅ Verify access is granted

**After running this, refresh your browser and you should have full feed planner access!**

---

## Solution 2: Test Discount Code in Stripe Dashboard

### Check if Discount Code Exists

1. Go to Stripe Dashboard → Products → Coupons
2. Look for your test discount code (e.g., "test100")
3. Verify it's:
   - ✅ Active
   - ✅ Not expired
   - ✅ Has correct discount amount/percentage
   - ✅ Not restricted to specific products

### Test Discount Code Manually

The discount code validation happens in:
- `app/actions/stripe.ts` (line 106-121) - `startProductCheckoutSession`
- `app/actions/landing-checkout.ts` (line 107-131) - `createLandingCheckoutSession`

Both functions:
1. Try to retrieve the coupon from Stripe: `stripe.coupons.retrieve(promoCode.toUpperCase())`
2. Check if `coupon.valid === true`
3. If valid, apply it via `discounts: [{ coupon: validatedCoupon }]`
4. If invalid, fall back to `allow_promotion_codes: true`

### Common Issues

**Issue 1: Discount code not found**
- Check if coupon exists in Stripe Dashboard
- Verify coupon ID matches exactly (case-insensitive, but Stripe stores uppercase)
- Check if coupon is in test mode (if testing locally)

**Issue 2: Discount code not applying**
- Check server logs for: `[v0] ✅ Valid promo code found: ...`
- If you see `[v0] ⚠️ Promo code ... not found`, the coupon doesn't exist
- If you see `[v0] ⚠️ Promo code ... is not valid`, the coupon exists but is invalid/expired

**Issue 3: Test vs Production Mode**
- Stripe test mode coupons are separate from live mode
- Make sure you're using test mode coupons when testing locally
- Check `STRIPE_SECRET_KEY` - if it starts with `sk_test_`, you're in test mode

---

## Solution 3: Test Webhook Processing

### Check Webhook Delivery

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint
3. Check recent events for `checkout.session.completed`
4. Verify the event was delivered successfully

### Test Webhook Locally (Optional)

If you want to test webhook processing locally:

1. Use Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. Trigger a test payment:
   ```bash
   stripe trigger checkout.session.completed
   ```

3. Check server logs for webhook processing

### Manual Webhook Test

You can also manually trigger webhook processing by:
1. Creating a test checkout session in Stripe Dashboard
2. Marking it as completed
3. Sending the webhook event manually

---

## Solution 4: Verify Access After Granting

After granting access manually, verify it works:

1. **Check Database**:
   ```sql
   -- Check blueprint_subscribers
   SELECT id, email, user_id, paid_blueprint_purchased, paid_blueprint_purchased_at
   FROM blueprint_subscribers
   WHERE email = 'your-email@example.com';
   
   -- Check subscriptions
   SELECT id, user_id, product_type, status
   FROM subscriptions
   WHERE user_id = 'your-user-id'
   AND product_type = 'paid_blueprint';
   ```

2. **Check Access API**:
   ```bash
   # Make sure you're logged in, then:
   curl http://localhost:3000/api/feed-planner/access
   ```
   
   Should return:
   ```json
   {
     "isPaidBlueprint": true,
     "hasGalleryAccess": true,
     "canGenerateImages": true,
     ...
   }
   ```

3. **Check in App**:
   - Go to `/feed-planner`
   - You should see full 3x3 grid (not single placeholder)
   - You should see generation buttons
   - You should have gallery access

---

## Quick Testing Checklist

- [ ] Run manual grant script: `npx tsx scripts/grant-paid-blueprint-access.ts <email>`
- [ ] Verify database records were created/updated
- [ ] Refresh browser and check `/feed-planner`
- [ ] Verify you see full grid (not single placeholder)
- [ ] Verify generation buttons are visible
- [ ] Test image generation
- [ ] Test gallery access

---

## Troubleshooting

### Access Still Not Working After Manual Grant

1. **Clear browser cache/cookies** - Old access state might be cached
2. **Check server logs** - Look for `[Feed Planner Access]` logs
3. **Verify user_id** - Make sure the user_id in database matches your auth user
4. **Check subscription status** - Verify `status = 'active'` in subscriptions table

### Discount Code Still Not Working

1. **Check Stripe Dashboard** - Verify coupon exists and is active
2. **Check server logs** - Look for discount code validation messages
3. **Test with Stripe test card** - Use `4242 4242 4242 4242` for successful payment
4. **Try manual entry** - If pre-applied code fails, try entering it manually in checkout UI

---

## Recommended Testing Flow

1. **For Quick Testing**: Use manual grant script (Solution 1)
2. **For Full Flow Testing**: 
   - Create test coupon in Stripe Dashboard
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - Wait for webhook (or manually grant if delayed)
3. **For Production Testing**: 
   - Use real payment (small amount)
   - Monitor webhook delivery
   - Verify access is granted automatically
