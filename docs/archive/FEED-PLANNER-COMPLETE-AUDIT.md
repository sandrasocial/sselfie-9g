# Complete Feed Planner Prompting Pipeline Audit

## Overview
This document audits the ENTIRE feed planner prompting pipeline from strategy creation to image generation to identify all places where generic prompts might be generated.

## Prompt Flow Diagram

```
1. User Request → create-strategy/route.ts
2. Strategy Generation → instagram-strategy-agent.ts (creates layout, NOT prompts)
3. Orchestrator → orchestrator.ts
   ├─→ generateFeedLayout() → layout-strategist.ts (creates shot types, NOT prompts)
   └─→ generateVisualComposition() → visual-composition-expert.ts ✅ FIXED
       └─→ Saves prompt to database as post.prompt
4. Image Generation → Two paths:
   Path A: queue-all-images/route.ts → queue-images.ts
   Path B: generate-single/route.ts
   Both → maya/generate-feed-prompt/route.ts ✅ FIXED
       └─→ Sends to Replicate
```

## Issues Found

### ✅ FIXED: Visual Composition Expert
- **File**: `lib/feed-planner/visual-composition-expert.ts`
- **Status**: ✅ Fixed with flux principles, mandatory requirements, validation
- **Issue**: Was generating 25-35 word generic prompts
- **Fix**: Now uses 50-80 words with all mandatory requirements

### ✅ FIXED: Generate Feed Prompt Route
- **File**: `app/api/maya/generate-feed-prompt/route.ts`
- **Status**: ✅ Fixed with flux principles, validation, generic term replacement
- **Issue**: Was using reference prompts too heavily, missing requirements
- **Fix**: Now ignores reference format, adds all requirements, replaces generic terms

### ❌ ISSUE #1: Profile Image Prompt (Generic)
- **File**: `lib/feed-planner/orchestrator.ts` (lines 328-332)
- **Current**: 
  ```typescript
  const profileImagePrompt = triggerWord
    ? `${triggerWord} professional headshot, clean background, confident smile, natural lighting, high quality portrait photography`
    : "professional headshot, clean background, confident smile, natural lighting, high quality portrait photography"
  ```
- **Problems**:
  - Generic: "professional headshot", "clean background"
  - Missing: iPhone 15 Pro, imperfections, skin texture, film grain, muted colors
  - Banned words: "professional", "high quality", "natural lighting" (without imperfections)
  - Too short: ~15 words (needs 50-80)
- **Fix Required**: Use Maya's full prompting pipeline

### ❌ ISSUE #2: Fallback Composition (Generic)
- **File**: `lib/feed-planner/visual-composition-expert.ts` (lines 637-708)
- **Current**:
  ```typescript
  const basePrompt = isNonUserPost 
    ? `styled ${shotType}, authentic moment, professional aesthetic, ${purpose}`
    : `natural ${shotType}, authentic moment, professional aesthetic, ${purpose}`
  ```
- **Problems**:
  - Generic: "authentic moment", "professional aesthetic"
  - Missing: iPhone 15 Pro, imperfections, skin texture, film grain, muted colors
  - Missing: Specific outfit/location details
  - Too short: ~10 words (needs 50-80)
  - Banned words: "professional"
- **Fix Required**: Generate proper prompt using Maya's pipeline or at least include all mandatory requirements

### ⚠️ POTENTIAL ISSUE #3: Stored Prompts in Database
- **File**: `lib/feed-planner/orchestrator.ts` (line 270)
- **Issue**: Prompts saved to database might be from old strategy creation (before fixes)
- **Mitigation**: ✅ Already handled - `generate-feed-prompt` route enhances stored prompts
- **Note**: The stored prompt is used as `referencePrompt` but we've strengthened instructions to ignore it

### ⚠️ POTENTIAL ISSUE #4: Queue Images Fallback
- **File**: `lib/feed-planner/queue-images.ts` (lines 114-119)
- **Issue**: If Maya fails, uses stored prompt directly
- **Current**: Has validation to fix trigger word format, but doesn't add missing requirements
- **Fix Required**: Add validation to ensure stored prompt has all requirements, or retry Maya

### ✅ VERIFIED: Layout Strategist
- **File**: `lib/feed-planner/layout-strategist.ts`
- **Status**: ✅ OK - Only creates shot types and layout, doesn't generate prompts

### ✅ VERIFIED: Instagram Strategy Agent
- **File**: `lib/feed-planner/instagram-strategy-agent.ts`
- **Status**: ✅ OK - Only creates strategy document, doesn't generate image prompts

### ✅ VERIFIED: Caption Writer
- **File**: `lib/feed-planner/caption-writer.ts`
- **Status**: ✅ OK - Only writes captions, doesn't generate image prompts

## 80/20 Rule Verification

### Layout Strategist ✅
- **File**: `lib/feed-planner/layout-strategist.ts`
- **Status**: ✅ Correctly enforces 80/20 rule
- **Lines 8-13**: "80% USER PHOTOS: 7-8 posts featuring the user"
- **Lines 11**: "20% LIFESTYLE/CONTEXT: 1-2 posts of objects, flatlays, scenery"
- **Lines 74-75**: "MINIMUM 7 posts with user's face", "MAXIMUM 2 posts without face"

### Visual Composition Expert ✅
- **File**: `lib/feed-planner/visual-composition-expert.ts`
- **Status**: ✅ Handles object/flatlay/scenery posts correctly
- **Lines 83**: Checks for non-user posts
- **Lines 113-177**: Has specific requirements for object/flatlay/scenery posts

## Required Fixes

### Fix #1: Profile Image Prompt
**Location**: `lib/feed-planner/orchestrator.ts` lines 328-332

**Current Code**:
```typescript
const profileImagePrompt = triggerWord
  ? `${triggerWord} professional headshot, clean background, confident smile, natural lighting, high quality portrait photography`
  : "professional headshot, clean background, confident smile, natural lighting, high quality portrait photography"
```

**Fix**: Use Maya's generate-feed-prompt route or generate proper prompt with all requirements

### Fix #2: Fallback Composition
**Location**: `lib/feed-planner/visual-composition-expert.ts` lines 637-708

**Current Code**:
```typescript
const basePrompt = isNonUserPost 
  ? `styled ${shotType}, authentic moment, professional aesthetic, ${purpose}`
  : `natural ${shotType}, authentic moment, professional aesthetic, ${purpose}`

const fluxPrompt = isNonUserPost
  ? basePrompt
  : `${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}, ${basePrompt}`
```

**Fix**: Generate proper prompt with all mandatory requirements or call Maya's pipeline

### Fix #3: Queue Images Fallback Validation
**Location**: `lib/feed-planner/queue-images.ts` lines 114-119

**Current Code**:
```typescript
if (!finalPrompt && post.prompt) {
  finalPrompt = post.prompt
  console.log(`[v0] Using stored prompt: ${finalPrompt.substring(0, 100)}...`)
}
```

**Fix**: Add validation to ensure stored prompt has all requirements, or retry Maya with exponential backoff

## Testing Checklist

After fixes, test:
1. ✅ New feed strategy creation - prompts should be 50-80 words with all requirements
2. ✅ Profile image generation - should use proper prompt
3. ✅ Image generation via queue-all-images - should enhance prompts
4. ✅ Image generation via generate-single - should enhance prompts
5. ✅ Fallback scenarios - if Maya fails, fallback should still have requirements
6. ✅ 80/20 rule - verify 7-8 user posts, 1-2 object/flatlay/scenery posts
7. ✅ Object/flatlay/scenery prompts - should be detailed, not generic

## Summary

**Total Issues Found**: 4
- ❌ Profile image prompt (generic) - ✅ FIXED
- ❌ Fallback composition (generic) - ✅ FIXED
- ⚠️ Queue images fallback (needs validation) - ✅ FIXED
- ⚠️ Strategy JSON prompt field (might be generic) - ✅ FIXED (clarified it's just a description)

**Already Fixed**: 2
- ✅ Visual composition expert
- ✅ Generate feed prompt route

**Verified OK**: 3
- ✅ Layout strategist (80/20 rule)
- ✅ Instagram strategy agent
- ✅ Caption writer

## All Fixes Applied

1. ✅ **Profile Image Prompt**: Updated to include minimum requirements (iPhone, imperfections, skin texture, film grain, muted colors)
2. ✅ **Fallback Composition**: Updated to include all mandatory requirements instead of generic terms
3. ✅ **Queue Images Fallback**: Added validation to check and add minimum requirements if stored prompt is missing them
4. ✅ **Strategy JSON Prompt Field**: Clarified that it's just a visual description, not an actual FLUX prompt (actual prompts generated separately)

