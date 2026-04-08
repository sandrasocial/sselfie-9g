# Maya Prompt System Guide
*Last Updated: January 4, 2026*
*Post-Cleanup Documentation*

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Active Prompt Builders](#active-prompt-builders)
3. [Mode-Specific Usage](#mode-specific-usage)
4. [Intelligence Sources](#intelligence-sources)
5. [Architecture Diagram](#architecture-diagram)
6. [Cleanup Summary](#cleanup-summary)

---

## 🎯 Overview

Maya's prompt system generates AI prompts for image generation across three modes:
- **Classic Mode** (Flux LoRA): Concise prompts with trigger words
- **Pro Mode** (Nano Banana Pro): Detailed prompts with identity preservation
- **Feed Planner**: Natural language prompts for feed posts

**Key Principle:** Each mode uses different prompt builders optimized for their specific AI model requirements.

---

## 🔧 Active Prompt Builders

### 1. `prompt-constructor.ts` - Classic Mode Builder

**Location:** `lib/maya/prompt-constructor.ts`

**Purpose:** Builds prompts for Classic Mode (Flux LoRA) image generation.

**Key Functions:**
- `buildPrompt()` - Main prompt builder for Classic Mode
- `buildPromptWithFeatures()` - Enhanced version with additional features
- `validatePromptLength()` - Ensures prompt length is within limits

**Characteristics:**
- **Length:** 250-500 words
- **Format:** Trigger word + brand names + detailed descriptions
- **Style:** Technical, includes camera specs, lighting details
- **Brand Intelligence:** ✅ Uses `brand-library-2025.ts`

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (Classic Mode concepts)
- `app/api/maya/generate-image/route.ts` (Classic Mode image generation)

**Example Output:**
```
[trigger_word] Woman wearing Alo Yoga Airlift bralette in black with high support, 
Alo Yoga Airbrush leggings in matching black with sculpting high waistband, 
Nike Air Force 1 Low sneakers in triple white leather. Standing confidently 
in modern gym with floor-to-ceiling windows, natural daylight streaming in, 
soft shadows creating depth. Shot with Canon EOS R5, 85mm f/1.4 lens, 
shallow depth of field. High-fashion editorial aesthetic, athletic sophistication.
```

---

### 2. `prompt-constructor-enhanced.ts` - Pro Mode Builder

**Location:** `lib/maya/prompt-constructor-enhanced.ts`

**Purpose:** Builds enhanced prompts for Pro Mode (Nano Banana Pro) image generation.

**Key Functions:**
- `buildEnhancedPrompt()` - Main prompt builder for Pro Mode

**Characteristics:**
- **Length:** 150-400 words
- **Format:** Identity preservation + natural language + brand names
- **Style:** Editorial, natural flowing sentences
- **Brand Intelligence:** ✅ Uses `brand-library-2025.ts`

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (Pro Mode concepts - when `proMode: true`)

**Example Output:**
```
Maintain exactly the characteristics of the person in the attachment (face, visual identity). 
Do not copy the original photo. Professional editorial photography. Pinterest-style fashion portrait. 
Character consistency with provided reference images. Woman wearing oversized black wool blazer 
from The Row, charcoal wide-leg trousers from Toteme, chunky leather platform boots from 
Bottega Veneta. Standing confidently against industrial concrete wall, one hand in pocket, 
other adjusting blazer collar, strong architectural pose. Urban cityscape background with 
modern buildings and clean lines. Dramatic directional lighting creating angular shadows, 
late afternoon golden light. Shot with Canon EOS R5, 85mm f/1.4 lens, shallow depth of field. 
High-fashion editorial aesthetic, urban sophistication, contemporary street style elegance.
```

---

### 3. `nano-banana-prompt-builder.ts` - Feed Planner Builder

**Location:** `lib/maya/nano-banana-prompt-builder.ts`

**Purpose:** Builds natural language prompts for Feed Planner posts (Nano Banana Pro).

**Key Functions:**
- `buildNanoBananaPrompt()` - Main prompt builder for Feed Planner

**Characteristics:**
- **Length:** 50-80 words
- **Format:** Natural language, no trigger words, no technical specs
- **Style:** Simple, clean, Instagram-native
- **Brand Intelligence:** ⚠️ Uses `prompt-templates/high-end-brands/` (limited)

**Used By:**
- `app/api/feed-planner/create-from-strategy/route.ts` (Feed post generation)
- `app/api/feed-planner/create-strategy/route.ts` (Feed strategy generation)
- `app/api/feed/[feedId]/regenerate-post/route.ts` (Post regeneration)

**Example Output:**
```
Woman wearing cream cashmere turtleneck, high-waisted wide-leg trousers, 
minimal leather loafers. Standing by window in modern Scandinavian apartment, 
soft diffused morning light. Relaxed confident pose with hands in pockets. 
Quiet luxury aesthetic, minimalist sophistication.
```

---

### 4. `guide-prompt-handler.ts` - Guide Prompt Utility

**Location:** `lib/maya/prompt-builders/guide-prompt-handler.ts`

**Purpose:** Utility functions for handling user-provided guide prompts.

**Key Functions:**
- `extractPromptElements()` - Extracts outfit, pose, setting from guide prompts
- `mergeGuidePromptWithImages()` - Merges guide prompts with reference images
- `createVariationFromGuidePrompt()` - Creates variations of guide prompts

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)

**Note:** This is a utility, not a prompt builder. It processes user input.

---

## 🎨 Mode-Specific Usage

### Classic Mode (Flux LoRA)

**Entry Point:** `app/api/maya/generate-concepts/route.ts`

**Flow:**
1. User requests concepts in Classic Mode
2. API calls `buildPrompt()` or `buildPromptWithFeatures()` from `prompt-constructor.ts`
3. Builder uses `brand-library-2025.ts` for brand intelligence
4. Output: 250-500 word prompt with trigger word

**Key Features:**
- ✅ Trigger word included (required for Flux LoRA)
- ✅ Brand names from `brand-library-2025.ts`
- ✅ Technical camera/lighting specs
- ✅ Concise, structured format

---

### Pro Mode (Nano Banana Pro)

**Entry Point:** `app/api/maya/pro/generate-concepts/route.ts`

**Flow:**
1. User requests concepts in Pro Mode
2. API uses Maya's personality to generate natural language prompts
3. System prompt instructs Maya to use `brand-library-2025.ts` for brand variety
4. Post-processing removes markdown, ensures identity preservation phrase
5. Output: 150-400 word natural language prompt

**Key Features:**
- ✅ Identity preservation phrase (required for Nano Banana Pro)
- ✅ Brand names from `brand-library-2025.ts` (dynamic variety)
- ✅ Natural flowing sentences (no markdown)
- ✅ Editorial, Pinterest-style format

**Note:** Pro Mode doesn't use `prompt-constructor-enhanced.ts` directly. Instead, it uses Maya's AI personality with brand intelligence instructions.

---

### Feed Planner

**Entry Point:** `app/api/feed-planner/create-from-strategy/route.ts`

**Flow:**
1. User creates feed strategy
2. API calls `buildNanoBananaPrompt()` from `nano-banana-prompt-builder.ts`
3. Builder uses category detection and brand templates
4. Output: 50-80 word natural language prompt

**Key Features:**
- ✅ No trigger words
- ✅ No technical specs
- ✅ Natural language only
- ⚠️ Limited brand intelligence (uses templates, not full library)

---

## 🧠 Intelligence Sources

### Core Intelligence Files

#### `brand-library-2025.ts` ✅ PRIMARY SOURCE

**Location:** `lib/maya/brand-library-2025.ts`

**Purpose:** Contains 100+ real brand items with specific product names, colors, and details.

**Key Functions:**
- `generateCompleteOutfit()` - Generates complete outfit with brand names
- `getDetailedDescription()` - Gets detailed description of brand items

**Used By:**
- ✅ `prompt-constructor.ts` (Classic Mode)
- ✅ `prompt-constructor-enhanced.ts` (Pro Mode)
- ✅ `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode system prompt)

**Brands Included:**
- Athletic: Alo Yoga, Lululemon, Nike, Adidas
- Luxury: The Row, Bottega Veneta, Toteme, Khaite
- Casual: Everlane, COS, Arket
- And 90+ more brands

---

#### `luxury-lifestyle-settings.ts`

**Location:** `lib/maya/luxury-lifestyle-settings.ts`

**Purpose:** Lifestyle context intelligence for concept generation.

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (concept generation, not builders)

---

#### `lifestyle-contexts.ts`

**Location:** `lib/maya/lifestyle-contexts.ts`

**Purpose:** Lifestyle intelligence for concept generation.

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (concept generation, not builders)

---

#### `influencer-posing-knowledge.ts`

**Location:** `lib/maya/influencer-posing-knowledge.ts`

**Purpose:** Influencer posing intelligence for concept generation.

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (concept generation, not builders)

---

#### `instagram-location-intelligence.ts`

**Location:** `lib/maya/instagram-location-intelligence.ts`

**Purpose:** Instagram location data for concept generation.

**Used By:**
- `app/api/maya/generate-concepts/route.ts` (concept generation, not builders)

---

### Deprecated/Unused Files

#### `fashion-knowledge-2025.ts` ⚠️ NOT USED

**Location:** `lib/maya/fashion-knowledge-2025.ts`

**Status:** Contains Instagram aesthetics but NOT imported by active builders.

**Note:** Only imported by deleted `flux-prompt-builder.ts`. Not used in production.

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    A[User Request] --> B{Mode Selection}
    
    B -->|Classic Mode| C[/api/maya/generate-concepts]
    B -->|Pro Mode| D[/api/maya/pro/generate-concepts]
    B -->|Feed Planner| E[/api/feed-planner/create-from-strategy]
    
    C --> F[prompt-constructor.ts]
    F --> G[buildPrompt]
    G --> H[brand-library-2025.ts]
    H --> I[Classic Mode Prompt<br/>250-500 words<br/>Trigger word + brands]
    
    D --> J[Maya AI Personality]
    J --> K[System Prompt with<br/>brand-library-2025.ts]
    K --> L[Post-processing]
    L --> M[Pro Mode Prompt<br/>150-400 words<br/>Identity preservation + brands]
    
    E --> N[nano-banana-prompt-builder.ts]
    N --> O[buildNanoBananaPrompt]
    O --> P[prompt-templates/high-end-brands/]
    P --> Q[Feed Planner Prompt<br/>50-80 words<br/>Natural language only]
    
    style H fill:#90EE90
    style K fill:#90EE90
    style P fill:#FFE4B5
    style I fill:#87CEEB
    style M fill:#DDA0DD
    style Q fill:#F0E68C
```

---

## 🧹 Cleanup Summary

### Deleted Files (January 4, 2026)

1. **`lib/maya/flux-prompt-builder.ts`** ❌
   - Reason: Not imported anywhere in production
   - Impact: Zero (unused code)

2. **`lib/maya/prompt-builders/classic-prompt-builder.ts`** ❌
   - Reason: Not imported anywhere in production
   - Impact: Zero (unused code)

3. **`lib/maya/prompt-builders/pro-prompt-builder.ts`** ❌
   - Reason: Not imported anywhere in production
   - Impact: Zero (unused code)

4. **Studio Pro Workflow Feature** ❌
   - Deleted: 8 API routes (`/app/api/studio-pro/*`)
   - Deleted: Multiple components (`/components/studio-pro/*`)
   - Reason: Unused workflow feature (different from Pro Mode toggle)
   - Impact: Cleaner codebase, no user impact (feature wasn't used)

### Archived Files

- **330+ backup files** from December 30, 2024
- Location: `archive/backups-2024-12-30/`
- Reason: Cleanup while preserving history

### Fixed Issues

1. **Pro Mode Concept Cards** ✅
   - Issue: Prop name mismatch (`proMode` vs `studioProMode`)
   - Fix: Updated `maya-chat-interface.tsx` to pass correct prop
   - Impact: Pro Mode concept cards now render correctly

2. **localStorage Sync** ✅
   - Issue: Feed Planner used old key `mayaStudioProMode` instead of `mayaProMode`
   - Fix: Updated `sselfie-app.tsx` to use correct key
   - Impact: Mode syncs between Maya and Feed Planner

3. **Pro Mode Prompts** ✅
   - Issue: Hardcoded brand list, markdown formatting, missing identity preservation
   - Fix: Integrated `brand-library-2025.ts`, natural language output, enforced identity preservation
   - Impact: Pro Mode prompts now have brand variety and correct format

---

## 📝 Key Takeaways

1. **Three Active Builders:**
   - `prompt-constructor.ts` → Classic Mode (Flux)
   - `prompt-constructor-enhanced.ts` → Pro Mode (Nano Banana)
   - `nano-banana-prompt-builder.ts` → Feed Planner

2. **Primary Intelligence Source:**
   - `brand-library-2025.ts` is the core brand intelligence
   - Used by Classic and Pro Mode
   - Feed Planner uses limited templates

3. **Mode Differences:**
   - Classic: Trigger word + technical specs + brands
   - Pro: Identity preservation + natural language + brands
   - Feed: Natural language only (no trigger, no specs)

4. **Cleanup Impact:**
   - Removed 3 unused builders
   - Deleted Studio Pro workflow (unused)
   - Fixed Pro Mode rendering and prompts
   - Cleaner, more maintainable codebase

---

## 🔍 Where to Find Things

### Prompt Builders
- Classic Mode: `lib/maya/prompt-constructor.ts`
- Pro Mode: `lib/maya/prompt-constructor-enhanced.ts` (reference) + Maya AI personality
- Feed Planner: `lib/maya/nano-banana-prompt-builder.ts`

### Intelligence Sources
- Brand Intelligence: `lib/maya/brand-library-2025.ts` ✅ PRIMARY
- Lifestyle Context: `lib/maya/lifestyle-contexts.ts`
- Posing Knowledge: `lib/maya/influencer-posing-knowledge.ts`
- Location Intelligence: `lib/maya/instagram-location-intelligence.ts`

### API Routes
- Classic Concepts: `app/api/maya/generate-concepts/route.ts`
- Pro Concepts: `app/api/maya/pro/generate-concepts/route.ts`
- Feed Generation: `app/api/feed-planner/create-from-strategy/route.ts`

---

*End of Prompt System Guide*

