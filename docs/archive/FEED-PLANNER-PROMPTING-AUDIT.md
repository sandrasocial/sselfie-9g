# Feed Planner Prompting Pipeline Audit

## Executive Summary

The Feed Planner image generation is not using trigger words and Maya's styling consistently, resulting in images that don't match the user's trained model and personal brand. This audit identifies the issues and provides recommendations for fixing the prompting pipeline.

---

## Current Architecture

### 1. Strategy Creation Flow (`/api/feed-planner/create-strategy`)

**Process:**
1. User requests a feed strategy
2. AI generates 9 posts with captions, hashtags, and **prompts**
3. Prompts are stored directly in `feed_posts.prompt` column
4. No trigger word or personal brand styling is included in the system prompt

**Issues:**
- ❌ **No trigger word in system prompt** - The AI doesn't know the user's trigger word
- ❌ **No personal brand context** - Brand colors, styling preferences, and user context are not provided
- ❌ **Generic prompts** - Prompts are generic and don't incorporate user's trained model characteristics
- ❌ **No validation** - Prompts are stored as-is without ensuring trigger word is present

**Code Location:** `app/api/feed-planner/create-strategy/route.ts` (lines 98-135)

---

### 2. Image Generation Flow (`/api/feed/[feedId]/generate-single`)

**Process:**
1. Retrieves post from database (includes `post.prompt`)
2. Uses `post.prompt` directly if it exists
3. Only calls Maya's `generate-feed-prompt` if prompt is missing/empty
4. Sends prompt to Replicate with user's LoRA model

**Issues:**
- ❌ **Uses stored prompts without trigger word validation** - If strategy-generated prompt doesn't have trigger word, it's used as-is
- ❌ **Trigger word not prepended** - Unlike Maya's regular generation, trigger word is not automatically added
- ❌ **Maya's prompt generation is fallback only** - The better prompt generation (with trigger word, brand styling) is only used if prompt is missing
- ❌ **No personal brand styling applied** - Even when using stored prompts, brand colors and styling aren't incorporated

**Code Location:** `app/api/feed/[feedId]/generate-single/route.ts` (lines 133-232)

---

### 3. Maya's Feed Prompt Generation (`/api/maya/generate-feed-prompt`)

**Process:**
1. Retrieves user's trigger word from `user_models`
2. Gets personal brand data (colors, styling)
3. Gets user context (memory, brand profile, assets)
4. Builds comprehensive system prompt with trigger word and brand styling
5. Generates prompt with AI
6. Ensures trigger word is at the start

**Strengths:**
- ✅ Includes trigger word in system prompt
- ✅ Includes personal brand colors and styling
- ✅ Includes user context (memory, brand profile)
- ✅ Validates and prepends trigger word if missing
- ✅ Uses Maya's personality and expertise

**Code Location:** `app/api/maya/generate-feed-prompt/route.ts`

---

### 4. Maya's Regular Image Generation (`/api/maya/generate-image`)

**Process:**
1. Gets trigger word from `user_models`
2. Uses concept prompt from user
3. **Always prepends trigger word** if not present
4. Applies quality settings
5. Sends to Replicate

**Key Difference:**
```typescript
// Maya always ensures trigger word is present
if (!promptLower.startsWith(triggerLower)) {
  finalPrompt = `${triggerWord}, ${finalPrompt}`
}
```

**Code Location:** `app/api/maya/generate-image/route.ts` (lines 128-133)

---

## Comparison: Feed Planner vs Maya

| Feature | Feed Planner | Maya Chat |
|---------|-------------|-----------|
| **Trigger Word in System Prompt** | ❌ No | ✅ Yes (in generate-feed-prompt) |
| **Trigger Word Validation** | ❌ No | ✅ Yes (always prepends) |
| **Personal Brand Colors** | ❌ No | ✅ Yes (in generate-feed-prompt) |
| **User Context (Memory/Brand)** | ❌ No | ✅ Yes (in generate-feed-prompt) |
| **Maya's Styling Expertise** | ❌ No | ✅ Yes (in generate-feed-prompt) |
| **Prompt Quality** | ⚠️ Generic | ✅ Sophisticated |

---

## Root Causes

### 1. **Strategy Generation Doesn't Know About Trigger Words**
The system prompt for strategy generation doesn't include:
- User's trigger word
- User's personal brand data
- User's styling preferences
- User context (memory, brand profile)

**Result:** Generic prompts that don't leverage the user's trained model.

### 2. **Stored Prompts Are Used Without Validation**
When generating images, the code uses `post.prompt` directly without:
- Checking if trigger word is present
- Adding trigger word if missing
- Incorporating personal brand styling
- Applying Maya's expertise

**Result:** Images don't use the user's trained model effectively.

### 3. **Maya's Better Prompt Generation Is Only a Fallback**
The `/api/maya/generate-feed-prompt` endpoint has all the right features but is only called when prompt is missing. Since strategy generation always creates prompts, this better path is rarely used.

**Result:** Users get generic prompts instead of personalized ones.

---

## Recommendations

### Option 1: Always Use Maya's Prompt Generation (Recommended)

**Approach:** Always call `/api/maya/generate-feed-prompt` for image generation, regardless of whether a prompt exists in the database.

**Benefits:**
- ✅ Ensures trigger word is always included
- ✅ Incorporates personal brand styling
- ✅ Uses Maya's expertise and user context
- ✅ Consistent with Maya chat experience
- ✅ Can still use stored prompt as context/reference

**Implementation:**
1. Modify `generate-single` to always call Maya's prompt generation
2. Pass stored prompt as "reference" or "inspiration" to Maya
3. Maya can enhance/improve the prompt with trigger word and styling

**Code Changes:**
- `app/api/feed/[feedId]/generate-single/route.ts`: Always call Maya, use stored prompt as context

---

### Option 2: Enhance Strategy Generation with User Context

**Approach:** Include trigger word and personal brand data in strategy generation system prompt.

**Benefits:**
- ✅ Prompts generated during strategy creation will be better
- ✅ Less work needed during image generation
- ✅ Faster image generation (no need to regenerate prompts)

**Drawbacks:**
- ⚠️ Prompts are generated once and stored - can't adapt based on image results
- ⚠️ Still need validation to ensure trigger word is present

**Implementation:**
1. Get user's trigger word and personal brand data before strategy generation
2. Include in system prompt: "User's trigger word: {triggerWord}"
3. Include brand colors, styling preferences in prompt
4. Add validation in `generate-single` to ensure trigger word is present

**Code Changes:**
- `app/api/feed-planner/create-strategy/route.ts`: Add user context to system prompt
- `app/api/feed/[feedId]/generate-single/route.ts`: Validate and prepend trigger word if missing

---

### Option 3: Hybrid Approach (Best of Both Worlds)

**Approach:** 
1. Enhance strategy generation to include trigger word and basic brand context
2. Always validate and enhance prompts during image generation
3. Use Maya's prompt generation to refine/enhance stored prompts

**Benefits:**
- ✅ Better initial prompts from strategy
- ✅ Always ensures trigger word is present
- ✅ Can refine prompts based on latest user context
- ✅ Flexible - can improve prompts over time

**Implementation:**
1. Strategy generation includes trigger word and basic brand info
2. `generate-single` validates stored prompt has trigger word
3. If missing trigger word or needs enhancement, call Maya with stored prompt as reference
4. Maya enhances prompt with trigger word, styling, and latest context

**Code Changes:**
- `app/api/feed-planner/create-strategy/route.ts`: Add trigger word and brand context
- `app/api/feed/[feedId]/generate-single/route.ts`: Validate and enhance prompts
- `app/api/maya/generate-feed-prompt/route.ts`: Accept optional "reference prompt" parameter

---

## Detailed Recommendations

### Priority 1: Immediate Fix - Ensure Trigger Word is Always Present

**Action:** Add trigger word validation and prepending in `generate-single`, similar to Maya's approach.

```typescript
// After getting finalPrompt (line 133 or 207)
const promptLower = finalPrompt.toLowerCase().trim()
const triggerLower = model.trigger_word.toLowerCase()

if (!promptLower.startsWith(triggerLower)) {
  finalPrompt = `${model.trigger_word}, ${finalPrompt}`
  console.log("[v0] [GENERATE-SINGLE] Prepended trigger word:", model.trigger_word)
}
```

**Impact:** All images will use the user's trained model, even with existing stored prompts.

---

### Priority 2: Include Personal Brand Styling

**Action:** Always call Maya's prompt generation, or enhance stored prompts with brand styling.

**Option A - Always Use Maya:**
- Modify `generate-single` to always call `/api/maya/generate-feed-prompt`
- Pass stored prompt as "reference" parameter
- Maya enhances with trigger word, brand colors, styling

**Option B - Enhance Stored Prompts:**
- Get personal brand data in `generate-single`
- Append brand color instructions to prompt
- Example: "Wearing clothing in brand colors: {colors}, styled with {brandVibe} aesthetic"

**Impact:** Images will reflect user's personal brand and styling preferences.

---

### Priority 3: Improve Strategy Generation

**Action:** Include user context in strategy generation system prompt.

**Changes:**
1. Get user's trigger word before strategy generation
2. Get personal brand data (colors, styling)
3. Include in system prompt:
   ```
   User's Trigger Word: {triggerWord}
   User's Brand Colors: {colors}
   User's Brand Vibe: {brandVibe}
   User's Styling Preferences: {styling}
   ```

**Impact:** Initial prompts will be better quality and include trigger word from the start.

---

## Implementation Plan

### Phase 1: Quick Win (30 minutes)
1. Add trigger word validation in `generate-single`
2. Prepend trigger word if missing
3. Test with existing feed

### Phase 2: Brand Styling (1-2 hours)
1. Always call Maya's prompt generation
2. Pass stored prompt as reference/context
3. Maya enhances with trigger word + brand styling
4. Test with new feed creation

### Phase 3: Strategy Enhancement (2-3 hours)
1. Get user context before strategy generation
2. Include trigger word and brand data in system prompt
3. Update prompt template to emphasize trigger word usage
4. Test end-to-end flow

---

## Testing Checklist

- [ ] Trigger word is present in all generated prompts
- [ ] Personal brand colors are reflected in image descriptions
- [ ] Brand vibe/styling is incorporated
- [ ] Images look consistent with Maya chat generations
- [ ] Existing feeds (with stored prompts) work correctly
- [ ] New feeds generate better prompts from the start
- [ ] No performance degradation (prompt generation is fast)

---

## Expected Outcomes

After implementing these fixes:

1. **Consistency:** Feed Planner images will match Maya chat quality and style
2. **Personalization:** Images will reflect user's trained model and brand
3. **Quality:** Better prompts = better images
4. **User Experience:** Users see their brand and style in all images

---

## Questions to Consider

1. **Should we regenerate prompts for existing feeds?** 
   - Option: Add a "regenerate prompts" button
   - Option: Auto-enhance on next image generation

2. **Should stored prompts be kept as reference?**
   - Yes: Use as context for Maya's enhancement
   - No: Always generate fresh from Maya

3. **Performance impact?**
   - Maya's prompt generation adds ~1-2 seconds per image
   - Acceptable for better quality?

4. **Backward compatibility?**
   - Existing feeds with stored prompts should still work
   - Enhancement should be transparent to users

---

## Conclusion

The Feed Planner prompting pipeline needs to be aligned with Maya's approach to ensure:
- ✅ Trigger words are always used
- ✅ Personal brand styling is incorporated
- ✅ User context is leveraged
- ✅ Images are consistent with Maya chat quality

**Recommended approach:** Option 3 (Hybrid) - Enhance strategy generation AND always validate/enhance during image generation. This provides the best quality while maintaining flexibility.










