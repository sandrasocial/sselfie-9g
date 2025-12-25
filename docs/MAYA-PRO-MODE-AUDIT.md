# Maya Pro Mode vs Classic Mode - Prompting Pipeline Audit

**Date:** 2025-01-XX  
**Purpose:** Comprehensive audit of Maya's prompting pipeline to identify all files involved in Pro Mode vs Classic Mode, and identify cleanup opportunities for refactoring Pro Mode without breaking Classic Mode, concept cards, or core features.

---

## Executive Summary

Maya operates in two distinct modes:
- **Classic Mode**: Uses Flux model, generates concept cards, 30-60 word prompts, iPhone aesthetic
- **Pro Mode (Studio Pro)**: Uses Nano Banana Pro model, generates detailed prompts (150-400 words), professional aesthetic, supports text rendering, multi-image composition

This document maps all files involved in the prompting pipeline for both modes.

---

## 1. FILES IMPORTED TO MAYA CHAT SCREEN

### Primary Chat Component
**File:** `components/sselfie/maya-chat-screen.tsx`

**Imports Related to Prompting:**
- `lib/maya/personality.ts` - Classic mode system prompt (`MAYA_SYSTEM_PROMPT`)
- `lib/maya/pro-personality.ts` - Pro mode system prompt (`MAYA_PRO_SYSTEM_PROMPT`)
- `lib/maya/studio-pro-system-prompt.ts` - Studio Pro mode extensions (`detectStudioProIntent`, `getStudioProSystemPrompt`)
- `lib/maya/concept-templates.ts` - Shared concept templates for Studio Pro upload module
- `lib/feature-flags.ts` - Feature flag checks (`isWorkbenchModeEnabled`)

**Key Functions:**
- Calls `/api/maya/generate-concepts` for concept card generation
- Calls `/api/maya/generate-studio-pro` for Pro mode generation
- Handles `[GENERATE_CONCEPTS]` trigger from Maya responses
- Manages Studio Pro image upload module state

---

## 2. FILES THAT DECIDE HOW FINAL PROMPT GETS BUILT AND SENT

### A. Chat Route (System Prompt Selection)
**File:** `app/api/maya/chat/route.ts`

**Key Responsibilities:**
- Determines which system prompt to use (Classic vs Pro)
- Imports:
  - `lib/maya/personality.ts` - Classic mode prompt
  - `lib/maya/pro-personality.ts` - Pro mode prompt
  - `lib/maya/studio-pro-system-prompt.ts` - Pro mode extensions
  - `lib/maya/get-user-context.ts` - User context for personalization
  - `lib/feature-flags.ts` - Workbench mode detection

**Mode Detection Logic:**
- Checks `studioProMode` header/parameter
- Uses `detectStudioProIntent()` from `studio-pro-system-prompt.ts`
- Selects appropriate system prompt based on mode

**Output:**
- Streams chat responses with `[GENERATE_CONCEPTS]` triggers
- Handles guide prompts (`[USE_GUIDE_PROMPT]`)

---

### B. Concept Generation Route (Prompt Building)
**File:** `app/api/maya/generate-concepts/route.ts` (4642 lines - **LARGEST FILE**)

**Key Responsibilities:**
- Builds final prompts for concept cards
- Handles both Classic and Pro mode prompt construction
- **CRITICAL DECISION POINT:** Determines which prompt builder to use

**Imports (Prompt Building):**
- `lib/maya/prompt-constructor.ts` - Classic mode prompt builder (`buildPrompt`, `buildPromptWithFeatures`)
- `lib/maya/prompt-constructor-enhanced.ts` - Enhanced prompt builder for Pro mode (`buildEnhancedPrompt`)
- `lib/maya/prompt-builders/classic-prompt-builder.ts` - Classic mode builder
- `lib/maya/prompt-builders/pro-prompt-builder.ts` - Pro mode builder
- `lib/maya/universal-prompts/index.ts` - Universal prompts library (250-500 word prompts)
- `lib/maya/prompt-templates/high-end-brands/*` - Brand-specific templates
- `lib/maya/brand-library-2025.ts` - Brand outfit generation (`generateCompleteOutfit`)
- `lib/maya/flux-prompting-principles.ts` - Flux-specific prompting rules
- `lib/maya/nano-banana-prompt-builder.ts` - Nano Banana Pro prompting principles
- `lib/maya/prompt-builders/guide-prompt-handler.ts` - Guide prompt processing
- `lib/maya/prompt-components/*` - Component-based prompt building
- `lib/maya/post-processing/minimal-cleanup.ts` - Prompt cleanup

**Mode Detection:**
```typescript
const studioProMode = request.headers.get('x-studio-pro-mode') === 'true'
const usePromptConstructor = studioProMode && !detectedGuidePrompt && userRequest && !isUnsupportedCategory
```

**Prompt Building Flow:**
1. **Category Detection:** `detectCategoryFromRequest()` - Maps user request to category
2. **Prompt Constructor Decision:**
   - Pro Mode: Uses `buildEnhancedPrompt()` from `prompt-constructor-enhanced.ts`
   - Classic Mode: Uses `buildPrompt()` from `prompt-constructor.ts`
3. **Universal Prompts Fallback:** If constructor fails, uses `findMatchingPrompt()` from `universal-prompts/index.ts`
4. **Brand Library Integration:** Calls `generateCompleteOutfit()` for outfit details
5. **Final Assembly:** Combines all components into final prompt

**Output:**
- Returns array of `MayaConcept` objects with prompts
- Each concept includes: `title`, `description`, `category`, `prompt`, `customSettings`

---

### C. Image Generation Routes (Final Prompt Execution)

#### Classic Mode Generation
**File:** `app/api/maya/generate-image/route.ts`

**Key Responsibilities:**
- Receives concept prompt from frontend
- Adds trigger word if missing
- Applies quality presets from `lib/maya/quality-settings.ts`
- Sends to Replicate (Flux model)

**Imports:**
- `lib/maya/quality-settings.ts` - Quality presets (`MAYA_QUALITY_PRESETS`)

**Prompt Processing:**
- Ensures trigger word is at start
- Applies category-specific quality settings
- Handles enhanced authenticity toggle

---

#### Pro Mode Generation
**File:** `app/api/maya/generate-studio-pro/route.ts`

**Key Responsibilities:**
- Receives user request and input images
- Builds optimized Nano Banana Pro prompt
- Sends to Nano Banana Pro API

**Imports:**
- `lib/maya/nano-banana-prompt-builder.ts` - Pro mode prompt builder (`buildNanoBananaPrompt`)
- `lib/nano-banana-client.ts` - Nano Banana API client

**Prompt Building:**
- Calls `buildNanoBananaPrompt()` with user request and images
- Returns optimized prompt for Nano Banana Pro
- Handles up to 14 input images

---

## 3. PROMPT BUILDING LIBRARIES

### Classic Mode Prompt Builders

#### A. Flux Prompt Builder
**File:** `lib/maya/flux-prompt-builder.ts`

**Purpose:** Generates Flux-optimized prompts (30-60 words, iPhone aesthetic)

**Key Functions:**
- `FluxPromptBuilder.generateFluxPrompt()` - Main generation function
- Uses Instagram aesthetics, color grading, realism keywords

---

#### B. Classic Prompt Builder
**File:** `lib/maya/prompt-builders/classic-prompt-builder.ts`

**Purpose:** Builds Classic mode prompts with trigger words

**Key Functions:**
- `buildClassicPrompt()` - Assembles prompt with trigger word, gender, outfit, location, lighting, pose
- Output: 30-60 words, iPhone specs, authenticity markers

**Structure:**
```
[Trigger Word] + [Gender] + [Physical Preferences] + [Outfit] + [Location] + [Lighting] + [Pose] + [iPhone Specs] + [Authenticity Markers]
```

---

#### C. Prompt Constructor (Classic)
**File:** `lib/maya/prompt-constructor.ts`

**Purpose:** Main Classic mode prompt constructor

**Key Functions:**
- `buildPrompt()` - Builds prompt from components
- `buildPromptWithFeatures()` - Includes physical features
- `validatePromptLength()` - Ensures 30-60 words

**Dependencies:**
- `lib/maya/flux-prompting-principles.ts` - Flux-specific rules
- `lib/maya/fashion-knowledge-2025.ts` - Fashion intelligence
- `lib/maya/lifestyle-contexts.ts` - Lifestyle context

---

### Pro Mode Prompt Builders

#### A. Pro Prompt Builder
**File:** `lib/maya/prompt-builders/pro-prompt-builder.ts`

**Purpose:** Builds Pro mode prompts (50-80 words, professional aesthetic)

**Key Functions:**
- `buildProPrompt()` - Assembles prompt without trigger words
- Output: 50-80 words, professional photography specs

**Structure:**
```
[Image Reference] + [Brand Name] + [Outfit] + [Pose] + [Location] + [Lighting] + [Mood] + [Professional Camera Specs]
```

---

#### B. Enhanced Prompt Constructor (Pro)
**File:** `lib/maya/prompt-constructor-enhanced.ts`

**Purpose:** Enhanced prompt constructor for Pro mode

**Key Functions:**
- `buildEnhancedPrompt()` - Builds detailed prompts (150-400 words)
- Uses component-based approach
- Integrates with brand library and universal prompts

**Dependencies:**
- `lib/maya/prompt-components/*` - Component system
- `lib/maya/brand-library-2025.ts` - Brand outfit generation
- `lib/maya/universal-prompts/index.ts` - Universal prompts fallback

---

#### C. Nano Banana Prompt Builder
**File:** `lib/maya/nano-banana-prompt-builder.ts`

**Purpose:** Builds prompts optimized for Nano Banana Pro

**Key Functions:**
- `buildNanoBananaPrompt()` - Main builder function
- `getNanoBananaPromptingPrinciples()` - Returns prompting principles

**Used By:**
- `app/api/maya/generate-studio-pro/route.ts`

---

### Shared/Universal Libraries

#### A. Universal Prompts Library
**File:** `lib/maya/universal-prompts/index.ts` (1289 lines)

**Purpose:** High-quality 250-500 word prompts organized by category

**Key Functions:**
- `findMatchingPrompt()` - Finds prompt by category/tags
- `getRandomPrompts()` - Gets random prompts for category
- `getPromptsForCategory()` - Gets all prompts for category

**Categories:**
- `travel-airport` - Travel & airport prompts
- `alo-workout` - Athletic/workout prompts
- `seasonal-christmas` - Christmas/holiday prompts
- `casual-lifestyle` - Casual lifestyle prompts
- `luxury-fashion` - Luxury/fashion prompts

**Usage:**
- Used as fallback when prompt constructor doesn't match
- Referenced in Studio Pro Mode for proven results
- **Note:** These are 250-500 word prompts, primarily for Pro Mode

---

#### B. Brand Library 2025
**File:** `lib/maya/brand-library-2025.ts`

**Purpose:** Generates complete outfits based on category and brand preferences

**Key Functions:**
- `generateCompleteOutfit()` - Generates outfit description
- Supports categories: workout, travel, casual, coffee-run, street-style, cozy, home

**Used By:**
- `app/api/maya/generate-concepts/route.ts` - For outfit generation

---

#### C. Prompt Components System
**Directory:** `lib/maya/prompt-components/`

**Files:**
- `component-database.ts` - Component database
- `component-extractor.ts` - Extracts components from prompts
- `composition-builder.ts` - Builds composition elements
- `diversity-engine.ts` - Ensures diversity in prompts
- `metrics-tracker.ts` - Tracks prompt metrics
- `types.ts` - Type definitions
- `index.ts` - Main exports
- `universal-prompts-raw.ts` - Raw universal prompts data

**Purpose:** Component-based prompt building system (primarily for Pro Mode)

---

#### D. Guide Prompt Handler
**File:** `lib/maya/prompt-builders/guide-prompt-handler.ts`

**Purpose:** Handles guide prompts (`[USE_GUIDE_PROMPT]`)

**Key Functions:**
- `shouldIncludeSkinTexture()` - Determines if skin texture should be included
- `mergeGuidePromptWithImages()` - Merges guide prompt with reference images
- `extractPromptElements()` - Extracts elements from guide prompt
- `createVariationFromGuidePrompt()` - Creates variations from guide prompt

**Used By:**
- `app/api/maya/generate-concepts/route.ts` - For guide prompt processing

---

## 4. PROMPTING PRINCIPLES & KNOWLEDGE BASES

### A. Flux Prompting Principles
**File:** `lib/maya/flux-prompting-principles.ts`

**Purpose:** Flux-specific prompting rules and best practices

**Key Content:**
- Optimal prompt length: 30-60 words
- Forbidden words (causes plastic faces)
- Authentic iPhone aesthetic requirements
- Natural language guidelines
- Character likeness preservation rules

**Used By:**
- Classic mode prompt builders
- `app/api/maya/generate-concepts/route.ts`

---

### B. Nano Banana Prompting Principles
**File:** `lib/maya/nano-banana-prompt-builder.ts` (contains principles)

**Purpose:** Nano Banana Pro-specific prompting rules

**Key Content:**
- Professional photography specs
- Multi-image composition guidelines
- Text rendering instructions
- Character consistency rules

**Used By:**
- Pro mode prompt builders
- `app/api/maya/generate-studio-pro/route.ts`

---

### C. Fashion Knowledge 2025
**File:** `lib/maya/fashion-knowledge-2025.ts`

**Purpose:** Current fashion trends and intelligence

**Key Functions:**
- `getFashionIntelligencePrinciples()` - Returns fashion intelligence for prompts

**Used By:**
- Both Classic and Pro mode (when fashion context needed)

---

### D. Lifestyle Contexts
**File:** `lib/maya/lifestyle-contexts.ts`

**Purpose:** Lifestyle context intelligence

**Key Functions:**
- `getLifestyleContextIntelligence()` - Returns lifestyle context

**Used By:**
- Both Classic and Pro mode

---

### E. Influencer Posing Knowledge
**File:** `lib/maya/influencer-posing-knowledge.ts`

**Purpose:** Natural influencer posing guidelines

**Used By:**
- Both Classic and Pro mode

---

### F. Authentic Photography Knowledge
**File:** `lib/maya/authentic-photography-knowledge.ts`

**Purpose:** Authentic iPhone photography guidelines

**Used By:**
- Classic mode (iPhone aesthetic)

---

## 5. PERSONALITY & SYSTEM PROMPTS

### A. Classic Mode Personality
**File:** `lib/maya/personality.ts`

**Purpose:** Classic mode system prompt

**Key Export:**
- `MAYA_SYSTEM_PROMPT` - Full system prompt for Classic mode

**Content:**
- Chat response rules
- Prompt generation rules (30-45 words)
- LoRA preservation rules
- Intent detection
- Communication style

**Used By:**
- `app/api/maya/chat/route.ts` - When `studioProMode === false`

---

### B. Pro Mode Personality
**File:** `lib/maya/pro-personality.ts`

**Purpose:** Pro mode system prompt

**Key Export:**
- `MAYA_PRO_SYSTEM_PROMPT` - Full system prompt for Pro mode

**Content:**
- Production assistant role
- Clear next steps guidance
- Brand-aware guidance
- Concept card generation rules
- Workflow guidance

**Used By:**
- `app/api/maya/chat/route.ts` - When `studioProMode === true`

---

### C. Studio Pro System Prompt Extensions
**File:** `lib/maya/studio-pro-system-prompt.ts`

**Purpose:** Extends Maya with Studio Pro capabilities

**Key Functions:**
- `detectStudioProIntent()` - Detects if user wants Studio Pro mode
- `getStudioProSystemPrompt()` - Returns Studio Pro extensions
- `getStudioProModeGuidance()` - Returns mode-specific guidance

**Content:**
- Nano Banana Pro expertise
- Instagram aesthetics expertise
- 6 Studio Pro superpowers (brand scenes, text overlays, transformations, educational, carousels, reel covers)
- Workbench mode guidance

**Used By:**
- `app/api/maya/chat/route.ts` - Adds Studio Pro extensions to system prompt

---

### D. Enhanced Personality
**File:** `lib/maya/personality-enhanced.ts`

**Purpose:** Enhanced personality for Studio Pro (Vogue editorial expertise)

**Key Functions:**
- `getMayaPersonality()` - Returns enhanced personality string

**Content:**
- Elite AI Fashion Stylist role
- 150-400 word prompts
- Detailed sections (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)

**Used By:**
- `app/api/maya/generate-concepts/route.ts` - For Pro mode concept generation

---

### E. Shared Personality
**File:** `lib/maya/personality/shared-personality.ts`

**Purpose:** Shared personality elements between Classic and Pro

**Used By:**
- Both Classic and Pro mode

---

## 6. PROMPT TEMPLATES

### High-End Brand Templates
**Directory:** `lib/maya/prompt-templates/high-end-brands/`

**Files:**
- `index.ts` - Main exports
- `brand-registry.ts` - Brand registry and categories
- `category-mapper.ts` - Category mapping
- `fashion-brands.ts` - Fashion brand templates
- `lifestyle-brands.ts` - Lifestyle brand templates
- `luxury-brands.ts` - Luxury brand templates
- `travel-lifestyle.ts` - Travel lifestyle templates
- `seasonal-christmas.ts` - Christmas/holiday templates
- `wellness-brands.ts` - Wellness brand templates
- `beauty-brands.ts` - Beauty brand templates
- `tech-brands.ts` - Tech brand templates
- `selfies.ts` - Selfie templates

**Purpose:** Brand-specific prompt templates

**Used By:**
- `app/api/maya/generate-concepts/route.ts` - For brand-specific concept generation

---

### Other Templates
**Directory:** `lib/maya/prompt-templates/`

**Files:**
- `carousel-prompts.ts` - Carousel prompts
- `ugc-prompts.ts` - UGC prompts
- `reel-cover-prompts.ts` - Reel cover prompts
- `product-mockup-prompts.ts` - Product mockup prompts
- `brand-partnership-prompts.ts` - Brand partnership prompts
- `instagram-text-rules.ts` - Instagram text rules
- `types.ts` - Type definitions
- `helpers.ts` - Helper functions

**Purpose:** Specialized prompt templates

---

## 7. QUALITY SETTINGS & PRESETS

### Quality Settings
**File:** `lib/maya/quality-settings.ts`

**Purpose:** Quality presets for different categories

**Key Export:**
- `MAYA_QUALITY_PRESETS` - Category-specific quality settings

**Used By:**
- `app/api/maya/generate-image/route.ts` - Applies quality presets to Classic mode generations

---

## 8. POST-PROCESSING

### Minimal Cleanup
**File:** `lib/maya/post-processing/minimal-cleanup.ts`

**Purpose:** Cleans up generated prompts

**Key Functions:**
- `minimalCleanup()` - Removes unwanted elements from prompts

**Used By:**
- `app/api/maya/generate-concepts/route.ts` - Final prompt cleanup

---

## 9. TYPE GUARDS & SAFETY

### Type Guards
**File:** `lib/maya/type-guards.ts`

**Purpose:** Type guards to ensure Classic mode is never affected by Pro mode changes

**Key Functions:**
- `isStudioProMode()` - Validates Studio Pro mode flag
- `normalizeStudioProMode()` - Normalizes to boolean
- `guardClassicModeRoute()` - Guards Classic mode routes
- `guardProModeRoute()` - Guards Pro mode routes

**Used By:**
- Both Classic and Pro mode routes (safety checks)

---

## 10. USER CONTEXT & PREFERENCES

### Get User Context
**File:** `lib/maya/get-user-context.ts`

**Purpose:** Gets user context for Maya personalization

**Key Functions:**
- `getUserContextForMaya()` - Returns user context string

**Used By:**
- `app/api/maya/chat/route.ts` - Adds user context to system prompt

---

### User Preferences
**File:** `lib/maya/user-preferences.ts`

**Purpose:** User preference handling

**Used By:**
- Prompt builders (for physical preferences)

---

## 11. FILES THAT NEED CLEANUP FOR PRO MODE REFACTORING

### High Priority (Pro Mode Specific - Safe to Refactor)

1. **`lib/maya/prompt-constructor-enhanced.ts`**
   - **Why:** Pro mode specific, complex logic
   - **Risk:** Low - Only used in Pro mode
   - **Action:** Simplify, extract reusable components

2. **`lib/maya/prompt-builders/pro-prompt-builder.ts`**
   - **Why:** Pro mode specific
   - **Risk:** Low - Only used in Pro mode
   - **Action:** Consolidate with enhanced constructor

3. **`lib/maya/nano-banana-prompt-builder.ts`**
   - **Why:** Pro mode specific
   - **Risk:** Low - Only used in Pro mode
   - **Action:** Review and optimize

4. **`lib/maya/personality-enhanced.ts`**
   - **Why:** Pro mode specific personality
   - **Risk:** Low - Only used in Pro mode
   - **Action:** Merge with pro-personality.ts or consolidate

5. **`lib/maya/universal-prompts/index.ts`** (1289 lines)
   - **Why:** Large file, primarily Pro mode prompts
   - **Risk:** Medium - Used as fallback in both modes
   - **Action:** Split by category, optimize structure

6. **`lib/maya/prompt-components/*`** (Component system)
   - **Why:** Complex component system, primarily Pro mode
   - **Risk:** Medium - May be used in both modes
   - **Action:** Review usage, simplify if only Pro mode

---

### Medium Priority (Shared - Requires Careful Refactoring)

7. **`app/api/maya/generate-concepts/route.ts`** (4642 lines - **LARGEST FILE**)
   - **Why:** Massive file, handles both modes, complex logic
   - **Risk:** High - Core file for both modes
   - **Action:** 
     - Split into separate files: `generate-concepts-classic.ts` and `generate-concepts-pro.ts`
     - Extract shared utilities
     - Simplify mode detection logic
     - **CRITICAL:** Must not break Classic mode or concept cards

8. **`lib/maya/studio-pro-system-prompt.ts`**
   - **Why:** Large file, complex Studio Pro extensions
   - **Risk:** Medium - Only used in Pro mode, but referenced in chat route
   - **Action:** Split into smaller modules by capability

9. **`lib/maya/pro-personality.ts`**
   - **Why:** Large system prompt, could be modularized
   - **Risk:** Low - Only used in Pro mode
   - **Action:** Split into sections (workflows, capabilities, etc.)

---

### Low Priority (Classic Mode - Do Not Touch)

10. **`lib/maya/personality.ts`** (Classic mode)
    - **Why:** Classic mode system prompt
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

11. **`lib/maya/prompt-constructor.ts`** (Classic mode)
    - **Why:** Classic mode prompt builder
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

12. **`lib/maya/prompt-builders/classic-prompt-builder.ts`** (Classic mode)
    - **Why:** Classic mode prompt builder
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

13. **`lib/maya/flux-prompt-builder.ts`** (Classic mode)
    - **Why:** Classic mode Flux prompt builder
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

14. **`lib/maya/flux-prompting-principles.ts`** (Classic mode)
    - **Why:** Classic mode prompting principles
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

15. **`app/api/maya/generate-image/route.ts`** (Classic mode)
    - **Why:** Classic mode image generation
    - **Risk:** High - Core Classic mode file
    - **Action:** **DO NOT MODIFY** - Keep as-is for Classic mode

---

### Shared Files (Require Careful Review)

16. **`app/api/maya/chat/route.ts`**
    - **Why:** Handles both modes, mode detection logic
    - **Risk:** High - Core chat route
    - **Action:** 
      - Review mode detection logic
      - Ensure clean separation between modes
      - **CRITICAL:** Must not break Classic mode chat

17. **`components/sselfie/maya-chat-screen.tsx`**
    - **Why:** Frontend component, handles both modes
    - **Risk:** High - Core UI component
    - **Action:** 
      - Review mode-specific logic
      - Ensure clean separation
      - **CRITICAL:** Must not break Classic mode UI

18. **`lib/maya/brand-library-2025.ts`**
    - **Why:** Used by both modes for outfit generation
    - **Risk:** Medium - Shared utility
    - **Action:** Review usage, ensure compatibility with both modes

19. **`lib/maya/prompt-templates/*`**
    - **Why:** Used by both modes
    - **Risk:** Medium - Shared templates
    - **Action:** Review usage, ensure compatibility

---

## 12. REFACTORING RECOMMENDATIONS

### Phase 1: Pro Mode Isolation (Low Risk)

1. **Extract Pro Mode Prompt Building**
   - Create `lib/maya/pro-mode/` directory
   - Move Pro mode specific files:
     - `prompt-constructor-enhanced.ts` → `pro-mode/prompt-builder.ts`
     - `prompt-builders/pro-prompt-builder.ts` → `pro-mode/classic-pro-builder.ts` (or merge)
     - `nano-banana-prompt-builder.ts` → `pro-mode/nano-banana-builder.ts`
     - `personality-enhanced.ts` → `pro-mode/personality.ts` (or merge with pro-personality.ts)

2. **Split Universal Prompts**
   - Split `universal-prompts/index.ts` by category
   - Create `universal-prompts/travel.ts`, `universal-prompts/workout.ts`, etc.
   - Keep main index for exports

3. **Modularize Studio Pro System Prompt**
   - Split `studio-pro-system-prompt.ts` into:
     - `studio-pro/capabilities.ts` - 6 superpowers
     - `studio-pro/workbench-mode.ts` - Workbench guidance
     - `studio-pro/nanobanana-expertise.ts` - Nano Banana knowledge
     - `studio-pro/instagram-aesthetics.ts` - Instagram aesthetics

### Phase 2: Generate Concepts Refactoring (High Risk - Requires Testing)

4. **Split Generate Concepts Route**
   - Create `app/api/maya/generate-concepts/classic.ts` - Classic mode handler
   - Create `app/api/maya/generate-concepts/pro.ts` - Pro mode handler
   - Create `app/api/maya/generate-concepts/shared.ts` - Shared utilities
   - Update main route to delegate to appropriate handler

5. **Extract Shared Utilities**
   - Category detection → `lib/maya/shared/category-detection.ts`
   - Brand library mapping → `lib/maya/shared/brand-mapping.ts`
   - Guide prompt handling → Keep in `prompt-builders/guide-prompt-handler.ts`

### Phase 3: Cleanup & Optimization (Medium Risk)

6. **Review Component System**
   - Audit `lib/maya/prompt-components/*` usage
   - Remove if only Pro mode (move to pro-mode directory)
   - Keep if shared between modes

7. **Consolidate Personality Files**
   - Review `personality-enhanced.ts` vs `pro-personality.ts`
   - Consider merging or clearly separating concerns
   - Ensure no duplication

8. **Optimize Template System**
   - Review template usage in both modes
   - Ensure templates work for both modes
   - Consider mode-specific template variants if needed

---

## 13. CRITICAL CONSTRAINTS

### Must Not Break:

1. **Classic Mode Functionality**
   - Concept card generation must work
   - Flux prompt generation must work
   - iPhone aesthetic must be preserved
   - 30-60 word prompts must work

2. **Concept Cards**
   - Concept card generation in both modes
   - Concept card display in UI
   - Concept card editing

3. **Core Features**
   - Chat functionality
   - Image generation
   - Credit system
   - User preferences
   - Brand library integration

### Testing Requirements:

1. **Classic Mode Tests**
   - Generate concept cards in Classic mode
   - Verify prompt length (30-60 words)
   - Verify trigger word inclusion
   - Verify iPhone aesthetic

2. **Pro Mode Tests**
   - Generate concept cards in Pro mode
   - Verify prompt length (150-400 words)
   - Verify no trigger words
   - Verify professional aesthetic

3. **Integration Tests**
   - Mode switching
   - Guide prompts
   - Brand library integration
   - Universal prompts fallback

---

## 14. FILE DEPENDENCY MAP

### Classic Mode Flow:
```
maya-chat-screen.tsx
  → /api/maya/chat (personality.ts)
    → [GENERATE_CONCEPTS] trigger
      → /api/maya/generate-concepts
        → prompt-constructor.ts (Classic)
          → flux-prompting-principles.ts
          → fashion-knowledge-2025.ts
          → lifestyle-contexts.ts
        → /api/maya/generate-image
          → quality-settings.ts
          → Replicate (Flux)
```

### Pro Mode Flow:
```
maya-chat-screen.tsx
  → /api/maya/chat (pro-personality.ts + studio-pro-system-prompt.ts)
    → [GENERATE_CONCEPTS] trigger
      → /api/maya/generate-concepts
        → prompt-constructor-enhanced.ts (Pro)
          → prompt-components/*
          → brand-library-2025.ts
          → universal-prompts/index.ts
          → nano-banana-prompt-builder.ts
        → /api/maya/generate-studio-pro
          → nano-banana-prompt-builder.ts
          → Nano Banana Pro API
```

---

## 15. SUMMARY

### Total Files Audited: ~50+ files

### Pro Mode Specific (Safe to Refactor):
- `prompt-constructor-enhanced.ts`
- `prompt-builders/pro-prompt-builder.ts`
- `nano-banana-prompt-builder.ts`
- `personality-enhanced.ts`
- `universal-prompts/index.ts` (large file)
- `prompt-components/*` (if Pro only)
- `studio-pro-system-prompt.ts` (large file)
- `pro-personality.ts` (large file)

### Classic Mode Specific (Do Not Touch):
- `personality.ts`
- `prompt-constructor.ts`
- `prompt-builders/classic-prompt-builder.ts`
- `flux-prompt-builder.ts`
- `flux-prompting-principles.ts`
- `generate-image/route.ts`

### Shared (Require Careful Review):
- `generate-concepts/route.ts` (4642 lines - **CRITICAL**)
- `chat/route.ts`
- `maya-chat-screen.tsx`
- `brand-library-2025.ts`
- `prompt-templates/*`

### Key Refactoring Target:
**`app/api/maya/generate-concepts/route.ts`** - This is the largest and most complex file, handling both modes. Splitting this into mode-specific handlers would significantly improve maintainability while reducing risk of breaking Classic mode.

---

**End of Audit Document**




















