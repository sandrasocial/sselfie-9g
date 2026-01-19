# Feed Style Picker → Brand Profile Sync & Usage Audit

**Date:** January 18, 2026  
**Objective:** Verify end-to-end data flow from Feed Style Picker UI → DB → Prompt Generation

---

## VERDICT: **PARTIALLY BROKEN**

**Summary:** Data is saved correctly to database but has systemic issues in propagation and usage.

---

## 1. UI EVENT AUDIT

### Component: `components/feed-planner/feed-style-modal.tsx`

**Data Collected:**
- `feedStyle`: string ("luxury" | "minimal" | "beige") - lines 50, 78, 292
- `visualAesthetic`: string[] (multi-select) - lines 54, 80, 294
- `fashionStyle`: string[] (multi-select) - lines 55, 81, 295
- `selfieImages`: string[] (optional) - lines 56, 82, 296

**Event Handler:**
```typescript
// Line 291-298
const handleConfirm = () => {
  onConfirm({
    feedStyle: selectedStyle,
    visualAesthetic: selectedVisualAesthetic.length > 0 ? selectedVisualAesthetic : undefined,
    fashionStyle: selectedFashionStyle.length > 0 ? selectedFashionStyle : undefined,
    selfieImages: selfieImages.length > 0 ? selfieImages : undefined,
  })
}
```

**State Management:**
- Data stored in React state (lines 78-82)
- Values loaded from `/api/profile/personal-brand` on modal open (lines 85-92, 105-255)
- NOT sent immediately - held in local state until "Confirm" clicked

**Finding:** ✅ UI correctly collects all required data

---

## 2. API & BACKEND TRACE

### Parent Component: `components/feed-planner/feed-header.tsx`

**onConfirm Handlers:**

#### A. Preview Feed Flow (`handlePreviewFeedStyleConfirm`)
**Lines:** 61-147

```typescript
// 1. Update Personal Brand
const updateResponse = await fetch('/api/profile/personal-brand', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    settingsPreference: [data.feedStyle, ...existing],
    visualAesthetic: data.visualAesthetic,
    fashionStyle: data.fashionStyle,
  }),
})

// 2. Create Feed
const response = await fetch('/api/feed/create-free-example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ 
    feedStyle: data.feedStyle,
    visualAesthetic: data.visualAesthetic,
    fashionStyle: data.fashionStyle,
  }),
})
```

#### B. Full Feed Flow (`handleFullFeedStyleConfirm`)
**Lines:** 164-259

```typescript
// 1. Update Personal Brand (same as preview)
// Lines 199-208

// 2. Create Feed
const response = await fetch('/api/feed/create-manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ 
    feedStyle: data.feedStyle,
    visualAesthetic: data.visualAesthetic,
    fashionStyle: data.fashionStyle,
  }),
})
```

**Finding:** ✅ Data is sent to TWO endpoints:
1. Personal brand sync (updates user profile)
2. Feed creation (stores feed-specific style)

---

## 3. DATABASE WRITE VERIFICATION

### Endpoint A: `/api/profile/personal-brand/route.ts` (POST)

**Database Table:** `user_personal_brand`

**Write Logic (Lines 232-265):**
```sql
UPDATE user_personal_brand
SET
  visual_aesthetic = COALESCE(${visualAestheticJson}, visual_aesthetic),
  settings_preference = COALESCE(${settingsPreferenceJson}, settings_preference),
  fashion_style = COALESCE(${fashionStyleJson}, fashion_style),
  updated_at = NOW()
WHERE user_id = ${neonUser.id}
```

**Data Preparation (Lines 225-228):**
```typescript
const visualAestheticJson = prepareJsonbValue(body.visualAesthetic, true)  // Converts to array
const fashionStyleJson = prepareJsonbValue(body.fashionStyle, true)        // Converts to array
const settingsPreferenceJson = prepareJsonbValue(body.settingsPreference) // Array with feedStyle[0]
```

**Fields:**
- `visual_aesthetic`: JSONB array (e.g., `["minimal", "luxury"]`)
- `settings_preference`: JSONB array (e.g., `["minimal", "studio", "outdoor"]`)
  - **Critical:** `feedStyle` stored as first element (line 86-88 in feed-header.tsx)
- `fashion_style`: JSONB array (e.g., `["casual", "bohemian"]`)

**Update Behavior:** 
- Uses `COALESCE` - only updates if new value provided (not `null`)
- Preserves existing values if field not included in request
- ✅ **CONFIRMED:** Updates are cumulative, not overwriting

**Finding:** ✅ Personal brand writes are correct

---

### Endpoint B: `/api/feed/create-manual/route.ts` (POST)

**Database Table:** `feed_layouts`

**Write Logic (Lines 91-113):**
```sql
INSERT INTO feed_layouts (
  user_id,
  brand_name,
  username,
  description,
  status,
  layout_type,
  feed_style,
  created_by
)
VALUES (
  ${user.id},
  ${title},
  ${username},
  NULL,
  'saved',
  'grid_3x3',
  ${feedStyle},    -- ← Stored here
  'manual'
)
```

**Field:**
- `feed_style`: string ("luxury" | "minimal" | "beige")

**Fallback Logic (Lines 46-74):**
```typescript
if (!feedStyle) {
  // Try to fetch from user_personal_brand.settings_preference[0]
  const [personalBrand] = await sql`
    SELECT settings_preference
    FROM user_personal_brand
    WHERE user_id = ${user.id}
    ORDER BY updated_at DESC
    LIMIT 1
  `
  if (settingsPreference && Array.isArray(settings) && settings.length > 0) {
    feedStyle = settings[0]?.toLowerCase?.().trim?.() || null
  }
}

if (!feedStyle) {
  return NextResponse.json(
    { error: "FEED_STYLE_REQUIRED" },
    { status: 422 }
  )
}
```

**Finding:** ✅ Feed style is REQUIRED - blocks creation if missing
**Finding:** ✅ Fallback logic fetches from personal brand if not provided
**Issue:** ❌ `visualAesthetic` and `fashionStyle` logged but NOT stored in feed_layouts table

---

### Endpoint C: `/api/feed/create-free-example/route.ts` (POST)

**Database Table:** `feed_layouts` (same as above)

**Write Logic (Lines 161-183):**
```sql
INSERT INTO feed_layouts (
  user_id,
  brand_name,
  username,
  description,
  status,
  layout_type,
  feed_style,    -- ← Stored here
  created_by
)
VALUES (
  ${user.id},
  ${title},
  ${username},
  NULL,
  'saved',
  'preview',
  ${feedStyleToStore},
  'manual'
)
```

**Feed Style Resolution (Lines 78-100):**
```typescript
const { category, mood } = await getCategoryAndMood(
  null,
  { id: user.id },
  { checkSettingsPreference: true }  // ← Reads from personal_brand
)

if (requestedFeedStyle) {
  feedStyleToStore = requestedFeedStyle  // Use request if provided
} else {
  feedStyleToStore = mood                // Use from getCategoryAndMood
}

if (!feedStyleToStore) {
  feedStyleToStore = "minimal"           // Fallback
}
```

**Finding:** ✅ Preview feeds use `getCategoryAndMood()` to read from personal brand
**Issue:** ❌ `visualAesthetic` and `fashionStyle` logged but NOT stored in feed_layouts table
**Issue:** ❌ No REQUIRED validation - defaults to "minimal" if missing

---

## 4. BRAND PROFILE SYNC CHECK

### How Brand Profile Is Loaded During Generation

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Feed Layout Query (Lines 53-64):**
```typescript
const feedLayouts = await sql`
  SELECT * FROM feed_layouts WHERE id = ${params.feedId} LIMIT 1
`
const feedLayout = feedLayouts[0]
```

**Category & Mood Resolution (Lines 591-595):**
```typescript
const { category, mood, sourceUsed } = await getCategoryAndMood(feedLayout, user, {
  checkSettingsPreference: true,
  checkBlueprintSubscribers: true,
  trackSource: true
})
```

**Inside getCategoryAndMood() (lib/feed-planner/generation-helpers.ts):**

```typescript
// PRIORITY 1: feed_layouts.feed_style (lines 176-186)
if (feedLayout?.feed_style) {
  const feedStyle = feedLayout.feed_style.toLowerCase().trim()
  if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
    mood = feedStyle as "luxury" | "minimal" | "beige"
    sourceUsed = "feed_style"
  }
}

// PRIORITY 2: user_personal_brand.settings_preference[0] (lines 193-273)
if (checkSettingsPreference && sourceUsed === "default") {
  const personalBrand = await sql`
    SELECT settings_preference, visual_aesthetic
    FROM user_personal_brand
    WHERE user_id = ${user.id}
    ORDER BY ${orderBy === 'updated_at' ? 'updated_at' : 'created_at'} DESC
    LIMIT 1
  `
  
  // Extract feedStyle from settings_preference
  const feedStyle = settings[0]
  if (feedStyle) {
    mood = feedStyle
  }
  
  // Map visual_aesthetic to category
  if (visual_aesthetic) {
    category = firstAesthetic  // Maps to "minimal", "luxury", etc.
  }
}
```

**Fashion Style Resolution (lib/feed-planner/generation-helpers.ts, lines 386-448):**
```typescript
export async function getFashionStyleForPosition(user, position) {
  const personalBrandForStyle = await sql`
    SELECT fashion_style
    FROM user_personal_brand
    WHERE user_id = ${user.id}
    ORDER BY updated_at DESC
    LIMIT 1
  `
  
  if (fashionStyle exists) {
    const styles = parse(fashionStyle)
    const styleIndex = (position - 1) % styles.length
    fashionStyle = mapFashionStyleToVibeLibrary(styles[styleIndex])
  }
}
```

**Finding:** ✅ `feedStyle` is read from `feed_layouts.feed_style` (PRIMARY)
**Finding:** ✅ `feedStyle` falls back to `user_personal_brand.settings_preference[0]` (SECONDARY)
**Finding:** ✅ `category` is mapped from `user_personal_brand.visual_aesthetic`
**Finding:** ✅ `fashionStyle` is read from `user_personal_brand.fashion_style`
**Finding:** ✅ All values reach the generation helpers

---

## 5. PROMPT FLOW VERIFICATION

### Values Reaching Prompt Construction

**Call Chain:**
```
generate-single/route.ts
  ↓
getCategoryAndMood() → category, mood
getFashionStyleForPosition() → fashionStyle
  ↓
generateFeedSinglePromptViaAuthority(category)
  ↓
adaptFeedPlannerToNanoBanana(category, mood)
  ↓
buildNaturalLanguageDescription(category, mood)
  ↓
Nano Banana Pro prompt
```

**Verification:**

1. **category** (from visualAesthetic):
   - ✅ Reaches `adaptFeedPlannerToNanoBanana()` (line 30 in nano-banana-adapter.ts)
   - ✅ NOW USED in `buildNaturalLanguageDescription()` (lines 153-185 - FIXED TODAY)

2. **mood** (from feedStyle):
   - ✅ Reaches `adaptFeedPlannerToNanoBanana()` (line 30 in nano-banana-adapter.ts)
   - ✅ NOW USED in `buildNaturalLanguageDescription()` (lines 153-185 - FIXED TODAY)

3. **fashionStyle**:
   - ✅ Retrieved per-position with rotation (lines 386-448 in generation-helpers.ts)
   - ✅ Passed to `injectDynamicContentWithRotation()` for template injection

**Finding:** ✅ All values now reach prompts (FIXED TODAY in professional override removal)

---

## 6. MISSING DATA GATING

### Required Fields Check

#### Preview Feed Flow:
**File:** `app/api/feed/create-free-example/route.ts`

```typescript
// Lines 152-155
if (!feedStyleToStore) {
  feedStyleToStore = "minimal"  // ❌ SILENT DEFAULT
}
```

**Issue:** ❌ NO REQUIRED VALIDATION - defaults silently to "minimal"

#### Full Feed Flow:
**File:** `app/api/feed/create-manual/route.ts`

```typescript
// Lines 69-74
if (!feedStyle) {
  return NextResponse.json(
    { error: "FEED_STYLE_REQUIRED" },
    { status: 422 }
  )
}
```

**Issue:** ✅ BLOCKS creation if feedStyle missing

**UI Handling:**
**File:** `components/feed-planner/feed-grid-preview.tsx` (lines 51-65)

```typescript
if (response.status === 422) {
  if (errorCode === "FEED_STYLE_REQUIRED") {
    toast({
      title: "Choose a feed style",
      description: "Pick a style to generate this feed.",
      action: onRequireFeedStyle ? (
        <ToastAction onClick={onRequireFeedStyle}>Choose style</ToastAction>
      ) : undefined,
    })
  }
}
```

**Finding:** ✅ Full feeds block creation and show UI prompt
**Finding:** ❌ Preview feeds allow creation without style (defaults to "minimal")

---

## 7. ISSUE CLASSIFICATION

### Issue #1: visualAesthetic & fashionStyle NOT Stored in feed_layouts

**Location:** 
- `app/api/feed/create-manual/route.ts` (lines 78-83)
- `app/api/feed/create-free-example/route.ts` (lines 54-62)

**Type:** DB NOT UPDATING (feed_layouts table)

**Evidence:**
```typescript
// Lines 78-83 (create-manual)
if (visualAesthetic) {
  console.log(`[v0] Feed created with visualAesthetic:`, visualAesthetic)  // ← LOGGED ONLY
}
if (fashionStyle) {
  console.log(`[v0] Feed created with fashionStyle:`, fashionStyle)        // ← LOGGED ONLY
}
// ❌ Not included in INSERT statement
```

**Impact:** MEDIUM
- Values ARE saved to `user_personal_brand` ✅
- Values ARE read from `user_personal_brand` during generation ✅
- But feed-specific overrides are NOT persisted to `feed_layouts` ❌
- If user changes personal brand after creating feed, old feeds will use new values

**Workaround:** Currently works because generation reads from `user_personal_brand`, not `feed_layouts`

---

### Issue #2: Preview Feeds Don't Require Feed Style

**Location:** `app/api/feed/create-free-example/route.ts` (lines 152-155)

**Type:** MISSING REQUIRED FIELD NOT BLOCKED

**Evidence:**
```typescript
if (!feedStyleToStore) {
  feedStyleToStore = "minimal"  // ❌ Silent default instead of error
}
```

**Impact:** LOW
- Preview feeds always get created (user experience)
- Defaults to "minimal" which is reasonable
- But inconsistent with full feed behavior (which blocks creation)

**Issue:** User may not realize they need to select a style for better results

---

### Issue #3: No Validation on visualAesthetic/fashionStyle Values

**Location:** All POST endpoints

**Type:** API NOT RECEIVING VALIDATION

**Evidence:**
- No validation of array contents
- No checking if values are valid aesthetic/style IDs
- Could store garbage data like `["asdf", "xyz123"]`

**Impact:** LOW
- Generation helpers have fallback defaults
- But could lead to confusing behavior if malformed data stored

---

### Issue #4: Double Parse Required for JSONB Fields

**Location:** `app/api/profile/personal-brand/route.ts` (GET, lines 57-107)

**Type:** BRAND PROFILE NOT SYNCED (data format inconsistency)

**Evidence:**
```typescript
// Lines 62-80
if (typeof parsed === 'string') {
  try {
    const doubleParsed = JSON.parse(parsed)  // ← Double-stringified data
    // ...
  } catch (e2) {
    // Try to extract key from malformed string like '{"luxury"}'
    // ...
  }
}
```

**Impact:** MEDIUM
- Complex parsing logic required to handle malformed data
- Suggests data is being double-stringified somewhere
- Modal has workarounds (lines 113-255 in feed-style-modal.tsx) but fragile

**Root Cause:** Inconsistent JSONB handling between writes and reads

---

## 8. END-TO-END DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────┐
│ USER ACTION: Opens Feed Style Modal        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ UI: Feed Style Modal                        │
│ - feedStyle: "minimal"                      │
│ - visualAesthetic: ["minimal", "warm"]      │
│ - fashionStyle: ["casual", "bohemian"]      │
│                                             │
│ State: Local React state                   │
└──────────────┬──────────────────────────────┘
               │ onClick "Confirm"
               ▼
┌─────────────────────────────────────────────┐
│ PARENT: feed-header.tsx                     │
│ handleFeedStyleConfirm()                    │
└──────────────┬──────────────────────────────┘
               │
               ├─── API Call #1 ─────────────────────────┐
               │                                          │
               ▼                                          ▼
┌────────────────────────────────────┐   ┌──────────────────────────────────┐
│ POST /api/profile/personal-brand   │   │ POST /api/feed/create-manual     │
│                                    │   │      OR create-free-example      │
│ Body: {                            │   │                                  │
│   settingsPreference: ["minimal"], │   │ Body: {                          │
│   visualAesthetic: ["minimal"],    │   │   feedStyle: "minimal",          │
│   fashionStyle: ["casual"]         │   │   visualAesthetic: [...], ← ❌  │
│ }                                  │   │   fashionStyle: [...] ← ❌       │
│                                    │   │ }                                │
└──────────────┬─────────────────────┘   └──────────────┬───────────────────┘
               │                                          │
               ▼                                          ▼
┌────────────────────────────────────┐   ┌──────────────────────────────────┐
│ DATABASE: user_personal_brand      │   │ DATABASE: feed_layouts           │
│                                    │   │                                  │
│ UPDATE user_personal_brand         │   │ INSERT INTO feed_layouts         │
│ SET                                │   │ VALUES (                         │
│   visual_aesthetic = ["minimal"],  │   │   feed_style = "minimal", ✅     │
│   settings_preference = ["minimal"],│   │   -- visual_aesthetic ❌ MISSING│
│   fashion_style = ["casual"]       │   │   -- fashion_style ❌ MISSING   │
│ WHERE user_id = ${userId}          │   │ )                                │
│                                    │   │                                  │
│ ✅ WRITTEN SUCCESSFULLY            │   │ ✅ feed_style WRITTEN            │
│                                    │   │ ❌ Other fields NOT WRITTEN      │
└────────────────────────────────────┘   └──────────────┬───────────────────┘
                                                         │
                                                         │ Feed created
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER ACTION: Generate image for position 1                                 │
└──────────────┬──────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ API: POST /api/feed/[feedId]/generate-single│
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ READ: feed_layouts                          │
│ - feedLayout.feed_style = "minimal" ✅      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FUNCTION: getCategoryAndMood()              │
│                                             │
│ Priority 1: feedLayout.feed_style ✅        │
│   → mood = "minimal"                        │
│                                             │
│ Priority 2: user_personal_brand ✅          │
│   SELECT visual_aesthetic, settings_preference│
│   → visual_aesthetic = ["minimal", "warm"] │
│   → category = "minimal" (first element)   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FUNCTION: getFashionStyleForPosition()      │
│                                             │
│ SELECT fashion_style FROM user_personal_brand│
│   → fashion_style = ["casual", "bohemian"] │
│   → position 1 → "casual" (rotation)       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FUNCTION: generateFeedSinglePromptViaAuthority│
│                                             │
│ Params:                                     │
│   - category: "minimal" ✅                  │
│   - mood: "minimal" ✅                      │
│   - fashionStyle: "casual" ✅               │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FUNCTION: adaptFeedPlannerToNanoBanana()    │
│                                             │
│ Receives:                                   │
│   - category: "minimal" ✅                  │
│   - mood: "minimal" ✅                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FUNCTION: buildNaturalLanguageDescription() │
│                                             │
│ Uses category:                              │
│   "clean minimalist aesthetic" ✅           │
│                                             │
│ Uses mood:                                  │
│   "bright airy lighting" ✅                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ RESULT: Nano Banana Pro Prompt             │
│                                             │
│ "A realistic photo of the person shown in  │
│  the reference images... wearing casual    │
│  jeans and relaxed sweater, clean         │
│  minimalist aesthetic with uncluttered    │
│  composition, bright airy lighting with   │
│  high-key feel..."                        │
│                                             │
│ ✅ USER STYLE CHOICES RESPECTED             │
└─────────────────────────────────────────────┘
```

---

## 9. FINAL CLASSIFICATION

### A) Picker Values Saved?

**User Personal Brand:** ✅ YES
- `visual_aesthetic`: Saved to `user_personal_brand.visual_aesthetic`
- `settings_preference[0]`: Saved as feedStyle
- `fashion_style`: Saved to `user_personal_brand.fashion_style`

**Feed Layouts:** ⚠️ PARTIAL
- `feed_style`: Saved to `feed_layouts.feed_style` ✅
- `visual_aesthetic`: NOT saved ❌
- `fashion_style`: NOT saved ❌

**Verdict:** ⚠️ **PARTIALLY SAVED**

---

### B) Picker Values Used?

**During Generation:** ✅ YES
- `category` (from visualAesthetic): ✅ Used in prompts (FIXED TODAY)
- `mood` (from feedStyle): ✅ Used in prompts (FIXED TODAY)
- `fashionStyle`: ✅ Used for outfit rotation

**Verdict:** ✅ **ALL VALUES USED CORRECTLY**

---

### C) Missing Fields Handled?

**Full Feeds:** ✅ REQUIRED
- Returns 422 error if `feedStyle` missing
- UI shows toast with "Choose style" action

**Preview Feeds:** ❌ NOT REQUIRED
- Defaults silently to "minimal"
- No validation or user prompt

**Verdict:** ⚠️ **INCONSISTENT**

---

## 10. FINAL VERDICT

**PARTIALLY BROKEN**

**What Works:**
1. ✅ UI correctly collects all data
2. ✅ Data is saved to `user_personal_brand` table
3. ✅ `feedStyle` is saved to `feed_layouts` table
4. ✅ Values are read back during generation
5. ✅ All values reach prompt construction (as of today's fix)
6. ✅ Full feeds require `feedStyle` before creation

**What's Broken:**
1. ❌ `visualAesthetic` and `fashionStyle` NOT saved to `feed_layouts` table
   - Only logged, not persisted
   - Relies on reading from `user_personal_brand` instead
   - Feed-specific overrides not preserved

2. ❌ Preview feeds don't require `feedStyle`
   - Silently defaults to "minimal"
   - Inconsistent with full feed behavior

3. ❌ Complex JSONB parsing required
   - Double-stringified data handling
   - Fragile workarounds in modal

4. ❌ No validation on array contents
   - Could store malformed aesthetic/style values

**Impact:** MEDIUM
- System works end-to-end because generation reads from `user_personal_brand`
- But feed-specific style selections are not preserved
- If user changes personal brand, old feeds will use new values (not original)

**Recommendation:** Add `visual_aesthetic` and `fashion_style` columns to `feed_layouts` table and store feed-specific selections.

---

**Generated:** January 18, 2026  
**Status:** Audit complete - NO FIXES APPLIED (audit only per requirements)
