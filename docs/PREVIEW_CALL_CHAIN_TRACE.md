# Preview Feed Call Chain Trace

**Date:** 2026-01-18  
**Task:** Identify preview generation flow to restore 9-scene behavior

---

## Preview Feed Call Chain

### Entry Point
**File:** `app/api/feed/[feedId]/generate-single/route.ts`

### Flow

```
1. Line 381: isPreviewFeed detection
   if (isPreviewFeed) { ... }

2. Line 403: Log preview detection
   console.log("Preview feed detected - generating full template for all 9 scenes")

3. Line 417-422: Get category & mood
   const { category, mood } = await getCategoryAndMood(feedLayout, user, {
     checkSettingsPreference: false,
     checkBlueprintSubscribers: false,
     trackSource: false,
     defaultCategory: 'minimal'
   })

4. Line 426: Get fashion style
   const fashionStyle = await getFashionStyleForPosition(user, post.position, feedLayout)

5. Line 432: Get full 9-scene template
   const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
   fullTemplate = await getBlueprintPhotoshootPrompt(category, mood, fashionStyle)

6. Line 449-455: Inject dynamic content
   const injectedTemplate = await injectAndValidateTemplate(
     fullTemplate,
     category,
     mood,
     fashionStyle,
     user.id.toString()
   )

7. Line 458: Use full template as finalPrompt
   finalPrompt = injectedTemplate  // ← ALL 9 SCENES IN ONE PROMPT

8. Line 1291: Clean prompt (remove {{placeholders}} only)
   const { cleanBlueprintPrompt } = await import('@/lib/feed-planner/build-single-image-prompt')
   const cleanedPrompt = cleanBlueprintPrompt(finalPrompt)

9. Line 1296-1301: Send directly to Nano Banana
   generation = await generateWithNanoBanana({
     prompt: cleanedPrompt,  // ← Full 9-scene prompt
     image_input: baseImages.map(img => img.url),
     aspect_ratio: '9:16',  // ← Preview uses 9:16
     resolution: '2K',
     output_format: 'png',
   })
```

---

## Key Findings

### 1. Preview Does NOT Use Adapter
- **Observation:** Preview bypasses `generateFeedSinglePromptViaAuthority()` entirely
- **Impact:** My nano-banana-adapter rewrite did NOT break preview
- **Reason:** Preview uses raw template, not single-frame extraction

### 2. Preview Uses Full Template
- **Template Source:** `getBlueprintPhotoshootPrompt(category, mood, fashionStyle)`
- **Content:** Contains all 9 scene descriptions in one prompt
- **Format:** Likely has repeated identity anchors, system labels, multi-scene mixing

### 3. Cleaning is Minimal
- **Function:** `cleanBlueprintPrompt()`
- **Location:** `lib/feed-planner/build-single-image-prompt.ts:432-444`
- **Action:** Only removes unreplaced placeholders like `{{LOCATION_ARCHITECTURAL_1}}`
- **Does NOT Remove:** System labels, repeated anchors, multi-scene structure

### 4. Preview Goes Straight to Nano Banana
- **No Authority Layer:** Doesn't go through prompt-authority.ts
- **No Adapter Layer:** Doesn't go through nano-banana-adapter.ts
- **Direct Call:** Sends raw template to generateWithNanoBanana()

---

## Problem Analysis

### Current Preview Issues

1. **Multi-Scene Mixing (Violates Nano Banana Best Practices)**
   - 9 scenes in one prompt
   - Full-body + flatlay + close-up all mixed
   - Nano Banana treats this as competing anchors

2. **Repeated Identity Anchors**
   - Each scene likely has its own identity anchor
   - "The subject..." repeated 9 times
   - Wastes tokens, creates confusion

3. **System Labels (If Present)**
   - "Scene:", "Composition:", "Location:" labels
   - Nano Banana expects natural language, not labels
   - Labels confuse the model

4. **Excessive Length**
   - 9 full scene descriptions
   - Likely 400-600+ words
   - Exceeds optimal Nano Banana prompt length

5. **No Fashion Context Filtering**
   - Athletic selections still get laptop/coffee/desk
   - No object sanitization applied
   - No coherence enforcement

---

## Solution Requirements

### What Preview SHOULD Do

1. **Route Through Adapter with mode="preview_multi"**
   - Apply fashion context rules
   - Apply coherence resolver
   - Format 9 scenes properly

2. **Proper Multi-Scene Structure for Nano Banana**
   ```
   [Identity anchor ONCE at top]
   
   Scene 1: [brief scene description, 18-25 words]
   Scene 2: [brief scene description, 18-25 words]
   Scene 3: [brief scene description, 18-25 words]
   ...
   Scene 9: [brief scene description, 18-25 words]
   
   [Lighting description ONCE]
   [Camera specs ONCE at end]
   ```

3. **Target Length:** 180-240 words total

4. **Fashion Context Enforcement**
   - Athletic → no laptop/coffee/desk (even in flatlay scenes)
   - Apply coherence resolver for fashion style
   - Filter conflicting objects per scene

5. **Conditional Frame Filtering**
   - Don't block flatlays globally for preview
   - Only sanitize truly incompatible objects
   - Preview is DESIGNED to show variety (flatlay + portrait)

---

## Implementation Plan

### Step 1: Add mode parameter to adapter
- `type PromptMode = "single" | "preview_multi"`
- Update `adaptFeedPlannerToNanoBanana()` signature

### Step 2: Create preview multi-scene formatter
- Function: `buildPreviewMultiScenePrompt()`
- Format 9 scenes with proper Nano Banana structure
- One identity anchor, one camera line

### Step 3: Update preview path
- Call adapter with `mode: "preview_multi"`
- Pass through authority layer for consistency
- Apply coherence resolver

### Step 4: Make enforcement conditional
- Frame type blocking: only for `mode: "single"`
- Object sanitization: for both modes, context-aware

### Step 5: Add mode logging
- Log which mode is used
- Track preview vs single behavior

---

## Call Sites to Update

### Preview Generation
**File:** `app/api/feed/[feedId]/generate-single/route.ts`
**Lines:** 402-468
**Change:** Route through adapter with `mode: "preview_multi"`

### Single Image Generation  
**File:** `app/api/feed/[feedId]/generate-single/route.ts`
**Lines:** Multiple (544, 611, 676, 954)
**Change:** Already updated, confirm `mode: "single"` is passed

---

## Testing Checklist

- [ ] Preview generates 9-scene grid (not single image)
- [ ] Preview identity anchor appears exactly once
- [ ] Preview camera specs appear exactly once
- [ ] Single images remain strict (one frame only)
- [ ] Athletic preview: no laptop/coffee/desk in portrait scenes
- [ ] Athletic preview: flatlays can be included if contextually appropriate
- [ ] Coherence resolver applied to preview fashion style
- [ ] Logs show `mode=preview_multi` for preview
- [ ] Logs show `mode=single` for individual images

---

**Status:** Ready for implementation
