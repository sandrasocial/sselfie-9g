# Smart Upsell Modal Detection System

**Date:** January 13, 2025  
**Status:** ✅ Implemented

---

## PROBLEM

Three different upsell modals were showing at the same time in the free blueprint feed planner:

1. **FreeModeUpsellModal** - "You've Used Your Free Credits"
2. **ZeroCreditsUpgradeModal** - "OUT OF CREDITS"
3. **LowCreditModal** - "LOW CREDITS"

This created a confusing user experience with multiple overlapping modals.

---

## SOLUTION: Smart Detection System

Each modal now has built-in detection logic to show only when appropriate:

### 1. FreeModeUpsellModal (Free Users Only)
**Location:** `components/feed-planner/feed-single-placeholder.tsx`

**Shows When:**
- ✅ User is **FREE** (not paid)
- ✅ User has used **2+ credits**
- ✅ User has seen their preview image (image loaded)
- ✅ 5-second delay after image loads (lets user see preview first)
- ✅ User hasn't seen modal in this session (localStorage check)

**Does NOT Show When:**
- ❌ User is paid (paid users have their own modals)
- ❌ User hasn't used 2 credits yet
- ❌ Image hasn't loaded yet
- ❌ User already saw modal in this session

---

### 2. ZeroCreditsUpgradeModal (Paid Users Only)
**Location:** `components/credits/zero-credits-upgrade-modal.tsx`

**Shows When:**
- ✅ User is **PAID** (paid_blueprint or studio_membership)
- ✅ User has **0 credits**
- ✅ User hasn't dismissed modal

**Does NOT Show When:**
- ❌ User is free (free users have FreeModeUpsellModal)
- ❌ User has credits > 0
- ❌ User dismissed modal

---

### 3. LowCreditModal (Paid Users Only)
**Location:** `components/credits/low-credit-modal.tsx`

**Shows When:**
- ✅ User is **PAID** (paid_blueprint or studio_membership)
- ✅ User has **< 30 credits** (but > 0)
- ✅ User hasn't dismissed modal

**Does NOT Show When:**
- ❌ User is free
- ❌ User has credits >= 30
- ❌ User has 0 credits (ZeroCreditsUpgradeModal handles this)
- ❌ User dismissed modal

---

## MODAL PRIORITY & CONFLICT RESOLUTION

### For FREE Users:
1. **FreeModeUpsellModal** - Shows when 2+ credits used (after preview loads)
2. **ZeroCreditsUpgradeModal** - ❌ Never shows (filtered out)
3. **LowCreditModal** - ❌ Never shows (filtered out)

### For PAID Users:
1. **LowCreditModal** - Shows when credits < 30 (but > 0)
2. **ZeroCreditsUpgradeModal** - Shows when credits = 0
3. **FreeModeUpsellModal** - ❌ Never shows (only in feed-single-placeholder, which is free-only)

---

## IMPLEMENTATION DETAILS

### ZeroCreditsUpgradeModal Changes:
```typescript
// Added access check
const { data: blueprintData } = useSWR("/api/blueprint/state", fetcher)
const isPaidUser = entitlementType === "paid" || entitlementType === "studio"
const isFreeUser = entitlementType === "free"

// Only show for paid users
if (!isPaidUser || isFreeUser) return null
```

### FreeModeUpsellModal Changes:
```typescript
// Added access check before showing modal
const accessResponse = await fetch("/api/feed-planner/access")
const accessData = await accessResponse.json()
const isFreeUser = accessData?.isFree === true

// Only show for free users
if (!isFreeUser) {
  console.log("User is paid, skipping free upsell modal")
  return
}
```

---

## TESTING CHECKLIST

### Free User Flow:
- [ ] Sign up as free user
- [ ] Generate preview (uses 2 credits)
- [ ] Image loads
- [ ] Wait 5 seconds
- [ ] ✅ FreeModeUpsellModal appears
- [ ] ❌ ZeroCreditsUpgradeModal does NOT appear
- [ ] ❌ LowCreditModal does NOT appear
- [ ] Refresh page
- [ ] ✅ FreeModeUpsellModal does NOT appear again (session check)

### Paid User Flow (Low Credits):
- [ ] Login as paid user with < 30 credits
- [ ] ✅ LowCreditModal appears
- [ ] ❌ FreeModeUpsellModal does NOT appear
- [ ] ❌ ZeroCreditsUpgradeModal does NOT appear (credits > 0)

### Paid User Flow (Zero Credits):
- [ ] Login as paid user with 0 credits
- [ ] ✅ ZeroCreditsUpgradeModal appears
- [ ] ❌ FreeModeUpsellModal does NOT appear
- [ ] ❌ LowCreditModal does NOT appear (credits = 0)

---

## USER EXPERIENCE IMPROVEMENTS

### Before:
- ❌ Multiple modals showing at once
- ❌ Confusing which upgrade to choose
- ❌ Modals showing for wrong user types
- ❌ Poor timing (shows before user sees preview)

### After:
- ✅ Only one modal shows at a time
- ✅ Right modal for right user type
- ✅ Smart timing (shows after preview loads)
- ✅ Session tracking (doesn't spam user)
- ✅ Clear upgrade path for each user type

---

## FILES MODIFIED

1. `components/credits/zero-credits-upgrade-modal.tsx`
   - Added access check (only shows for paid users)
   - Added SWR to fetch blueprint state

2. `components/feed-planner/feed-single-placeholder.tsx`
   - Added access check (only shows for free users)
   - Added double-check before showing modal

3. `components/sselfie/sselfie-app.tsx`
   - Added comment explaining smart detection system

---

**Status:** ✅ All Fixes Applied - Ready for Testing
