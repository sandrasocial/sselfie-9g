# FEED PLANNER PROMPT GENERATION AUDIT
**Date:** 2025-01-XX  
**Objective:** Complete audit of prompt generation pipeline, word counts, and user aesthetic integration

---

## 1. COMPLETE PROMPT GENERATION FLOW

### Entry Point → Final Prompt

```
User Action: Generate Feed Preview / Single Scene
  ↓
[FILE: app/api/feed/[feedId]/generate-single/route.ts]
  → Function: POST handler (line 440 for preview, line 567 for single)
  → Gets: feedLayout, user, post data
  → Calls: resolveConsistentScenes()
  ↓
[FILE: lib/feed-planner/scene-consistency.ts]
  → Function: resolveConsistentScenes() (line 51)
  → Gets: feedLayout, user, options
  → Calls: resolveAllFeedPlannerScenes()
  → Outputs: FeedPlannerScene[] (9 scenes)
  ↓
[FILE: lib/feed-planner/scene-resolver.ts]
  → Function: resolveAllFeedPlannerScenes() (line 265)
  → Loops positions 1-9, calls resolveFeedPlannerScene() for each
  → Function: resolveFeedPlannerScene() (line 141)
  → Step 1: getCoherentStyleParameters() → category, mood, fashionStyle
  → Step 2-9: Derives activity, location, outfit, objects, lighting, camera, pose, narrative
  → Outputs: FeedPlannerScene (single scene with category/mood from user data)
  ↓
[FILE: lib/feed-planner/scene-consistency.ts]
  → Function: buildPreviewPromptFromScenes() (line 99) OR buildSingleScenePromptFromScene() (line 119)
  → Calls: buildPromptFromScene(scene, mode, allScenes)
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildPromptFromScene() (line 74) ⚠️ **PROMPT AUTHORITY**
  → Routes to: buildPreviewMultiPrompt() OR buildSingleScenePrompt()
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildPreviewMultiPrompt() (line 126)
  → Loops allScenes, calls buildSceneExecutionBlock() for each position
  → Function: buildSingleScenePrompt() (line 211)
  → Calls: buildSceneExecutionBlock() for single scene
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildSceneExecutionBlock() (line 455)
  → Routes to: buildObjectFlatlayBlock(), buildTextureShotBlock(), buildDetailCloseUpBlock(), buildOverheadFlatlayBlock(), or buildPortraitBlock()
  → Outputs: string (scene description block)
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: validatePromptStructure() (line 330)
  → Validates word count, identity anchor, scene count
  ↓
[FILE: lib/nano-banana-client.ts]
  → Function: generateNanoBananaProImage() (line 80)
  → Receives: final prompt string
  → Sends to: Replicate API
```

---

## 2. FILES INVOLVED IN PROMPT GENERATION

### ✅ ACTIVE FILES (Currently Used)

| File | Purpose | Status |
|------|---------|--------|
| `lib/feed-planner/prompt-shaper.ts` | **PROMPT AUTHORITY** - Generates all prompt text | ✅ Active |
| `lib/feed-planner/scene-resolver.ts` | Creates scene data (category, mood, activity, etc.) | ✅ Active |
| `lib/feed-planner/scene-consistency.ts` | Ensures preview and single scenes use same data | ✅ Active |
| `lib/feed-planner/generation-helpers.ts` | Gets category/mood from user data (getCategoryAndMood) | ✅ Active |
| `app/api/feed/[feedId]/generate-single/route.ts` | API endpoint - calls scene resolution and prompt building | ✅ Active |
| `lib/nano-banana-client.ts` | Sends final prompt to Replicate | ✅ Active |

### ⚠️ EXISTING BUT UNUSED FILES (Potentially Lost Logic)

| File | Purpose | Status | Risk |
|------|---------|--------|------|
| `lib/feed-planner/nano-banana-adapter.ts` | Legacy prompt builders (guarded, throw errors) | ❌ Frozen | Low - Already guarded |
| `lib/feed-planner/build-single-image-prompt.ts` | Unknown purpose | ❓ Unknown | Medium - Need to check |
| `lib/feed-planner/visual-composition-expert.ts` | Maya/FLUX prompt generation (not Feed Planner) | ❌ Different system | Low - Different system |
| `lib/feed-planner/dynamic-template-injector.ts` | Template injection logic | ❓ Unknown | Medium - May have aesthetic logic |
| `lib/feed-planner/extract-aesthetic-from-template.ts` | Extract aesthetic from templates | ❓ Unknown | Medium - May be needed |
| `lib/feed-planner/feed-prompt-expert.ts` | Unknown purpose | ❓ Unknown | Medium - Need to check |

### 🔴 MISSING FILES (Potentially Deleted)

Based on git history showing "Delete composition system implementation files" (commit c9c12a4):
- **Composition system files** - May have contained aesthetic mapping logic
- **Strategic positioning files** - May have contained position-based aesthetic assignment

---

## 3. WORD COUNT ANALYSIS

### Target vs Current

**Nano Banana Pro Best Practice:** 40-60 words per scene block

### Current Scene Block Word Counts

| Position | Block Type | Function | Word Count | Status |
|----------|------------|----------|------------|--------|
| 2 | Object Flatlay | `buildObjectFlatlayBlock()` | ~35 words | ✅ OK |
| 4 | Detail Close-Up | `buildDetailCloseUpBlock()` | **~70 words** | ❌ TOO LONG |
| 6 | Texture Shot | `buildTextureShotBlock()` | **~66 words** | ❌ TOO LONG |
| 8 | Overhead Flatlay | `buildOverheadFlatlayBlock()` | ~45 words | ✅ OK |
| 1,3,5,7,9 | Portrait | `buildPortraitBlock()` | ~40-50 words | ✅ OK |

### Detailed Word Count Breakdown

**Position 4 (Detail Close-Up) - 70 words:**
```
Position 4 (Middle-Left): An intimate close-up detail shot focused on the person's hands holding [objects], with [outfitDesc] visible in the cropped frame. Only hands, [object], and torso are visible, emphasizing the mindful moment and tactile comfort. Soft natural window light from the side creates gentle shadows on skin texture and highlights the matte glaze of the handmade ceramic, conveying cozy home wellness aesthetic.
```
**Problem:** Too much detail - Nano Banana Pro gets confused with excessive description.

**Position 6 (Texture Shot) - 66 words:**
```
Position 6 (Middle-Right): An extreme close-up detail photograph of [textureDesc] and subtle sheen. The frame fills with the technical fabric's diagonal mesh weave, emphasizing quality craftsmanship and performance textile innovation. Shot macro with shallow depth of field creating soft background blur while maintaining razor focus on mesh pattern and fabric construction. Natural light grazes the surface highlighting dimensional texture.
```
**Problem:** Too much technical detail - should be more concise.

---

## 4. USER AESTHETIC CHOICES - WHERE THEY COME FROM

### Data Sources (Priority Order)

1. **feed_layouts.visual_aesthetic** (PRIMARY - Feed-specific override)
   - Location: `feed_layouts` table, `visual_aesthetic` column (JSONB array)
   - Example: `["warm", "beige"]`
   - Used by: `getCategoryAndMood()` in `generation-helpers.ts` (line 178)

2. **feed_layouts.feed_style** (PRIMARY - Per-feed style selection)
   - Location: `feed_layouts` table, `feed_style` column (string)
   - Example: `"luxury"`, `"minimal"`, `"beige"`
   - Used by: `getCategoryAndMood()` in `generation-helpers.ts` (line 201)

3. **user_personal_brand.settings_preference[0]** (SECONDARY - Synced from feed style modal)
   - Location: `user_personal_brand` table, `settings_preference` column (JSONB array)
   - Example: `["luxury"]` (first element is feedStyle synced from modal)
   - Used by: `getCategoryAndMood()` in `generation-helpers.ts` (line 218)

4. **user_personal_brand.visual_aesthetic[0]** (SECONDARY - Unified onboarding wizard)
   - Location: `user_personal_brand` table, `visual_aesthetic` column (JSONB array)
   - Example: `["warm & terracotta"]`
   - Used by: `getCategoryAndMood()` in `generation-helpers.ts` (line 273)
   - Mapped via: `mapVisualAestheticToCategory()` (handles "warm & terracotta" → "warm")

5. **blueprint_subscribers** (FALLBACK - Legacy blueprint wizard)
   - Location: `blueprint_subscribers` table
   - Used by: `getCategoryAndMood()` in `generation-helpers.ts` (line 316)

### How Category/Mood Flows to Prompts

```
getCategoryAndMood() (generation-helpers.ts)
  ↓
Returns: { category: "warm", mood: "beige" }
  ↓
getCoherentStyleParameters() (generation-helpers.ts)
  ↓
Returns: { category, mood, fashionStyle }
  ↓
resolveFeedPlannerScene() (scene-resolver.ts)
  ↓
Stores in scene: { category: "warm", mood: "beige" }
  ↓
buildPromptFromScene() (prompt-shaper.ts)
  ↓
buildPreviewMultiPrompt() OR buildSingleScenePrompt()
  ↓
getAestheticDescription(scene.category) (prompt-shaper.ts:783)
  ↓
Returns: "warm inviting" (from category "warm")
  ↓
Used in: Cohesion statement (line 195) and Portrait blocks (line 606)
```

---

## 5. 🔴 CRITICAL ISSUE: MISSING USER AESTHETIC IN PROMPTS

### Problem: Hardcoded "minimal wellness aesthetic"

**Current Code (prompt-shaper.ts:536, 559, 606):**

```typescript
// Position 2 (Object Flatlay) - Line 536
return `...emphasizing healthy lifestyle aesthetic and wellness ritual.`

// Position 4 (Detail Close-Up) - Line 559
return `...conveying cozy home wellness aesthetic.`

// Portrait blocks - Line 606
return `...emphasizing the ${aestheticDesc} aesthetic.`
```

**Where `aestheticDesc` comes from (line 600, 783):**
```typescript
const aestheticDesc = getAestheticDescription(scene.category)

function getAestheticDescription(category: string): string {
  const aestheticMap: Record<string, string> = {
    'luxury': 'luxury editorial',
    'minimal': 'minimal wellness',  // ⚠️ HARDCODED
    'beige': 'warm neutral',
    'warm': 'warm inviting',
    'edgy': 'edgy urban',
    'professional': 'professional polished'
  }
  return aestheticMap[category] || 'editorial'
}
```

### What's Missing

1. **Position 2 (Object Flatlay):** Hardcoded "healthy lifestyle aesthetic and wellness ritual"
   - Should use: User's selected aesthetic (e.g., "warm beige tones" for beige, "cool whites" for minimal)

2. **Position 4 (Detail Close-Up):** Hardcoded "cozy home wellness aesthetic"
   - Should use: User's selected aesthetic

3. **Cohesion Statement (line 195):** Uses `getAestheticDescription()` correctly BUT:
   - Only uses `scene.category` (e.g., "warm")
   - Doesn't use user's actual aesthetic choice (e.g., "Warm & Cozy" → should be "warm beige tones, golden lighting")

### Expected Behavior

**If user chose "Warm & Cozy":**
- Should say: "warm beige tones, golden lighting, cozy atmosphere"
- Currently says: "warm inviting aesthetic" (too generic)

**If user chose "Clean & Minimalistic":**
- Should say: "cool whites, crisp lighting, minimalist aesthetic"
- Currently says: "minimal wellness aesthetic" (wrong - wellness is not minimal)

**If user chose "Luxury Editorial":**
- Should say: "cool desaturated tones, editorial lighting, luxury aesthetic"
- Currently says: "luxury editorial aesthetic" (close but missing color/lighting specifics)

---

## 6. WHERE USER AESTHETIC SHOULD BE INJECTED

### Current Flow (What Happens)

1. ✅ `getCategoryAndMood()` correctly retrieves user's aesthetic choice
2. ✅ `scene.category` is set correctly (e.g., "warm", "minimal", "beige")
3. ❌ `getAestheticDescription()` only maps category to generic description
4. ❌ Hardcoded aesthetic strings in scene blocks (positions 2, 4)

### Required Changes

**File: `lib/feed-planner/prompt-shaper.ts`**

1. **Add function to get detailed aesthetic description:**
```typescript
function getDetailedAestheticDescription(
  category: string,
  mood: string,
  visualAesthetic?: string  // Raw user choice (e.g., "Warm & Cozy")
): string {
  // Map user's actual choice to detailed description
  if (visualAesthetic?.toLowerCase().includes('warm') && visualAesthetic?.toLowerCase().includes('cozy')) {
    return 'warm beige tones, golden lighting, cozy atmosphere'
  }
  if (visualAesthetic?.toLowerCase().includes('clean') && visualAesthetic?.toLowerCase().includes('minimal')) {
    return 'cool whites, crisp lighting, minimalist aesthetic'
  }
  if (visualAesthetic?.toLowerCase().includes('luxury') && visualAesthetic?.toLowerCase().includes('editorial')) {
    return 'cool desaturated tones, editorial lighting, luxury aesthetic'
  }
  // Fallback to category-based mapping
  return getAestheticDescription(category)
}
```

2. **Pass `mood` and `visualAesthetic` to scene blocks:**
   - Currently: `buildSceneExecutionBlock(scene, position)` only receives scene
   - Required: Need access to `scene.mood` and raw `visualAesthetic` string

3. **Update scene blocks to use detailed aesthetic:**
   - Position 2: Replace "healthy lifestyle aesthetic" with user's aesthetic
   - Position 4: Replace "cozy home wellness aesthetic" with user's aesthetic
   - Portrait blocks: Already use `aestheticDesc` but should be more detailed

---

## 7. MISSING DATA FLOW

### What's Missing

**Scene object doesn't include raw `visualAesthetic` string:**
- `FeedPlannerScene` interface (scene-resolver.ts:43) has:
  - `category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"`
  - `mood: "luxury" | "minimal" | "beige"`
- ❌ Missing: `visualAesthetic?: string` (raw user choice like "Warm & Cozy")

**Solution:**
1. Add `visualAesthetic?: string` to `FeedPlannerScene` interface
2. Pass raw `visualAesthetic` from `getCategoryAndMood()` → `resolveFeedPlannerScene()` → scene object
3. Use `visualAesthetic` in `getDetailedAestheticDescription()`

---

## 8. FILES THAT EXIST BUT AREN'T USED

### Need to Check These Files

1. **`lib/feed-planner/extract-aesthetic-from-template.ts`**
   - Purpose: Extract aesthetic from templates
   - May contain: Aesthetic mapping logic that should be used

2. **`lib/feed-planner/dynamic-template-injector.ts`**
   - Purpose: Template injection logic
   - May contain: Aesthetic injection logic

3. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Purpose: Unknown
   - May contain: Alternative prompt building logic

4. **`lib/feed-planner/feed-prompt-expert.ts`**
   - Purpose: Unknown
   - May contain: Expert prompt generation logic

---

## 9. SUMMARY OF ISSUES

### 🔴 CRITICAL ISSUES

1. **Scene Blocks Too Long**
   - Position 4: 70 words (target: 40-60)
   - Position 6: 66 words (target: 40-60)
   - **Fix:** Trim excessive detail, focus on essential elements

2. **Missing User's Aesthetic Choices**
   - Hardcoded "minimal wellness aesthetic" in positions 2, 4
   - Generic `getAestheticDescription()` doesn't use user's actual choice
   - **Fix:** Add `visualAesthetic` to scene object, create `getDetailedAestheticDescription()`

3. **Lost Aesthetic Mapping Logic**
   - Composition system files deleted (commit c9c12a4)
   - May have contained detailed aesthetic → prompt mapping
   - **Fix:** Recreate detailed aesthetic descriptions based on user choices

### ⚠️ MEDIUM PRIORITY ISSUES

4. **Unused Files**
   - Several files exist but aren't used
   - May contain lost logic
   - **Fix:** Audit unused files, extract useful logic

5. **Missing Raw Aesthetic String**
   - Scene object only has `category` and `mood`
   - Doesn't have raw `visualAesthetic` string (e.g., "Warm & Cozy")
   - **Fix:** Add `visualAesthetic` field to `FeedPlannerScene`

---

## 10. RECOMMENDED FIXES

### Fix 1: Trim Scene Block Word Counts

**File:** `lib/feed-planner/prompt-shaper.ts`

**Position 4 (Detail Close-Up) - Reduce from 70 to ~50 words:**
```typescript
// BEFORE (70 words)
return `Position ${position} (${positionLabel}): An intimate close-up detail shot focused on the person's hands holding ${objects}, with ${outfitDesc} visible in the cropped frame. Only hands, ${objects.split(' and ')[0]}, and torso are visible, emphasizing the mindful moment and tactile comfort. Soft natural window light from the side creates gentle shadows on skin texture and highlights the matte glaze of the handmade ceramic, conveying cozy home wellness aesthetic.`

// AFTER (~50 words)
return `Position ${position} (${positionLabel}): An intimate close-up detail shot focused on the person's hands holding ${objects}, with ${outfitDesc} visible in the cropped frame. Only hands and ${objects.split(' and ')[0]} are visible, emphasizing the mindful moment. Soft natural window light creates gentle shadows on skin texture, conveying ${aestheticDesc} aesthetic.`
```

**Position 6 (Texture Shot) - Reduce from 66 to ~50 words:**
```typescript
// BEFORE (66 words)
return `Position ${position} (${positionLabel}): An extreme close-up detail photograph of ${textureDesc} and subtle sheen. The frame fills with the technical fabric's diagonal mesh weave, emphasizing quality craftsmanship and performance textile innovation. Shot macro with shallow depth of field creating soft background blur while maintaining razor focus on mesh pattern and fabric construction. Natural light grazes the surface highlighting dimensional texture.`

// AFTER (~50 words)
return `Position ${position} (${positionLabel}): An extreme close-up detail photograph of ${textureDesc} with subtle sheen. The frame fills with the technical fabric's diagonal mesh weave, emphasizing quality craftsmanship. Shot macro with shallow depth of field creating soft background blur while maintaining razor focus on mesh pattern. Natural light grazes the surface highlighting dimensional texture.`
```

### Fix 2: Add User Aesthetic to Scene Object

**File:** `lib/feed-planner/scene-resolver.ts`

**Add to `FeedPlannerScene` interface (line 43):**
```typescript
export interface FeedPlannerScene {
  // ... existing fields ...
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  visualAesthetic?: string  // ⚠️ ADD THIS - Raw user choice (e.g., "Warm & Cozy")
  fashionStyle: string
  // ... rest of fields ...
}
```

**Update `resolveFeedPlannerScene()` to include `visualAesthetic`:**
```typescript
// In resolveFeedPlannerScene(), after getCoherentStyleParameters()
const {
  category,
  mood,
  fashionStyle: resolvedFashionStyle,
  visualAesthetic,  // ⚠️ ADD THIS - Get from getCoherentStyleParameters()
  adaptationApplied
} = await getCoherentStyleParameters(...)

// In scene object assembly (line 229)
return {
  // ... existing fields ...
  category,
  mood,
  visualAesthetic,  // ⚠️ ADD THIS
  fashionStyle: resolvedFashionStyle,
  // ... rest of fields ...
}
```

**Update `getCoherentStyleParameters()` to return `visualAesthetic`:**
```typescript
// In generation-helpers.ts
export async function getCoherentStyleParameters(...): Promise<{
  category: string
  mood: string
  fashionStyle: string
  visualAesthetic?: string  // ⚠️ ADD THIS
  adaptationApplied: boolean
}> {
  // ... existing logic ...
  // Get raw visualAesthetic from feedLayout or user_personal_brand
  let visualAesthetic: string | undefined
  if (feedLayout?.visual_aesthetic) {
    // Extract raw string
  } else if (personalBrand?.visual_aesthetic) {
    // Extract raw string
  }
  
  return {
    category,
    mood,
    fashionStyle: resolvedFashionStyle,
    visualAesthetic,  // ⚠️ ADD THIS
    adaptationApplied
  }
}
```

### Fix 3: Create Detailed Aesthetic Description Function

**File:** `lib/feed-planner/prompt-shaper.ts`

**Add new function:**
```typescript
/**
 * Get detailed aesthetic description from user's actual choice
 * Maps user selections like "Warm & Cozy" to specific prompt language
 */
function getDetailedAestheticDescription(
  category: string,
  mood: string,
  visualAesthetic?: string
): string {
  if (!visualAesthetic) {
    // Fallback to category-based mapping
    return getAestheticDescription(category)
  }
  
  const aestheticLower = visualAesthetic.toLowerCase()
  
  // Map user's actual choice to detailed description
  if (aestheticLower.includes('warm') && aestheticLower.includes('cozy')) {
    return 'warm beige tones, golden lighting, cozy atmosphere'
  }
  if (aestheticLower.includes('clean') && aestheticLower.includes('minimal')) {
    return 'cool whites, crisp lighting, minimalist aesthetic'
  }
  if (aestheticLower.includes('luxury') && aestheticLower.includes('editorial')) {
    return 'cool desaturated tones, editorial lighting, luxury aesthetic'
  }
  if (aestheticLower.includes('beige')) {
    return 'warm beige tones, soft natural lighting'
  }
  if (aestheticLower.includes('minimal')) {
    return 'clean minimalist aesthetic, soft natural lighting'
  }
  if (aestheticLower.includes('luxury')) {
    return 'luxury editorial aesthetic, polished lighting'
  }
  
  // Fallback to category-based mapping
  return getAestheticDescription(category)
}
```

**Update scene blocks to use detailed aesthetic:**
```typescript
// Position 2 (Object Flatlay)
const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
return `...emphasizing ${aestheticDesc} aesthetic and wellness ritual.`

// Position 4 (Detail Close-Up)
const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
return `...conveying ${aestheticDesc} aesthetic.`

// Portrait blocks
const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
return `...emphasizing the ${aestheticDesc} aesthetic.`
```

---

## 11. TESTING CHECKLIST

After fixes, verify:

1. ✅ Scene blocks are 40-60 words each
2. ✅ Position 4: ~50 words (reduced from 70)
3. ✅ Position 6: ~50 words (reduced from 66)
4. ✅ User's aesthetic choice appears in prompts (not hardcoded "minimal wellness")
5. ✅ "Warm & Cozy" → "warm beige tones, golden lighting"
6. ✅ "Clean & Minimalistic" → "cool whites, crisp lighting"
7. ✅ "Luxury Editorial" → "cool desaturated tones, editorial lighting"
8. ✅ Console logs show `visualAesthetic` in scene data
9. ✅ Generated prompts reflect user's actual aesthetic choice

---

## 12. NEXT STEPS

1. **Immediate:** Implement Fix 1 (trim word counts)
2. **Immediate:** Implement Fix 2 (add visualAesthetic to scene object)
3. **Immediate:** Implement Fix 3 (create detailed aesthetic descriptions)
4. **Follow-up:** Audit unused files (`extract-aesthetic-from-template.ts`, `dynamic-template-injector.ts`, etc.)
5. **Follow-up:** Check git history for deleted composition system files
6. **Follow-up:** Test with various user aesthetic choices

---

**END OF AUDIT REPORT**
