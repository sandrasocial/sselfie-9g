# Semantic Default Fix: Free Feed Preview (January 18, 2026)

## Problem Identified

**Free Feed Preview was incorrectly defaulting to business/professional subject semantics** when users had no brand context (before completing onboarding).

### Root Cause

The `getCategoryAndMood()` function in `lib/feed-planner/generation-helpers.ts` had a hardcoded default:

```typescript
let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
```

When Free Feed Preview users (who haven't completed onboarding) generated their preview, this default caused:
1. `category = "professional"`
2. `resolveSubjectRole(category)` returns `"professional"`
3. Business/CEO/executive semantics injected into prompts
4. Preview scenes forced into business context inappropriately

### Why This Was Wrong

Free Feed Preview should show **lifestyle individual** scenarios by default, not business/professional scenarios. Users exploring the product should see everyday, expressive, authentic contexts—not executive/business contexts they didn't choose.

---

## Solution

### 1. Added `defaultCategory` Parameter

**File:** `lib/feed-planner/generation-helpers.ts`

Added new optional parameter to `GetCategoryAndMoodOptions`:

```typescript
interface GetCategoryAndMoodOptions {
  // ... existing options ...
  
  /**
   * Default category when no brand context exists
   * 'minimal' for Free Preview (lifestyle semantics)
   * 'professional' for Paid Blueprint (business semantics allowed)
   * Default: 'professional'
   */
  defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
}
```

### 2. Updated Function Logic

**Before:**
```typescript
let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
```

**After:**
```typescript
const {
  // ... other options ...
  defaultCategory = 'professional'  // Maintains backward compatibility
} = options

let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = defaultCategory
```

### 3. Updated Preview Feed Call Site

**File:** `app/api/feed/[feedId]/generate-single/route.ts` (line 406)

**Before:**
```typescript
const { category, mood } = await getCategoryAndMood(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  trackSource: false
})
```

**After:**
```typescript
// SEMANTIC FIX: Default to "minimal" (lifestyle semantics) instead of "professional" (business semantics)
const { category, mood } = await getCategoryAndMood(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  trackSource: false,
  defaultCategory: 'minimal'  // Lifestyle individual, NOT business/CEO
})
```

---

## Behavior Changes

### Before Fix

| User Type | Brand Context | Category Default | Subject Role | Prompt Semantics |
|-----------|---------------|------------------|--------------|------------------|
| **Free Preview** | ❌ None | `"professional"` | `"professional"` | ❌ **Business/CEO** |
| **Paid Blueprint** | ❌ None | `"professional"` | `"professional"` | ✅ Business/CEO |
| **Paid Blueprint** | ✅ Has context | `"minimal"` (or other) | `"lifestyle"` | ✅ Lifestyle |

### After Fix

| User Type | Brand Context | Category Default | Subject Role | Prompt Semantics |
|-----------|---------------|------------------|--------------|------------------|
| **Free Preview** | ❌ None | `"minimal"` | `"lifestyle"` | ✅ **Lifestyle individual** |
| **Paid Blueprint** | ❌ None | `"professional"` | `"professional"` | ✅ Business/CEO |
| **Paid Blueprint** | ✅ Has context | `"minimal"` (or other) | `"lifestyle"` | ✅ Lifestyle |

---

## Technical Flow

### 1. Free Preview (No Brand Context) - AFTER FIX

```
isPreviewFeed = true
    ↓
getCategoryAndMood(..., { defaultCategory: 'minimal' })
    ↓
No brand context found → category = 'minimal' (from defaultCategory)
    ↓
resolveSubjectRole('minimal')
    ↓
Returns "lifestyle" (NOT "professional")
    ↓
formatBrandProfileBlock(..., "lifestyle")
    ↓
"Lifestyle individual in everyday context with casual, expressive, authentic presence"
    ↓
✅ NO business/CEO semantics
```

### 2. Paid Blueprint (No Brand Context) - UNCHANGED

```
isPaidBlueprint = true, isPreviewFeed = false
    ↓
getCategoryAndMood(..., { })  // No defaultCategory specified
    ↓
No brand context found → category = 'professional' (default)
    ↓
resolveSubjectRole('professional')
    ↓
Returns "professional"
    ↓
formatBrandProfileBlock(..., "professional")
    ↓
"Professional individual in business context with executive presence and authority"
    ↓
✅ Business semantics allowed (correct for paid blueprint)
```

### 3. Paid Blueprint (Has Brand Context) - UNCHANGED

```
isPaidBlueprint = true
    ↓
getCategoryAndMood(...)
    ↓
Brand context found → category = 'minimal' (from user_personal_brand)
    ↓
resolveSubjectRole('minimal')
    ↓
Returns "lifestyle"
    ↓
formatBrandProfileBlock(..., "lifestyle")
    ↓
"Lifestyle individual in everyday context..."
    ↓
✅ Lifestyle semantics (correct for non-professional category)
```

---

## Semantic Authority Enforcement

The fix works through the **Semantic Authority** system:

### 1. `resolveSubjectRole()` - Single Source of Truth

```typescript
export function resolveSubjectRole(
  category: string | null | undefined
): SubjectRole {
  // Professional identity ONLY when explicitly selected
  if (category === "professional") {
    return "professional"
  }
  
  // DEFAULT: Lifestyle identity (no business semantics)
  return "lifestyle"
}
```

### 2. `formatBrandProfileBlock()` - Gates Business Semantics

This function consults `subjectRole` to determine whether business semantics are allowed:

- `subjectRole === "professional"` → Allow business/CEO language
- `subjectRole === "lifestyle"` → Lifestyle only, NO business language

### 3. Result

- Free Preview with `defaultCategory: 'minimal'` → `category = 'minimal'` → `subjectRole = 'lifestyle'` → ✅ Lifestyle semantics
- Paid Blueprint without explicit default → `category = 'professional'` → `subjectRole = 'professional'` → ✅ Business semantics

---

## Call Sites Analysis

### Updated (Free Preview Only)
1. **`app/api/feed/[feedId]/generate-single/route.ts:406`** - Preview feed path
   - Added `defaultCategory: 'minimal'`
   - ✅ Now returns lifestyle semantics

### Unchanged (Paid Blueprint - Correct Behavior)
1. **`app/api/feed/[feedId]/generate-single/route.ts:531`** - Paid blueprint path
   - No `defaultCategory` specified
   - Uses default `'professional'`
   - ✅ Maintains business semantics when appropriate

2. **`app/api/feed/[feedId]/generate-single/route.ts:589`** - Free user full feed
   - No `defaultCategory` specified
   - Uses default `'professional'`
   - ✅ Correct (free users may select professional category)

3. **`app/api/feed/[feedId]/generate-single/route.ts:644`** - Membership user
   - No `defaultCategory` specified
   - Uses default `'professional'`
   - ✅ Correct (membership users may select professional category)

4. **`app/api/feed/[feedId]/generate-single/route.ts:914`** - Paid blueprint (no preview)
   - No `defaultCategory` specified
   - Uses default `'professional'`
   - ✅ Correct (paid users may select professional category)

---

## Testing Recommendations

### 1. Free Preview Test
- User: No onboarding completed
- Feed: Preview feed
- Expected: Lifestyle individual semantics
- Verify: No "business", "CEO", "executive" language in prompts

### 2. Paid Blueprint Test (No Category)
- User: Completed onboarding, no category selected
- Feed: Full blueprint feed
- Expected: Professional semantics allowed (fallback behavior)
- Verify: Business language present when appropriate

### 3. Paid Blueprint Test (Minimal Category)
- User: Completed onboarding, selected "minimal" aesthetic
- Feed: Full blueprint feed
- Expected: Lifestyle semantics (category overrides default)
- Verify: No business language unless explicitly in brand profile

---

## Files Modified

1. **`lib/feed-planner/generation-helpers.ts`**
   - Added `defaultCategory` parameter to `GetCategoryAndMoodOptions`
   - Updated `getCategoryAndMood()` to use `defaultCategory` instead of hardcoded `'professional'`

2. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Updated preview feed call site (line 406) to pass `defaultCategory: 'minimal'`

---

## Files NOT Modified

- `lib/semantic/resolve-subject-role.ts` - No changes (logic already correct)
- `lib/brand/build-brand-kit.ts` - No changes (already respects subject role)
- Blueprint templates - No changes (semantic gating happens at runtime)
- Scene library - No changes (scenes are semantic-neutral)

---

## Backward Compatibility

✅ **Fully backward compatible**

- All existing call sites without `defaultCategory` parameter → Use default `'professional'` (current behavior)
- Only preview feeds explicitly pass `defaultCategory: 'minimal'` → New behavior
- Paid blueprint paths unchanged → Maintain current semantics

---

## Summary

**Problem:** Free Preview defaulted to business/professional semantics

**Root Cause:** Hardcoded `category = "professional"` when no brand context exists

**Fix:** Added `defaultCategory` parameter, set to `'minimal'` for Free Preview only

**Result:**
- ✅ Free Preview → Lifestyle individual (casual, expressive, authentic)
- ✅ Paid Blueprint → Professional allowed (when appropriate)
- ✅ Backward compatible (no breaking changes)

**Impact:** ~Zero lines of prompt text changed, semantic default logic only
