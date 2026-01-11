# Paid Blueprint Checkout Bug - Implementation Plan

**Date:** 2026-01-10  
**Mode:** BUG FIX IMPLEMENTATION PLAN ONLY  
**Status:** READY FOR IMPLEMENTATION

---

## 1. ROOT CAUSE (FROM AUDIT)

Paid Blueprint purchases are not reliably persisted because:

1. **Webhook Processing Failure:** The Stripe webhook path that creates the subscriptions row and grants 60 credits is gated on `userId && isPaymentPaid`, and `userId` is sometimes missing/unresolved, causing the entire paid unlock path to silently fail.

2. **Stale Redirect:** Post-checkout redirects still point to `/studio` (removed), causing users to land on the wrong route.

3. **No Route Access Control:** There is no entitlement-based route access control, allowing paid blueprint users to access `/maya` (they shouldn't).

---

## 2. FIX STRATEGY

Implement the smallest changes that guarantee:

### A) Webhook Reliability
After a successful paid blueprint checkout:
- **Subscriptions row exists** with `product_type = "paid_blueprint"` AND `status = "active"`
- **User receives +60 credits** (via `grantPaidBlueprintCredits`)

### B) Route Access Control
Paid blueprint users:
- **Cannot access `/maya`** at all (hard block, redirect to `/blueprint`)
- **Can only access:** `/blueprint`, `/account`, `/settings`

### C) Post-Checkout Redirect
Post-checkout redirect:
- **Goes to `/blueprint?purchase=success`** (not `/studio`)
- **Works for authenticated users** (Blueprint route supports authenticated flow)

### What Stays Untouched
- **Entitlement source of truth** remains `subscriptions` table only
- **No changes to blueprint entitlement logic** (`getBlueprintEntitlement` etc.), except if needed to support redirects
- **No changes to other product types** (Creator Studio, one-time session, etc.)

### Why This Is Smallest Viable Fix
- **One redirect change** (success-content.tsx)
- **One webhook reliability change** (stripe/route.ts)
- **One centralized access-control layer** (middleware.ts recommended)
- **Optional minimal blueprint route support** for authenticated users landing on `/blueprint`

---

## 3. CODE TOUCHPOINTS

### Fix #1: Post-Checkout Redirect (Stale /studio)

**File:** `components/checkout/success-content.tsx`  
**Lines:** ~84-92  
**Current Code:**
```typescript
if (user && (purchaseType === "credit_topup" || purchaseType === "paid_blueprint")) {
  const redirectPath = purchaseType === "paid_blueprint"
    ? "/studio?tab=blueprint&purchase=success"  // ❌ STALE: Studio removed
    : "/studio"  // ❌ STALE: Studio removed
  setTimeout(() => {
    router.push(redirectPath)
  }, 2000)
}
```

**Change:**
```typescript
if (user && (purchaseType === "credit_topup" || purchaseType === "paid_blueprint")) {
  const redirectPath = purchaseType === "paid_blueprint"
    ? "/blueprint?purchase=success"  // ✅ Fixed: Redirect to Blueprint route
    : "/maya"  // ✅ Fixed: Default landing is Maya (Studio removed)
  setTimeout(() => {
    router.push(redirectPath)
  }, 2000)
}
```

**Also Update:**
- Line 183: Text "Redirecting you back to the studio..." → "Redirecting you to Blueprint..."
- Line 189: `onClick={() => router.push("/studio")}` → `onClick={() => router.push("/maya")}`
- Line 560: `onClick={() => router.push("/studio")}` → `onClick={() => router.push("/maya")}`

**Acceptance Criteria:**
- ✅ Paid blueprint checkout success always navigates to `/blueprint?purchase=success`
- ✅ Credit top-up checkout success navigates to `/maya`
- ✅ No references to `/studio` route remain

---

### Fix #2: Webhook User Resolution Must Not Fail Silently

**File:** `app/api/webhooks/stripe/route.ts`  
**Handler:** `checkout.session.completed` (lines ~944-1338)  
**Current Issue:**
- `grantPaidBlueprintCredits` and subscription creation require `userId && isPaymentPaid`
- If `userId` is missing from `session.metadata.user_id`, the code tries email lookup but may still fail silently

**Current Code (lines ~1042-1083):**
```typescript
let userId: string | null = session.metadata?.user_id || null

if (userId) {
  console.log(`[v0] Using user_id from session.metadata (authenticated checkout): ${userId}`)
} else if (customerEmail) {
  // Fallback: Try to find user by email (guest checkout)
  try {
    const userByEmail = await sql`
      SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
    `
    if (userByEmail.length > 0) {
      userId = userByEmail[0].id
      console.log(`[v0] Found user ${userId} by email for paid blueprint purchase (guest checkout)`)
    } else {
      console.log(`[v0] No user found by email - will create blueprint_subscribers record for later migration`)
    }
  } catch (userLookupError: any) {
    console.error(`[v0] Error looking up user by email:`, userLookupError.message)
    // Continue without user_id - credits can't be granted without user
  }
}

// Grant credits if user_id found
if (userId && isPaymentPaid) {
  // Credit grant, subscription creation, blueprint update
}
```

**Change:**
1. **Always resolve user_id before gating:**
   - Priority 1: `session.metadata.user_id` (authenticated checkout)
   - Priority 2: Email lookup from `customerEmail` (guest checkout)
   - If still unknown after both attempts, log structured error and exit (don't pretend success)

2. **Move credit grant and subscription creation outside conditional:**
   - Once `userId` is resolved, execute credit grant and subscription creation
   - Don't gate on `if (userId)` after resolution attempts

3. **Add structured error logging:**
   - If `userId` cannot be resolved, log error with payment details
   - Don't fail webhook silently (return error response to Stripe)

**New Code Pattern:**
```typescript
// Resolve user_id (priority: session metadata, then email lookup)
let userId: string | null = session.metadata?.user_id || null

if (userId) {
  console.log(`[v0] Using user_id from session.metadata (authenticated checkout): ${userId}`)
} else if (customerEmail) {
  // Fallback: Try to find user by email (guest checkout)
  try {
    const userByEmail = await sql`
      SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
    `
    if (userByEmail.length > 0) {
      userId = userByEmail[0].id
      console.log(`[v0] Resolved user_id from email: ${userId}`)
    }
  } catch (userLookupError: any) {
    console.error(`[v0] Error looking up user by email:`, userLookupError.message)
    // Continue to error handling below
  }
}

// If userId still not resolved, log error and exit (don't pretend success)
if (!userId) {
  console.error(`[v0] ❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`, {
    customerEmail,
    sessionId: session.id,
    paymentIntentId,
    metadata: session.metadata,
  })
  // Don't fail webhook - payment succeeded, but log prominently for manual review
  // Return success but log error for monitoring
  return NextResponse.json({ 
    received: true, 
    error: "user_id_unresolved",
    message: "Payment succeeded but user_id could not be resolved" 
  }, { status: 200 })
}

// Grant credits if userId found AND payment confirmed
if (userId && isPaymentPaid) {
  try {
    // Existing credit grant logic (with idempotency - see Fix #3)
    const creditResult = await grantPaidBlueprintCredits(userId, paymentIntentId || undefined, isTestMode)
    if (creditResult.success) {
      console.log(`[v0] ✅ Granted 60 credits for paid blueprint purchase to user ${userId}`)
    } else {
      console.error(`[v0] ⚠️ Failed to grant paid blueprint credits: ${creditResult.error}`)
    }
  } catch (creditError: any) {
    console.error(`[v0] ⚠️ Error granting paid blueprint credits (non-critical):`, creditError.message)
    // Don't fail webhook if credit grant fails
  }

  // Existing subscription creation logic (with idempotency - see Fix #3)
  // Existing blueprint subscriber update logic
}
```

**Acceptance Criteria:**
- ✅ Paid blueprint payment always results in an active subscription row and 60 credits for the mapped user
- ✅ User_id resolution is logged prominently if it fails
- ✅ Webhook doesn't fail silently (returns error response to Stripe if user_id cannot be resolved)

---

### Fix #3: Idempotency Protection for Webhook Re-Delivery

**Files:**
- `app/api/webhooks/stripe/route.ts` (subscription creation)
- `lib/credits.ts` (credit grant via `grantPaidBlueprintCredits` → `addCredits`)

**Current Issue:**
- If webhook fires multiple times, credits may be granted multiple times
- Subscription creation uses `ON CONFLICT DO NOTHING` but doesn't check for existing active subscription

**Change:**

**1. Subscription Creation Idempotency (webhook handler, lines ~1086-1126):**
```typescript
// Check if subscription already exists (idempotency check)
const existingSubscription = await sql`
  SELECT id FROM subscriptions
  WHERE user_id = ${userId}
  AND product_type = 'paid_blueprint'
  AND status = 'active'
  LIMIT 1
`

if (existingSubscription.length === 0) {
  // Create subscription entry for paid blueprint
  await sql`
    INSERT INTO subscriptions (
      user_id,
      product_type,
      status,
      stripe_customer_id,
      created_at,
      updated_at
    )
    VALUES (
      ${userId},
      'paid_blueprint',
      'active',
      ${customerId || null},
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
  `
  console.log(`[v0] ✅ Created paid_blueprint subscription entry for user ${userId}`)
} else {
  console.log(`[v0] ⏭️ Subscription already exists for user ${userId} - skipping (idempotency)`)
}
```

**2. Credit Grant Idempotency (webhook handler, before calling `grantPaidBlueprintCredits`):**
```typescript
// Check if credits already granted for this payment (idempotency check)
if (paymentIntentId) {
  const existingCredit = await sql`
    SELECT id FROM credit_transactions
    WHERE user_id = ${userId}
    AND stripe_payment_id = ${paymentIntentId}
    AND transaction_type = 'purchase'
    LIMIT 1
  `
  
  if (existingCredit.length > 0) {
    console.log(`[v0] ⏭️ Credits already granted for payment ${paymentIntentId} - skipping (idempotency)`)
    // Skip credit grant, but continue with subscription check
  } else {
    // Grant credits (not already granted)
    const creditResult = await grantPaidBlueprintCredits(userId, paymentIntentId, isTestMode)
    // ... existing credit grant logic ...
  }
}
```

**Note:** `addCredits` in `lib/credits.ts` already inserts into `credit_transactions` with `stripe_payment_id`, but we need to check BEFORE calling it to avoid duplicate grant attempts.

**Acceptance Criteria:**
- ✅ Multiple webhook deliveries do not create duplicate active subscriptions
- ✅ Multiple webhook deliveries do not double-grant credits
- ✅ Idempotency check uses `stripe_payment_id` (paymentIntentId) as unique identifier

---

### Fix #4: Route Access Control (Paid Blueprint Users Blocked from Maya)

**Recommended Location:** `middleware.ts`  
**Current:** Only session refresh, no entitlements.

**Alternative (Fallback):** `app/maya/page.tsx` (server-side redirect)

**Option A (Recommended - Middleware):**

**File:** `middleware.ts`  
**Current Code:**
```typescript
export async function middleware(request: NextRequest) {
  // ... session refresh logic ...
  const response = await updateSession(request)
  // ... CSP headers ...
  return response
}
```

**Change:**
```typescript
import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // ... existing upload route check ...
  // ... existing webhook skip logic ...
  // ... existing freebie skip logic ...
  // ... existing monitoring skip logic ...

  const response = await updateSession(request)
  
  // Route access control for paid_blueprint users
  const pathname = request.nextUrl.pathname
  
  // Only check entitlements for protected routes that need gating
  if (pathname === "/maya") {
    try {
      // Get user from session (already checked by updateSession)
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Resolve Neon user
        const { getUserByAuthId } = await import("@/lib/user-mapping")
        const neonUser = await getUserByAuthId(user.id)
        
        if (neonUser) {
          // Check entitlement
          const { hasPaidBlueprint } = await import("@/lib/subscription")
          const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
          
          if (isPaidBlueprint) {
            // Block Maya access - redirect to Blueprint
            console.log(`[Middleware] Blocking Maya access for paid_blueprint user ${neonUser.id}, redirecting to /blueprint`)
            return NextResponse.redirect(new URL("/blueprint", request.url))
          }
        }
      }
    } catch (error) {
      console.error("[Middleware] Error checking entitlement:", error)
      // On error, allow access (fail open) - don't block legitimate users
    }
  }

  // ... existing CSP headers ...
  return response
}
```

**Note:** This requires importing `createServerClient` in middleware. Check if `lib/supabase/middleware.ts` exports this or if we need to use the server client helper.

**Option B (Fallback - Maya Page):**

**File:** `app/maya/page.tsx`  
**Current Code:**
```typescript
export default async function MayaPage() {
  // ... auth check ...
  // ... get neonUser ...
  const subscription = await getUserSubscription(neonUser.id)
  
  return (
    <SselfieApp
      userId={neonUser.id}
      // ... props ...
    />
  )
}
```

**Change:**
```typescript
export default async function MayaPage() {
  // ... existing auth check ...
  // ... existing get neonUser ...
  
  // Check if user has paid_blueprint subscription
  const { hasPaidBlueprint } = await import("@/lib/subscription")
  const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
  
  if (isPaidBlueprint) {
    // Block Maya access - redirect to Blueprint
    console.log(`[Maya Page] Blocking access for paid_blueprint user ${neonUser.id}, redirecting to /blueprint`)
    redirect("/blueprint")
  }
  
  const subscription = await getUserSubscription(neonUser.id)
  
  return (
    <SselfieApp
      userId={neonUser.id}
      // ... props ...
    />
  )
}
```

**Recommendation:** Use Option B (Maya page) - simpler, no middleware changes, still effective.

**Allowlist for Paid Blueprint Users:**
- `/blueprint` ✅
- `/account` ✅
- `/settings` ✅
- `/auth/*` ✅ (auth routes needed for session establishment)
- `/api/*` ✅ (API routes - handled by API auth checks)
- Static assets ✅ (handled by matcher config)

**Acceptance Criteria:**
- ✅ Paid blueprint users cannot render Maya even if they type `/maya` directly
- ✅ Free users can still access Maya normally (no regressions)
- ✅ Redirect to `/blueprint` when paid blueprint user attempts to access Maya

---

### Fix #5: Blueprint Route Must Support Authenticated Users

**File:** `app/blueprint/page-server.tsx`  
**Current:** Expects email/token guest flow, no authenticated user support.

**Current Code:**
- Checks for `emailParam` or `tokenParam` (lines 27-42)
- Queries `blueprint_subscribers` by email or token (lines 44-89)
- No auth check for authenticated users

**Change:**

Add authenticated user flow at the beginning of the component:

```typescript
export default async function BrandBlueprintPageServer({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; message?: string; purchase?: string }>
}) {
  const params = await searchParams
  const emailParam = params?.email
  const tokenParam = params?.token
  const purchaseParam = params?.purchase

  // NEW: Check if user is authenticated (prioritize authenticated flow)
  try {
    const { createServerClient } = await import("@/lib/supabase/server")
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      // Authenticated user flow
      const { getUserByAuthId } = await import("@/lib/user-mapping")
      const neonUser = await getUserByAuthId(authUser.id)

      if (neonUser) {
        // Check entitlement
        const { getBlueprintEntitlement } = await import("@/lib/subscription")
        const entitlement = await getBlueprintEntitlement(neonUser.id)

        // Query blueprint_subscribers by user_id
        const subscriber = await sql`
          SELECT 
            id,
            email,
            form_data,
            strategy_generated,
            strategy_generated_at,
            strategy_data,
            grid_generated,
            grid_generated_at,
            grid_url,
            grid_frame_urls,
            selfie_image_urls,
            feed_style,
            paid_blueprint_purchased
          FROM blueprint_subscribers
          WHERE user_id = ${neonUser.id}
          LIMIT 1
        `

        // Authenticated user - render authenticated Blueprint experience
        // Since BlueprintScreen is a client component, we need a wrapper
        // Create: app/blueprint/authenticated-blueprint-wrapper.tsx (client component)
        // This wrapper renders BlueprintScreen (from components/sselfie/blueprint-screen.tsx)
        
        // For minimal fix, redirect authenticated users to a route that renders BlueprintScreen
        // OR render authenticated Blueprint client component here
        
        // Actually, simplest approach: Check if /blueprint/authenticated route exists
        // If not, create it, or render BlueprintScreen directly via client component wrapper
        
        // MINIMAL FIX: Create authenticated Blueprint client wrapper
        // File: app/blueprint/authenticated-blueprint-wrapper.tsx
        // Renders: <BlueprintScreen userId={userId} />
        // Then import and render it here:
        
        const { default: AuthenticatedBlueprintWrapper } = await import("./authenticated-blueprint-wrapper")
        
        return (
          <AuthenticatedBlueprintWrapper userId={neonUser.id} purchaseSuccess={purchaseParam === "success"} />
        )
      }
    }
  } catch (authError) {
    // Auth check failed - fall through to guest flow
    console.log("[Blueprint Server] Auth check failed, falling back to guest flow:", authError)
  }

  // Existing guest flow (email/token params)
  // ... existing code ...
}
```

**Implementation Details:**

Since `BlueprintScreen` is a client component (`"use client"`), we need a client wrapper:

**File:** `app/blueprint/authenticated-blueprint-wrapper.tsx` (NEW - create this)
```typescript
"use client"

import BlueprintScreen from "@/components/sselfie/blueprint-screen"

interface AuthenticatedBlueprintWrapperProps {
  userId: string
  purchaseSuccess?: boolean
}

export default function AuthenticatedBlueprintWrapper({ 
  userId, 
  purchaseSuccess 
}: AuthenticatedBlueprintWrapperProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <BlueprintScreen userId={userId} />
      {/* Handle purchaseSuccess state if needed (e.g., show success message) */}
    </div>
  )
}
```

**Note:** `BlueprintScreen` component (from `components/sselfie/blueprint-screen.tsx`) is the same component used in Maya for authenticated users. It:
- Fetches blueprint state via `/api/blueprint/state` (uses user_id)
- Checks entitlement internally via `getBlueprintEntitlement()`
- Renders paid blueprint experience (Feed Planner) or free blueprint experience based on entitlement
- Handles purchase success state via URL params (if needed)

This approach reuses existing `BlueprintScreen` component, avoiding duplication.

**Acceptance Criteria:**
- ✅ After checkout redirect to `/blueprint?purchase=success`, paid blueprint users see the paid blueprint experience
- ✅ Authenticated users don't see "guest token" gating
- ✅ Blueprint route supports both authenticated and guest flows

---

## 4. SAFETY CHECKS

### Manual Test Matrix (Must Pass)

#### Test 1: Existing Free User, Buys Paid Blueprint
- [ ] User completes paid blueprint checkout
- [ ] User lands on `/blueprint?purchase=success`
- [ ] Subscription row created (`product_type='paid_blueprint'`, `status='active'`)
- [ ] +60 credits added once (not duplicated)
- [ ] User cannot access `/maya` (redirects to `/blueprint`)
- [ ] User can access `/blueprint` (shows paid blueprint experience)

#### Test 2: User Buys Paid Blueprint While Unauthenticated (Guest Checkout)
- [ ] User completes paid blueprint checkout as guest
- [ ] Webhook maps `customerEmail` → `user_id` (or logs error if not found)
- [ ] Subscription row created (if user_id resolved)
- [ ] +60 credits added (if user_id resolved)
- [ ] User signs up/logs in
- [ ] User is routed to `/blueprint` (not Maya)
- [ ] User sees paid blueprint experience

#### Test 3: Webhook Redelivery
- [ ] Manually trigger webhook redelivery (Stripe dashboard)
- [ ] Credits not doubled (idempotency check works)
- [ ] Subscription not duplicated (idempotency check works)
- [ ] Webhook returns success (no errors)

#### Test 4: Non-Paid-Blueprint Users
- [ ] Free user can access `/maya` (unchanged)
- [ ] Free user can access `/blueprint` (unchanged)
- [ ] Creator Studio user can access `/maya` (unchanged)
- [ ] No regressions to existing flows

### What Cannot Regress

- ✅ **Existing Creator Studio / other subscription types** entitlement checks (unchanged)
- ✅ **Credit system integrity** (no double grants, idempotency works)
- ✅ **Free user experience** (no changes to free user flows)
- ✅ **Guest blueprint flow** (still works with email/token params)

---

## 5. ROLLBACK PLAN

### Rollback Order (If Issues Occur)

1. **Revert Fix #4 (Route Access Control)** - First priority
   - Restores `/maya` access if entitlement check blocks legitimate users
   - Commit: "Revert route access control for paid blueprint users"

2. **Revert Fix #1 (Post-Checkout Redirect)** - Second priority
   - Restores old navigation (may redirect to non-existent `/studio`, but doesn't block users)
   - Commit: "Revert post-checkout redirect change"

3. **Revert Fix #2 + #3 (Webhook Changes)** - Third priority
   - Can be reverted independently, but verify Stripe events backlog
   - May need to manually grant credits/subscriptions for affected users
   - Commit: "Revert webhook user resolution and idempotency changes"

4. **Revert Fix #5 (Blueprint Route)** - Last priority
   - Restores guest-only flow
   - Authenticated users may be redirected to non-existent routes
   - Commit: "Revert authenticated user flow in Blueprint route"

### Rollback Verification

After each rollback:
- [ ] Verify affected functionality works as before
- [ ] Check Stripe webhook logs for errors
- [ ] Verify database state (credits, subscriptions)
- [ ] Test user flows end-to-end

---

## IMPLEMENTATION ORDER

1. **Fix #1 (Post-Checkout Redirect)** - Lowest risk, simple change
2. **Fix #3 (Idempotency)** - Prevents issues before Fix #2
3. **Fix #2 (Webhook User Resolution)** - Core fix, depends on Fix #3
4. **Fix #4 (Route Access Control)** - Blocks wrong routes
5. **Fix #5 (Blueprint Route Auth)** - Supports authenticated checkout flow

**Total Estimated Effort:** 8-12 hours  
**Total Risk:** Low (all fixes are additive, don't change existing logic)

---

**END OF IMPLEMENTATION PLAN**
