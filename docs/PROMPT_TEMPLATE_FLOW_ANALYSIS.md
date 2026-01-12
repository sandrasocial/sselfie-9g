# Prompt Template Flow Analysis

## Overview

This document explains how prompt templates work in the SSELFIE platform, from user input to Replicate API calls. The system uses different prompt generation strategies based on user type, generation mode, and context.

---

## 🔄 High-Level Flow

```
User Request
    ↓
Mode Detection (Classic vs Pro)
    ↓
Context Gathering (User Profile, Brand, Preferences)
    ↓
Prompt Generation (Maya AI or Template Builder)
    ↓
Prompt Validation & Enhancement
    ↓
Replicate API Call
    ↓
Image Generation
```

---

## 🎯 Two Main Generation Modes

### 1. **CLASSIC MODE** (Flux LoRA)
- **Model**: Flux LoRA (user's trained model)
- **Trigger Word**: Required (first word in prompt)
- **Prompt Length**: 30-60 words (optimal for LoRA activation)
- **Style**: Amateur iPhone photo aesthetic
- **Format**: `[TRIGGER_WORD], [gender], [outfit], [location], [lighting], [technical specs]`
- **Used By**: 
  - Free users
  - Classic Mode concept generation
  - Feed Planner single post generation (default)
  - Maya Chat (Classic Mode)

### 2. **PRO MODE** (Nano Banana Pro)
- **Model**: google/nano-banana-pro
- **Reference Images**: Uses user's avatar images (up to 14)
- **Prompt Length**: 50-80 words (natural language)
- **Style**: Professional photography aesthetic
- **Format**: Natural language scene description (NO trigger words)
- **Used By**:
  - Studio Pro users
  - Feed Planner Pro Mode posts
  - Studio Pro workflows

---

## 📋 Prompt Generation Sources

### A. **Maya AI Generation** (Primary Method)
**Location**: `app/api/maya/generate-feed-prompt/route.ts`

**How it works:**
1. Detects mode (Classic vs Pro) from header or body
2. Gathers user context (trigger word, gender, ethnicity, brand colors, physical preferences)
3. Calls Maya AI with mode-specific system prompt
4. Maya generates prompt based on:
   - Post type (portrait, close-up, selfie, object, flatlay, scenery)
   - Caption/content context
   - Feed position
   - Brand colors and vibe
   - User's personal brand data

**System Prompts**:
- **Classic Mode**: `lib/maya/mode-adapters.ts` → `MAYA_CLASSIC_CONFIG`
- **Pro Mode**: `lib/maya/mode-adapters.ts` → `MAYA_PRO_CONFIG`

**Key Files**:
- `lib/maya/flux-prompting-principles.ts` - Classic Mode rules
- `lib/maya/nano-banana-prompt-builder.ts` - Pro Mode rules
- `lib/maya/get-user-context.ts` - User data gathering

### B. **Template-Based Generation** (Legacy/Backup)
**Location**: `lib/maya/prompt-constructor.ts`

**How it works:**
1. Uses category detection (workout, luxury, casual, etc.)
2. Pulls outfit from `lib/maya/brand-library-2025.ts`
3. Applies camera specs and lighting from templates
4. Builds structured prompt with trigger word

**Templates Available**:
- Camera specs by category (`CAMERA_SPECS`)
- Lighting options by category (`LIGHTING_OPTIONS`)
- Aesthetic references (`AESTHETIC_REFERENCES`)

**Used By**:
- Classic Mode concept generation (backup method)
- Direct prompt building when Maya is unavailable

### C. **Brand-Specific Templates**
**Location**: `lib/maya/prompt-templates/high-end-brands/`

**Categories**:
- `wellness-brands.ts` - Alo Yoga, Lululemon
- `luxury-brands.ts` - Chanel, Dior
- `fashion-brands.ts` - Reformation, Everlane, Aritzia
- `lifestyle-brands.ts` - Glossier, Free People
- `beauty-brands.ts` - Beauty-specific
- `travel-lifestyle.ts` - Airport, travel scenarios
- `seasonal-christmas.ts` - Holiday content

**Status**: Templates exist but need prompt examples (see `CATEGORIES_AND_TEMPLATES.md`)

---

## 🔍 Detailed Flow by Use Case

### **Use Case 1: Feed Planner Single Post Generation**

**Endpoint**: `POST /api/feed/[feedId]/generate-single`

**Flow**:
1. Check `generation_mode` in `feed_posts` table
2. **If Pro Mode**:
   - Fetch user's avatar images
   - Call `/api/maya/generate-feed-prompt` with Pro Mode header
   - Generate with Nano Banana Pro
3. **If Classic Mode** (default):
   - Fetch user's trained model (trigger word, LoRA weights)
   - Call `/api/maya/generate-feed-prompt` (Classic Mode)
   - Maya generates prompt with trigger word
   - Apply trigger word prefix (`ensureTriggerWordPrefix`)
   - Apply gender validation (`ensureGenderInPrompt`)
   - Generate with Flux LoRA

**Prompt Template Used**:
- Classic: Maya generates 30-60 word prompt with trigger word
- Pro: Maya generates 50-80 word natural language prompt

**Key Files**:
- `app/api/feed/[feedId]/generate-single/route.ts`
- `app/api/maya/generate-feed-prompt/route.ts`
- `lib/replicate-helpers.ts` (trigger word & gender helpers)

---

### **Use Case 2: Maya Chat Concept Generation**

**Endpoint**: `POST /api/maya/generate-concepts`

**Flow**:
1. Detect category from user request (workout, luxury, etc.)
2. Get user context (trigger word, gender, preferences)
3. **Primary Method**: Maya AI generates prompts directly
4. **Backup Method**: Use `prompt-constructor.ts` with brand library
5. Validate prompt length (30-60 words for Classic)
6. Apply trigger word prefix
7. Return concepts with prompts

**Prompt Template Used**:
- Maya AI generation (preferred)
- Template-based with brand library (fallback)

**Key Files**:
- `app/api/maya/generate-concepts/route.ts`
- `lib/maya/prompt-constructor.ts`
- `lib/maya/brand-library-2025.ts`

---

### **Use Case 3: Studio Pro Generation**

**Endpoint**: `POST /api/studio/generate`

**Flow**:
1. Get user's trained model
2. Construct prompt: `${trigger_word} ${user_prompt}`
3. Use quality presets from `MAYA_QUALITY_PRESETS`
4. Generate 4 variations with Flux LoRA

**Prompt Template Used**:
- Simple concatenation: trigger word + user prompt
- Quality presets applied

**Key Files**:
- `app/api/studio/generate/route.ts`
- `lib/maya/quality-settings.ts`

---

### **Use Case 4: Direct Image Generation (Maya Chat)**

**Endpoint**: `POST /api/maya/generate-image`

**Flow**:
1. Receive concept prompt from Maya
2. Apply trigger word prefix
3. Apply gender validation
4. Apply highlight modifications (if needed)
5. Apply Enhanced Authenticity (if toggle ON)
6. Use quality presets by category
7. Generate with Flux LoRA

**Prompt Template Used**:
- Maya's generated prompt (from chat)
- Enhanced with trigger word, gender, authenticity modifiers

**Key Files**:
- `app/api/maya/generate-image/route.ts`
- `lib/maya/quality-settings.ts`

---

## 🎨 Prompt Structure by Mode

### **CLASSIC MODE Structure** (30-60 words)

```
[TRIGGER_WORD], [ethnicity] [gender], [physical_preferences if any], 
[outfit - material + color + garment type], 
[location - simple one-line], 
[lighting - simple natural only], 
[pose/action - natural only], 
shot on iPhone 15 Pro portrait mode, shallow depth of field, 
candid photo, amateur cellphone photo, grainy iphone photo IMG_XXXX.HEIC
```

**Example**:
```
sandra, White woman, in sage green silk blouse with relaxed fit tucked into 
high-waisted cream linen trousers, standing with hand on marble bar counter, 
looking over shoulder naturally, upscale restaurant with marble surfaces, 
uneven natural lighting, shot on iPhone 15 Pro portrait mode, shallow depth 
of field, candid photo, amateur cellphone photo
```

**Key Rules**:
- ✅ Trigger word MUST be first
- ✅ NO expressions/poses (LoRA handles this)
- ✅ NO hair color (LoRA handles this)
- ✅ NO brand names (describe aesthetic only)
- ✅ Always end with iPhone photo specs
- ✅ Include "candid photo" or "candid moment"
- ✅ Include "amateur cellphone photo"

---

### **PRO MODE Structure** (50-80 words)

```
High fashion portrait of a woman, Influencer/pinterest style of a woman 
maintaining exactly the same physical characteristics of the woman in the 
attached image (face, body, skin tone, hair, and visual identity), without 
modifications. [Natural language scene description with outfit, location, 
lighting, pose, camera specs, brand context]
```

**Example**:
```
High fashion portrait of a woman, Influencer/pinterest style of a woman 
maintaining exactly the same physical characteristics of the woman in the 
attached image (face, body, skin tone, hair, and visual identity), without 
modifications. Woman in sage green silk blouse with relaxed fit tucked into 
high-waisted cream linen trousers, standing with hand on marble bar counter, 
looking over shoulder naturally, upscale restaurant with marble surfaces and 
modern minimalist design, soft diffused natural window light creating gentle 
shadows, professional photography, 85mm lens, f/2.0 depth of field, natural 
skin texture
```

**Key Rules**:
- ✅ Identity preservation phrase at start
- ✅ NO trigger words (uses reference images)
- ✅ Natural language (not keyword stuffing)
- ✅ Professional camera specs
- ✅ Brand names allowed (e.g., "Chanel headband", "Alo Yoga set")
- ✅ Rich visual storytelling

---

## 🔧 Prompt Enhancement Functions

### **Trigger Word Prefix** (`ensureTriggerWordPrefix`)
**Location**: `lib/replicate-helpers.ts`

**Purpose**: Ensures trigger word is first in prompt

**Logic**:
- If prompt doesn't start with trigger word, prepend it
- Removes duplicate trigger words

---

### **Gender Validation** (`ensureGenderInPrompt`)
**Location**: `lib/replicate-helpers.ts`

**Purpose**: Ensures gender descriptor is present after trigger word

**Logic**:
- Checks if gender is present after trigger word
- If missing, inserts gender after trigger word
- Handles ethnicity + gender combinations

---

### **Enhanced Authenticity** (Toggle)
**Location**: `app/api/maya/generate-image/route.ts`

**Purpose**: Adds authentic iPhone aesthetic keywords

**When Applied**: User toggles "Enhanced Authenticity" ON

**Adds**:
```
, muted colors, iPhone quality, film grain, authentic cellphone photo aesthetic, 
natural skin texture with visible pores, amateur cellphone quality, visible 
sensor noise, heavy HDR glow, blown-out highlights, crushed shadows, authentic 
moment, unfiltered, real life texture
```

---

## 📊 Template Selection Logic

### **By User Type**:

| User Type | Mode | Template Source | Prompt Length |
|-----------|------|----------------|---------------|
| Free User | Classic | Maya AI | 30-60 words |
| Paid User (Classic) | Classic | Maya AI | 30-60 words |
| Paid User (Pro) | Pro | Maya AI | 50-80 words |
| Studio Pro | Pro | Maya AI | 50-80 words |

### **By Post Type**:

| Post Type | Template Used | Special Rules |
|-----------|----------------|---------------|
| Portrait | Standard user prompt | Close-up, half-body, or selfie |
| Close-Up | Standard user prompt | Face and shoulders only |
| Selfie | Standard user prompt | Close-up face portrait |
| Object | Object-only prompt | NO trigger word, NO user |
| Flatlay | Object-only prompt | NO trigger word, NO user |
| Scenery | Object-only prompt | NO trigger word, NO user |

### **By Category** (Template-Based):

| Category | Camera Specs | Lighting | Aesthetic |
|----------|--------------|----------|-----------|
| Workout | Canon EOS R6 Mark II | Bright morning sunlight | Athletic lifestyle |
| Luxury | Hasselblad X2D 100C | Dramatic spotlight | Quiet luxury |
| Casual | Fujifilm X-T5 | Soft afternoon sunlight | Casual lifestyle |
| Travel | Sony A7R V | Natural terminal lighting | Luxury travel |

---

## 🚫 Banned Words & Terms

**Quality Terms** (Auto-removed):
- "stunning", "perfect", "beautiful", "flawless"
- "high quality", "8K", "ultra realistic", "photorealistic"
- "professional photography", "DSLR", "professional camera"

**Lighting Terms** (Auto-removed):
- "perfect lighting", "studio lighting", "professional lighting"
- "clean lighting", "even lighting"

**Skin/Texture Terms** (Auto-removed):
- "smooth skin", "airbrushed", "flawless skin", "perfect skin"
- "plastic", "mannequin-like", "doll-like"

**Why**: These cause plastic/generic faces and override the user LoRA

---

## 🔄 Prompt Validation

### **Length Validation**:
- **Classic Mode**: 30-60 words (optimal for LoRA activation)
- **Pro Mode**: 50-80 words (natural language)

### **Structure Validation**:
- Trigger word present (Classic Mode only)
- Gender present
- Outfit description present
- Technical specs present

### **Quality Checks**:
- No banned words
- Natural language (not keyword stuffing)
- Specific details (not generic)

---

## 📁 Key Files Reference

### **Core Prompt Generation**:
- `app/api/maya/generate-feed-prompt/route.ts` - Feed prompt generation
- `app/api/maya/generate-concepts/route.ts` - Concept generation
- `app/api/maya/generate-image/route.ts` - Direct image generation
- `app/api/feed/[feedId]/generate-single/route.ts` - Feed single post

### **Mode Configuration**:
- `lib/maya/mode-adapters.ts` - Classic vs Pro mode configs
- `lib/maya/flux-prompting-principles.ts` - Classic Mode rules
- `lib/maya/nano-banana-prompt-builder.ts` - Pro Mode rules

### **Helpers**:
- `lib/replicate-helpers.ts` - Trigger word, gender, prompt building
- `lib/maya/get-user-context.ts` - User data gathering
- `lib/maya/quality-settings.ts` - Quality presets by category

### **Templates**:
- `lib/maya/prompt-constructor.ts` - Template-based builder
- `lib/maya/brand-library-2025.ts` - Brand intelligence
- `lib/maya/prompt-templates/` - Brand-specific templates

---

## 🎯 Summary

**Prompt Generation Strategy**:
1. **Primary**: Maya AI generates prompts dynamically based on context
2. **Secondary**: Template-based generation with brand library (backup)
3. **Enhancement**: Trigger word, gender, authenticity modifiers applied

**User Experience**:
- **Free Users**: Classic Mode (30-60 word prompts with trigger word)
- **Paid Users**: Choose Classic or Pro Mode
- **Studio Pro**: Pro Mode (50-80 word natural language prompts)

**Key Differentiators**:
- Classic Mode: Trigger word required, iPhone aesthetic, shorter prompts
- Pro Mode: Reference images, professional aesthetic, longer prompts

---

*Last Updated: January 2026*
