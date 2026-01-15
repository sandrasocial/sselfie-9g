# NanoBanana Pro Prompting + Template Injection Audit

**Date:** 2025-01-XX  
**Auditor:** Cursor AI (Audit Mode)  
**Scope:** NanoBanana Pro prompt pipeline, template injection system, identity preservation, reference image strategy

---

## 1. CURRENT SYSTEM MAP (Evidence-Based)

### Flow A: Paid Blueprint Users (Single Image Generation)

**Entry Point:** `app/api/feed/[feedId]/generate-single/route.ts` (line 13)

**Path:**
1. **Reference Image Selection** (lines 269-295)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - Query: `SELECT image_url, display_order, uploaded_at FROM user_avatar_images WHERE user_id = ${user.id} AND is_active = true ORDER BY display_order ASC, uploaded_at ASC LIMIT 5`
   - **Evidence:** Lines 269-276
   - **Behavior:** Selects up to 5 active avatar images, ordered by display_order then uploaded_at
   - **Issue:** No quality checks (resolution, face visibility) - **NOT FOUND**

2. **Template Selection & Injection** (lines 705-1029)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 705-1029
   - **Behavior:**
     - Attempts template injection via `dynamic-template-injector.ts`
     - If injection succeeds: extracts single scene via `buildSingleImagePrompt()`
     - If injection fails: falls back to raw template from `BLUEPRINT_PHOTOSHOOT_TEMPLATES`
   - **Stored in DB:** Injected template (if successful) or raw template (if injection failed)
   - **Evidence:** Line 452-456 (preview feeds), Line 1241 (full feeds)

3. **Maya Prompt Enhancement** (lines 1032-1106)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 1032-1106
   - **Behavior:**
     - Calls `/api/maya/generate-feed-prompt` with `referencePrompt` (injected template or preview template)
     - Maya receives injected template as reference
     - Maya generates new prompt (50-80 words for Pro Mode)
   - **Evidence:** Line 1060 - `referencePrompt: previewTemplate || templateReferencePrompt || undefined`

4. **Prompt Cleaning** (lines 1217-1225)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 1220-1221
   - **Function:** `cleanBlueprintPrompt()` from `lib/feed-planner/build-single-image-prompt.ts`
   - **Behavior:** Removes ONLY unreplaced placeholders (`{{...}}`), keeps all template structure
   - **Evidence:** `lib/feed-planner/build-single-image-prompt.ts` lines 337-350

5. **NanoBanana Generation** (lines 1227-1234)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 1227-1234
   - **Function:** `generateWithNanoBanana()` from `lib/nano-banana-client.ts`
   - **Parameters:**
     - `prompt`: cleaned prompt (Maya-generated for paid users)
     - `image_input`: array of avatar image URLs (up to 5)
     - `aspect_ratio`: '4:5' for paid, '9:16' for free
     - `resolution`: '2K'
     - `safety_filter_level`: 'block_only_high'
   - **Evidence:** `lib/nano-banana-client.ts` lines 30-148

6. **NanoBanana Client Processing** (lines 72-86)
   - File: `lib/nano-banana-client.ts`
   - **Evidence:** Lines 72-86
   - **Behavior:** Adds "Generate an image of..." prefix if prompt doesn't start with generation phrase
   - **Issue:** This prefix is added AFTER Maya generation, potentially disrupting identity anchor

### Flow B: Preview Feeds (9-Scene Grid)

**Entry Point:** `app/api/feed/[feedId]/generate-single/route.ts` (line 13, when `isPreviewFeed = true`)

**Path:**
1. **Template Injection** (lines 380-449)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 380-449
   - **Behavior:** Injects full template with all 9 scenes, stores in DB
   - **Stored in DB:** Full injected template (with all 9 scenes)
   - **Evidence:** Line 452-456

2. **NanoBanana Generation** (lines 1227-1234)
   - **Same as Flow A, but:**
   - `prompt`: Full template with grid instructions (not single scene)
   - `aspect_ratio`: Always '9:16' (for 3x3 grid)

### Flow C: Free Users

**Entry Point:** `app/api/feed/[feedId]/generate-single/route.ts` (line 13, when `access.isFree = true`)

**Path:**
1. **Template Selection** (lines 570-651)
   - File: `app/api/feed/[feedId]/generate-single/route.ts`
   - **Evidence:** Lines 570-651
   - **Behavior:** Uses template injection, extracts single scene
   - **No Maya enhancement** - uses extracted scene directly

2. **NanoBanana Generation** (lines 1227-1234)
   - **Same as Flow A, but:**
   - `prompt`: Extracted single scene (not Maya-enhanced)
   - `aspect_ratio`: '9:16'

---

## 2. GOOD vs BAD (with Evidence)

### GOOD

**Item 1: Identity Anchor in Base Prompt**
- **Why it's good:** Provides explicit identity preservation instruction
- **File/Lines:** `lib/feed-planner/build-single-image-prompt.ts` line 80
- **Evidence:** `const BASE_IDENTITY_PROMPT = "Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications."`
- **Status:** Defined but **NOT USED** in paid user flow (Maya generates new prompt without this anchor)

**Item 2: Reference Image Selection Logic**
- **Why it's good:** Uses `is_active` and `display_order` for consistent selection
- **File/Lines:** `app/api/feed/[feedId]/generate-single/route.ts` lines 269-276
- **Evidence:** Query filters by `is_active = true` and orders by `display_order ASC, uploaded_at ASC`
- **Status:** ✅ Working correctly

**Item 3: Template Injection System**
- **Why it's good:** Dynamically injects outfits, locations, accessories based on user selections
- **File/Lines:** `lib/feed-planner/dynamic-template-injector.ts`
- **Evidence:** System exists and is called in generate-single route
- **Status:** ✅ Working (when injection succeeds)

**Item 4: Prompt Cleaning (Placeholder Removal)**
- **Why it's good:** Removes unreplaced placeholders without breaking template structure
- **File/Lines:** `lib/feed-planner/build-single-image-prompt.ts` lines 337-350
- **Evidence:** `cleanBlueprintPrompt()` function removes `{{...}}` patterns only
- **Status:** ✅ Working correctly

### BAD

**Item 1: Identity Anchor Lost in Maya Generation**
- **Why it's bad:** Maya generates new prompts (50-80 words) that may not include identity anchor text
- **Real user symptom:** Identity drift - user doesn't look like themselves
- **File/Lines:** 
  - `app/api/feed/[feedId]/generate-single/route.ts` lines 1032-1106 (Maya call)
  - `app/api/maya/generate-feed-prompt/route.ts` lines 269-430 (Maya prompt generation)
- **Evidence:** 
  - Line 1060: `referencePrompt` is passed to Maya, but Maya generates NEW prompt
  - Line 1071: `finalPrompt = mayaData.prompt || mayaData.enhancedPrompt` - Maya's prompt replaces template
  - `BASE_IDENTITY_PROMPT` is defined but never used in paid flow
- **Root Cause:** Maya is instructed to generate "natural language" prompts (50-80 words) without explicit identity anchor requirement

**Item 2: "Generate an image of..." Prefix Added After Identity Anchor**
- **Why it's bad:** NanoBanana client adds prefix AFTER prompt is constructed, potentially disrupting identity anchor placement
- **Real user symptom:** Identity anchor may be buried mid-prompt instead of at start
- **File/Lines:** `lib/nano-banana-client.ts` lines 72-86
- **Evidence:** 
  - Line 74: `let finalPrompt = input.prompt.trim()`
  - Lines 78-85: Adds "Generate an image of..." prefix if not present
  - This happens AFTER Maya generation, so identity anchor (if present) gets pushed down
- **Root Cause:** Prefix logic doesn't check for identity anchor patterns

**Item 3: Brand Names in Vibe Libraries**
- **Why it's bad:** Brand names (The Row, Alo, Lululemon, etc.) appear in outfit descriptions, which Claude research suggests can override identity
- **Real user symptom:** Generated images may look like brand models instead of user
- **File/Lines:** `lib/styling/vibe-libraries.ts` lines 90-342
- **Evidence:** 
  - Line 90: `brands: ['The Row', 'Khaite', 'Toteme']`
  - Line 212: `brands: ['Alo', 'Lululemon', 'The Row']`
  - Line 277: `'The Row Margaux tote in black leather'`
  - These brands appear in `description` and `pieces` arrays that get injected into templates
- **Root Cause:** Vibe libraries include brand names in outfit formulas

**Item 4: Editorial/Runway Language in Maya Prompts**
- **Why it's bad:** Maya's system prompt includes "editorial", "professional photography", "magazine quality" language that Claude research suggests causes identity drift
- **Real user symptom:** Images look like fashion editorials instead of authentic user photos
- **File/Lines:** `app/api/maya/generate-feed-prompt/route.ts` lines 269-430
- **Evidence:**
  - Line 269: `"a Nano Banana Pro" prompt for an Instagram feed post`
  - Line 276: `"Create cinematic lighting that feels authentic, not staged"`
  - Line 360: `"Professional lighting description (e.g., "soft diffused natural window light")"`
  - Line 361: `"Professional photography specs (e.g., "85mm lens, f/2.0 depth of field")"`
  - Line 404: Banned words list includes "editorial", "magazine quality" but these are contradicted by instructions above
- **Root Cause:** System prompt instructs Maya to use "professional photography" language while also banning "editorial" terms (contradictory)

**Item 5: No Prompt Length Validation**
- **Why it's bad:** Prompts can exceed 100-150 word target range, causing identity drift
- **Real user symptom:** Overly long prompts may cause model to lose focus on identity
- **File/Lines:** 
  - `app/api/maya/generate-feed-prompt/route.ts` lines 356-417 (targets 50-80 words)
  - `lib/nano-banana-client.ts` (no length check)
- **Evidence:**
  - Line 356: Target is "50-80 words" for Pro Mode
  - Line 1088: Logs word count but doesn't validate: `(${finalPrompt.split(/\s+/).length} words)`
  - No enforcement if prompt exceeds 150 words
- **Root Cause:** Word count is logged but not enforced

**Item 6: Duplicated Template Selection Logic**
- **Why it's bad:** Multiple code paths select templates, creating inconsistency risk
- **Real user symptom:** Different prompts for same user/feed combination
- **File/Lines:** 
  - `app/api/feed/[feedId]/generate-single/route.ts` lines 380-449 (preview)
  - `app/api/feed/[feedId]/generate-single/route.ts` lines 570-651 (free users)
  - `app/api/feed/[feedId]/generate-single/route.ts` lines 705-1029 (paid users)
- **Evidence:** Three separate template selection/injection blocks with similar but not identical logic
- **Root Cause:** Code evolution without consolidation

**Item 7: Prompt Overwritten After Generation**
- **Why it's bad:** Prompt stored in DB may differ from prompt sent to NanoBanana
- **Real user symptom:** Regeneration uses different prompt than original generation
- **File/Lines:** `app/api/feed/[feedId]/generate-single/route.ts` lines 1236-1241
- **Evidence:**
  - Line 1241: `prompt = ${cleanedPrompt}` - stores cleaned prompt
  - But `cleanedPrompt` is Maya-generated for paid users, which may differ from template
- **Root Cause:** DB stores final prompt, but regeneration may use different path

**Item 8: No Reference Image Quality Checks**
- **Why it's bad:** Low-quality or non-face images may be sent, reducing identity preservation
- **Real user symptom:** Poor identity consistency when reference images are blurry or don't show face
- **File/Lines:** `app/api/feed/[feedId]/generate-single/route.ts` lines 269-276
- **Evidence:** Query selects images but doesn't check:
  - Resolution (minimum required)
  - Face visibility (face detection)
  - Image quality (blur, noise)
- **Root Cause:** No quality validation logic exists - **NOT FOUND**

---

## 3. CLAUDE RESEARCH REVIEW (Applied to Our Code)

### Recommendation 1: Remove Brand Names from Prompts

**Status:** NOT PRESENT (brand names are included)

**Evidence:**
- `lib/styling/vibe-libraries.ts` lines 90-342: Brand names in `brands` arrays and `description`/`pieces` fields
- These get injected into templates via `dynamic-template-injector.ts`
- Maya's system prompt (line 363) says: "Include brand mentions when applicable (e.g., "from Alo", "Alo brand outfit")"

**Risk:** HIGH - Brand names can override identity, causing user to look like brand model

**Expected Impact if Implemented:**
- Remove brand names from vibe library descriptions
- Replace with generic descriptors (e.g., "luxury athletic set" instead of "Alo Airbrush leggings")
- Keep brand context in metadata only, not in prompts

### Recommendation 2: Avoid Editorial/Runway Terms

**Status:** PARTIALLY (contradictory instructions)

**Evidence:**
- `app/api/maya/generate-feed-prompt/route.ts` line 404: Bans "editorial", "magazine quality"
- But line 276: Instructs "Create cinematic lighting"
- Line 360: Instructs "Professional lighting description"
- Line 361: Instructs "Professional photography specs"

**Risk:** MEDIUM - Contradictory instructions may confuse Maya, leading to inconsistent prompts

**Expected Impact if Implemented:**
- Remove "professional photography", "cinematic", "editorial" language from system prompts
- Replace with "authentic", "natural", "iPhone-style" language
- Align all instructions to avoid editorial terms

### Recommendation 3: 100-150 Word Target Range

**Status:** PARTIALLY (target exists but not enforced)

**Evidence:**
- `app/api/maya/generate-feed-prompt/route.ts` line 356: Target is "50-80 words" for Pro Mode
- Line 1088: Word count is logged but not validated
- No enforcement if prompt exceeds target

**Risk:** MEDIUM - Prompts may exceed target, causing identity drift

**Expected Impact if Implemented:**
- Add prompt length validation (100-150 words max)
- Truncate or regenerate if prompt exceeds limit
- Log warnings when prompts approach limit

### Recommendation 4: Use 3 Reference Images

**Status:** ALREADY (system supports 3+ images)

**Evidence:**
- `app/api/feed/[feedId]/generate-single/route.ts` line 275: `LIMIT 5` (allows up to 5)
- Line 288-290: Warns if less than 3 images available
- System sends all available images (1-5) to NanoBanana

**Risk:** LOW - System already supports 3+ images

**Expected Impact if Implemented:**
- No change needed (already meets recommendation)
- Could enforce minimum 3 images requirement (currently only warns)

### Recommendation 5: Start Prompts with Identity Anchor

**Status:** NOT PRESENT (identity anchor defined but not used)

**Evidence:**
- `lib/feed-planner/build-single-image-prompt.ts` line 80: `BASE_IDENTITY_PROMPT` is defined
- But `app/api/feed/[feedId]/generate-single/route.ts` lines 1032-1106: Maya generates new prompt without identity anchor
- `lib/nano-banana-client.ts` lines 72-86: Adds "Generate an image of..." prefix, which may push identity anchor down

**Risk:** HIGH - Identity anchor not consistently used, causing identity drift

**Expected Impact if Implemented:**
- Prepend identity anchor to all NanoBanana prompts
- Ensure anchor is first text in prompt (before "Generate an image of..." prefix)
- Update Maya system prompt to require identity anchor in generated prompts

---

## 4. RECOMMENDED CHANGES (Minimal First)

### Minimal Safe Patch

**Change 1: Prepend Identity Anchor to All NanoBanana Prompts**

**Files to Edit:**
- `lib/nano-banana-client.ts` (lines 72-86)

**What to Change:**
```typescript
// BEFORE (lines 72-86):
let finalPrompt = input.prompt.trim()
const promptLower = finalPrompt.toLowerCase()

if (!promptLower.startsWith('generate an image') && ...) {
  finalPrompt = `Generate an image of ${finalPrompt}`
}

// AFTER:
let finalPrompt = input.prompt.trim()
const promptLower = finalPrompt.toLowerCase()

// Check if identity anchor already present
const hasIdentityAnchor = promptLower.includes('maintaining exactly the same physical characteristics') || 
                          promptLower.includes('same physical characteristics of the woman in the attached image')

// Add identity anchor if missing
if (!hasIdentityAnchor) {
  const IDENTITY_ANCHOR = "Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications."
  finalPrompt = `${IDENTITY_ANCHOR} ${finalPrompt}`
}

// Add generation prefix if needed
if (!promptLower.startsWith('generate an image') && ...) {
  finalPrompt = `Generate an image of ${finalPrompt}`
}
```

**Acceptance Criteria:**
- All NanoBanana prompts start with identity anchor
- Identity anchor appears before "Generate an image of..." prefix
- No duplicate identity anchors if already present

**Change 2: Enforce Prompt Length (100-150 words)**

**Files to Edit:**
- `lib/nano-banana-client.ts` (after line 86)

**What to Change:**
```typescript
// AFTER prefix addition, before sending to Replicate:
const wordCount = finalPrompt.split(/\s+/).length
if (wordCount > 150) {
  console.warn(`[NANO-BANANA] Prompt exceeds 150 words (${wordCount}), truncating to preserve identity focus`)
  // Truncate to first 150 words
  const words = finalPrompt.split(/\s+/)
  finalPrompt = words.slice(0, 150).join(' ')
  console.log(`[NANO-BANANA] Truncated prompt length: ${finalPrompt.split(/\s+/).length} words`)
}
```

**Acceptance Criteria:**
- Prompts exceeding 150 words are truncated
- Warning logged when truncation occurs
- Identity anchor preserved (not truncated)

**Change 3: Remove Brand Names from Prompt Instructions**

**Files to Edit:**
- `app/api/maya/generate-feed-prompt/route.ts` (line 363)

**What to Change:**
```typescript
// BEFORE (line 363):
7. **BRAND CONTEXT** - Include brand mentions when applicable (e.g., "from Alo", "Alo brand outfit")

// AFTER:
7. **STYLING CONTEXT** - Describe outfit style and aesthetic (e.g., "luxury athletic set", "minimalist business attire") - DO NOT use specific brand names
```

**Acceptance Criteria:**
- Maya system prompt no longer instructs brand name usage
- Generated prompts avoid brand names
- Outfit descriptions use generic style terms

### Next Iteration (Optional Improvements)

**Change 4: Add Reference Image Quality Checks**

**Files to Edit:**
- `app/api/feed/[feedId]/generate-single/route.ts` (after line 276)

**What to Change:**
- Add image quality validation (resolution, face detection)
- Filter out low-quality images before sending to NanoBanana
- Log warnings when quality checks fail

**Change 5: Remove Editorial Language from Maya System Prompt**

**Files to Edit:**
- `app/api/maya/generate-feed-prompt/route.ts` (lines 276, 360-361)

**What to Change:**
- Replace "cinematic lighting" with "natural lighting"
- Replace "professional photography" with "authentic iPhone photography"
- Remove "magazine quality" references

**Change 6: Consolidate Template Selection Logic**

**Files to Edit:**
- `app/api/feed/[feedId]/generate-single/route.ts` (extract common logic)

**What to Change:**
- Extract template selection/injection into shared function
- Reduce code duplication across preview/free/paid paths
- Ensure consistent behavior

---

## 5. TEST PLAN (Manual + Instrumentation)

### Test Case 1: Identity Anchor Presence

**Steps:**
1. Generate single image for paid blueprint user
2. Check logs for prompt sent to NanoBanana
3. Verify identity anchor appears at start of prompt

**What to Log:**
- Prompt sent to `generateWithNanoBanana()`
- Presence of identity anchor text
- Position of identity anchor (should be first or second after "Generate an image of...")

**Success Criteria:**
- Identity anchor present in 100% of prompts
- Identity anchor appears within first 50 words
- No duplicate identity anchors

### Test Case 2: Prompt Length Validation

**Steps:**
1. Generate prompts for 10 different feed posts
2. Check word count for each prompt
3. Verify all prompts are ≤ 150 words

**What to Log:**
- Word count for each prompt
- Warnings when truncation occurs
- Final word count after truncation

**Success Criteria:**
- 100% of prompts are ≤ 150 words
- Truncation warnings logged when needed
- Identity anchor preserved during truncation

### Test Case 3: Brand Name Removal

**Steps:**
1. Generate prompts for feeds with brand-heavy vibes (luxury_beige_aesthetic, etc.)
2. Check generated prompts for brand names
3. Verify brand names are replaced with generic descriptors

**What to Log:**
- Generated prompt text
- Presence of brand names (The Row, Alo, Lululemon, etc.)
- Generic replacements used

**Success Criteria:**
- 0% of prompts contain brand names
- Generic style descriptors used instead
- Outfit descriptions remain specific (material, color, garment type)

### Test Case 4: Reference Image Count

**Steps:**
1. Test with 1, 2, 3, 4, 5 reference images
2. Verify correct number sent to NanoBanana
3. Check identity consistency across image counts

**What to Log:**
- Number of reference images selected
- Number of images sent to NanoBanana
- Warnings when < 3 images available

**Success Criteria:**
- System sends 1-5 images as available
- Warnings logged when < 3 images
- Identity consistency improves with more images (3+)

### Test Case 5: Identity Preservation Comparison

**Steps:**
1. Generate 5 images with current system (before changes)
2. Generate 5 images with identity anchor fix (after changes)
3. Compare identity consistency

**What to Log:**
- User feedback on identity match (1-5 scale)
- Visual similarity scores (if available)
- Prompt text for each generation

**Success Criteria:**
- Identity match improves after changes
- User feedback shows increased consistency
- No regression in other quality metrics

### Test Case 6: Editorial Language Removal

**Steps:**
1. Generate 10 prompts with updated system prompt
2. Check for banned editorial terms
3. Verify natural/authentic language used

**What to Log:**
- Generated prompt text
- Presence of banned terms (editorial, magazine quality, cinematic, professional photography)
- Natural language indicators (iPhone, authentic, natural)

**Success Criteria:**
- 0% of prompts contain banned editorial terms
- Natural language used consistently
- Authentic iPhone aesthetic maintained

### Test Case 7: Prompt Overwrite Prevention

**Steps:**
1. Generate image and store prompt in DB
2. Regenerate same image
3. Verify same prompt used (or intentional variation logged)

**What to Log:**
- Prompt stored in DB
- Prompt used for regeneration
- Differences between stored and used prompts

**Success Criteria:**
- Regeneration uses stored prompt (or logs intentional variation)
- No unexpected prompt changes
- Consistency across regenerations

### Test Case 8: Template Injection Consistency

**Steps:**
1. Generate preview feed (9 scenes)
2. Generate full feed from preview
3. Verify prompts match preview aesthetic

**What to Log:**
- Preview feed prompts
- Full feed prompts
- Aesthetic consistency (colors, vibe, style)

**Success Criteria:**
- Full feed prompts match preview aesthetic
- No unexpected style changes
- Consistent outfit/location rotation

### Test Case 9: Reference Image Quality Impact

**Steps:**
1. Test with high-quality reference images (clear face, good resolution)
2. Test with low-quality reference images (blurry, no face)
3. Compare identity consistency

**What to Log:**
- Reference image quality metrics (if available)
- Identity consistency scores
- Warnings for low-quality images

**Success Criteria:**
- High-quality images produce better identity match
- Low-quality images trigger warnings
- System gracefully handles quality issues

### Test Case 10: End-to-End Identity Preservation

**Steps:**
1. User uploads 3+ reference images
2. User selects fashion style and vibe
3. Generate 9-post feed
4. Verify user looks like themselves in all 9 images

**What to Log:**
- All prompts generated
- Reference images used
- User feedback on identity match

**Success Criteria:**
- User recognizes themselves in all 9 images
- Consistent identity across feed
- No identity drift or "model-like" appearance

---

## SUMMARY

### Critical Issues Found:
1. **Identity anchor not consistently used** - HIGH RISK
2. **Brand names in prompts** - HIGH RISK
3. **No prompt length enforcement** - MEDIUM RISK
4. **Editorial language in system prompts** - MEDIUM RISK
5. **No reference image quality checks** - MEDIUM RISK

### Recommended Priority:
1. **IMMEDIATE:** Add identity anchor to all NanoBanana prompts (Change 1)
2. **IMMEDIATE:** Enforce prompt length (Change 2)
3. **IMMEDIATE:** Remove brand name instructions (Change 3)
4. **NEXT:** Remove editorial language (Change 5)
5. **FUTURE:** Add quality checks and consolidate logic (Changes 4, 6)

### Expected Impact:
- **Identity Preservation:** Significant improvement (identity anchor + length limits)
- **Consistency:** Moderate improvement (brand removal + editorial removal)
- **User Experience:** Better identity match, fewer "model-like" images
