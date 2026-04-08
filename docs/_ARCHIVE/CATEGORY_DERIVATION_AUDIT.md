# CATEGORY DERIVATION AUDIT — Feed-Related API Routes

**Date**: 2026-01-18  
**Scope**: All API routes involved in feed preview, single image generation, and feed planner strategy

---

## EXECUTIVE SUMMARY

### Critical Findings

**2 ROUTES WITH INLINE CATEGORY LOGIC** (HIGH RISK):
1. `/api/feed/create-free-example` — Duplicates `getCategoryAndMood()` logic inline
2. `/api/feed/[feedId]/regenerate-post` — Duplicates `getCategoryAndMood()` logic inline

**1 ROUTE WITH CLIENT-PROVIDED CATEGORY** (MEDIUM RISK):
3. `/api/blueprint/generate-grid` — Accepts `category` from client without server-side validation/derivation

**3 ROUTES USING NEW SYSTEM** (LOW RISK):
4. `/api/feed/[feedId]/generate-single` — ✅ Uses `getCategoryAndMood()`
5. `/api/blueprint/generate-paid` — ✅ Uses `getCategoryAndMood()`
6. `/api/feed-planner/create-from-strategy` — ✅ N/A (uses pre-generated strategy)

---

## DETAILED AUDIT TABLE

| Route | Category Source | Uses getCategoryAndMood()? | Uses mapVisualAestheticToCategory()? | New System? | Risk | Notes |
|-------|----------------|----------------------------|-------------------------------------|-------------|------|-------|
| **FEED PREVIEW & GENERATION** |
| `/api/feed/[feedId]/generate-single` | `getCategoryAndMood()` from `generation-helpers.ts` | ✅ YES | ✅ YES (via getCategoryAndMood) | ✅ YES | **LOW** | ✅ Correct implementation (Phase 1C/1D) |
| `/api/feed/create-free-example` | **INLINE** duplication of getCategoryAndMood logic | ❌ NO | ❌ NO (uses exact match only) | ❌ NO | **HIGH** | ⚠️ Duplicates logic, defaults to "professional", missing partial matching |
| `/api/feed/[feedId]/regenerate-post` | **INLINE** duplication of getCategoryAndMood logic | ❌ NO | ❌ NO (uses exact match only) | ❌ NO | **HIGH** | ⚠️ Duplicates logic, defaults to "professional", missing partial matching |
| **BLUEPRINT GENERATION** |
| `/api/blueprint/generate-paid` | `getCategoryAndMood()` from `generation-helpers.ts` | ✅ YES | ✅ YES (via getCategoryAndMood) | ✅ YES | **LOW** | ✅ Correct implementation |
| `/api/blueprint/generate-grid` | **CLIENT-PROVIDED** (passed from client) | ❌ NO | ❌ NO | ⚠️ PARTIAL | **MEDIUM** | ⚠️ Category passed from client, no server-side derivation |
| **FEED PLANNER STRATEGY** |
| `/api/feed-planner/create-strategy` | N/A (generates strategy, doesn't select templates) | N/A | N/A | N/A | **N/A** | Generates strategy via Claude, no template selection |
| `/api/feed-planner/create-from-strategy` | N/A (uses pre-generated strategy from chat) | N/A | N/A | ✅ YES | **LOW** | ✅ Accepts pre-generated strategy, no category derivation needed |
| **PROGRESS & STATUS CHECKS** |
| `/api/feed/[feedId]/progress` | N/A (checks generation progress only) | N/A | N/A | N/A | **N/A** | No generation logic, just status checks |
| `/api/feed/[feedId]/check-post` | N/A (checks post status only) | N/A | N/A | N/A | **N/A** | No generation logic, just status checks |
| `/api/feed-planner/preview-feed` | N/A (returns saved preview feed data) | N/A | N/A | N/A | **N/A** | No generation logic, just data retrieval |

---

## DETAILED FINDINGS

### 1. `/api/feed/create-free-example` (HIGH RISK)

**File**: `app/api/feed/create-free-example/route.ts`

**Current Implementation** (Lines 80-219):
```typescript
let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
let mood: "luxury" | "minimal" | "beige" = "minimal"

// Extract category from visual_aesthetic (array of IDs)
if (personalBrand[0].visual_aesthetic) {
  const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
    ? JSON.parse(personalBrand[0].visual_aesthetic)
    : personalBrand[0].visual_aesthetic
  
  if (Array.isArray(aesthetics) && aesthetics.length > 0) {
    const firstAesthetic = aesthetics[0]?.toLowerCase().trim()
    const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
    
    if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
      category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
    }
  }
}
```

**Issues**:
1. ❌ **Inline logic** — Duplicates `getCategoryAndMood()` logic instead of calling it
2. ❌ **No partial matching** — Missing `mapVisualAestheticToCategory()` for "beige feed" variants
3. ❌ **Defaults to "professional"** — Falls back to "professional" instead of using mapping
4. ❌ **Duplicates precedence order** — Reinvents settings_preference → visual_aesthetic → blueprint_subscribers flow
5. ❌ **No Scene 8 awareness** — Cannot pass category for Scene 8 customization

**Evidence**: Lines 92, 130, 146, 193

---

### 2. `/api/feed/[feedId]/regenerate-post` (HIGH RISK)

**File**: `app/api/feed/[feedId]/regenerate-post/route.ts`

**Current Implementation** (Lines 114-208):
```typescript
let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
let mood: "luxury" | "minimal" | "beige" = "minimal"

// Extract category from visual_aesthetic (array of IDs)
if (personalBrand[0].visual_aesthetic) {
  const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
    ? JSON.parse(personalBrand[0].visual_aesthetic)
    : personalBrand[0].visual_aesthetic
  
  if (Array.isArray(aesthetics) && aesthetics.length > 0) {
    const firstAesthetic = aesthetics[0]?.toLowerCase().trim()
    const validCategories = ["luxury", "minimal", "beige", "warm", "edgy" "professional"]
    
    if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
      category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
    }
  }
}
```

**Issues**:
1. ❌ **Inline logic** — Duplicates `getCategoryAndMood()` logic instead of calling it
2. ❌ **No partial matching** — Missing `mapVisualAestheticToCategory()` for "beige feed" variants
3. ❌ **Defaults to "professional"** — Falls back to "professional" instead of using mapping
4. ❌ **Duplicates precedence order** — Reinvents settings_preference → visual_aesthetic → blueprint_subscribers flow
5. ❌ **No Scene 8 awareness** — Cannot pass category for Scene 8 customization

**Evidence**: Lines 114, 170, 199

---

### 3. `/api/blueprint/generate-grid` (MEDIUM RISK)

**File**: `app/api/blueprint/generate-grid/route.ts`

**Current Implementation** (Line 14):
```typescript
const { selfieImages, category, mood, email } = await req.json()
```

**Issues**:
1. ⚠️ **Client-provided category** — Accepts `category` from client without server-side derivation
2. ⚠️ **No validation against user profile** — Doesn't verify category matches user's visual_aesthetic
3. ⚠️ **Bypass risk** — Client could send any category, bypassing user's actual preferences

**Validation** (Lines 130-146):
```typescript
// Validate category
const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
if (!category || !validCategories.includes(category)) {
  return NextResponse.json(
    { error: `Valid category required. Must be one of: ${validCategories.join(", ")}` },
    { status: 400 },
  )
}
```

**Note**: Validation only checks if category is in valid list, but doesn't derive from user profile.

**Evidence**: Lines 14, 130-146, 162

---

### 4. `/api/feed/[feedId]/generate-single` (LOW RISK) ✅

**File**: `app/api/feed/[feedId]/generate-single/route.ts`

**Current Implementation** (Lines 516-521):
```typescript
const { category, mood } = await getCategoryAndMood(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  trackSource: false,
  orderBy: 'updated_at',
})
```

**Passes category to Scene 8** (Line 544):
```typescript
const authorityResult = await generateFeedSinglePromptViaAuthority(
  injectedTemplate,
  post.position,
  {
    userId: user.id.toString(),
    feedId: feedIdInt,
    postId,
    generationMode: 'pro',
    category: category, // Phase 1C: Pass category for Scene 8 awareness
  }
)
```

✅ **Correct implementation**: Uses `getCategoryAndMood()` which includes `mapVisualAestheticToCategory()` and passes category to Scene 8.

**Evidence**: Lines 516, 544, 567, 594, 835

---

### 5. `/api/blueprint/generate-paid` (LOW RISK) ✅

**File**: `app/api/blueprint/generate-paid/route.ts`

**Current Implementation** (Lines 274-279):
```typescript
const result = await getCategoryAndMood(feedLayout, { id: userId }, {
  checkSettingsPreference: true,
  checkBlueprintSubscribers: true,
  trackSource: true
})
category = result.category as BlueprintCategory
```

**Uses category for template selection** (Line 320):
```typescript
fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
```

✅ **Correct implementation**: Uses `getCategoryAndMood()` which includes `mapVisualAestheticToCategory()`.

**Evidence**: Lines 8, 219, 274-279, 320

---

### 6. `/api/feed-planner/create-strategy` (N/A)

**File**: `app/api/feed-planner/create-strategy/route.ts`

**Implementation**: Generates strategy via Claude Sonnet 4, no template selection or category derivation.

**Evidence**: Lines 209-214 (generateFeedPlannerStrategyPromptViaAuthority)

---

### 7. `/api/feed-planner/create-from-strategy` (LOW RISK) ✅

**File**: `app/api/feed-planner/create-from-strategy/route.ts`

**Implementation**: Accepts pre-generated strategy from Maya Feed Chat, no category derivation needed.

**Evidence**: Lines 85-141 (receives strategy.posts from client)

---

## RISK SUMMARY

### High Risk (2 routes)

1. **`/api/feed/create-free-example`** — Inline category logic, defaults to "professional", missing partial matching
2. **`/api/feed/[feedId]/regenerate-post`** — Inline category logic, defaults to "professional", missing partial matching

**Impact**: Users selecting "beige feed" or "beige aesthetic" will default to "professional" category, causing "office/workspace" templates for non-professional styles.

---

### Medium Risk (1 route)

3. **`/api/blueprint/generate-grid`** — Client-provided category without server-side derivation

**Impact**: Client could bypass user's actual preferences by sending different category.

---

### Low Risk (3 routes)

4. **`/api/feed/[feedId]/generate-single`** — ✅ Correct implementation
5. **`/api/blueprint/generate-paid`** — ✅ Correct implementation
6. **`/api/feed-planner/create-from-strategy`** — ✅ Uses pre-generated strategy

---

## RECOMMENDED FIXES

### Fix 1: `/api/feed/create-free-example` (HIGH PRIORITY)

**Replace inline logic** (Lines 80-219) with:

```typescript
import { getCategoryAndMood } from '@/lib/feed-planner/generation-helpers'

// Replace entire inline logic with:
const { category, mood } = await getCategoryAndMood(null, { id: user.id }, {
  checkSettingsPreference: true,
  checkBlueprintSubscribers: true,
  trackSource: true
})
```

**Benefits**:
- ✅ Uses canonical mapping system (Phase 1C/1D)
- ✅ Includes `mapVisualAestheticToCategory()` for partial matching
- ✅ Supports "beige feed" and "beige aesthetic" variants
- ✅ Single source of truth for category derivation

---

### Fix 2: `/api/feed/[feedId]/regenerate-post` (HIGH PRIORITY)

**Replace inline logic** (Lines 114-208) with:

```typescript
import { getCategoryAndMood } from '@/lib/feed-planner/generation-helpers'

// Replace entire inline logic with:
const { category, mood } = await getCategoryAndMood(null, { id: neonUser.id }, {
  checkSettingsPreference: true,
  checkBlueprintSubscribers: true,
  trackSource: true
})
```

**Benefits**:
- ✅ Uses canonical mapping system (Phase 1C/1D)
- ✅ Includes `mapVisualAestheticToCategory()` for partial matching
- ✅ Supports "beige feed" and "beige aesthetic" variants
- ✅ Single source of truth for category derivation

---

### Fix 3: `/api/blueprint/generate-grid` (MEDIUM PRIORITY)

**Option A**: Add server-side category derivation (RECOMMENDED)

```typescript
import { getCategoryAndMood } from '@/lib/feed-planner/generation-helpers'

// Before accepting client category, derive from user profile:
const { category: derivedCategory, mood: derivedMood } = await getCategoryAndMood(
  null, 
  { id: userId }, 
  {
    checkSettingsPreference: true,
    checkBlueprintSubscribers: true,
    trackSource: true
  }
)

// Use derived category instead of client-provided
const category = derivedCategory
const mood = derivedMood
```

**Option B**: Keep client-provided but log mismatch (MONITORING)

```typescript
// Log if client category doesn't match user profile
const { category: derivedCategory } = await getCategoryAndMood(...)
if (category !== derivedCategory) {
  console.warn(`[Blueprint] Client category (${category}) doesn't match user profile (${derivedCategory})`)
}
```

---

## VERIFICATION CHECKLIST

After fixes applied:

- [ ] `/api/feed/create-free-example` uses `getCategoryAndMood()`
- [ ] `/api/feed/[feedId]/regenerate-post` uses `getCategoryAndMood()`
- [ ] `/api/blueprint/generate-grid` derives category server-side (or logs mismatch)
- [ ] All routes support "beige feed" → "beige" mapping
- [ ] All routes support "beige aesthetic" → "beige" mapping
- [ ] No routes default to "professional" for beige/athletic/non-business styles
- [ ] Scene 8 receives category for lifestyle vs workspace flatlay decision

---

## ROLLBACK

If fixes cause issues:

1. Revert inline logic in `/api/feed/create-free-example`
2. Revert inline logic in `/api/feed/[feedId]/regenerate-post`
3. Keep `/api/blueprint/generate-grid` as client-provided (low impact)

---

**End of Audit** ✅
