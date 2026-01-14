# Feed Style Templates Audit Report

## Executive Summary

This audit examines three critical areas:
1. **Template Variety**: Can users get different images when creating multiple feeds with the same style?
2. **Vibe + Category Usage**: Are we using the full combination of vibe (dark and moody, minimalistic, beige) AND category (luxury, trendy, professional)?
3. **Fashion Style Integration**: Are user's fashion style preferences from the unified onboarding wizard being used in prompts?

---

## 1. TEMPLATE VARIETY ISSUE ❌

### Current State
- **18 templates total**: One template per `category_mood` combination
- **Template structure**: Each template has 9 fixed scenes (frames 1-9)
- **Problem**: Users creating multiple feeds with the same style get **identical images every time**

### Template Combinations Available
```
luxury_dark_moody
luxury_light_minimalistic
luxury_beige_aesthetic
minimal_dark_moody
minimal_light_minimalistic
minimal_beige_aesthetic
beige_dark_moody
beige_light_minimalistic
beige_beige_aesthetic
warm_dark_moody
warm_light_minimalistic
warm_beige_aesthetic
edgy_dark_moody
edgy_light_minimalistic
edgy_beige_aesthetic
professional_dark_moody
professional_light_minimalistic
professional_beige_aesthetic
```

### Impact
- User creates Feed #1 with "dark and moody" → Gets 9 specific scenes
- User creates Feed #2 with "dark and moody" → Gets **exact same 9 scenes**
- **No variety** between feeds with the same style

### Solution Needed
✅ **Add multiple template variations per category+mood combination**
- Create 3-5 variations of each template (e.g., `luxury_dark_moody_v1`, `luxury_dark_moody_v2`, etc.)
- Each variation has different outfits, poses, locations, camera angles
- Same vibe and category, but different scene layouts
- Randomly select a variation when creating a new feed

---

## 2. VIBE + CATEGORY USAGE ISSUE ⚠️

### Current Implementation

**How it works now:**
1. User selects **feed_style** (luxury/minimal/beige) → Maps to **MOOD**
   - `luxury` → `dark_moody`
   - `minimal` → `light_minimalistic`
   - `beige` → `beige_aesthetic`

2. System gets **category** from `user_personal_brand.visual_aesthetic` → Maps to **CATEGORY**
   - First element of `visual_aesthetic` array (luxury/minimal/beige/warm/edgy/professional)

3. Template key = `${category}_${moodName}`

### Problem
❌ **User cannot select category separately from vibe**
- User wants "dark and moody" (mood) + "luxury" (category) → Works ✅
- User wants "dark and moody" (mood) + "trendy" (category) → **NOT POSSIBLE** ❌
- User wants "dark and moody" (mood) + "professional" (category) → **NOT POSSIBLE** ❌

**Current flow:**
- Feed style modal only asks for vibe (luxury/minimal/beige)
- Category comes from user's brand profile (set once in onboarding)
- **Cannot mix and match** vibe + category per feed

### What User Wants
User wants to select:
- **Vibe**: Dark and moody / Light and minimalistic / Beige aesthetic
- **Category**: Luxury / Trendy / Professional / Minimal / Warm / Edgy

**Example combinations:**
- Dark and moody + Luxury ✅ (exists)
- Dark and moody + Trendy ❌ (doesn't exist - "trendy" not a category)
- Dark and moody + Professional ✅ (exists)
- Light and minimalistic + Luxury ✅ (exists)
- Light and minimalistic + Professional ✅ (exists)

### Solution Needed
✅ **Add category selection to feed creation**
- Update feed style modal to include category selection
- Store both `feed_style` (mood) and `feed_category` in `feed_layouts`
- Use both when selecting template: `${feed_category}_${moodName}`

**Note**: "Trendy" is not currently a category. Need to either:
- Add "trendy" as a new category, OR
- Map "trendy" to existing category (e.g., "edgy" or "warm")

---

## 3. FASHION STYLE INTEGRATION ISSUE ❌

### Current State

**User's fashion style is stored:**
- `user_personal_brand.fashion_style` (casual, business, trendy, timeless)
- Set during unified onboarding wizard

**How prompts are built:**
```typescript
// lib/feed-planner/build-single-image-prompt.ts
export function buildSingleImagePrompt(templatePrompt: string, position: number): string {
  // 1. Extract frame description from template
  const { frames, colorGrade } = parseTemplateFrames(templatePrompt)
  const frame = frames.find(f => f.position === position)
  
  // 2. Build prompt: Base identity + Frame description + Color grade
  return `${BASE_IDENTITY_PROMPT}\n\n${frame.description}\n\n${colorGrade}`
}
```

### Problem
❌ **User's fashion style is NOT used in prompt building**
- Templates have **hardcoded outfits** in frame descriptions
- Example: `luxury_dark_moody` template has "Black oversized blazers, black leather pants..."
- User's `fashion_style` preference (e.g., "casual", "trendy") is **ignored**
- Prompts use template outfits, not user's fashion preferences

### Where Fashion Style Should Be Used
1. **Template selection**: Filter/prioritize templates based on fashion style
2. **Frame description modification**: Adjust outfit descriptions in frames to match user's fashion style
3. **Outfit section override**: Replace template's "Outfits:" section with user's fashion preferences

### Solution Needed
✅ **Integrate fashion_style into prompt building**
- Read `user_personal_brand.fashion_style` when building prompts
- Modify frame descriptions to incorporate user's fashion style
- Options:
  - **Option A**: Replace outfit descriptions in frames with fashion-style-appropriate outfits
  - **Option B**: Append fashion style guidance to frame descriptions
  - **Option C**: Use fashion style to select template variations

---

## RECOMMENDATIONS

### Priority 1: Template Variety (High Impact)
1. Create 3-5 variations of each template
2. Add variation selection logic (random or sequential)
3. Store selected variation in `feed_layouts` for consistency

### Priority 2: Category Selection (Medium Impact)
1. Add category selection to feed style modal
2. Store `feed_category` in `feed_layouts` table
3. Update template selection to use `${feed_category}_${moodName}`

### Priority 3: Fashion Style Integration (Medium Impact)
1. Read `fashion_style` from `user_personal_brand`
2. Modify `buildSingleImagePrompt` to incorporate fashion style
3. Adjust outfit descriptions in frame prompts based on user's fashion preferences

---

## FILES TO MODIFY

### Template Variety
- `lib/maya/blueprint-photoshoot-templates.ts` - Add template variations
- `app/api/feed/create-manual/route.ts` - Add variation selection logic
- `app/api/feed/[feedId]/generate-single/route.ts` - Use selected variation

### Category Selection
- `components/feed-planner/feed-style-modal.tsx` - Add category selection UI
- `app/api/feed/create-manual/route.ts` - Save `feed_category`
- `scripts/migrations/add-feed-category-to-feed-layouts.sql` - Add column
- `app/api/feed/[feedId]/generate-single/route.ts` - Use `feed_category`

### Fashion Style Integration
- `lib/feed-planner/build-single-image-prompt.ts` - Add fashion style parameter
- `app/api/feed/create-manual/route.ts` - Pass fashion_style to prompt builder
- `app/api/feed/[feedId]/generate-single/route.ts` - Read and use fashion_style

---

## CURRENT CODE FLOW

### Feed Creation (`app/api/feed/create-manual/route.ts`)
```typescript
// 1. Get category from user_personal_brand.visual_aesthetic
let category: string = feedStyle // Default to feedStyle

// 2. Get mood from feedStyle
const mood = feedStyle
const moodMapped = MOOD_MAP[mood] // luxury → dark_moody

// 3. Select template
const templateKey = `${category}_${moodMapped}`
const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

// 4. Extract all 9 scenes
for (let position = 1; position <= 9; position++) {
  const extractedScene = buildSingleImagePrompt(fullTemplate, position)
  // Store in feed_posts.prompt
}
```

### Prompt Building (`lib/feed-planner/build-single-image-prompt.ts`)
```typescript
// 1. Parse template to get frames and color grade
const { frames, colorGrade } = parseTemplateFrames(templatePrompt)

// 2. Find frame for position
const frame = frames.find(f => f.position === position)

// 3. Build prompt: Base identity + Frame description + Color grade
return `${BASE_IDENTITY_PROMPT}\n\n${frame.description}\n\n${colorGrade}`
```

**Missing:**
- ❌ Template variation selection
- ❌ Category selection from user
- ❌ Fashion style integration
