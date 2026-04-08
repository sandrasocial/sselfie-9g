# Prompt Builders Architecture

## Overview

This document maps all prompt builders in the codebase and their usage in Pro Mode vs Classic Mode.

---

## Prompt Builders Inventory

### 1. **Pro Mode Prompt Builder**
**File:** `lib/maya/pro/prompt-builder.ts`

**Function:** `buildProModePrompt()`

**Purpose:**
- Builds sophisticated 250-500 word prompts for Studio Pro Mode
- Uses real brand names, professional photography language
- Structured sections: Outfit, Pose, Lighting, Setting, Mood, Aesthetic
- Personalizes based on `userRequest` parameter

**Used In:**
- ✅ **Pro Mode ONLY**: `app/api/maya/pro/generate-concepts/route.ts` (Line 452)

**Key Features:**
- Editorial quality prompts
- Real brand names (Alo Yoga, CHANEL, Glossier, etc.)
- Category-specific outfit descriptions
- Natural poses, realistic lighting
- iPhone 15 Pro camera specs
- Personalizes based on userRequest (Pinterest style, editorial, lifestyle, luxury)

**Example Output:**
```
Professional photography. Pinterest-style portrait maintaining exactly the same physical characteristics...

Outfit: Oversized cream knit sweater, matching lounge pants, Glossier product visible on vanity...

Pose: Standing with weight on one leg, looking away naturally.

Lighting: Uneven natural lighting with mixed color temperatures.

Setting: Coastal home interior, natural textures, soft morning light through windows.

Mood: Effortless, relaxed, authentic.

Aesthetic: Pinterest-curated, dreamy aesthetic, aspirational moments, Coastal living, clean aesthetic...

Shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic amateur cellphone photo aesthetic.
```

---

### 2. **Classic Mode Prompt Constructor**
**File:** `lib/maya/prompt-constructor.ts`

**Functions:**
- `buildPrompt(params: PromptConstructorParams): string`
- `buildPromptWithFeatures(params): string`

**Purpose:**
- Builds 30-60 word prompts for Classic Mode
- Category-based prompt construction
- Uses camera specs, aesthetic references, poses based on category
- Optimized for LoRA activation

**Used In:**
- ✅ **Classic Mode ONLY**: `app/api/maya/generate-concepts/route.ts` (Lines 645, 3419)
- Used when `studioProMode === false`

**Key Features:**
- Short prompts (30-60 words) for LoRA activation
- Category-specific camera specs
- Category-specific aesthetic references
- Category-specific poses
- Natural language, not keyword stuffing
- iPhone 15 Pro specs

**Example Output:**
```
user_trigger, woman, in oversized brown leather blazer, cream cashmere turtleneck, high-waisted jeans, walking through SoHo, uneven natural lighting, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors
```

---

### 3. **Classic Mode Enhanced Prompt Constructor**
**File:** `lib/maya/prompt-constructor-enhanced.ts`

**Function:** `buildEnhancedPrompt(params: EnhancedPromptParams): string`

**Purpose:**
- Enhanced version of Classic Mode prompt constructor
- More sophisticated prompt building with additional features
- Better category handling and brand integration

**Used In:**
- ✅ **Classic Mode ONLY**: `app/api/maya/generate-concepts/route.ts` (Line 3419)
- Used for enhanced prompt generation in Classic Mode

**Key Features:**
- Enhanced category detection
- Better brand integration
- More sophisticated prompt structure
- Still 30-60 words for LoRA optimization

---

### 4. **Flux Prompt Builder (Class)**
**File:** `lib/maya/flux-prompt-builder.ts`

**Class:** `FluxPromptBuilder`

**Method:** `static generateFluxPrompt()`

**Purpose:**
- Generates intelligent FLUX prompts with Instagram aesthetics
- Uses fashion knowledge base for trend-aware prompting
- Category-specific prompting
- Handles trigger words, gender, physical preferences

**Used In:**
- ✅ **Classic Mode**: Various image generation routes
- Used for FLUX model image generation
- Not used in Pro Mode concept generation

**Key Features:**
- Instagram aesthetic integration
- Color grading by category
- Realism keywords
- Luxury urban keywords
- Instagram poses
- Urban lighting
- Hand guidance

---

### 5. **Prompt Constructor Integration**
**File:** `lib/maya/prompt-constructor-integration.ts`

**Purpose:**
- Integration layer between different prompt builders
- Handles routing between Classic and Pro Mode builders
- Legacy compatibility layer

**Used In:**
- Integration/legacy code
- May be used for backward compatibility

---

## Usage by Mode

### **Pro Mode** (`studioProMode === true`)

**API Route:** `app/api/maya/pro/generate-concepts/route.ts`

**Prompt Builder Used:**
- ✅ `buildProModePrompt()` from `lib/maya/pro/prompt-builder.ts`
- Generates 250-500 word sophisticated prompts
- Uses real brand names
- Editorial quality
- Personalizes based on userRequest

**Flow:**
1. AI generates concept titles/descriptions
2. `buildProModePrompt()` builds full 250-500 word prompt
3. Prompt includes: Outfit, Pose, Lighting, Setting, Mood, Aesthetic
4. Uses category info and userRequest for personalization

---

### **Classic Mode** (`studioProMode === false`)

**API Route:** `app/api/maya/generate-concepts/route.ts`

**Prompt Builders Used:**
- ✅ `buildPrompt()` or `buildPromptWithFeatures()` from `lib/maya/prompt-constructor.ts`
- ✅ `buildEnhancedPrompt()` from `lib/maya/prompt-constructor-enhanced.ts`
- Generates 30-60 word prompts optimized for LoRA
- Category-based construction
- Uses prompt templates and brand library

**Flow:**
1. Category detection
2. Prompt constructor builds 30-60 word prompt
3. Uses category-specific camera specs, poses, aesthetics
4. Optimized for LoRA activation

---

## Key Differences

| Feature | Pro Mode | Classic Mode |
|---------|----------|--------------|
| **Prompt Length** | 250-500 words | 30-60 words |
| **Builder Function** | `buildProModePrompt()` | `buildPrompt()` / `buildEnhancedPrompt()` |
| **File Location** | `lib/maya/pro/prompt-builder.ts` | `lib/maya/prompt-constructor.ts` |
| **Style** | Editorial, sophisticated | Optimized for LoRA |
| **Brand Names** | Real brand names (Alo, CHANEL, etc.) | Category-based, brand library |
| **Structure** | Sections (Outfit, Pose, Lighting, etc.) | Single flowing prompt |
| **Personalization** | Based on userRequest | Based on category |
| **Use Case** | Studio Pro Mode concepts | Classic Mode concepts |

---

## Summary

**Total Prompt Builders: 5**

1. ✅ **Pro Mode Prompt Builder** - `lib/maya/pro/prompt-builder.ts` (Pro Mode only)
2. ✅ **Classic Mode Prompt Constructor** - `lib/maya/prompt-constructor.ts` (Classic Mode)
3. ✅ **Classic Mode Enhanced Constructor** - `lib/maya/prompt-constructor-enhanced.ts` (Classic Mode)
4. ✅ **Flux Prompt Builder** - `lib/maya/flux-prompt-builder.ts` (Classic Mode, FLUX generation)
5. ✅ **Prompt Constructor Integration** - `lib/maya/prompt-constructor-integration.ts` (Integration layer)

**Pro Mode uses:** `buildProModePrompt()` only

**Classic Mode uses:** `buildPrompt()`, `buildEnhancedPrompt()`, `FluxPromptBuilder.generateFluxPrompt()`

**Separation:** ✅ Pro Mode and Classic Mode use completely different prompt builders - no overlap or conflicts.





