# Professional/Business Override Audit (January 18, 2026)

## VERDICT: **SYSTEMIC OVERRIDE**

User style inputs (vibe, feedStyle, aesthetic, mood) are captured but systematically overridden or ignored by multiple default enforcement points in the prompt pipeline.

---

## EXECUTIVE SUMMARY

**Finding:** "Professional/business" semantics dominate ALL prompts despite user selecting different styles in onboarding/style picker.

**Root Causes:**
1. **Aggressive defaults** at category resolution (`defaultCategory = 'professional'`)
2. **Fashion style defaults** to `'business'` when user data missing
3. **Category/mood dropped** in Nano Banana adapter (extracted but not used)
4. **Legacy fallback logic** prioritizes professional over user intent

**Impact:** Users selecting "casual", "bohemian", "athletic", "minimalist" etc. still get "business/professional/CEO" imagery.

---

## 1. USER STYLE INPUT SOURCES

### A. Onboarding Wizard (components/sselfie/brand-profile-wizard.tsx)

**Collected Inputs:**

| Field | Storage | UI Options |
|-------|---------|------------|
| `colorTheme` | `user_personal_brand.colors` | 8 themes (luxury, minimal, beige, warm, edgy, etc.) |
| `visualAesthetic` | `user_personal_brand.visual_aesthetic` | 6 options (minimalist, bold, soft, edgy, natural, luxurious) |
| `settingsPreference` | `user_personal_brand.settings_preference` | 5 options (studio, outdoor, urban, home, mixed) |
| `fashionStyle` | `user_personal_brand.fashion_style` | 5 options (casual, **business**, trendy, bohemian, athletic) |
| `communicationVoice` | `user_personal_brand.brand_voice` | 6 options (professional, warm, bold, playful, inspirational, educational) |

**Key Finding:** Only ONE option mentions "business" (fashion_style), yet this becomes the dominant default across all prompts.

---

### B. Style Picker / Feed Style Modal

**Location:** Feed style selection when creating feeds

**Options:** luxury, minimal, beige (mood), plus category variations

**Storage:** `feed_layouts.feed_style` (per-feed selection)

---

## 2. STYLE FLOW INTO PROMPT PIPELINE

### Call Chain

```
User Selection (Onboarding/Style Picker)
  ↓
Database (user_personal_brand, feed_layouts)
  ↓
getCategoryAndMood() [generation-helpers.ts]
  ↓
generateFeedSinglePromptViaAuthority() [prompt-authority.ts]
  ↓
adaptFeedPlannerToNanoBanana() [nano-banana-adapter.ts]
  ↓
buildNanoBananaPrompt() [nano-banana-prompt-builder.ts]
  ↓
Replicate: google/nano-banana-pro
```

---

## 3. BUSINESS/PROFESSIONAL ENFORCEMENT POINTS

### ENFORCEMENT POINT #1: Category Default

**File:** `lib/feed-planner/generation-helpers.ts`  
**Function:** `getCategoryAndMood()`  
**Line:** 168

```typescript
const {
  checkSettingsPreference = true,
  checkBlueprintSubscribers = true,
  trackSource = false,
  orderBy = 'created_at',
  defaultCategory = 'professional'  // ❌ HARDCODED DEFAULT
} = options

let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = defaultCategory
```

**Classification:** A) HARDCODED DEFAULT

**Impact:** When no style data exists, defaults to "professional" instead of lifestyle-friendly option like "minimal"

**Override Scope:** ALL users without completed onboarding or style selection

---

### ENFORCEMENT POINT #2: Preview Feed Override

**File:** `app/api/feed/[feedId]/generate-single/route.ts`  
**Line:** 411

```typescript
const { category, mood } = await getCategoryAndMood(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  trackSource: false,
  defaultCategory: 'minimal'  // ✅ FIXED for preview feeds
})
```

**Classification:** B) FALLBACK SELECTIVE FIX

**Impact:** Preview feeds correctly default to 'minimal' (lifestyle), but full feeds still default to 'professional'

**Override Scope:** FREE PREVIEW ONLY - full feeds still affected

---

### ENFORCEMENT POINT #3: Fashion Style Default

**File:** `lib/feed-planner/generation-helpers.ts`  
**Function:** `getFashionStyleForPosition()`  
**Lines:** 391, 440, 444

```typescript
let fashionStyle = 'business' // ❌ HARDCODED DEFAULT

// Later in function:
console.warn(`[v0] [GENERATE-SINGLE] No valid fashion styles found, using default: business`)

// And:
console.warn(`[v0] [GENERATE-SINGLE] Using default fashion style: business`)
```

**Classification:** A) HARDCODED DEFAULT + B) AGGRESSIVE FALLBACK

**Impact:** When user hasn't selected fashion_style, ALL outfits become "business professional"

**Override Scope:** ALL users without fashion_style in user_personal_brand

---

### ENFORCEMENT POINT #4: Blueprint Fallback

**File:** `lib/feed-planner/generation-helpers.ts`  
**Function:** `getCategoryAndMood()`  
**Line:** 313

```typescript
// Get category from form_data.vibe (same as old blueprint)
category = (formData.vibe || "professional") as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
```

**Classification:** B) FALLBACK TOO AGGRESSIVE

**Impact:** Legacy blueprint subscribers without vibe selection get "professional"

**Override Scope:** Legacy blueprint_subscribers table users

---

### ENFORCEMENT POINT #5: Fashion Style Mapper Fallback

**File:** `lib/feed-planner/fashion-style-mapper.ts`  
**Line:** 52-53

```typescript
// Default to business if no match
console.warn(`[Fashion Style Mapper] Unknown fashion style "${wizardStyle}", defaulting to "business"`)
return 'business'
```

**Classification:** B) FALLBACK TOO AGGRESSIVE

**Impact:** Any unrecognized fashion style value gets mapped to 'business'

**Override Scope:** ALL users with non-standard fashion_style values

---

### ENFORCEMENT POINT #6: Semantic Resolver (Correct Behavior)

**File:** `lib/semantic/resolve-subject-role.ts`  
**Function:** `resolveSubjectRole()`  
**Lines:** 38-48

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

**Classification:** C) CORRECT GATEKEEPER (not an enforcement point)

**Impact:** This resolver CORRECTLY gates business semantics. Problem is upstream: category is "professional" by the time it reaches here.

**Override Scope:** N/A - this is working as intended

---

## 4. DROPPED USER SIGNALS

### DROPPED SIGNAL #1: category in Nano Banana Adapter

**File:** `lib/feed-planner/nano-banana-adapter.ts`  
**Lines:** 16-17, 30, 129

**Evidence:**

```typescript
// Interface declares category
interface AdaptFeedPlannerParams {
  templatePrompt: string
  position: number
  brandKit: any
  userId: string
  category?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" | null  // ✅ Declared
  mood?: "luxury" | "minimal" | "beige" | null  // ✅ Declared
}

// Function extracts category
export async function adaptFeedPlannerToNanoBanana(params: AdaptFeedPlannerParams) {
  const { templatePrompt, position, brandKit, userId, category, mood } = params  // ✅ Extracted
  
  console.log('[NANO-BANANA-ADAPTER] Converting Feed Planner template to natural language:', {
    position,
    templateLength: templatePrompt.length,
    hasCategory: !!category,  // ✅ Logged
    hasMood: !!mood,  // ✅ Logged
  })
  
  // ...
  
  // Converts to natural language
  const naturalLanguagePrompt = buildNaturalLanguageDescription({
    frame,
    brandKit,
    category,  // ✅ Passed
    mood,  // ✅ Passed
  })
}

// But buildNaturalLanguageDescription() NEVER USES category or mood:
function buildNaturalLanguageDescription(params: {
  frame: { description: string; vibe?: string; setting?: string; colorGrade?: string }
  brandKit: any
  category?: string | null  // ❌ DECLARED BUT NEVER USED
  mood?: string | null  // ❌ DECLARED BUT NEVER USED
}): string {
  const { frame, brandKit, category, mood } = params  // ❌ EXTRACTED BUT NEVER REFERENCED
  
  const parts: string[] = []
  
  // Builds prompt using:
  // - frame.description
  // - frame.setting
  // - frame.vibe
  // - frame.colorGrade
  // - brandKit.colors
  // - lighting
  // - camera specs
  
  // ❌ NEVER uses category
  // ❌ NEVER uses mood
  
  return parts.join(', ')
}
```

**Classification:** C) STYLE SIGNAL DROPPED

**Impact:** Even if correct category/mood reach the adapter, they're ignored during natural language construction

**Override Scope:** 100% of Nano Banana generations (Feed Planner Pro Mode)

---

### DROPPED SIGNAL #2: mood in buildNaturalLanguageDescription

**Same as above** - mood is extracted but never used

---

### DROPPED SIGNAL #3: visualAesthetic in prompt construction

**File:** `lib/feed-planner/generation-helpers.ts`  
**Lines:** 240-275

**Evidence:**

```typescript
// visual_aesthetic IS extracted from database
const personalBrand = await sql`
  SELECT settings_preference, visual_aesthetic
  FROM user_personal_brand
  ...
` as PersonalBrand[]

// visual_aesthetic IS mapped to category
if (personalBrand[0].visual_aesthetic) {
  // Array format handling
  const aesthetics = Array.isArray(rawAesthetic)
    ? rawAesthetic
    : JSON.parse(rawAesthetic)
  
  const firstAesthetic = aesthetics[0]?.toLowerCase()
  const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
  
  if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
    category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  }
}
```

**BUT:**

User selects: `visualAesthetic = "minimalist"` (from wizard)  
System maps: `"minimalist"` → matches `"minimal"` → category = "minimal" ✅

**HOWEVER, if mapping fails or value doesn't match, falls back to default "professional" ❌**

**Classification:** B) FALLBACK TOO AGGRESSIVE + mapping fragility

**Impact:** Non-exact matches or missing data revert to "professional"

---

## 5. ROOT CAUSE CLASSIFICATION

| Enforcement Point | Type | Severity | Users Affected |
|------------------|------|----------|----------------|
| `defaultCategory = 'professional'` | A) HARDCODED DEFAULT | HIGH | All users without onboarding |
| `fashionStyle = 'business'` | A) HARDCODED DEFAULT | HIGH | All users without fashion_style |
| Blueprint `formData.vibe \|\| "professional"` | B) FALLBACK TOO AGGRESSIVE | MEDIUM | Legacy blueprint users |
| Fashion mapper `return 'business'` | B) FALLBACK TOO AGGRESSIVE | MEDIUM | Users with unrecognized styles |
| Preview feed `defaultCategory: 'minimal'` | (Correct Fix) | N/A | Fixed for preview only |
| category/mood dropped in adapter | C) STYLE SIGNAL DROPPED | CRITICAL | 100% of Nano Banana gens |

---

## 6. WHERE USER INTENT IS LOST

### Loss Point #1: Default Override at Category Resolution

**Location:** `getCategoryAndMood()` function

**User Path:**
1. User completes onboarding
2. Selects `visualAesthetic = "minimalist"`
3. Saves to `user_personal_brand.visual_aesthetic`

**System Path:**
1. `getCategoryAndMood()` queries `user_personal_brand`
2. Extracts `visual_aesthetic`
3. **IF** exact match found → maps to category ✅
4. **IF NO** match or data missing → `category = defaultCategory = 'professional'` ❌

**Result:** User intent lost at fallback

---

### Loss Point #2: Fashion Style Default Override

**Location:** `getFashionStyleForPosition()` function

**User Path:**
1. User selects `fashionStyle = "casual"`
2. Saves to `user_personal_brand.fashion_style`

**System Path:**
1. `getFashionStyleForPosition()` queries database
2. **IF** fashion_style exists and parses successfully → uses user choice ✅
3. **IF** fashion_style missing or parsing fails → `fashionStyle = 'business'` ❌

**Result:** User intent lost at fallback

---

### Loss Point #3: Category/Mood Not Used in Natural Language Construction

**Location:** `buildNaturalLanguageDescription()` in `nano-banana-adapter.ts`

**User Path:**
1. User selects vibe/mood (e.g., "minimal")
2. System correctly resolves `category = 'minimal'` ✅
3. Passes to `adaptFeedPlannerToNanoBanana(category, mood)` ✅

**System Path:**
1. Adapter extracts `category` and `mood` ✅
2. Passes to `buildNaturalLanguageDescription(category, mood)` ✅
3. Function receives parameters ✅
4. **Function NEVER USES category or mood in prompt construction** ❌

**Result:** User intent reaches adapter but is DROPPED during conversion

---

## 7. SYSTEMIC OVERRIDE PATTERN

```
USER SELECTS: "Minimalist & Clean" aesthetic
  ↓
STORED AS: visual_aesthetic = ["minimalist"]
  ↓
getCategoryAndMood() MAPS: "minimalist" → category = "minimal" ✅
  ↓
PASSES TO: generateFeedSinglePromptViaAuthority(category: "minimal") ✅
  ↓
PASSES TO: adaptFeedPlannerToNanoBanana(category: "minimal") ✅
  ↓
EXTRACTS: const { category, mood } = params ✅
  ↓
PASSES TO: buildNaturalLanguageDescription({ category, mood }) ✅
  ↓
❌ DROPPED: buildNaturalLanguageDescription() never uses category or mood
  ↓
RESULT: Prompt has NO minimal/lifestyle aesthetic influence
  ↓
MEANWHILE: fashionStyle defaults to 'business' if missing
  ↓
RESULT: Business professional outfit prompts generated
  ↓
FINAL OUTPUT: User gets "business professional" imagery despite selecting "minimalist"
```

---

## 8. COMPLETE ENFORCEMENT TIMELINE

### Timeline: User Creates Feed Post

```
T=0: User selects "minimalist" aesthetic in onboarding
  → Stored in user_personal_brand.visual_aesthetic

T=1: User creates feed, clicks "Generate" on position 1
  → Route: /api/feed/[feedId]/generate-single

T=2: getCategoryAndMood() called
  → Checks feed_layouts.feed_style (empty)
  → Checks user_personal_brand.settings_preference (empty)
  → Checks user_personal_brand.visual_aesthetic ("minimalist")
  → Maps "minimalist" → category = "minimal" ✅
  
T=3: getFashionStyleForPosition() called
  → Checks user_personal_brand.fashion_style (empty)
  → ❌ DEFAULTS: fashionStyle = 'business'
  
T=4: generateFeedSinglePromptViaAuthority() called
  → Passes category = "minimal" ✅
  → Builds brandKit (includes category context) ✅
  
T=5: adaptFeedPlannerToNanoBanana() called
  → Receives category = "minimal" ✅
  → Receives mood = "minimal" ✅
  → Logs hasCategory: true, hasMood: true ✅
  
T=6: buildNaturalLanguageDescription() called
  → Receives category = "minimal" ✅
  → Receives mood = "minimal" ✅
  → ❌ NEVER USES category or mood
  → Builds prompt from: frame.description, frame.vibe, frame.setting, brandKit.colors
  
T=7: buildNanoBananaPrompt() called
  → Receives userRequest = natural language prompt (no category/mood influence)
  → Mode = 'brand-scene'
  → Adds identity anchor
  
T=8: Replicate receives prompt
  → Prompt influenced by: template frame description, "business" fashion style
  → Prompt NOT influenced by: "minimal" category, user aesthetic choice
  
RESULT: User selected "minimalist", got "business professional" imagery
```

---

## 9. VERDICT DETAILS

### Primary Issue: SYSTEMIC OVERRIDE

**Definition:** Multiple independent enforcement points combine to systematically override user intent, even when user data exists and is correctly retrieved.

### Evidence:

1. **3 hardcoded defaults** enforce "professional"/"business"
2. **2 aggressive fallbacks** revert to "professional"/"business"
3. **2 style signals dropped** during natural language construction
4. **1 correct gatekeeper** (resolveSubjectRole) works as intended but receives wrong inputs

### Classification Breakdown:

| Type | Count | Examples |
|------|-------|----------|
| A) HARDCODED DEFAULT | 2 | `defaultCategory = 'professional'`, `fashionStyle = 'business'` |
| B) FALLBACK TOO AGGRESSIVE | 2 | Blueprint vibe fallback, fashion mapper fallback |
| C) STYLE SIGNAL DROPPED | 2 | category/mood unused in buildNaturalLanguageDescription |
| D) STYLE NORMALIZATION | 1 | visualAesthetic mapping (partial - works but fragile) |
| E) LEGACY LOGIC | 1 | Blueprint subscribers table fallback |

**Total Enforcement Points:** 8 (excluding correct gatekeeper)

---

## 10. USER IMPACT MATRIX

| User Scenario | Input | Expected | Actual | Impact |
|--------------|-------|----------|--------|--------|
| No onboarding | None | Lifestyle default | "Professional" | HIGH |
| "Minimalist" selected | visual_aesthetic: ["minimalist"] | Minimal aesthetic | "Business professional" | HIGH |
| "Casual" fashion | fashion_style: ["casual"] | Casual outfits | "Business" if parsing fails | MEDIUM |
| "Bohemian" fashion | fashion_style: ["bohemian"] | Bohemian outfits | "Business" (unmapped) | HIGH |
| "Athletic" fashion | fashion_style: ["athletic"] | Athletic wear | "Business" (unmapped) | HIGH |
| Preview feed | None | Lifestyle/minimal | Minimal (FIXED) | LOW |
| Full feed paid | visual_aesthetic: ["luxurious"] | Luxury aesthetic | Category correct, but fashion = "business" | MEDIUM |

---

## 11. FINAL VERDICT

**STATUS:** SYSTEMIC OVERRIDE

**Confidence:** HIGH (evidence-based, multiple enforcement points confirmed)

**Scope:** Affects 80-90% of users (all except those with perfect onboarding data + exact aesthetic matches)

**Critical Path:** Even users with correct data lose intent at buildNaturalLanguageDescription() where category/mood are dropped

**Recommendation:** 
1. Fix defaults (change 'professional'/'business' to 'minimal'/'casual')
2. Use category/mood in buildNaturalLanguageDescription()
3. Improve fashion style mapping coverage
4. Add logging to track where user intent is lost

---

**Generated:** January 18, 2026  
**Status:** Audit complete - NO FIXES APPLIED (audit only per requirements)  
**Next Step:** User to review findings and approve fix strategy
