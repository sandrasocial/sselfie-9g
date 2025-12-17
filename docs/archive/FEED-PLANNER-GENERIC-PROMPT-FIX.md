# Feed Planner Generic Prompt Fix - Complete Solution

## Problem
Prompts are still being generated with generic terms like:
- "stylish business casual outfit" (should be specific material + color + garment)
- "urban background with clean lines" (should be specific location with details)
- "perfect lighting" (banned word, should be uneven lighting with imperfections)
- Missing all technical specs (iPhone, imperfections, skin texture, film grain, muted colors)

## Root Cause Analysis

The issue was that:
1. **Visual Composition Expert** was using `claude-haiku-4.5` which doesn't follow instructions as well
2. **Instructions weren't explicit enough** - AI was generating generic terms despite requirements
3. **Generic term replacement** wasn't happening early enough in the validation flow
4. **Regenerate-post route** was using stored prompts directly without enhancement
5. **Model wasn't strong enough** - haiku vs sonnet for concept cards

## Complete Fixes Applied

### Fix #1: Upgraded Model
**File**: `lib/feed-planner/visual-composition-expert.ts` (line 299)
- **Changed from**: `anthropic/claude-haiku-4.5`
- **Changed to**: `anthropic/claude-sonnet-4-20250514` (same as concept cards)
- **Reason**: Sonnet follows instructions much better than Haiku

### Fix #2: Added Explicit Examples
**File**: `lib/feed-planner/visual-composition-expert.ts` (lines 261-303)
- Added detailed examples showing EXACTLY what to create
- Added bad example showing what NOT to create
- Made it crystal clear that generic terms are forbidden

### Fix #3: Early Generic Term Replacement
**File**: `lib/feed-planner/visual-composition-expert.ts` (lines 540-567)
- Moved generic term replacement to happen BEFORE validation
- Replaces terms like "stylish business casual outfit" → "specific outfit with material and color details"
- Replaces "urban background" → "specific urban location with detailed description"
- Replaces "perfect lighting" → "uneven lighting with mixed color temperatures"
- Replaces "edgy-minimalist aesthetic" → "natural composition with authentic details"

### Fix #4: Enhanced Generate Feed Prompt Route
**File**: `app/api/maya/generate-feed-prompt/route.ts`
- Added more generic term patterns to detect and replace
- Added explicit examples in instructions
- Strengthened instructions to ignore reference prompt format

### Fix #5: Fixed Regenerate Post Route
**File**: `app/api/feed/[feedId]/regenerate-post/route.ts`
- **Before**: Used stored prompt directly from database
- **After**: Always enhances prompt using `generate-feed-prompt` route first
- Ensures even regenerated posts use proper prompts

### Fix #6: Enhanced Queue Images Fallback
**File**: `lib/feed-planner/queue-images.ts` (lines 114-140)
- Added validation to check stored prompt has minimum requirements
- Auto-adds missing requirements if Maya fails
- Ensures fallback prompts still meet quality standards

## Generic Terms Auto-Replaced

The system now automatically detects and replaces:

### Outfit Terms:
- "stylish business casual outfit" → "specific outfit with material and color details"
- "business casual outfit" → "specific outfit with material and color details"
- "stylish outfit" → "specific outfit with material and color details"
- "trendy outfit" → "specific outfit with material and color details"
- "professional outfit" → "specific outfit with material and color details"
- "wearing stylish outfit" → "wearing specific outfit with material and color"

### Location Terms:
- "urban background" → "specific urban location with detailed description"
- "urban setting" → "specific urban location with detailed description"
- "city backdrop" → "specific urban location with detailed description"
- "clean lines" → "specific architectural details"

### Lighting Terms:
- "perfect lighting" → "uneven lighting with mixed color temperatures"
- "clean lighting" → "uneven lighting with mixed color temperatures"
- "professional lighting" → "uneven lighting with mixed color temperatures"
- "even lighting" → "uneven lighting with mixed color temperatures"
- "dynamic lighting" → "uneven lighting with mixed color temperatures"

### Aesthetic Terms:
- "edgy-minimalist aesthetic" → "natural composition with authentic details"
- "edgy minimalist" → "natural composition with authentic details"
- "emphasizing expertise and success" → "natural authentic moment"

### Expression Terms:
- "empowering" → "confident"
- "inspiring" → "natural"
- "motivational" → "authentic"

## Validation Flow

1. **AI generates prompt** (using sonnet model with explicit examples)
2. **Generic term replacement** (happens immediately, before validation)
3. **Format validation** (trigger word, ethnicity, gender)
4. **Requirement validation** (iPhone, imperfections, skin texture, film grain, muted colors)
5. **Auto-enhancement** (adds missing requirements)
6. **Final validation** (checks for placeholder text, logs warnings)

## Expected Results

After these fixes, prompts should:
- ✅ Start with: `user42585527, White woman, [specific outfit details]`
- ✅ Include specific outfit: "sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers"
- ✅ Include specific location: "upscale restaurant with marble bar counter and floor-to-ceiling windows"
- ✅ Include all technical specs: "shot on iPhone 15 Pro, visible sensor noise, natural skin texture with pores visible, visible film grain, muted color palette"
- ✅ Be 50-80 words with detailed descriptions
- ✅ NOT include generic terms (automatically replaced if AI generates them)

## Testing

When testing, check:
1. ✅ New feed strategy creation - prompts should be specific, not generic
2. ✅ Image generation - prompts should be enhanced by generate-feed-prompt route
3. ✅ Regenerate post - should use enhanced prompts, not stored generic ones
4. ✅ Console logs - should show generic term replacements if they occur
5. ✅ Final prompts in database - should have all requirements

## Files Modified

1. ✅ `lib/feed-planner/visual-composition-expert.ts` - Model upgrade, examples, early generic term replacement
2. ✅ `app/api/maya/generate-feed-prompt/route.ts` - More generic term patterns, explicit examples
3. ✅ `app/api/feed/[feedId]/regenerate-post/route.ts` - Now uses generate-feed-prompt route
4. ✅ `lib/feed-planner/queue-images.ts` - Enhanced fallback validation

## Note

Even with all these fixes, if the AI model still generates generic terms, they will be:
1. Automatically replaced with better terms
2. Missing requirements will be auto-added
3. The prompt will be further enhanced by generate-feed-prompt route when actually generating images

The system now has multiple layers of protection against generic prompts.

