# Maya Fabric/Material Preservation Fix

**Date:** January 2025  
**Issue:** Maya is using different fabrics in variations (e.g., original has "silk" but variations use "cashmere")

---

## Problem Identified

Maya was not preserving fabric/material details when creating variations:
- Original guide prompt: "silk dress" or "silk pajamas"
- Variations: Using "cashmere" or other fabrics instead
- This breaks consistency across concept cards for video editing

**User Example:**
- Guide prompt mentions specific fabric (silk, cashmere, satin, velvet, etc.)
- Variations should use the SAME fabric/material
- Currently, Maya is changing fabrics, breaking visual consistency

---

## Root Cause

The outfit extraction logic wasn't:
1. Explicitly preserving fabric/material keywords (silk, cashmere, satin, velvet, etc.)
2. Capturing the COMPLETE outfit description with all components
3. Including fabric keywords in the clothing detection patterns

---

## Fixes Applied

### 1. ✅ Comprehensive Outfit Extraction
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 156-185)

**Added complete outfit pattern matching:**
- Captures ENTIRE outfit descriptions: "couture mini red dress look with structured bow + long black satin gloves + heels"
- Includes fabric/material keywords in pattern detection
- Preserves all outfit components (dress + bow + gloves + heels) together

```typescript
const completeOutfitPattern = /(?:couture|wearing|dressed|outfit|clothing|model)\s+[^,.]*(?:dress|sweater|pajamas|blazer|trousers|shirt)[^,.]*(?:\s+(?:with|and|\+)\s+[^,.]*)*(?:silk|cashmere|satin|velvet|wool|cotton|leather|gloves|heels|bow)/i
```

### 2. ✅ Enhanced Fabric Keyword Detection
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (multiple locations)

**Added fabric/material keywords to clothing detection:**
- `silk`, `cashmere`, `satin`, `velvet`, `wool`, `cotton`, `linen`, `denim`, `leather`, `suede`, `chiffon`, `organza`, `taffeta`, `crepe`, `jersey`, `knit`

**Updated clothing keyword patterns:**
```typescript
const hasClothingKeywords = /(?:...|silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede|chiffon|organza|taffeta|crepe|jersey|knit|...)/i
```

### 3. ✅ Improved Pattern Matching
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 233-276)

**Added specific fabric + garment patterns:**
- `/(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede)\s+(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole)/i`
- `/(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole)\s+(?:with|in|of|made\s+of|from)\s+(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede)/i`

### 4. ✅ Fabric Preservation in Cleaning
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 163-174)

**Updated cleaning logic to preserve fabric keywords:**
- Only removes pose/action/location words
- **DOES NOT remove** fabric/material keywords
- Preserves complete outfit descriptions with fabrics

### 5. ✅ Logging for Debugging
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts` (lines 383-387)

**Added logging to verify fabric preservation:**
```typescript
console.log("[v0] 📦 Preserving outfit with fabric details:", outfitText.substring(0, 150))
```

---

## Expected Behavior After Fix

### Before (Inconsistent Fabrics)
```
Guide prompt: "silk dress with structured bow + long black satin gloves + heels"

Concept 1: ✅ silk dress with structured bow + long black satin gloves + heels
Concept 2: ❌ cashmere dress with structured bow + long black satin gloves + heels (DIFFERENT FABRIC)
Concept 3: ❌ velvet dress with structured bow + long black satin gloves + heels (DIFFERENT FABRIC)
```

### After (Consistent Fabrics)
```
Guide prompt: "silk dress with structured bow + long black satin gloves + heels"

Concept 1: ✅ silk dress with structured bow + long black satin gloves + heels
Concept 2: ✅ silk dress with structured bow + long black satin gloves + heels (SAME FABRIC)
Concept 3: ✅ silk dress with structured bow + long black satin gloves + heels (SAME FABRIC)
```

**Key Improvement:**
- ✅ Same fabric/material preserved across all 6 concept cards
- ✅ Complete outfit description preserved (dress + bow + gloves + heels)
- ✅ All fabric keywords (silk, satin, etc.) maintained

---

## Testing

To verify the fix works:

1. **Provide a guide prompt with specific fabric:**
   - "silk dress"
   - "cashmere sweater"
   - "satin gloves"
   - "velvet blazer"

2. **Generate 6 concept cards**

3. **Check consistency:**
   - All 6 cards should have the SAME fabric/material
   - No fabric substitutions (silk → cashmere, etc.)
   - Complete outfit description preserved

4. **Check server logs:**
   - `[v0] 📦 Preserving outfit with fabric details:` - should show fabric keywords
   - `[v0] ⚠️ WARNING: No outfit extracted` - indicates extraction failure

---

## Files Modified

1. **`lib/maya/prompt-builders/guide-prompt-handler.ts`**
   - Added comprehensive outfit extraction with fabric detection
   - Enhanced fabric keyword patterns
   - Improved cleaning logic to preserve fabrics
   - Added logging for debugging

---

## Status

✅ **Fix Applied**: All changes implemented  
✅ **Fabric Detection**: Enhanced with comprehensive patterns  
✅ **Outfit Extraction**: Improved to capture complete descriptions  
✅ **Logging**: Added for debugging  
⏳ **Ready for Testing**: Test with guide prompts containing specific fabrics

---

## Next Steps

1. Test with guide prompts that include specific fabrics (silk, cashmere, satin, velvet)
2. Verify all 6 concept cards maintain the same fabric/material
3. Check server logs to see what outfit is being extracted
4. If issues persist, check extraction patterns for specific fabric combinations





















