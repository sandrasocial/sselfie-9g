# Blueprint Checkout & Payment Success Logic Audit

## Objective
Audit current Blueprint checkout/payment success logic and identify inconsistencies with other payment flows (one-time session and membership) to ensure consistency with embedded Stripe checkout patterns.

## Current Payment Flows Comparison

### 1️⃣ MEMBERSHIP CHECKOUT FLOW (Reference Implementation)

**Entry Point:** `/checkout/membership/page.tsx`
- Server component creates checkout session on page load
- Uses `createLandingCheckoutSession("sselfie_studio_membership", promoCode)`
- Redirects to: `/checkout?client_secret={secret}`

**Checkout Page:** `/checkout/page.tsx`
- Universal embedded checkout page
- Handles `handleComplete` callback
- Extracts `session_id` from `client_secret`
- Fetches session data from `/api/checkout-session?session_id={id}`
- Redirects to: `/checkout/success?session_id={id}&email={email}&type={product_type}`

**Success Page:** `/checkout/success/page.tsx`
- Shows success content
- For `credit_topup`: Auto-redirects to `/studio` after 2 seconds
- For membership: Shows order confirmation, redirects to `/studio`

**Webhook:** `/api/webhooks/stripe/route.ts`
- Processes `checkout.session.completed`
- Creates subscription entry
- Grants credits (150/month for membership)
- Sends welcome email

---

### 2️⃣ ONE-TIME SESSION CHECKOUT FLOW (Reference Implementation)

**Entry Point:** `/checkout/one-time/page.tsx`
- Server component creates checkout session on page load
- Uses `createLandingCheckoutSession("one_time_session", promoCode)`
- Redirects to: `/checkout?client_secret={secret}`

**Checkout Page:** `/checkout/page.tsx` (SAME as membership)

**Success Page:** `/checkout/success/page.tsx`
- Shows success content
- Polls for user info via `/api/user-by-email?email={email}`
- If no account: Shows account creation form
- If account exists: Shows order confirmation, redirects to `/studio`

**Webhook:** `/api/webhooks/stripe/route.ts`
- Processes `checkout.session.completed`
- Grants credits (60 for one-time session)
- Creates account if new user
- Sends welcome email

---

### 3️⃣ PAID BLUEPRINT CHECKOUT FLOW (Current Implementation)

**Entry Point:** `/checkout/blueprint/page.tsx`
- ✅ Server component creates checkout session on page load
- ✅ Uses `createLandingCheckoutSession("paid_blueprint", promoCode)`
- ✅ Redirects to: `/checkout?client_secret={secret}&product_type=paid_blueprint`
- ✅ **CONSISTENT** with membership/one-time pattern

**Checkout Page:** `/checkout/page.tsx` (SAME as membership/one-time)
- ✅ **CONSISTENT** - uses universal checkout page

**Success Page:** `/checkout/success/page.tsx`
- ❌ **INCONSISTENCY #1:** Paid blueprint has custom polling logic
- ❌ **INCONSISTENCY #2:** Fetches access token via `/api/blueprint/get-access-token?email={email}`
- ❌ **INCONSISTENCY #3:** Redirects to `/blueprint/paid?access={token}` (OLD GUEST TOKEN SYSTEM)
- ❌ **INCONSISTENCY #4:** Should redirect to `/studio?tab=blueprint&purchase=success` for authenticated users

**Webhook:** `/api/webhooks/stripe/route.ts`
- ✅ Creates subscription entry (`product_type='paid_blueprint'`)
- ✅ Grants 60 credits for paid blueprint
- ❌ **INCONSISTENCY #5:** Creates/updates `blueprint_subscribers` with access token (OLD GUEST SYSTEM)
- ❌ **INCONSISTENCY #6:** Should link to `user_id` if user is authenticated (from `session.metadata.user_id`)

---

## 🔴 CRITICAL INCONSISTENCIES FOUND

### INCONSISTENCY #1: Success Page Redirect Logic

**Current (Blueprint):**
```
Success → Fetch access token → Redirect to /blueprint/paid?access={token}
```

**Expected (Consistent with other flows):**
```
Success → Check if authenticated → Redirect to /studio?tab=blueprint&purchase=success
```

**Problem:** 
- Uses old guest token system (`/blueprint/paid?access={token}`)
- Doesn't leverage authenticated user context
- Inconsistent with membership/one-time flows (redirect to `/studio`)

---

### INCONSISTENCY #2: Access Token Polling

**Current (Blueprint):**
- Success page polls `/api/blueprint/get-access-token?email={email}`
- Waits for webhook to create `blueprint_subscribers` record
- Fetches `access_token` for guest access

**Expected (Consistent with other flows):**
- Success page checks if user is authenticated
- If authenticated: Redirect immediately to `/studio?tab=blueprint&purchase=success`
- If not authenticated: Show account creation (same as one-time session)

**Problem:**
- Relies on guest token system instead of authenticated user context
- Creates unnecessary delay (polling for access token)
- Inconsistent with membership/one-time flows (use session data directly)

---

### INCONSISTENCY #3: Webhook User Linking

**Current (Blueprint):**
```typescript
// Webhook creates blueprint_subscribers record with email + access_token
// Only links to user_id if user exists by email lookup
// Falls back to guest token system
```

**Expected (Consistent with other flows):**
```typescript
// Webhook should prioritize user_id from session.metadata.user_id
// Create subscription entry (already done ✅)
// Link blueprint_subscribers to user_id if authenticated
// If not authenticated, create record for later migration
```

**Problem:**
- Doesn't prioritize `session.metadata.user_id` (authenticated checkout)
- Relies on email lookup (can fail if user hasn't signed up yet)
- Creates orphaned guest records

---

### INCONSISTENCY #4: Checkout Session Metadata

**Current (Blueprint):**
- `createLandingCheckoutSession("paid_blueprint")` is called
- **MISSING:** May not include `user_id` in metadata if user is authenticated

**Expected (Consistent with other flows):**
- If user is authenticated, include `user_id` in session metadata
- Webhook can use `session.metadata.user_id` for immediate linking

**Problem:**
- Need to verify if `createLandingCheckoutSession` includes `user_id` for authenticated users
- If missing, webhook can't link to authenticated user

---

### INCONSISTENCY #5: Success Page Product Type Handling

**Current (Blueprint):**
- Success page has special case for `purchaseType === "paid_blueprint"`
- Uses custom polling and redirect logic
- Redirects to guest token URL

**Expected (Consistent with other flows):**
- Success page should handle `paid_blueprint` like other products
- Check authentication status
- Redirect authenticated users to `/studio?tab=blueprint&purchase=success`
- Show account creation for unauthenticated users (same as one-time)

---

## ✅ CONSISTENT ELEMENTS

1. **Checkout Session Creation:** ✅ Uses same `createLandingCheckoutSession` function
2. **Checkout Page:** ✅ Uses universal `/checkout` page with embedded Stripe
3. **Session Metadata:** ✅ Includes `product_type: "paid_blueprint"` in metadata
4. **Webhook Subscription Creation:** ✅ Creates subscription entry correctly
5. **Credit Granting:** ✅ Grants 60 credits (same pattern as one-time session)

---

## 🔧 REQUIRED FIXES

### Fix #1: Update Success Page Redirect Logic

**File:** `components/checkout/success-content.tsx`

**Change:**
- Remove custom `paid_blueprint` polling logic for access token
- Add authentication check
- If authenticated: Redirect to `/studio?tab=blueprint&purchase=success`
- If not authenticated: Show account creation (same as one-time session)

**Code Change:**
```typescript
// REMOVE:
if (purchaseType === "paid_blueprint") {
  // Custom polling for access token...
  // Redirect to /blueprint/paid?access={token}
}

// REPLACE WITH:
if (purchaseType === "paid_blueprint") {
  // Check authentication
  if (isAuthenticated) {
    // Redirect to Studio with Blueprint tab
    router.push("/studio?tab=blueprint&purchase=success")
  } else {
    // Show account creation (same as one-time session)
    // (Use existing account creation flow)
  }
}
```

---

### Fix #2: Update Webhook User Linking

**File:** `app/api/webhooks/stripe/route.ts`

**Change:**
- Prioritize `session.metadata.user_id` for authenticated checkout
- Only create `blueprint_subscribers` with `user_id` if authenticated
- If not authenticated, create record for later migration (email match on signup)

**Code Change:**
```typescript
// Current: Email-based lookup
let userId = session.metadata?.user_id || null
if (!userId && customerEmail) {
  // Email lookup...
}

// Should be:
let userId = session.metadata?.user_id || null // Prioritize authenticated user
if (!userId && customerEmail) {
  // Email lookup (fallback for guest checkout)
}
```

---

### Fix #3: Update Checkout Session Metadata

**File:** `app/actions/landing-checkout.ts`

**Change:**
- If user is authenticated, include `user_id` in session metadata
- Verify `createLandingCheckoutSession` includes user context

**Current Check:**
- Need to verify if authenticated user's `user_id` is included in metadata

---

### Fix #4: Update Success Page to Match Other Flows

**File:** `components/checkout/success-content.tsx`

**Change:**
- Remove `paid_blueprint` special case
- Use same flow as one-time session:
  - Check authentication
  - If authenticated: Auto-redirect to `/studio` after 2 seconds
  - If not authenticated: Show account creation form
  - After account creation: Redirect to `/studio?tab=blueprint&purchase=success`

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] **Fix #1:** Update success page redirect logic for `paid_blueprint`
  - [ ] Remove access token polling
  - [ ] Add authentication check
  - [ ] Redirect authenticated users to `/studio?tab=blueprint&purchase=success`
  - [ ] Show account creation for unauthenticated users

- [ ] **Fix #2:** Update webhook user linking
  - [ ] Prioritize `session.metadata.user_id`
  - [ ] Link `blueprint_subscribers` to `user_id` if authenticated
  - [ ] Handle guest checkout (email-based for later migration)

- [ ] **Fix #3:** Verify checkout session metadata
  - [ ] Check if `createLandingCheckoutSession` includes `user_id` for authenticated users
  - [ ] Update if missing

- [ ] **Fix #4:** Simplify success page logic
  - [ ] Remove `paid_blueprint` special case
  - [ ] Use same flow as one-time session
  - [ ] Add `purchase=success` query param handling in Studio

- [ ] **Test:** End-to-end flow
  - [ ] Authenticated user purchases paid blueprint
  - [ ] Unauthenticated user purchases paid blueprint
  - [ ] Verify redirect to `/studio?tab=blueprint&purchase=success`
  - [ ] Verify credits granted (60 credits)
  - [ ] Verify subscription entry created
  - [ ] Verify `blueprint_subscribers` linked to `user_id`

---

## 🎯 TARGET STATE

After fixes, the paid blueprint checkout flow should be:

1. **User clicks "Upgrade to Paid Blueprint"**
   - Route: `/checkout/blueprint`
   - Creates checkout session (same as membership/one-time)

2. **User completes payment**
   - Universal checkout page (`/checkout`)
   - Embedded Stripe form (same as membership/one-time)

3. **Success redirect**
   - **Authenticated:** `/studio?tab=blueprint&purchase=success` (auto-redirect after 2s)
   - **Not authenticated:** Account creation form → `/studio?tab=blueprint&purchase=success`

4. **Webhook processing**
   - Creates subscription entry (`product_type='paid_blueprint'`)
   - Grants 60 credits
   - Links to `user_id` if authenticated
   - Sends delivery email

5. **User experience**
   - Sees success message in Studio
   - Blueprint tab is active
   - Credits visible
   - Can immediately start using paid blueprint features

---

## 🔍 ADDITIONAL FINDINGS

### Finding #1: Studio Page Purchase Success Handling

**Current:** No handling for `purchase=success` query param in Studio page

**Required:** 
- Studio page should detect `purchase=success` query param
- Show success toast/notification
- Auto-scroll to Blueprint tab if not already active

---

### Finding #2: Blueprint Screen Purchase Success Display

**Current:** `BlueprintScreen` doesn't show purchase success message

**Required:**
- Check for `purchase=success` query param
- Show success message/confetti
- Highlight paid blueprint features

---

## ✅ SUMMARY

**Consistent Elements (6/10):**
1. ✅ Checkout session creation
2. ✅ Universal checkout page
3. ✅ Session metadata structure
4. ✅ Webhook subscription creation
5. ✅ Credit granting logic
6. ✅ Webhook email handling

**Inconsistent Elements (4/10):**
1. ❌ Success page redirect (uses guest token instead of Studio)
2. ❌ Access token polling (unnecessary for authenticated users)
3. ❌ Webhook user linking (should prioritize `user_id`)
4. ❌ Success page product type handling (custom logic instead of standard flow)

**Priority Fixes:**
1. **HIGH:** Update success page redirect (removes guest token dependency)
2. **HIGH:** Update webhook user linking (ensures authenticated user linking)
3. **MEDIUM:** Verify checkout session metadata (ensures user_id is included)
4. **MEDIUM:** Simplify success page logic (matches other flows)

---

## 🚀 NEXT STEPS

1. Implement Fix #1 (Success page redirect)
2. Implement Fix #2 (Webhook user linking)
3. Verify Fix #3 (Checkout session metadata)
4. Implement Fix #4 (Simplify success page)
5. Test end-to-end flow
6. Update Studio page to handle `purchase=success` query param
