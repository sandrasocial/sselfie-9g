# Bug Report #1: Onboarding Wizard Not Appearing Immediately

**Test that found it:** `tests/free-user-flow.spec.ts`  
**Severity:** 🔴 High - Blocks new user onboarding  
**Status:** ✅ Root Cause Identified

---

## ROOT CAUSE ANALYSIS

### Debug Session Findings

**API Responses (Correct):**
```json
{
  "onboarding_completed": false,
  "hasBaseWizardData": false,
  "hasExtensionData": false,
  "hasSelfies": false
}
```

**Access Control (Correct):**
```json
{
  "isFree": true,
  "placeholderType": "single"
}
```

**Wizard State:**
- **Initial (0-5 seconds):** Wizard NOT in DOM (0 dialogs, no welcome text)
- **After 10 seconds:** Wizard APPEARS (welcome text found: true)

### Root Cause Identified

**BUG:** The wizard appears, but with a **significant delay (10+ seconds)**. This is likely due to:

1. **Race Condition in useEffect Dependencies**
   - The `useEffect` that determines wizard visibility depends on multiple async API calls
   - `onboardingStatus` and `access` may load at different times
   - Wizard state is only set after ALL dependencies are loaded

2. **Missing Immediate State Check**
   - The logic correctly determines `needsWizard = true` for new users
   - But `setShowWizard(true)` may not be called immediately if dependencies are still loading
   - The `isCheckingWizard` state may prevent wizard from showing

3. **SWR Cache Timing**
   - SWR may take time to fetch and cache API responses
   - Wizard logic waits for `isLoadingOnboarding === false` and `isLoadingAccess === false`
   - This can cause delays of several seconds

### Code Analysis

**File:** `app/feed-planner/feed-planner-client.tsx`

**Current Logic (Lines 93-151):**
```typescript
useEffect(() => {
  // Wait for both access and onboarding status to load
  if (isLoadingOnboarding || (!accessProp && isLoadingAccess)) {
    setIsCheckingWizard(true)
    return  // ⚠️ BUG: Returns early, wizard never shows
  }

  if (!onboardingStatus) {
    setIsCheckingWizard(false)
    setShowWizard(false)
    return  // ⚠️ BUG: Returns early if onboardingStatus is null
  }

  if (!access) {
    setIsCheckingWizard(true)
    return  // ⚠️ BUG: Returns early, wizard never shows
  }

  // ... wizard logic ...
}, [isLoadingOnboarding, isLoadingAccess, onboardingStatus, access])
```

**Issues Found:**

1. **Early Returns Prevent Wizard:**
   - If `onboardingStatus` is `null` (not `undefined`), wizard is hidden
   - If `access` is `null` (not `undefined`), wizard never shows
   - These early returns happen before the wizard logic can run

2. **Race Condition:**
   - `onboardingStatus` and `access` may be `null` initially
   - The effect runs before data is loaded
   - Wizard logic never executes

3. **Missing Null Checks:**
   - Should check for `undefined` or wait for data to load
   - Should not hide wizard if data is still loading

---

## FIX REQUIRED

### Fix 1: Handle Null/Undefined States Correctly

**File:** `app/feed-planner/feed-planner-client.tsx`

**BEFORE (Buggy):**
```typescript
if (!onboardingStatus) {
  setIsCheckingWizard(false)
  setShowWizard(false)  // ❌ Hides wizard if data is null
  return
}

if (!access) {
  setIsCheckingWizard(true)
  return  // ❌ Never shows wizard if access is null
}
```

**AFTER (Fixed):**
```typescript
// Only hide wizard if we're sure data is loaded and user doesn't need it
if (onboardingStatus === null && !isLoadingOnboarding) {
  // Data loaded but is null - user doesn't exist? Hide wizard
  setIsCheckingWizard(false)
  setShowWizard(false)
  return
}

// Wait for access to load, but don't hide wizard yet
if (!access && (!accessProp && isLoadingAccess)) {
  setIsCheckingWizard(true)
  return  // Still loading, wait
}

// If access is null after loading completes, assume free user
if (!access && !isLoadingAccess) {
  // Access failed to load - default to free user
  // Continue with wizard logic using default access
}
```

### Fix 2: Add Explicit Loading State Check

**BEFORE (Buggy):**
```typescript
if (isLoadingOnboarding || (!accessProp && isLoadingAccess)) {
  setIsCheckingWizard(true)
  return
}
```

**AFTER (Fixed):**
```typescript
// Wait for data to load, but show loading state
if (isLoadingOnboarding || (!accessProp && isLoadingAccess)) {
  setIsCheckingWizard(true)
  // Don't hide wizard yet - wait for data
  return
}

// Once data is loaded, proceed with wizard logic
// At this point, onboardingStatus and access should be available
```

### Fix 3: Ensure Wizard Shows for New Users

**Add explicit check for new users:**
```typescript
// For new users (no onboarding data), show wizard immediately
if (access?.isFree && 
    onboardingStatus && 
    !onboardingStatus.hasBaseWizardData && 
    !onboardingStatus.hasExtensionData && 
    !onboardingStatus.onboarding_completed) {
  // New free user - show wizard immediately
  setShowWizard(true)
  setIsCheckingWizard(false)
  return
}
```

---

## IMPACT

**User Impact:**
- New users don't see onboarding wizard immediately
- Wizard appears after 10+ seconds (confusing UX)
- Users may think the app is broken
- May cause users to leave before seeing wizard

**Business Impact:**
- Reduced onboarding completion rate
- Lower user engagement
- Potential user churn

---

## VERIFICATION

**After Fix:**
- [ ] Wizard appears immediately (< 2 seconds) for new users
- [ ] Wizard doesn't appear for users who completed onboarding
- [ ] E2E test passes
- [ ] No console errors
- [ ] No regressions in existing functionality

---

## FILES TO MODIFY

1. `app/feed-planner/feed-planner-client.tsx`
   - Fix useEffect logic for wizard trigger
   - Handle null/undefined states correctly
   - Add explicit checks for new users

---

## ESTIMATED FIX TIME

**30-60 minutes:**
- 15 min: Understand current logic
- 20 min: Implement fix
- 10 min: Test manually
- 10 min: Verify E2E test passes

---

**Status:** ✅ Root Cause Identified - Ready for Fix
