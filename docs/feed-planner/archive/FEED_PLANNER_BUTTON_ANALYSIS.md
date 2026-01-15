# Feed Planner Button Flow Analysis

## Overview
Analysis of "New Preview" and "New Feed" button flows, tracing UI → API → Prompt Templates to identify what's working and what's not.

---

## 🔵 "NEW PREVIEW" BUTTON FLOW

### UI Location
**File:** `components/feed-planner/feed-header.tsx` (line 267)
- Button text: "New Preview"
- Handler: `handleCreatePreviewFeed()`

### User Flow
1. User clicks "New Preview" button
2. Button shows loading state: "Creating..."
3. API call: `POST /api/feed/create-free-example`
4. Navigate to new feed: `/feed-planner?feedId={feedId}`
5. Toast notification: "Preview feed created"

### API Endpoint
**File:** `app/api/feed/create-free-example/route.ts`

**What it creates:**
- `feed_layouts` entry:
  - `layout_type: 'preview'`
  - `status: 'saved'`
  - `created_by: 'manual'`
  - **NO `feed_style` stored** ❌
- `feed_posts` entry:
  - **1 post** at position 1
  - `generation_status: 'pending'`
  - `generation_mode: 'pro'`
  - `prompt: {templatePrompt}` (full blueprint template)

### Template Selection Logic
**Lines 119-238 in `create-free-example/route.ts`:**

1. **PRIMARY:** Check `user_personal_brand` (unified wizard)
   - Extract `feedStyle` from `settings_preference[0]` → maps to `mood`
   - Extract `category` from `visual_aesthetic[0]`
   - Template key: `${category}_${mood}`

2. **FALLBACK:** Check `blueprint_subscribers` (legacy)
   - Extract `category` from `form_data.vibe`
   - Extract `mood` from `feed_style`
   - Template key: `${category}_${mood}`

3. **Template Source:** `BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]`
   - Example: `luxury_minimal` → `luxury_light_minimalistic`
   - Example: `minimal_luxury` → `minimal_dark_moody`

4. **Stored:** Full template prompt in `feed_posts[0].prompt`

### Intended Purpose
✅ **Create a preview feed (single 3x3 grid image) for free users**
- One post that generates a 9-frame preview grid
- Uses blueprint template library
- Free users can generate this with 2 credits

### Actual Behavior
✅ **WORKING:**
- Creates feed with `layout_type: 'preview'`
- Creates 1 post at position 1
- Stores full template prompt in `feed_posts[0].prompt`
- Template selection uses unified wizard data

❌ **ISSUES:**
1. **No `feed_style` stored in `feed_layouts`**
   - When generating position 1, template selection logic in `generate-single` will check `feed_layouts.feed_style` first, but it's NULL
   - Falls back to `user_personal_brand` (which is correct, but inconsistent)

2. **Template key mapping confusion:**
   - Code uses `mood` variable but maps to template keys like `luxury_light_minimalistic`
   - The `MOOD_MAP` in `blueprint-photoshoot-templates.ts` maps:
     - `luxury` → `dark_moody`
     - `minimal` → `light_minimalistic`
     - `beige` → `beige_aesthetic`
   - But the code constructs `${category}_${mood}` directly, which might not match template keys

3. **Category vs Mood confusion:**
   - `feedStyle` from wizard is stored as `mood` variable
   - But `visual_aesthetic` is stored as `category` variable
   - Template keys are `${category}_${mood}` where mood should be mapped via `MOOD_MAP`

---

## 🟢 "NEW FEED" BUTTON FLOW

### UI Location
**File:** `components/feed-planner/feed-header.tsx` (line 284)
- Button text: "New Feed"
- Handler: `handleCreateNewFeedClick()` → Opens `FeedStyleModal`

### User Flow
1. User clicks "New Feed" button
2. **FeedStyleModal opens** (matches unified wizard styling)
3. User selects feed style: "luxury", "minimal", or "beige"
4. Modal shows last selection as default (from `user_personal_brand.settings_preference[0]`)
5. User clicks "Create Feed"
6. API call: `POST /api/feed/create-manual` with `{ feedStyle }`
7. Navigate to new feed: `/feed-planner?feedId={feedId}`
8. Toast notification: "Feed created"

### API Endpoint
**File:** `app/api/feed/create-manual/route.ts`

**What it creates:**
- `feed_layouts` entry:
  - `layout_type: 'grid_3x4'`
  - `status: 'saved'`
  - `created_by: 'manual'`
  - **`feed_style: {feedStyle}`** ✅ (e.g., "luxury", "minimal", "beige")
- `feed_posts` entries:
  - **9 posts** at positions 1-9
  - All `generation_status: 'pending'`
  - All `prompt: NULL` ❌ (no template stored initially)

### Template Selection Logic
**NONE at creation time** - posts are created empty.

**At generation time** (`generate-single/route.ts` lines 327-450):

1. **PRIMARY:** Check `feed_layouts.feed_style` ✅
   - If set, use as `mood`
   - Example: `feed_style: "luxury"` → `mood = "luxury"`

2. **SECONDARY:** Check `user_personal_brand` (unified wizard)
   - Extract `feedStyle` from `settings_preference[0]` → `mood`
   - Extract `category` from `visual_aesthetic[0]`

3. **TERTIARY:** Check `blueprint_subscribers` (legacy)
   - Extract `category` from `form_data.vibe`
   - Extract `mood` from `feed_style`

4. **Template Selection:**
   - For **paid blueprint users**: Extract frame from position 1 template (if exists)
   - For **free users**: Use template library `${category}_${mood}`
   - If no template: Call Maya to generate

### Intended Purpose
✅ **Create a full feed (9 separate high-res images) for paid users**
- 9 empty posts that can be generated individually
- Each post uses template frame descriptions
- Paid users can generate all 9 positions

### Actual Behavior
✅ **WORKING:**
- Creates feed with `layout_type: 'grid_3x4'`
- Creates 9 posts (positions 1-9)
- Stores `feed_style` in `feed_layouts.feed_style` ✅
- Feed style modal matches unified wizard styling ✅
- Modal shows last selection as default ✅

❌ **ISSUES:**
1. **No template prompt stored initially**
   - When user generates position 1, there's no template in `feed_posts[0].prompt`
   - Code falls back to template library or Maya generation
   - **For paid blueprint users:** Should store full template in position 1 so other positions can extract frames

2. **Template extraction only works if position 1 has template**
   - Code checks `previewPost.prompt` (position 1) for template
   - If position 1 is generated first without template, other positions can't extract frames
   - **Solution:** Store template in position 1 when feed is created OR when position 1 is first generated

3. **Category selection logic unclear:**
   - `feed_style` is stored as "luxury", "minimal", or "beige"
   - But template keys need `${category}_${mood}` where:
     - `category` = visual aesthetic (luxury, minimal, beige, warm, edgy, professional)
     - `mood` = feed style mapped via `MOOD_MAP` (dark_moody, light_minimalistic, beige_aesthetic)
   - Current code uses `feed_style` as both category and mood, which might not match template keys

---

## 🔍 TEMPLATE KEY MAPPING ANALYSIS

### Template Keys Available
From `lib/maya/blueprint-photoshoot-templates.ts`:

**Format:** `${category}_${mood}`

**Categories:** luxury, minimal, beige, warm, edgy, professional
**Moods (mapped):** dark_moody, light_minimalistic, beige_aesthetic

**MOOD_MAP:**
```typescript
luxury → dark_moody
minimal → light_minimalistic
beige → beige_aesthetic
```

### Example Template Keys
- `luxury_dark_moody` ✅
- `luxury_light_minimalistic` ✅
- `luxury_beige_aesthetic` ✅
- `minimal_dark_moody` ✅
- `minimal_light_minimalistic` ✅
- `minimal_beige_aesthetic` ✅
- `beige_dark_moody` ✅
- `beige_light_minimalistic` ✅
- `beige_beige_aesthetic` ✅
- ... (and warm, edgy, professional variants)

### Current Code Issue
**In `create-free-example/route.ts` (line 179):**
```typescript
const templateKey = `${category}_${mood}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
```

**Problem:**
- `mood` variable contains "luxury", "minimal", or "beige" (from `feedStyle`)
- But template keys need "dark_moody", "light_minimalistic", or "beige_aesthetic"
- **Code should use `MOOD_MAP[mood]` to convert**

**Example:**
- User selects `feedStyle: "luxury"` → `mood = "luxury"`
- Code constructs: `luxury_luxury` ❌ (doesn't exist)
- Should construct: `luxury_dark_moody` ✅ (using `MOOD_MAP["luxury"]`)

---

## 📊 COMPARISON: INTENDED vs ACTUAL

### "New Preview" Button

| Aspect | Intended | Actual | Status |
|--------|----------|--------|--------|
| **Creates preview feed** | ✅ Yes | ✅ Yes | ✅ Working |
| **1 post at position 1** | ✅ Yes | ✅ Yes | ✅ Working |
| **Stores template prompt** | ✅ Yes | ✅ Yes | ✅ Working |
| **Uses unified wizard data** | ✅ Yes | ✅ Yes | ✅ Working |
| **Stores feed_style** | ❓ Maybe | ❌ No | ⚠️ Inconsistent |
| **Template key mapping** | ✅ Correct | ❌ Wrong | ❌ Bug |

### "New Feed" Button

| Aspect | Intended | Actual | Status |
|--------|----------|--------|--------|
| **Creates full feed** | ✅ Yes | ✅ Yes | ✅ Working |
| **9 posts (positions 1-9)** | ✅ Yes | ✅ Yes | ✅ Working |
| **Stores feed_style** | ✅ Yes | ✅ Yes | ✅ Working |
| **Shows style modal** | ✅ Yes | ✅ Yes | ✅ Working |
| **Stores template in position 1** | ✅ Yes | ❌ No | ❌ Missing |
| **Template extraction works** | ✅ Yes | ⚠️ Partial | ⚠️ Only if position 1 has template |

---

## 🐛 IDENTIFIED BUGS

### Bug 1: Template Key Mapping Incorrect
**Location:** `app/api/feed/create-free-example/route.ts` (line 179)

**Issue:**
```typescript
const templateKey = `${category}_${mood}` // mood is "luxury", "minimal", or "beige"
```

**Should be:**
```typescript
import { MOOD_MAP } from "@/lib/maya/blueprint-photoshoot-templates"
const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
const templateKey = `${category}_${moodMapped}`
```

**Impact:** Template selection may fail or use wrong template

---

### Bug 2: No Template Stored in "New Feed" Position 1
**Location:** `app/api/feed/create-manual/route.ts`

**Issue:** Creates 9 posts with `prompt: NULL`

**Should:** Store full template prompt in position 1 when feed is created

**Impact:** 
- Paid blueprint users can't extract frames for positions 2-9
- Falls back to Maya generation (slower, less consistent)

**Solution:** After creating feed, fetch template and store in position 1:
```typescript
// After creating posts, store template in position 1
const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import("@/lib/maya/blueprint-photoshoot-templates")
const { MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")

// Get category and mood from feed_style or user_personal_brand
const category = /* ... */
const mood = feedStyle || /* fallback */
const moodMapped = MOOD_MAP[mood] || "light_minimalistic"
const templateKey = `${category}_${moodMapped}`
const templatePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

if (templatePrompt) {
  await sql`
    UPDATE feed_posts
    SET prompt = ${templatePrompt}
    WHERE feed_layout_id = ${feedId} AND position = 1
  `
}
```

---

### Bug 3: feed_style Not Stored in "New Preview"
**Location:** `app/api/feed/create-free-example/route.ts`

**Issue:** Creates feed without `feed_style` column

**Impact:** Inconsistent with "New Feed" behavior

**Solution:** Store `feed_style` when creating preview feed (extract from template selection logic)

---

## ✅ WHAT'S WORKING

1. **"New Feed" button flow:**
   - ✅ Opens feed style modal
   - ✅ Stores `feed_style` in database
   - ✅ Creates 9 posts correctly
   - ✅ Modal styling matches unified wizard

2. **"New Preview" button flow:**
   - ✅ Creates preview feed correctly
   - ✅ Stores template prompt in position 1
   - ✅ Uses unified wizard data

3. **Template extraction (when template exists):**
   - ✅ `buildSingleImagePrompt` correctly extracts frames
   - ✅ Works for paid blueprint users when position 1 has template

4. **Feed style modal:**
   - ✅ Shows last selection as default
   - ✅ Matches unified wizard styling
   - ✅ Properly integrated into welcome wizard

---

## ❌ WHAT'S NOT WORKING

1. **Template key mapping:**
   - ❌ Uses `mood` directly instead of `MOOD_MAP[mood]`
   - ❌ May select wrong or non-existent templates

2. **"New Feed" missing template:**
   - ❌ Doesn't store template in position 1
   - ❌ Frame extraction only works if user generates position 1 first with template

3. **"New Preview" missing feed_style:**
   - ❌ Doesn't store `feed_style` in `feed_layouts`
   - ❌ Inconsistent with "New Feed" behavior

4. **Category vs Mood confusion:**
   - ❌ Code uses `feedStyle` as both category and mood
   - ❌ Template selection logic unclear

---

## 🔧 RECOMMENDED FIXES

### Fix 1: Export MOOD_MAP and Correct Template Key Mapping

**Step 1: Export MOOD_MAP**
**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Change:**
```typescript
// Map mood selection to mood name
export const MOOD_MAP: Record<BlueprintMood, string> = {  // Add 'export'
  luxury: "dark_moody",
  minimal: "light_minimalistic",
  beige: "beige_aesthetic",
}
```

**Step 2: Use MOOD_MAP in create-free-example**
**File:** `app/api/feed/create-free-example/route.ts`

**Change:**
```typescript
// Import MOOD_MAP
const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")

// Map mood correctly
const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
```

### Fix 2: Store Template in "New Feed" Position 1
**File:** `app/api/feed/create-manual/route.ts`

**Add after creating posts:**
```typescript
// Store template prompt in position 1 for frame extraction
if (feedStyle) {
  try {
    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
    
    // Note: MOOD_MAP needs to be exported from blueprint-photoshoot-templates.ts first
    
    // Get category from user_personal_brand or use feedStyle as category
    const personalBrand = await sql`
      SELECT visual_aesthetic
      FROM user_personal_brand
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]
    
    let category: string = feedStyle // Default to feedStyle as category
    if (personalBrand && personalBrand.length > 0 && personalBrand[0].visual_aesthetic) {
      const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
        ? JSON.parse(personalBrand[0].visual_aesthetic)
        : personalBrand[0].visual_aesthetic
      
      if (Array.isArray(aesthetics) && aesthetics.length > 0) {
        category = aesthetics[0]?.toLowerCase().trim() || feedStyle
      }
    }
    
    const mood = feedStyle
    const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
    const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
    const templatePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
    
    if (templatePrompt) {
      await sql`
        UPDATE feed_posts
        SET prompt = ${templatePrompt}
        WHERE feed_layout_id = ${feedId} AND position = 1
      `
      console.log(`[v0] ✅ Stored template ${templateKey} in position 1`)
    }
  } catch (error) {
    console.error("[v0] Error storing template in position 1:", error)
    // Continue - template will be generated on first generation
  }
}
```

### Fix 3: Store feed_style in "New Preview"
**File:** `app/api/feed/create-free-example/route.ts`

**Add to INSERT statement:**
```typescript
INSERT INTO feed_layouts (
  user_id,
  brand_name,
  username,
  description,
  status,
  layout_type,
  feed_style,  // Add this
  created_by
)
VALUES (
  ${user.id},
  ${title},
  ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
  NULL,
  'saved',
  'preview',
  ${mood},  // Use mood from template selection
  'manual'
)
```

---

## 📝 SUMMARY

### "New Preview" Button
- **Purpose:** Create preview feed (single 3x3 grid) for free users ✅
- **Status:** Mostly working, but has template key mapping bug ❌
- **Fix needed:** Use `MOOD_MAP` for template key construction

### "New Feed" Button
- **Purpose:** Create full feed (9 separate images) for paid users ✅
- **Status:** Working, but missing template storage ❌
- **Fix needed:** Store template prompt in position 1 when feed is created

### Overall
- ✅ UI flows work correctly
- ✅ Database structure supports both flows
- ❌ Template selection logic has bugs
- ❌ Template storage inconsistent between flows
