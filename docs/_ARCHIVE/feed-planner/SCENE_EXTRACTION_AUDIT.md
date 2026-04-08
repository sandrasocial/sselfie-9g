# Scene Extraction Audit - Paid Blueprint Feeds

## Issue Identified

**Problem:** When extracting individual scenes from templates for paid blueprint feeds, only the frame description line is being extracted, missing critical context elements that should be included in the complete scene prompt.

## Current Extraction Flow

### Step 1: Template Injection
1. Full template retrieved from `BLUEPRINT_PHOTOSHOOT_TEMPLATES`
2. Dynamic injection replaces placeholders:
   - `{{OUTFIT_FULLBODY_1}}` → "A confident woman wearing black velvet blazer, matching velvet trousers, silk charcoal blouse, black pointed-toe pumps. Tailored black suit with sculpted shoulders, silk blouse, pointed-toe pumps"
   - `{{LOCATION_OUTDOOR_1}}` → "Urban concrete structures, modern office interiors, city streets at dusk"
   - `{{STYLING_NOTES}}` → "Editorial styling with attention to velvet and silk textures. High-fashion photography aesthetic. Natural confident pose."
   - `{{COLOR_PALETTE}}` → "Color palette: black, charcoal, deep gray."
   - `{{TEXTURE_NOTES}}` → "Focus on textures: velvet, silk."
   - `{{ACCESSORY_FLATLAY_1}}` → "Minimalist gold jewelry set with geometric shapes"
   - `{{LIGHTING_EVENING}}` → "Evening golden hour lighting with warm shadows"
   - etc.

### Step 2: Scene Extraction
**Current Implementation:** `buildSingleImagePrompt()` extracts:
- BASE_IDENTITY_PROMPT (fixed)
- Frame description line only (e.g., "1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed pose")
- Color grade

**Problem:** After injection, the frame description becomes:
```
"Sitting on Urban concrete structures, modern office interiors, city streets at dusk - A confident woman wearing black velvet blazer, matching velvet trousers, silk charcoal blouse, black pointed-toe pumps. Tailored black suit with sculpted shoulders, silk blouse, pointed-toe pumps, Editorial styling with attention to velvet and silk textures. High-fashion photography aesthetic. Natural confident pose., relaxed pose"
```

This is missing:
- ❌ Vibe context (e.g., "Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting...")
- ❌ Setting context (e.g., "Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies")
- ❌ Overall color palette notes (from template header)
- ❌ Overall texture notes (from template header)
- ❌ Lighting context (if not already in frame description)

## Template Structure Analysis

### Full Template Contains:
1. **Grid Instructions** (first paragraph) - "Create a 3x3 grid showcasing 9 distinct photographic angles..."
2. **Vibe Section** - "Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge..."
3. **Setting Section** - "Setting: Urban concrete structures, modern office interiors..."
4. **Outfits Section** - "Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}"
5. **9 Frames Section** - Individual frame descriptions with placeholders
6. **Color Grade Section** - "Color grade: Deep blacks, cool grays, concrete tones..."

### What Should Be Extracted for Each Scene:

For paid blueprint feeds, each scene should include:

1. ✅ **BASE_IDENTITY_PROMPT** (already included)
2. ✅ **Frame Description** (already included, but needs context)
3. ❌ **Vibe Context** (missing - provides overall aesthetic direction)
4. ❌ **Setting Context** (missing - provides location atmosphere)
5. ❌ **Color Palette Notes** (partially included via placeholders, but template-level notes missing)
6. ❌ **Texture Notes** (partially included via placeholders, but template-level notes missing)
7. ✅ **Color Grade** (already included)

## Expected Complete Scene Prompt Structure

For a paid blueprint feed scene, the prompt should be:

```
[BASE_IDENTITY_PROMPT]

Vibe: [Vibe description from template]

Setting: [Setting description from template]

[Frame description with all placeholders replaced]

Color grade: [Color grade from template]
```

**OR** (more concise version):

```
[BASE_IDENTITY_PROMPT]

[Frame description with all placeholders replaced, including vibe/setting context]

Color grade: [Color grade from template]
```

## Current vs Expected

### Current Extraction (What We Get Now):
```
Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

Sitting on Urban concrete structures, modern office interiors, city streets at dusk - A confident woman wearing black velvet blazer, matching velvet trousers, silk charcoal blouse, black pointed-toe pumps. Tailored black suit with sculpted shoulders, silk blouse, pointed-toe pumps, Editorial styling with attention to velvet and silk textures. High-fashion photography aesthetic. Natural confident pose., relaxed pose

Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

### Expected Extraction (What We Should Get):
```
Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting, concrete architecture, professional spaces. iPhone photography style with natural film grain, high contrast shadows, sophisticated and effortless.

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies

Sitting on Urban concrete structures, modern office interiors, city streets at dusk - A confident woman wearing black velvet blazer, matching velvet trousers, silk charcoal blouse, black pointed-toe pumps. Tailored black suit with sculpted shoulders, silk blouse, pointed-toe pumps, Editorial styling with attention to velvet and silk textures. High-fashion photography aesthetic. Natural confident pose., relaxed pose

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

## Root Cause

The `buildSingleImagePrompt()` function in `lib/feed-planner/build-single-image-prompt.ts` only extracts:
1. The frame description line (from "9 frames:" section)
2. The color grade

It does NOT extract:
- Vibe section
- Setting section
- Overall outfit context (though this is partially in placeholders)

## Files to Modify

1. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Update `parseTemplateFrames()` to also extract:
     - Vibe section
     - Setting section
   - Update `buildSingleImagePrompt()` to include:
     - Vibe context
     - Setting context
     - Frame description
     - Color grade

2. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Verify the extracted prompt includes all necessary context
   - Add validation to ensure vibe/setting are included

## Implementation Plan

### Option 1: Include Vibe + Setting in Each Scene (Recommended)
- Extract vibe and setting from template
- Include them in every scene prompt
- Provides full context for each image

### Option 2: Embed Context in Frame Descriptions
- Modify frame descriptions to include vibe/setting context
- More concise but requires template updates

### Option 3: Hybrid Approach
- Include vibe/setting only when frame description doesn't already contain sufficient context
- More complex logic

## Testing Checklist

- [ ] Verify extracted scene includes BASE_IDENTITY_PROMPT
- [ ] Verify extracted scene includes Vibe context
- [ ] Verify extracted scene includes Setting context
- [ ] Verify extracted scene includes frame description with all placeholders replaced
- [ ] Verify extracted scene includes Color grade
- [ ] Test with all 9 positions (1-9)
- [ ] Test with different vibe templates (luxury_dark_moody, minimal_light_minimalistic, etc.)
- [ ] Verify generated images match the full aesthetic context

## Related Files

- `lib/feed-planner/build-single-image-prompt.ts` - Scene extraction logic
- `lib/maya/blueprint-photoshoot-templates.ts` - Template definitions
- `app/api/feed/[feedId]/generate-single/route.ts` - Generation endpoint
- `lib/feed-planner/dynamic-template-injector.ts` - Placeholder replacement
