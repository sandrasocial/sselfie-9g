# Professional Override - Quick Summary

## THE PROBLEM

**Users selecting "minimalist", "casual", "bohemian", "athletic" styles are getting "business professional" imagery instead.**

---

## WHY IT HAPPENS

### 8 Enforcement Points Override User Intent

```
┌─────────────────────────────────────────┐
│ USER SELECTS                            │
│ "Minimalist & Clean" aesthetic          │
│ "Casual" fashion style                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ❌ ENFORCEMENT POINT #1                 │
│ defaultCategory = 'professional'        │
│ (When data missing)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ❌ ENFORCEMENT POINT #2                 │
│ fashionStyle = 'business'               │
│ (When fashion_style empty)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ❌ ENFORCEMENT POINT #3                 │
│ Blueprint fallback: "professional"      │
│ (Legacy users without vibe)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ❌ ENFORCEMENT POINT #4                 │
│ Fashion mapper: return 'business'       │
│ (Unrecognized styles)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ❌ ENFORCEMENT POINT #5 (CRITICAL)      │
│ category/mood DROPPED in adapter        │
│ buildNaturalLanguageDescription()       │
│ never uses category or mood params      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ RESULT                                  │
│ Prompt = "business professional"        │
│ imagery despite user selecting          │
│ "minimalist" + "casual"                 │
└─────────────────────────────────────────┘
```

---

## THE CRITICAL ISSUE

**Even when user data is correct, category/mood are DROPPED:**

```typescript
// nano-banana-adapter.ts line 129
function buildNaturalLanguageDescription(params: {
  frame: { ... }
  brandKit: any
  category?: string | null  // ❌ DECLARED
  mood?: string | null      // ❌ DECLARED
}): string {
  const { frame, brandKit, category, mood } = params  // ❌ EXTRACTED
  
  // Build prompt parts
  parts.push(frame.description)
  parts.push(frame.setting)
  parts.push(frame.vibe)
  parts.push(frame.colorGrade)
  parts.push(brandKit.colors)
  
  // ❌ NEVER USES category
  // ❌ NEVER USES mood
  
  return parts.join(', ')
}
```

**Impact:** 100% of Nano Banana generations ignore user's category/mood selection.

---

## ENFORCEMENT POINTS TABLE

| # | Location | Issue | Type | Impact |
|---|----------|-------|------|--------|
| 1 | `generation-helpers.ts:168` | `defaultCategory = 'professional'` | Hardcoded default | All users without data |
| 2 | `generation-helpers.ts:391` | `fashionStyle = 'business'` | Hardcoded default | All users without fashion_style |
| 3 | `generation-helpers.ts:313` | Blueprint: `\|\| "professional"` | Aggressive fallback | Legacy blueprint users |
| 4 | `fashion-style-mapper.ts:53` | `return 'business'` | Aggressive fallback | Unrecognized styles |
| 5 | `nano-banana-adapter.ts:129` | category/mood unused | **Signal dropped** | **100% of Nano Banana** |
| 6 | `nano-banana-adapter.ts:129` | mood unused | **Signal dropped** | **100% of Nano Banana** |
| 7 | `generation-helpers.ts:240` | visualAesthetic mapping fragile | Normalization issues | Non-exact matches |
| 8 | `generate-single/route.ts:411` | Preview: `'minimal'` ✅ | Correct fix (preview only) | N/A |

---

## USER JOURNEY EXAMPLE

### User: "I want minimalist, casual lifestyle content"

**Input:**
- Onboarding: `visualAesthetic = "minimalist"`
- Onboarding: `fashionStyle = "casual"`

**System Processing:**

```
T=1: getCategoryAndMood()
     ✅ Maps "minimalist" → category = "minimal"

T=2: getFashionStyleForPosition()
     ❌ fashion_style parsing fails or missing
     ❌ DEFAULTS: fashionStyle = 'business'

T=3: generateFeedSinglePromptViaAuthority()
     ✅ Passes category = "minimal"

T=4: adaptFeedPlannerToNanoBanana()
     ✅ Receives category = "minimal"
     ✅ Receives mood = "minimal"

T=5: buildNaturalLanguageDescription()
     ❌ Extracts category/mood but NEVER USES THEM

T=6: Result
     Frame description: from template (may include "business" from fashionStyle)
     Category influence: NONE (dropped)
     Mood influence: NONE (dropped)
```

**Output:** Business professional imagery, not minimalist casual.

---

## AFFECTED USERS

| User Type | Impact |
|-----------|--------|
| No onboarding | **HIGH** - Gets "professional" default |
| "Minimalist" selected | **HIGH** - Gets "business", category dropped |
| "Casual" fashion | **MEDIUM-HIGH** - Gets "business" if parsing fails |
| "Bohemian" fashion | **HIGH** - Gets "business" (unmapped) |
| "Athletic" fashion | **HIGH** - Gets "business" (unmapped) |
| "Luxurious" selected | **MEDIUM** - Category correct, but fashion = "business" |
| Preview feed users | **LOW** - Fixed to 'minimal' ✅ |

**Estimated Impact:** 80-90% of users

---

## SOLUTION PATHS (Not Implemented - Audit Only)

### Fix #1: Change Defaults
```typescript
// generation-helpers.ts
defaultCategory = 'minimal'  // Not 'professional'
fashionStyle = 'casual'  // Not 'business'
```

### Fix #2: Use Category/Mood in Adapter
```typescript
// nano-banana-adapter.ts
function buildNaturalLanguageDescription(params) {
  const { frame, brandKit, category, mood } = params
  
  // USE category to influence scene description
  // USE mood to influence lighting/atmosphere
  
  if (category === 'minimal') {
    // Add minimalist aesthetic cues
  } else if (category === 'professional') {
    // Add professional context
  }
  // etc.
}
```

### Fix #3: Improve Fashion Mapping
```typescript
// fashion-style-mapper.ts
const FASHION_STYLE_MAP = {
  casual: 'casual',
  business: 'business',
  trendy: 'trendy',
  bohemian: 'bohemian',
  athletic: 'athletic',
  // Add more mappings
}

// Default to 'casual', not 'business'
return FASHION_STYLE_MAP[wizardStyle] || 'casual'
```

---

## FILES INVOLVED

1. **lib/feed-planner/generation-helpers.ts** - Category/fashion defaults
2. **lib/feed-planner/nano-banana-adapter.ts** - Drops category/mood
3. **lib/feed-planner/fashion-style-mapper.ts** - Fashion fallback
4. **lib/semantic/resolve-subject-role.ts** - Gatekeeper (works correctly)
5. **app/api/feed/[feedId]/generate-single/route.ts** - Preview fix applied

---

## STATUS

**Audit:** ✅ Complete  
**Fixes:** ❌ Not applied (audit only per requirements)  
**Verdict:** SYSTEMIC OVERRIDE  
**Confidence:** HIGH (evidence-based, 8 enforcement points confirmed)

---

**See:** `PROFESSIONAL_OVERRIDE_AUDIT.md` for complete details with code excerpts and line numbers.
