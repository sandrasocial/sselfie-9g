# Free Blueprint → Paid Blueprint Upsell Flow Audit

## Problem Statement

Audit the upsell/upgrade flow from free blueprint (free signup) to paid blueprint after the one free image generation. Compare with other working upsell/upgrade flows to identify inconsistencies.

## Flow Overview

### Free Blueprint → Paid Blueprint Upsell Flow

1. **User completes free blueprint signup** → Gets access to feed planner
2. **User generates ONE free image** → Single 9:16 grid image
3. **User sees upsell CTA** → "Unlock Full Feed Planner" button
4. **User clicks CTA** → Navigates to `/checkout/blueprint`
5. **Checkout page creates session** → Redirects to `/checkout?client_secret=...`
6. **User completes payment** → Webhook processes purchase
7. **Success page polls access** → Redirects to `/feed-planner?purchase=success`

---

## Detailed Flow Analysis

### 1. ✅ Upsell CTA Trigger (CORRECT)

**Location**: `components/feed-planner/feed-single-placeholder.tsx` (line 177)

**Implementation**:
```tsx
<Link href="/checkout/blueprint">
  <Button>Unlock Full Feed Planner</Button>
</Link>
```

**Status**: ✅ Simple, direct navigation - works correctly

**Comparison with Other Flows**:
- **Membership Upgrade**: Uses `handleUpgrade()` → `/api/landing/checkout` → redirects to `/checkout?client_secret=...`
- **Credit Purchase**: Uses `startCreditCheckoutSession()` → embedded checkout modal
- **One-Time Session**: Uses `startEmbeddedCheckout()` → embedded checkout

**Issue**: ⚠️ **No promo code support** - Other flows support promo codes via URL params, but free blueprint upsell doesn't pass any context

---

### 2. ✅ Checkout Page (MOSTLY CORRECT)

**Location**: `app/checkout/blueprint/page.tsx`

**Implementation**:
- Checks feature flag
- Extracts promo code from URL params (supports multiple param names)
- Checks if user is authenticated
- **Authenticated**: Uses `startProductCheckoutSession("paid_blueprint", promoCode)`
- **Unauthenticated**: Uses `createLandingCheckoutSession("paid_blueprint", promoCode)`
- Redirects to `/checkout?client_secret=...&product_type=paid_blueprint`

**Status**: ✅ Correctly handles both authenticated and unauthenticated users
✅ Supports promo codes (if passed via URL)
✅ Uses same checkout functions as other flows

**Comparison with Other Flows**:
- **Membership Checkout** (`app/checkout/membership/page.tsx`): Similar pattern, uses `createLandingCheckoutSession`
- **One-Time Checkout** (`app/checkout/one-time/page.tsx`): Similar pattern, uses `startEmbeddedCheckout`

**Issue**: ⚠️ **No context passed from upsell CTA** - The Link in `feed-single-placeholder.tsx` doesn't pass any context (feedId, userId, etc.) that could be useful for tracking

---

### 3. ✅ Checkout Session Creation (CONSISTENT)

**Functions Used**:
- `startProductCheckoutSession("paid_blueprint", promoCode)` - for authenticated users
- `createLandingCheckoutSession("paid_blueprint", promoCode)` - for unauthenticated users

**Status**: ✅ Both functions now validate and apply promo codes (fixed in previous audit)
✅ Both use same Stripe Price ID pattern
✅ Both set correct metadata (`product_type: "paid_blueprint"`)

**Comparison with Other Flows**:
- **Credit Purchase**: Uses `startCreditCheckoutSession()` - similar pattern
- **Membership**: Uses `createLandingCheckoutSession()` - same function
- **One-Time**: Uses `startEmbeddedCheckout()` - different function but similar pattern

**Issue**: ✅ **No issues found** - Consistent with other flows

---

### 4. ✅ Universal Checkout Page (CONSISTENT)

**Location**: `app/checkout/page.tsx`

**Implementation**:
- Extracts `client_secret` from URL
- Extracts `product_type` from URL
- Renders Stripe EmbeddedCheckout
- On completion, redirects to `/checkout/success?session_id=...&email=...&type=paid_blueprint`

**Status**: ✅ Works correctly for all product types
✅ Passes `product_type` to success page

**Comparison with Other Flows**:
- ✅ **All flows use same universal checkout page** - Consistent

---

### 5. ⚠️ Webhook Processing (MOSTLY CORRECT, BUT HAS ISSUES)

**Location**: `app/api/webhooks/stripe/route.ts` (lines 946-1184)

**Implementation**:
- Detects `product_type === "paid_blueprint"` from session metadata
- Checks if payment is confirmed (`isPaymentPaid`)
- Creates/updates subscription entry in `subscriptions` table
- Stores payment in `stripe_payments` table
- Tags contact in Resend/Flodesk
- **Does NOT grant credits** (correct - paid blueprint doesn't use credits)

**Status**: ✅ Correctly processes paid blueprint purchases
✅ Creates subscription entry
✅ Stores payment record
✅ Tags contacts

**Comparison with Other Flows**:
- **Credit Purchase**: Grants credits via `addCredits()`
- **Membership**: Grants credits via `grantMonthlyCredits()` (on invoice.payment_succeeded)
- **One-Time Session**: Grants credits via `grantOneTimeSessionCredits()`

**Issues Found**:

1. ⚠️ **Missing user_id in metadata for unauthenticated users**
   - `createLandingCheckoutSession` doesn't set `user_id` in metadata (user doesn't exist yet)
   - Webhook tries to find user by email, but if user creation fails, subscription might not be created
   - **Impact**: Unauthenticated users might not get subscription entry if account creation fails

2. ⚠️ **No feedId tracking**
   - Upsell CTA doesn't pass `feedId` to checkout
   - Checkout doesn't store `feedId` in metadata
   - Webhook doesn't track which feed triggered the purchase
   - **Impact**: Can't track conversion funnel (which free feed led to purchase)

3. ⚠️ **Success page polling might timeout**
   - Success page polls `/api/feed-planner/access` for up to 60 seconds
   - If webhook is slow, user might see timeout message
   - **Impact**: Poor UX if webhook takes > 60 seconds

---

### 6. ⚠️ Success Page Handling (HAS ISSUES)

**Location**: `components/checkout/success-content.tsx` (lines 97-162)

**Implementation**:
- For `paid_blueprint`, polls `/api/feed-planner/access` every 2 seconds
- Waits for `isPaidBlueprint: true` before redirecting
- Timeout after 60 seconds (30 attempts × 2s)
- Redirects to `/feed-planner?purchase=success`

**Status**: ⚠️ **Works but has issues**

**Comparison with Other Flows**:
- **Credit Purchase**: Redirects immediately to `/maya` (no polling needed)
- **Membership**: Uses same polling pattern (but for different access check)
- **One-Time Session**: Uses account creation form (different flow)

**Issues Found**:

1. ⚠️ **Polling timeout too short**
   - 60 seconds might not be enough if webhook is slow
   - Other flows don't have this issue (credits are granted immediately)

2. ⚠️ **No error handling for polling failures**
   - If `/api/feed-planner/access` returns 500, polling continues until timeout
   - User sees timeout message even if webhook completed successfully

3. ⚠️ **Redirect URL doesn't preserve context**
   - Redirects to `/feed-planner?purchase=success` but doesn't pass `feedId`
   - User might not see their original feed after purchase

---

## Critical Issues Summary

### 🔴 HIGH PRIORITY

1. **Missing feedId tracking in upsell flow**
   - Upsell CTA doesn't pass `feedId` to checkout
   - Can't track which free feed led to purchase
   - **Fix**: Add `feedId` to checkout URL: `/checkout/blueprint?feedId=...`

2. **Unauthenticated user subscription creation might fail**
   - If account creation fails in webhook, subscription might not be created
   - **Fix**: Ensure subscription is created even if account creation fails (use email as fallback)

### 🟡 MEDIUM PRIORITY

3. **Success page polling timeout too short**
   - 60 seconds might not be enough for slow webhooks
   - **Fix**: Increase timeout to 120 seconds or add retry logic

4. **No error handling for polling failures**
   - If API returns 500, user sees timeout even if webhook succeeded
   - **Fix**: Add better error handling and retry logic

5. **Redirect doesn't preserve feedId**
   - User redirected to generic `/feed-planner` instead of their specific feed
   - **Fix**: Pass `feedId` through checkout flow and redirect to `/feed-planner?feedId=...`

### 🟢 LOW PRIORITY

6. **No promo code support in upsell CTA**
   - Link doesn't support promo codes (but checkout page does)
   - **Fix**: Add optional promo code support to upsell CTA

---

## Comparison with Working Flows

### Membership Upgrade Flow (WORKING)

1. User clicks "Upgrade" → Calls `/api/landing/checkout`
2. API creates session → Redirects to `/checkout?client_secret=...`
3. User completes payment → Webhook processes
4. Success page → Redirects to `/studio` or `/maya`

**Key Differences**:
- ✅ Uses API route instead of direct Link
- ✅ Can pass context (user tier, source, etc.)
- ✅ Success page redirects to specific page

### Credit Purchase Flow (WORKING)

1. User clicks "Buy Credits" → Opens modal
2. Modal calls `startCreditCheckoutSession()` → Embedded checkout
3. User completes payment → Webhook processes
4. Success page → Redirects immediately to `/maya` (no polling)

**Key Differences**:
- ✅ Uses embedded checkout (no page navigation)
- ✅ No polling needed (credits granted immediately)
- ✅ Better UX (stays in app)

---

## Recommendations

### Immediate Fixes

1. **Add feedId to upsell CTA**
   ```tsx
   <Link href={`/checkout/blueprint?feedId=${feedId}`}>
   ```

2. **Store feedId in checkout metadata**
   ```typescript
   metadata: {
     ...existingMetadata,
     feed_id: feedId, // if provided
   }
   ```

3. **Increase success page polling timeout**
   ```typescript
   const MAX_POLL_ATTEMPTS = 60 // 120 seconds total
   ```

### Future Improvements

1. **Use embedded checkout for upsell** (like credit purchase)
   - Better UX (no page navigation)
   - Can pass more context
   - Stays in feed planner

2. **Add conversion tracking**
   - Track which free feed led to purchase
   - Track time between free image generation and purchase
   - Track conversion rate by feed style/category

3. **Improve error handling**
   - Better error messages if webhook fails
   - Retry logic for polling
   - Fallback redirect if polling fails

---

## Testing Checklist

- [ ] Free blueprint signup → Generate free image → Click upsell CTA
- [ ] Checkout page loads with correct product type
- [ ] Promo code works (if passed via URL)
- [ ] Authenticated user checkout works
- [ ] Unauthenticated user checkout works
- [ ] Webhook creates subscription entry
- [ ] Success page polls and redirects correctly
- [ ] User can access full feed planner after purchase
- [ ] feedId is tracked (if fix is applied)

---

## Conclusion

The free blueprint → paid blueprint upsell flow is **mostly consistent** with other flows, but has **several issues**:

1. ✅ **Checkout flow is correct** - Uses same functions as other flows
2. ⚠️ **Missing context tracking** - No feedId passed through flow
3. ⚠️ **Success page polling has issues** - Timeout too short, no error handling
4. ⚠️ **Unauthenticated user handling** - Subscription might not be created if account creation fails

**Overall Assessment**: Flow works but needs improvements for better tracking and UX.
