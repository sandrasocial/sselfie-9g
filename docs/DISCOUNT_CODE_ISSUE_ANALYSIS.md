# Discount Code Issue Analysis

**Date:** 2026-01-10  
**Issue:** Discount codes work for credit top-up but not for blueprint checkout  
**User:** dullougraqueixe-4140@yopmail.com

---

## Comparison: Credit Top-Up vs Blueprint Checkout

### Credit Top-Up (`startCreditCheckoutSession`)

**Key Differences:**
1. **Uses `price_data` (dynamic pricing)** - creates price on the fly
2. **Accepts `promoCode` parameter** - validates coupon before creating session
3. **Conditional discount logic:**
   - If `promoCode` provided → validates coupon → uses `discounts: [{ coupon: validatedCoupon }]`
   - If `promoCode` NOT provided → uses `allow_promotion_codes: true`
4. **Uses `customer_email`** instead of `customer` (customer ID)

**Code:**
```typescript
line_items: [
  {
    price_data: { // ✅ Dynamic pricing
      currency: "usd",
      product_data: { name, description },
      unit_amount: creditPackage.priceInCents,
    },
    quantity: 1,
  },
],
...(validatedCoupon && {
  discounts: [{ coupon: validatedCoupon }], // ✅ Pre-validated discount
}),
...(!validatedCoupon && {
  allow_promotion_codes: true, // ✅ User can enter code in UI
}),
```

### Blueprint Checkout (`startProductCheckoutSession`)

**Key Differences:**
1. **Uses `price: stripePriceId` (pre-defined Price ID)** - references existing Stripe price
2. **Does NOT accept `promoCode` parameter** - no validation/application of discount codes
3. **Always uses `allow_promotion_codes: true`** - user must enter code in embedded checkout UI
4. **Uses `customer: customerId`** (customer object) instead of `customer_email`

**Code:**
```typescript
line_items: [
  {
    price: stripePriceId, // ⚠️ Pre-defined Price ID
    quantity: 1,
  },
],
allow_promotion_codes: true, // ⚠️ Always enabled, no validation
customer: customerId, // ⚠️ Uses customer object
```

---

## The Problem

When the user enters "test100" discount code in the embedded checkout form:

1. **Credit Top-Up:** Works because it uses `price_data` (dynamic pricing)
2. **Blueprint:** Fails because:
   - Uses pre-defined `price: stripePriceId`
   - Discount code reduces price to $0
   - Stripe might not create a payment intent when final amount is $0
   - Or payment intent is created but webhook doesn't fire properly for $0 payments
   - Or there's an issue with how Stripe handles discount codes + pre-defined prices

**Evidence from Stripe Dashboard:**
- Customer exists (cus_Tlr7GHZISsh22h)
- User ID in metadata (6655980c-54d3-4389-a689-b2d0e6011b00)
- **No payments** - payment was never created or completed
- **No subscriptions** - webhook never fired

---

## Root Cause Hypothesis

**Hypothesis 1: Zero-amount payments**
When discount code brings price to $0, Stripe might:
- Skip creating payment intent
- Create payment intent but not trigger webhook
- Create payment intent but mark it differently

**Hypothesis 2: Pre-defined Price ID limitation**
When using `price: stripePriceId` (pre-defined price) + discount codes:
- Stripe might handle $0 amounts differently than with `price_data`
- Discount code validation might fail silently
- Payment might not complete properly

**Hypothesis 3: Customer object vs customer_email**
Using `customer: customerId` instead of `customer_email` might affect how discount codes are processed.

---

## Solution

**Option A: Make blueprint checkout consistent with credit top-up**
- Switch to `price_data` instead of `price: stripePriceId`
- This matches credit top-up behavior exactly
- But loses benefits of pre-defined prices (revenue tracking, etc.)

**Option B: Add discount code validation (like landing checkout)**
- Accept `promoCode` parameter in `startProductCheckoutSession`
- Validate promotion code/coupon before creating session
- Apply discount using `discounts` array (pre-validated)
- Only use `allow_promotion_codes: true` if no promo code provided
- This matches `createLandingCheckoutSession` behavior

**Option C: Keep current approach but handle $0 payments**
- Add special handling for $0 amount payments
- Create subscription immediately if payment amount is $0
- Grant credits immediately if payment amount is $0
- Skip webhook processing for $0 payments

**Recommendation: Option B** - Make blueprint checkout consistent with landing checkout and credit top-up by adding discount code validation.

---

## Implementation

Update `startProductCheckoutSession` to:
1. Accept optional `promoCode` parameter
2. Validate promotion code/coupon (like `createLandingCheckoutSession`)
3. Apply discount using `discounts` array if validated
4. Only use `allow_promotion_codes: true` if no promo code provided
5. This ensures discount codes work the same way across all checkout flows
