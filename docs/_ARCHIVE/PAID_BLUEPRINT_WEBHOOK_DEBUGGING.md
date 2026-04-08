# Paid Blueprint Webhook Debugging Guide

## Issue: `isPaidBlueprint` stays `false` after payment

### Symptoms
- Payment completes successfully
- User is redirected to success page
- Polling shows `isPaidBlueprint: false` after multiple attempts
- User cannot access paid blueprint features

### Root Cause Analysis

The webhook needs to:
1. ✅ Receive `checkout.session.completed` event
2. ✅ Extract `user_id` from `session.metadata.user_id` (for authenticated users)
3. ✅ Update `blueprint_subscribers` with `paid_blueprint_purchased = TRUE`
4. ✅ Create subscription entry in `subscriptions` table
5. ✅ Link `user_id` to `blueprint_subscribers` record

### Checkpoints

#### 1. Verify Webhook Was Called
Check server logs for:
```
[v0] 🎉 Checkout session completed!
[v0] Session ID: cs_live_...
[v0] 💎 PAID BLUEPRINT DETECTED
```

#### 2. Verify User ID in Metadata
Check if `user_id` is in session metadata:
- **Authenticated users**: `startProductCheckoutSession` sets `user_id: user.id` ✅
- **Unauthenticated users**: `createLandingCheckoutSession` does NOT set `user_id` ❌

#### 3. Verify Webhook Processing
Check server logs for:
```
[v0] 🔍 Linking paid blueprint purchase to authenticated user: {userId}
[v0] ✅ Updated blueprint_subscribers with paid blueprint purchase
[v0] ✅ Created paid_blueprint subscription entry for user {userId}
```

#### 4. Verify Database Updates
Run this query to check if the webhook processed:
```sql
SELECT 
  id,
  email,
  user_id,
  paid_blueprint_purchased,
  paid_blueprint_purchased_at,
  paid_blueprint_stripe_payment_id
FROM blueprint_subscribers
WHERE email = 'xejettafrumme-2777@yopmail.com'
  OR user_id = '{userId}'
```

Also check subscriptions table:
```sql
SELECT 
  id,
  user_id,
  product_type,
  status,
  created_at
FROM subscriptions
WHERE user_id = '{userId}'
  AND product_type = 'paid_blueprint'
```

### Common Issues

#### Issue 1: Webhook Not Called
**Symptoms**: No webhook logs in server
**Solution**: 
- Check Stripe webhook configuration
- Verify webhook endpoint is accessible
- Check Stripe dashboard for webhook delivery status

#### Issue 2: User ID Missing in Metadata
**Symptoms**: Webhook logs show "No user_id in metadata"
**Solution**: 
- For authenticated users: `startProductCheckoutSession` should set `user_id` ✅
- For unauthenticated users: Webhook will look up by email (may fail if user doesn't exist yet)

#### Issue 3: Webhook Processed But User Not Linked
**Symptoms**: `blueprint_subscribers` has `paid_blueprint_purchased = TRUE` but `user_id = NULL`
**Solution**: 
- Webhook should link `user_id` when processing authenticated users
- Check webhook logs for linking errors

#### Issue 4: Race Condition
**Symptoms**: User signs up during checkout, webhook processes before user exists
**Solution**: 
- Webhook should handle this by looking up user by email after account creation
- Check if webhook retries or if we need manual linking

### Debugging Steps

1. **Check Stripe Webhook Logs**
   - Go to Stripe Dashboard → Webhooks
   - Find the `checkout.session.completed` event
   - Check if it was delivered successfully
   - Check the response status

2. **Check Server Logs**
   - Look for webhook processing logs
   - Check for any errors during processing
   - Verify user_id extraction and linking

3. **Check Database**
   - Run the SQL queries above
   - Verify `blueprint_subscribers` was updated
   - Verify `subscriptions` entry was created

4. **Check Access Control**
   - Verify `hasPaidBlueprint()` function is checking correctly
   - Check if it's looking in the right tables
   - Verify the user_id matches

### Expected Flow

1. User completes payment → Stripe sends webhook
2. Webhook receives `checkout.session.completed`
3. Webhook extracts `user_id` from metadata (or looks up by email)
4. Webhook updates `blueprint_subscribers.paid_blueprint_purchased = TRUE`
5. Webhook creates `subscriptions` entry with `product_type = 'paid_blueprint'`
6. Webhook links `user_id` to `blueprint_subscribers` record
7. Success page polling detects `isPaidBlueprint = true`
8. User is redirected to feed planner

### Fixes Applied

✅ Embedded checkout modal created
✅ Modal extracts session ID and redirects to success page
✅ Success page polls for access status
✅ Webhook should process and link user

### Next Steps

1. Check server logs for webhook processing
2. Verify webhook was called and processed successfully
3. Check database to see if records were created/updated
4. If webhook failed, check error logs and retry if needed
