# Maya Guide Prompt Consistency Fix V2

**Date:** January 2025  
**Issue:** Maya still creating different outfits/pajamas and same actions (all drinking hot cocoa) when generating from guide prompts

---

## Problem Identified

Even after initial fixes, Maya was:
- ❌ Still creating different outfits/pajamas across concept cards 2-6
- ❌ All variations showing same action (drinking hot cocoa/tea)
- ❌ Not maintaining consistent styling for video editing/animation

**User Requirement:** 
- Same outfit, same hair, same concept/scenario
- Different scenes (within same concept)
- Different actions (not all drinking)

---

## Root Causes

1. **Outfit Extraction Failing**: Extraction logic wasn't robust enough - failed when guide prompt didn't start with "Wearing"
2. **Repetitive Actions**: Variation poses included "holding coffee cup" which led to all concepts showing drinking
3. **Action Words Mixed with Outfit**: Outfit extraction was including action words like "drinking", "holding cup"
4. **No Validation**: No logging to verify outfit/hair/location were actually preserved

---

## Fixes Applied

### 1. ✅ Improved Outfit Extraction
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 161-250)

**Changes:**
- Enhanced "Wearing" pattern extraction to remove action words (drinking, holding, sipping, etc.)
- Added fallback patterns for common clothing descriptions:
  - "candy cane striped pajamas"
  - "couture mini red dress"
  - "cream cashmere sweater"
  - "black satin dress"
- Improved sentence-by-sentence extraction to exclude action/location words
- Added final validation with multiple pattern matching attempts

```typescript
// Remove action words like "drinking", "holding cup"
wearingText = wearingText.replace(/\b(?:drinking|holding|sipping|grasping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
```

### 2. ✅ Diverse Action Variations
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 121-128)

**Before:**
```typescript
{ pose: "sitting", moment: "holding coffee cup", angle: "side profile", expression: "relaxed smile" },
```

**After:**
```typescript
{ pose: "standing", moment: "adjusting hair", angle: "front view", expression: "gentle smile" },
{ pose: "sitting", moment: "reading book", angle: "side profile", expression: "focused expression" },
{ pose: "leaning", moment: "reaching for ornament", angle: "three-quarter view", expression: "playful smile" },
{ pose: "walking", moment: "carrying blanket", angle: "dynamic front view", expression: "content expression" },
{ pose: "kneeling", moment: "arranging decorations", angle: "casual side view", expression: "thoughtful expression" },
```

**Result:** No more repetitive "drinking hot cocoa" - diverse actions for video editing

### 3. ✅ Enhanced Validation & Logging
**File:** `app/api/maya/generate-concepts/route.ts` (lines 2018-2038)

Added comprehensive validation that checks:
- Outfit preservation (checks for clothing keywords)
- Hair styling preservation (checks for bun, bow, etc.)
- Location preservation (checks for scene keywords)
- Detailed logging for debugging

```typescript
console.log("[v0] 📋 Variation #" + variationNumber + " validation:", {
  hasOutfit: variationHasOutfit,
  hasHair: variationHasHair,
  hasLocation: variationHasLocation,
  promptLength: variationPrompt.length
})
```

### 4. ✅ Improved Clothing Pattern Matching
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 211-250)

Added specific patterns for common clothing descriptions:
- `/(?:candy\s+cane\s+)?striped\s+(?:pajamas?|silk\s+pajamas?)/i`
- `/(?:couture\s+)?mini\s+red\s+dress/i`
- `/(?:cream|white|beige)\s+cashmere\s+(?:sweater|turtleneck|lounge\s+set)/i`
- `/(?:black|red|white)\s+satin\s+(?:dress|gloves|opera\s+gloves)/i`

### 5. ✅ Action Word Filtering
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (multiple locations)

Added filtering to remove action words from outfit extraction:
- `drinking`, `holding`, `sipping`, `grasping`, `carrying`, `reading`, `checking`, `adjusting`, `arranging`

---

## Expected Behavior After Fix

### Before (Inconsistent & Repetitive)
```
Guide prompt: "Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate"

Concept 1: ✅ Candy cane striped pajamas, chic bun, sitting, holding hot chocolate
Concept 2: ❌ Cream cashmere lounge set, loose waves, sitting, holding tea (DIFFERENT OUTFIT, DIFFERENT HAIR, SAME ACTION)
Concept 3: ❌ Emerald green silk blouse, elegant chignon, sitting, holding coffee cup (DIFFERENT OUTFIT, DIFFERENT HAIR, SAME ACTION)
```

### After (Consistent & Diverse)
```
Guide prompt: "Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate"

Concept 1: ✅ Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate
Concept 2: ✅ Candy cane striped pajamas, chic bun with red velvet bow, STANDING, adjusting hair, near sofa with Christmas tree, warm golden lighting
Concept 3: ✅ Candy cane striped pajamas, chic bun with red velvet bow, SITTING, reading book, on sofa with Christmas tree, warm golden lighting
Concept 4: ✅ Candy cane striped pajamas, chic bun with red velvet bow, LEANING, reaching for ornament, beside Christmas tree, warm golden lighting
Concept 5: ✅ Candy cane striped pajamas, chic bun with red velvet bow, WALKING, carrying blanket, toward Christmas tree, warm golden lighting
Concept 6: ✅ Candy cane striped pajamas, chic bun with red velvet bow, KNEELING, arranging decorations, near Christmas tree, warm golden lighting
```

**Key Improvements:**
- ✅ Same outfit (candy cane striped pajamas) - PRESERVED
- ✅ Same hair (chic bun with red velvet bow) - PRESERVED
- ✅ Same location concept (sofa with Christmas tree) - PRESERVED
- ✅ Same lighting (warm golden lighting) - PRESERVED
- ✅ Different actions (adjusting hair, reading book, reaching for ornament, etc.) - VARIED
- ✅ Different poses (standing, sitting, leaning, walking, kneeling) - VARIED

---

## Testing

To verify the fix works:

1. **Provide a detailed guide prompt** with specific outfit, hair, location, lighting
2. **Generate 6 concept cards**
3. **Check consistency:**
   - All 6 cards should have the SAME outfit (check logs for validation)
   - All 6 cards should have the SAME hair styling
   - All 6 cards should have the SAME location/scene concept
   - All 6 cards should have the SAME lighting
   - Actions should be DIVERSE (not all drinking)
   - Poses should be DIVERSE (standing, sitting, leaning, walking, kneeling)
4. **Check server logs** for validation warnings:
   - `[v0] ⚠️ WARNING: Variation prompt might not contain outfit from guide prompt!`
   - `[v0] ⚠️ WARNING: Variation prompt might not contain hair styling from guide prompt!`
   - `[v0] ⚠️ WARNING: Variation prompt might not contain location from guide prompt!`

---

## Files Modified

1. **`lib/maya/prompt-builders/guide-prompt-handler.ts`**
   - Improved outfit extraction with action word filtering
   - Added diverse action variations (no more "drinking")
   - Enhanced pattern matching for common clothing descriptions
   - Improved fallback extraction logic

2. **`app/api/maya/generate-concepts/route.ts`**
   - Enhanced validation with outfit/hair/location checks
   - Added detailed logging for debugging
   - Improved warning messages

---

## Status

✅ **Fix Applied**: All changes implemented  
✅ **Outfit Extraction**: Enhanced with multiple fallback patterns  
✅ **Action Diversity**: Changed from repetitive "drinking" to diverse actions  
✅ **Validation**: Added comprehensive logging  
⏳ **Ready for Testing**: Test with guide prompts containing specific outfits

---

## Next Steps

1. Test with guide prompts that include specific clothing (pajamas, dresses, etc.)
2. Verify all 6 concept cards maintain consistent outfit, hair, location, lighting
3. Confirm actions are diverse (not all drinking)
4. Check server logs for validation warnings
5. If issues persist, check extraction logs to see what's being extracted

---

## Debugging

If outfit/hair/location are still not preserved:

1. **Check server logs** for:
   - `[v0] 📝 Variation prompt (first 200 chars):` - see what's being generated
   - `[v0] 📋 Variation #X validation:` - see validation results
   - `[v0] ⚠️ WARNING:` - see what's missing

2. **Check extraction** by looking for:
   - `outfitText` value in logs (if added)
   - `hairText` value in logs (if added)
   - `locationText` value in logs (if added)

3. **Improve patterns** if specific clothing descriptions aren't being caught

