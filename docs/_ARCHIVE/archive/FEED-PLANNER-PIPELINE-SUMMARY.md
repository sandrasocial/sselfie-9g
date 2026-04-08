# Feed Planner Prompting Pipeline - Complete Summary

## ✅ All Issues Fixed

I've completed a comprehensive audit of the entire feed planner prompting pipeline and fixed all issues where generic prompts could be generated.

## Complete Prompt Flow

### Path 1: Strategy Creation (create-strategy route)
```
User Request
  ↓
create-strategy/route.ts
  ↓
Generates strategy JSON (with placeholder prompt descriptions)
  ↓
Saves to database (post.prompt = placeholder description)
  ↓
queue-all-images/route.ts → queue-images.ts
  ↓
Calls maya/generate-feed-prompt/route.ts ✅ (enhances placeholder)
  ↓
Sends enhanced prompt to Replicate
```

### Path 2: Orchestrator (if used)
```
User Request
  ↓
orchestrator.ts
  ↓
generateVisualComposition() ✅ (generates proper prompts)
  ↓
Saves to database (post.prompt = proper prompt)
  ↓
generate-single/route.ts
  ↓
Calls maya/generate-feed-prompt/route.ts ✅ (enhances if needed)
  ↓
Sends enhanced prompt to Replicate
```

## All Fixes Applied

### ✅ Fix #1: Visual Composition Expert
**File**: `lib/feed-planner/visual-composition-expert.ts`
- ✅ Added flux prompting principles
- ✅ Added all mandatory requirements (iPhone, imperfections, skin texture, film grain, muted colors)
- ✅ Updated word count from 25-35 to 50-80 words
- ✅ Added validation and auto-enhancement
- ✅ Added specific requirements for object/flatlay/scenery posts

### ✅ Fix #2: Generate Feed Prompt Route
**File**: `app/api/maya/generate-feed-prompt/route.ts`
- ✅ Added flux prompting principles
- ✅ Strengthened instructions to ignore reference prompt format
- ✅ Added automatic generic term replacement
- ✅ Added validation and auto-enhancement
- ✅ Handles both user posts and object/flatlay/scenery posts

### ✅ Fix #3: Profile Image Prompt
**File**: `lib/feed-planner/orchestrator.ts` (lines 328-332)
- ✅ Updated to include minimum requirements
- ✅ Includes: iPhone 15 Pro, skin texture, film grain, muted colors, uneven lighting
- ✅ Removed banned words: "professional", "high quality"
- ✅ Note: Will be further enhanced by generate-feed-prompt when actually generating

### ✅ Fix #4: Fallback Composition
**File**: `lib/feed-planner/visual-composition-expert.ts` (lines 637-708)
- ✅ Updated to include all mandatory requirements
- ✅ For user posts: Includes trigger word, outfit, location, lighting, technical specs
- ✅ For non-user posts: Includes specific items, composition, surface, lighting, technical specs
- ✅ Removed generic terms: "professional aesthetic", "authentic moment"

### ✅ Fix #5: Queue Images Fallback
**File**: `lib/feed-planner/queue-images.ts` (lines 114-119)
- ✅ Added validation to check stored prompt has minimum requirements
- ✅ Auto-adds missing requirements (iPhone, film grain, muted colors) if Maya fails
- ✅ Ensures fallback prompts still meet quality standards

### ✅ Fix #6: Strategy JSON Prompt Field
**File**: `app/api/feed-planner/create-strategy/route.ts` (line 246)
- ✅ Clarified that prompt field is just a visual description, not actual FLUX prompt
- ✅ Actual prompts are generated separately by Maya with full technical specs

## 80/20 Rule Verification

### ✅ Layout Strategist
- **File**: `lib/feed-planner/layout-strategist.ts`
- **Status**: ✅ Correctly enforces 80/20 rule
- **Enforcement**: MINIMUM 7 face shots, MAXIMUM 2 non-face posts

### ✅ Visual Composition Expert
- **File**: `lib/feed-planner/visual-composition-expert.ts`
- **Status**: ✅ Handles object/flatlay/scenery posts correctly
- **Requirements**: Specific items, composition, surface, lighting, technical specs

## Prompt Quality Standards

All prompts now follow these standards:

### For User Posts:
1. ✅ Starts with: `triggerWord, ethnicity, gender`
2. ✅ Specific outfit: Material + color + garment type (6-10 words)
3. ✅ Specific location: Detailed, atmospheric (3-6 words)
4. ✅ Detailed lighting: With imperfections (5-8 words)
5. ✅ iPhone 15 Pro: Mandatory
6. ✅ Natural imperfections: At least 3
7. ✅ Natural skin texture: With pores visible
8. ✅ Film grain: Mandatory
9. ✅ Muted colors: Mandatory
10. ✅ Word count: 50-80 words

### For Object/Flatlay/Scenery Posts:
1. ✅ Specific items: With materials/colors (8-12 words)
2. ✅ Composition: Arrangement, layout, angle (4-6 words)
3. ✅ Surface: Specific material and texture (3-5 words)
4. ✅ Lighting: With imperfections (5-8 words)
5. ✅ iPhone 15 Pro: Mandatory
6. ✅ Natural imperfections: At least 3
7. ✅ Film grain: Mandatory
8. ✅ Muted colors: Mandatory
9. ✅ Word count: 50-80 words

## Banned Words (Auto-Replaced)

The system now automatically detects and replaces:
- "trendy outfit" → "specific outfit with material and color"
- "professional outfit" → "specific outfit with material and color"
- "empowering" → "confident"
- "dynamic lighting" → "uneven lighting with mixed color temperatures"
- "inspiring" → "natural"
- "motivational" → "authentic"
- "edgy minimalist composition" → "natural composition with authentic details"

## Testing Checklist

Before testing, verify:
- [x] Visual composition expert has flux principles
- [x] Generate feed prompt route has flux principles
- [x] Profile image prompt includes minimum requirements
- [x] Fallback composition includes all requirements
- [x] Queue images fallback validates and enhances
- [x] Strategy JSON clarifies prompt is just description
- [x] 80/20 rule is enforced in layout strategist
- [x] Object/flatlay/scenery posts have specific requirements

## Expected Results

After these fixes, ALL prompts sent to Replicate should:
- ✅ Be 50-80 words (detailed and specific)
- ✅ Include specific outfit descriptions (not generic)
- ✅ Include specific location descriptions (not generic)
- ✅ Include all technical specs (iPhone, imperfections, skin texture, film grain, muted colors)
- ✅ NOT include banned words (automatically replaced)
- ✅ Match the quality of concept card prompts
- ✅ Use Maya's full potential

## Files Modified

1. ✅ `lib/feed-planner/visual-composition-expert.ts` - Added flux principles, requirements, validation
2. ✅ `app/api/maya/generate-feed-prompt/route.ts` - Added flux principles, validation, generic term replacement
3. ✅ `lib/feed-planner/orchestrator.ts` - Fixed profile image prompt
4. ✅ `lib/feed-planner/queue-images.ts` - Added fallback validation
5. ✅ `app/api/feed-planner/create-strategy/route.ts` - Clarified prompt field

## No Further Action Needed

All issues have been identified and fixed. The prompting pipeline is now consistent throughout and uses Maya's full potential with all mandatory requirements.

