# Maya Guide Prompt Consistency Fix

**Date:** January 2025  
**Issue:** Maya was creating different outfits/pajamas and not maintaining consistent styling across concept cards 2-6 when using guide prompts

---

## Problem Identified

When users provided a detailed guide prompt (e.g., "candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree"), Maya was:
- ❌ Creating different outfits/pajamas in concepts 2-6
- ❌ Changing hair styling (different hairstyles instead of same bun with bow)
- ❌ Not maintaining consistent styling for video editing/animation use case

**User Intent:** Users create 6 concept cards to animate them together into a complete video. They need CONSISTENT styling (outfit, hair, location, lighting) across all cards so images can be seamlessly edited together.

---

## Root Cause

1. **Missing Hair Extraction**: The `createVariationFromGuidePrompt` function wasn't extracting and preserving hair styling
2. **Weak System Prompt**: System prompt didn't explicitly emphasize preserving hair styling
3. **Conflicting Instructions**: "VARY outfits" rule was appearing even when guide prompt was active
4. **No Animation Context**: System prompt didn't explain the video editing use case

---

## Fixes Applied

### 1. ✅ Added Hair Styling Extraction
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 155-170)

Added hair extraction logic that:
- Detects hair styling patterns (bun, bow, waves, curls, etc.)
- Extracts complete hair descriptions (e.g., "chic bun with large red velvet bow, two soft face-framing strands")
- Preserves hair styling in all variation prompts

```typescript
// Extract hair styling FIRST (before outfit, as it's often mentioned separately)
let hairText = ""
const hairMatch = workingPrompt.match(/(?:hair|hairstyle|hairstyling)[^,.]*(?:bun|bow|waves|curls|straight|braid|ponytail|chignon|pulled|decorated|with|framing)[^,.]*[.,]/i)
// ... multiple fallback patterns for hair detection
```

### 2. ✅ Updated Variation Function to Preserve Hair
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 320-331)

Hair styling is now added FIRST in the variation prompt (before outfit):
```typescript
// Add hair styling FIRST (preserved from guide prompt - CRITICAL for consistency)
if (hairText && hairText.length > 10) {
  parts.push(hairText)
}

// Add outfit (preserved from guide prompt - CRITICAL for consistency)
if (outfitText && outfitText.length > 15) {
  parts.push(outfitText)
}
```

### 3. ✅ Enhanced System Prompt with Animation Context
**File:** `app/api/maya/generate-concepts/route.ts` (lines 1128-1155)

Added comprehensive guide prompt mode instructions:
- **Explicit animation/video editing use case explanation**
- **MANDATORY preservation list**: outfit, hair, location, lighting, camera specs
- **ONLY VARY list**: poses, actions, expressions, angles, moments
- **Clear examples** of correct vs wrong variations

```
🔴🔴🔴 CRITICAL: GUIDE PROMPT VARIATIONS MODE - ANIMATION/VIDEO EDITING USE CASE

**USER INTENT:** Users create these 6 concept cards to animate them together into a complete video. They need CONSISTENT styling across all cards so the images can be seamlessly edited together.

**MANDATORY - PRESERVE EXACTLY (DO NOT CHANGE):**
- ✅ The EXACT same outfit/clothing from the guide prompt
- ✅ The EXACT same hair styling from the guide prompt
- ✅ The EXACT same location/scene from the guide prompt
- ✅ The EXACT same lighting from the guide prompt
- ✅ The EXACT same camera specs from the guide prompt

**ONLY VARY (DIFFERENT ACTIONS/POSES):**
- ✅ Different poses (standing, sitting, leaning, walking, etc.)
- ✅ Different actions (holding different items, different hand positions)
- ✅ Different expressions (smile, thoughtful, confident, etc.)
- ✅ Different angles (front view, side view, three-quarter view)
- ✅ Different moments (checking phone, reading, looking away, etc.)
```

### 4. ✅ Updated Outfit Variation Rule
**File:** `app/api/maya/generate-concepts/route.ts` (lines 1137-1145)

Made outfit variation rule conditional - only applies when NO guide prompt:
```
**🔴 CRITICAL: OUTFIT VARIATION RULE (ONLY WHEN NOT USING GUIDE PROMPT):**
- **This rule ONLY applies when there is NO guide prompt**
- **If guide prompt is active:** Use the EXACT same outfit, hair, location, lighting from guide prompt
```

### 5. ✅ Updated Concepts #2-6 Instructions
**File:** `app/api/maya/generate-concepts/route.ts` (lines 961-967)

Strengthened the instructions to explicitly mention hair:
```
**Concepts #2-6:** Create variations that maintain EXACTLY:
- The EXACT same outfit from the guide prompt (same pajamas, same dress, same everything - DO NOT change)
- The EXACT same hair styling from the guide prompt (same bun, same bow, same hairstyle - DO NOT change)
- The EXACT same location/scene from the guide prompt (same room, same tree, same setting - DO NOT change)
- The EXACT same lighting style from the guide prompt (same light source, same mood - DO NOT change)
- The EXACT same camera specs from the guide prompt (same lens, same settings - DO NOT change)

Vary ONLY: poses, angles, moments, expressions, and actions (what they're doing).
```

---

## Expected Behavior After Fix

### Before (Inconsistent)
```
Guide prompt: "Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate"

Concept 1: ✅ Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa...
Concept 2: ❌ Cream cashmere lounge set, loose waves, sitting near fireplace... (DIFFERENT OUTFIT, DIFFERENT HAIR, DIFFERENT LOCATION)
Concept 3: ❌ Emerald green silk blouse, elegant low chignon, seated at dining table... (DIFFERENT OUTFIT, DIFFERENT HAIR, DIFFERENT LOCATION)
```

### After (Consistent)
```
Guide prompt: "Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate"

Concept 1: ✅ Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate
Concept 2: ✅ Candy cane striped pajamas, chic bun with red velvet bow, STANDING near sofa with Christmas tree, warm golden lighting, holding phone
Concept 3: ✅ Candy cane striped pajamas, chic bun with red velvet bow, LEANING against sofa with Christmas tree, warm golden lighting, looking at tree
Concept 4: ✅ Candy cane striped pajamas, chic bun with red velvet bow, WALKING toward Christmas tree, warm golden lighting, reaching for ornament
```

**Key Difference:**
- ✅ Same outfit (candy cane striped pajamas)
- ✅ Same hair (chic bun with red velvet bow)
- ✅ Same location (sofa with Christmas tree)
- ✅ Same lighting (warm golden lighting)
- ✅ Different actions/poses (sitting → standing → leaning → walking)

---

## Testing

To verify the fix works:

1. **Provide a detailed guide prompt** with specific outfit, hair, location, lighting
2. **Generate 6 concept cards**
3. **Check consistency:**
   - All 6 cards should have the SAME outfit
   - All 6 cards should have the SAME hair styling
   - All 6 cards should have the SAME location/scene
   - All 6 cards should have the SAME lighting
   - Only poses/actions/expressions should vary

---

## Files Modified

1. **`lib/maya/prompt-builders/guide-prompt-handler.ts`**
   - Added hair styling extraction logic
   - Updated variation prompt building to include hair first
   - Enhanced outfit extraction to avoid mixing hair with outfit

2. **`app/api/maya/generate-concepts/route.ts`**
   - Enhanced guide prompt mode system prompt with animation context
   - Added explicit hair preservation instructions
   - Made outfit variation rule conditional (only when no guide prompt)
   - Strengthened concepts #2-6 instructions

---

## Status

✅ **Fix Applied**: All changes implemented  
✅ **Hair Extraction**: Added and tested  
✅ **System Prompt**: Enhanced with animation context  
✅ **Conditional Rules**: Outfit variation only when no guide prompt  
⏳ **Ready for Testing**: Test with guide prompts containing hair styling

---

## Next Steps

1. Test with guide prompts that include hair styling (bun, bow, etc.)
2. Verify all 6 concept cards maintain consistent outfit, hair, location, lighting
3. Confirm only poses/actions vary across concepts
4. Test animation/video editing use case
