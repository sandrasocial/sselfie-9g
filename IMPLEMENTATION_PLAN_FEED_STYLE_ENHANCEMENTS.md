# Implementation Plan: Dynamic Template System (REVISED)

## Executive Summary

This plan implements a **DYNAMIC TEMPLATE SYSTEM** that combines:
1. **Template Placeholders**: Templates use `{{outfit}}`, `{{location}}`, `{{accessories}}` placeholders
2. **Dynamic Injection**: Outfits/locations injected from NEW libraries organized by visual aesthetic
3. **Fashion Style Integration**: Uses user's fashion preferences from onboarding
4. **Simple Rotation**: Tracks index position, rotates through options automatically

**Key Principle:** Keep it simple. No complex variation tracking, no reuse of wrong libraries.

**Timeline**: 3 phases, ~12 hours total
**Risk Level**: Low (simple placeholder injection)
**Backward Compatibility**: Maintained for existing feeds

---

## 🎯 What We're Building

### ✅ KEEP (From Audit):
- **Placeholder Concept**: `{{outfit}}`, `{{location}}`, `{{accessories}}` in templates
- **Template Frame Extraction**: Reuse `parseTemplateFrames()`, `buildSingleImagePrompt()`
- **Fashion Style Extraction**: Reuse `user_personal_brand.fashion_style` reading
- **Rotation Concept**: Users get different options each feed (simplified)

### ❌ DISCARD (From Audit):
- **Template Variations**: No `_v2`, `_v3` approach
- **Existing Outfit Library**: Don't use `influencer-outfits.ts` (wrong structure)
- **Complex Rotation**: No variation key tracking, no complex queries

---

## Phase 1: Dynamic Template System (Priority 1) 🎯

### Goal
Allow users to get different images when creating multiple feeds with the same style, using **dynamic outfit/location injection** via placeholders.

### ✅ What We're Reusing

**1. Template Frame Extraction** ✅
- **File:** `lib/feed-planner/build-single-image-prompt.ts`
- **Functions:** `parseTemplateFrames()`, `buildSingleImagePrompt()`
- **✅ REUSE:** Keep frame structure, just replace hardcoded outfits with placeholders

**2. Fashion Style Extraction** ✅
- **File:** `lib/maya/get-user-context.ts`
- **Already extracting** `fashion_style` from `user_personal_brand` table
- **Supports:** casual, business, trendy, timeless
- **✅ REUSE:** Already working, use it for outfit selection

**3. Color Palette System** ✅
- **File:** `lib/feed-planner/feed-prompt-expert.ts`
- **Has:** `MAYA_SIGNATURE_PALETTES` with color palettes per vibe
- **✅ REUSE:** Keep color grade and vibe descriptions as-is

### 🆕 What We Need to Build (New Code)

**1. Template Placeholder System** 🆕
- Replace hardcoded outfits with `{{outfit}}` placeholders
- Replace hardcoded locations with `{{location}}` placeholders
- Replace hardcoded accessories with `{{accessories}}` placeholders
- Keep frame structure, poses, color grade

**2. NEW Outfit Libraries** 🆕
- Create outfit libraries organized by **visual aesthetic** (dark_moody, light_minimalistic, beige_aesthetic)
- NOT by influencer category (LIFESTYLE, FASHION, etc.)
- 5-10 outfits per aesthetic × user's fashion_style
- Example: `dark_moody_outfits.business`, `dark_moody_outfits.casual`, etc.

**3. Location Libraries** 🆕
- Create location libraries per vibe (dark_moody, light_minimalistic, beige_aesthetic)
- 3-5 locations per vibe
- Match existing template locations but make them rotatable

**4. Simple Rotation System** 🆕
- Store `outfit_index` and `location_index` in `feed_layouts` (simple integers)
- Increment index on each new feed
- Cycle back when index exceeds array length
- No complex queries, no variation keys

**5. Dynamic Injection System** 🆕
- Replace `{{outfit}}`, `{{location}}`, `{{accessories}}` with selected values
- Inject at feed creation time (before frame extraction)

### Implementation Steps

#### Step 1.1: Update Templates with Placeholders
**File**: `lib/maya/blueprint-photoshoot-templates.ts`

**Changes:**
- Replace hardcoded outfits with `{{outfit}}` placeholders
- Replace hardcoded locations with `{{location}}` placeholders
- Replace hardcoded accessories with `{{accessories}}` placeholders
- Keep frame structure, poses, color grade unchanged

**Example:**
```typescript
// BEFORE (hardcoded)
luxury_dark_moody: `...
Frame 1: Sitting on concrete stairs - black blazer, leather pants, beanie, sunglasses, relaxed pose
Frame 2: Coffee and designer YSL bag on dark marble table - overhead flatlay, moody lighting
...`

// AFTER (with placeholders)
luxury_dark_moody: `...
Frame 1: Sitting on {{location}} - {{outfit}}, {{accessories}}, relaxed pose
Frame 2: Coffee and {{accessories}} on {{location}} - overhead flatlay, moody lighting
...`
```

**Backward Compatibility:**
- ✅ Keep old templates as fallback (if injection fails)
- ✅ Can migrate gradually (test with 1 template first)
- ✅ Existing code continues to work

**Risk**: Low
- Simple find/replace in templates
- Can test with 1 template before updating all 18
- Fallback to old templates if injection fails

#### Step 1.2: Create Dynamic Template Injector
**File**: `lib/feed-planner/dynamic-template-injector.ts` (NEW)

**New Function:**
```typescript
/**
 * Inject dynamic outfits/locations into template placeholders
 * @param template - Template with {{outfit}}, {{location}}, {{accessories}} placeholders
 * @param outfit - Selected outfit description from influencer-outfits.ts
 * @param location - Selected location for this frame
 * @param accessories - Selected accessories
 * @returns Injected template
 */
export function injectTemplatePlaceholders(
  template: string,
  outfit: string,
  location: string,
  accessories: string
): string {
  return template
    .replace(/\{\{outfit\}\}/g, outfit)
    .replace(/\{\{location\}\}/g, location)
    .replace(/\{\{accessories\}\}/g, accessories)
}
```

**Risk**: Low
- Simple string replacement
- Easy to test

#### Step 1.3: Create NEW Outfit Libraries
**File**: `lib/feed-planner/outfit-libraries.ts` (NEW)

**Structure:**
```typescript
// Organized by visual aesthetic (not influencer category)
export const DARK_MOODY_OUTFITS = {
  business: [
    "black oversized blazer, black leather pants, white tee",
    "black puffer jacket, black tailored trousers, black boots",
    "gray tailored blazer, black bodysuit, black wide-leg pants",
    // ... 5-10 outfits
  ],
  casual: [
    "black leather jacket, baggy jeans, white sneakers",
    "black hoodie, black cargo pants, chunky boots",
    // ... 5-10 outfits
  ],
  trendy: [
    "black structured blazer, black mini skirt, knee-high boots",
    // ... 5-10 outfits
  ],
  timeless: [
    "black cashmere coat, black turtleneck, black trousers",
    // ... 5-10 outfits
  ]
}

export const LIGHT_MINIMALISTIC_OUTFITS = {
  business: [
    "white tailored blazer, cream wide-leg trousers, nude heels",
    // ... 5-10 outfits
  ],
  casual: [
    "cream oversized sweater, white linen pants, white sneakers",
    // ... 5-10 outfits
  ],
  // ... etc
}

export const BEIGE_AESTHETIC_OUTFITS = {
  // ... same structure
}
```

**Risk**: Low
- Simple arrays organized by aesthetic + fashion_style
- Easy to add more outfits later

#### Step 1.4: Create Location Libraries
**File**: `lib/feed-planner/location-libraries.ts` (NEW)

**Structure:**
```typescript
export const DARK_MOODY_LOCATIONS = [
  "concrete stairs",
  "dark marble table",
  "gray wall",
  "city street at dusk",
  "dark minimalist desk",
  "luxury building lobby",
  "urban architecture backdrop"
]

export const LIGHT_MINIMALISTIC_LOCATIONS = [
  "bright white room",
  "white marble surface",
  "architectural white doorway",
  "bright hallway",
  "white desk",
  "bright clean bathroom",
  "luxury hotel lobby with natural light"
]

export const BEIGE_AESTHETIC_LOCATIONS = [
  "warm beige wall",
  "café table with latte",
  "cozy interior with natural wood",
  // ... etc
]
```

**Risk**: Low
- Simple arrays per vibe
- Extract from existing templates

#### Step 1.5: Create Simple Rotation System
**File**: `lib/feed-planner/simple-rotation.ts` (NEW)

**New Function:**
```typescript
/**
 * Get next outfit/location using simple index rotation
 * @param userId - User ID
 * @param feedMood - Feed mood (dark_moody, light_minimalistic, beige_aesthetic)
 * @param fashionStyle - User's fashion style
 * @param type - 'outfit' or 'location'
 * @returns Selected value and new index
 */
export async function getNextWithRotation(
  userId: string,
  feedMood: string,
  fashionStyle: string,
  type: 'outfit' | 'location'
): Promise<{ value: string; newIndex: number }> {
  const moodName = MOOD_MAP[mood]
  const baseKey = `${category}_${moodName}`
  
  // Find all available variations for this category+mood
  const availableVariations: string[] = []
  
  // Check for base template (v1 - implicit)
  if (BLUEPRINT_PHOTOSHOOT_TEMPLATES[baseKey]) {
    availableVariations.push(baseKey) // v1
  }
  
  // Check for explicit variations (v2, v3, etc.)
  let variationNum = 2
  while (BLUEPRINT_PHOTOSHOOT_TEMPLATES[`${baseKey}_v${variationNum}`]) {
    availableVariations.push(`${baseKey}_v${variationNum}`)
    variationNum++
  }
  
  if (availableVariations.length === 0) {
    throw new Error(`No templates found for ${baseKey}`)
  }
  
  // If only one variation, return it
  if (availableVariations.length === 1) {
    return BLUEPRINT_PHOTOSHOOT_TEMPLATES[availableVariations[0]]
  }
  
  // Get user's usage history for this category+mood
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)
  
  const usedVariations = await sql`
    SELECT template_variation
    FROM feed_layouts
    WHERE user_id = ${userId}
      AND feed_category = ${category}
      AND feed_style = ${mood}
      AND template_variation IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 10
  ` as Array<{ template_variation: string }>
  
  const usedKeys = new Set(usedVariations.map(v => v.template_variation))
  
  // Find unused variations
  const unusedVariations = availableVariations.filter(v => !usedKeys.has(v))
  
  // If all variations used, start over (use least recently used)
  let selectedVariationKey: string
  if (unusedVariations.length === 0) {
    // Use the oldest used variation (rotate back to beginning)
    const oldestUsed = usedVariations[usedVariations.length - 1]?.template_variation
    if (oldestUsed && availableVariations.includes(oldestUsed)) {
      selectedVariationKey = oldestUsed
    } else {
      // Fallback: use first available
      selectedVariationKey = availableVariations[0]
    }
  } else {
    // Use first unused variation
    selectedVariationKey = unusedVariations[0]
  }
  
  return {
    template: BLUEPRINT_PHOTOSHOOT_TEMPLATES[selectedVariationKey],
    variationKey: selectedVariationKey
  }
}
```

**Updated Return Type:**
```typescript
export async function getBlueprintPhotoshootPromptWithRotation(
  category: BlueprintCategory,
  mood: BlueprintMood,
  userId: string
): Promise<{ template: string; variationKey: string }> {
  // ... implementation above
}
```

**Backward Compatibility:**
- Keep old `getBlueprintPhotoshootPrompt()` function unchanged
- New function is separate, doesn't break existing code
- Can migrate callers gradually

#### Step 1.3: Store Variation Key in Database
**File**: `scripts/migrations/add-template-variation-to-feed-layouts.sql`

**Migration:**
```sql
-- Add template_variation column to feed_layouts
-- Stores the full template key (e.g., "luxury_dark_moody", "luxury_dark_moody_v2", "luxury_dark_moody_v3")
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS template_variation VARCHAR(100);

-- Add index for rotation queries
CREATE INDEX IF NOT EXISTS idx_feed_layouts_template_variation 
ON feed_layouts(user_id, feed_category, feed_style, template_variation);

-- Add comment
COMMENT ON COLUMN feed_layouts.template_variation IS 
'Full template key used for this feed (e.g., "luxury_dark_moody", "luxury_dark_moody_v2"). Ensures consistency across all 9 images and enables rotation tracking.';
```

**Risk**: Low
- New column, nullable
- Existing feeds will have NULL (use base template)

#### Step 1.4: Update Feed Creation with Rotation
**File**: `app/api/feed/create-manual/route.ts`

**Changes:**
```typescript
// Use rotation function to get next unused variation
const { getBlueprintPhotoshootPromptWithRotation } = await import("@/lib/maya/blueprint-photoshoot-templates")

// Get template with rotation (ensures user gets different variation)
const { template: fullTemplate, variationKey: selectedVariationKey } = 
  await getBlueprintPhotoshootPromptWithRotation(
    category,
    mood,
    user.id.toString()
  )

// Store variation key in feed_layouts
await sql`
  UPDATE feed_layouts
  SET 
    template_variation = ${selectedVariationKey},
    feed_category = ${category},
    feed_style = ${feedStyle}
  WHERE id = ${feedId}
`
```

**Note**: The rotation function returns both the template content AND the variation key, so we can store it directly.

**Risk**: Low
- Only affects new feeds
- Existing feeds continue to work
- Rotation ensures variety

#### Step 1.5: Update Image Generation to Use Stored Variation
**File**: `app/api/feed/[feedId]/generate-single/route.ts`

**Changes:**
```typescript
// Get stored variation key from feed_layouts
const [feedLayout] = await sql`
  SELECT feed_style, feed_category, template_variation
  FROM feed_layouts
  WHERE id = ${feedIdInt}
`

// Use stored variation key if available, otherwise use base template
const moodName = MOOD_MAP[feedLayout.feed_style]
const category = feedLayout.feed_category || categoryFromProfile
const baseKey = `${category}_${moodName}`

// Use stored variation key, or fallback to base
const templateKey = feedLayout.template_variation || baseKey
const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

if (!fullTemplate) {
  // Fallback to base if variation not found
  const baseTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[baseKey]
  if (!baseTemplate) {
    throw new Error(`Template not found: ${templateKey} or ${baseKey}`)
  }
  // Use base template
  const extractedScene = buildSingleImagePrompt(baseTemplate, post.position)
  // ...
} else {
  // Use stored variation
  const extractedScene = buildSingleImagePrompt(fullTemplate, post.position)
  // ...
}
```

**Risk**: Low
- Falls back to base template if variation not found
- Maintains consistency within a feed
- Existing feeds work (NULL variation → base template)

### Testing Checklist
- [ ] Create Feed #1 with "dark and moody" → Verify variation stored
- [ ] Create Feed #2 with "dark and moody" → Verify different variation
- [ ] Generate all 9 images in Feed #1 → Verify same variation used
- [ ] Generate all 9 images in Feed #2 → Verify same variation used
- [ ] Verify existing feeds still work (NULL variation)

### Rollback Plan
1. Revert template structure to flat object
2. Remove `template_variation` column (or leave it, it's nullable)
3. Restore old `getBlueprintPhotoshootPrompt()` function

---

## Phase 2: Category Selection (Priority 2)

### Goal
Allow users to select category per feed, not just from profile.

### Current State Audit

**Files Involved:**
- `components/feed-planner/feed-style-modal.tsx` - UI for feed style selection
- `app/api/feed/create-manual/route.ts` - Feed creation
- `app/api/feed/[feedId]/generate-single/route.ts` - Image generation

**Current Flow:**
1. User selects feed_style (luxury/minimal/beige) → Maps to MOOD
2. Category comes from `user_personal_brand.visual_aesthetic` → Set once in onboarding
3. Template key = `${category}_${moodName}`

**Problem:**
- User cannot select category per feed
- Category is locked to profile settings
- Cannot mix "dark and moody" (mood) + "professional" (category) per feed

### Implementation Steps

#### Step 2.1: Add Category Selection UI
**File**: `components/feed-planner/feed-style-modal.tsx`

**Changes:**
```typescript
// Add category selection state
const [selectedCategory, setSelectedCategory] = useState<BlueprintCategory | null>(null)

// Add category options
const categories: BlueprintCategory[] = [
  "luxury", "minimal", "beige", "warm", "edgy", "professional"
]

// Update onConfirm to return both
onConfirm: (feedStyle: FeedStyle, category?: BlueprintCategory) => void
```

**UI Changes:**
- Add category selection section after feed style selection
- Show category descriptions
- Default to user's profile category if available

**Risk**: Medium
- UI change, needs design review
- Need to handle backward compatibility (existing callers)

#### Step 2.2: Add Database Column
**File**: `scripts/migrations/add-feed-category-to-feed-layouts.sql`

**Migration:**
```sql
-- Add feed_category column
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS feed_category VARCHAR(50);

-- Add index
CREATE INDEX IF NOT EXISTS idx_feed_layouts_feed_category 
ON feed_layouts(feed_category);

-- Add comment
COMMENT ON COLUMN feed_layouts.feed_category IS 
'Feed category: luxury, minimal, beige, warm, edgy, or professional. Used with feed_style (mood) to select template.';
```

**Risk**: Low
- New column, nullable
- Existing feeds will use profile category as fallback

#### Step 2.3: Update Feed Creation
**File**: `app/api/feed/create-manual/route.ts`

**Changes:**
```typescript
// Get category from request body (new) or user profile (fallback)
const feedCategory = body.feedCategory || categoryFromProfile

// Store in feed_layouts
await sql`
  INSERT INTO feed_layouts (
    // ... existing columns ...
    feed_category,
    feed_style
  ) VALUES (
    // ... existing values ...
    ${feedCategory},
    ${feedStyle}
  )
`
```

**Backward Compatibility:**
- If `feedCategory` not provided, use profile category
- Existing feeds continue to work

#### Step 2.4: Update Template Selection
**File**: `app/api/feed/create-manual/route.ts` and `app/api/feed/[feedId]/generate-single/route.ts`

**Changes:**
```typescript
// Use feed_category from feed_layouts (priority) or profile (fallback)
const category = feedLayout.feed_category || categoryFromProfile

// Use category + mood for template selection
const templateKey = `${category}_${moodName}`
```

**Risk**: Low
- Fallback to profile category ensures compatibility
- Only affects template selection logic

### Testing Checklist
- [ ] Create feed with category selection → Verify category stored
- [ ] Create feed without category → Verify profile category used
- [ ] Generate images → Verify correct template used
- [ ] Verify existing feeds still work

### Rollback Plan
1. Remove category selection from UI
2. Keep `feed_category` column (nullable, doesn't break anything)
3. Restore old category selection logic (from profile only)

---

## Phase 3: Fashion Style Integration (Priority 3)

### Goal
Use user's fashion style preferences in prompt building.

### Current State Audit

**Files Involved:**
- `lib/feed-planner/build-single-image-prompt.ts` - Prompt building
- `app/api/feed/create-manual/route.ts` - Feed creation
- `app/api/feed/[feedId]/generate-single/route.ts` - Image generation

**Current State:**
- `user_personal_brand.fashion_style` exists (casual, business, trendy, timeless)
- Not used in prompt building
- Templates have hardcoded outfits

**Problem:**
- User's fashion preferences ignored
- All users get same outfits for same template

### Implementation Steps

#### Step 3.1: Add Fashion Style Parameter
**File**: `lib/feed-planner/build-single-image-prompt.ts`

**Changes:**
```typescript
export function buildSingleImagePrompt(
  templatePrompt: string,
  position: number,
  fashionStyle?: string | null // NEW parameter
): string {
  // ... existing parsing ...
  
  // Modify frame description based on fashion style
  let frameDescription = frame.description
  
  if (fashionStyle) {
    frameDescription = adjustOutfitForFashionStyle(
      frameDescription,
      fashionStyle
    )
  }
  
  // ... rest of function ...
}

function adjustOutfitForFashionStyle(
  frameDescription: string,
  fashionStyle: string
): string {
  // Map fashion style to outfit adjustments
  const styleAdjustments: Record<string, string> = {
    casual: "relaxed, everyday",
    business: "professional, polished",
    trendy: "fashion-forward, current",
    timeless: "classic, elegant"
  }
  
  // Replace outfit descriptions in frame
  // Example: "black blazer" → "black blazer, professional cut" for business
  // This is a simplified example - actual implementation would be more sophisticated
  
  return frameDescription // For now, return as-is (placeholder)
}
```

**Risk**: High
- Outfit modification logic is complex
- Need to preserve template structure
- May need AI assistance for sophisticated adjustments

#### Step 3.2: Read Fashion Style in Feed Creation
**File**: `app/api/feed/create-manual/route.ts`

**Changes:**
```typescript
// Get user's fashion style
const [personalBrand] = await sql`
  SELECT fashion_style
  FROM user_personal_brand
  WHERE user_id = ${user.id}
  ORDER BY created_at DESC
  LIMIT 1
`

const fashionStyle = personalBrand?.fashion_style || null

// Pass to buildSingleImagePrompt
const extractedScene = buildSingleImagePrompt(
  fullTemplate,
  position,
  fashionStyle // NEW parameter
)
```

**Risk**: Low
- Just reading existing data
- Optional parameter, backward compatible

#### Step 3.3: Read Fashion Style in Image Generation
**File**: `app/api/feed/[feedId]/generate-single/route.ts`

**Changes:**
```typescript
// Get user's fashion style
const [personalBrand] = await sql`
  SELECT fashion_style
  FROM user_personal_brand
  WHERE user_id = ${user.id}
  ORDER BY created_at DESC
  LIMIT 1
`

const fashionStyle = personalBrand?.fashion_style || null

// Pass to buildSingleImagePrompt
finalPrompt = buildSingleImagePrompt(
  fullTemplate,
  post.position,
  fashionStyle // NEW parameter
)
```

**Risk**: Low
- Same as Step 3.2

### Testing Checklist
- [ ] User with "casual" fashion style → Verify casual adjustments
- [ ] User with "business" fashion style → Verify professional adjustments
- [ ] User without fashion style → Verify no adjustments (backward compatible)
- [ ] Verify outfit descriptions are appropriate for fashion style

### Rollback Plan
1. Remove fashion style parameter from `buildSingleImagePrompt()`
2. Restore old function signature
3. Fashion style data remains in database (unused)

---

## Database Migration Summary

### New Columns
1. `feed_layouts.template_variation` (VARCHAR(10), nullable)
2. `feed_layouts.feed_category` (VARCHAR(50), nullable)

### Migration Files to Create
1. `scripts/migrations/add-template-variation-to-feed-layouts.sql`
2. `scripts/migrations/add-feed-category-to-feed-layouts.sql`
3. `scripts/migrations/run-template-variation-migration.ts`
4. `scripts/migrations/run-feed-category-migration.ts`
5. `scripts/migrations/verify-template-variation-migration.ts`
6. `scripts/migrations/verify-feed-category-migration.ts`

### Migration Execution Order
1. Run template variation migration (Phase 1)
2. Run feed category migration (Phase 2)
3. Fashion style (Phase 3) - No migration needed (uses existing column)

---

## Breaking Changes Analysis

### Phase 1: Template Variety
**Breaking Changes:**
- ✅ **NONE** - Fully backward compatible!

**Why No Breaking Changes:**
- Existing templates remain unchanged (no structure change)
- New templates are additive only (just add `_v2`, `_v3` keys)
- Old `getBlueprintPhotoshootPrompt()` function unchanged
- New rotation function is separate
- Existing code continues to work

**Mitigation:**
- ✅ Keep old `getBlueprintPhotoshootPrompt()` function unchanged
- ✅ Add new `getBlueprintPhotoshootPromptWithRotation()` function
- ✅ Gradually migrate callers (or use both in parallel)

### Phase 2: Category Selection
**Breaking Changes:**
- ❌ None - fully backward compatible

**Mitigation:**
- New column is nullable
- Fallback to profile category
- Existing feeds continue to work

### Phase 3: Fashion Style
**Breaking Changes:**
- ❌ Function signature change (new optional parameter)

**Mitigation:**
- Parameter is optional
- Default behavior if not provided
- All callers updated in same phase

---

## Files to Modify

### Phase 1: Template Variety
1. `lib/maya/blueprint-photoshoot-templates.ts` - Add new template variations (additive only, no restructuring)
2. `app/api/feed/create-manual/route.ts` - Add rotation logic
3. `app/api/feed/[feedId]/generate-single/route.ts` - Use stored variation key
4. `scripts/migrations/add-template-variation-to-feed-layouts.sql` - New migration

### Phase 2: Category Selection
1. `components/feed-planner/feed-style-modal.tsx` - Add category UI
2. `app/api/feed/create-manual/route.ts` - Save category
3. `app/api/feed/[feedId]/generate-single/route.ts` - Use feed category
4. `scripts/migrations/add-feed-category-to-feed-layouts.sql` - New migration

### Phase 3: Fashion Style
1. `lib/feed-planner/build-single-image-prompt.ts` - Add fashion style parameter
2. `app/api/feed/create-manual/route.ts` - Pass fashion style
3. `app/api/feed/[feedId]/generate-single/route.ts` - Pass fashion style

---

## Dependencies Map

### Critical Dependencies
```
getBlueprintPhotoshootPrompt()
├── app/api/feed/create-manual/route.ts
├── app/api/feed/[feedId]/generate-single/route.ts
└── lib/feed-planner/orchestrator.ts

buildSingleImagePrompt()
├── app/api/feed/create-manual/route.ts
└── app/api/feed/[feedId]/generate-single/route.ts
```

### Files That Import Templates
- `app/api/feed/create-manual/route.ts`
- `app/api/feed/[feedId]/generate-single/route.ts`
- `app/api/feed/create-free-example/route.ts`
- `app/api/feed/[feedId]/regenerate-post/route.ts`
- `lib/feed-planner/orchestrator.ts`

**Action Required:**
- Update all importers to handle new template structure
- Or provide backward-compatible wrapper

---

## Risk Assessment

### High Risk
1. ~~**Template Structure Change** (Phase 1)~~ ✅ **REMOVED - No longer needed!**
   - ~~**Risk**: Breaking existing template lookups~~
   - ✅ **New Approach**: Additive templates only, no structure change
   - ✅ **Risk Level**: Low (just adding new keys to existing object)

2. **Fashion Style Outfit Modification** (Phase 3)
   - **Risk**: Complex logic, may break prompts
   - **Mitigation**: Start with simple adjustments, test thoroughly
   - **Testing**: Verify outfit descriptions are appropriate

### Medium Risk
1. **Category Selection UI** (Phase 2)
   - **Risk**: UI changes, user confusion
   - **Mitigation**: Clear labels, default to profile category
   - **Testing**: User testing, verify UX

2. **Database Migrations** (All Phases)
   - **Risk**: Migration failures, data loss
   - **Mitigation**: Test migrations on staging, backup database
   - **Testing**: Verify migrations run successfully

### Low Risk
1. **Variation Rotation** (Phase 1)
   - **Risk**: Rotation logic may not cycle correctly
   - **Mitigation**: Test rotation with multiple feeds, verify cycling works
   - **Testing**: Verify user gets different variation each time, cycles back correctly
2. **Template Key Storage** (Phase 1)
   - **Risk**: Stored variation key may not match template
   - **Mitigation**: Store full template key, verify lookup works
   - **Testing**: Verify stored key matches template content

2. **Category Storage** (Phase 2)
   - **Risk**: NULL values in existing feeds
   - **Mitigation**: Fallback to profile category
   - **Testing**: Verify fallback works

---

## Testing Strategy

### Unit Tests
- [ ] `getBlueprintPhotoshootPromptWithVariation()` - Test variation selection
- [ ] `buildSingleImagePrompt()` - Test fashion style integration
- [ ] Template parsing - Verify all 18 templates parse correctly

### Integration Tests
- [ ] Feed creation with variation → Verify variation stored
- [ ] Feed creation with category → Verify category stored
- [ ] Image generation → Verify correct template used
- [ ] Fashion style integration → Verify outfit adjustments

### E2E Tests
- [ ] Create Feed #1 → Generate all 9 images → Verify consistency
- [ ] Create Feed #2 with same style → Verify different images
- [ ] Create feed with category selection → Verify correct template
- [ ] User with fashion style → Verify outfit adjustments

### Backward Compatibility Tests
- [ ] Existing feeds → Verify still work
- [ ] Feeds without variation → Verify random selection
- [ ] Feeds without category → Verify profile category used
- [ ] Users without fashion style → Verify no adjustments

---

## Rollback Procedures

### Phase 1 Rollback
1. Remove new template variations (keep only original 18)
2. Remove `getBlueprintPhotoshootPromptWithRotation()` function
3. Remove rotation logic from feed creation (use base template)
4. `template_variation` column can remain (nullable, harmless)
5. ✅ **No code changes needed** - just stop using new variations

### Phase 2 Rollback
1. Remove category selection from UI
2. Restore old category selection logic (from profile only)
3. `feed_category` column can remain (nullable, harmless)

### Phase 3 Rollback
1. Remove fashion style parameter from `buildSingleImagePrompt()`
2. Restore old function signature
3. Remove fashion style reading from feed creation/generation

---

## Success Criteria

### Phase 1: Template Variety
- ✅ Users can create multiple feeds with same style and get different images
- ✅ All 9 images in a feed use the same variation
- ✅ Existing feeds continue to work

### Phase 2: Category Selection
- ✅ Users can select category per feed
- ✅ Category selection works independently of profile settings
- ✅ Existing feeds continue to work (use profile category)

### Phase 3: Fashion Style
- ✅ User's fashion preferences influence outfit descriptions
- ✅ Outfit adjustments are appropriate for selected fashion style
- ✅ Users without fashion style get default outfits (backward compatible)

---

## Implementation Timeline

### Day 1: Phase 1 (Template Variety)
- Morning: Restructure templates, add variation system
- Afternoon: Update feed creation and generation
- Evening: Testing and bug fixes

### Day 2: Phase 2 (Category Selection)
- Morning: Add category selection UI
- Afternoon: Update feed creation and generation
- Evening: Testing and bug fixes

### Day 3: Phase 3 (Fashion Style)
- Morning: Add fashion style parameter and logic
- Afternoon: Update feed creation and generation
- Evening: Testing and bug fixes

**Total Estimated Time**: 2-3 days

---

## Notes

1. **Template Creation**: Creating 3 variations for each of 18 templates = 54 templates total (18 base + 36 variations). This is a significant content creation task. Consider:
   - ✅ **Simplified Approach**: Keep existing 18 templates as-is (they're v1)
   - ✅ **Additive Only**: Just add new templates with `_v2`, `_v3` suffixes
   - ✅ **No Restructuring**: No need to change template structure
   - Creating variations incrementally (start with 2 variations per template, add more later)
   - Using AI to generate variations from base templates
   - Prioritizing popular combinations first (luxury_dark_moody, minimal_light_minimalistic, etc.)

2. **Rotation Strategy**: 
   - Track usage per user per category+mood combination
   - Select first unused variation
   - Cycle back to oldest when all used
   - Ensures users get variety without repetition

2. **Fashion Style Logic**: Outfit modification is complex. Consider:
   - Starting with simple keyword replacement
   - Using AI to generate fashion-appropriate outfit descriptions
   - Creating a mapping table for fashion style → outfit adjustments

3. **Category Mapping**: "Trendy" is not a category. Need to decide:
   - Add "trendy" as new category (requires new templates)
   - Map "trendy" to existing category (e.g., "edgy" or "warm")

4. **Performance**: Template structure change may impact:
   - Template lookup performance (minimal, nested object access is fast)
   - Memory usage (slightly higher, but negligible)

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize phases** (can implement independently)
3. **Create template variations** (content creation task)
4. **Start with Phase 1** (highest impact, lowest risk)
5. **Test thoroughly** before moving to next phase
