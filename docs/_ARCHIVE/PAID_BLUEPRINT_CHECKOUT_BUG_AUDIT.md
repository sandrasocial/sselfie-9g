# Paid Blueprint Checkout Bug Audit

**Date:** 2026-01-10  
**Mode:** BUG AUDIT MODE ONLY  
**Status:** CRITICAL PRODUCTION BUG

---

## BUG DESCRIPTION

### Observed Behavior
After checkout of paid blueprint (for both users who already signed up and completed the free blueprint and users who have not completed the free blueprint), Stripe checkout completes and returns paid users to the Maya screen instead of the Blueprint screen.

The 60 credits associated with the paid blueprint are not added to the user's account.

When entering the Blueprint screen after purchase, users who have already completed their free one-time grid, captions, and strategy only see their completed free blueprint inside the Blueprint screen and not the embedded Feed Planner with feature flags enabled.

They are not able to create their 30 photos with context from their onboarding wizard and are stuck with only their completed free blueprint.

### Expected Behavior (from Implementation Plan)
After successful paid Blueprint checkout:
- User should be redirected into the paid Blueprint experience
- 60 credits should be granted
- Blueprint screen should unlock paid state with embedded Feed Planner
- Feature flags should enable photo generation (30 photos) using onboarding context

---

## 1. REPRODUCTION PATH (CODE-BASED)

### Entry Point
**File:** `app/checkout/blueprint/page.tsx`  
**Action:** User initiates paid Blueprint checkout from Blueprint-related CTA  
**Flow:** Server-side page creates Stripe checkout session (authenticated: `startProductCheckoutSession`, unauthenticated: `createLandingCheckoutSession`)

### Checkout Session Creation
**Authenticated Users:**  
- **File:** `app/actions/stripe.ts`  
- **Function:** `startProductCheckoutSession(productId: string)` (lines 84-206)  
- **Metadata:** Includes `user_id` in session metadata (line 197)  
- **Redirect:** Redirects to `/checkout?client_secret=${clientSecret}&product_type=paid_blueprint`

**Unauthenticated Users:**  
- **File:** `app/actions/landing-checkout.ts`  
- **Function:** `createLandingCheckoutSession(productId: string, promoCode?: string)` (lines 10-217)  
- **Metadata:** Includes product type in metadata (lines 194-200)  
- **Redirect:** Same as authenticated users

### User Action
**File:** `app/checkout/page.tsx`  
**Component:** `CheckoutContent` (lines 12-169)  
**Handler:** `handleComplete` (lines 38-78)  
**Action:** User completes Stripe embedded checkout successfully  
**Redirect Logic:** Extracts `product_type` from query params or session metadata, redirects to `/checkout/success?session_id=${sessionId}&email=${email}&type=${productType}`

### Post-Checkout Redirect
**File:** `app/checkout/success/page.tsx`  
**Component:** `SuccessContent` (imported from `components/checkout/success-content.tsx`)  
**Auto-Redirect Logic:** Lines 76-95 in `success-content.tsx`  
```typescript
if (user && (purchaseType === "credit_topup" || purchaseType === "paid_blueprint")) {
  const redirectPath = purchaseType === "paid_blueprint"
    ? "/studio?tab=blueprint&purchase=success"
    : "/studio"
  setTimeout(() => {
    router.push(redirectPath)
  }, 2000)
}
```
**Observed:** Redirect path is correctly set to `/studio?tab=blueprint&purchase=success` but user lands on Maya screen

### Webhook Processing (Asynchronous)
**File:** `app/api/webhooks/stripe/route.ts`  
**Event Handler:** `checkout.session.completed` (lines 944-1338)  
**Credit Grant:** Line 1067 calls `grantPaidBlueprintCredits(userId, paymentIntentId, isTestMode)`  
**Subscription Creation:** Lines 1086-1126 create subscription entry with `product_type='paid_blueprint'` and `status='active'`  
**Blueprint Update:** Lines 1128-1330 update `blueprint_subscribers` table with `paid_blueprint_purchased=TRUE`

### UI State Resolution
**File:** `components/sselfie/blueprint-screen.tsx`  
**Entitlement Check:** Line 378 checks `entitlement?.type === "paid" || entitlement?.type === "studio"`  
**Feed Planner Render:** Lines 381-419 render `FeedViewScreen` if `isPaidBlueprint && hasStrategy`  
**API Endpoint:** `/api/blueprint/state` returns entitlement via `getBlueprintEntitlement(userId)`

---

## 2. STATE & DATA AT FAILURE POINT

### Client State
- **Authenticated user session:** Valid (user completes checkout successfully)
- **UI believes user is:** Blueprint completed (free), not entitled to paid blueprint features
- **Client-visible paid state flag:** `entitlement?.type` remains `"free"` instead of `"paid"`
- **Redirect parameter:** `purchase=success` present in URL but not used to refresh entitlement data

### Server State (Webhook Processing)
**Credit Grant Execution:**
- **Function:** `grantPaidBlueprintCredits` in `lib/credits.ts` (lines 400-421)
- **Expected:** Grants 60 credits via `addCredits(userId, 60, "purchase", "Paid Blueprint purchase (60 credits)", stripePaymentId, isTestMode)`
- **Condition:** Only executes if `userId && isPaymentPaid` (line 1065)
- **Potential Failure:** If `userId` not found in session metadata, credits are not granted (line 1077-1080)

**Subscription Entry Creation:**
- **Location:** Lines 1086-1126 in webhook handler
- **Expected:** Creates subscription with `product_type='paid_blueprint'` and `status='active'`
- **Condition:** Only executes if `userId && isPaymentPaid` (line 1086)
- **Potential Failure:** If `userId` not found, subscription is not created

**Blueprint Subscriber Update:**
- **Location:** Lines 1128-1330 in webhook handler
- **Expected:** Updates `blueprint_subscribers` with `paid_blueprint_purchased=TRUE`
- **Condition:** Executes if `userId` OR `customerEmail` found
- **Potential Failure:** If neither found, update fails silently (catch block at line 1330)

### DB Values (After Webhook)
**Credit Balance:**
- **Table:** `user_credits`
- **Expected:** Balance increased by 60
- **Observed:** Balance unchanged (missing +60)
- **Transaction Record:** Expected in `credit_transactions` table with `transaction_type='purchase'` and `description='Paid Blueprint purchase (60 credits)'`

**Subscription Entry:**
- **Table:** `subscriptions`
- **Expected:** Row with `user_id`, `product_type='paid_blueprint'`, `status='active'`
- **Observed:** Either missing or `status!='active'`

**Blueprint Subscriber:**
- **Table:** `blueprint_subscribers`
- **Expected:** `paid_blueprint_purchased=TRUE`, `paid_blueprint_purchased_at` set, `paid_blueprint_stripe_payment_id` set
- **Observed:** `paid_blueprint_purchased` remains `FALSE` or `NULL`

### URL / Cookies / localStorage
- **Redirect Parameter:** `purchase=success` present in URL (`/studio?tab=blueprint&purchase=success`)
- **Tab Parameter:** `tab=blueprint` present in URL
- **Checkout Context:** No persisted context to influence post-checkout routing or state refresh
- **localStorage:** Not used for checkout state (as per implementation plan)

### Missing / Stale / Overwritten
- **Missing:** Credit transaction row (`credit_transactions` table)
- **Missing:** Paid blueprint subscription entry (`subscriptions` table with `product_type='paid_blueprint'`)
- **Missing or Stale:** Blueprint entitlement refresh (client doesn't refetch entitlement after redirect)
- **Overwritten or Defaulted:** Post-checkout redirect target (correct path set but tab initialization may fail)

---

## 3. SOURCE OF TRUTH MISMATCH

### Identified Issues

**Payment Confirmed but Entitlement Not Reflected:**
- **Stripe:** Payment succeeds, webhook receives `checkout.session.completed` event
- **Application State:** Credits not granted, subscription not created or not active, UI shows free blueprint state

**Multiple Sources of Truth:**
1. **Stripe** (payment confirmation) - ✅ Payment succeeds
2. **DB credits table** (`user_credits`, `credit_transactions`) - ❌ Credits not granted
3. **DB subscriptions table** - ❌ Subscription not created or not active
4. **DB blueprint_subscribers table** - ❌ `paid_blueprint_purchased` not set to `TRUE`
5. **Feature flag system** - ❌ Entitlement check returns `"free"` instead of `"paid"`

### Evidence Chain

**Webhook Processing:**
- Webhook handler receives `checkout.session.completed` event
- Product type detection: `productType === "paid_blueprint"` (line 944)
- Credit grant: `grantPaidBlueprintCredits` called (line 1067) BUT only if `userId && isPaymentPaid`
- Subscription creation: Lines 1086-1126 BUT only if `userId && isPaymentPaid`
- Blueprint update: Lines 1128-1330 BUT may fail if user lookup fails

**Entitlement Resolution:**
- **Function:** `getBlueprintEntitlement` in `lib/subscription.ts` (lines 149-225)
- **Check Order:** 1) Studio Membership, 2) Paid Blueprint (line 180), 3) Free (default)
- **Paid Blueprint Check:** `hasPaidBlueprint(userId)` (line 180)
  - **Implementation:** Checks `subscriptions` table for `product_type='paid_blueprint'` AND `status='active'` (lines 122-132)
- **Result:** Returns `"free"` if subscription not found or not active

**UI Rendering:**
- **BlueprintScreen:** Line 378 checks `entitlement?.type === "paid" || entitlement?.type === "studio"`
- **Feed Planner Render:** Lines 381-419 only render if `isPaidBlueprint && hasStrategy`
- **Result:** Since `entitlement.type === "free"`, `isPaidBlueprint` is `false`, so Feed Planner never renders

### Client and Server Disagreement
- **Client:** Fetches entitlement from `/api/blueprint/state` → returns `type: "free"` because subscription not found
- **Server:** Webhook processing may have failed or not completed yet (race condition)
- **Result:** Client renders free blueprint state even though payment succeeded

---

## 4. FAILURE CLASSIFICATION

### Primary Classification
**Missing Persistence**
- Credits not granted to database
- Subscription entry not created or not active
- Blueprint subscriber state not updated
- Root cause: Webhook processing failure OR missing `user_id` in session metadata OR race condition between redirect and webhook

### Secondary Contributing Failures

**State Loss:**
- Redirect happens before webhook processing completes
- Client doesn't refetch entitlement after redirect
- `purchase=success` URL parameter not used to trigger entitlement refresh

**Invalid Assumption:**
- Assumption that webhook processing completes before user reaches Studio
- Assumption that `user_id` is always present in session metadata (authenticated users)
- Assumption that entitlement API will return updated state immediately after webhook

**Side-Effect Ordering:**
- Redirect happens before entitlement resolution
- UI renders before entitlement data refreshed
- No polling or retry mechanism to wait for webhook completion

---

## 5. SCOPE OF IMPACT

### Who is Affected
**All paid users purchasing Blueprint:**
- Users who completed free blueprint (have `blueprint_subscribers` record with `user_id`)
- Users who did not complete free blueprint (may not have `blueprint_subscribers` record)

### User Types
- **New users:** Purchasing paid blueprint as first action
- **Returning users:** Upgrading from free to paid blueprint
- **Paid users:** Already purchased, expecting access to Feed Planner

### Severity
**CRITICAL**
- **Revenue Impact:** Payment collected but product access blocked
- **User Experience:** User is stuck with no path forward
- **Business Risk:** Users cannot access purchased features, support burden, potential refunds

---

## 6. BUG SUMMARY (NO FIX)

The paid Blueprint purchase flow completes successfully in Stripe, but the application fails to persist and reflect the paid entitlement. 

**Root Cause Analysis:**
1. **Webhook Processing Failure:** Credits and subscription may not be granted if `user_id` is missing from session metadata or if webhook processing fails silently
2. **Race Condition:** Client redirect happens before webhook processing completes, causing UI to render with stale entitlement data
3. **Missing State Refresh:** Client doesn't refetch entitlement after redirect, even though `purchase=success` parameter is present
4. **Entitlement Resolution Failure:** `getBlueprintEntitlement` checks `subscriptions` table for `product_type='paid_blueprint'` AND `status='active'`, but subscription may not exist or may not be active

**Impact Chain:**
- Stripe payment succeeds → Webhook receives event → Credits not granted → Subscription not created → Entitlement returns `"free"` → UI renders free blueprint state → User cannot access paid features

**Critical Failure Points:**
1. Credit grant execution (line 1067 in webhook handler) requires `userId && isPaymentPaid`
2. Subscription creation (line 1086 in webhook handler) requires `userId && isPaymentPaid`
3. Entitlement API (`/api/blueprint/state`) depends on subscription existing in database
4. UI rendering (`BlueprintScreen`) depends on entitlement type being `"paid"` or `"studio"`

**Evidence Required for Fix:**
- Webhook logs to confirm credit grant execution
- Database queries to verify subscription entry existence
- Database queries to verify credit transaction existence
- Client-side logs to verify entitlement API response
- Timing analysis to confirm race condition between redirect and webhook

---

**END OF AUDIT**
