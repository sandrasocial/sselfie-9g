# Paid Blueprint Discount Code Verification

**Date:** 2025-01-XX  
**Purpose:** Verification that discount codes work correctly for paid blueprint checkout and that users are created/updated even with $0 payments

---

## Summary

✅ **Discount codes are fully supported** in the paid blueprint checkout flow.  
✅ **Zero-payment handling works correctly** - users are created/updated even when discount codes make the payment $0.  
✅ **Subscription entry is created** for paid blueprint purchases regardless of payment amount.

**Paid Blueprint Package:**
- 3 feed planners
- 30 images total (across 3 grids)
- 2 credits per image = 60 credits total

---

## Discount Code Support

### Checkout Session Creation

Both checkout flows support promotion codes:

1. **Authenticated Users** (`app/actions/stripe.ts` - `startProductCheckoutSession`):
   - Line 240-242: `allow_promotion_codes: true` is set if no promo code is pre-applied
   - Users can enter promotion codes (e.g., "Test100") directly in Stripe's checkout UI

2. **Unauthenticated Users** (`app/actions/landing-checkout.ts` - `createLandingCheckoutSession`):
   - Line 181-183: `allow_promotion_codes: true` is set if no promo code is pre-applied
   - Same behavior - users can enter promotion codes in checkout UI

### How to Use

1. Click the "Unlock Full Feed Planner" button in the free feed preview
2. You'll be redirected to `/checkout/blueprint`
3. Checkout session is created with `allow_promotion_codes: true`
4. In Stripe's embedded checkout UI, enter "Test100" in the promotion code field
5. Stripe will apply the discount and set the payment amount to $0

---

## Zero-Payment Handling

### Webhook Processing

The webhook (`app/api/webhooks/stripe/route.ts`) correctly handles $0 payments from discount codes:

1. **Payment Status Check** (Line 126-127):
   ```typescript
   const isPaymentPaid = session.payment_status === "paid" || 
     (session.payment_status === "no_payment_required" && session.amount_total === 0)
   ```
   - For $0 payments, Stripe sets `payment_status` to `"no_payment_required"`
   - The webhook correctly recognizes this as a valid payment

2. **Payment Storage** (Lines 991-993):
   - Uses `session.id` as payment ID for $0 payments (since there's no payment intent)
   - Stores payment amount as $0 in `stripe_payments` table
   - Payment is marked as `"succeeded"` status

3. **Credit Granting** (Lines 1086-1126):
   - Credits are granted even for $0 payments
   - Uses `session.id` as payment ID for idempotency check
   - 60 credits are granted (for 30 images × 2 credits per image)

4. **Subscription Creation** (Lines 1132-1173):
   - Subscription entry is created in `subscriptions` table
   - `product_type = 'paid_blueprint'`
   - `status = 'active'`
   - Works regardless of payment amount

---

## User Creation/Update

### Authenticated Users

- User ID is in `session.metadata.user_id` from checkout session creation
- User is found immediately (Line 1048-1051)
- Credits are granted (Line 1105)
- Subscription is created (Line 1146-1164)
- `blueprint_subscribers` is updated/created (Lines 1178-1240)

### Unauthenticated Users

- User is created in webhook if they don't exist (Lines 489-630)
- User ID is resolved after creation (Line 533-534)
- Same credit/subscription logic applies

---

## Testing Checklist

### Test Scenario: Free User → Paid Blueprint with Test100 Discount Code

1. ✅ User is a free user with feed planner access
2. ✅ User clicks "Unlock Full Feed Planner" button in free feed preview
3. ✅ User is redirected to `/checkout/blueprint`
4. ✅ Stripe checkout UI loads with `allow_promotion_codes: true`
5. ✅ User enters "Test100" in promotion code field
6. ✅ Stripe applies discount and shows $0.00 total
7. ✅ User completes checkout
8. ✅ Webhook receives `checkout.session.completed` event
9. ✅ Webhook recognizes payment as valid (`isPaymentPaid = true`)
10. ✅ Payment is stored in `stripe_payments` table with $0 amount
11. ✅ 60 credits are granted to user
12. ✅ Subscription entry is created in `subscriptions` table
13. ✅ `blueprint_subscribers` is updated with `paid_blueprint_purchased = TRUE`
14. ✅ User is redirected to `/feed-planner?purchase=success`
15. ✅ User now has full Feed Planner access

---

## Code References

- Checkout Session Creation (Authenticated): `app/actions/stripe.ts` lines 221-262
- Checkout Session Creation (Unauthenticated): `app/actions/landing-checkout.ts` lines 163-217
- Webhook Payment Status Check: `app/api/webhooks/stripe/route.ts` lines 126-127
- Zero Payment Handling: `app/api/webhooks/stripe/route.ts` lines 991-993
- Credit Granting: `app/api/webhooks/stripe/route.ts` lines 1086-1126
- Subscription Creation: `app/api/webhooks/stripe/route.ts` lines 1132-1173
- User Creation: `app/api/webhooks/stripe/route.ts` lines 489-630

---

## Conclusion

The paid blueprint checkout flow **fully supports discount codes** and correctly handles $0 payments. Users are created/updated and subscriptions are created regardless of payment amount, making it perfect for testing with "Test100" discount code.
