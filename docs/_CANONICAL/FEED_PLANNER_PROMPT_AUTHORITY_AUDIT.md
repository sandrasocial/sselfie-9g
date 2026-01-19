# FEED PLANNER PROMPT AUTHORITY AUDIT & FIX

**Date:** 2026-01-XX  
**Status:** ✅ COMPLETE

## PROMPT AUTHORITY (THE ONE PLACE)

**File:** `lib/feed-planner/prompt-shaper.ts`  
**Function:** `buildPromptFromScene()`

**This function produces the final prompt string sent to Replicate.**
**All Feed Planner prompts MUST pass through here.**

### Inputs:
- `scene: FeedPlannerScene` - Structured scene data (from scene-resolver.ts)
- `mode: PromptMode` - 'preview_multi' (9 scenes) or 'single_scene' (1 scene)
- `allScenes?: FeedPlannerScene[]` - Array of all 9 scenes (for preview mode)

### Who Calls It:
- `lib/feed-planner/scene-consistency.ts`:
  - `buildPreviewPromptFromScenes()` → calls `buildPromptFromScene(scenes[0], 'preview_multi', scenes)`
  - `buildSingleScenePromptFromScene()` → calls `buildPromptFromScene(scene, 'single_scene')`
- `app/api/feed/[feedId]/generate-single/route.ts`:
  - Preview feed: calls `buildPreviewPromptFromScenes(scenes)`
  - Single scene: calls `buildSingleScenePromptFromScene(sceneForPosition)`
- `app/api/blueprint/generate-grid/route.ts`:
  - Calls `buildPreviewPromptFromScenes(scenes)`

## PROMPT FLOW TRACE

### FEED PREVIEW PROMPT FLOW
```
route (generate-single) 
  → resolveConsistentScenes (scene-consistency.ts)
  → buildPreviewPromptFromScenes (scene-consistency.ts)
  → buildPromptFromScene (prompt-shaper.ts) [THE AUTHORITY]
  → buildPreviewMultiPrompt (prompt-shaper.ts)
  → buildPositionStrategy (prompt-shaper.ts)
  → FINAL PROMPT STRING
  → generateWithNanoBanana (nano-banana-client.ts)
  → Replicate API
```

### SINGLE SCENE PROMPT FLOW
```
route (generate-single)
  → resolveConsistentScenes (scene-consistency.ts)
  → buildSingleScenePromptFromScene (scene-consistency.ts)
  → buildPromptFromScene (prompt-shaper.ts) [THE AUTHORITY]
  → buildSingleScenePrompt (prompt-shaper.ts)
  → FINAL PROMPT STRING
  → generateWithNanoBanana (nano-banana-client.ts)
  → Replicate API
```

**✅ PROMPT FLOW CONVERGENCE:** Both preview and single scene converge at `buildPromptFromScene()` (THE AUTHORITY)

## FEED PLANNER DECISION MAP

| Decision | File:Function | Notes |
|----------|---------------|-------|
| Scene count (9 scenes) | `scene-resolver.ts:resolveAllFeedPlannerScenes` | Always resolves exactly 9 scenes |
| Scene order | `scene-resolver.ts:resolveAllFeedPlannerScenes` | Positions 1-9, sequential |
| Scene type (portrait/object/graphic) | `scene-resolver.ts:resolveFeedPlannerScene` | Derived from `camera.framing` |
| Scene framing | `scene-resolver.ts:resolveFeedPlannerScene` | Derived from activity + location |
| Scene prompt text | `prompt-shaper.ts:buildPromptFromScene` | **THE AUTHORITY** |
| Layout vs execution distinction | `prompt-shaper.ts:buildPromptFromScene` | Mode parameter: 'preview_multi' vs 'single_scene' |

## FROZEN FILES (DO NOT MODIFY PROMPTS HERE)

These files are frozen and must NOT decide prompt content:

1. **`lib/feed-planner/build-single-image-prompt.ts`**
   - ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
   - Legacy template parser
   - May pass data, call authority, format UI
   - May NOT build strings, modify prompts, inject scene descriptions

2. **`lib/feed-planner/nano-banana-adapter.ts`**
   - ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
   - ❌ DUPLICATE DECISION — MUST BE CENTRALIZED
   - Contains `buildSingleScenePrompt()` which duplicates prompt-shaper.ts
   - Feed Planner MUST use prompt-shaper.ts instead

3. **`lib/nano-banana-client.ts`**
   - ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
   - May pass data to Replicate
   - May NOT modify Feed Planner prompts
   - Identity anchor injection is fallback for legacy prompts only

4. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE (at prompt generation step)
   - May call authority functions
   - May NOT build prompt strings directly
   - Uses `cleanBlueprintPrompt()` only for placeholder removal (legacy support)

## FEED PLANNER MODES (HARD DOCUMENTED)

### Mode 1: PREVIEW = STRATEGY ONLY
**No people, no outfits, no locations**

Preview mode can only describe:
- Position index (1-9)
- Content type (portrait, object, graphic, overhead)
- Compositional role (anchor, breathing space, texture, statement)
- Framing intent (close, mid, full)
- Visual weight (bold, subtle)

**Validation Guards:**
- ❌ Cannot contain: "woman", "subject", "person", "wearing", "standing", "gym", "coffee", etc.
- ❌ Cannot exceed 120 words
- ❌ Cannot mention "Scene X:" with actions
- ✅ Throws error if violated (DO NOT generate images)

### Mode 2: SINGLE SCENE = EXECUTION
**One image following strategy**

Single scene mode generates:
- One image
- One execution
- Following the position's strategy
- Includes: outfits, locations, poses, activities

**Validation:**
- ✅ Must include identity anchor (unless flatlay)
- ✅ Must include outfit, location, lighting
- ✅ Target: 80-130 words

## DEBUG LOGGING

Added to `buildPromptFromScene()` (THE AUTHORITY):

```typescript
console.log('[FEED PROMPT]', {
  mode,
  position,
  promptLength: prompt.length,
  promptPreview: prompt.slice(0, 120)
})
```

This allows Sandra to see:
- Who created the prompt (THE AUTHORITY)
- For what mode (preview_multi or single_scene)
- For which position (1-9)
- Prompt length and preview

## FINAL CONFIRMATION

**Feed Planner prompts now come from one place. Preview is strategy. Single scenes are execution.**
