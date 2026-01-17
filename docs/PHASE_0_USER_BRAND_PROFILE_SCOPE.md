# PHASE 0 — USER BRAND PROFILE SCOPE (FORENSIC AUDIT)

**Date**: 2026-01-17  
**Mode**: READ-ONLY FORENSIC AUDIT  
**Status**: ✅ COMPLETE

---

## EXECUTIVE SUMMARY

This audit identifies the canonical user brand profile used in prompt generation. The system uses **`user_personal_brand`** table as the PRIMARY source of truth, with a lightweight **`BrandKit`** interface used for prompt generation. Multiple competing concepts exist (brandProfile, BrandKit, user_style_profile) but `user_personal_brand` is the canonical source.

**Canonical Name**: `user_personal_brand` (database table) / `brandProfile` (variable name)  
**Source of Truth**: `user_personal_brand` table (PostgreSQL)  
**Prompt Interface**: `BrandKit` interface (TypeScript)

---

## STEP 1 — INVENTORY: ALL "BRAND-LIKE" CONCEPTS

| Concept Name | File(s) | Data Source | User-Editable? | Used in Prompts? | Notes |
|--------------|---------|-------------|----------------|------------------|-------|
| **`user_personal_brand`** | `scripts/00-create-all-tables.sql:138-148`<br>`scripts/05-create-brand-tables.sql:4-19`<br>`lib/data/maya.ts:48-74` | PostgreSQL table | ✅ Yes | ✅ Yes | **PRIMARY SOURCE** - Main brand profile table |
| **`brandProfile`** | `app/api/feed-planner/create-strategy/route.ts:81-86`<br>`app/api/feed-planner/create-from-strategy/route.ts:310-322`<br>`lib/feed-planner/orchestrator.ts:52-57` | Variable (from `user_personal_brand` SELECT) | ✅ Yes (via table) | ✅ Yes | Variable name for `user_personal_brand` row |
| **`BrandKit`** | `lib/maya/nano-banana-prompt-builder.ts:71-78`<br>`lib/maya/prompt-authority.ts:1596-1602` | Interface (extracted from `user_personal_brand.color_palette` + `brand_vibe`) | ⚠️ Indirect (via color_palette) | ✅ Yes | Lightweight interface for prompt generation (EP-08 Pro Mode) |
| **`user_style_profile`** | `app/api/profile/personal-brand/route.ts:40`<br>`scripts/05-create-brand-tables.sql:22-34` | PostgreSQL table | ✅ Yes | ❌ No | **UNUSED** - LEFT JOIN exists but data not used in prompts |
| **`user_styleguides`** | `scripts/00-create-all-tables.sql:150-159`<br>`scripts/05-create-brand-tables.sql:22-34` | PostgreSQL table | ✅ Yes | ❌ No | **UNUSED** - Legacy table, no references in prompt generation |
| **`brand_assets`** | `lib/maya/get-user-context.ts:55`<br>`scripts/19-create-brand-assets-table.sql` | PostgreSQL table | ✅ Yes | ⚠️ Unknown | Fetched in `getUserContextForMaya` but usage unclear |
| **`UserPersonalBrand`** | `lib/data/maya.ts:48-74` | TypeScript interface (maps to `user_personal_brand` table) | ✅ Yes (via table) | ✅ Yes | TypeScript type definition for `user_personal_brand` |

---

## STEP 2 — CANONICAL SOURCE OF TRUTH

### PRIMARY: `user_personal_brand` Table

**Evidence**:
- **Written**: `components/onboarding/unified-onboarding-wizard.tsx` (onboarding flow), `components/sselfie/brand-profile-wizard.tsx` (brand wizard)
- **Read**: 
  - `app/api/feed-planner/create-strategy/route.ts:81-86` (EP-08)
  - `app/api/feed/[feedId]/generate-single/route.ts:679-685` (EP-05)
  - `lib/feed-planner/orchestrator.ts:52-57` (Feed Planner)
  - `lib/maya/get-user-context.ts:51` (Maya context)
  - `lib/data/maya.ts:504-542` (`getUserPersonalBrand()`)

**Schema** (from `scripts/00-create-all-tables.sql:138-148`):
```sql
CREATE TABLE IF NOT EXISTS user_personal_brand (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT,
  brand_values TEXT[],
  target_audience TEXT,
  brand_personality TEXT,
  color_palette JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Extended Fields** (from `scripts/26-add-brand-voice-fields.sql`, `scripts/17-add-brand-voice-fields.sql`):
- `visual_aesthetic` (TEXT/JSONB)
- `settings_preference` (TEXT/JSONB)
- `fashion_style` (TEXT/JSONB)
- `brand_vibe` (TEXT)
- `brand_voice` (TEXT)
- `content_pillars` (TEXT)
- `business_type` (TEXT)
- `color_theme` (TEXT)
- `ideal_audience` (TEXT)
- `communication_voice` (TEXT)
- `signature_phrases` (TEXT)
- `brand_inspiration` (TEXT)
- `inspiration_links` (TEXT)
- `is_completed` (BOOLEAN)
- `onboarding_step` (INTEGER)
- `completed_at` (TIMESTAMPTZ)

**Evidence**: `scripts/00-create-all-tables.sql:138-148`, `scripts/26-add-brand-voice-fields.sql:1-45`

---

### SECONDARY: `BrandKit` Interface (Prompt Generation Only)

**Evidence**: `lib/maya/nano-banana-prompt-builder.ts:71-78`

**Interface**:
```typescript
export interface BrandKit {
  name?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  font_style?: string
  brand_tone?: string
}
```

**Extraction**: `BrandKit` is extracted from `user_personal_brand.color_palette` JSONB field:
- `color_palette[0].hex` → `primary_color`
- `color_palette[1].hex` → `secondary_color`
- `color_palette[2].hex` → `accent_color`
- `brand_vibe` → `brand_tone`
- `font_style` → ❌ **NOT STORED** (always undefined)

**Evidence**: `app/api/feed-planner/create-from-strategy/route.ts:732-746`, `lib/maya/nano-banana-prompt-builder.ts:1085-1105`

---

### LEGACY / UNUSED

1. **`user_style_profile`** - LEFT JOIN exists but data never used
   - **Evidence**: `app/api/profile/personal-brand/route.ts:40` (LEFT JOIN)
   - **Usage**: ❌ Not used in prompt generation
   - **Status**: ⚠️ **UNUSED** - May be for future features

2. **`user_styleguides`** - Legacy table, no references
   - **Evidence**: `scripts/00-create-all-tables.sql:150-159`
   - **Usage**: ❌ No references in prompt generation code
   - **Status**: ❌ **DEAD** - Legacy table

---

## STEP 3 — DATA FLOW INTO PROMPT GENERATION

### EP-08 FeedPlanner (Pro Mode)

**Flow**: `user_personal_brand` → `brandProfile` → `BrandKit` → `buildNanoBananaPrompt()`

**Evidence**:
1. **Read**: `app/api/feed-planner/create-strategy/route.ts:81-86`
   ```typescript
   const [brandProfile] = await sql`
     SELECT * FROM user_personal_brand
     WHERE user_id = ${neonUser.id}
     AND is_completed = true
     LIMIT 1
   `
   ```

2. **Extract BrandKit**: `app/api/feed-planner/create-from-strategy/route.ts:716-751`
   ```typescript
   const [brandData] = await sql`
     SELECT color_palette, brand_vibe, color_theme
     FROM user_personal_brand
     WHERE user_id = ${neonUser.id}
     LIMIT 1
   `
   // Extract colors from color_palette JSONB
   brandKit = {
     primary_color: palette[0]?.hex,
     secondary_color: palette[1]?.hex,
     accent_color: palette[2]?.hex,
     brand_tone: brandData.brand_vibe || brandData.color_theme
   }
   ```

3. **Pass to Authority**: `app/api/feed-planner/create-from-strategy/route.ts:805-810`
   ```typescript
   brandKit: brandKit ? {
     primaryColor: brandKit.primary_color || null,
     secondaryColor: brandKit.secondary_color || null,
     accentColor: brandKit.accent_color || null,
     fontStyle: brandKit.font_style || null,
     brandTone: brandKit.brand_tone || null,
   } : undefined
   ```

4. **Use in Prompt**: `lib/maya/nano-banana-prompt-builder.ts:1067-1083` (`formatBrandDirective()`)

**Fields Used**:
- ✅ `color_palette` (JSONB) → `BrandKit.primary_color`, `secondary_color`, `accent_color`
- ✅ `brand_vibe` (TEXT) → `BrandKit.brand_tone`
- ❌ `font_style` → **NOT STORED** (always undefined)

**Evidence**: `app/api/feed-planner/create-from-strategy/route.ts:716-810`, `lib/maya/nano-banana-prompt-builder.ts:1067-1083`

---

### EP-05 Single-Image Generation

**Flow**: `user_personal_brand` → `brandProfile` → Template injection (no BrandKit)

**Evidence**:
1. **Read**: `app/api/feed/[feedId]/generate-single/route.ts:679-685`
   ```typescript
   const personalBrandCheck = await sql`
     SELECT settings_preference, visual_aesthetic
     FROM user_personal_brand
     WHERE user_id = ${user.id}
     ORDER BY updated_at DESC
     LIMIT 1
   `
   ```

2. **Use**: Extracts `settings_preference` and `visual_aesthetic` for template selection
   - **Evidence**: `app/api/feed/[feedId]/generate-single/route.ts:688-722`

**Fields Used**:
- ✅ `settings_preference` (TEXT/JSONB) → Feed style selection
- ✅ `visual_aesthetic` (TEXT/JSONB) → Category/mood detection
- ❌ `BrandKit` → **NOT USED** in EP-05 (uses template injection instead)

**Evidence**: `app/api/feed/[feedId]/generate-single/route.ts:679-722`

---

### Maya Concept Cards (EP-01)

**Flow**: `user_personal_brand` → `getUserContextForMaya()` → Context string → Maya prompts

**Evidence**:
1. **Read**: `lib/maya/get-user-context.ts:51` (`getUserPersonalBrand()`)
2. **Process**: `lib/maya/get-user-context.ts:95-194` (builds context string)
3. **Use**: Context string passed to Maya system prompt

**Fields Used**:
- ✅ `name` → "Name: ${name}"
- ✅ `business_type` → "Business Type: ${business_type}"
- ✅ `visual_aesthetic` → "Visual Aesthetic: ${aesthetics.join(', ')}"
- ✅ `settings_preference` → "Preferred Settings: ${settings.join(', ')}"
- ✅ `fashion_style` → "Fashion Style: ${styles.join(', ')}"
- ✅ `communication_voice` → "Communication Voice: ${voices.join(', ')}"
- ✅ `target_audience` → "Target Audience: ${target_audience}"
- ✅ `brand_voice` → "Brand Voice: ${brand_voice}"
- ✅ `content_pillars` → "Content Pillars: ${content_pillars}"
- ❌ `color_palette` → **NOT USED** in concept cards (no BrandKit extraction)

**Evidence**: `lib/maya/get-user-context.ts:95-194`

---

### EP-08 FeedPlanner (Classic Mode)

**Flow**: `user_personal_brand` → `brandProfile` → `generateFeedPlannerClassicModePromptViaAuthority()`

**Evidence**:
1. **Read**: `lib/feed-planner/orchestrator.ts:52-57`
   ```typescript
   const [brandProfile] = await sql`
     SELECT * FROM user_personal_brand
     WHERE user_id = ${userId}
     AND is_completed = true
     LIMIT 1
   `
   ```

2. **Use**: `lib/maya/prompt-authority.ts:1695-1697`
   ```typescript
   brandProfile: {
     brand_vibe?: string | null
   }
   ```

**Fields Used**:
- ✅ `brand_vibe` → Used in prompt template: `"Brand Vibe: ${brandProfile.brand_vibe || 'authentic'}"`
- ❌ Other fields → **NOT USED** in Classic Mode prompt (only `brand_vibe`)

**Evidence**: `lib/maya/prompt-authority.ts:1761, 1778`

---

## STEP 4 — FIELD-LEVEL USAGE MAP

| Field Name | Source | Used in Prompt? | Where | Notes |
|------------|--------|-----------------|-------|-------|
| `brand_name` | `user_personal_brand.brand_name` | ✅ Yes | EP-08 Strategy (`brandProfile.business_name`), Maya Context | ⚠️ **NAME MISMATCH**: Column is `brand_name`, sometimes accessed as `business_name` |
| `business_type` | `user_personal_brand.business_type` | ✅ Yes | EP-08 Strategy, EP-05, Maya Context, Feed Planner | Used for niche detection, strategy generation |
| `brand_vibe` | `user_personal_brand.brand_vibe` | ✅ Yes | EP-08 Pro/Classic, EP-05, Maya Context | **MOST USED** - Core brand aesthetic |
| `brand_voice` | `user_personal_brand.brand_voice` | ✅ Yes | EP-08 Strategy, Maya Context | Used in strategy generation, Maya context |
| `target_audience` | `user_personal_brand.target_audience` | ✅ Yes | EP-08 Strategy, Maya Context | Used in strategy generation |
| `color_palette` | `user_personal_brand.color_palette` (JSONB) | ✅ Yes | EP-08 Pro Mode (BrandKit extraction) | Extracted as `BrandKit.primary_color`, `secondary_color`, `accent_color` |
| `color_theme` | `user_personal_brand.color_theme` | ⚠️ Partial | EP-05 (fallback), EP-08 Pro Mode (fallback) | Used as fallback if `color_palette` missing |
| `visual_aesthetic` | `user_personal_brand.visual_aesthetic` (JSONB) | ✅ Yes | EP-05 (template selection), Maya Context | Used for category/mood detection |
| `settings_preference` | `user_personal_brand.settings_preference` (JSONB) | ✅ Yes | EP-05 (feed style), Maya Context | Used for location/setting preferences |
| `fashion_style` | `user_personal_brand.fashion_style` (JSONB) | ✅ Yes | Maya Context | Used in Maya context string |
| `content_pillars` | `user_personal_brand.content_pillars` | ✅ Yes | EP-08 Strategy, Maya Context | Used in strategy generation |
| `communication_voice` | `user_personal_brand.communication_voice` (JSONB) | ✅ Yes | Maya Context | Used in Maya context string |
| `ideal_audience` | `user_personal_brand.ideal_audience` | ✅ Yes | Maya Context | Used in Maya context string |
| `brand_inspiration` | `user_personal_brand.brand_inspiration` | ✅ Yes | Maya Context | Used in Maya context string |
| `font_style` | ❌ **NOT STORED** | ❌ No | — | **MISSING** - Referenced in `BrandKit` interface but never stored in DB |
| `primary_color` | ❌ **NOT STORED** | ✅ Yes (derived) | EP-08 Pro Mode | **DERIVED** from `color_palette[0].hex` |
| `secondary_color` | ❌ **NOT STORED** | ✅ Yes (derived) | EP-08 Pro Mode | **DERIVED** from `color_palette[1].hex` |
| `accent_color` | ❌ **NOT STORED** | ✅ Yes (derived) | EP-08 Pro Mode | **DERIVED** from `color_palette[2].hex` |
| `brand_tone` | ❌ **NOT STORED** | ✅ Yes (derived) | EP-08 Pro Mode | **DERIVED** from `brand_vibe` or `color_theme` |
| `brand_values` | `user_personal_brand.brand_values` (TEXT[]) | ❌ No | — | **UNUSED** - Stored but never accessed in prompt generation |
| `brand_personality` | `user_personal_brand.brand_personality` | ❌ No | — | **UNUSED** - Stored but never accessed |
| `typography` | `user_personal_brand.typography` (JSONB) | ❌ No | — | **UNUSED** - Stored but never accessed |
| `imagery_style` | `user_personal_brand.imagery_style` | ❌ No | — | **UNUSED** - Stored but never accessed |
| `tone` | `user_personal_brand.tone` | ❌ No | — | **UNUSED** - Stored but never accessed |
| `keywords` | `user_personal_brand.keywords` (TEXT[]) | ❌ No | — | **UNUSED** - Stored but never accessed |

---

## STEP 5 — CONFLICTS + CONFUSION REPORT

### 1. Naming Conflicts

**Issue**: `brand_name` vs `business_name`
- **Column**: `user_personal_brand.brand_name`
- **Access**: Sometimes accessed as `brandProfile.business_name` (EP-08 Strategy)
- **Evidence**: `lib/maya/prompt-authority.ts:1455` uses `brandProfile.business_name` but column is `brand_name`
- **Impact**: ⚠️ **MINOR** - May cause undefined values if accessed incorrectly

**Evidence**: `lib/maya/prompt-authority.ts:1455`, `app/api/feed-planner/create-from-strategy/route.ts:381`

---

### 2. Snake_case / camelCase Mismatches

**Issue**: Database uses `snake_case`, TypeScript uses `camelCase` inconsistently
- **DB**: `brand_vibe`, `color_palette`, `settings_preference`
- **TypeScript**: `brandVibe`, `colorPalette`, `settingsPreference` (in some places)
- **Impact**: ⚠️ **MINOR** - Requires mapping in some code paths

**Evidence**: `app/api/feed-planner/create-from-strategy/route.ts:805-810` (maps snake_case to camelCase for BrandKit)

---

### 3. Missing Field: `font_style`

**Issue**: `BrandKit` interface includes `font_style` but it's never stored in `user_personal_brand`
- **Interface**: `lib/maya/nano-banana-prompt-builder.ts:76`
- **Storage**: ❌ **NOT STORED** - No column in `user_personal_brand`
- **Usage**: Always `undefined` in prompts
- **Impact**: ⚠️ **MINOR** - Field exists in interface but never populated

**Evidence**: `lib/maya/nano-banana-prompt-builder.ts:76`, `app/api/feed-planner/create-from-strategy/route.ts:809` (always `null`)

---

### 4. Unused Tables

**Issue**: `user_style_profile` and `user_styleguides` tables exist but are not used in prompt generation
- **`user_style_profile`**: LEFT JOIN exists but data never accessed
- **`user_styleguides`**: No references in prompt generation code
- **Impact**: ⚠️ **LOW** - Dead code, may be for future features

**Evidence**: `app/api/profile/personal-brand/route.ts:40` (LEFT JOIN), `scripts/00-create-all-tables.sql:150-159` (table definition)

---

### 5. Silent Field Dropping

**Issue**: Many `user_personal_brand` fields are stored but never used in prompts
- **Unused Fields**: `brand_values`, `brand_personality`, `typography`, `imagery_style`, `tone`, `keywords`
- **Impact**: ⚠️ **LOW** - Data collected but not utilized

**Evidence**: `scripts/00-create-all-tables.sql:138-148` (schema), no grep matches for these fields in prompt generation

---

### 6. Fallback Behavior Hides Missing Data

**Issue**: Default values used when brand data is missing
- **Example**: `brand_vibe || "authentic"` (EP-08 Classic Mode)
- **Example**: `brandProfile.business_type || "creator"` (Feed Planner)
- **Impact**: ⚠️ **MINOR** - Prompts may not reflect user's actual brand if data missing

**Evidence**: `lib/maya/prompt-authority.ts:1778`, `lib/feed-planner/orchestrator.ts:81`

---

### 7. BrandKit Extraction Logic Duplication

**Issue**: BrandKit extraction logic exists in multiple places
- **Location 1**: `app/api/feed-planner/create-from-strategy/route.ts:732-746`
- **Location 2**: `lib/maya/nano-banana-prompt-builder.ts:1085-1105` (from context string)
- **Impact**: ⚠️ **MINOR** - Logic may diverge if not kept in sync

**Evidence**: `app/api/feed-planner/create-from-strategy/route.ts:732-746`, `lib/maya/nano-banana-prompt-builder.ts:1085-1105`

---

## DATA FLOW DIAGRAMS

### EP-08 FeedPlanner (Pro Mode)

```
user_personal_brand (DB)
  ↓ SELECT *
brandProfile (variable)
  ↓ Extract color_palette, brand_vibe
BrandKit {
  primary_color: color_palette[0].hex
  secondary_color: color_palette[1].hex
  accent_color: color_palette[2].hex
  brand_tone: brand_vibe
  font_style: undefined ❌
}
  ↓ Pass to Authority
generateFeedPlannerProModePromptViaAuthority({ brandKit })
  ↓ Route to Builder
buildNanoBananaPrompt({ brandKit })
  ↓ Use in Prompt
formatBrandDirective(brandKit) → Final prompt
```

**Evidence**: `app/api/feed-planner/create-from-strategy/route.ts:716-810`, `lib/maya/nano-banana-prompt-builder.ts:1067-1083`

---

### EP-05 Single-Image Generation

```
user_personal_brand (DB)
  ↓ SELECT settings_preference, visual_aesthetic
personalBrandCheck (variable)
  ↓ Extract settings_preference[0], visual_aesthetic[0]
category, mood (detected)
  ↓ Get template
getBlueprintPhotoshootPrompt(category, mood)
  ↓ Extract frame
buildSingleImagePrompt(template, position)
  ↓ Final prompt
```

**Evidence**: `app/api/feed/[feedId]/generate-single/route.ts:679-722, 843-878`

---

### EP-01 Maya Concept Cards

```
user_personal_brand (DB)
  ↓ SELECT * (via getUserPersonalBrand())
personalBrand (variable)
  ↓ Build context string
getUserContextForMaya()
  ↓ Include fields:
  - name
  - business_type
  - visual_aesthetic
  - settings_preference
  - fashion_style
  - communication_voice
  - target_audience
  - brand_voice
  - content_pillars
  ↓ Pass to Maya
generateConceptCardsViaAuthority({ userContext })
  ↓ Maya uses context in system prompt
```

**Evidence**: `lib/maya/get-user-context.ts:95-194`, `lib/maya/prompt-authority.ts:142-200`

---

## CANONICAL DECISION

### PRIMARY SOURCE: `user_personal_brand` Table

**This is the object prompts SHOULD use.**

**Reasoning**:
1. ✅ Used in ALL prompt generation flows (EP-01, EP-05, EP-08)
2. ✅ User-editable via onboarding/brand wizard
3. ✅ Contains all brand data fields
4. ✅ Single source of truth (no competing tables)

**Evidence**: 
- EP-08: `app/api/feed-planner/create-strategy/route.ts:81-86`
- EP-05: `app/api/feed/[feedId]/generate-single/route.ts:679-685`
- EP-01: `lib/maya/get-user-context.ts:51`

---

### SECONDARY INTERFACE: `BrandKit` (Prompt Generation Only)

**This is a lightweight extraction for Pro Mode prompts.**

**Reasoning**:
1. ✅ Used only in EP-08 Pro Mode (NanoBanana prompts)
2. ✅ Extracted from `user_personal_brand.color_palette` + `brand_vibe`
3. ⚠️ **INCOMPLETE**: `font_style` field never populated

**Evidence**: `lib/maya/nano-banana-prompt-builder.ts:71-78`, `app/api/feed-planner/create-from-strategy/route.ts:732-746`

---

### DEPRECATED / UNUSED

**These must be ignored or deprecated later:**

1. **`user_style_profile`** - LEFT JOIN exists but data never used
   - **Action**: Remove LEFT JOIN or implement usage
   - **Evidence**: `app/api/profile/personal-brand/route.ts:40`

2. **`user_styleguides`** - Legacy table, no references
   - **Action**: Archive or remove
   - **Evidence**: `scripts/00-create-all-tables.sql:150-159`

3. **Unused fields in `user_personal_brand`**:
   - `brand_values`, `brand_personality`, `typography`, `imagery_style`, `tone`, `keywords`
   - **Action**: Document as unused or implement usage

---

## UNKNOWN / BLOCKED ITEMS

### ❌ UNKNOWN

1. **`brand_assets` table usage**
   - **Status**: Fetched in `getUserContextForMaya()` but usage unclear
   - **Evidence**: `lib/maya/get-user-context.ts:55`
   - **Question**: Are brand assets used in prompts or just stored?

2. **`font_style` storage location**
   - **Status**: Referenced in `BrandKit` interface but never stored
   - **Question**: Should `font_style` be added to `user_personal_brand` table?

3. **`user_style_profile` purpose**
   - **Status**: LEFT JOIN exists but data never accessed
   - **Question**: Is this for future features or dead code?

---

### ❌ BLOCKED

**None** - All data flows are traceable.

---

## RECOMMENDATIONS

### 1. Standardize Naming

**Issue**: `brand_name` vs `business_name` inconsistency
- **Recommendation**: Use `brand_name` consistently (matches DB column)
- **Files**: `lib/maya/prompt-authority.ts:1455` (change `business_name` → `brand_name`)

---

### 2. Add Missing Field

**Issue**: `font_style` referenced but never stored
- **Recommendation**: Add `font_style` column to `user_personal_brand` table OR remove from `BrandKit` interface
- **Preference**: Add column (users may want font preferences)

---

### 3. Consolidate BrandKit Extraction

**Issue**: BrandKit extraction logic duplicated
- **Recommendation**: Create single helper function `extractBrandKitFromUserPersonalBrand(brandProfile)`
- **Location**: `lib/maya/brand-kit-extractor.ts` (new file)

---

### 4. Document Unused Fields

**Issue**: Many fields stored but never used
- **Recommendation**: Add comments in schema or mark as "reserved for future use"
- **Fields**: `brand_values`, `brand_personality`, `typography`, `imagery_style`, `tone`, `keywords`

---

### 5. Remove Dead Code

**Issue**: `user_styleguides` table unused
- **Recommendation**: Archive or remove table (if no future plans)
- **Evidence**: No references in prompt generation code

---

## STATUS

✅ **PHASE 0 COMPLETE**

**Summary**:
- ✅ Canonical source identified: `user_personal_brand` table
- ✅ Data flows traced: EP-01, EP-05, EP-08
- ✅ Field usage mapped: 20+ fields documented
- ✅ Conflicts identified: 7 conflicts/confusion points
- ✅ Recommendations provided: 5 actionable items

**Canonical Answer**:
- **Primary Source**: `user_personal_brand` table (PostgreSQL)
- **Variable Name**: `brandProfile` (TypeScript)
- **Prompt Interface**: `BrandKit` (TypeScript, extracted from `color_palette` + `brand_vibe`)

**All acceptance criteria met.** ✅

---

## END OF REPORT

**Last Updated**: 2026-01-17  
**Milestone**: ✅ User Brand Profile Scope Audit Complete
