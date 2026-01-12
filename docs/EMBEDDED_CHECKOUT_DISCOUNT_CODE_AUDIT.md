# Embedded Checkout Discount Code Audit

## Problem Statement

The embedded purchase (checkout) for `paid_blueprint` is not working with discount codes passed via URL, even though discount codes are set in Stripe. The issue is inconsistent discount code handling across different checkout implementations.

## Audit Results

### ✅ CORRECT Implementation: `startCreditCheckoutSession`

**Location**: `app/actions/stripe.ts` (lines 8-82)

**Behavior**:
- ✅ Validates promo code by calling `stripe.coupons.retrieve(promoCode.toUpperCase())`
- ✅ If valid coupon found → uses `discounts: [{ coupon: validatedCoupon }]`
- ✅ If not provided or invalid → uses `allow_promotion_codes: true`
- ✅ **Mutually exclusive**: Never sets both `discounts` and `allow_promotion_codes` (Stripe requirement)

**Code Pattern**:
```typescript
let validatedCoupon = null
if (promoCode) {
  try {
    const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
    if (coupon.valid) {
      validatedCoupon = coupon.id
    }
  } catch (error) {
    throw new Error("Invalid promo code")
  }
}

const session = await stripe.checkout.sessions.create({
  // ...
  ...(validatedCoupon && {
    discounts: [{ coupon: validatedCoupon }],
  }),
  ...(!validatedCoupon && {
    allow_promotion_codes: true,
  }),
})
```

---

### ❌ BROKEN Implementation 1: `startProductCheckoutSession`

**Location**: `app/actions/stripe.ts` (lines 84-247)

**Used By**: 
- `app/checkout/blueprint/page.tsx` (authenticated users)
- Other product checkouts

**Issues**:
1. ❌ Accepts `promoCode` parameter but **NEVER validates or uses it**
2. ❌ Always uses `allow_promotion_codes: true` (line 209) regardless of `promoCode`
3. ❌ Only stores `promoCode` in metadata (lines 217, 227) but doesn't apply it
4. ❌ **Inconsistent with `startCreditCheckoutSession` pattern**

**Current Code** (BROKEN):
```typescript
// Line 108: Just logs, doesn't validate
console.log(`[v0] ℹ️ [${productId}] Allowing promotion codes in Stripe UI (Stripe will handle validation)`)

// Line 209: Always allows promotion codes, never pre-applies
allow_promotion_codes: true,

// Lines 217, 227: Only stores in metadata, doesn't apply
...(promoCode && { promo_code: promoCode }),
```

**Impact**: 
- Discount codes passed via URL (e.g., `/checkout/blueprint?promo=test100`) are **ignored**
- Users must manually enter codes in Stripe UI
- Inconsistent behavior compared to credit purchases

---

### ❌ BROKEN Implementation 2: `createLandingCheckoutSession`

**Location**: `app/actions/landing-checkout.ts` (lines 10-165)

**Used By**: 
- `app/checkout/blueprint/page.tsx` (unauthenticated users)
- Landing page checkouts

**Issues**:
1. ❌ Accepts `promoCode` parameter but **NEVER validates or uses it**
2. ❌ Always uses `allow_promotion_codes: true` (line 131) regardless of `promoCode`
3. ❌ Only stores `promoCode` in metadata (line 147) but doesn't apply it
4. ❌ **Same issue as `startProductCheckoutSession`**

**Current Code** (BROKEN):
```typescript
// Line 118: Just logs, doesn't validate
console.log(`[v0] ℹ️ [${product.type}] Allowing promotion codes in Stripe UI (Stripe will handle validation)`)

// Line 131: Always allows promotion codes, never pre-applies
allow_promotion_codes: true,

// Line 147: Only stores in metadata, doesn't apply
...(promoCode && { promo_code: promoCode }),
```

**Impact**: 
- Same as `startProductCheckoutSession` - discount codes in URL are ignored

---

## Root Cause

**Inconsistent discount code handling**:
- `startCreditCheckoutSession` validates and pre-applies promo codes ✅
- `startProductCheckoutSession` accepts but ignores promo codes ❌
- `createLandingCheckoutSession` accepts but ignores promo codes ❌

**Stripe API Requirement**:
- `discounts` and `allow_promotion_codes` are **mutually exclusive**
- If you set `discounts`, you cannot set `allow_promotion_codes: true`
- If you set `allow_promotion_codes: true`, you cannot set `discounts`

**Current Broken Flow**:
1. User visits `/checkout/blueprint?promo=test100`
2. `promoCode` is extracted and passed to `startProductCheckoutSession("paid_blueprint", "test100")`
3. Function accepts `promoCode` but doesn't validate it
4. Function always sets `allow_promotion_codes: true`
5. Discount code is **not pre-applied** - user must enter it manually in Stripe UI

---

## Fix Required

**Make `startProductCheckoutSession` and `createLandingCheckoutSession` consistent with `startCreditCheckoutSession`**:

1. ✅ Validate promo code by calling `stripe.coupons.retrieve(promoCode.toUpperCase())`
2. ✅ If valid → use `discounts: [{ coupon: validatedCoupon }]`
3. ✅ If not provided or invalid → use `allow_promotion_codes: true`
4. ✅ **Never set both** `discounts` and `allow_promotion_codes` (mutually exclusive)

---

## Files Fixed

1. ✅ **`app/actions/stripe.ts`** - `startProductCheckoutSession` function (lines 84-247)
2. ✅ **`app/actions/landing-checkout.ts`** - `createLandingCheckoutSession` function (lines 10-165)

## Fix Applied

Both functions now follow the same pattern as `startCreditCheckoutSession`:

1. ✅ Validate promo code by calling `stripe.coupons.retrieve(promoCode.toUpperCase())`
2. ✅ If valid → use `discounts: [{ coupon: validatedCoupon }]`
3. ✅ If not provided or invalid → use `allow_promotion_codes: true`
4. ✅ **Never set both** `discounts` and `allow_promotion_codes` (mutually exclusive per Stripe API)

**Changes Made**:
- Added promo code validation logic (same as `startCreditCheckoutSession`)
- Replaced `allow_promotion_codes: true` with conditional logic
- Added proper error handling for invalid promo codes
- Added logging for debugging

---

## Testing Checklist

After fix:
- [ ] Discount code in URL pre-applies correctly (e.g., `/checkout/blueprint?promo=test100`)
- [ ] Invalid discount code doesn't break checkout (falls back to `allow_promotion_codes: true`)
- [ ] No discount code still allows promotion codes in Stripe UI
- [ ] Credit purchases still work (regression test)
- [ ] Authenticated blueprint checkout works with discount codes
- [ ] Unauthenticated blueprint checkout works with discount codes
