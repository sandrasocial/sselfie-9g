# Maya Context Loss & Prompt Quality Fixes

## Issues Fixed

### 1. **Context Loss - Christmas/Cozy Requests**

**Problem:** User chooses "Christmas" category and "cozy" concept, Maya responds correctly but concept cards are random and don't match.

**Root Cause:**
- Maya's `[GENERATE_CONCEPTS]` trigger passes short essence words like "christmas cozy holiday"
- Category detection works, but Christmas gets mapped to 'cozy' category in prompt constructor
- Christmas context was lost when category was 'cozy'
- Prompt constructor wasn't preserving Christmas context from userRequest

**Fix:**
- ✅ Added `userRequest` parameter to `PromptConstructorParams` interface
- ✅ Pass `userRequest` through prompt constructor to preserve context
- ✅ Added Christmas detection in default format section
- ✅ When Christmas context detected, add festive elements to environment, lighting, and mood
- ✅ Enhanced logging to show category detection and context preservation

**Result:** Christmas requests now preserve festive context even when mapped to 'cozy' category.

### 2. **Prompt Validation - NanoBanana Pro Best Practices**

**Problem:** Validation required 250-500 words, but NanoBanana Pro best practices say:
- No strict word count requirement
- Quality and structure beat raw length
- Clear, structured prompts work best
- Organized sections (subject, scene, lighting, tech details)

**Fix:**
- ✅ Updated `validateProductionPrompt()` to focus on structure/quality, not word count
- ✅ Changed from "errors" to "suggestions" (warnings)
- ✅ Check for organized structure (subject, scene, lighting, etc.)
- ✅ Check for clear instructions vs vague descriptions
- ✅ Removed strict 250-500 word requirement
- ✅ Changed validation to be informational, not blocking

**Result:** Prompts validated based on quality and structure, not arbitrary word count.

### 3. **Enhanced Prompt Structure**

**Fix:**
- ✅ Prompts now organized into clear sections:
  - Identity preservation instruction
  - Subject/outfit with detailed fabric/texture descriptions
  - Environment with atmospheric details
  - Lighting with nuanced descriptions
  - Pose with body language details
  - Mood with aesthetic details
  - Camera specs and technical details
- ✅ Christmas context preserved with festive elements
- ✅ Prompts are structured and clear, not walls of text

## Who Creates the Prompts?

**Answer:** The **prompt constructor system** (`lib/maya/prompt-constructor.ts`) creates the prompts for Studio Pro Mode.

**Flow:**
1. User asks Maya for "Christmas cozy" concepts
2. Maya responds correctly and includes `[GENERATE_CONCEPTS] christmas cozy holiday`
3. Frontend extracts "christmas cozy holiday" as `userRequest`
4. Frontend calls `/api/maya/generate-concepts` with `userRequest: "christmas cozy holiday"`
5. **Category detection** (`detectCategoryFromRequest`) detects 'seasonal-christmas'
6. **Prompt constructor** (`generatePromptWithBrandLibrary`) builds the prompt
7. **Prompt constructor** uses:
   - Brand library for outfit details
   - Category-specific camera specs
   - Category-specific lighting
   - Category-specific environment
   - User's physical preferences
   - **NOW: Preserves Christmas context from userRequest**

## Testing Checklist

1. **Christmas Context Preservation:**
   - Ask Maya for "Christmas cozy" concepts
   - Check logs: Should see "✅ Christmas category detected!"
   - Check concept cards: Should have festive/Christmas elements
   - Check prompts: Should include "festive holiday atmosphere, Christmas decorations"

2. **Prompt Quality:**
   - Check logs: Should see "suggestions" not "warnings" for prompts
   - Prompts should be structured (not walls of text)
   - Prompts should have clear sections

3. **Category Detection:**
   - Check logs: Should see detected category and userRequest
   - Should NOT default to casual-lifestyle unless truly generic

## Next Steps

1. Test with "Christmas cozy" request
2. Check console logs for category detection
3. Verify concept cards match Maya's description
4. Check prompt structure in generated concepts
















