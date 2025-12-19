# Maya Reconstruction Plan
## Comprehensive Audit & Simplification Strategy

**Date:** January 2025  
**Status:** Critical - System Over-Complexity Identified  
**Goal:** Restore Maya's warm personality, simplify prompting pipeline, ensure consistency

---

## Executive Summary

Maya's prompting system has become over-engineered with conflicting instructions, conditional logic, and mode-specific complexity that:
1. **Breaks her personality** - She's not using warm, simple, everyday language
2. **Confuses the AI model** - Too many conflicting instructions
3. **Disrespects user wishes** - Guide prompts are being overridden
4. **Creates inconsistency** - Different behavior in classic vs pro mode

**Core Problem:** The system tries to be too smart, adding layers of conditional logic that fight each other instead of working together.

---

## Part 1: Classic vs Pro Mode Comparison

### Classic Mode (personality.ts)
**Philosophy:** Brainstormer, concept cards, vibe + inspiration
- **Personality:** Warm, friendly, like texting a creative friend
- **Language:** Simple, everyday, no technical jargon
- **Prompt Style:** 30-60 words, iPhone aesthetic, trigger words
- **Model:** Flux (LoRA-based)
- **Aesthetic:** Authentic iPhone photos, "looks like a friend took it"
- **Key Features:**
  - Trigger words for LoRA activation
  - "Shot on iPhone 15 Pro"
  - "Candid photo" / "amateur cellphone photo"
  - "Film grain, muted colors"
  - "Natural skin texture with pores visible"
  - "Uneven natural lighting"

### Pro Mode (pro-personality.ts)
**Philosophy:** Creative director, production assistant, brand-aware guide
- **Personality:** Still warm, but more directive, production-focused
- **Language:** Should be simple, but system prompts are complex
- **Prompt Style:** 50-80 words, professional photography, no trigger words
- **Model:** Nano Banana Pro (no LoRA, uses reference images)
- **Aesthetic:** Professional quality, editorial style
- **Key Features:**
  - No trigger words
  - "Professional photography, 85mm lens, f/2.0"
  - "Natural skin texture" (conditional - only if in templates/user prompt)
  - Professional lighting descriptions
  - Brand-aware guidance

### The Disconnect
1. **Personality mismatch:** Pro mode should still be warm, but system prompts are too technical
2. **Prompt structure conflict:** Classic uses trigger words, Pro doesn't - but both should feel natural
3. **Complexity creep:** Pro mode has added too many conditional rules that override user wishes

---

## Part 2: Critical Issues Identified

### Issue 1: Over-Complex System Prompts
**Location:** `app/api/maya/generate-concepts/route.ts` (3000+ lines)

**Problems:**
- Multiple conditional blocks checking `guidePrompt`, `studioProMode`, `templateExamples`
- Conflicting instructions about outfit variation vs consistency
- Too many "CRITICAL" markers that dilute importance
- Instructions scattered across 200+ lines of system prompt construction

**Example of Complexity:**
```typescript
// Lines 1336-1341: Guide prompt instructions
// Lines 1497-1502: Mode-specific outfit variation rules
// Lines 1761-1792: Conditional skin texture requirements
// Lines 2282-2295: Final requirements with more conditionals
// Lines 3045-3065: Post-processing with conditionals
```

**Impact:** Maya gets confused by conflicting instructions, defaults to wrong behavior

### Issue 2: Personality Loss
**Location:** System prompts in `generate-concepts/route.ts`

**Problems:**
- System prompts are 2000+ words of technical instructions
- No emphasis on warm, simple language
- Too many "CRITICAL", "MANDATORY", "NON-NEGOTIABLE" markers
- Instructions read like a technical manual, not Maya's voice

**What Should Happen:**
- System prompt should reinforce Maya's warm personality
- Instructions should be simple and clear
- Less technical jargon, more natural guidance

### Issue 3: Guide Prompt Disrespect
**Location:** Multiple places in `generate-concepts/route.ts`

**Problems:**
- Guide prompts are being overridden by:
  - Template examples
  - Trend research (Scandinavian defaults)
  - Fashion intelligence
  - Post-processing rules
- Too many conditional checks that fail
- System generates concepts first, then tries to override them

**What Should Happen:**
- Guide prompt = absolute priority
- Skip ALL other processing when guide prompt is active
- Use guide prompt directly, create variations programmatically

### Issue 4: Inconsistent Prompt Structure
**Location:** Flux vs Nano Banana principles

**Problems:**
- Flux: 30-60 words, trigger words, iPhone aesthetic
- Nano Banana: 50-80 words, no trigger words, professional aesthetic
- Both should feel natural, but structure is completely different
- No unified "Maya voice" across modes

**What Should Happen:**
- Same natural language style
- Same warm, descriptive approach
- Only difference: technical specs (iPhone vs professional camera)

### Issue 5: Post-Processing Over-Engineering
**Location:** `generate-concepts/route.ts` lines 2362-3296

**Problems:**
- Multiple passes of post-processing
- Conditional logic that fights itself
- "Fixes" that break user intentions
- Too many edge case handlers

**What Should Happen:**
- Minimal post-processing
- Only fix actual errors (not stylistic choices)
- Preserve user's guide prompt exactly

---

## Part 3: Simplification Strategy

### Strategy 1: Unify Personality
**Goal:** Maya should sound the same in both modes (warm, simple, friendly)

**Changes:**
1. Add personality reinforcement to system prompts
2. Remove technical jargon from instructions
3. Use simple, clear language
4. Emphasize natural conversation style

**Implementation:**
- Add personality section at top of system prompt
- Keep it short: "You're Maya - warm, friendly, creative. Use simple, everyday language."
- Remove all "CRITICAL", "MANDATORY" markers (they're noise)
- Use natural instructions: "When user provides a guide prompt, use it exactly"

### Strategy 2: Simplify Guide Prompt Handling
**Goal:** Guide prompts should work perfectly, no exceptions

**Changes:**
1. Check for guide prompt FIRST (before any other processing)
2. If guide prompt exists:
   - Skip template loading
   - Skip trend research
   - Skip fashion intelligence
   - Skip post-processing
   - Use guide prompt for concept #1
   - Create variations programmatically (same outfit/location/lighting, vary pose/angle)

**Implementation:**
```typescript
// Pseudo-code
if (guidePrompt) {
  // Use guide prompt directly
  concepts[0].prompt = mergeGuidePromptWithImages(guidePrompt, referenceImages)
  
  // Create variations 2-6 programmatically
  for (let i = 1; i < 6; i++) {
    concepts[i].prompt = createVariationFromGuidePrompt(guidePrompt, i)
  }
  
  // Skip ALL other processing
  return concepts
}
```

### Strategy 3: Reduce Conditional Complexity
**Goal:** Fewer conditionals, clearer logic

**Changes:**
1. Consolidate conditional checks
2. Use early returns instead of nested conditionals
3. Create helper functions for complex logic
4. Remove redundant checks

**Example:**
```typescript
// Instead of:
if (guidePrompt) {
  if (studioProMode) {
    if (!templateExamples.length) {
      // complex logic
    }
  }
}

// Do:
if (guidePrompt) return handleGuidePrompt(guidePrompt, referenceImages)
if (studioProMode && !guidePrompt) return handleProMode(userRequest, templateExamples)
// etc.
```

### Strategy 4: Unify Prompt Structure
**Goal:** Same natural language style, different technical specs

**Changes:**
1. **Classic Mode (Flux):**
   - Natural language description
   - Trigger word at start
   - iPhone camera specs
   - "Candid photo" aesthetic
   - 30-60 words

2. **Pro Mode (Nano Banana):**
   - Natural language description (SAME STYLE)
   - No trigger word
   - Professional camera specs
   - Professional aesthetic
   - 50-80 words

**Key:** Both should read like Maya describing a scene to a photographer friend

### Strategy 5: Minimal Post-Processing
**Goal:** Only fix actual errors, preserve user intent

**Changes:**
1. Remove "fixes" that change user's stylistic choices
2. Only fix:
   - Syntax errors
   - Formatting issues
   - Actual mistakes (not style preferences)
3. Skip post-processing for guide prompts entirely

**Implementation:**
```typescript
// Only post-process if NOT a guide prompt
if (!isFromGuidePrompt) {
  // Minimal fixes only
  prompt = fixSyntaxErrors(prompt)
  prompt = fixFormatting(prompt)
  // DO NOT change: outfit, location, lighting, aesthetic choices
}
```

---

## Part 4: Recommended File Structure

### Current Structure (Too Complex)
```
app/api/maya/generate-concepts/route.ts (3300+ lines)
├── Multiple helper functions
├── Complex conditional logic
├── 2000+ word system prompt construction
├── Multiple post-processing passes
└── Edge case handlers everywhere
```

### Proposed Structure (Simplified)
```
app/api/maya/generate-concepts/route.ts (main route, ~500 lines)
├── Early returns for guide prompts
├── Simple mode detection
└── Delegate to specialized handlers

lib/maya/prompt-builders/
├── classic-prompt-builder.ts (Flux prompts)
├── pro-prompt-builder.ts (Nano Banana prompts)
└── guide-prompt-handler.ts (Guide prompt variations)

lib/maya/personality/
├── classic-personality.ts (Classic mode system prompt)
├── pro-personality.ts (Pro mode system prompt)
└── shared-personality.ts (Common personality traits)

lib/maya/post-processing/
├── minimal-cleanup.ts (Only fix errors)
└── guide-prompt-preserver.ts (Preserve guide prompts)
```

---

## Part 5: Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix guide prompt handling (already done)
2. ✅ Remove automatic skin texture injection (already done)
3. **TODO:** Simplify system prompt construction
4. **TODO:** Add personality reinforcement
5. **TODO:** Remove conflicting instructions

### Phase 2: Simplification (Week 2)
1. **TODO:** Refactor into smaller files
2. **TODO:** Reduce conditional complexity
3. **TODO:** Unify prompt structure
4. **TODO:** Minimal post-processing

### Phase 3: Consistency (Week 3)
1. **TODO:** Test guide prompts thoroughly
2. **TODO:** Ensure personality consistency
3. **TODO:** Verify prompt quality
4. **TODO:** User testing

---

## Part 6: Specific Code Changes Needed

### Change 1: Simplify System Prompt Construction
**Current:** 2000+ words with nested conditionals
**Proposed:** 500 words, clear sections, early returns

### Change 2: Guide Prompt Priority
**Current:** Checked after other processing
**Proposed:** Checked FIRST, skip everything else

### Change 3: Remove Redundant Instructions
**Current:** Multiple "CRITICAL" sections saying the same thing
**Proposed:** One clear instruction per concept

### Change 4: Personality Reinforcement
**Current:** Technical instructions only
**Proposed:** Personality section at top, reinforced throughout

### Change 5: Post-Processing Simplification
**Current:** Multiple passes, conditional fixes
**Proposed:** Single pass, only fix actual errors

---

## Part 7: Success Metrics

### Before (Current State)
- ❌ Guide prompts not respected
- ❌ Personality lost in technical instructions
- ❌ Inconsistent behavior
- ❌ Over-complex codebase

### After (Target State)
- ✅ Guide prompts work perfectly
- ✅ Maya sounds warm and friendly
- ✅ Consistent behavior across modes
- ✅ Simple, maintainable code

---

## Part 8: Next Steps

1. **Review this plan** with team
2. **Prioritize changes** based on user impact
3. **Implement Phase 1** critical fixes
4. **Test thoroughly** with real guide prompts
5. **Iterate** based on feedback

---

## Conclusion

Maya's system needs simplification, not more features. The core issue is over-engineering that fights against user intent. By simplifying the system, restoring personality, and ensuring guide prompts work perfectly, we can make Maya the warm, helpful creative partner she's meant to be.

**Key Principle:** Simple, clear, warm. Less is more.


