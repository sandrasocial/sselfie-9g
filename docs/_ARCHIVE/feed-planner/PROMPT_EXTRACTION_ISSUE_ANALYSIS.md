# Prompt Extraction Issue Analysis

## Problem Statement

When extracting scenes for paid blueprint feed planner, some prompts (especially for detail, close-up, and flatlay images) are becoming confusing for the NanoBanana Pro model. The prompts mix multiple scene elements together, causing the model to generate 4 scenes in one image instead of a single focused scene.

## Example of Confusing Prompt

```
Generate an image of Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications. 

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting, concrete architecture, professional spaces. iPhone photography style with natural film grain, high contrast shadows, sophisticated and effortless. 

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies 

Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones. - overhead flatlay, Evening golden hour lighting with warm shadows 

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

## Root Cause Analysis

### Issue 1: Frame Description Contains Multiple Elements

The frame description extracted is:
```
Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones. - overhead flatlay, Evening golden hour lighting with warm shadows
```

**Problem:** This mixes:
1. **Flatlay items**: "Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs"
2. **Location description**: "Luxurious hotel lobby with floor-to-ceiling dark marble walls..."
3. **Ambient details**: "Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture..."
4. **Lighting**: "Evening golden hour lighting with warm shadows"

### Issue 2: Template Structure

Looking at template examples:
```
2. Coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, {{LIGHTING_EVENING}}
```

When placeholders are replaced:
- `{{ACCESSORY_FLATLAY_1}}` → "delicate gold necklace, gold watch, minimal gold rings, pearl studs"
- `{{LOCATION_INDOOR_1}}` → "Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones."
- `{{LIGHTING_EVENING}}` → "Evening golden hour lighting with warm shadows"

**The location description is TOO DETAILED** - it includes ambient lighting, furniture, and atmosphere descriptions that should NOT be in a flatlay scene.

### Issue 3: Frame Extraction Logic

Current `parseTemplateFrames()` function:
- Extracts frame descriptions line by line
- Matches pattern: `^(\d+)\.\s*(.+)$`
- Takes everything after the number and period as the frame description

**Problem:** The frame description includes ALL the placeholder replacements, which for flatlay/closeup scenes creates confusion because:
- Flatlay scenes should focus ONLY on the items and surface
- Closeup scenes should focus ONLY on the accessory/outfit detail
- Location descriptions are too detailed and include ambient details

## What Needs to Be Fixed

### 1. **Location Description Formatting**

Location placeholders (`{{LOCATION_INDOOR_1}}`, `{{LOCATION_OUTDOOR_1}}`, etc.) are being replaced with full descriptions that include:
- Architecture details
- Ambient lighting descriptions
- Furniture descriptions
- Atmosphere descriptions

**For flatlay/closeup scenes, these location details are confusing** because:
- Flatlay = overhead view of items on a surface (location should be minimal: "marble table" not "Luxurious hotel lobby with floor-to-ceiling dark marble walls...")
- Closeup = tight shot of accessory/outfit (location should be minimal or omitted)

**Solution:** Create location formatters that provide:
- **Full location** for full-body/midshot scenes
- **Minimal surface description** for flatlay scenes (e.g., "dark marble surface" instead of full lobby description)
- **Omit or minimal** for closeup scenes

### 2. **Frame-Specific Prompt Building**

Different frame types need different prompt structures:

**Flatlay (position 2, 8):**
- Should focus: Items + Surface + Lighting + Camera angle
- Should NOT include: Full location descriptions, ambient atmosphere, furniture details
- Structure: "Coffee and [accessories] on [minimal surface description] - overhead flatlay, [lighting]"

**Closeup (position 4):**
- Should focus: Accessory/outfit detail + Minimal context + Lighting
- Should NOT include: Full location descriptions, ambient details
- Structure: "Close-up [accessory] - [minimal context], [lighting]"

**Full-body/Midshot (positions 1, 3, 5, 6, 7, 9):**
- Can include: Full location descriptions, outfit, pose, setting
- Structure: Current structure works

### 3. **Template Parsing Enhancement**

Need to:
1. Detect frame type (flatlay, closeup, fullbody, midshot) from frame description
2. Apply different location formatting based on frame type
3. Clean up frame descriptions to remove redundant elements

## Proposed Solutions

### Solution 1: Frame Type Detection + Contextual Location Formatting

**Add frame type detection:**
```typescript
function detectFrameType(description: string): 'flatlay' | 'closeup' | 'fullbody' | 'midshot' {
  const lower = description.toLowerCase()
  if (lower.includes('flatlay') || lower.includes('overhead')) return 'flatlay'
  if (lower.includes('close-up') || lower.includes('closeup')) return 'closeup'
  if (lower.includes('full-body') || lower.includes('fullbody')) return 'fullbody'
  return 'midshot'
}
```

**Create contextual location formatters:**
```typescript
function formatLocationForFrameType(
  location: LocationDescription,
  frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
): string {
  switch (frameType) {
    case 'flatlay':
      // Extract just the surface/material (e.g., "dark marble surface")
      return extractSurfaceDescription(location)
    case 'closeup':
      // Minimal or omit
      return '' // or minimal context
    case 'fullbody':
    case 'midshot':
      // Full description
      return location.description
  }
}
```

### Solution 2: Clean Frame Descriptions After Injection

After placeholder replacement, clean up frame descriptions:
- Remove redundant location details from flatlay scenes
- Remove ambient atmosphere from closeup scenes
- Keep only essential elements for each frame type

### Solution 3: Separate Placeholder Sets for Different Frame Types

Create different placeholder sets:
- `LOCATION_SURFACE_1` - For flatlay (just surface description)
- `LOCATION_INDOOR_1` - For full-body/midshot (full description)
- `LOCATION_CONTEXT_1` - For closeup (minimal or empty)

## Recommended Approach

**Combine Solution 1 + Solution 2:**

1. **Detect frame type** during template parsing
2. **Format locations contextually** based on frame type
3. **Clean frame descriptions** after injection to remove redundant elements
4. **Ensure flatlay/closeup prompts are focused** on their specific elements

## Files to Modify

1. `lib/feed-planner/dynamic-template-injector.ts`
   - Add frame type detection
   - Add contextual location formatting
   - Modify `buildPlaceholders()` to accept frame context

2. `lib/feed-planner/build-single-image-prompt.ts`
   - Detect frame type before building prompt
   - Pass frame type to injection function
   - Clean frame descriptions after injection

3. `lib/styling/vibe-libraries.ts` (if needed)
   - Add surface description extraction for locations
   - Add minimal context formatters

## Testing Checklist

- [ ] Flatlay prompts (position 2, 8) focus only on items + surface + lighting
- [ ] Closeup prompts (position 4) focus only on accessory/outfit detail
- [ ] Full-body prompts (positions 1, 3, 5, 6, 7, 9) include full location context
- [ ] No mixing of multiple scene types in one prompt
- [ ] Location descriptions are appropriate for each frame type
- [ ] Generated images show single focused scenes, not multiple scenes
