# Feed Planner V2 - Complete Flow Audit

**Date:** 2026-01-20  
**Purpose:** Identify V1 remnants, conflicts, over-engineering, and flow issues preventing variation selection from persisting

---

## 🔍 **AUDIT SCOPE**

1. **V1 Remnants** - Old logic still present
2. **Flow Mapping** - End-to-end user journey
3. **Data Flow** - How variation_id travels through the system
4. **Conflicts** - Competing logic paths
5. **Over-Engineering** - Unnecessary complexity

---

## 📋 **1. V1 REMNANTS CHECK**

### **1.1 Feed Style Modal (`feed-style-modal.tsx`)**

**V1 Code Found:**
```typescript
// Lines 12-28: FEED_EXAMPLES_V1 still defined
const FEED_EXAMPLES_V1 = {
  luxury: { name: "Dark & Moody", ... },
  minimal: { name: "Light & Minimalistic", ... },
  beige: { name: "Beige Aesthetic", ... },
}

// Line 110: V1 fallback logic
defaultFeedStyle || (useFeedPlannerV2 ? "Dark & Moody" : "minimal")

// Line 184: V1 style matching
} else if (settingsValue === 'luxury' || settingsValue === 'minimal' || settingsValue === 'beige') {
```

**Issue:** Modal still has V1 fallback logic and style matching. This could cause confusion.

**Recommendation:** Remove V1 constants and logic entirely since V2 is enforced for all users.

---

### **1.2 Feature Flag (`feature-flag.ts`)**

**Current Code:**
```typescript
export async function getFeedPlannerV2Flag(userId: number | string): Promise<boolean> {
  const [row] = await sql`SELECT use_feed_planner_v2 FROM users WHERE id = ${Number(userId)} LIMIT 1`
  if (!row) return false
  return true  // Always returns true if user exists
}
```

**Issue:** Flag always returns `true`, but code still checks it everywhere. This adds unnecessary complexity.

**Recommendation:** Since V2 is enforced, remove flag checks and simplify code paths.

---

### **1.3 API Routes Still Checking V2 Flag**

**Files Checking Flag:**
- `app/api/feed/create-free-example/route.ts` (line 37)
- `app/api/feed/create-manual/route.ts` (line 35)
- `app/api/feed/[feedId]/generate-single/route.ts` (line 159)
- `components/feed-planner/feed-header.tsx` (line 66)

**Issue:** All these checks are redundant if V2 is always enabled.

---

## 📊 **2. END-TO-END FLOW MAPPING**

### **2.1 User Clicks "Create New Feed"**

**Flow:**
1. `feed-header.tsx` → `handleCreateNewFeedClick()` (line 267)
   - Sets `isCreatingNewFeed = true`
   - Opens `FeedStyleModal`

2. `feed-style-modal.tsx` → Modal opens
   - Fetches `personalBrandData` via SWR
   - Fetches `variationData` via SWR (based on `selectedStyle`)
   - **PROBLEM:** Multiple `useEffect` hooks competing to set `selectedVariationId`

3. User selects variation → `onClick` handler (line 431)
   - Sets `userExplicitlySelectedVariation = true`
   - Sets `selectedVariationId = variation.id`
   - **PROBLEM:** `useEffect` at line 240 might still reset it

4. User clicks "Confirm" → `handleConfirm()` (line 303)
   - Passes `{ feedStyle, feedStyleVariationId: selectedVariationId }` to `onConfirm`

5. `feed-header.tsx` → `handleFeedStyleConfirm()` (line 283)
   - Routes to `handleFullFeedStyleConfirm()` (line 401)

6. `handleFullFeedStyleConfirm()`:
   - Updates `user_personal_brand` with `feedStyleVariationId` (line 470)
   - Creates feed via `/api/feed/create-manual` (line 571)
   - **PROBLEM:** Race condition? Personal brand update might not complete before feed creation

7. `app/api/feed/create-manual/route.ts`:
   - Reads `body.feedStyleVariationId` (line 61)
   - Falls back to `personalBrandVariationId` if not provided (line 80)
   - **PROBLEM:** If personal brand update hasn't completed, it reads old value

---

### **2.2 Data Flow Issues**

**Issue 1: Multiple Sources of Truth**
- `user_personal_brand.feed_style_variation_id` (user's default)
- `feed_layouts.feed_style_variation_id` (feed-specific)
- Modal state `selectedVariationId` (UI state)
- `defaultFeedStyleVariationId` prop (existing feed)

**Issue 2: Race Conditions**
- Personal brand update happens async
- Feed creation might read stale personal brand data
- No guarantee of order

**Issue 3: Fallback Chain Too Complex**
```
requestedVariationId (from modal)
  ↓ (if null/undefined)
personalBrandVariationId (from DB)
  ↓ (if null/undefined)
getDefaultVariationId() (first variation)
```

**Problem:** Too many fallbacks. If user selects variation but it's `null` due to a bug, it falls back instead of using the selection.

---

## 🔄 **3. CONFLICTING LOGIC PATHS**

### **3.1 Modal Initialization**

**Path A: Load from Feed Data** (line 196-198)
```typescript
if (defaultFeedStyleVariationId !== undefined && defaultFeedStyleVariationId !== null) {
  setSelectedVariationId(defaultFeedStyleVariationId)
}
```

**Path B: Load from Personal Brand** (line 199-204)
```typescript
else if (useFeedPlannerV2 && personalBrandData.data.feedStyleVariationId !== undefined) {
  setSelectedVariationId(variationId)
}
```

**Path C: useEffect Auto-Set** (line 240-296)
```typescript
// Automatically sets to default if no selection
if (!selectedVariationId || !currentSelectionIsValid || styleChanged) {
  setSelectedVariationId(defaultId)
}
```

**CONFLICT:** Path C runs AFTER user clicks, resetting their selection.

---

### **3.2 Feed Creation Priority**

**Path A: Use Requested Variation** (line 180-188 in `create-free-example`)
```typescript
if (requestedVariationId) {
  feedStyleVariationIdToStore = variation.id
}
```

**Path B: Use Personal Brand** (line 189-195)
```typescript
else if (personalBrandVariationId) {
  feedStyleVariationIdToStore = variation.id
}
```

**Path C: Use Default** (line 196-198)
```typescript
else {
  feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
}
```

**CONFLICT:** If `requestedVariationId` is `null` (user explicitly selected null), it should use default, but the check `if (requestedVariationId)` treats `null` as falsy, falling through to Path B.

---

## 🏗️ **4. OVER-ENGINEERING**

### **4.1 Too Many useEffect Hooks**

**In `feed-style-modal.tsx`:**
1. Line 144-152: Revalidate on open
2. Line 155-213: Load from personal brand
3. Line 222-226: Update when defaultFeedStyle changes
4. Line 230-235: Update when defaultFeedStyleVariationId changes
5. Line 240-296: Auto-set default variation (THE PROBLEM)

**Issue:** 5 different `useEffect` hooks managing the same state. They conflict with each other.

---

### **4.2 Complex Fallback Logic**

**In `create-free-example/route.ts` (lines 148-199):**
- Checks `requestedVariationId`
- Falls back to `personalBrandVariationId`
- Falls back to `getDefaultVariationId()`
- Validates each step
- Multiple database queries

**Issue:** Should be simpler: Use requested → Use default. Personal brand fallback adds complexity.

---

### **4.3 Dual Personal Brand Update**

**In `feed-header.tsx`:**
- `handlePreviewFeedStyleConfirm()` updates personal brand (line 82-228)
- `handleFullFeedStyleConfirm()` updates personal brand (line 406-528)
- `handleUpdateFeedStyle()` updates personal brand (line 292-431)

**Issue:** Same logic duplicated 3 times. Should be extracted to a shared function.

---

## 🐛 **5. ROOT CAUSE ANALYSIS**

### **Primary Issue: useEffect Dependency Loop**

**Location:** `feed-style-modal.tsx` line 240-296

**Problem:**
```typescript
useEffect(() => {
  // ... logic that sets selectedVariationId
}, [variationData, useFeedPlannerV2, selectedStyle, defaultFeedStyleVariationId, userExplicitlySelectedVariation, selectedVariationId])
//                                                                                                                      ^^^^^^^^^^^^^^^^^^^^
//                                                                                                                      THIS CAUSES LOOP
```

**What Happens:**
1. User clicks variation → `setSelectedVariationId(123)`
2. `selectedVariationId` changes → `useEffect` runs
3. `useEffect` checks conditions → resets to default
4. User sees first variation selected again

**Fix Applied:** Removed `selectedVariationId` from deps, but logic might still be flawed.

---

### **Secondary Issue: Race Condition**

**Location:** `feed-header.tsx` → `handleFullFeedStyleConfirm()`

**Problem:**
```typescript
// Step 1: Update personal brand (async)
await fetch('/api/profile/personal-brand', { ... })

// Step 2: Create feed (reads personal brand)
await fetch('/api/feed/create-manual', { ... })
```

**What Happens:**
- Personal brand update might not be committed yet
- Feed creation reads old `feed_style_variation_id` from personal brand
- Feed gets wrong variation

**Fix Needed:** Pass `feedStyleVariationId` directly to feed creation API (don't rely on personal brand).

---

### **Tertiary Issue: Null vs Undefined Confusion**

**Location:** Multiple API routes

**Problem:**
- `undefined` = not provided → should use fallback
- `null` = explicitly selected "no variation" → should use default
- But code treats both as "not provided"

**Example:**
```typescript
if (requestedVariationId) {  // This is false for both null and undefined
  // use it
} else {
  // fallback - WRONG if user explicitly selected null
}
```

---

## 📝 **6. RECOMMENDATIONS**

### **6.1 Immediate Fixes**

1. **Remove V1 Code:**
   - Delete `FEED_EXAMPLES_V1` constant
   - Remove V1 style matching logic
   - Remove `useFeedPlannerV2` checks (always V2 now)

2. **Simplify useEffect:**
   - Combine multiple `useEffect` hooks into one
   - Remove `selectedVariationId` from dependency array
   - Use refs to track user selections

3. **Fix Race Condition:**
   - Always pass `feedStyleVariationId` directly to feed creation
   - Don't rely on personal brand being updated first
   - Personal brand update can happen async (non-blocking)

4. **Fix Null Handling:**
   - Distinguish `null` (explicit) vs `undefined` (not provided)
   - Use `!== undefined` checks, not truthy checks

### **6.2 Architecture Simplification**

1. **Single Source of Truth:**
   - Feed creation: Use `requestedVariationId` from request body
   - Feed generation: Use `feed_layouts.feed_style_variation_id`
   - Personal brand: Sync for future feeds, but don't block on it

2. **Simplified Flow:**
   ```
   User selects → Modal state → handleConfirm → API receives → Feed created
   (No personal brand sync needed for feed creation)
   ```

3. **Remove Feature Flag:**
   - Since V2 is always enabled, remove all flag checks
   - Simplify code paths

---

## 🎯 **7. SPECIFIC FIXES NEEDED**

### **Fix 1: Modal useEffect Simplification**

**Current:** 5 competing `useEffect` hooks  
**Needed:** 1 simple `useEffect` that only runs on style change or initial load

### **Fix 2: Remove Personal Brand Dependency**

**Current:** Feed creation reads from personal brand as fallback  
**Needed:** Feed creation ONLY uses `requestedVariationId` from request body

### **Fix 3: Fix Null Handling**

**Current:** `if (requestedVariationId)` treats null as falsy  
**Needed:** `if (requestedVariationId !== undefined)` to distinguish null from undefined

### **Fix 4: Remove V1 Code**

**Current:** V1 constants and logic still present  
**Needed:** Complete removal of V1 code paths

---

## ✅ **8. VALIDATION CHECKLIST**

After fixes, verify:
- [ ] User selects variation → UI shows selected (not first)
- [ ] User confirms → Variation passed to API
- [ ] Feed created → `feed_style_variation_id` stored correctly
- [ ] Feed generation → Uses stored variation (not default)
- [ ] Page reload → Variation persists in UI
- [ ] Personal brand → Synced but doesn't block feed creation

---

## 📌 **NEXT STEPS**

1. **Simplify modal logic** - Remove competing useEffects
2. **Fix race condition** - Pass variation directly, don't rely on personal brand
3. **Remove V1 code** - Clean up legacy constants
4. **Fix null handling** - Distinguish null vs undefined
5. **Test end-to-end** - Verify variation persists through entire flow

---

## 🔬 **9. DETAILED FINDINGS**

### **9.1 Feed Style Modal - useEffect Chaos**

**Found 6 useEffect hooks managing `selectedVariationId`:**

1. **Line 147-152:** Revalidates personal brand on open
2. **Line 155-213:** Loads variation from personal brand or feed data
3. **Line 222-226:** Updates when `defaultFeedStyle` changes
4. **Line 230-235:** Updates when `defaultFeedStyleVariationId` changes
5. **Line 250-252:** Syncs ref with state
6. **Line 254-312:** Auto-sets default variation (CONFLICTS WITH USER SELECTION)

**The Problem:**
- Hook #6 runs whenever `variationData` or `selectedStyle` changes
- It checks `if (!selectedVariationId || !currentSelectionIsValid || styleChanged)`
- When user clicks variation, `selectedVariationId` changes
- But hook #6 might run AFTER the click, resetting it
- Even with `userExplicitlySelectedVariation` flag, the timing is fragile

**Root Cause:** Too many competing effects. Need ONE effect that:
- Runs only on initial load or style change
- NEVER runs when user explicitly selects

---

### **9.2 Onboarding Wizard - Same Issue**

**Found similar pattern:**
- Line 351-368: useEffect that auto-sets default
- Uses `formData.feedStyleVariationId` in dependency array
- Same loop problem

---

### **9.3 API Route Complexity**

**`create-free-example/route.ts` has 3 fallback paths:**
1. `requestedVariationId` (from request body)
2. `personalBrandVariationId` (from database)
3. `getDefaultVariationId()` (first variation)

**Issue:** If `requestedVariationId` is `null` (user selected "no variation"), the code treats it as "not provided" and falls back to personal brand, which might be wrong.

**Current Logic:**
```typescript
if (requestedVariationId) {  // null is falsy!
  // use it
} else if (personalBrandVariationId) {
  // fallback - WRONG if user explicitly selected null
}
```

**Should Be:**
```typescript
if (requestedVariationId !== undefined) {  // null is valid!
  // use it (even if null)
} else {
  // not provided, use fallback
}
```

---

### **9.4 V1 Code Still Present**

**Files with V1 remnants:**
1. `feed-style-modal.tsx`: `FEED_EXAMPLES_V1` constant (unused but present)
2. `feed-style-modal.tsx`: V1 style matching logic (line 184)
3. `feed-style-modal.tsx`: V1 fallback default (line 110)
4. `unified-onboarding-wizard.tsx`: `FEED_EXAMPLES_V1` constant

**Impact:** Adds confusion and potential bugs if V1 logic accidentally runs.

---

### **9.5 Feature Flag Always True**

**`feature-flag.ts`:**
```typescript
if (!row) return false
return true  // Always true if user exists
```

**But code still checks it everywhere:**
- `feed-header.tsx` line 66: `const useFeedPlannerV2 = Boolean(userInfo?.use_feed_planner_v2)`
- All API routes check the flag
- All components check the flag

**Impact:** Unnecessary complexity. Since it's always true, all these checks are redundant.

---

## 🎯 **10. SIMPLIFIED FLOW (RECOMMENDED)**

### **10.1 Modal Logic (Simplified)**

**ONE useEffect for initialization:**
```typescript
useEffect(() => {
  if (!open) {
    // Reset on close
    setSelectedVariationId(null)
    setUserExplicitlySelectedVariation(false)
    return
  }
  
  // Only set initial value on open (not on every change)
  if (defaultFeedStyleVariationId !== null && defaultFeedStyleVariationId !== undefined) {
    setSelectedVariationId(defaultFeedStyleVariationId)
  } else if (personalBrandData?.data?.feedStyleVariationId) {
    setSelectedVariationId(Number(personalBrandData.data.feedStyleVariationId))
  } else if (variationData?.defaultVariationId) {
    setSelectedVariationId(variationData.defaultVariationId)
  }
}, [open]) // ONLY run when modal opens/closes
```

**User click handler:**
```typescript
onClick={() => {
  setUserExplicitlySelectedVariation(true)
  setSelectedVariationId(variation.id)
  // NO useEffect should interfere after this
}}
```

**NO other useEffect should touch `selectedVariationId` after user clicks.**

---

### **10.2 Feed Creation (Simplified)**

**Remove personal brand dependency:**
```typescript
// OLD (complex)
if (requestedVariationId) {
  use it
} else if (personalBrandVariationId) {
  use that
} else {
  use default
}

// NEW (simple)
if (requestedVariationId !== undefined) {
  // User provided it (even if null), use it
  feedStyleVariationIdToStore = requestedVariationId ?? await getDefaultVariationId(style.id)
} else {
  // Not provided, use default
  feedStyleVariationIdToStore = await getDefaultVariationId(style.id)
}
```

**Personal brand update:** Make it async/non-blocking (don't await it before feed creation).

---

### **10.3 Remove V1 Code**

**Delete:**
- `FEED_EXAMPLES_V1` constant
- V1 style matching logic
- `useFeedPlannerV2` prop (always true)
- Feature flag checks

**Simplify:**
- Always use V2 styles
- Always use V2 logic
- No conditional paths

---

## ✅ **11. VALIDATION PLAN**

After implementing fixes:

1. **Test Modal:**
   - Open modal → Select variation → Verify it stays selected
   - Switch styles → Verify variation resets (expected)
   - Close and reopen → Verify last selection persists

2. **Test Feed Creation:**
   - Create feed with variation → Check database
   - Verify `feed_style_variation_id` matches selection
   - Generate image → Verify correct prompt used

3. **Test Onboarding:**
   - Complete wizard with variation → Check database
   - Verify `user_personal_brand.feed_style_variation_id` saved
   - Create feed after onboarding → Verify variation used

---

## 📊 **12. COMPLEXITY METRICS**

**Current State:**
- useEffect hooks managing variation: **6**
- Fallback paths in feed creation: **3**
- V1 code paths: **4+**
- Feature flag checks: **15+ files**

**Target State:**
- useEffect hooks managing variation: **1**
- Fallback paths in feed creation: **1** (requested or default)
- V1 code paths: **0**
- Feature flag checks: **0**

**Reduction:** ~80% complexity reduction needed.
