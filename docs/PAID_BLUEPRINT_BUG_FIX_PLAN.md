# Paid Blueprint Checkout Bug - Fix Plan (UPDATED)

**Based on:** [PAID_BLUEPRINT_CHECKOUT_BUG_AUDIT.md](./PAID_BLUEPRINT_CHECKOUT_BUG_AUDIT.md)  
**Updated:** 2026-01-10 (After architecture refactor - Studio removed, Maya is default)  
**Status:** FIX PLAN (Minimal + Safe Approach)

---

## CURRENT REALITY (CONFIRMED)

### Architecture Status
- ✅ **Studio is removed** (Maya is the first screen in the app)
- ✅ **Maya is default landing** (`/app/maya/page.tsx` exists)
- ✅ **Blueprint route exists** (`/app/blueprint/page.tsx` → authenticated flow needed)
- ❌ **No route access control** (paid_blueprint users can access Maya - they shouldn't)

### Paid Blueprint User Requirements
- ✅ **Must NOT access Maya** (hard block required)
- ✅ **May only access:**
  - `/blueprint`
  - `/account` (if exists)
  - `/settings` (if exists)

---

## SOURCE OF TRUTH CONFIRMATION

**Question:** Is "paid blueprint" meant to behave like a subscription row, or should entitlement be read from `blueprint_subscribers.paid_blueprint_purchased`?

**Answer (from Implementation Plan):**

The implementation plan explicitly states that paid blueprint entitlement comes from the `subscriptions` table:

```typescript
// From docs/BLUEPRINT_AUTH_IMPLEMENTATION_PLAN.md (line 285)
return subscription?.product_type === "paid_blueprint" && subscription?.status === "active"
```

**Source of Truth: `subscriptions` table**
- **Primary:** `subscriptions.product_type = 'paid_blueprint'` AND `status = 'active'`
- **Secondary:** `blueprint_subscribers.paid_blueprint_purchased = TRUE` (updated for reference, but not used for entitlement)

**Current Implementation:**
- `getBlueprintEntitlement()` in `lib/subscription.ts` checks `subscriptions` table (lines 179-197)
- `hasPaidBlueprint()` checks `subscriptions` table (lines 122-132)
- `blueprint_subscribers.paid_blueprint_purchased` is updated by webhook but NOT used for entitlement resolution

**Decision:** Keep `subscriptions` table as source of truth (as per implementation plan). Do NOT change to `blueprint_subscribers.paid_blueprint_purchased`.

---

## BUG CLASSIFICATION (UPDATED)

### Bug #1: Webhook/User Mapping (Entitlement & Credits Not Persisting)
**Root Cause:** Webhook processing requires `userId && isPaymentPaid`, but if `user_id` is missing from session metadata, the entire paid unlock path silently fails.

**Impact:**
- Credits not granted (60 credits)
- Subscription not created (`product_type='paid_blueprint'`, `status='active'`)
- Blueprint subscriber not updated (`paid_blueprint_purchased=TRUE`)
- Entitlement returns `"free"` instead of `"paid"`
- UI renders free blueprint state (Feed Planner never shows)

### Bug #2: Route Access Control (Paid Blueprint Users Allowed on Maya)
**Root Cause:** 
1. No route access control exists (middleware.ts doesn't check entitlements)
2. Post-checkout redirect goes to `/studio?tab=blueprint` (STALE - Studio removed)
3. Maya route (`app/maya/page.tsx`) doesn't check entitlement before rendering
4. Paid blueprint users land on Maya (they shouldn't)

**Impact:**
- Paid blueprint users can access `/maya` (should be blocked)
- Post-checkout redirect goes to wrong route (`/studio` doesn't exist)
- No enforcement of "paid blueprint users must NOT access Maya"
- User experience broken (wrong screen after purchase)

---

## WHERE FIXES ARE NEEDED (CODE CONFIRMATION)

### Post-Checkout Redirect
**File:** `components/checkout/success-content.tsx`  
**Lines:** 84-92  
**Current:** Redirects to `/studio?tab=blueprint&purchase=success` (STALE - Studio removed)  
**Should be:** Redirects to `/blueprint?purchase=success`

### Route Access Control
**File:** `middleware.ts` (recommended) OR `app/maya/page.tsx` (fallback)  
**Current:** No entitlement checking exists  
**Should be:** Check entitlement, redirect paid_blueprint users from `/maya` to `/blueprint`

---

## FIX PLAN (MINIMAL + SAFE)

### Fix #1: Webhook Must Always Resolve the User

**Location:** `app/api/webhooks/stripe/route.ts` (lines 1039-1083)

**Current Code:**
```typescript
let userId: string | null = session.metadata?.user_id || null

if (userId) {
  // Process credits, subscription, blueprint update
} else if (customerEmail) {
  // Try to find user by email (guest checkout)
  // But if not found, silently fails
}
```

**Problem:** If `userId` is missing AND email lookup fails, nothing happens.

**Fix:**
1. **Always resolve user from email if `user_id` missing:**
   - If `session.metadata?.user_id` exists, use it (authenticated checkout)
   - If missing, resolve from `customerEmail` using existing user mapping utilities
   - Use `getUserByAuthId()` or email lookup from `users` table
   - If still not found, log error but continue (for later migration)

2. **Ensure credit grant executes:**
   - Move credit grant logic outside of `if (userId)` check
   - Grant credits if `userId` is found (even if found via email lookup)
   - Log warning if `userId` still missing (non-critical, but visible)

3. **Ensure subscription creation executes:**
   - Move subscription creation logic outside of `if (userId)` check
   - Create subscription if `userId` is found (even if found via email lookup)

**Code Pattern:**
```typescript
// Resolve user_id (prioritize session metadata, fallback to email)
let userId: string | null = session.metadata?.user_id || null

if (!userId && customerEmail) {
  // Try to find user by email (for guest checkout or edge cases)
  const userByEmail = await sql`
    SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
  `
  if (userByEmail.length > 0) {
    userId = userByEmail[0].id
    console.log(`[v0] Resolved user_id from email: ${userId}`)
  }
}

// Grant credits if userId found (regardless of how it was resolved)
if (userId && isPaymentPaid) {
  // Existing credit grant logic
  await grantPaidBlueprintCredits(userId, paymentIntentId, isTestMode)
  // Existing subscription creation logic
  // Existing blueprint subscriber update logic
} else if (!userId) {
  console.warn(`[v0] ⚠️ No user_id found for paid blueprint purchase - will retry when user signs up`)
}
```

**Estimated Effort:** 1-2 hours  
**Risk:** Low (adds fallback logic, doesn't change existing flow)  
**Testing:**
- Test authenticated checkout (user_id in metadata) → Should work as before
- Test guest checkout (user_id missing, email present) → Should resolve user_id from email
- Test edge case (user_id missing, email not found) → Should log warning, not fail webhook

---

### Fix #2: Post-Checkout UI Refresh Entitlement

**Location:** `components/checkout/success-content.tsx` (lines 76-95)

**Current Code:**
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

**Problem:** Redirect happens immediately, no entitlement refresh.

**Fix:**
1. **Add entitlement polling before redirect:**
   - If `purchaseType === "paid_blueprint"` AND user authenticated
   - Poll `/api/blueprint/state` until `entitlement.type === "paid"` (or timeout after 10 seconds)
   - Then redirect to `/studio?tab=blueprint&purchase=success`
   - If timeout, still redirect (webhook may complete later)

2. **Alternative (Simpler):** Add entitlement refresh after redirect:
   - Redirect to `/studio?tab=blueprint&purchase=success`
   - Studio page detects `purchase=success` param
   - Studio page triggers entitlement refresh on mount
   - BlueprintScreen polls for entitlement update (short window, e.g., 10 seconds)

**Recommended Approach:** Poll before redirect (cleaner UX, user sees success message while waiting)

**Code Pattern:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)

    if (user && purchaseType === "paid_blueprint") {
      // Poll for entitlement update (webhook processing)
      let attempts = 0
      const MAX_ATTEMPTS = 20 // 10 seconds (500ms intervals)
      
      const pollEntitlement = async () => {
        try {
          const response = await fetch("/api/blueprint/state")
          const data = await response.json()
          
          if (data.entitlement?.type === "paid") {
            // Entitlement updated, redirect to Blueprint screen
            router.push("/studio?tab=blueprint&purchase=success")
            return
          }
          
          attempts++
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(pollEntitlement, 500)
          } else {
            // Timeout - redirect anyway (webhook may complete later)
            router.push("/studio?tab=blueprint&purchase=success")
          }
        } catch (error) {
          console.error("[v0] Error polling entitlement:", error)
          // On error, redirect anyway
          router.push("/studio?tab=blueprint&purchase=success")
        }
      }
      
      // Start polling after 1 second delay (give webhook time to start)
      setTimeout(pollEntitlement, 1000)
    } else if (user && purchaseType === "credit_topup") {
      // Credit top-up: redirect immediately (no entitlement check needed)
      router.push("/studio")
    }
  }
  checkAuth()
}, [purchaseType, router])
```

**Estimated Effort:** 2-3 hours  
**Risk:** Low (adds polling, doesn't change redirect logic)  
**Testing:**
- Test paid blueprint checkout → Should poll for entitlement, then redirect
- Test timeout scenario → Should redirect after 10 seconds even if entitlement not updated
- Test error scenario → Should redirect on error (graceful degradation)

---

### Fix #3: Fix Post-Checkout Redirect Target

**Location:** `components/checkout/success-content.tsx` (lines 84-92)

**Current Issue:** Redirect goes to `/studio?tab=blueprint&purchase=success`, but Studio is removed (Maya is default landing).

**Root Cause:**
- Post-checkout redirect still references `/studio` (stale code)
- Should redirect to `/blueprint?purchase=success` (Blueprint route for authenticated users)

**Fix:**
1. **Update redirect path:**
   - Change from `/studio?tab=blueprint&purchase=success` to `/blueprint?purchase=success`
   - Remove Studio references (Studio is removed)

2. **Ensure Blueprint route handles authenticated users:**
   - Check if `/blueprint` route supports authenticated users (currently expects email/token params)
   - If not, may need to add authenticated user flow to `app/blueprint/page-server.tsx`

**Code Pattern:**
```typescript
// In components/checkout/success-content.tsx (lines 84-92)
if (user && (purchaseType === "credit_topup" || purchaseType === "paid_blueprint")) {
  const redirectPath = purchaseType === "paid_blueprint"
    ? "/blueprint?purchase=success"  // ✅ Fixed: Redirect to Blueprint route
    : "/maya"  // ✅ Fixed: Default landing is Maya (Studio removed)
  setTimeout(() => {
    router.push(redirectPath)
  }, 2000)
}
```

**Estimated Effort:** 1 hour  
**Risk:** Low (simple redirect path change)  
**Testing:**
- Test paid blueprint checkout → Should redirect to `/blueprint?purchase=success`
- Test credit top-up checkout → Should redirect to `/maya`
- Verify Blueprint route handles authenticated users (may need additional fix)

---

### Fix #4: Add Route Access Control (Block Maya for Paid Blueprint Users)

**Location:** `middleware.ts` (recommended) OR `app/maya/page.tsx` (fallback)

**Current Issue:** Paid blueprint users can access `/maya` (they shouldn't - must be hard blocked).

**Root Cause:**
- No route access control exists in middleware
- Maya route doesn't check entitlement before rendering
- Paid blueprint users land on Maya after checkout (wrong screen)

**Fix Options:**

**Option A (Recommended):** Add to `middleware.ts`
- Check entitlement for authenticated users on `/maya` route
- If `subscriptions.product_type === "paid_blueprint" AND status === "active"`
- Redirect to `/blueprint`
- Pros: Centralized, runs on every request
- Cons: Requires DB query in middleware (may be slow, but acceptable)

**Option B (Fallback):** Add to `app/maya/page.tsx`
- Check entitlement in page component
- If paid_blueprint, redirect to `/blueprint`
- Pros: Easier to implement, no middleware changes
- Cons: Less centralized (but still works)

**Code Pattern (Option A - Middleware):**
```typescript
// In middleware.ts (after updateSession)
const pathname = request.nextUrl.pathname

// Check if user is authenticated (from updateSession)
if (user && pathname === "/maya") {
  try {
    // Get Neon user
    const { getUserByAuthId } = await import("@/lib/user-mapping")
    const neonUser = await getUserByAuthId(user.id)
    
    if (neonUser) {
      // Check entitlement
      const { hasPaidBlueprint } = await import("@/lib/subscription")
      const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
      
      if (isPaidBlueprint) {
        // Block Maya access - redirect to Blueprint
        return NextResponse.redirect(new URL("/blueprint", request.url))
      }
    }
  } catch (error) {
    console.error("[Middleware] Error checking entitlement:", error)
    // On error, allow access (fail open)
  }
}

return response
```

**Code Pattern (Option B - Maya Page):**
```typescript
// In app/maya/page.tsx (before render)
const { hasPaidBlueprint } = await import("@/lib/subscription")
const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)

if (isPaidBlueprint) {
  // Block Maya access - redirect to Blueprint
  redirect("/blueprint")
}

// Continue with normal Maya render
return <SselfieApp ... />
```

**Recommended:** Option B (Maya page) - simpler, no middleware changes, still effective

**Estimated Effort:** 2-3 hours  
**Risk:** Low (adds entitlement check, doesn't change existing logic)  
**Testing:**
- Test paid blueprint user accessing `/maya` → Should redirect to `/blueprint`
- Test free user accessing `/maya` → Should render Maya normally (unchanged)
- Test paid blueprint user accessing `/blueprint` → Should render Blueprint (unchanged)

---

### Fix #5: Add Idempotency Protection

**Location:** `app/api/webhooks/stripe/route.ts` (credit grant and subscription creation)

**Current Code:**
- Credit grant: `grantPaidBlueprintCredits()` → `addCredits()` → Inserts into `credit_transactions`
- Subscription creation: Inserts into `subscriptions` with `ON CONFLICT DO NOTHING`

**Problem:** If webhook fires twice, credits may be granted twice (no idempotency check).

**Fix:**
1. **Credit grant idempotency:**
   - Check if credit transaction already exists for this `stripePaymentId`
   - If exists, skip grant (already processed)
   - Use existing `credit_transactions.stripe_payment_id` column

2. **Subscription creation idempotency:**
   - Already has `ON CONFLICT DO NOTHING` (line 1116)
   - But should check `user_id + product_type` conflict
   - Ensure unique constraint exists on `(user_id, product_type)` where `status='active'`

**Code Pattern:**
```typescript
// Before granting credits, check if already granted
if (userId && isPaymentPaid && paymentIntentId) {
  const existingCredit = await sql`
    SELECT id FROM credit_transactions
    WHERE user_id = ${userId}
    AND stripe_payment_id = ${paymentIntentId}
    AND transaction_type = 'purchase'
    LIMIT 1
  `
  
  if (existingCredit.length === 0) {
    // Grant credits (not already granted)
    await grantPaidBlueprintCredits(userId, paymentIntentId, isTestMode)
  } else {
    console.log(`[v0] Credits already granted for payment ${paymentIntentId}, skipping`)
  }
}
```

**Estimated Effort:** 1-2 hours  
**Risk:** Low (adds idempotency check, prevents duplicate grants)  
**Testing:**
- Test webhook duplicate → Should skip credit grant (already granted)
- Test webhook first time → Should grant credits normally
- Test subscription creation → Should not create duplicate subscription

---

## IMPLEMENTATION ORDER

1. **Fix #1 (Webhook User Resolution)** - Highest priority (fixes root cause)
2. **Fix #5 (Idempotency)** - High priority (prevents duplicate grants)
3. **Fix #2 (Entitlement Refresh)** - Medium priority (fixes race condition UX)
4. **Fix #3 (Post-Checkout Redirect)** - Medium priority (fixes redirect target - Studio removed)
5. **Fix #4 (Route Access Control)** - Medium priority (blocks Maya for paid_blueprint users)

**Total Estimated Effort:** 7-11 hours  
**Total Risk:** Low (all fixes are additive, don't change existing logic)

---

## TESTING CHECKLIST

### Fix #1: Webhook User Resolution
- [ ] Test authenticated checkout (user_id in metadata) → Credits granted, subscription created
- [ ] Test guest checkout (user_id missing, email present) → User resolved from email, credits granted
- [ ] Test edge case (user_id missing, email not found) → Warning logged, webhook doesn't fail

### Fix #2: Entitlement Refresh
- [ ] Test paid blueprint checkout → Polls for entitlement, redirects when `type === "paid"`
- [ ] Test timeout (webhook slow) → Redirects after 10 seconds
- [ ] Test error scenario → Redirects on error (graceful)

### Fix #3: Post-Checkout Redirect
- [ ] Test paid blueprint checkout → Redirects to `/blueprint?purchase=success`
- [ ] Test credit top-up checkout → Redirects to `/maya`
- [ ] Verify Blueprint route handles authenticated users (may need additional fix)

### Fix #4: Route Access Control
- [ ] Test paid blueprint user accessing `/maya` → Redirects to `/blueprint`
- [ ] Test free user accessing `/maya` → Renders Maya normally (unchanged)
- [ ] Test paid blueprint user accessing `/blueprint` → Renders Blueprint (unchanged)

### Fix #5: Idempotency
- [ ] Test webhook duplicate → Skips credit grant (already granted)
- [ ] Test webhook first time → Grants credits normally
- [ ] Test subscription creation → No duplicate subscription

---

## ROLLOUT PLAN

1. **Deploy Fix #1 + #4 first** (webhook fixes - server-side only)
2. **Monitor webhook logs** for 24 hours
3. **Deploy Fix #2 + #3** (client-side fixes)
4. **Test end-to-end** with real checkout
5. **Monitor user reports** for 48 hours

---

**END OF FIX PLAN**
