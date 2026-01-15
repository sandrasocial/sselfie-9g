# TEMPLATE INJECTION IMPLEMENTATION AUDIT (CORRECTED)

**Date:** 2025-01-XX  
**Auditor:** Senior Engineer (Audit Mode)  
**Scope:** Template injection system for preview feeds and full feeds (free & paid)  
**Objective:** Identify inconsistencies, over-engineering, and conflicts between free/paid and preview/expanded flows

---

## EXECUTIVE SUMMARY

### Overall Assessment: **BUG FOUND - PAID USERS BYPASS TEMPLATE INJECTION** 🔴

**Status:** Template injection system is correctly designed and works for free users, but **paid users have a critical bug** where they sometimes bypass the injection system, causing inconsistent results.

### Key Findings

1. **🔴 CRITICAL BUG: Paid Users Dual Paths** - Paid users have TWO competing code paths:
   - **Path A (Lines 324-444):** ✅ CORRECT - Uses template injection system
   - **Path B (Lines 778-1224):** ❌ BUGGY - Bypasses injection, passes RAW templates to Maya
   - Both paths can execute, causing inconsistent results

2. **🔴 CRITICAL: Raw Templates Passed to Maya** - Line 1054 passes RAW template (with placeholders) instead of injected template
3. **🔴 CRITICAL: No Rotation Tracking for Paid Users** - Rotation indices never increment for paid users
4. **🟡 HIGH: Code Duplication** - Template selection logic duplicated 3+ times with slight variations
5. **🟡 MEDIUM: Inconsistent Source Priority** - Different priority orders for mood/category selection

### Must Fix Before Deploy

1. **Fix Paid User Template Injection** - Make Path B use injection system before passing to Maya
2. **Remove Duplicate Path A** - Path A is redundant, should be removed
3. **Add Rotation Tracking** - Increment rotation after paid user generation
4. **Standardize Source Priority** - Use consistent priority order everywhere

### Can Ship Now, Fix Later

1. **Simplify Preview Feed Style Matching** - Current logic may be over-engineered
2. **Extract Template Selection Logic** - Reduce code duplication

---

## THE BUG EXPLAINED

### What Should Happen (Correct Architecture)

**For ALL Users (Free & Paid):**
1. Get template from `BLUEPRINT_PHOTOSHOOT_TEMPLATES`
2. **Inject dynamic content** using `injectDynamicContentWithRotation()`:
   - Pull outfits from vibe library (with rotation tracking)
   - Pull locations from vibe library (with rotation tracking)
   - Pull accessories from vibe library (with rotation tracking)
   - Replace placeholders in template
3. **Result:** Structured, high-quality prompt with specific details

**For Free Users:**
- Use injected template directly (preview) or extract single scene (full feed)
- Rotation increments automatically

**For Paid Users:**
- Extract single scene from injected template
- Pass **INJECTED scene** to Maya as reference
- Maya enhances the structured prompt (adds personalization)
- Rotation increments after generation

### What Actually Happens (Current Bug)

**Free Users:** ✅ Works correctly
- Template injection runs
- Rotation tracking works
- Consistent results

**Paid Users:** ❌ **BUG - Two Competing Paths**

**Path A (Lines 324-444):** ✅ CORRECT
```typescript
// Gets template
const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

// ✅ INJECTS dynamic content
const injectedTemplate = await injectDynamicContentWithRotation(...)

// ✅ Extracts single scene
finalPrompt = buildSingleImagePrompt(injectedTemplate, post.position)

// ✅ Saves to DB
await sql`UPDATE feed_posts SET prompt = ${finalPrompt}`
```

**Path B (Lines 778-1224):** ❌ BUGGY
```typescript
// Gets RAW template (with placeholders)
templateReferencePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]  // ❌ RAW

// ❌ Passes RAW template to Maya (no injection!)
const mayaResponse = await fetch('/api/maya/generate-feed-prompt', {
  body: JSON.stringify({
    referencePrompt: templateReferencePrompt,  // ❌ RAW TEMPLATE
  })
})

// ❌ Maya generates from scratch, overwrites Path A's injected scene
finalPrompt = mayaData.prompt
```

**The Problem:**
- Both paths can execute for the same post
- Path A saves injected scene → Path B overwrites with Maya prompt
- Result: **Inconsistent** - sometimes injected (Path A wins), sometimes Maya-generated (Path B wins)
- **No rotation tracking** - all feeds use same outfits/locations

### The Fix Required

1. **Remove Path A** (redundant, lines 324-444)
2. **Fix Path B** to use injection BEFORE Maya:
   ```typescript
   // Get template
   const fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
   
   // ✅ INJECT dynamic content (same as free users)
   const injectedTemplate = await injectDynamicContentWithRotation(
     fullTemplate, vibeKey, fashionStyle, user.id
   )
   
   // ✅ Extract single scene
   const singleScenePrompt = buildSingleImagePrompt(injectedTemplate, post.position)
   
   // ✅ Pass INJECTED scene to Maya (not raw template)
   const mayaResponse = await fetch('/api/maya/generate-feed-prompt', {
     body: JSON.stringify({
       referencePrompt: singleScenePrompt,  // ✅ INJECTED SCENE
     })
   })
   
   // ✅ Increment rotation after generation
   await incrementRotationState(user.id, vibeKey, fashionStyle)
   ```

---

## 1) CODE FLOW ANALYSIS

### 1.1 Preview Feed Generation (Free & Paid Users)

**Route:** `app/api/feed/[feedId]/generate-single/route.ts`

**Detection:**
- Line 307: `const isPreviewFeed = feedLayout?.layout_type === 'preview'`
- Line 317-319: Forces regeneration if preview feed (ignores stored prompt)

**Template Selection (Lines 460-509):**
```typescript
// PRIMARY SOURCE: feed.feed_style (per-feed style selection from modal)
if (feedLayout?.feed_style) {
  const feedStyle = feedLayout.feed_style.toLowerCase().trim()
  if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
    mood = feedStyle as "luxury" | "minimal" | "beige"
  }
}

// Get category from user_personal_brand.visual_aesthetic
const personalBrand = await sql`SELECT visual_aesthetic FROM user_personal_brand...`
// Parse visual_aesthetic array, use first element as category

// Get template
const { getBlueprintPhotoshootPrompt, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
const moodMapped = MOOD_MAP[mood] || "light_minimalistic"
const fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
```

**Template Injection (Lines 544-566):**
```typescript
// Get fashion style
const personalBrandForStyle = await sql`SELECT fashion_style FROM user_personal_brand...`
const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
fashionStyle = mapFashionStyleToVibeLibrary(styles[0])

// Build vibe key
const vibeKey = `${category}_${moodMapped}` // e.g., "luxury_dark_moody"

// Inject
const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
injectedTemplate = await injectDynamicContentWithRotation(fullTemplate, vibeKey, fashionStyle, user.id.toString())

// Validate injection
const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
if (remainingPlaceholders.length > 0) {
  throw new Error(`Template injection incomplete`)
}
```

**Final Prompt (Line 569):**
```typescript
finalPrompt = injectedTemplate  // FULL TEMPLATE (all 9 scenes)
```

**Aspect Ratio (Line 1231):**
```typescript
const aspectRatio = isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')
// Preview feeds: 9:16
```

**Evidence:**
- ✅ Preview feeds correctly use full injected template
- ✅ Same logic for free and paid users (correct)
- ✅ Template injection works correctly

---

### 1.2 Full Feed Generation - Free Users

**Route:** `app/api/feed/[feedId]/generate-single/route.ts`

**Detection:**
- Line 578: `else if (access.isFree)`
- Line 766: Comment: "Free user full feeds extract individual scenes from the injected template"

**Template Selection (Lines 588-704):**
```typescript
// 🔴 CRITICAL: Consistent source priority for mood/feedStyle
// PRIORITY: feed_layouts.feed_style > user_personal_brand.settings_preference[0] > user_personal_brand defaults

// PRIMARY SOURCE: feed_layouts.feed_style (per-feed style selection from modal)
if (feedLayout?.feed_style) {
  const feedStyle = feedLayout.feed_style.toLowerCase().trim()
  if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
    mood = feedStyle as "luxury" | "minimal" | "beige"
    sourceUsed = "feed_style"
  }
}

// SECONDARY SOURCE: user_personal_brand.settings_preference[0] - only if feed_style not set
if (sourceUsed === "default") {
  const personalBrand = await sql`SELECT settings_preference, visual_aesthetic FROM user_personal_brand...`
  // Extract feedStyle from settings_preference[0]
  // Extract category from visual_aesthetic[0]
}

// FALLBACK: blueprint_subscribers (legacy)
if (sourceUsed === "default") {
  const blueprintSubscriber = await sql`SELECT form_data, feed_style FROM blueprint_subscribers...`
  category = formData.vibe || "professional"
  mood = feedStyle || "minimal"
}

// Get template
const { getBlueprintPhotoshootPrompt, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
const moodMapped = MOOD_MAP[mood] || "dark_moody"
const fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
```

**Template Injection (Lines 740-763):**
```typescript
// Map mood to vibe library format
const moodMapped = MOOD_MAP[mood] || "dark_moody"
const vibeKey = `${category}_${moodMapped}` // e.g., "luxury_dark_moody"

// Get fashion style (same as preview feed)
const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
fashionStyle = mapFashionStyleToVibeLibrary(styles[0])

// Inject
const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
injectedTemplate = await injectDynamicContentWithRotation(fullTemplate, vibeKey, fashionStyle, user.id.toString())

// Validate injection
const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
if (remainingPlaceholders.length > 0) {
  throw new Error(`Template injection incomplete`)
}
```

**Final Prompt (Line 768):**
```typescript
const { buildSingleImagePrompt } = await import("@/lib/feed-planner/build-single-image-prompt")
finalPrompt = buildSingleImagePrompt(injectedTemplate, post.position)  // SINGLE SCENE
```

**Aspect Ratio (Line 1231):**
```typescript
const aspectRatio = isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')
// Free full feeds: 9:16
```

**Evidence:**
- ✅ Free users correctly extract single scenes from injected template
- ✅ Template injection works correctly
- ⚠️ Source priority logic is duplicated (same as preview feed but with more fallbacks)

---

### 1.3 Full Feed Generation - Paid Users

**Route:** `app/api/feed/[feedId]/generate-single/route.ts`

**🔴 CRITICAL BUG: Paid users have TWO competing code paths**

#### Path A: Scene Extraction (Lines 324-444) - ✅ CORRECT BUT REDUNDANT

**Detection:**
- Line 324: `else if (access.isPaidBlueprint)`
- Line 326: Comment: "Position missing scene prompt - extracting from template..."

**Template Selection:**
```typescript
// Get template using current feed's feed_style
const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

// Get fashion style
const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
fashionStyle = mapFashionStyleToVibeLibrary(styles[0])

// Build vibe key
const vibe = `${category}_${moodMapped}`
```

**Template Injection (Lines 407-429):**
```typescript
// ✅ CORRECT: Uses template injection system
const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
injectedTemplate = await injectDynamicContentWithRotation(
  fullTemplate,
  vibe,
  fashionStyle,
  user.id.toString()
)

// Validate injection
const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
if (remainingPlaceholders.length > 0) {
  throw new Error(`Template injection incomplete`)
}
```

**Final Prompt (Line 432):**
```typescript
// ✅ CORRECT: Extracts single scene from injected template
finalPrompt = buildSingleImagePrompt(injectedTemplate, post.position)

// Saves to DB
await sql`UPDATE feed_posts SET prompt = ${finalPrompt} WHERE id = ${postId}`
```

**Evidence:**
- ✅ Path A correctly uses template injection
- ✅ Path A extracts single scene from injected template
- ⚠️ Path A saves to DB, but Path B may overwrite it

---

#### Path B: Maya Generation (Lines 778-1224) - ❌ BUGGY

**Detection:**
- Line 778: `else if (access.isPaidBlueprint)`
- Line 779: Comment: "Paid blueprint users - ALWAYS use Maya to generate unique prompts"

**Template Selection (Lines 990-1067):**
```typescript
// If no preview or preview doesn't match - use template from unified wizard as guide
if (!shouldUsePreview) {
  // Extract category and mood from user_personal_brand
  // ...
  
  // 🔴 BUG: Gets RAW template (with placeholders), not injected
  const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import("@/lib/maya/blueprint-photoshoot-templates")
  const templateKey = `${category}_${mood}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
  templateReferencePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey] || null  // ❌ RAW TEMPLATE
}
```

**Template Injection:**
- ❌ **NO TEMPLATE INJECTION** - Path B bypasses injection system
- ❌ **RAW TEMPLATE PASSED TO MAYA** - Line 1054 passes template with placeholders
- ❌ **NO ROTATION TRACKING** - Rotation indices never increment

**Final Prompt (Lines 1075-1105):**
```typescript
// Call Maya API with RAW template as reference
const mayaResponse = await fetch('/api/maya/generate-feed-prompt', {
  body: JSON.stringify({
    referencePrompt: previewTemplate || templateReferencePrompt || undefined,  // ❌ RAW TEMPLATE
    lockedAesthetic: lockedAesthetic || undefined,
    // ...
  })
})

const mayaData = await mayaResponse.json()
finalPrompt = mayaData.prompt || mayaData.enhancedPrompt  // Maya generates from scratch
```

**Aspect Ratio (Line 1231):**
```typescript
const aspectRatio = isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')
// Paid full feeds: 4:5
```

**Evidence:**
- ❌ Path B bypasses template injection (BUG)
- ❌ Path B passes RAW templates to Maya (with unreplaced placeholders)
- ❌ Path B overwrites Path A's injected scene
- ❌ No rotation tracking for paid users

---

#### The Problem: Both Paths Execute

**Execution Flow:**
1. Post doesn't have prompt → Path A runs (lines 324-444)
2. Path A injects template, extracts scene, saves to DB
3. Code continues to line 455: `if (!finalPrompt || finalPrompt.trim().length < 20)`
4. Path A saved prompt, but condition may still be true (race condition?)
5. Path B runs (lines 778-1224)
6. Path B passes RAW template to Maya
7. Path B overwrites Path A's injected scene with Maya-generated prompt

**Result:** Inconsistent - sometimes injected template (Path A), sometimes Maya-generated (Path B)

---

## 2) BUGS IDENTIFIED

### 2.1 🔴 CRITICAL: Paid Users Bypass Template Injection

**Issue:** Paid users have TWO competing code paths - one uses injection (correct), one bypasses it (buggy)

**Path A (Lines 324-444):** ✅ CORRECT
- Uses `injectDynamicContentWithRotation()` (line 410)
- Extracts single scene from injected template (line 432)
- Saves injected scene to DB (line 435)

**Path B (Lines 778-1224):** ❌ BUGGY
- Gets RAW template from `BLUEPRINT_PHOTOSHOOT_TEMPLATES` (line 1054)
- Passes RAW template to Maya as `templateReferencePrompt` (line 1094)
- Maya generates from scratch, doesn't use injected template
- Overwrites Path A's injected scene

**Impact:** High - Paid users get inconsistent results:
- Sometimes: Injected template with vibe library content (Path A wins)
- Sometimes: Maya-generated prompt without structure (Path B wins)
- No rotation tracking: All feeds use same outfits/locations

**Evidence:**
- Line 1054: `templateReferencePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]` (RAW template)
- Line 1094: `referencePrompt: previewTemplate || templateReferencePrompt || undefined` (RAW template passed to Maya)
- No `injectDynamicContentWithRotation()` call in Path B
- No `incrementRotationState()` call anywhere for paid users

**Fix Required:**
1. Remove Path A (redundant)
2. Fix Path B to use template injection BEFORE passing to Maya
3. Pass INJECTED single scene to Maya as reference
4. Add rotation tracking after Maya generation

---

### 2.2 🔴 CRITICAL: No Rotation Tracking for Paid Users

**Issue:** Rotation indices never increment for paid users

**Free Users:**
- `injectDynamicContentWithRotation()` automatically increments rotation (via `getRotationState()`)
- Each feed gets different outfits/locations

**Paid Users:**
- Path A: Uses injection but doesn't increment rotation
- Path B: Bypasses injection, no rotation at all
- Result: All feeds use same outfits/locations (no variety)

**Evidence:**
- No `incrementRotationState()` call in `generate-single/route.ts` for paid users
- `injectDynamicContentWithRotation()` reads rotation but doesn't increment it
- Rotation only increments when explicitly called

**Fix Required:**
- Add `incrementRotationState()` call after paid user generation completes

---

## 3) INCONSISTENCIES IDENTIFIED

### 3.1 Template Selection Logic Duplication

**Issue:** Template selection logic is duplicated 3+ times with slight variations

**Locations:**
1. Preview feed (lines 460-509)
2. Free user full feed (lines 588-704)
3. Paid user fallback (lines 990-1067)
4. Paid user scene extraction (lines 324-444)

**Variations:**
- **Preview feed:** Uses `feed_style` PRIMARY, `visual_aesthetic` for category
- **Free user full feed:** Uses `feed_style` PRIMARY, `settings_preference[0]` SECONDARY, `visual_aesthetic` for category, `blueprint_subscribers` FALLBACK
- **Paid user fallback:** Uses `settings_preference[0]` PRIMARY, `visual_aesthetic` for category (no `feed_style` check)
- **Paid user scene extraction:** Uses `feed.feed_style` PRIMARY, `visual_aesthetic` for category

**Impact:** Medium - Code duplication makes maintenance harder, but functionality works

**Recommendation:** Extract to shared function `getTemplateForFeed(feedLayout, userId)`

---

### 2.2 Inconsistent Source Priority

**Issue:** Different priority orders for mood/category selection across flows

**Preview Feed Priority (Lines 468-503):**
1. `feed_layouts.feed_style` (PRIMARY)
2. `user_personal_brand.visual_aesthetic[0]` (for category)

**Free User Full Feed Priority (Lines 588-698):**
1. `feed_layouts.feed_style` (PRIMARY)
2. `user_personal_brand.settings_preference[0]` (SECONDARY)
3. `user_personal_brand.visual_aesthetic[0]` (for category)
4. `blueprint_subscribers.feed_style` (FALLBACK)
5. `blueprint_subscribers.form_data.vibe` (FALLBACK)

**Paid User Fallback Priority (Lines 1004-1067):**
1. `user_personal_brand.settings_preference[0]` (PRIMARY - no `feed_style` check)
2. `user_personal_brand.visual_aesthetic[0]` (for category)

**Paid User Scene Extraction Priority (Lines 332-359):**
1. `feed_layouts.feed_style` (PRIMARY)
2. `user_personal_brand.visual_aesthetic[0]` (for category)

**Impact:** High - Users may get different templates depending on which code path executes

**Recommendation:** Standardize priority order across all flows:
1. `feed_layouts.feed_style` (PRIMARY - per-feed selection)
2. `user_personal_brand.settings_preference[0]` (SECONDARY - synced from modal)
3. `user_personal_brand.visual_aesthetic[0]` (for category)
4. `blueprint_subscribers` (FALLBACK - legacy)

---

### 3.3 Template Selection Logic Duplication (Continued)

---

### 2.4 Over-Engineering: Preview Feed Style Matching

**Issue:** Complex logic to match preview feed style with current feed style (lines 891-975)

**Logic:**
1. Check if preview feed exists
2. Get preview feed's `feed_style`
3. Compare with current feed's `feed_style`
4. If mismatch, don't use preview template
5. If match, extract aesthetic from preview template
6. Compare preview template with expected template (vibe/keyword matching)
7. If aesthetic matches, use preview; otherwise use brand profile template

**Questions:**
- Why not just use current feed's style directly?
- Why compare preview feed style if we're generating for current feed?
- Is the aesthetic extraction and comparison necessary?

**Impact:** Low - Logic works but may be unnecessary complexity

**Recommendation:** Simplify - if current feed has `feed_style`, use it directly. Preview feed is only needed if current feed has no style.

---

### 2.5 Fashion Style Mapping Variations

**Issue:** Fashion style mapping logic is duplicated with slight variations

**Locations:**
1. Preview feed (lines 515-539)
2. Free user full feed (lines 712-736)
3. Paid user scene extraction (lines 368-399)

**Variations:**
- All use `mapFashionStyleToVibeLibrary()`
- All query `user_personal_brand.fashion_style`
- All handle JSONB array or string format
- Slight differences in error handling and logging

**Impact:** Low - Functionality works, just code duplication

**Recommendation:** Extract to shared function `getFashionStyleForInjection(userId)`

---

### 2.6 Vibe Key Construction Inconsistency

**Issue:** Vibe key construction has slight variations

**Preview Feed (Line 512):**
```typescript
const vibeKey = `${category}_${moodMapped}`  // e.g., "luxury_dark_moody"
```

**Free User Full Feed (Line 709):**
```typescript
const moodMapped = MOOD_MAP[mood] || "dark_moody"  // Different default
const vibeKey = `${category}_${moodMapped}`  // Same pattern
```

**Paid User Scene Extraction (Line 404):**
```typescript
const vibe = `${category}_${moodMapped}`  // Same pattern, different variable name
```

**Impact:** Low - All produce same result, just naming inconsistency

**Recommendation:** Standardize variable name to `vibeKey`

---

## 4) CONFLICTS IDENTIFIED

### 4.1 Preview Feed Prompt Storage Conflict

**Issue:** Preview feeds store full template in `feed_posts[0].prompt`, but paid users look for it in preview feed

**Preview Feed Creation (`app/api/feed/create-free-example/route.ts:313`):**
```typescript
// Stores template prompt in feed_posts[0].prompt
prompt: ${templatePrompt},  // Full template (with placeholders)
```

**Paid User Lookup (`app/api/feed/[feedId]/generate-single/route.ts:799-808`):**
```typescript
// Looks for preview template in preview feed's first post
const [previewPost] = await sql`
  SELECT prompt
  FROM feed_posts
  WHERE feed_layout_id = ${previewFeed.id}
    AND position = 1
    AND prompt IS NOT NULL
  LIMIT 1
`
previewTemplate = previewPost?.prompt || null
```

**Conflict:** 
- Preview feed stores template **with placeholders** (not injected)
- Paid users expect **injected template** (placeholders replaced)
- If paid user uses preview template, it may have unreplaced placeholders

**Evidence:**
- `create-free-example/route.ts:313` stores `templatePrompt` (raw template with placeholders)
- `generate-single/route.ts:569` stores `injectedTemplate` (placeholders replaced) for preview feeds
- Paid users read from preview feed, may get raw template

**Impact:** Medium - Paid users may get templates with placeholders if preview feed was created before injection

**Recommendation:** Ensure preview feed stores injected template, or paid users should re-inject

---

### 4.2 Paid User Dual Path Conflict (Same as Bug 2.1)

**Issue:** Paid users have TWO code paths that conflict

**Path A (Lines 324-444):** Scene Extraction
- Uses template injection ✅
- Extracts single scene ✅
- Saves to DB ✅

**Path B (Lines 778-1224):** Maya Generation
- Bypasses template injection ❌
- Passes RAW template to Maya ❌
- Overwrites Path A's work ❌

**Conflict:**
- Both paths can execute for same post
- Path A saves injected scene (line 435)
- Path B overwrites with Maya prompt (line 1105)
- Result: Inconsistent - sometimes injected, sometimes Maya-generated

**Impact:** High - Paid users get inconsistent results

**Recommendation:** Remove Path A, fix Path B to use injection

---

## 5) OVER-ENGINEERING ANALYSIS

### 4.1 Preview Feed Style Matching Logic

**Complexity:** Lines 891-975 (85 lines)

**Purpose:** Determine if preview feed template should be used as reference for paid user generation

**Logic Flow:**
1. Find preview feed
2. Get preview feed's `feed_style`
3. Compare with current feed's `feed_style`
4. If mismatch, clear preview template
5. If match, extract aesthetic from preview template
6. Compare preview template with expected template (vibe/keyword matching)
7. If aesthetic matches, use preview; otherwise use brand profile template

**Questions:**
- Why not just use current feed's `feed_style` directly?
- Why compare preview feed style if we're generating for current feed?
- Is the aesthetic extraction and comparison necessary?

**Simplification Opportunity:**
```typescript
// SIMPLIFIED LOGIC:
// 1. If current feed has feed_style, use it directly (don't need preview)
// 2. If no feed_style, check if preview feed exists and use its style
// 3. If no preview, use user_personal_brand defaults
```

**Recommendation:** Simplify - current logic may be over-engineered

---

### 4.2 Multiple Template Selection Code Paths

**Complexity:** 4 separate implementations of similar logic

**Duplication:**
1. Preview feed (lines 460-509) - ~50 lines
2. Free user full feed (lines 588-704) - ~120 lines
3. Paid user fallback (lines 990-1067) - ~80 lines
4. Paid user scene extraction (lines 324-444) - ~120 lines

**Total:** ~370 lines of duplicated logic

**Simplification Opportunity:**
```typescript
// EXTRACT TO SHARED FUNCTION:
async function getTemplateForFeed(
  feedLayout: FeedLayout,
  userId: string,
  options?: { usePreviewFeed?: boolean }
): Promise<{ template: string; category: string; mood: string; source: string }>
```

**Recommendation:** Extract to shared function to reduce duplication

---

## 6) ARCHITECTURAL CONFLICTS

### 6.1 Paid Users: Template Injection vs Maya Generation (Same as Bug 2.1)

**Conflict:** Paid users have two different prompt generation approaches that conflict

**Approach 1: Template Injection + Scene Extraction (Path A)**
- Lines 324-444
- Gets template, injects content, extracts scene
- Saves extracted scene to DB
- ✅ Uses injection system correctly

**Approach 2: Maya Generation (Path B)**
- Lines 778-1224
- Gets RAW template, passes to Maya
- Maya generates from scratch
- Overwrites Path A's work
- ❌ Bypasses injection system

**Issue:** Both paths can execute, causing confusion and inconsistent results

**Recommendation:** Remove Path A, fix Path B to use injection BEFORE Maya

---

### 5.2 Preview Feed Template Storage

**Conflict:** Preview feeds store template at creation time (with placeholders) vs generation time (injected)

**Creation Time (`create-free-example/route.ts:313`):**
```typescript
prompt: ${templatePrompt},  // Raw template with placeholders
```

**Generation Time (`generate-single/route.ts:569-577`):**
```typescript
finalPrompt = injectedTemplate  // Injected template (placeholders replaced)
await sql`UPDATE feed_posts SET prompt = ${finalPrompt} WHERE id = ${postId}`
```

**Issue:** 
- Creation stores raw template
- Generation stores injected template
- Paid users read from preview feed, may get raw template

**Impact:** Medium - Paid users may get templates with unreplaced placeholders

**Recommendation:** Either:
1. Don't store template at creation (store NULL, generate on first generation)
2. Or inject template at creation time

---

## 7) SUMMARY OF BUGS AND INCONSISTENCIES

| Issue | Severity | Location | Impact |
|-------|----------|---------|--------|
| **🔴 Paid Users Bypass Injection** | 🔴 CRITICAL | Lines 1054, 1094 | Paid users get inconsistent results, no rotation |
| **🔴 No Rotation Tracking (Paid)** | 🔴 CRITICAL | Missing incrementRotationState() | All paid feeds use same outfits/locations |
| **🔴 Paid User Dual Paths** | 🔴 CRITICAL | Lines 324-444 vs 778-1224 | Paths conflict, inconsistent results |
| **🟡 Code Duplication** | 🟡 MEDIUM | 4 locations | Maintenance burden |
| **🟡 Inconsistent Source Priority** | 🟡 HIGH | All flows | Users may get different templates |
| **🟡 Preview Feed Storage Conflict** | 🟡 MEDIUM | create-free-example vs generate-single | Paid users may get raw templates |
| **🟢 Over-Engineering: Style Matching** | 🟢 LOW | Lines 891-975 | Unnecessary complexity |
| **🟢 Fashion Style Mapping Duplication** | 🟢 LOW | 3 locations | Minor code duplication |
| **🟢 Vibe Key Naming** | 🟢 LOW | 3 locations | Naming inconsistency only |

---

## 8) RECOMMENDATIONS

### 8.1 Must Fix Before Deploy

1. **🔴 Fix Paid User Template Injection (CRITICAL)**
   - **File:** `app/api/feed/[feedId]/generate-single/route.ts:990-1105`
   - **Location:** Path B (Maya generation path)
   - **Current Bug:** Line 1054 passes RAW template to Maya
   - **Fix:**
     ```typescript
     // BEFORE (BUGGY - Line 1054):
     templateReferencePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey] || null  // RAW
     
     // AFTER (CORRECT):
     // Get template
     const { getBlueprintPhotoshootPrompt, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
     const moodMapped = MOOD_MAP[mood] || "light_minimalistic"
     const fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
     
     // Get fashion style
     const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
     const fashionStyle = mapFashionStyleToVibeLibrary(styles[0])
     
     // Build vibe key
     const vibeKey = `${category}_${moodMapped}`
     
     // ✅ INJECT DYNAMIC CONTENT (same as free users)
     const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
     const injectedTemplate = await injectDynamicContentWithRotation(
       fullTemplate,
       vibeKey,
       fashionStyle,
       user.id.toString()
     )
     
     // ✅ EXTRACT SINGLE SCENE (same as free users)
     const { buildSingleImagePrompt } = await import("@/lib/feed-planner/build-single-image-prompt")
     templateReferencePrompt = buildSingleImagePrompt(injectedTemplate, post.position)  // INJECTED SCENE
     ```
   - **Reason:** Paid users must use template injection system, then pass injected scene to Maya

2. **🔴 Remove Duplicate Path A (CRITICAL)**
   - **File:** `app/api/feed/[feedId]/generate-single/route.ts:324-444`
   - **Reason:** Path A is redundant, Path B should handle all paid user generation
   - **Fix:** Delete lines 324-450 (entire Path A block)

3. **🔴 Add Rotation Tracking for Paid Users (CRITICAL)**
   - **File:** `app/api/feed/[feedId]/generate-single/route.ts:1105` (after Maya generation)
   - **Fix:**
     ```typescript
     // After Maya generation completes (line 1105)
     const { incrementRotationState } = await import("@/lib/feed-planner/rotation-manager")
     await incrementRotationState(user.id.toString(), vibeKey, fashionStyle)
     ```
   - **Reason:** Paid users need rotation tracking so each feed gets different outfits/locations

4. **Fix Preview Feed Template Storage**
   - **File:** `app/api/feed/create-free-example/route.ts:313`
   - **Reason:** Stores raw template, but generation expects injected template
   - **Fix:** Either store NULL at creation, or inject template at creation time

5. **Standardize Source Priority**
   - **Files:** All template selection locations
   - **Reason:** Inconsistent priority causes different templates
   - **Fix:** Extract to shared function with consistent priority order

### 8.2 Should Fix Soon (Post-Deploy)

1. **Extract Template Selection Logic**
   - Create `lib/feed-planner/template-selector.ts`
   - Consolidate all 4 implementations into one function

2. **Simplify Preview Feed Style Matching**
   - Remove complex aesthetic comparison logic
   - Use simple style comparison only

3. **Unify Fashion Style Mapping**
   - Extract to shared function
   - Use consistently across all flows

---

## 9) VERIFICATION CHECKLIST

### Preview Feed (Free & Paid)
- [ ] Template selected from `BLUEPRINT_PHOTOSHOOT_TEMPLATES`
- [ ] Dynamic content injected (`injectDynamicContentWithRotation`)
- [ ] Full template used (`finalPrompt = injectedTemplate`)
- [ ] Aspect ratio: 9:16
- [ ] Same logic for free and paid users

### Full Feed - Free Users
- [ ] Template selected with consistent source priority
- [ ] Dynamic content injected
- [ ] Single scene extracted (`buildSingleImagePrompt`)
- [ ] Aspect ratio: 9:16

### Full Feed - Paid Users
- [ ] Template injection system runs (same as free users)
- [ ] Injected template passed to Maya as reference
- [ ] Maya enhances injected scene (not generates from scratch)
- [ ] Rotation tracking increments after generation
- [ ] Aspect ratio: 4:5
- [ ] No duplicate paths execute

---

**Audit End**
