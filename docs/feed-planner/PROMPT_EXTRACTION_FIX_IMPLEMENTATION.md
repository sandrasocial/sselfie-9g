# Prompt Extraction Fix Implementation

## Problem Fixed

Flatlay and closeup prompts were mixing multiple scene elements, causing NanoBanana Pro to generate 4 scenes in one image instead of a single focused scene.

**Example of confusing prompt (BEFORE):**
```
Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones. - overhead flatlay, Evening golden hour lighting with warm shadows
```

**Expected prompt (AFTER):**
```
Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on dark marble surface - overhead flatlay, Evening golden hour lighting with warm shadows
```

## Root Cause

Location placeholders (`{{LOCATION_INDOOR_1}}`, etc.) were being replaced with full descriptions that included:
- Architecture details
- Ambient lighting descriptions
- Furniture descriptions
- Atmosphere descriptions

For flatlay and closeup scenes, these full location descriptions were inappropriate and confusing.

## Solution Implemented

### 1. Frame Type Detection

Added `detectFrameType()` function in `build-single-image-prompt.ts`:
- Detects frame type from description: `flatlay`, `closeup`, `fullbody`, or `midshot`
- Uses keywords like "flatlay", "overhead", "close-up", "full-body"

### 2. Contextual Location Formatting (Prepared but not used in current approach)

Added `formatLocationForFrameType()` in `dynamic-template-injector.ts`:
- Formats locations differently based on frame type
- Flatlay: Extracts just surface/material (e.g., "dark marble surface")
- Closeup: Returns empty or minimal
- Fullbody/Midshot: Returns full description

**Note:** This is prepared for future use, but current approach uses cleaning instead.

### 3. Frame Description Cleaning

Added `cleanFrameDescription()` function in `build-single-image-prompt.ts`:
- Cleans frame descriptions after injection based on frame type
- **Flatlay:** Removes full location descriptions, extracts just surface/material
- **Closeup:** Removes location descriptions entirely, keeps only accessory/outfit detail
- **Fullbody/Midshot:** Returns as-is (full location descriptions are appropriate)

### 4. Integration

Updated `buildSingleImagePrompt()` to:
1. Extract frame description from template
2. Detect frame type
3. Clean frame description based on frame type
4. Build final prompt with cleaned description

## Files Modified

1. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Added `detectFrameType()` function
   - Added `cleanFrameDescription()` function
   - Updated `buildSingleImagePrompt()` to use cleaning

2. **`lib/feed-planner/dynamic-template-injector.ts`**
   - Added `extractSurfaceDescription()` helper
   - Added `formatLocationForFrameType()` function (prepared for future use)
   - Updated `InjectionContext` interface to include optional `frameType`
   - Updated `buildPlaceholders()` to use contextual formatting when frame type is provided

## How It Works

### Current Flow:

1. **Template Injection:** Inject template once with full location descriptions (for all frame types)
2. **Frame Extraction:** Extract each frame description from injected template
3. **Frame Type Detection:** Detect frame type (flatlay, closeup, fullbody, midshot)
4. **Description Cleaning:** Clean frame description based on frame type:
   - **Flatlay:** Extract surface/material from location, remove ambient details
   - **Closeup:** Remove location descriptions, keep only essential details
   - **Fullbody/Midshot:** Keep as-is
5. **Prompt Building:** Build final prompt with cleaned description

### Example Transformation:

**BEFORE (confusing):**
```
Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones. - overhead flatlay, Evening golden hour lighting with warm shadows
```

**AFTER (focused):**
```
Coffee and delicate gold necklace, gold watch, minimal gold rings, pearl studs on dark marble surface - overhead flatlay, Evening golden hour lighting with warm shadows
```

## Testing Checklist

- [x] Frame type detection works for flatlay, closeup, fullbody, midshot
- [x] Flatlay prompts extract surface/material from location descriptions
- [x] Flatlay prompts remove ambient details and furniture descriptions
- [x] Closeup prompts remove location descriptions
- [x] Fullbody/Midshot prompts keep full location descriptions
- [ ] Test with actual template injection and generation
- [ ] Verify generated images show single focused scenes, not multiple scenes

## Future Improvements

1. **Per-Position Injection:** Instead of injecting once and cleaning, inject with frame-specific location formatting for each position
2. **Better Surface Extraction:** Improve surface/material extraction from location descriptions
3. **Template Structure:** Consider adding frame type hints to templates for more accurate detection

## Notes

- The contextual location formatting in `dynamic-template-injector.ts` is prepared but not actively used
- Current approach uses cleaning after injection, which works but could be optimized
- The cleaning logic handles common patterns but may need refinement based on actual template variations
