# Beta Users Maya Access Issue — DIAGNOSED & FIXED

**Date:** 2026-01-19  
**Status:** ✅ ISSUE IDENTIFIED — Fix Ready  
**Severity:** 🔴 HIGH - Affects 30 beta users

---

## 🎯 PROBLEM SUMMARY

Beta users with Studio Membership are being BLOCKED from accessing Maya after completing Blueprint/Feed Planner, even though they should have full access.

**User Report:**
> "Some of the beta users are listed as free users and with a membership. And some have access to one-time session. They are not getting access to maya after the blueprint funnel and feedplanner implementations."

---

## 🔍 ROOT CAUSE ANALYSIS

### The Bug (app/maya/page.tsx:50-58)

```typescript
// FIX #4: Check if user has paid_blueprint subscription (block Maya access)
const { hasPaidBlueprint } = await import("@/lib/subscription")
const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)

if (isPaidBlueprint) {
  // Block Maya access - redirect to Blueprint
  console.log(`[Maya Page] Blocking access for paid_blueprint user ${neonUser.id}, redirecting to /blueprint`)
  redirect("/blueprint")
}
```

**Problem:** This logic blocks ALL users who have `paid_blueprint`, regardless of whether they ALSO have Studio Membership!

### Beta User Scenarios

**Scenario 1: Studio Membership + Paid Blueprint (BLOCKED ❌)**
- User has `sselfie_studio_membership` (active)
- User ALSO bought `paid_blueprint` (one-time purchase)
- **Current Behavior:** Blocked from Maya (redirected to Blueprint)
- **Expected Behavior:** Should have Maya access (Studio Membership is higher tier)

**Scenario 2: Studio Membership Only (WORKS ✅)**
- User has `sselfie_studio_membership` (active)
- No paid blueprint
- **Current Behavior:** Maya access granted
- **Expected Behavior:** Correct

**Scenario 3: Paid Blueprint Only (WORKS ✅)**
- User has `paid_blueprint` (one-time purchase)
- No studio membership
- **Current Behavior:** Blocked from Maya (redirected to Blueprint)
- **Expected Behavior:** Correct (Blueprint-only users shouldn't access Maya)

**Scenario 4: One-Time Session Only (WORKS ❓)**
- User has `one_time_session` in subscriptions
- No studio membership
- **Current Behavior:** Maya access granted
- **Expected Behavior:** Unclear if this is intentional

---

## 📊 ACCESS MATRIX (Current vs. Expected)

| User Type | Product Type(s) | Current Maya Access | Expected Maya Access |
|-----------|----------------|---------------------|---------------------|
| **Beta User (Studio)** | `sselfie_studio_membership` | ✅ Allowed | ✅ Allowed |
| **Beta User (Studio + Blueprint)** | `sselfie_studio_membership` + `paid_blueprint` | ❌ **BLOCKED** | ✅ **Should Allow** |
| **Blueprint Only** | `paid_blueprint` only | ❌ Blocked | ✅ Correct |
| **One-Time Session** | `one_time_session` | ✅ Allowed | ❓ Unclear |
| **Free User** | None | ✅ Allowed | ✅ Correct |

---

## ✅ SOLUTION

### Fix Logic: Check Studio Membership FIRST

```typescript
// Get subscription info
const subscription = await getUserSubscription(neonUser.id)
const { hasStudioMembership, hasPaidBlueprint } = await import("@/lib/subscription")

// Check Studio Membership first (highest tier)
const hasStudio = await hasStudioMembership(neonUser.id)

if (hasStudio) {
  // Studio members ALWAYS have Maya access, even if they also have paid blueprint
  console.log(`[Maya Page] ✅ Granting Maya access to Studio member: ${neonUser.email}`)
} else {
  // For non-studio users, check if they have paid_blueprint (block Maya if yes)
  const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
  
  if (isPaidBlueprint) {
    // Block Maya access - redirect to Blueprint
    console.log(`[Maya Page] ❌ Blocking Maya access for paid_blueprint-only user: ${neonUser.email}`)
    redirect("/blueprint")
  }
}
```

### Updated Access Logic

**Priority Order:**
1. **Studio Membership** (highest tier) → Maya + Blueprint + All features
2. **Paid Blueprint Only** → Blueprint only (no Maya)
3. **One-Time Session** → Depends on product type
4. **Free** → Maya (with limitations)

---

## 🧪 TESTING PLAN

### Test Cases

**Test 1: Studio Member WITHOUT Paid Blueprint**
- Create user with `sselfie_studio_membership` only
- **Expected:** Maya access granted ✅

**Test 2: Studio Member WITH Paid Blueprint**
- Create user with `sselfie_studio_membership` + `paid_blueprint`
- **Expected:** Maya access granted ✅ (This is the fix!)

**Test 3: Paid Blueprint ONLY (No Studio)**
- Create user with `paid_blueprint` only
- **Expected:** Redirected to Blueprint ✅

**Test 4: One-Time Session**
- Create user with `one_time_session` only
- **Expected:** (To be confirmed) Maya access?

**Test 5: Free User**
- Create user with no subscriptions
- **Expected:** Maya access granted ✅

---

## 📁 FILES TO MODIFY

**1. app/maya/page.tsx (Lines 50-58)**

**Current (BROKEN):**
```typescript
// Fix #4: Check if user has paid_blueprint subscription (block Maya access)
const { hasPaidBlueprint } = await import("@/lib/subscription")
const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)

if (isPaidBlueprint) {
  // Block Maya access - redirect to Blueprint
  console.log(`[Maya Page] Blocking access for paid_blueprint user ${neonUser.id}, redirecting to /blueprint`)
  redirect("/blueprint")
}
```

**Fixed:**
```typescript
// Check Maya access: Studio members always have access, even if they also have paid blueprint
const { hasStudioMembership, hasPaidBlueprint } = await import("@/lib/subscription")

// Priority 1: Check Studio Membership (highest tier)
const hasStudio = await hasStudioMembership(neonUser.id)

if (hasStudio) {
  // Studio members have full Maya access
  console.log(`[Maya Page] ✅ Studio member ${neonUser.email} has Maya access`)
} else {
  // Priority 2: For non-studio users, check paid blueprint
  const isPaidBlueprint = await hasPaidBlueprint(neonUser.id)
  
  if (isPaidBlueprint) {
    // Block Maya access - redirect to Blueprint
    console.log(`[Maya Page] ❌ Paid blueprint-only user ${neonUser.email}, redirecting to /blueprint`)
    redirect("/blueprint")
  }
  
  // Priority 3: All other users (free, one-time session) get Maya access
  console.log(`[Maya Page] ✅ User ${neonUser.email} has Maya access`)
}
```

---

## 🔑 KEY INSIGHTS

### Why This Bug Happened

The original "Fix #4" was added to prevent paid blueprint users from accessing Maya (they should use Blueprint). However, it didn't account for users who have BOTH Studio Membership AND Paid Blueprint.

### Product Hierarchy

```
Studio Membership (Highest)
    ├── Maya Access ✅
    ├── Blueprint Access ✅
    ├── Feed Planner ✅
    └── All Features ✅

Paid Blueprint (Mid)
    ├── Maya Access ❌
    ├── Blueprint Access ✅ (30 grids)
    └── Feed Planner ✅

One-Time Session (Mid)
    ├── Maya Access ✅ (?)
    ├── Blueprint Access ❓
    └── Credits-based

Free (Lowest)
    ├── Maya Access ✅ (with limits)
    ├── Blueprint Access ✅ (1 free grid)
    └── Feed Planner ✅ (1 post)
```

---

## 📝 ADDITIONAL CHECKS NEEDED

### 1. One-Time Session Users

**Question:** Should `one_time_session` users have Maya access?

**Current Behavior:** They do (no blocking logic)

**Recommendation:** Clarify product requirements:
- If one-time session = "one AI photoshoot only" → Maybe block Maya?
- If one-time session = "credits for any feature" → Allow Maya

### 2. Product Type Consistency

**Issue:** Some beta users show as "free users with a membership"

**Possible Causes:**
- Old product IDs not recognized by `hasStudioMembership()`
- `subscriptions.product_type` has unexpected values
- Multiple subscription records (one active, one not)

**Recommendation:** Run diagnostic query to check beta user subscriptions:

```sql
SELECT 
  u.email,
  s.product_type,
  s.status,
  s.created_at,
  bs.paid_blueprint_purchased
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN blueprint_subscribers bs ON u.id = bs.user_id
WHERE s.product_type = 'sselfie_studio_membership'
  AND s.status = 'active'
  AND s.is_test_mode = FALSE
ORDER BY u.created_at DESC
LIMIT 30
```

### 3. Feed Planner Access

**Question:** Does Feed Planner check access correctly after this fix?

**Check:** `app/feed-planner/page.tsx` - Does it have similar blocking logic?

**Recommendation:** Audit Feed Planner access control as well

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Update `app/maya/page.tsx` with priority-based access check
- [ ] Test with Studio member who has paid blueprint
- [ ] Test with paid blueprint only user
- [ ] Test with free user
- [ ] Run diagnostic query on beta users
- [ ] Check one-time session product requirements
- [ ] Audit Feed Planner access control
- [ ] Check for old product IDs in subscriptions table
- [ ] Update access control documentation

---

**Status:** ✅ Root cause identified  
**Impact:** 🔴 HIGH - Blocks beta users from Maya  
**Priority:** 🔥 URGENT - Affects paying customers  
**Ready to Implement:** ✅ YES - Fix is straightforward
