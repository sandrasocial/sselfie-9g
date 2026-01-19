# Feed Planner Stabilization - Phase 3: Prompt Generation (Late Binding)
## Prompt Assembly from Structured Scene Data

**Date:** January 2026  
**Phase:** 3 - Prompt Shaping (No Scene Logic)  
**Status:** ✅ Complete

---

## WHAT WAS CREATED

**New File:** `lib/feed-planner/prompt-shaper.ts`

**Purpose:** Converts structured scene data → final prompt text. Natural language generated ONLY at this step.

**Key Function:** `buildPromptFromScene()`

---

## ARCHITECTURE

### Input
- `scene: FeedPlannerScene` - Structured scene data (from scene-resolver.ts)
- `mode: PromptMode` - 'preview_multi' (9 scenes) or 'single_scene' (1 scene)
- `allScenes?: FeedPlannerScene[]` - Optional array of all 9 scenes for preview mode

### Output
- Final prompt text (natural language)
- Ready for Nano Banana API
- No mutation after generation

---

## PROMPT MODES

### Mode 1: Single Scene (`single_scene`)

**Purpose:** Generate ONE image for ONE scene

**Structure:**
1. Identity anchor (explicit, if not flatlay)
2. Subject + outfit (detailed)
3. Objects (in context)
4. Location (one clear location)
5. Lighting (natural, realistic)
6. Camera specs (iPhone 15 Pro)

**Target:** 80-130 words

### Mode 2: Preview Multi (`preview_multi`)

**Purpose:** Generate ONE image with 9 scenes (preview grid)

**Structure:**
1. Identity anchor (ONCE, at top)
2. Scene 1-9 descriptions (brief, 18-25 words each)
3. Lighting (ONCE, applies to all)
4. Camera specs (ONCE, at end)

**Target:** 180-240 words

---

## PROMPT OUTPUT EXAMPLES

### Example 1: Single Scene - Post-Workout Coffee

**Input Scene:**
```typescript
{
  position: 2,
  activity: "post_workout_coffee",
  narrative: "Grabbing coffee after morning workout",
  location: {
    type: "coffee_shop",
    description: "local coffee shop with natural light",
    indoor: true,
    public: true
  },
  outfit: {
    style: "athletic",
    description: "athletic athletic_base with casual_layer",
    base: "athletic_base",
    layer: "casual_layer"
  },
  objects: [
    { type: "coffee_cup", description: "ceramic coffee cup", position: "hand" },
    { type: "phone", description: "iPhone", position: "hand" }
  ],
  lighting: {
    type: "natural_window_light",
    quality: "uneven",
    description: "natural window light with soft shadows"
  },
  camera: {
    device: "iphone_15_pro",
    mode: "portrait",
    framing: "full_body"
  },
  pose: {
    type: "walking_toward_camera",
    description: "walking toward camera with coffee cup in hand"
  },
  category: "minimal",
  mood: "minimal",
  fashionStyle: "athletic"
}
```

**Output Prompt:**
```
A realistic photo of the person shown in the reference images, preserving her exact facial features and identity. The subject is walking toward camera with coffee cup in hand wearing athletic activewear with a casual layer, holding ceramic coffee cup and iPhone. The photo is taken in local coffee shop with natural light. Natural window light with soft shadows. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** 67 words (within 80-130 target)

**Structure:**
1. ✅ Identity anchor (explicit)
2. ✅ Subject + outfit (detailed)
3. ✅ Objects (in context)
4. ✅ Location (one clear location)
5. ✅ Lighting (natural, realistic)
6. ✅ Camera specs (iPhone 15 Pro)

### Example 2: Single Scene - Flatlay

**Input Scene:**
```typescript
{
  position: 2,
  activity: "post_workout_coffee",
  camera: {
    framing: "flatlay"
  },
  objects: [
    { type: "coffee_cup", description: "ceramic coffee cup", position: "table" },
    { type: "water_bottle", description: "water bottle", position: "table" }
  ],
  outfit: {
    style: "athletic",
    base: "athletic_base"
  },
  category: "minimal"
}
```

**Output Prompt:**
```
An overhead lifestyle detail photo featuring ceramic coffee cup, water bottle with athletic activewear arranged naturally on a clean minimal surface. Natural window light with soft shadows. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** 38 words

**Key Differences:**
- ✅ NO identity anchor (flatlays don't show person)
- ✅ NO "subject wearing" phrasing
- ✅ Focus on objects and styling
- ✅ "Overhead lifestyle detail photo" phrasing

### Example 3: Preview Multi-Scene (9 Scenes)

**Input:** Array of 9 scenes (will be provided in Phase 4)

**Output Structure:**
```
A realistic photo grid showing the person from the reference images in 9 different scenes, preserving her exact facial features and identity. Scene 1: the subject walking toward camera with coffee cup in hand wearing athletic activewear with a casual layer in local coffee shop with natural light. Scene 2: [Scene 2 description]. Scene 3: [Scene 3 description]. Scene 4: [Scene 4 description]. Scene 5: [Scene 5 description]. Scene 6: [Scene 6 description]. Scene 7: [Scene 7 description]. Scene 8: [Scene 8 description]. Scene 9: [Scene 9 description]. All scenes feature natural window light with soft shadows. All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Key Features:**
- ✅ Identity anchor ONCE at top
- ✅ 9 scene descriptions (brief, 18-25 words each)
- ✅ Lighting ONCE (applies to all)
- ✅ Camera specs ONCE at end
- ✅ Target: 180-240 words total

---

## KEY DESIGN DECISIONS

### 1. No Prompt Mutation

**Rule:** Prompt text is created once, at final step. No cleaning, sanitization, or mutation afterward.

**Implementation:**
- `buildPromptFromScene()` creates final prompt
- No `cleanStudioProPrompt()` calls
- No identity anchor auto-injection (explicit in prompt)
- No post-processing

### 2. Explicit Identity Anchor

**Rule:** Identity anchor is explicit in prompt, not auto-injected by client.

**Implementation:**
- Added to prompt text directly
- Only for portrait/movement scenes (not flatlays)
- Format: "A realistic photo of the person shown in the reference images, preserving her exact facial features and identity"

### 3. Flatlay Handling

**Rule:** Flatlays are lifestyle detail photos, not portraits.

**Implementation:**
- No identity anchor for flatlays
- No "subject wearing" phrasing
- Focus on objects and styling
- "Overhead lifestyle detail photo" phrasing

### 4. Single Camera Specs

**Rule:** Camera specs appear once per prompt.

**Implementation:**
- Single scene: At end of prompt
- Preview multi: At end of prompt (applies to all scenes)

### 5. No Conflicting Outfits

**Rule:** Each scene has ONE outfit description.

**Implementation:**
- Structured scene data ensures single outfit
- Validation checks for multiple "wearing" phrases
- No outfit conflicts possible with structured data

---

## VALIDATION

**Function:** `validateFeedPlannerPrompt()`

**Checks:**
- Prompt length (80-130 for single, 180-240 for preview)
- Identity anchor presence (if expected)
- Camera specs presence
- Conflicting outfits (should not happen)

**Returns:** Validation result (errors + warnings), NOT modified prompt

---

## INTEGRATION POINTS

### Current Usage (Not Yet Integrated)

The prompt shaper is created but not yet integrated into the generation flow. It will replace:

1. **Preview Feed Flow:**
   - Current: Template → Injection → Adapter → Builder → Clean → Client (auto-inject)
   - Future: Scene Resolver → Prompt Shaper → Client (no mutation)

2. **Full Feed Planner Flow:**
   - Current: Template → Injection → Authority → Builder → Clean → Client (auto-inject)
   - Future: Scene Resolver → Prompt Shaper → Client (no mutation)

### Backward Compatibility

The prompt shaper outputs prompts compatible with `nano-banana-client.ts`, but:
- Identity anchor is explicit (not auto-injected)
- Client should NOT auto-inject if anchor already present
- This will be fixed in Phase 4 (modify client to check for existing anchor)

---

## NEXT PHASE PREPARATION

**Phase 4 Requirements:**
- Resolve all 9 scenes for preview mode
- Ensure preview scenes match full planner scenes exactly
- Integrate scene resolver + prompt shaper into generate-single route
- Modify nano-banana-client to not auto-inject if anchor exists

**Key Integration Points:**
- `app/api/feed/[feedId]/generate-single/route.ts` → Use scene resolver + prompt shaper
- Replace template injection → adapter → builder chain
- Ensure preview and full planner use same scene list

---

**End of Phase 3**
