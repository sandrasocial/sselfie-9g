# PROMPT BUILDING PIPELINES COMPREHENSIVE AUDIT

**Date:** 2025-01-XX  
**Audit Goal:** Complete map of all prompt-building pipelines, especially "Pro" generation (NanoBanana) and prompt transforms/sanitizers, including where reference images are applied and where brand names are inserted/removed.

---

## A) SYSTEM MAP SUMMARY

### Entry Points Overview

| Entry Point ID | Route/Action | Model Provider | Primary Use Case |
|----------------|--------------|----------------|------------------|
| MAYA_CHAT_CONCEPTS | `/api/maya/generate-concepts` | Claude Sonnet 4 → FLUX/Replicate | Maya chat concept cards generation |
| MAYA_FEED_CHAT | `/api/maya/generate-feed-prompt` | Claude Sonnet 4 → FLUX/Replicate or NanoBanana | Feed planner single image generation |
| FEED_PLANNER_SINGLE | `/api/feed/[feedId]/generate-single` | FLUX/Replicate or NanoBanana | Feed planner single image generation |
| BLUEPRINT_PREVIEW | `/api/feed/[feedId]/generate-single` (preview feed) | NanoBanana | Preview feed (blueprint funnel) generation |
| BLUEPRINT_PAID_30 | `/api/blueprint/generate-paid` | NanoBanana | Paid blueprint generation (30 images) |
| MAYA_STUDIO_PRO | `/api/maya/generate-studio-pro` | NanoBanana | Studio Pro concept card generation |
| MAYA_CLASSIC_IMAGE | `/api/maya/generate-image` | FLUX/Replicate | Classic Mode concept card generation |

### Prompt Flow Architecture

```
USER INPUT
    ↓
[Entry Point Detection]
    ↓
[Mode Detection: Pro vs Classic]
    ↓
[Template Selection / Maya Generation]
    ↓
[Prompt Transformation Pipeline]
    ├─ Template Injection (brand names, locations, outfits)
    ├─ Scene Extraction (for single images from templates)
    ├─ Sanitization (markdown removal, placeholder cleanup)
    └─ Identity Preservation (trigger words for FLUX, reference images for NanoBanana)
    ↓
[Final Prompt Assembly]
    ↓
[Model Provider Call]
    ├─ FLUX/Replicate (Classic Mode)
    └─ NanoBanana Pro (Pro Mode)
    ↓
[Persistence: feed_posts.prompt, ai_images, generated_images]
```

---

## B) DETAILED PER-PIPELINE BREAKDOWN

### 1. MAYA_CHAT_CONCEPTS

**Entry Point ID:** MAYA_CHAT_CONCEPTS  
**Route/Action:** `app/api/maya/generate-concepts/route.ts:229-442`  
**Trigger/UI:** `components/sselfie/maya-chat-screen.tsx:329-452` (detects `[GENERATE_CONCEPTS]` trigger)  
**Auth/Gating:** `getAuthenticatedUser()` → `getUserByAuthId()`  
**Model Provider:** Claude Sonnet 4 (prompt generation) → FLUX/Replicate (image generation via `/api/maya/generate-image`)  
**Prompt Source:** Maya generates prompts directly using `getConceptPrompt()` from `lib/maya/concept-templates.ts`  
**Reference Images:** No reference images for concept generation (images generated separately)  
**Output Persistence:** `maya_concepts` table (prompt stored), `generated_images` or `ai_images` (image URLs)

**Prompt Graph:**

**Initial Inputs:**
- User fields: `users.gender`, `users.ethnicity`, `user_models.trigger_word`, `user_personal_brand.physical_preferences`
- Templates: `lib/maya/concept-templates.ts` (getConceptPrompt function)
- Brand library: `lib/maya/brand-library-2025.ts` (generateCompleteOutfit)

**Transform Steps:**
1. **Category Detection** (`app/api/maya/generate-concepts/route.ts:103-164`)
   - Function: `detectCategoryFromRequest()`
   - Maps user request to category (workout, casual, luxury, etc.)

2. **Brand Library Mapping** (`app/api/maya/generate-concepts/route.ts:173-232`)
   - Function: `mapCategoryForBrandLibrary()`
   - Maps category to brand library category (luxury, cozy, street-style, etc.)

3. **Prompt Constructor** (`app/api/maya/generate-concepts/route.ts:380+`)
   - Functions: `buildPrompt()` or `buildPromptWithFeatures()` from `lib/maya/prompt-constructor.ts`
   - Uses brand library for outfit generation
   - Includes trigger word for FLUX

4. **Maya Enhancement** (`app/api/maya/generate-concepts/route.ts:380+`)
   - Maya generates final prompts using concept templates
   - Applies fashion intelligence from `lib/maya/fashion-knowledge-2025.ts`
   - Applies lifestyle contexts from `lib/maya/lifestyle-contexts.ts`

**Final Prompt:**
- Assigned: `app/api/maya/generate-concepts/route.ts:380+` (Maya response)
- Logged: Console logs throughout
- Stored: `maya_concepts.prompt` column

---

### 2. MAYA_FEED_CHAT

**Entry Point ID:** MAYA_FEED_CHAT  
**Route/Action:** `app/api/maya/generate-feed-prompt/route.ts:16-1065`  
**Trigger/UI:** Called internally by `/api/feed/[feedId]/generate-single` for Classic Mode  
**Auth/Gating:** `getAuthenticatedUser()` → `getUserByAuthId()`  
**Model Provider:** Claude Sonnet 4 (prompt generation) → FLUX/Replicate or NanoBanana (based on `isProMode`)  
**Prompt Source:** Maya generates prompts directly with user context  
**Reference Images:** No reference images passed to Maya (images handled separately)  
**Output Persistence:** `feed_posts.prompt` column

**Prompt Graph:**

**Initial Inputs:**
- User fields: `users.gender`, `users.ethnicity`, `user_models.trigger_word` (Classic only), `user_personal_brand.physical_preferences`
- Feed fields: `feed_posts.post_type`, `feed_posts.caption`, `feed_posts.position`, `feed_layouts.color_palette`, `feed_layouts.brand_vibe`
- Reference prompt: `feed_posts.prompt` (if regeneration)

**Transform Steps:**
1. **Mode Detection** (`app/api/maya/generate-feed-prompt/route.ts:24-55`)
   - Checks `x-studio-pro-mode` header or `proMode` body parameter
   - Sets `isProMode` flag

2. **User Context Building** (`app/api/maya/generate-feed-prompt/route.ts:248-250`)
   - Function: `getUserContextForMaya()` from `lib/maya/get-user-context.ts`
   - Builds comprehensive user profile context

3. **System Prompt Assembly** (`app/api/maya/generate-feed-prompt/route.ts:252-505`)
   - Classic Mode: Uses `MAYA_CLASSIC_CONFIG` + `getFluxPromptingPrinciples()`
   - Pro Mode: Uses `MAYA_PRO_CONFIG` + `getNanoBananaPromptingPrinciples()`
   - Includes user context, brand colors, physical preferences

4. **Prompt Generation** (`app/api/maya/generate-feed-prompt/route.ts:506-575`)
   - Calls Claude Sonnet 4 via `streamText()`
   - Maya generates prompt based on system prompt

5. **Prompt Cleaning** (`app/api/maya/generate-feed-prompt/route.ts:581-598`)
   - Removes markdown formatting (`**`, `*`, `__`, `_`)
   - Removes prefix patterns (`FLUX PROMPT (Type - X words):`, `PROMPT:`, etc.)
   - Removes word count patterns `(X words)`
   - Removes leading separators

6. **Locked Aesthetic Mode** (`app/api/maya/generate-feed-prompt/route.ts:71-86`)
   - If `mode === 'feed-planner-background'` and `lockedAesthetic` provided
   - Uses `generateWithLockedAesthetic()` function (not shown in read file, likely at end of file)

**Final Prompt:**
- Assigned: `app/api/maya/generate-feed-prompt/route.ts:577` (after cleaning)
- Logged: Multiple console logs throughout
- Stored: Returned to caller, then stored in `feed_posts.prompt` by caller

---

### 3. FEED_PLANNER_SINGLE

**Entry Point ID:** FEED_PLANNER_SINGLE  
**Route/Action:** `app/api/feed/[feedId]/generate-single/route.ts:13-1526`  
**Trigger/UI:** `components/feed-planner/feed-post-card.tsx` (Generate button)  
**Auth/Gating:** `getAuthenticatedUserWithRetry()` → `getUserByAuthId()` → `getFeedPlannerAccess()`  
**Model Provider:** FLUX/Replicate (Classic Mode) or NanoBanana (Pro Mode)  
**Prompt Source:** Multiple sources depending on user type and feed type  
**Reference Images:** Pro Mode uses `user_avatar_images` (up to 5 images)  
**Output Persistence:** `feed_posts.prompt`, `feed_posts.prediction_id`, `feed_posts.image_url`

**Prompt Graph:**

**Initial Inputs:**
- User fields: `users.gender`, `users.ethnicity`, `user_models.trigger_word` (Classic only), `user_personal_brand.*`
- Feed fields: `feed_posts.*`, `feed_layouts.*`
- Template fields: `blueprint_photoshoot_templates` (for free/paid blueprint users)

**Transform Steps (Pro Mode Path):**

1. **Mode Detection** (`app/api/feed/[feedId]/generate-single/route.ts:162-169`)
   - Determines `generationMode` based on access: Free/PaidBlueprint → 'pro', Membership → 'classic'
   - Checks `post.generation_mode` as fallback

2. **Preview Feed Detection** (`app/api/feed/[feedId]/generate-single/route.ts:305-307`)
   - Checks `feedLayout.layout_type === 'preview'`
   - Preview feeds use full template (all 9 scenes)

3. **Prompt Source Selection** (`app/api/feed/[feedId]/generate-single/route.ts:313-1196`)
   
   **Path A: Preview Feeds** (lines 336-456)
   - Gets template: `getBlueprintPhotoshootPrompt(category, mood)` from `lib/maya/blueprint-photoshoot-templates.ts`
   - Injects dynamic content: `injectDynamicContentWithRotation()` from `lib/feed-planner/dynamic-template-injector.ts`
   - Uses full injected template (no scene extraction)
   - Saves to `feed_posts.prompt`

   **Path B: Free Users (Full Feeds)** (lines 457-659)
   - Gets template: Same as preview feeds
   - Injects dynamic content: Same injection system
   - Extracts single scene: `buildSingleImagePrompt(injectedTemplate, post.position)` from `lib/feed-planner/build-single-image-prompt.ts`
   - Saves to `feed_posts.prompt`

   **Path C: Paid Blueprint Users** (lines 660-1186)
   - Checks for preview template from preview feed (lines 667-701)
   - Extracts locked aesthetic if preview exists (lines 703-868)
   - If no preview or preview doesn't match current style:
     - Gets template and injects (same as free users) (lines 876-1029)
     - Extracts single scene (line 1014)
   - Calls Maya: `/api/maya/generate-feed-prompt` with `x-studio-pro-mode: true` (lines 1032-1162)
   - Maya receives injected template as `referencePrompt`
   - Maya generates unique prompt
   - Cleans Maya prompt (lines 1073-1086)
   - Saves to `feed_posts.prompt`

4. **Prompt Cleaning** (`app/api/feed/[feedId]/generate-single/route.ts:1214-1219`)
   - Function: `cleanBlueprintPrompt()` from `lib/feed-planner/build-single-image-prompt.ts:337-350`
   - Removes ONLY unreplaced placeholders (`{{PLACEHOLDER}}`)
   - Does NOT remove template structure (for preview feeds)

5. **NanoBanana Call** (`app/api/feed/[feedId]/generate-single/route.ts:1221-1228`)
   - Function: `generateWithNanoBanana()` from `lib/nano-banana-client.ts:30-148`
   - Passes cleaned prompt, reference images, aspect ratio, resolution

**Transform Steps (Classic Mode Path):**

1. **Model Lookup** (`app/api/feed/[feedId]/generate-single/route.ts:213-252`)
   - Fetches `user_models` with trigger word, LoRA weights, version ID

2. **Maya Enhancement** (`app/api/feed/[feedId]/generate-single/route.ts:1268-1424`)
   - Calls `/api/maya/generate-feed-prompt` (without Pro Mode header)
   - Maya generates FLUX prompt with trigger word
   - Cleans prompt (lines 1374-1389)
   - Ensures trigger word prefix (line 1394)
   - Ensures gender in prompt (line 1408)

3. **Replicate Call** (`app/api/feed/[feedId]/generate-single/route.ts:1448-1477`)
   - Builds input with `buildClassicModeReplicateInput()` from `lib/replicate-helpers.ts`
   - Creates prediction with LoRA weights

**Final Prompt:**
- Assigned: 
  - Pro Mode: `app/api/feed/[feedId]/generate-single/route.ts:1215` (after cleaning)
  - Classic Mode: `app/api/feed/[feedId]/generate-single/route.ts:1357` (after Maya + cleaning)
- Logged: Extensive console logs throughout
- Stored: `feed_posts.prompt` (lines 452, 654, 1170, 1502)

---

### 4. BLUEPRINT_PREVIEW

**Entry Point ID:** BLUEPRINT_PREVIEW  
**Route/Action:** `app/api/feed/[feedId]/generate-single/route.ts:336-456` (preview feed branch)  
**Trigger/UI:** Same as FEED_PLANNER_SINGLE, but `feedLayout.layout_type === 'preview'`  
**Auth/Gating:** Same as FEED_PLANNER_SINGLE  
**Model Provider:** NanoBanana Pro  
**Prompt Source:** Blueprint photoshoot templates with dynamic injection  
**Reference Images:** `user_avatar_images` (up to 5 images)  
**Output Persistence:** `feed_posts.prompt` (full template stored)

**Prompt Graph:**

**Initial Inputs:**
- Feed fields: `feed_layouts.feed_style` (PRIMARY), `feed_layouts.color_palette`, `feed_layouts.brand_vibe`
- User fields: `user_personal_brand.visual_aesthetic` (category), `user_personal_brand.fashion_style`
- Template: `lib/maya/blueprint-photoshoot-templates.ts` (getBlueprintPhotoshootPrompt)

**Transform Steps:**

1. **Category/Mood Selection** (`app/api/feed/[feedId]/generate-single/route.ts:340-379`)
   - PRIMARY: `feed_layouts.feed_style` → mood
   - SECONDARY: `user_personal_brand.visual_aesthetic[0]` → category
   - Default: `professional_minimal`

2. **Template Retrieval** (`app/api/feed/[feedId]/generate-single/route.ts:382-385`)
   - Function: `getBlueprintPhotoshootPrompt(category, mood)`
   - Returns full template with 9 frames

3. **Fashion Style Mapping** (`app/api/feed/[feedId]/generate-single/route.ts:391-418`)
   - Function: `mapFashionStyleToVibeLibrary()` from `lib/feed-planner/fashion-style-mapper.ts`
   - Rotates through user's selected fashion styles based on position

4. **Dynamic Injection** (`app/api/feed/[feedId]/generate-single/route.ts:423-445`)
   - Function: `injectDynamicContentWithRotation()` from `lib/feed-planner/dynamic-template-injector.ts`
   - Replaces placeholders: `{{LOCATION_*}}`, `{{OUTFIT_*}}`, `{{ACCESSORY_*}}`
   - Uses vibe library: `lib/feed-planner/vibe-library.ts`
   - Rotates through options based on user ID and position

5. **Validation** (`app/api/feed/[feedId]/generate-single/route.ts:434-439`)
   - Function: `extractPlaceholderKeys()` from `lib/feed-planner/template-placeholders.ts`
   - Ensures all placeholders replaced

6. **Full Template Storage** (`app/api/feed/[feedId]/generate-single/route.ts:448-456`)
   - Stores full injected template (not single scene)
   - Used for 9:16 aspect ratio generation (all 9 scenes in one image)

**Final Prompt:**
- Assigned: `app/api/feed/[feedId]/generate-single/route.ts:448` (full injected template)
- Logged: Console logs at lines 348, 385, 411, 420, 441, 449
- Stored: `feed_posts.prompt` (line 452)

---

### 5. BLUEPRINT_PAID_30

**Entry Point ID:** BLUEPRINT_PAID_30  
**Route/Action:** `app/api/blueprint/generate-paid/route.ts:42-249`  
**Trigger/UI:** Blueprint paid purchase flow (external, not in main app UI)  
**Auth/Gating:** Access token validation (`blueprint_subscribers.access_token`)  
**Model Provider:** NanoBanana Pro  
**Prompt Source:** Blueprint photoshoot templates (NO injection, NO Maya)  
**Reference Images:** `user_avatar_images` (1-3 images, `image_type = 'selfie'`)  
**Output Persistence:** `blueprint_subscribers.paid_blueprint_photo_urls[gridNumber-1]`

**Prompt Graph:**

**Initial Inputs:**
- Subscriber fields: `blueprint_subscribers.form_data.vibe` (category), `blueprint_subscribers.feed_style` (mood)
- Template: `lib/maya/blueprint-photoshoot-templates.ts` (getBlueprintPhotoshootPrompt)

**Transform Steps:**

1. **Category/Mood Selection** (`app/api/blueprint/generate-paid/route.ts:181-185`)
   - Category: `form_data.vibe` or default `"professional"`
   - Mood: `feed_style` or `form_data.feed_style` or default `"minimal"`

2. **Template Retrieval** (`app/api/blueprint/generate-paid/route.ts:206-220`)
   - Function: `getBlueprintPhotoshootPrompt(category, mood)`
   - Returns full template with 9 frames
   - **CRITICAL: NO injection, NO Maya, NO scene extraction**
   - Uses full template as-is

3. **NanoBanana Call** (`app/api/blueprint/generate-paid/route.ts:223-230`)
   - Function: `generateWithNanoBanana()`
   - Passes full template prompt (all 9 scenes)
   - Aspect ratio: `1:1` (single grid)
   - Resolution: `2K`

**Final Prompt:**
- Assigned: `app/api/blueprint/generate-paid/route.ts:208` (template directly)
- Logged: Console log at line 209
- Stored: Not stored in database (only image URL stored in `paid_blueprint_photo_urls` array)

**CRITICAL FINDING:** This pipeline does NOT use:
- Dynamic injection (no brand names, no location rotation)
- Scene extraction (uses full template)
- Maya generation (uses template directly)
- Prompt storage (only image URL stored)

---

### 6. MAYA_STUDIO_PRO

**Entry Point ID:** MAYA_STUDIO_PRO  
**Route/Action:** `app/api/maya/generate-studio-pro/route.ts` (file not read, referenced in grep results)  
**Trigger/UI:** Studio Pro concept card generation  
**Auth/Gating:** Standard auth  
**Model Provider:** NanoBanana Pro  
**Prompt Source:** Maya generates prompts directly  
**Reference Images:** User avatar images  
**Output Persistence:** `ai_images` table

**Note:** File not fully read, but referenced in codebase. Likely similar to MAYA_FEED_CHAT but for concept cards.

---

### 7. MAYA_CLASSIC_IMAGE

**Entry Point ID:** MAYA_CLASSIC_IMAGE  
**Route/Action:** `app/api/maya/generate-image/route.ts:22-396`  
**Trigger/UI:** Concept card "Generate" button  
**Auth/Gating:** `getAuthenticatedUser()` → `getUserByAuthId()`  
**Model Provider:** FLUX/Replicate  
**Prompt Source:** Concept prompt from Maya (already generated, stored in concept)  
**Reference Images:** Optional `referenceImageUrl` (not used for identity, only for style reference)  
**Output Persistence:** `generated_images` table (Classic Mode) or `ai_images` table (Pro Mode)

**Prompt Graph:**

**Initial Inputs:**
- Concept fields: `conceptPrompt` (from Maya, already generated)
- User fields: `users.gender`, `users.ethnicity`, `user_models.trigger_word`

**Transform Steps:**

1. **Trigger Word Enforcement** (`app/api/maya/generate-image/route.ts:153`)
   - Function: `ensureTriggerWordPrefix()` from `lib/replicate-helpers.ts`
   - Ensures trigger word is first

2. **Gender Enforcement** (`app/api/maya/generate-image/route.ts:156`)
   - Function: `ensureGenderInPrompt()` from `lib/replicate-helpers.ts`
   - Ensures gender after trigger word

3. **Highlight Modifications** (`app/api/maya/generate-image/route.ts:165-167`)
   - Adds Instagram story highlight aesthetic keywords if `isHighlight`

4. **Enhanced Authenticity** (`app/api/maya/generate-image/route.ts:171-174`)
   - Adds iPhone quality keywords if `enhancedAuthenticity === true`

**Final Prompt:**
- Assigned: `app/api/maya/generate-image/route.ts:150` (after modifications)
- Logged: Console logs at lines 158-162, 173
- Stored: `generated_images.prompt` or `ai_images.prompt`

---

## C) TEMPLATE SYSTEMS INVENTORY

### 1. Blueprint Photoshoot Templates

**File Path:** `lib/maya/blueprint-photoshoot-templates.ts`  
**Public API:** `getBlueprintPhotoshootPrompt(category, mood)`  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:382, 580, 952` (free/paid users)
- `app/api/blueprint/generate-paid/route.ts:208` (paid blueprint 30 images)

**Usage:**
- Free flows: YES (with injection)
- Paid flows: YES (with injection for feed planner, without injection for paid blueprint 30)
- Both: YES

**Structure:**
- Contains 9 frames (scenes 1-9)
- Sections: Vibe, Setting, Outfits, 9 frames, Color grade
- Placeholders: `{{LOCATION_*}}`, `{{OUTFIT_*}}`, `{{ACCESSORY_*}}`

---

### 2. Dynamic Injection System

**File Path:** `lib/feed-planner/dynamic-template-injector.ts`  
**Public API:** `injectDynamicContentWithRotation(template, vibeKey, fashionStyle, userId)`  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:423, 624, 995` (all user types for feed planner)

**Usage:**
- Free flows: YES
- Paid flows: YES (feed planner only, NOT paid blueprint 30)
- Both: YES

**Function:**
- Replaces placeholders with content from vibe library
- Rotates through options based on user ID and position
- Uses rotation manager: `lib/feed-planner/rotation-manager.ts`

---

### 3. Mood Maps

**File Path:** `lib/maya/blueprint-photoshoot-templates.ts` (MOOD_MAP export)  
**Public API:** `MOOD_MAP` object  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:383, 587, 953` (mood mapping)

**Usage:**
- Maps: `"luxury" → "dark_moody"`, `"minimal" → "light_minimalistic"`, `"beige" → "beige_aesthetic"`
- Used to build vibe keys for injection: `${category}_${moodMapped}`

---

### 4. Fashion Style Mapper

**File Path:** `lib/feed-planner/fashion-style-mapper.ts`  
**Public API:** `mapFashionStyleToVibeLibrary(fashionStyle)`  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:391, 591, 957` (fashion style mapping)

**Usage:**
- Maps user's fashion style selection to vibe library format
- Rotates through user's selected styles based on position

---

### 5. buildSingleImagePrompt (Scene Extraction)

**File Path:** `lib/feed-planner/build-single-image-prompt.ts`  
**Public API:** `buildSingleImagePrompt(templatePrompt, position)`  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:649, 1014` (free users, paid blueprint users)

**Usage:**
- Free flows: YES (extracts single scene from injected template)
- Paid flows: YES (extracts single scene before Maya generation)
- Both: YES

**Function:**
- Parses template to extract frames (1-9)
- Finds frame for requested position
- Cleans frame description based on frame type (flatlay, closeup, fullbody, midshot)
- Builds complete prompt: Base identity + Vibe + Setting + Frame + Color grade

---

### 6. Extract Aesthetic Logic

**File Path:** `lib/feed-planner/extract-aesthetic-from-template.ts`  
**Public API:** `extractAestheticFromTemplate(previewPrompt)`  
**Call Sites:**
- `app/api/feed/[feedId]/generate-single/route.ts:862` (paid blueprint users, if preview exists)

**Usage:**
- Free flows: NO
- Paid flows: YES (only if preview feed exists)
- Both: NO

**Function:**
- Extracts locked aesthetic from preview template
- Returns: vibe, colorGrade, setting, outfit, lightingQuality, assembly, baseIdentityPrompt, qualityModifiers
- Used for locked aesthetic mode in Maya generation

---

### 7. Prompt Storage

**Database Columns:**
- `feed_posts.prompt` (TEXT) - Stores final prompt after all transformations
- `maya_concepts.prompt` (TEXT) - Stores concept prompts
- `generated_images.prompt` (TEXT) - Stores Classic Mode prompts
- `ai_images.prompt` (TEXT) - Stores Pro Mode prompts

**Storage Timing:**
- Preview feeds: Stored AFTER injection, BEFORE generation (full template)
- Free users (full feeds): Stored AFTER injection + scene extraction, BEFORE generation (single scene)
- Paid blueprint users: Stored AFTER Maya generation, BEFORE generation (Maya-enhanced prompt)
- Paid blueprint 30: NOT stored (only image URL stored)

---

## D) NANOBANANA PRO SPECIFIC AUDIT

### NanoBanana Call Sites

**1. Feed Planner Single (Pro Mode)**
- **File:** `app/api/feed/[feedId]/generate-single/route.ts:1221-1228`
- **Prompt Variable:** `cleanedPrompt` (after `cleanBlueprintPrompt()`)
- **Sanitization:** `cleanBlueprintPrompt()` removes unreplaced placeholders only
- **Reference Images:** `baseImages.map(img => img.url)` (up to 5 from `user_avatar_images`)
- **Aspect Ratio:** `isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')`
- **Resolution:** `'2K'`
- **Safety Settings:** `'block_only_high'`
- **Provider Flags:** None

**2. Paid Blueprint 30 Images**
- **File:** `app/api/blueprint/generate-paid/route.ts:223-230`
- **Prompt Variable:** `templatePrompt` (full template, NO injection, NO cleaning)
- **Sanitization:** NONE (uses template directly)
- **Reference Images:** `validSelfieUrls` (1-3 from `user_avatar_images`, `image_type = 'selfie'`)
- **Aspect Ratio:** `'1:1'`
- **Resolution:** `'2K'`
- **Safety Settings:** `'block_only_high'`
- **Provider Flags:** None

**3. NanoBanana Client**
- **File:** `lib/nano-banana-client.ts:30-148`
- **Prompt Prefix:** Adds `"Generate an image of "` prefix if prompt doesn't start with generation phrase (lines 72-86)
- **Validation:** Validates prompt length, image count (max 14), image URL format

### Pro Prompt Format Consistency

**ISSUE FOUND: Multiple Formats**

1. **Feed Planner (Free/Paid):**
   - Format: Base identity prompt + Vibe + Setting + Frame description + Color grade
   - Source: Injected template → scene extraction → cleaning
   - Length: Variable (depends on template)

2. **Feed Planner (Paid Blueprint with Maya):**
   - Format: Natural language (50-80 words)
   - Source: Maya generation with injected template as reference
   - Length: 50-80 words

3. **Paid Blueprint 30:**
   - Format: Full template (all 9 scenes)
   - Source: Template directly, NO injection, NO Maya
   - Length: Full template length

**INCONSISTENCY:** Paid Blueprint 30 does NOT use injection or Maya, while feed planner does.

### Brand Name Insertion Points

**Upstream (Templates):**
- Templates contain placeholders: `{{OUTFIT_BUSINESS_1}}`, etc.
- Placeholders are replaced by dynamic injection system
- Injection uses vibe library which may contain brand names

**Downstream (Maya):**
- Maya receives injected template as `referencePrompt`
- Maya may add brand names based on fashion intelligence
- Maya uses `brand-library-2025.ts` for brand suggestions

**Both:** Brand names can be inserted at template level (injection) AND at Maya level.

### Paid Bypass Analysis

**Places where "paid" bypasses injection and uses Maya prompts:**
- `app/api/feed/[feedId]/generate-single/route.ts:1032-1162` (paid blueprint users)
- Maya receives injected template as reference, but generates NEW prompt
- Maya prompt overwrites injected template prompt

**Places where prompt is overwritten later:**
- `app/api/feed/[feedId]/generate-single/route.ts:1170` - Maya prompt overwrites stored prompt
- `app/api/feed/[feedId]/generate-single/route.ts:1235` - Cleaned prompt overwrites stored prompt before generation

---

## E) DATA SOURCE PRIORITY CONSISTENCY

### Priority Order by Pipeline

**1. Feed Planner (Free/Paid Blueprint) - Mood/FeedStyle Selection:**

**Priority (CONSISTENT across free and paid):**
1. `feed_layouts.feed_style` (PRIMARY) - Per-feed style selection
2. `user_personal_brand.settings_preference[0]` (SECONDARY) - Synced from feed style modal
3. `blueprint_subscribers.feed_style` (FALLBACK) - Legacy blueprint wizard
4. Default: `"minimal"`

**Evidence:**
- Free users: `app/api/feed/[feedId]/generate-single/route.ts:468-476, 480-520`
- Paid blueprint users: `app/api/feed/[feedId]/generate-single/route.ts:883-924`
- Preview feeds: `app/api/feed/[feedId]/generate-single/route.ts:344-350`

**2. Feed Planner - Category Selection:**

**Priority (CONSISTENT):**
1. `user_personal_brand.visual_aesthetic[0]` (PRIMARY)
2. `blueprint_subscribers.form_data.vibe` (FALLBACK for legacy)
3. Default: `"professional"`

**Evidence:**
- Free users: `app/api/feed/[feedId]/generate-single/route.ts:522-541`
- Paid blueprint users: `app/api/feed/[feedId]/generate-single/route.ts:927-946`
- Preview feeds: `app/api/feed/[feedId]/generate-single/route.ts:352-379`

**3. Fashion Style Selection:**

**Priority (CONSISTENT):**
1. `user_personal_brand.fashion_style[styleIndex]` (rotates based on position)
2. Default: `"business"`

**Evidence:**
- All user types: `app/api/feed/[feedId]/generate-single/route.ts:391-418, 591-618, 957-984`

**4. Paid Blueprint 30 - Category/Mood:**

**Priority (DIFFERENT - NO feed_style):**
1. `blueprint_subscribers.form_data.vibe` (category)
2. `blueprint_subscribers.feed_style` OR `blueprint_subscribers.form_data.feed_style` (mood)
3. Default: `"professional"` / `"minimal"`

**Evidence:**
- `app/api/blueprint/generate-paid/route.ts:181-185`

**INCONSISTENCY FOUND:** Paid Blueprint 30 does NOT check `feed_layouts.feed_style` or `user_personal_brand.settings_preference` - uses legacy `blueprint_subscribers` only.

---

## F) PERSISTENCE AND RESUME BEHAVIOR

### Prompt Storage

| Pipeline | Prompt Stored? | Column | When Stored |
|----------|----------------|--------|-------------|
| MAYA_CHAT_CONCEPTS | YES | `maya_concepts.prompt` | After Maya generation |
| MAYA_FEED_CHAT | YES (via caller) | `feed_posts.prompt` | After Maya generation, before image generation |
| FEED_PLANNER_SINGLE (Pro) | YES | `feed_posts.prompt` | After prompt generation, before NanoBanana call |
| FEED_PLANNER_SINGLE (Classic) | YES | `feed_posts.prompt` | After Maya generation, before Replicate call |
| BLUEPRINT_PREVIEW | YES | `feed_posts.prompt` | After injection, before NanoBanana call |
| BLUEPRINT_PAID_30 | NO | N/A | Not stored (only image URL stored) |
| MAYA_CLASSIC_IMAGE | YES | `generated_images.prompt` | After modifications, before Replicate call |

### Image URL Storage

| Pipeline | Image URL Stored? | Column | When Stored |
|----------|-------------------|--------|-------------|
| FEED_PLANNER_SINGLE | YES | `feed_posts.image_url` | After generation completes (via webhook/polling) |
| BLUEPRINT_PAID_30 | YES | `blueprint_subscribers.paid_blueprint_photo_urls[gridNumber-1]` | After generation completes |
| MAYA_CLASSIC_IMAGE | YES | `generated_images.selected_url` or `generated_images.image_urls[0]` | After generation completes |

### Resume Behavior

**Scenario: Refresh shows placeholder again**

**FEED_PLANNER_SINGLE:**
- If `feed_posts.prompt` exists and `feed_posts.image_url` is NULL → Regenerates image with stored prompt
- If `feed_posts.prompt` is NULL → Regenerates prompt first, then image
- **Issue:** If prompt was stored BEFORE injection but injection fails on resume → prompt may have placeholders

**BLUEPRINT_PAID_30:**
- If `paid_blueprint_photo_urls[gridNumber-1]` exists → Returns existing URL (idempotent)
- If NULL → Generates new image
- **Issue:** Prompt not stored, so cannot resume with same prompt

### Preview Prompt Storage

**Preview feeds:**
- Prompt stored AFTER injection (full template with all placeholders replaced)
- Stored at: `app/api/feed/[feedId]/generate-single/route.ts:452`

**Full feeds (free users):**
- Prompt stored AFTER injection + scene extraction (single scene)
- Stored at: `app/api/feed/[feedId]/generate-single/route.ts:654`

**Full feeds (paid blueprint users):**
- Prompt stored AFTER Maya generation (Maya-enhanced prompt)
- Stored at: `app/api/feed/[feedId]/generate-single/route.ts:1170`

**CRITICAL:** All prompts stored AFTER injection/Maya, so resume should work correctly.

---

## G) DEAD CODE / CONFLICTING PATHS

### Duplicated Logic Blocks

**1. Category/Mood Selection Logic**
- **Location 1:** `app/api/feed/[feedId]/generate-single/route.ts:340-379` (preview feeds)
- **Location 2:** `app/api/feed/[feedId]/generate-single/route.ts:463-577` (free users)
- **Location 3:** `app/api/feed/[feedId]/generate-single/route.ts:879-947` (paid blueprint users)
- **Issue:** Same logic repeated 3 times with slight variations
- **Severity:** Medium (maintenance burden)

**2. Fashion Style Mapping Logic**
- **Location 1:** `app/api/feed/[feedId]/generate-single/route.ts:391-418` (preview feeds)
- **Location 2:** `app/api/feed/[feedId]/generate-single/route.ts:591-618` (free users)
- **Location 3:** `app/api/feed/[feedId]/generate-single/route.ts:957-984` (paid blueprint users)
- **Issue:** Same logic repeated 3 times
- **Severity:** Medium (maintenance burden)

**3. Injection + Validation Logic**
- **Location 1:** `app/api/feed/[feedId]/generate-single/route.ts:423-445` (preview feeds)
- **Location 2:** `app/api/feed/[feedId]/generate-single/route.ts:624-645` (free users)
- **Location 3:** `app/api/feed/[feedId]/generate-single/route.ts:994-1010` (paid blueprint users)
- **Issue:** Same logic repeated 3 times
- **Severity:** Medium (maintenance burden)

### Conflicting Paid Paths

**Path A: Scene Extraction (REMOVED)**
- **Location:** Comment at line 325: "🔴 FIX: Removed redundant Path A (paid user scene extraction)"
- **Status:** Removed, but comment suggests it existed before
- **Current Path:** Paid users go through Path B (Maya generation)

**Path B: Maya Generation (CURRENT)**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:1032-1162`
- **Status:** Active
- **Issue:** Maya receives injected template, but generates NEW prompt (overwrites injection work)

**CONFLICT:** Paid users inject template, extract scene, then Maya generates NEW prompt → injection work is discarded.

### Unused Helpers

**1. `cleanBlueprintPrompt()` - Used but Limited**
- **File:** `lib/feed-planner/build-single-image-prompt.ts:337-350`
- **Usage:** Only removes unreplaced placeholders
- **Issue:** Does NOT clean template structure (intentional for preview feeds)
- **Status:** Used correctly, but name might be misleading

**2. `parseTemplateFrames()` - Used Internally**
- **File:** `lib/feed-planner/build-single-image-prompt.ts:27-74`
- **Usage:** Internal to `buildSingleImagePrompt()`
- **Status:** Used correctly

### Unused Templates

**None found** - All templates in `blueprint-photoshoot-templates.ts` appear to be used.

### Unreachable Branches

**1. Legacy Blueprint Fallback**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:546-577`
- **Condition:** `if (!personalBrand || personalBrand.length === 0)`
- **Status:** Reachable (fallback for users without `user_personal_brand` data)
- **Issue:** Uses `blueprint_subscribers` table (legacy)

### "Runs but Gets Overwritten Later" Situations

**1. Template Injection → Maya Overwrite**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:994-1010` (injection) → `1032-1162` (Maya)
- **Issue:** Paid blueprint users inject template and extract scene, then Maya generates NEW prompt
- **Result:** Injection work is discarded, Maya prompt used instead
- **Severity:** High (wasted computation, inconsistent behavior)

**2. Prompt Storage → Prompt Overwrite**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:1170` (store Maya prompt) → `1235` (overwrite with cleaned prompt)
- **Issue:** Prompt stored after Maya, then overwritten with cleaned version
- **Result:** Final stored prompt is cleaned version (correct, but redundant storage)
- **Severity:** Low (works correctly, just redundant)

---

## H) INCONSISTENCIES LIST (RANKED BY SEVERITY)

### CRITICAL (Must Fix Now)

**1. Paid Blueprint 30 Does NOT Use Injection or Maya**
- **Location:** `app/api/blueprint/generate-paid/route.ts:208`
- **Issue:** Uses template directly, no brand name injection, no Maya enhancement
- **Impact:** Paid blueprint 30 images have generic prompts without user personalization
- **Evidence:** Lines 206-220 show template used directly, no injection call

**2. Paid Blueprint Users: Injection Work Discarded**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:994-1010` (injection) → `1032-1162` (Maya overwrites)
- **Issue:** Template injected and scene extracted, then Maya generates NEW prompt (discards injection)
- **Impact:** Wasted computation, inconsistent with free users who use injected prompts directly
- **Evidence:** Injection at 994-1010, Maya call at 1032, Maya prompt stored at 1170 (overwrites)

**3. Inconsistent Prompt Formats for Pro Mode**
- **Location:** Multiple (see NanoBanana audit section)
- **Issue:** 
  - Feed planner free: Injected template → scene extraction
  - Feed planner paid: Injected template → scene extraction → Maya generation (new format)
  - Paid blueprint 30: Full template (no injection, no extraction, no Maya)
- **Impact:** Different prompt formats for same "Pro Mode" generation
- **Evidence:** See section D

### HIGH (Should Fix Soon)

**4. Duplicated Category/Mood Selection Logic**
- **Location:** 3 places in `generate-single/route.ts`
- **Issue:** Same logic repeated 3 times with slight variations
- **Impact:** Maintenance burden, risk of inconsistencies
- **Evidence:** Lines 340-379, 463-577, 879-947

**5. Paid Blueprint 30 Uses Legacy Data Sources**
- **Location:** `app/api/blueprint/generate-paid/route.ts:181-185`
- **Issue:** Does NOT check `feed_layouts.feed_style` or `user_personal_brand.settings_preference`
- **Impact:** Inconsistent with feed planner which uses unified wizard data
- **Evidence:** Only checks `blueprint_subscribers.form_data` and `blueprint_subscribers.feed_style`

### MEDIUM (Nice to Fix)

**6. Duplicated Fashion Style Mapping Logic**
- **Location:** 3 places in `generate-single/route.ts`
- **Issue:** Same logic repeated 3 times
- **Impact:** Maintenance burden
- **Evidence:** Lines 391-418, 591-618, 957-984

**7. Duplicated Injection + Validation Logic**
- **Location:** 3 places in `generate-single/route.ts`
- **Issue:** Same logic repeated 3 times
- **Impact:** Maintenance burden
- **Evidence:** Lines 423-445, 624-645, 994-1010

### LOW (Minor Issues)

**8. Redundant Prompt Storage**
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts:1170, 1235`
- **Issue:** Prompt stored twice (after Maya, then after cleaning)
- **Impact:** Minor performance impact, works correctly
- **Evidence:** Two UPDATE statements

---

## I) WHAT IS ACTUALLY USED IN PROD PATHS

### Production Paths (Active Users)

**1. Free Users (Feed Planner):**
- Template → Injection → Scene Extraction → NanoBanana
- **Used:** YES (primary path for free users)

**2. Paid Blueprint Users (Feed Planner):**
- Template → Injection → Scene Extraction → Maya → NanoBanana
- **Used:** YES (primary path for paid blueprint users in feed planner)

**3. Preview Feeds (All Users):**
- Template → Injection → Full Template → NanoBanana
- **Used:** YES (preview feed generation)

**4. Paid Blueprint 30 Images:**
- Template → NanoBanana (NO injection, NO Maya)
- **Used:** YES (paid blueprint purchase flow)

**5. Classic Mode (Membership Users):**
- Maya → FLUX/Replicate
- **Used:** YES (membership users with trained models)

### Dead/Unused Paths

**None found** - All paths appear to be used in production.

---

## J) SAFE MINIMAL FIXES VS LARGER REFACTOR CANDIDATES

### Safe Minimal Fixes (Can Fix Now)

**1. Extract Category/Mood Selection to Helper Function**
- **Files:** `app/api/feed/[feedId]/generate-single/route.ts`
- **Change:** Create `getCategoryAndMood(feedLayout, user)` helper
- **Risk:** Low (pure function, easy to test)
- **Impact:** Reduces duplication, ensures consistency

**2. Extract Fashion Style Mapping to Helper Function**
- **Files:** `app/api/feed/[feedId]/generate-single/route.ts`
- **Change:** Create `getFashionStyleForPosition(user, position)` helper
- **Risk:** Low (pure function, easy to test)
- **Impact:** Reduces duplication

**3. Extract Injection + Validation to Helper Function**
- **Files:** `app/api/feed/[feedId]/generate-single/route.ts`
- **Change:** Create `injectAndValidateTemplate(template, vibeKey, fashionStyle, userId)` helper
- **Risk:** Low (wraps existing logic)
- **Impact:** Reduces duplication

**4. Fix Paid Blueprint 30 to Use Unified Data Sources**
- **Files:** `app/api/blueprint/generate-paid/route.ts`
- **Change:** Check `feed_layouts.feed_style` and `user_personal_brand` before `blueprint_subscribers`
- **Risk:** Medium (may break existing paid blueprint users)
- **Impact:** Consistency with feed planner

### Larger Refactor Candidates (Requires Planning)

**1. Unify Paid Blueprint Prompt Generation**
- **Issue:** Paid blueprint 30 uses template directly, feed planner uses injection + Maya
- **Change:** Make paid blueprint 30 use same pipeline as feed planner (injection + optional Maya)
- **Risk:** High (changes core paid blueprint behavior)
- **Impact:** Consistency, better personalization
- **Requires:** Migration plan for existing paid blueprint users

**2. Resolve Injection → Maya Overwrite Conflict**
- **Issue:** Paid blueprint users inject template, then Maya overwrites it
- **Change:** Either:
  - Option A: Skip injection if Maya will be called (pass raw template to Maya)
  - Option B: Skip Maya if injection already done (use injected prompt directly)
- **Risk:** High (changes core prompt generation logic)
- **Impact:** Eliminates wasted computation, ensures consistency
- **Requires:** Decision on which path to keep

**3. Consolidate Prompt Generation Pipeline**
- **Issue:** Multiple entry points with similar but different logic
- **Change:** Create unified prompt generation service that handles all modes
- **Risk:** Very High (touches all generation paths)
- **Impact:** Single source of truth, easier maintenance
- **Requires:** Comprehensive testing, migration plan

**4. Standardize Pro Mode Prompt Format**
- **Issue:** Multiple formats for "Pro Mode" (injected template, Maya natural language, full template)
- **Change:** Define single Pro Mode prompt format, ensure all paths use it
- **Risk:** High (may break existing generations)
- **Impact:** Consistency, easier debugging
- **Requires:** Format specification, migration plan

---

## END OF AUDIT

**Total Entry Points Audited:** 7  
**Total Template Systems Found:** 7  
**Total NanoBanana Call Sites:** 2 (feed planner, paid blueprint 30)  
**Critical Inconsistencies Found:** 3  
**High Priority Inconsistencies Found:** 2  
**Dead Code Found:** 0 (all code appears to be used)  
**Conflicting Paths Found:** 1 (injection → Maya overwrite)

**Next Steps:** See Implementation Plan (to be generated after audit review).
