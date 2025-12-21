# Maya Reconstruction Progress

**Date:** January 2025  
**Status:** Phase 2 In Progress

---

## Phase 1: Critical Fixes ✅ COMPLETED

### ✅ 1. Guide Prompt Handling
- **Auto-detection added**: System now detects detailed prompts (100+ chars with specific details) as guide prompts
- **Extraction from conversation context**: Guide prompts extracted from `[GUIDE_PROMPT_TEXT: ...]` markers
- **Consistent variable usage**: All references changed from `guidePrompt` to `detectedGuidePrompt`
- **Priority enforcement**: Guide prompts skip template loading, trend research, and aggressive post-processing

### ✅ 2. Skin Texture Injection Fixed
- **Conditional logic**: `ensureRequiredElements` now only adds skin texture if `shouldIncludeSkinTexture()` returns true
- **Anti-plastic phrases**: Only added if skin texture should be included
- **Pro mode**: No automatic injection - only if in user prompt, guide prompt, or templates

### ✅ 3. System Prompt Simplification
- **Personality reinforcement**: Added warm, friendly personality section at top of system prompt
- **Removed excessive markers**: Removed many "🔴 CRITICAL:", "MANDATORY", "NON-NEGOTIABLE" markers
- **Simplified headers**: Changed to natural language (e.g., "=== SECTION NAME ===" instead of "🔴 CRITICAL: SECTION")

### ✅ 4. Conflicting Instructions Removed
- **Guide prompt priority**: Guide prompt instructions moved to top, skip conflicting sections
- **Conditional template loading**: Templates only loaded when guide prompt is NOT active
- **Conditional trend research**: Trend research respects guide prompts

---

## Phase 2: Simplification 🔄 IN PROGRESS

### ✅ 1. Refactor into Smaller Files
- **Created**: `lib/maya/prompt-builders/guide-prompt-handler.ts`
  - Extracted all guide prompt handling functions
  - `shouldIncludeSkinTexture()`, `mergeGuidePromptWithImages()`, `extractPromptElements()`, `createVariationFromGuidePrompt()`
  
- **Created**: `lib/maya/post-processing/minimal-cleanup.ts`
  - `fixSyntaxErrors()`, `fixFormatting()`, `minimalCleanup()`
  - Only fixes errors, preserves user intent

- **Created**: `lib/maya/prompt-builders/classic-prompt-builder.ts`
  - `buildClassicPrompt()` for Flux prompts
  - 30-60 words, iPhone aesthetic, trigger words

- **Created**: `lib/maya/prompt-builders/pro-prompt-builder.ts`
  - `buildProPrompt()` for Nano Banana Pro prompts
  - 50-80 words, professional aesthetic, no trigger words

- **Created**: `lib/maya/personality/shared-personality.ts`
  - Core personality traits shared across modes
  - Language guidelines, guide prompt priority rules

### ✅ 2. Reduce Conditional Complexity
- **Early returns**: Guide prompt handling uses early detection
- **Consistent variable**: All `guidePrompt` references changed to `detectedGuidePrompt`
- **Conditional simplification**: Template loading and trend research skip when guide prompt active

### ⏳ 3. Unify Prompt Structure
- **Modules created**: Classic and Pro prompt builders created
- **Not yet integrated**: Need to actually use these builders in the main route
- **Status**: Structure defined, but main route still builds prompts inline

### ✅ 4. Minimal Post-Processing
- **Integrated**: `minimalCleanup()` now used in post-processing
- **Guide prompt preservation**: Guide prompts only get syntax fixes, no content changes
- **Regular prompts**: Get minimal cleanup (syntax + formatting only)

---

## Phase 3: Consistency ⏳ NOT STARTED

### ⏳ 1. Test Guide Prompts Thoroughly
- Need to test with various guide prompt formats
- Verify consistency across concepts 2-6
- Test auto-detection of detailed prompts

### ⏳ 2. Ensure Personality Consistency
- Verify Maya sounds warm in both modes
- Check that personality is consistent across all responses
- Test that technical jargon is minimized

### ⏳ 3. Verify Prompt Quality
- Check prompt length (30-60 for Classic, 50-80 for Pro)
- Verify natural language style
- Ensure no conflicting instructions in final prompts

---

## Remaining Work

### High Priority
1. **Integrate prompt builders**: Actually use `classic-prompt-builder.ts` and `pro-prompt-builder.ts` in main route
2. **Further simplify system prompt**: Still 2000+ words - need to extract more into modules
3. **Test guide prompt auto-detection**: Verify it works with various user inputs

### Medium Priority
1. **Extract personality modules**: Move personality sections to separate files
2. **Reduce system prompt size**: Break into smaller, focused sections
3. **Unify prompt structure**: Ensure Classic and Pro use same natural language style

### Low Priority
1. **Performance optimization**: Review if any optimizations needed
2. **Documentation**: Update docs with new structure
3. **User testing**: Get feedback on personality and consistency

---

## Key Improvements Made

1. **Guide Prompts Work**: Auto-detection + priority enforcement
2. **No Auto Skin Texture**: Only added when explicitly requested
3. **Simpler System Prompt**: Removed excessive markers, added personality
4. **Modular Structure**: Guide prompt handler and post-processing extracted
5. **Minimal Post-Processing**: Only fixes errors, preserves intent

---

## Next Steps

1. Complete Phase 2 by integrating prompt builders
2. Further simplify system prompt construction
3. Begin Phase 3 testing
4. Get user feedback on personality and consistency

















