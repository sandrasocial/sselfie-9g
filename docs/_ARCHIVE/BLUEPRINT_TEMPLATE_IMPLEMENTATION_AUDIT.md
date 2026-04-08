# BLUEPRINT PHOTOSHOOT TEMPLATES - IMPLEMENTATION AUDIT

## EXECUTIVE SUMMARY

This document provides a comprehensive audit of the current codebase and proposes an implementation strategy for static photoshoot prompt templates for Blueprint feature, supporting both FREE (9 images) and PAID (30 images) users with unique, non-repetitive generation.

---

## 1. CURRENT CODEBASE AUDIT

### 1.1 Generation Flow Analysis

**Current Structure:**
- **Pro Mode Generation**: ONE image per API call
- **Endpoint**: `/app/api/feed/[feedId]/generate-single/route.ts`
- **Function**: `generateWithNanoBanana()` from `lib/nano-banana-client.ts`
- **Flow**: Frontend calls `generate-single` endpoint for each post position individually

**Key Finding:**
- Each `generate-single` call creates a single Replicate prediction
- Posts are generated incrementally (one at a time)
- No batch generation endpoint currently exists for blueprint users

### 1.2 User Type Differentiation

**Access Control:**
- **File**: `lib/feed-planner/access-control.ts`
- **Function**: `getFeedPlannerAccess(userId: string)`
- **Detection Logic**:
  ```typescript
  const isFree = !hasMembership && !hasPaid
  const isPaidBlueprint = hasPaid && !hasMembership
  ```

**Current Behavior:**
- FREE users: `placeholderType: "single"` (9:16 aspect ratio)
- PAID users: `placeholderType: "grid"` (3x3 grid, 4:5 aspect ratio)
- Both use Pro Mode (forced in `generate-single` route)

### 1.3 Database Schema

**Current `feed_posts` Table Structure:**
```sql
- id (SERIAL PRIMARY KEY)
- feed_layout_id (INTEGER)
- user_id (VARCHAR)
- position (INTEGER)
- post_type (VARCHAR)
- image_url (TEXT)
- caption (TEXT)
- prompt (TEXT) -- ✅ Already exists
- generation_status (VARCHAR)
- prediction_id (TEXT)
- generation_mode (VARCHAR) -- 'classic' | 'pro'
- pro_mode_type (VARCHAR)
- content_pillar (TEXT)
- category (VARCHAR)
- seed_variation (INTEGER) -- For photoshoot consistency
```

**Missing Fields (Need Migration):**
- ❌ `blueprint_category` (VARCHAR) - Category from wizard (luxury, minimal, beige, warm, edgy, professional)
- ❌ `blueprint_mood` (VARCHAR) - Mood from wizard (luxury, minimal, beige)
- ❌ `generation_source` (VARCHAR) - 'template' | 'maya' | 'manual'
- ❌ `template_variation_index` (INTEGER) - For tracking which variation of template was used

**Recommendation:**
Create migration to add these fields to `feed_posts` table.

### 1.4 Template System Location

**Current Template File:**
- ✅ `lib/maya/blueprint-photoshoot-templates.ts` (ALREADY EXISTS)
- ✅ Contains `BLUEPRINT_PHOTOSHOOT_TEMPLATES` object
- ✅ Contains `getBlueprintPhotoshootPrompt(category, mood)` function
- ✅ All 18 templates are already implemented

**Current Usage:**
- Templates are already being used in `generate-single/route.ts` (lines 305-424)
- Logic exists for FREE and PAID blueprint users
- Category/mood mapping from `user_personal_brand` is already implemented

### 1.5 Pro Mode Generation Details

**Nano Banana Pro:**
- **File**: `lib/nano-banana-client.ts`
- **Function**: `generateWithNanoBanana(input: NanoBananaInput)`
- **Input**: Single prompt + reference images (up to 14)
- **Output**: Single image URL
- **Cost**: 2 credits per image (all resolutions)
- **Aspect Ratios**: FREE = 9:16, PAID = 4:5

**Key Finding:**
- Each API call generates ONE image
- No batch generation capability
- Must call endpoint 9 times (FREE) or 30 times (PAID)

---

## 2. VARIATION STRATEGY FOR 30 IMAGES

### 2.1 Problem Statement

**Challenge:**
- We have 9 base frame descriptions per template
- PAID users need 30 unique images
- Must avoid repetition when user regenerates

### 2.2 Recommended Approach: **Option C (Enhanced)**

**Strategy: Frame Rotation + Variation Parameters**

Instead of creating 30 separate frame descriptions, we'll:

1. **Use 9 base frames as foundation**
2. **Add variation parameters** to each frame:
   - Outfit variation (3 options per frame = 9 frames × 3 = 27 variations)
   - Angle variation (slight camera position changes)
   - Lighting variation (time of day, intensity)
   - Pose variation (subtle body positioning)

3. **Track variation index** in database (`template_variation_index`)

4. **Rotation system**: When user regenerates, increment variation index to get next variation

**Implementation:**
```typescript
// Pseudo-code
function getVariedPrompt(baseTemplate: string, frameIndex: number, variationIndex: number): string {
  const baseFrame = extractFrame(baseTemplate, frameIndex) // Get frame 1-9
  const variation = getVariationParameters(frameIndex, variationIndex) // Get variation params
  
  return applyVariation(baseFrame, variation)
}

// Variation parameters per frame
const VARIATIONS = {
  frame1: [
    { outfit: "black blazer", angle: "straight-on", lighting: "dusk" },
    { outfit: "gray blazer", angle: "slight-left", lighting: "evening" },
    { outfit: "black puffer", angle: "straight-on", lighting: "night" },
  ],
  // ... for all 9 frames
}
```

**Benefits:**
- ✅ Maintains aesthetic consistency
- ✅ Simple to implement (no AI needed)
- ✅ Predictable variations
- ✅ Easy to track which variation was used
- ✅ Supports regeneration (increment index)

**Variation Index Calculation:**
- For 30 images: Use frames 1-9, each with 3-4 variations
- Variation index = `(position - 1) % 9` (which frame) + `Math.floor((position - 1) / 9)` (which variation)
- Example: Position 10 = Frame 1, Variation 1; Position 19 = Frame 1, Variation 2

### 2.3 Alternative: Simple Frame Repetition with Seeds

**Simpler Option (If variation system is too complex):**
- Use 9 base frames for positions 1-9
- Repeat frames 1-9 for positions 10-18 (with different seed)
- Repeat frames 1-9 for positions 19-27 (with different seed)
- Use frames 1-3 for positions 28-30 (with different seed)

**Pros:** Very simple, no variation logic needed
**Cons:** Less variety, but still unique images due to seed differences

**Recommendation:** Start with simple repetition, add variation system later if needed.

---

## 3. IMPLEMENTATION PLAN

### 3.1 Database Migration

**File**: `scripts/migrations/add-blueprint-template-fields.sql`

```sql
-- Add blueprint template tracking fields to feed_posts
ALTER TABLE feed_posts
ADD COLUMN IF NOT EXISTS blueprint_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS blueprint_mood VARCHAR(50),
ADD COLUMN IF NOT EXISTS generation_source VARCHAR(50) DEFAULT 'maya',
ADD COLUMN IF NOT EXISTS template_variation_index INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feed_posts_blueprint_category 
ON feed_posts(blueprint_category, blueprint_mood);

-- Update existing blueprint posts to mark as template-generated
UPDATE feed_posts
SET generation_source = 'template'
WHERE prompt IS NOT NULL 
AND prompt LIKE '%Create a 3x3 grid%'
AND generation_source IS NULL;
```

### 3.2 Template Variation System

**File**: `lib/maya/blueprint-photoshoot-templates.ts` (EXTEND EXISTING)

**Add variation helper functions:**
```typescript
export interface FrameVariation {
  outfit: string
  angle: string
  lighting: string
  pose?: string
}

export function getFrameVariation(
  category: BlueprintCategory,
  mood: BlueprintMood,
  frameIndex: number, // 1-9
  variationIndex: number // 0-2 (for 3 variations per frame)
): FrameVariation {
  // Return variation parameters based on frame and variation index
  // This allows 9 frames × 3 variations = 27 unique prompts
  // Plus 3 more variations for positions 28-30
}

export function getVariedTemplatePrompt(
  baseTemplate: string,
  frameIndex: number,
  variationIndex: number
): string {
  // Extract the specific frame from template
  // Apply variation parameters
  // Return modified prompt for single image generation
}
```

### 3.3 Update Generation Endpoint

**File**: `app/api/feed/[feedId]/generate-single/route.ts`

**Changes Needed:**

1. **Save category/mood to database** when template is selected:
   ```typescript
   await sql`
     UPDATE feed_posts
     SET blueprint_category = ${category},
         blueprint_mood = ${mood},
         generation_source = 'template'
     WHERE id = ${postId}
   `
   ```

2. **Calculate variation index** for PAID users:
   ```typescript
   // For PAID users: Calculate which variation to use
   if (access.isPaidBlueprint) {
     const variationIndex = Math.floor((post.position - 1) / 9) // 0, 1, 2, 3
     const frameIndex = ((post.position - 1) % 9) + 1 // 1-9
     
     // Get varied prompt
     finalPrompt = getVariedTemplatePrompt(baseTemplate, frameIndex, variationIndex)
   } else {
     // FREE users: Use base template (9 frames, one per position)
     finalPrompt = baseTemplate
   }
   ```

3. **Track variation index** in database:
   ```typescript
   await sql`
     UPDATE feed_posts
     SET template_variation_index = ${variationIndex}
     WHERE id = ${postId}
   `
   ```

### 3.4 Regeneration Logic

**File**: `app/api/feed/[feedId]/regenerate-post/route.ts`

**Changes Needed:**

1. **Increment variation index** on regeneration:
   ```typescript
   // Get current variation index
   const currentVariation = post.template_variation_index || 0
   const nextVariation = (currentVariation + 1) % 3 // Cycle through 0, 1, 2
   
   // Use next variation
   const frameIndex = ((post.position - 1) % 9) + 1
   finalPrompt = getVariedTemplatePrompt(baseTemplate, frameIndex, nextVariation)
   
   // Save new variation index
   await sql`
     UPDATE feed_posts
     SET template_variation_index = ${nextVariation}
     WHERE id = ${postId}
   `
   ```

---

## 4. ANSWERS TO QUESTIONS

### Q1: Current generation flow - How many images per API call?

**Answer:** ONE image per API call. Each `generate-single` endpoint call creates a single Replicate prediction and returns one image URL. The frontend must call this endpoint multiple times (9 for FREE, 30 for PAID).

### Q2: Variation strategy for 30 unique images?

**Answer:** **Recommended: Frame Rotation + Variation Parameters (Option C Enhanced)**

- Use 9 base frames as foundation
- Add 3-4 variation parameters per frame (outfit, angle, lighting, pose)
- Track variation index in database
- For 30 images: Use frames 1-9 with variations 0-2 (27 images) + frames 1-3 with variation 3 (3 images)
- On regeneration: Increment variation index to get next variation

**Simpler Alternative:** Repeat 9 frames 3 times with different seeds (positions 1-9, 10-18, 19-27) + frames 1-3 once more (28-30).

### Q3: Database fields - Do they exist?

**Answer:** ❌ **NO** - The following fields are missing:
- `blueprint_category` (VARCHAR)
- `blueprint_mood` (VARCHAR)
- `generation_source` (VARCHAR)
- `template_variation_index` (INTEGER)

**Action Required:** Create migration to add these fields.

### Q4: Conflict check - Any existing flows that might conflict?

**Answer:** ✅ **NO CONFLICTS** - Current implementation already:
- Uses templates for FREE and PAID blueprint users (lines 284-424 in `generate-single/route.ts`)
- Differentiates between FREE and PAID via `getFeedPlannerAccess()`
- Forces Pro Mode for blueprint users
- Does NOT interfere with:
  - Membership Classic Mode (different code path)
  - Maya AI generation for non-blueprint users
  - Other generation flows

**Note:** The template system is already partially implemented. We just need to:
1. Add variation system for 30 images
2. Add database fields for tracking
3. Add regeneration logic

### Q5: Error handling - Missing templates or invalid combinations?

**Answer:** Current implementation already handles this:

```typescript
// From blueprint-photoshoot-templates.ts
export function getBlueprintPhotoshootPrompt(category: BlueprintCategory, mood: BlueprintMood): string {
  const moodName = MOOD_MAP[mood]
  const promptKey = `${category}_${moodName}`
  const prompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[promptKey]

  if (!prompt || prompt === `[USER WILL PROVIDE EXACT PROMPT]`) {
    throw new Error(
      `Prompt template not provided for combination: ${category} + ${moodName} (key: ${promptKey}). Please add the prompt to BLUEPRINT_PHOTOSHOOT_TEMPLATES.`,
    )
  }

  return prompt
}
```

**Recommendation:** Add fallback to default template (`professional_minimal`) if template not found, rather than throwing error.

---

## 5. TESTING CHECKLIST

### Pre-Implementation
- [x] Audit complete
- [x] Variation strategy defined
- [x] Database migration planned
- [x] No conflicts identified

### Implementation
- [ ] Create database migration
- [ ] Add variation helper functions to template file
- [ ] Update `generate-single` route to save category/mood
- [ ] Update `generate-single` route to use variations for PAID users
- [ ] Update `regenerate-post` route to increment variation index
- [ ] Add error handling for missing templates

### Post-Implementation Testing
- [ ] FREE user: generates 9 images using static templates
- [ ] PAID user: generates 30 unique images (no repeats)
- [ ] Same user regenerates: gets different images (variation index increments)
- [ ] Templates load correctly for all 18 category/mood combos
- [ ] Pro Mode forced for blueprint generation
- [ ] Credits deducted correctly (2 per image)
- [ ] Existing Maya AI flow still works
- [ ] No conflicts with membership Classic Mode
- [ ] Database fields properly saved and retrieved
- [ ] Variation index increments correctly on regeneration

---

## 6. NEXT STEPS

1. **Review this audit** with team
2. **Approve variation strategy** (Option C Enhanced vs Simple Repetition)
3. **Create database migration** script
4. **Implement variation system** in template file
5. **Update generation endpoints** with variation logic
6. **Test with real users** (FREE and PAID)
7. **Monitor for issues** and iterate

---

## 7. RISKS & MITIGATION

**Risk 1:** Variation system too complex
- **Mitigation:** Start with simple frame repetition, add variations later

**Risk 2:** Users see repetitive images
- **Mitigation:** Use different seeds + variation parameters to ensure uniqueness

**Risk 3:** Database migration fails
- **Mitigation:** Test migration on staging first, use `IF NOT EXISTS` clauses

**Risk 4:** Performance impact from variation calculations
- **Mitigation:** Cache variation parameters, pre-calculate on feed creation

---

**Document Status:** ✅ Complete - Ready for Implementation
**Last Updated:** 2025-01-XX
**Author:** AI Engineering Team
