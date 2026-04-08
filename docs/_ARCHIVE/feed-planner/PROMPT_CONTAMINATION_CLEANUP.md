# Prompt Contamination Cleanup (January 18, 2026)

## Objective
Remove quality-degrading text mutations from the Feed Planner prompt pipeline.

## Problem Identified
The `cleanFrameDescription()` function in `lib/feed-planner/build-single-image-prompt.ts` was rewriting frame descriptions before they reached Nanobanana Pro, removing intentional scene details and location context.

### Example Mutation
```
BEFORE: "Coffee and accessories on luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns"
AFTER:  "Coffee and accessories on dark marble surface"
```

This "cleaning" removed atmospheric details that may have been intentionally authored in templates.

## Root Cause
The function was added to reduce prompt verbosity for flatlay and closeup shots, but:
- Scene DNA from `scene-library.ts` is now deterministic and authoritative
- Template frame descriptions are carefully authored
- "Cleaning" removes specificity that improves output quality

## Solution
**Removed `cleanFrameDescription()` entirely.**

Frame descriptions are now used **verbatim** as authored in templates.

## Changes Made

### 1. Deleted Function (98 lines removed)
**File:** `lib/feed-planner/build-single-image-prompt.ts`

**Removed:**
- `cleanFrameDescription()` function (lines 211-312)
- All regex-based location stripping logic
- All ambient detail removal logic

### 2. Updated Caller
**Before:**
```typescript
// Clean frame description based on frame type
const cleanedFrameDescription = cleanFrameDescription(frame.description, frameType)

// Add cleaned frame description (already natural language) - this fills brand kit variables
promptParts.push(cleanedFrameDescription)
```

**After:**
```typescript
// Add frame description verbatim (already natural language) - this fills brand kit variables
promptParts.push(frame.description)
```

### 3. Updated Comment
**Before:** "Detect frame type for cleanup"

**After:** "Detect frame type for validation"

## Impact

### ✅ Benefits
- **Preserves author intent:** Frame descriptions used exactly as written
- **Maintains scene specificity:** Location context and atmosphere preserved
- **Reduces code complexity:** 98 lines of regex logic removed
- **Aligns with architecture:** Scene DNA is authoritative, not cleaned

### ⚠️ Potential Risks
- **Slightly longer prompts:** Full location descriptions included for flatlay/closeup
- **Mitigation:** Scene DNA is already concise and deterministic

## Verification

### Before (with cleaning)
```
Scene: Flatlay
Frame: "Coffee and accessories on dark marble surface"
```

### After (verbatim)
```
Scene: Flatlay
Frame: "Coffee and accessories on luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns"
```

## Files Modified
- `lib/feed-planner/build-single-image-prompt.ts` (98 lines removed, 3 lines updated)

## Files NOT Modified
- `detectFrameType()` - Still used for validation and identity prompt logic
- `parseTemplateFrames()` - Still extracts frames from templates
- `injectAndValidateTemplate()` - Still replaces placeholders (required)
- `formatBrandProfileBlock()` - Still injects brand kit (required)

## Runtime Flow (After Cleanup)

```
User clicks "Generate Image"
    ↓
app/api/feed/[feedId]/generate-single/route.ts
    ↓
injectAndValidateTemplate() [REQUIRED - fills {{PLACEHOLDERS}}]
    ↓
generateFeedSinglePromptViaAuthority()
    ↓
buildSingleImagePrompt()
    ↓
frame.description [VERBATIM - no cleaning]
    ↓
formatBrandProfileBlock() [REQUIRED - brand kit injection]
    ↓
Nanobanana Pro
```

## Contamination Status

### Before Cleanup
- **Status:** PARTIALLY CONTAMINATED
- **Contamination:** 1 active function rewriting scene descriptions
- **Required Transformations:** 3 (template injection, brand kit, semantic authority)

### After Cleanup
- **Status:** CLEAN
- **Contamination:** 0 functions rewriting scene descriptions
- **Required Transformations:** 3 (unchanged - these are necessary)

## Related Documentation
- `docs/feed-planner/PROMPT_CONTAMINATION_AUDIT.md` - Original audit report
- `docs/feed-planner/DEAD_CODE_CLEANUP_COMPLETE.md` - Previous cleanup (orchestrator removal)
- `lib/maya/scene-library.ts` - Deterministic scene specifications (authoritative source)

## Testing Recommendations
1. Generate flatlay images (position 3) - verify location context preserved
2. Generate closeup images (position 6) - verify ambient details preserved
3. Compare before/after prompts for positions 1-9
4. Monitor image quality for improvements in scene coherence

## Conclusion
The prompt pipeline is now **clean**. Frame descriptions flow verbatim from templates to Nanobanana Pro, with only required transformations (placeholder injection, brand kit injection, semantic authority enforcement).

Scene DNA is respected as authoritative. No text is rewritten, normalized, or "cleaned" before generation.
