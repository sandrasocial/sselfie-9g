# Feed Planner Prompt Architecture Audit

## Problem Statement

Feed planner images are not using Maya's full potential compared to concept cards (maya screen). The prompts generated are generic and lack the detailed specifications that make concept card images high-quality.

## Comparison: GOOD vs BAD Prompts

### GOOD Prompt (Concept Cards - Maya Screen)
```
user42585527, White woman, long dark brown hair, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces and floor-to-ceiling windows, bright natural light with clean illumination, subtle directional shadows, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, slight lens distortion, visible sensor noise, natural skin texture with visible peach fuzz, organic skin texture, film grain, muted tones
```

**Characteristics:**
- ✅ 50-80 words (detailed and specific)
- ✅ Specific outfit: "sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers"
- ✅ Specific location: "upscale restaurant with marble surfaces and floor-to-ceiling windows"
- ✅ Detailed lighting: "bright natural light with clean illumination, subtle directional shadows, uneven ambient light"
- ✅ Technical specs: "shot on iPhone 15 Pro, natural bokeh, slight lens distortion"
- ✅ Natural imperfections: "visible sensor noise"
- ✅ Skin texture: "natural skin texture with visible peach fuzz, organic skin texture"
- ✅ Film aesthetics: "film grain, muted tones"
- ✅ Specific pose: "standing with hand on marble bar counter, looking over shoulder naturally"

### BAD Prompt (Feed Planner)
```
user42585527, White, woman, long dark brown hair, triumphant pose in urban setting, trendy professional outfit showing success, confident smile, environmental portrait with city backdrop, natural lighting, edgy minimalist aesthetic, empowering energy
```

**Problems:**
- ❌ Too short (~25 words) - lacks detail
- ❌ Generic outfit: "trendy professional outfit showing success" (no materials, colors, specific garments)
- ❌ Generic location: "urban setting" (no specific details)
- ❌ Generic lighting: "natural lighting" (no imperfections, no specific details)
- ❌ Missing technical specs: No iPhone 15 Pro, no camera details
- ❌ Missing natural imperfections: No sensor noise, motion blur, etc.
- ❌ Missing skin texture details
- ❌ Missing film grain and muted colors
- ❌ Generic pose: "triumphant pose" (not specific)
- ❌ Banned words: "triumphant", "confident smile", "empowering energy" (too emotional/generic)

## Root Cause Analysis

### Issue 1: Visual Composition Expert Prompt is Too Simple

**Location:** `lib/feed-planner/visual-composition-expert.ts` (lines 111-151)

**Current Prompt:**
- Only asks for "25-35 words" (line 138) - **WRONG, should be 50-80 words**
- Doesn't include mandatory requirements checklist
- Doesn't reference flux prompting principles
- Doesn't enforce specific outfit descriptions
- Doesn't require technical specs (iPhone, imperfections, skin texture, film grain)
- Doesn't ban generic terms

**Concept Cards Prompt (for comparison):**
- Uses 50-80 words (optimal range)
- Includes comprehensive mandatory requirements (lines 340-410 in `app/api/maya/generate-concepts/route.ts`)
- References flux prompting principles
- Enforces specific outfit descriptions (material + color + garment type)
- Requires all technical specs
- Bans generic/emotional terms

### Issue 2: Missing Flux Prompting Principles

**Location:** `lib/feed-planner/visual-composition-expert.ts`

**Problem:**
- System prompt doesn't include `FLUX_PROMPTING_PRINCIPLES`
- Concept cards include these principles which guide Maya to create detailed, authentic prompts

**Solution:**
- Import and include `getFluxPromptingPrinciples()` in the system prompt

### Issue 3: Missing Mandatory Requirements

**Location:** `lib/feed-planner/visual-composition-expert.ts`

**Missing Requirements:**
1. iPhone 15 Pro specification (MANDATORY)
2. Natural imperfections (AT LEAST 3 required)
3. Natural skin texture with pores visible (MANDATORY)
4. Film grain (MANDATORY)
5. Muted colors (MANDATORY)
6. Lighting with imperfections (MANDATORY)
7. Specific outfit descriptions (material + color + garment type)
8. Banned words list
9. Prompt structure architecture (order matters)

### Issue 4: Wrong Word Count Target

**Location:** `lib/feed-planner/visual-composition-expert.ts` line 138

**Current:** "Keep prompts 25-35 words for best face fidelity"

**Should be:** "Keep prompts 50-80 words for optimal quality and detail"

**Why:** 
- Concept cards use 50-80 words and produce better results
- 25-35 words is too short and lacks necessary detail
- Flux prompting principles specify 50-80 words as optimal

### Issue 5: Missing Physical Preferences Handling

**Location:** `lib/feed-planner/visual-composition-expert.ts`

**Problem:**
- System prompt doesn't include instructions for handling physical preferences
- Concept cards have detailed instructions for converting instruction language to descriptive language

## Required Fixes

### Fix 1: Update System Prompt to Include Flux Prompting Principles

Add flux prompting principles to the system prompt in `visual-composition-expert.ts`:

```typescript
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"

const systemPrompt = `${mayaPersonality}

${userContext}

${getFluxPromptingPrinciples()}

=== FEED PLANNER MODE ===
...
```

### Fix 2: Add Mandatory Requirements Section

Add the same mandatory requirements section that concept cards use:

```typescript
**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

1. **Start with:** "${actualTriggerWord}, ${userEthnicity ? userEthnicity + ", " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences]` : ""}"

2. **iPhone 15 Pro (MANDATORY):** MUST include "shot on iPhone 15 Pro" OR "amateur cellphone photo"

3. **Natural Imperfections (MANDATORY - AT LEAST 3):** MUST include AT LEAST 3 of: "visible sensor noise", "slight motion blur from handheld", "uneven lighting", "mixed color temperatures", "handheld feel", "natural camera imperfections"

4. **Natural Skin Texture (MANDATORY):** MUST include "natural skin texture with pores visible" AND 1–2 of: "not plastic-looking", "organic skin texture", "visible peach fuzz", "slight shine on forehead", "natural blemishes", "subtle facial asymmetry"

5. **Film Grain (MANDATORY):** MUST include one: "visible film grain", "fine film grain texture", "grainy texture", or "subtle grain visible"

6. **Muted Colors (MANDATORY):** MUST include one: "muted color palette", "soft muted tones", "desaturated realistic colors", or "vintage color temperature"

7. **Lighting with Imperfections (MANDATORY):** MUST include "uneven lighting", "mixed color temperatures", or "slight uneven illumination"

8. **Specific Outfit (MANDATORY):** Material + color + garment type (6-10 words), NOT generic "trendy outfit"

9. **Prompt Length:** 50-80 words (optimal range for detailed, high-quality results)

10. **NO BANNED WORDS:** Never use "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "DSLR", "cinematic", "studio lighting", "even lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed", "triumphant", "empowering", "confident smile"
```

### Fix 3: Update Word Count Target

Change line 138 from:
```typescript
- Keep prompts 25-35 words for best face fidelity
```

To:
```typescript
- Keep prompts 50-80 words for optimal quality and detail (same as concept cards)
```

### Fix 4: Add Prompt Structure Architecture

Add the same prompt structure architecture that concept cards use:

```typescript
**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY)
2. **GENDER/ETHNICITY** (2-3 words)
3. **OUTFIT** (material + color + garment type - 6-10 words)
4. **POSE + EXPRESSION** (simple, natural - 4-6 words)
5. **LOCATION** (brief, atmospheric - 3-6 words)
6. **LIGHTING** (with imperfections - 5-8 words)
7. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. **CASUAL MOMENT** (optional - 2-4 words)

**Total target: 50-80 words for optimal quality and detail**
```

### Fix 5: Add Physical Preferences Handling

Add instructions for handling physical preferences (same as concept cards):

```typescript
${
  physicalPreferences
    ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- **IMPORTANT:** Convert instruction language to descriptive language for FLUX, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent
- Include them RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions
`
    : ""
}
```

## Implementation Plan

1. ✅ Update `lib/feed-planner/visual-composition-expert.ts` to include flux prompting principles
2. ✅ Add mandatory requirements section
3. ✅ Update word count target from 25-35 to 50-80
4. ✅ Add prompt structure architecture
5. ✅ Add physical preferences handling
6. ✅ Add banned words list
7. ✅ Update JSON output format to reflect 50-80 word requirement

## Expected Outcome

After these fixes, feed planner prompts should:
- Be 50-80 words (detailed and specific)
- Include specific outfit descriptions (material + color + garment type)
- Include specific location descriptions
- Include detailed lighting with imperfections
- Include all technical specs (iPhone, imperfections, skin texture, film grain, muted colors)
- Match the quality and detail level of concept card prompts
- Produce images that use Maya's full potential

## Additional Fix: Object/Flatlay/Scenery Posts (20% Rule)

### Problem with 20% Lifestyle/Detail/Action/Flatlay Images

The user reported that the 20% lifestyle/detail/action/flatlay images are generic and look fake. These are the non-user posts (object/flatlay/scenery) that follow the 80/20 rule.

### Issues Found

1. **Generic descriptions**: Prompts used "styled objects" or "arranged items" instead of specific items with materials/colors
2. **Missing surface details**: Generic "white background" or "table" instead of specific materials like "marble countertop" or "cream linen tablecloth"
3. **No composition details**: Missing arrangement descriptions, negative space, depth
4. **Missing mandatory requirements**: No validation for iPhone, imperfections, film grain, muted colors
5. **Too short**: Not following 50-80 word requirement

### Fixes Implemented

1. **Added comprehensive mandatory requirements section** for object/flatlay/scenery posts:
   - Specific object/item descriptions with materials, colors, textures
   - Composition & arrangement details (overhead flatlay, diagonal arrangement, negative space)
   - Surface & background specifics (marble, linen, wood - not generic)
   - Lighting with imperfections
   - All technical specs (iPhone, imperfections, film grain, muted colors)

2. **Added prompt structure architecture** for non-user posts:
   - Specific items (8-12 words)
   - Composition (4-6 words)
   - Surface/background (3-5 words)
   - Lighting (5-8 words)
   - Technical specs (8-12 words)
   - Total: 50-80 words

3. **Added validation logic** for non-user posts:
   - Checks for iPhone 15 Pro
   - Validates at least 3 natural imperfections
   - Checks for film grain and muted colors
   - Validates word count (50-80)
   - Auto-adds missing requirements
   - Warns about generic descriptions

4. **Added examples** of good vs bad flatlay prompts in the system prompt

### Expected Results

After these fixes, object/flatlay/scenery prompts should:
- Include specific items with materials and colors (not generic "styled objects")
- Describe composition and arrangement details
- Specify surface materials (marble, linen, wood - not "white background")
- Include all technical specs (iPhone, imperfections, film grain, muted colors)
- Be 50-80 words with detailed descriptions
- Look authentic and Instagram-worthy, not fake or generic

## Testing

After implementation, test with:
1. Generate a feed plan and check prompt quality
2. Compare feed planner prompts to concept card prompts
3. Verify all mandatory requirements are present
4. Verify word count is 50-80 words
5. Verify no banned words are used
6. Generate images and compare quality to concept cards
7. **Test object/flatlay/scenery posts specifically:**
   - Verify specific items are listed (not generic)
   - Verify surface materials are specific
   - Verify composition details are included
   - Verify all technical specs are present
   - Verify images look authentic, not fake

