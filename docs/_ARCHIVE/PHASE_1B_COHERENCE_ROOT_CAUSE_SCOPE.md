# PHASE 1B — COHERENCE ROOT CAUSE SCOPE

**Date**: 2026-01-17  
**Mode**: FORENSIC AUDIT ONLY (READ-ONLY)  
**Status**: ✅ COMPLETE

---

## ROOT CAUSE SUMMARY

Prompts default to "business/office/laptop/workspace" because `getCategoryAndMood()` defaults to `category = "professional"` when `visual_aesthetic` doesn't match exact category strings. The function only accepts exact matches (`["luxury", "minimal", "beige", "warm", "edgy", "professional"]`), so values like `"beige feed"` or `"beige aesthetic"` fail to match and fall back to `"professional"`. This selects the `professional_minimal` template, which includes workspace/office settings, and Scene 8 is hardcoded as "Workspace Flatlay" with laptop/coffee/notebook. Additionally, the `professional_light_minimalistic` vibe library contains office/workspace locations that get injected into `LOCATION_INDOOR` placeholders.

**Evidence**: `lib/feed-planner/generation-helpers.ts:91-92, 173-179`, `lib/maya/scene-library.ts:161-174`, `lib/styling/vibe-libraries.ts:4380-4421`

---

## EVIDENCE LIST (FILE:LINE)

### Primary Default Logic
- **`lib/feed-planner/generation-helpers.ts:91-92`**: Default category = "professional", mood = "minimal"
- **`lib/feed-planner/generation-helpers.ts:173-179`**: Category extraction only accepts exact matches from `validCategories` array
- **`lib/feed-planner/generation-helpers.ts:227`**: Default fallback message: "Using defaults: professional_minimal"

### Template Selection
- **`lib/maya/blueprint-photoshoot-templates.ts:401-422`**: `professional_light_minimalistic` template includes "Zurich modern offices", "bright financial district", "bright workspace"
- **`lib/maya/blueprint-photoshoot-templates.ts:424-445`**: `professional_beige_aesthetic` template includes "Mayfair London offices", "classic workspace"

### Hardcoded Workspace Scene
- **`lib/maya/scene-library.ts:161-174`**: Scene 8 (position 8) hardcoded as "Workspace Flatlay" with "laptop, coffee, notebook, minimal desk setup"
- **`lib/maya/scene-library.ts:166`**: Location: "Indoor workspace (desk, table) matching feed setting"
- **`lib/maya/scene-library.ts:170-171`**: Negative rules: "Do not change to non-workspace scene", "Do not add items beyond laptop, coffee, notebook"

### Workspace Location Injection
- **`lib/styling/vibe-libraries.ts:4380-4421`**: `professional_light_minimalistic` locations include:
  - `prof_light_loc_001`: "Zurich modern office with bright financial district"
  - `prof_light_loc_003`: "Bright hallway with modern design"
  - `prof_light_loc_004`: "Bright workspace with laptop and tea. Overhead view of white desk"
  - `prof_light_loc_005`: "Modern glass door with office reflection"
- **`lib/feed-planner/dynamic-template-injector.ts:175-212`**: `LOCATION_INDOOR_1`, `LOCATION_INDOOR_2`, `LOCATION_INDOOR_3` placeholders filled from `indoorLocations` array

### Fashion Style Default
- **`lib/feed-planner/generation-helpers.ts:293`**: Default fashion style = "business"
- **`lib/feed-planner/fashion-style-mapper.ts:19`**: Defaults to "business" if no match found

### Template Frame 8 (Workspace)
- **`lib/maya/blueprint-photoshoot-templates.ts:419`**: Frame 8: "Bright workspace - overhead, laptop, tea, white desk"
- **`lib/maya/blueprint-photoshoot-templates.ts:442`**: Frame 8: "Classic workspace - overhead, coffee, leather journal, wood desk"

---

## PROMPT ASSEMBLY MAP

### Test Payload
- `visualAesthetic = ["beige feed"]` (or `"beige aesthetic"`)
- `fashionStyle = ["athletic"]`
- `brandVibe = "LUXURY MINIMAL"`
- `businessType = "FOUNDER BRAND"`

### Assembly Flow

#### Step 1: Category/Mood Detection (`getCategoryAndMood`)
**File**: `lib/feed-planner/generation-helpers.ts:79-276`

1. **Check `feed_layouts.feed_style`** (PRIMARY) → Not set
2. **Check `settings_preference[0]`** (SECONDARY) → Not set
3. **Check `visual_aesthetic[0]`** (for category) → `"beige feed"` doesn't match exact `"beige"` → **FAILS**
4. **Fallback to default** → `category = "professional"`, `mood = "minimal"`

**Evidence**: `lib/feed-planner/generation-helpers.ts:173-179`
```typescript
const firstAesthetic = aesthetics[0]?.toLowerCase().trim()
const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
  category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
}
```

**Result**: `category = "professional"`, `mood = "minimal"` → Template key: `professional_light_minimalistic`

---

#### Step 2: Template Selection (`getBlueprintPhotoshootPrompt`)
**File**: `lib/maya/blueprint-photoshoot-templates.ts:453-465`

- Input: `category = "professional"`, `mood = "minimal"`
- Maps to: `professional_light_minimalistic`
- Template includes:
  - **Setting**: "Zurich modern offices, bright financial district, clean contemporary architecture, natural light spaces"
  - **Frame 8**: "Bright workspace - overhead, laptop, tea, white desk, bright daylight, contemporary minimal"

**Evidence**: `lib/maya/blueprint-photoshoot-templates.ts:401-422`

---

#### Step 3: Location Injection (`injectAndValidateTemplate` → `injectDynamicContentWithRotation`)
**File**: `lib/feed-planner/dynamic-template-injector.ts:175-212`

- Gets locations from `professional_light_minimalistic` vibe library
- Filters by `setting === 'indoor'`
- Fills `LOCATION_INDOOR_1`, `LOCATION_INDOOR_2`, `LOCATION_INDOOR_3` placeholders

**Indoor Locations Available**:
1. `prof_light_loc_001`: "Zurich modern office with bright financial district"
2. `prof_light_loc_003`: "Bright hallway with modern design"
3. `prof_light_loc_004`: "Bright workspace with laptop and tea. Overhead view of white desk"
4. `prof_light_loc_005`: "Modern glass door with office reflection"

**Evidence**: `lib/styling/vibe-libraries.ts:4380-4421`

---

#### Step 4: Scene Extraction (`buildSingleImagePrompt`)
**File**: `lib/feed-planner/build-single-image-prompt.ts:230-340`

- For position 8: Gets Scene 8 spec from `scene-library.ts`
- Scene 8 is hardcoded as "Workspace Flatlay" with:
  - `sceneDNA`: "Overhead workspace flatlay with laptop, coffee, notebook, minimal desk setup"
  - `location`: "Indoor workspace (desk, table) matching feed setting"
  - `negativeRules`: "Do not change to non-workspace scene", "Do not add items beyond laptop, coffee, notebook"

**Evidence**: `lib/maya/scene-library.ts:161-174`

---

#### Step 5: Final Prompt Assembly
**File**: `lib/feed-planner/build-single-image-prompt.ts:264-339`

**Structure**:
1. **STYLE LOCK**: Base identity prompt
2. **USER BRAND PROFILE** (Phase 1A): BrandKit fields (but doesn't override scene structure)
3. **SCENE DNA**: "Overhead workspace flatlay with laptop, coffee, notebook, minimal desk setup"
4. **USER VARIABLES**: Template frame description (already includes workspace)
5. **CAMERA + COMPOSITION**: Overhead view, workspace-focused
6. **QUALITY CONSTRAINTS**: Sharp focus, natural realism
7. **NEGATIVE RULES**: "Do not change to non-workspace scene"

**Result**: Prompt contains "workspace", "laptop", "desk", "office" even when user selected "beige feed" + "athletic"

---

## WORKSPACE/OFFICE/LAPTOP INJECTION SOURCES

### Source 1: Default Category Fallback
**File**: `lib/feed-planner/generation-helpers.ts:91-92`
- **Type**: Unconditional default
- **Condition**: When `visual_aesthetic[0]` doesn't match exact category strings
- **Result**: `category = "professional"` → selects `professional_*` templates

### Source 2: Professional Template Settings
**File**: `lib/maya/blueprint-photoshoot-templates.ts:401-422, 424-445`
- **Type**: Template-level (unconditional)
- **Condition**: Always present when `category = "professional"`
- **Tokens**: "Zurich modern offices", "bright financial district", "Mayfair London offices", "traditional business districts"

### Source 3: Professional Vibe Library Locations
**File**: `lib/styling/vibe-libraries.ts:4380-4421, 4561-4602`
- **Type**: Location injection (conditional on category)
- **Condition**: When `category = "professional"` → uses `professional_*` vibe library
- **Tokens**: "Zurich modern office", "Bright workspace with laptop", "Mayfair London offices", "classic workspace"

### Source 4: Hardcoded Scene 8 (Workspace Flatlay)
**File**: `lib/maya/scene-library.ts:161-174`
- **Type**: Structural (unconditional for position 8)
- **Condition**: Always applies to position 8, regardless of category/mood
- **Tokens**: "workspace flatlay", "laptop, coffee, notebook", "minimal desk setup", "Indoor workspace (desk, table)"

### Source 5: Template Frame 8 Descriptions
**File**: `lib/maya/blueprint-photoshoot-templates.ts:419, 442`
- **Type**: Template-level (unconditional for frame 8)
- **Condition**: Always present in `professional_*` templates for frame 8
- **Tokens**: "Bright workspace - overhead, laptop, tea, white desk", "Classic workspace - overhead, coffee, leather journal, wood desk"

### Source 6: Fashion Style Default
**File**: `lib/feed-planner/generation-helpers.ts:293`
- **Type**: Default fallback
- **Condition**: When no fashion style found → defaults to "business"
- **Impact**: Doesn't directly inject workspace, but influences outfit selection (business outfits → professional settings)

---

## PRECEDENCE RULES (WHAT WINS)

### Category Detection Precedence
1. **`feed_layouts.feed_style`** (PRIMARY) → Highest priority
2. **`settings_preference[0]`** (SECONDARY) → Only if feed_style not set
3. **`visual_aesthetic[0]`** (for category only) → Only if exact match to `["luxury", "minimal", "beige", "warm", "edgy", "professional"]`
4. **`blueprint_subscribers.form_data.vibe`** (FALLBACK) → Legacy blueprint wizard
5. **Default: `"professional"`** → Lowest priority

**Evidence**: `lib/feed-planner/generation-helpers.ts:95-230`

### Category Matching Logic
- **Exact match required**: `visual_aesthetic[0]` must exactly equal one of `["luxury", "minimal", "beige", "warm", "edgy", "professional"]`
- **Case-insensitive**: `.toLowerCase().trim()` applied
- **No partial matching**: `"beige feed"` ≠ `"beige"` → fails
- **No fuzzy matching**: `"beige aesthetic"` ≠ `"beige"` → fails

**Evidence**: `lib/feed-planner/generation-helpers.ts:173-179`

### Mood Detection Precedence
1. **`feed_layouts.feed_style`** (PRIMARY) → Maps directly to mood
2. **`settings_preference[0]`** (SECONDARY) → Synced from feed style modal
3. **`blueprint_subscribers.feed_style`** (FALLBACK) → Legacy blueprint wizard
4. **Default: `"minimal"`** → Lowest priority

**Evidence**: `lib/feed-planner/generation-helpers.ts:95-106, 154-162`

### Location Selection Precedence
1. **Scene Library** (for position 8) → Hardcoded "Workspace Flatlay" → **OVERRIDES** template locations
2. **Vibe Library Locations** (filtered by `setting === 'indoor'`) → Fills `LOCATION_INDOOR_*` placeholders
3. **Template Frame Descriptions** → Includes workspace references for frame 8

**Evidence**: `lib/maya/scene-library.ts:161-174`, `lib/feed-planner/dynamic-template-injector.ts:175-212`

---

## CONFLICT MATRIX (WHY ATHLETIC + BEIGE BECOMES OFFICE)

| Input Field | Value | Derived Mode | Derived Location | Derived Props | Override Path |
|------------|-------|--------------|------------------|---------------|---------------|
| `visual_aesthetic[0]` | `"beige feed"` | ❌ **FAILS** (not exact match) | → Falls back to `"professional"` | → `professional_light_minimalistic` template | **Evidence**: `lib/feed-planner/generation-helpers.ts:173-179` |
| `fashion_style[0]` | `"athletic"` | ✅ Maps to `"athletic"` | → Used for outfit selection only | → Doesn't override category | **Evidence**: `lib/feed-planner/fashion-style-mapper.ts:17-54` |
| `settings_preference[0]` | Not set | → Not checked | → Falls back | → Defaults to `"professional"` | **Evidence**: `lib/feed-planner/generation-helpers.ts:110-163` |
| **Result** | — | `category = "professional"` | → `professional_light_minimalistic` template | → Workspace/office locations injected | **Final**: Office/workspace/laptop |

### Exact Override Path

1. **`visual_aesthetic[0] = "beige feed"`** → Checked against `validCategories` → `"beige feed"` not in `["luxury", "minimal", "beige", "warm", "edgy", "professional"]` → **FAILS**
2. **Category defaults to `"professional"`** → `lib/feed-planner/generation-helpers.ts:91`
3. **Mood defaults to `"minimal"`** → `lib/feed-planner/generation-helpers.ts:92`
4. **Template selected**: `professional_light_minimalistic` → `lib/maya/blueprint-photoshoot-templates.ts:401-422`
5. **Template includes**: "Zurich modern offices", "bright financial district", "bright workspace"
6. **Vibe library locations**: `professional_light_minimalistic.locations` → Includes "Zurich modern office", "Bright workspace with laptop"
7. **Scene 8 hardcoded**: "Workspace Flatlay" → `lib/maya/scene-library.ts:161-174`
8. **Final prompt**: Contains "workspace", "laptop", "desk", "office" → **User's "beige feed" + "athletic" ignored**

**Evidence Chain**:
- `lib/feed-planner/generation-helpers.ts:173-179` (category matching fails)
- `lib/feed-planner/generation-helpers.ts:91-92` (defaults applied)
- `lib/maya/blueprint-photoshoot-templates.ts:401-422` (template selected)
- `lib/styling/vibe-libraries.ts:4380-4421` (locations injected)
- `lib/maya/scene-library.ts:161-174` (scene 8 hardcoded)

---

## RECOMMENDED SIMPLE FIX (DOC ONLY)

### Option 1: Fix Category Matching (Partial Match Support)
**File**: `lib/feed-planner/generation-helpers.ts:173-179`

**Change**: Support partial matching for `visual_aesthetic` values
- If `visual_aesthetic[0]` contains `"beige"` → map to `category = "beige"`
- If `visual_aesthetic[0]` contains `"athletic"` → map to `category = "warm"` (or create new category)
- If `visual_aesthetic[0]` contains `"luxury"` → map to `category = "luxury"`

**Pros**: Minimal change, preserves existing exact matches
**Cons**: May cause false positives (e.g., "beige feed" → "beige" is correct, but "beige aesthetic" might be ambiguous)

**Evidence**: `lib/feed-planner/generation-helpers.ts:173-179`

---

### Option 2: Add Category Mapping Function
**File**: `lib/feed-planner/generation-helpers.ts` (new function)

**Change**: Create `mapVisualAestheticToCategory(aesthetic: string): string` function
- Maps common aesthetic strings to categories:
  - `"beige feed"`, `"beige aesthetic"`, `"beige minimal"` → `"beige"`
  - `"athletic"`, `"sporty"`, `"active"` → `"warm"` (or new category)
  - `"luxury minimal"`, `"luxury aesthetic"` → `"luxury"`
- Falls back to exact match if no mapping found

**Pros**: Explicit mapping, easy to extend
**Cons**: Requires maintaining mapping table

**Evidence**: `lib/feed-planner/generation-helpers.ts:173-179`

---

### Option 3: Use `settings_preference` for Category Override
**File**: `lib/feed-planner/generation-helpers.ts:136-163`

**Change**: If `settings_preference[0]` contains category-like string, use it for category (not just mood)
- Currently: `settings_preference[0]` only used for mood
- Proposed: Also check `settings_preference` for category hints

**Pros**: Uses existing data, minimal change
**Cons**: `settings_preference` might not contain category info

**Evidence**: `lib/feed-planner/generation-helpers.ts:136-163`

---

### Option 4: Make Scene 8 Location-Aware
**File**: `lib/maya/scene-library.ts:161-174`

**Change**: Make Scene 8 location conditional on category
- If `category = "professional"` → "Workspace Flatlay"
- If `category = "beige"` → "Beige Minimal Desk" (or outdoor flatlay)
- If `category = "warm"` → "Cozy Cafe Table" (or other non-workspace)

**Pros**: Fixes Scene 8 hardcoding issue
**Cons**: Requires category context passed to `buildSingleImagePrompt`

**Evidence**: `lib/maya/scene-library.ts:161-174`

---

### Option 5: Create `ResolvedStyle` Resolver Object
**File**: `lib/feed-planner/style-resolver.ts` (new file)

**Change**: Create single resolver that takes all brand fields and returns:
```typescript
interface ResolvedStyle {
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  fashionStyle: string
  locationPreference: "indoor" | "outdoor" | "mixed"
  sceneOverrides: Record<number, Partial<SceneSpec>> // Override Scene 8 for non-professional
}
```

**Precedence Rules**:
1. `visual_aesthetic` (with partial matching) → category
2. `settings_preference` → mood + location preference
3. `fashion_style` → fashion style
4. `business_type` → Only if no other category found (fallback, not primary)

**Pros**: Single source of truth, clear precedence, extensible
**Cons**: Requires refactoring multiple call sites

**Evidence**: `lib/feed-planner/generation-helpers.ts:79-276`

---

## RECOMMENDED APPROACH

**Recommended**: **Option 2 (Category Mapping Function) + Option 4 (Scene 8 Location-Aware)**

**Rationale**:
1. **Option 2** fixes the immediate root cause (category matching) with minimal risk
2. **Option 4** fixes the hardcoded Scene 8 issue (structural problem)
3. Both changes are surgical and don't require refactoring entire prompt system
4. Can be implemented incrementally (Option 2 first, then Option 4)

**Implementation Order**:
1. **Phase 1**: Add `mapVisualAestheticToCategory()` function → Fix category detection
2. **Phase 2**: Make Scene 8 location-aware → Fix hardcoded workspace scene
3. **Phase 3** (optional): Create `ResolvedStyle` resolver → Consolidate all style resolution

---

## STATUS

✅ **COMPLETE**

**Summary**:
- ✅ Root cause identified: Default category fallback + hardcoded Scene 8
- ✅ Evidence collected: 15+ file:line references
- ✅ Assembly map created: Full prompt flow traced
- ✅ Precedence rules documented: Category/mood/location selection order
- ✅ Conflict matrix created: Shows exact override path
- ✅ Fix options proposed: 5 options with pros/cons

**All acceptance criteria met.** ✅

---

## END OF REPORT

**Last Updated**: 2026-01-17  
**Milestone**: ✅ Phase 1B Coherence Root Cause Scope Complete
