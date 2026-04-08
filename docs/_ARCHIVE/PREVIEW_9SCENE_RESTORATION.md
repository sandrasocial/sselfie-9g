# Preview 9-Scene Restoration + Mode System

**Date:** 2026-01-18  
**Status:** ✅ COMPLETE

---

## Objective

Restore Feed Preview 9-scene behavior WITHOUT breaking single-image quality fixes.

**Requirements:**
- ✅ Keep new Nano Banana prompt structure + coherence resolver for SINGLE images
- ✅ Restore PREVIEW generation to allow 9 scenes in ONE prompt (by design)
- ✅ No duplicate prompt builders (use one builder with explicit mode)
- ✅ Preview must route through coherence resolver
- ✅ Preview must use proper Nano Banana formatting

---

## Step 1: Preview Call Chain Traced

### Findings

**Preview Does NOT Use Adapter (Before Fix):**
- Preview bypassed `generateFeedSinglePromptViaAuthority()` entirely
- Used raw template from `getBlueprintPhotoshootPrompt()`
- Sent directly to `generateWithNanoBanana()` with minimal cleaning
- **Result:** My adapter rewrite did NOT break preview (it wasn't using it)

**Preview Flow (Before Fix):**
```
Line 403: isPreviewFeed detection
  ↓
Line 417-422: getCategoryAndMood() (NO coherence resolver)
  ↓
Line 426: getFashionStyleForPosition() (raw fashion style)
  ↓
Line 432: getBlueprintPhotoshootPrompt() (full 9-scene template)
  ↓
Line 449-455: injectAndValidateTemplate()
  ↓
Line 458: finalPrompt = injectedTemplate (ALL 9 SCENES)
  ↓
Line 1291: cleanBlueprintPrompt() (remove {{placeholders}} only)
  ↓
Line 1296: generateWithNanoBanana() (direct call)
```

**Issues Identified:**
1. No coherence enforcement
2. Multi-scene mixing (violates Nano Banana best practices)
3. Repeated identity anchors (9 times)
4. Excessive length (400-600+ words)
5. No fashion context filtering

**Documentation:** `docs/PREVIEW_CALL_CHAIN_TRACE.md`

---

## Step 2: Explicit Prompt Mode Added

### Implementation

**New Type:**
```typescript
export type PromptMode = "single" | "preview_multi"
```

**Updated Interface:**
```typescript
interface AdaptFeedPlannerParams {
  // ... existing fields ...
  mode?: PromptMode // Default: "single"
}
```

**Updated Function Signature:**
```typescript
export async function adaptFeedPlannerToNanoBanana(params: AdaptFeedPlannerParams) {
  const { mode = "single", ... } = params
  
  // Mode routing logic...
}
```

**File:** `lib/feed-planner/nano-banana-adapter.ts`  
**Lines:** 9-11, 18-31, 153

---

## Step 3: Preview Multi-Scene Formatter

### New Function: `buildPreviewMultiScenePrompt()`

**Purpose:** Build 9-scene grid prompt optimized for Nano Banana Pro

**Structure:**
```
[Identity anchor ONCE at top]
"A realistic photo grid showing the person from the reference images in 9 different scenes"

[9 brief scene descriptions]
"Scene 1: [18-25 words]"
"Scene 2: [18-25 words]"
...
"Scene 9: [18-25 words]"

[Lighting description ONCE]
"All scenes feature [mood-based lighting]"

[Category aesthetic ONCE]
"Overall [category aesthetic]"

[Camera specs ONCE at end]
"All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic"
```

**Features:**
- Identity anchor appears exactly ONCE
- Each scene truncated to ~18-25 words for brevity
- Object sanitization applied per scene (fashion context rules)
- Lighting and camera specs appear exactly ONCE
- Target length: 180-240 words (down from 400-600+)

**File:** `lib/feed-planner/nano-banana-adapter.ts`  
**Lines:** 335-456

---

## Step 4: Conditional Enforcement

### Frame Type Blocking

**Before (Broken):**
```typescript
// Blocked flatlays for athletic in ALL modes
if (!fashionRules.allowedFrameTypes.includes(frameType)) {
  // Block frame...
}
```

**After (Fixed):**
```typescript
// Block flatlays ONLY in single mode
if (mode === "single" && !fashionRules.allowedFrameTypes.includes(frameType)) {
  console.warn('[NANO-BANANA-ADAPTER] 🚫 Frame type blocked (single mode):', ...)
  // Block frame...
}
```

**Rationale:**
- Single mode: Strict enforcement (no flatlays for athletic)
- Preview mode: Allow all frame types for variety (preview is DESIGNED to show different angles)

### Object Sanitization

**Applied to BOTH modes:**
- Athletic contexts: Remove laptop, coffee, desk, workspace
- Business contexts: Remove gym equipment, yoga mat
- Context-aware per scene

**Rationale:**
- Object conflicts are bad in BOTH single and preview
- Athletic preview should NOT show laptop in portrait scenes
- But preview CAN include flatlay scenes if contextually appropriate

**File:** `lib/feed-planner/nano-banana-adapter.ts`  
**Lines:** 258-268 (conditional blocking), 391-407 (object sanitization in preview)

---

## Step 5: Call Sites Updated

### Single Image Generation (4 sites)

**File:** `lib/maya/prompt-authority.ts`  
**Line:** ~1196  
**Change:** Added `mode: "single"`

```typescript
const nanoBananaInput = await adaptFeedPlannerToNanoBanana({
  // ... existing params ...
  mode: "single", // Single-scene prompt (one frame only)
})
```

**Impact:** All single-image generation now explicitly uses single mode

---

### Preview Generation

**File:** `app/api/feed/[feedId]/generate-single/route.ts`  
**Lines:** 402-468  
**Changes:**

1. **Added coherence resolver:**
```typescript
const { getCoherentStyleParameters } = await import("@/lib/feed-planner/generation-helpers")
const {
  category,
  mood,
  fashionStyle: resolvedFashionStyle,
  adaptationApplied
} = await getCoherentStyleParameters(feedLayout, user, post.position, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  defaultCategory: 'minimal'
})
```

2. **Route through adapter with preview_multi mode:**
```typescript
const { adaptFeedPlannerToNanoBanana } = await import("@/lib/feed-planner/nano-banana-adapter")
const nanoBananaInput = await adaptFeedPlannerToNanoBanana({
  templatePrompt: injectedTemplate,
  position: post.position,
  brandKit: null,
  userId: user.id.toString(),
  category,
  mood,
  resolvedFashionStyle,
  mode: "preview_multi", // 9-scene grid mode
})

finalPrompt = nanoBananaInput.userRequest
```

**Impact:**
- Preview now uses coherence resolver (fashion style conflicts resolved)
- Preview routes through adapter (proper Nano Banana formatting)
- Preview applies fashion context rules (no laptop for athletic)
- Preview uses optimized multi-scene structure

---

## Step 6: Mode Logging Added

### Single Mode Logging

```
[NANO-BANANA-ADAPTER] mode=single ✅ Coherence resolver enforced: {
  position: 1,
  resolvedFashionStyle: 'elevated_athleisure',
  category: 'luxury',
  mood: 'luxury',
  userId: '...'
}

[NANO-BANANA-ADAPTER] 🔍 PROMPT TRACE: {
  position: 1,
  frameType: 'full_body',
  resolvedFashionStyle: 'elevated_athleisure',
  category: 'luxury',
  mood: 'luxury',
  promptLength: 125,
  promptPreview: 'A realistic photo of the person shown in the reference images...',
  blockedObjects: ['laptop', 'coffee', 'desk', ...]
}
```

### Preview Mode Logging

```
[NANO-BANANA-ADAPTER] mode=preview_multi ✅ Coherence resolver enforced: {
  position: 1,
  resolvedFashionStyle: 'elevated_athleisure',
  category: 'luxury',
  mood: 'luxury',
  userId: '...'
}

[NANO-BANANA-ADAPTER] 📸 Preview multi-scene mode: Building 9-scene grid prompt

[NANO-BANANA-ADAPTER] 🔍 PREVIEW PROMPT TRACE: {
  mode: 'preview_multi',
  frameCount: 9,
  resolvedFashionStyle: 'elevated_athleisure',
  category: 'luxury',
  mood: 'luxury',
  promptLength: 215,
  promptPreview: 'A realistic photo grid showing the person from the reference images in 9 different scenes...'
}
```

**Files:**
- `lib/feed-planner/nano-banana-adapter.ts` (lines 175-181, 204-211, 310-318)

---

## Behavior Comparison

### Single Mode (mode="single")

**Purpose:** Generate ONE image for ONE feed post

**Enforcement:**
- ✅ ONE frame extracted from template
- ✅ Frame type blocking (no flatlays for athletic)
- ✅ Object sanitization (fashion context rules)
- ✅ Coherence resolver applied
- ✅ Single-scene prompt structure
- ✅ Target: 80-130 words

**Example Output:**
```
A realistic photo of the person shown in the reference images. The subject is standing confidently wearing tailored black athleisure in a luxury studio. The photo is taken in a modern gym with floor-to-ceiling windows. Dramatic moody lighting with rich shadows. Luxurious high-end aesthetic. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

---

### Preview Mode (mode="preview_multi")

**Purpose:** Generate ONE 9-scene grid image for preview feed

**Enforcement:**
- ✅ ALL 9 frames included
- ✅ Frame type blocking DISABLED (preview shows variety)
- ✅ Object sanitization ENABLED (fashion context rules)
- ✅ Coherence resolver applied
- ✅ Multi-scene grid prompt structure
- ✅ Target: 180-240 words

**Example Output:**
```
A realistic photo grid showing the person from the reference images in 9 different scenes. Scene 1: the subject is standing confidently in tailored black athleisure. Scene 2: the subject is in a mid-shot portrait with arms crossed. Scene 3: the subject is walking through a modern architectural space. Scene 4: close-up of the subject's face with natural expression. Scene 5: the subject is leaning against a concrete wall. Scene 6: the subject is sitting on minimalist furniture. Scene 7: the subject is in motion, walking with purpose. Scene 8: the subject is in a relaxed pose with soft lighting. Scene 9: the subject is looking directly at camera with confident gaze. All scenes feature dramatic moody lighting with rich shadows. Overall luxurious high-end aesthetic. All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

---

## Key Differences

| Aspect | Single Mode | Preview Mode |
|--------|-------------|--------------|
| **Frames** | 1 frame | 9 frames |
| **Identity Anchor** | Once | Once (for all 9) |
| **Camera Specs** | Once | Once (for all 9) |
| **Frame Type Blocking** | ✅ Enabled | ❌ Disabled |
| **Object Sanitization** | ✅ Enabled | ✅ Enabled |
| **Coherence Resolver** | ✅ Enforced | ✅ Enforced |
| **Target Length** | 80-130 words | 180-240 words |
| **Flatlay for Athletic** | ❌ Blocked | ✅ Allowed (variety) |
| **Laptop for Athletic** | ❌ Removed | ❌ Removed |

---

## Testing Checklist

### Single Mode Tests

- [x] Single images generate one frame only
- [x] Athletic + luxury → elevated_athleisure (coherence)
- [x] Athletic → no flatlays (frame type blocking)
- [x] Athletic → no laptop/coffee/desk (object sanitization)
- [x] Identity anchor appears exactly once
- [x] Camera specs appear exactly once
- [x] Prompt length: 80-130 words
- [x] Logs show `mode=single`

### Preview Mode Tests

- [ ] Preview generates 9-scene grid (not single image)
- [ ] Athletic + luxury → elevated_athleisure (coherence)
- [ ] Athletic → flatlays ALLOWED (variety)
- [ ] Athletic → no laptop/coffee/desk in PORTRAIT scenes (object sanitization)
- [ ] Identity anchor appears exactly once
- [ ] Camera specs appear exactly once
- [ ] Prompt length: 180-240 words
- [ ] Logs show `mode=preview_multi`
- [ ] 9 scene descriptions present
- [ ] Each scene ~18-25 words

---

## Files Modified

1. **`lib/feed-planner/nano-banana-adapter.ts`**
   - Added `PromptMode` type
   - Added `mode` parameter to `AdaptFeedPlannerParams`
   - Added mode routing logic (line 183-219)
   - Added `buildPreviewMultiScenePrompt()` function (line 335-456)
   - Updated frame type blocking to be conditional (line 258-268)
   - Updated logging to include mode (line 175-181, 204-211, 310-318)

2. **`lib/maya/prompt-authority.ts`**
   - Added `mode: "single"` to adapter call (line ~1196)

3. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Updated preview path to use coherence resolver (line 405-423)
   - Updated preview path to route through adapter with `mode: "preview_multi"` (line 443-458)

---

## Expected Results

### ❌ What Should STOP (Preview)

1. NO MORE 400-600 word prompts
2. NO MORE repeated identity anchors (9 times)
3. NO MORE system labels in preview
4. NO MORE raw template sent to Nano Banana
5. NO MORE bypassing coherence resolver

### ✅ What Should START (Preview)

1. 180-240 word optimized prompts
2. Identity anchor ONCE at top
3. Camera specs ONCE at end
4. 9 brief scene descriptions (18-25 words each)
5. Coherence resolver applied (fashion style conflicts resolved)
6. Fashion context rules applied (no laptop for athletic portraits)
7. Proper Nano Banana multi-scene structure

### ✅ What Should REMAIN (Single)

1. ONE frame per prompt (strict)
2. Frame type blocking (no flatlays for athletic)
3. Object sanitization (no laptop for athletic)
4. Coherence resolver enforced
5. 80-130 word prompts
6. Single-scene structure

---

## Troubleshooting

### Issue: Preview still generates single image

**Check:**
1. Is `mode: "preview_multi"` passed to adapter? (Check logs)
2. Is preview path routing through adapter? (Check call site)
3. Is `buildPreviewMultiScenePrompt()` being called? (Check logs)

**Fix:**
- Verify preview path in generate-single/route.ts calls adapter with `mode: "preview_multi"`
- Check logs for `[NANO-BANANA-ADAPTER] mode=preview_multi`

### Issue: Preview shows laptop for athletic

**Check:**
1. Is coherence resolver being called? (Check logs for "Coherence resolver enforced")
2. Is object sanitization running? (Check logs for "Sanitizing: Removed")
3. Is `resolvedFashionStyle` correct? (Should be "elevated_athleisure" for athletic + luxury)

**Fix:**
- Verify `getCoherentStyleParameters()` is called before adapter
- Verify `resolvedFashionStyle` is passed to adapter
- Check that `sanitizeFrameDescription()` is called in `buildPreviewMultiScenePrompt()`

### Issue: Single images broken

**Check:**
1. Is `mode: "single"` passed to adapter? (Check logs)
2. Is frame type blocking working? (Check logs for "Frame type blocked")
3. Is single-scene prompt structure correct? (Check prompt output)

**Fix:**
- Verify prompt-authority.ts passes `mode: "single"` to adapter
- Check logs for `[NANO-BANANA-ADAPTER] mode=single`
- Verify `buildSingleScenePrompt()` is being called

---

## Related Documentation

- **Preview Call Chain Trace:** `docs/PREVIEW_CALL_CHAIN_TRACE.md`
- **Coherence Enforcement Fix:** `docs/COHERENCE_ENFORCEMENT_FIX.md`
- **Style Coherence Resolver:** `docs/STYLE_COHERENCE_RESOLVER.md`

---

**Status:** ✅ **COMPLETE AND READY FOR TESTING**

Preview 9-scene behavior is restored with proper Nano Banana formatting, coherence enforcement, and fashion context rules. Single-image quality fixes remain intact. No duplicate prompt builders. One adapter with explicit mode parameter.
