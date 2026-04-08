# Maya Classic Mode Restoration - Fix Summary

## Issue

Maya in Classic Mode was generating basic, generic prompts that lacked her fashion expertise, styling knowledge, and creative approach. The prompts were missing:
- Fashion expertise and styling knowledge
- Location inspiration guidance
- Natural influencer styling
- Creative approach and storytelling
- Detailed prompt creation instructions
- Brand knowledge and trend awareness

**Example of broken prompt:**
```
Lost in a good book in your favorite cozy spot, candid photo, amateur cellphone photo, shot on iPhone 15 Pro portrait mode, shallow depth of field, subtle film grain, muted colors, authentic iPhone photo aesthetic
```

This prompt is too basic and lacks:
- Outfit details (Maya's fashion expertise)
- Specific location descriptions
- Creative styling elements
- Maya's personality and expertise

## Root Cause

In `app/api/maya/generate-concepts/route.ts` (line ~1743), Classic Mode was using only the minimal shared personality:

```typescript
// BEFORE (BROKEN):
const mayaPersonalitySection = studioProMode 
  ? getMayaPersonality()
  : `${SHARED_MAYA_PERSONALITY.core}
${SHARED_MAYA_PERSONALITY.languageRules}`
```

`SHARED_MAYA_PERSONALITY.core` and `SHARED_MAYA_PERSONALITY.languageRules` contain only basic personality traits (~100-200 chars), not Maya's full expertise.

## Fix

Replaced the minimal shared personality with the full `MAYA_SYSTEM_PROMPT` from `lib/maya/personality.ts`:

```typescript
// AFTER (FIXED):
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"

const mayaPersonalitySection = studioProMode 
  ? getMayaPersonality()
  : MAYA_SYSTEM_PROMPT
```

`MAYA_SYSTEM_PROMPT` contains:
- ✅ Full fashion expertise and styling knowledge
- ✅ Location inspiration guidance  
- ✅ Natural influencer styling
- ✅ Creative approach and storytelling
- ✅ Detailed prompt creation instructions
- ✅ Brand knowledge and trend awareness
- ✅ All Classic Mode requirements (30-60 words, trigger word, iPhone specs)

**Size comparison:**
- `SHARED_MAYA_PERSONALITY` (old): ~200 chars (minimal)
- `MAYA_SYSTEM_PROMPT` (new): ~19,900 chars (full expertise)

## Verification

Created test script: `scripts/test-maya-classic-mode-restoration.ts`

**Run verification:**
```bash
npx tsx scripts/test-maya-classic-mode-restoration.ts
```

**Test results:**
- ✅ MAYA_SYSTEM_PROMPT imported correctly (19,900 chars, 4/4 key sections found)
- ✅ generate-concepts route uses MAYA_SYSTEM_PROMPT for Classic Mode
- ✅ MAYA_SYSTEM_PROMPT includes Classic Mode requirements (4/4 found)

## What's Different: Classic Mode vs Pro Mode

**Classic Mode** (Flux models):
- Uses `MAYA_SYSTEM_PROMPT` (full personality)
- Generates 30-60 word prompts
- Starts with trigger word (e.g., `user42585527`)
- Uses iPhone 15 Pro portrait mode specs
- Natural, authentic iPhone aesthetic
- Format: `[trigger], [gender], [outfit], [pose], [location], [lighting], shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture, film grain, muted colors`

**Pro Mode** (Nano Banana):
- Uses `getMayaPersonality()` (Studio Pro enhanced)
- Generates 150-400 word prompts
- No trigger word (uses reference images)
- Professional DSLR or iPhone specs (varies by concept)
- Structured sections (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)
- Format: Structured sections with detailed descriptions

## Expected Behavior Now

With the fix, Classic Mode prompts should now include:

1. **Fashion Expertise**: Maya's knowledge of styling, trends, and aesthetics
2. **Creative Outfits**: Specific outfit descriptions with materials, colors, brands when appropriate
3. **Location Inspiration**: Evocative, specific locations (not just "cozy spot")
4. **Styling Details**: Hair, pose, lighting descriptions
5. **Storytelling**: Each prompt tells a story, not just lists items

**Example of good Classic Mode prompt (what we expect now):**
```
user42585527, White woman, long dark hair, oversized cream cashmere sweater, sitting cross-legged on ivory velvet sofa beside fireplace with vintage books, soft golden hour light streaming through floor-to-ceiling windows, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors
```

This prompt includes:
- ✅ Trigger word first
- ✅ Gender and hair
- ✅ Specific outfit (cream cashmere sweater)
- ✅ Evocative location (ivory velvet sofa, fireplace, vintage books)
- ✅ Lighting description (golden hour, soft light)
- ✅ iPhone specs
- ✅ Authenticity markers
- ✅ 30-60 words
- ✅ Maya's creative expertise

## Testing in Production

To verify the fix works in production:

1. **Test Classic Mode concept generation:**
   - Go to Classic Mode in the app
   - Request concepts (e.g., "Lost in a good book in your favorite cozy spot")
   - Verify prompts include:
     - Fashion expertise (outfit details)
     - Location inspiration (specific, evocative locations)
     - Creative styling
     - Proper format (30-60 words, trigger word first, iPhone specs)

2. **Compare with previous behavior:**
   - Old: Generic, basic prompts
   - New: Creative, detailed prompts with Maya's expertise

## Files Changed

- `app/api/maya/generate-concepts/route.ts`
  - Added import: `import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"`
  - Changed Classic Mode personality from minimal shared to full `MAYA_SYSTEM_PROMPT`

## Notes

- Classic Mode and Pro Mode now use different personality systems, which is correct
- Classic Mode uses full `MAYA_SYSTEM_PROMPT` (Flux/LoRA models)
- Pro Mode uses `getMayaPersonality()` (Nano Banana Pro model)
- Both modes should now have full Maya expertise and creativity
- The fix maintains backward compatibility - no API changes

---

**Status:** ✅ Fixed and Verified
**Date:** 2025-01-XX
**Verified by:** Test script `test-maya-classic-mode-restoration.ts`


