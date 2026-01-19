# Feed Planner Stabilization - Phase 4: Preview & Full Planner Consistency
## Zero Divergence Between Preview and Full Planner

**Date:** January 2026  
**Phase:** 4 - Scene Consistency  
**Status:** ✅ Complete

---

## WHAT WAS CREATED

**New File:** `lib/feed-planner/scene-consistency.ts`

**Updated Files:**
- `lib/feed-planner/scene-resolver.ts` - Added `resolveAllFeedPlannerScenes()`
- `lib/feed-planner/prompt-shaper.ts` - Updated to handle all 9 scenes for preview

**Purpose:** Ensure preview scenes and full planner scenes come from the same scene list with zero divergence.

---

## ARCHITECTURE

### Core Functions

1. **`resolveConsistentScenes()`**
   - Resolves all 9 scenes at once
   - Ensures preview and full planner use EXACT same scene list
   - Validates all 9 scenes are present and in correct order

2. **`buildPreviewPromptFromScenes()`**
   - Creates preview prompt using all 9 scenes
   - Preview = compressed descriptions (18-25 words per scene)
   - Uses `buildPromptFromScene()` with `preview_multi` mode

3. **`buildSingleScenePromptFromScene()`**
   - Creates single scene prompt for full planner
   - Full planner = expanded descriptions (80-130 words per scene)
   - Uses `buildPromptFromScene()` with `single_scene` mode

4. **`validateSceneConsistency()`**
   - Validates preview and full planner scenes match exactly
   - Checks Activities, Locations, Outfits, Objects
   - Returns divergences if any

---

## CONSISTENCY GUARANTEES

### Zero Divergence Requirements

**Activities:**
- Preview scene 1 activity = Full planner scene 1 activity
- Preview scene 2 activity = Full planner scene 2 activity
- ... (all 9 scenes)

**Locations:**
- Preview scene 1 location = Full planner scene 1 location
- Preview scene 2 location = Full planner scene 2 location
- ... (all 9 scenes)

**Outfits:**
- Preview scene 1 outfit = Full planner scene 1 outfit
- Preview scene 2 outfit = Full planner scene 2 outfit
- ... (all 9 scenes)

**Objects:**
- Preview scene 1 objects = Full planner scene 1 objects
- Preview scene 2 objects = Full planner scene 2 objects
- ... (all 9 scenes)

### Implementation

**Single Source of Truth:**
```typescript
// Resolve all 9 scenes ONCE
const scenes = await resolveConsistentScenes(feedLayout, user, options)

// Preview: Use all 9 scenes (compressed)
const previewPrompt = buildPreviewPromptFromScenes(scenes)

// Full Planner: Use individual scenes (expanded)
const scene1Prompt = buildSingleScenePromptFromScene(scenes[0])
const scene2Prompt = buildSingleScenePromptFromScene(scenes[1])
// ... (all 9 scenes)
```

**Key Principle:**
- Preview and full planner use the SAME scene list
- Only difference is prompt format (compressed vs expanded)
- Zero divergence in scene content

---

## USAGE EXAMPLES

### Example 1: Preview Feed Generation

```typescript
import { resolveConsistentScenes, buildPreviewPromptFromScenes } from '@/lib/feed-planner/scene-consistency'

// Resolve all 9 scenes
const scenes = await resolveConsistentScenes(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  defaultCategory: 'minimal'
})

// Build preview prompt (9 scenes in one prompt)
const previewPrompt = buildPreviewPromptFromScenes(scenes)

// Generate image with Nano Banana
const result = await generateWithNanoBanana({
  prompt: previewPrompt,
  image_input: referenceImages,
  aspect_ratio: '1:1',
  resolution: '2K'
})
```

### Example 2: Full Feed Planner Generation

```typescript
import { resolveConsistentScenes, buildSingleScenePromptFromScene } from '@/lib/feed-planner/scene-consistency'

// Resolve all 9 scenes (SAME as preview)
const scenes = await resolveConsistentScenes(feedLayout, user, {
  checkSettingsPreference: false,
  checkBlueprintSubscribers: false,
  defaultCategory: 'minimal'
})

// Build individual scene prompts (expanded)
for (let i = 0; i < 9; i++) {
  const scene = scenes[i]
  const scenePrompt = buildSingleScenePromptFromScene(scene)
  
  // Generate image for this scene
  const result = await generateWithNanoBanana({
    prompt: scenePrompt,
    image_input: referenceImages,
    aspect_ratio: '1:1',
    resolution: '2K'
  })
  
  // Save to feed_posts
  await sql`
    UPDATE feed_posts
    SET prompt = ${scenePrompt}, image_url = ${result.output}
    WHERE feed_layout_id = ${feedLayout.id} AND position = ${scene.position}
  `
}
```

### Example 3: Consistency Validation

```typescript
import { validateSceneConsistency } from '@/lib/feed-planner/scene-consistency'

// Resolve scenes for preview
const previewScenes = await resolveConsistentScenes(feedLayout, user, options)

// Resolve scenes for full planner (should be same)
const fullPlannerScenes = await resolveConsistentScenes(feedLayout, user, options)

// Validate consistency
const validation = validateSceneConsistency(previewScenes, fullPlannerScenes)

if (!validation.consistent) {
  console.error('Scene divergence detected:', validation.divergences)
  throw new Error('Preview and full planner scenes do not match')
}
```

---

## PROMPT FORMAT DIFFERENCES

### Preview Mode (Compressed)

**Format:** 9 scenes in one prompt, compressed descriptions

**Example:**
```
A realistic photo grid showing the person from the reference images in 9 different scenes, preserving her exact facial features and identity. Scene 1: the subject walking toward camera with coffee cup in hand wearing athletic activewear with a casual layer in local coffee shop with natural light. Scene 2: the subject sitting at table with laptop wearing casual casual outfit in coffee shop with workspace atmosphere. Scene 3: [Scene 3 description]. Scene 4: [Scene 4 description]. Scene 5: [Scene 5 description]. Scene 6: [Scene 6 description]. Scene 7: [Scene 7 description]. Scene 8: [Scene 8 description]. Scene 9: [Scene 9 description]. All scenes feature natural window light with soft shadows. All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** 180-240 words total (20-27 words per scene)

### Full Planner Mode (Expanded)

**Format:** 1 scene per prompt, expanded descriptions

**Example (Scene 1):**
```
A realistic photo of the person shown in the reference images, preserving her exact facial features and identity. The subject is walking toward camera with coffee cup in hand wearing athletic activewear with a casual layer, holding ceramic coffee cup and iPhone. The photo is taken in local coffee shop with natural light. Natural window light with soft shadows. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** 80-130 words per scene

**Key Difference:**
- Preview: Compressed descriptions (18-25 words per scene)
- Full Planner: Expanded descriptions (80-130 words per scene)
- Same scene content, different prompt format

---

## VALIDATION

### Scene Consistency Validation

**Function:** `validateSceneConsistency()`

**Checks:**
- Scene count (must be 9)
- Activity match (per position)
- Location type match (per position)
- Outfit match (style + base, per position)
- Objects match (types, per position)

**Returns:**
```typescript
{
  consistent: boolean
  divergences: Array<{
    position: number
    field: string
    preview: string
    fullPlanner: string
  }>
}
```

**Example Output:**
```typescript
{
  consistent: true,
  divergences: []
}
```

**If Divergence Detected:**
```typescript
{
  consistent: false,
  divergences: [
    {
      position: 3,
      field: 'activity',
      preview: 'coffee_shop_work',
      fullPlanner: 'remote_work_break'
    }
  ]
}
```

---

## INTEGRATION POINTS

### Current Status

The consistency helper is created but not yet integrated into the generation flow. It will replace:

1. **Preview Feed Flow:**
   - Current: Template → Injection → Adapter → Builder → Clean → Client
   - Future: `resolveConsistentScenes()` → `buildPreviewPromptFromScenes()` → Client

2. **Full Feed Planner Flow:**
   - Current: Template → Injection → Authority → Builder → Clean → Client
   - Future: `resolveConsistentScenes()` → `buildSingleScenePromptFromScene()` → Client

### Integration Requirements

**For Preview Feed:**
- Call `resolveConsistentScenes()` once
- Use `buildPreviewPromptFromScenes()` to create preview prompt
- Generate ONE image with 9 scenes

**For Full Feed Planner:**
- Call `resolveConsistentScenes()` once (same as preview)
- Use `buildSingleScenePromptFromScene()` for each scene
- Generate 9 images (one per scene)

**Key Point:**
- Both preview and full planner call `resolveConsistentScenes()` with SAME parameters
- This ensures zero divergence in scene content

---

## NEXT PHASE PREPARATION

**Phase 5 Requirements:**
- Integrate scene resolver + prompt shaper into generate-single route
- Replace template injection → adapter → builder chain
- Ensure preview and full planner use same scene list
- Fix image persistence and UI rendering

**Key Integration Points:**
- `app/api/feed/[feedId]/generate-single/route.ts` → Use scene resolver + prompt shaper
- Replace `isPreviewFeed` logic with `resolveConsistentScenes()`
- Ensure preview and full planner use same scene list

---

**End of Phase 4**
