# Paid Blueprint Routing - Code Confirmation

**Date:** 2026-01-10  
**Purpose:** Confirm current routing state after Studio removal, identify where fixes are needed

---

## CURRENT REALITY (CONFIRMED)

### Architecture Status
- ✅ **Studio is removed** (user confirms, even though `/app/studio/page.tsx` still exists in codebase - treat as deprecated)
- ✅ **Maya is the first screen** (`/app/maya/page.tsx` exists, renders `SselfieApp`)
- ✅ **Blueprint route exists** (`/app/blueprint/page.tsx` → `page-server.tsx` → `page-client.tsx`)
- ❌ **No route access control** (middleware.ts doesn't check entitlements)

### Paid Blueprint User Requirements
- ✅ **Must NOT access Maya** (currently no enforcement)
- ✅ **May only access:**
  - `/blueprint`
  - `/account` (if exists)
  - `/settings` (if exists)

### Entitlement Source of Truth (CONFIRMED)
- ✅ **Primary:** `subscriptions.product_type === "paid_blueprint" AND subscriptions.status === "active"`
- ✅ **NOT:** `blueprint_subscribers.paid_blueprint_purchased` (updated by webhook, but not used for entitlement)

---

## WHERE POST-CHECKOUT REDIRECT IS DECIDED

### Current Location
**File:** `components/checkout/success-content.tsx`  
**Lines:** 76-95

**Current Code:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)

    // Decision 2: Auto-redirect authenticated users to Studio
    if (user && (purchaseType === "credit_topup" || purchaseType === "paid_blueprint")) {
      const redirectPath = purchaseType === "paid_blueprint"
        ? "/studio?tab=blueprint&purchase=success"  // ❌ STALE: Studio doesn't exist
        : "/studio"  // ❌ STALE: Studio doesn't exist
      setTimeout(() => {
        router.push(redirectPath)
      }, 2000)
    }
  }
  checkAuth()
}, [purchaseType, router])
```

**Problem:**
- Redirects to `/studio?tab=blueprint&purchase=success` (Studio is removed)
- Should redirect to `/blueprint?purchase=success`

**Fix Location:** `components/checkout/success-content.tsx` (lines 84-92)

---

## WHERE ROUTE ACCESS CONTROL SHOULD BE ENFORCED

### Current State
**File:** `middleware.ts`  
**Lines:** 1-58

**Current Code:**
```typescript
export async function middleware(request: NextRequest) {
  // ... session refresh logic ...
  const response = await updateSession(request)
  // ... CSP headers ...
  return response
}
```

**Problem:**
- No entitlement checking
- No route access control
- No redirect logic for paid_blueprint users

### Where Access Control Should Be Added

**Option 1 (Recommended):** Add to `middleware.ts`
- Pros: Centralized, runs on every request, fast
- Cons: Requires DB query in middleware (may be slow)
- Implementation: Check entitlement before returning response, redirect if needed

**Option 2:** Add to route pages (`app/maya/page.tsx`)
- Pros: Easier to implement, no middleware changes
- Cons: Duplicated logic if multiple routes need gating
- Implementation: Check entitlement in page component, redirect if paid_blueprint

**Option 3:** Add to layout (`app/layout.tsx` or route-specific layout)
- Pros: Runs on route group, can gate multiple routes
- Cons: Less granular than middleware
- Implementation: Check entitlement in layout, redirect if needed

**Recommended:** Option 1 (middleware.ts) for hard enforcement, Option 2 (maya/page.tsx) as backup

---

## MAYA ROUTE CURRENT STATE

### File: `app/maya/page.tsx`
**Lines:** 1-65

**Current Code:**
```typescript
export default async function MayaPage() {
  // ... auth check ...
  // ... get neonUser ...
  const subscription = await getUserSubscription(neonUser.id)
  
  return (
    <SselfieApp
      userId={neonUser.id}
      userName={neonUser.display_name}
      userEmail={neonUser.email}
      // ... props ...
    />
  )
}
```

**Problem:**
- No entitlement check
- No redirect for paid_blueprint users
- Renders SselfieApp regardless of subscription type

**Fix Location:** `app/maya/page.tsx` (add entitlement check before render)

---

## BLUEPRINT ROUTE CURRENT STATE

### File: `app/blueprint/page-server.tsx`
**Lines:** 1-181

**Current Code:**
- Handles guest flow (email/token params)
- Redirects paid users to `/blueprint/paid?access=...` (line 111)
- No authenticated user flow (expects email/token params)

**Problem:**
- Not designed for authenticated users (no auth check)
- No `/blueprint?purchase=success` handling
- Assumes guest flow with email/token

**Fix Location:** `app/blueprint/page-server.tsx` (add authenticated user flow)

---

## STALE CODE REFERENCES

The following files still reference Studio (treat as deprecated):

1. **`app/page.tsx`** (line 74): Redirects to `/studio` if user authenticated
2. **`app/auth/callback/route.ts`** (line 181): Redirects to `/studio`
3. **`app/auth/confirm/route.ts`** (line 11): Defaults `next` to `/studio`
4. **`app/auth/login/page.tsx`** (line 21): Defaults `returnTo` to `/studio`
5. **`components/checkout/success-content.tsx`** (lines 84-92): Redirects to `/studio`
6. **`app/studio/page.tsx`**: Entire file (deprecated, but still exists)

**Note:** These should be updated to redirect to `/maya` (for free users) or `/blueprint` (for paid_blueprint users), but that's out of scope for this fix.

---

## ANSWER TO USER QUESTIONS

### Q1: Where is the post-checkout redirect decided now?
**Answer:** `components/checkout/success-content.tsx` (lines 76-95)

**Current:** Redirects to `/studio?tab=blueprint&purchase=success` (STALE - Studio removed)  
**Should be:** Redirects to `/blueprint?purchase=success`

---

### Q2: Where is route access control enforced?
**Answer:** **NOWHERE** (middleware.ts doesn't have entitlement checks)

**Current:** No route access control exists  
**Should be:** Added to `middleware.ts` (recommended) or `app/maya/page.tsx` (fallback)

**Implementation Needed:**
1. Check entitlement for authenticated users
2. If `subscriptions.product_type === "paid_blueprint" AND status === "active"`
3. Block access to `/maya` (redirect to `/blueprint`)
4. Allow access to `/blueprint`, `/account`, `/settings`

---

## RECOMMENDED FIX LOCATIONS

### Fix #1: Post-Checkout Redirect
**File:** `components/checkout/success-content.tsx`  
**Lines:** 84-92  
**Change:** Update redirect path from `/studio?tab=blueprint&purchase=success` to `/blueprint?purchase=success`

### Fix #2: Route Access Control
**File:** `middleware.ts` (recommended) OR `app/maya/page.tsx` (fallback)  
**Change:** Add entitlement check, redirect paid_blueprint users from `/maya` to `/blueprint`

---

**END OF CONFIRMATION**
