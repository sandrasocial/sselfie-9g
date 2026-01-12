# Feed Designer Prompt Generation Audit

## Overview

This document details how prompts are created in the Feed Designer (Feed Planner) for **FREE** and **PAID** users. The system uses different prompt generation strategies based on user subscription type and generation mode.

---

## 🔑 Key Decision Point: User Type Detection

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 84-167)

The system determines user type using `getFeedPlannerAccess()`:

```typescript
const access = await getFeedPlannerAccess(user.id.toString())
```

**User Types**:
- **FREE**: No paid blueprint, no membership
- **PAID BLUEPRINT**: Has paid blueprint purchase, no membership
- **MEMBERSHIP**: Has Studio Membership

---

## 🎯 Generation Mode Determination

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 162-168)

```typescript
// Free users and paid blueprint users should ALWAYS use Pro Mode (Nano Banana Pro)
// Membership users use Classic Mode (custom flux trained models)
const generationMode = (access.isFree || access.isPaidBlueprint) 
  ? 'pro' 
  : (post.generation_mode || 'classic')
```

**Decision Logic**:
- **FREE Users**: Always `'pro'` (Pro Mode)
- **PAID BLUEPRINT Users**: Always `'pro'` (Pro Mode)
- **MEMBERSHIP Users**: Uses `post.generation_mode` from database (defaults to `'classic'`)

---

## 📝 Prompt Generation Flow

### **Step 1: Check if Post Has Existing Prompt**

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 275-281)

```typescript
// Check if post already has a prompt
if (!post.prompt || post.prompt.trim().length === 0) {
  // Generate prompt based on user type
}
```

If prompt exists → Use it directly  
If prompt missing → Generate new prompt (different logic for FREE vs PAID)

---

## 🆓 FREE USER Prompt Generation

### **Mode**: Pro Mode (Nano Banana Pro)
### **Prompt Source**: Blueprint Template Library

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 285-320)

**Flow**:
1. **Detect Free User**: `access.isFree === true`
2. **Use Blueprint Templates**: Calls `lib/maya/blueprint-photoshoot-templates.ts`
3. **Template Selection**: Based on:
   - Post type (portrait, close-up, selfie, etc.)
   - Business type from user's personal brand
   - Feed position (1-9)
4. **Template Format**: Pre-built prompts from template library

**Code**:
```typescript
if (access.isFree) {
  console.log(`[v0] [GENERATE-SINGLE] Free user - using blueprint template library...`)
  
  // Get business type from personal brand
  const [brandData] = await sql`
    SELECT business_type FROM user_personal_brand 
    WHERE user_id = ${user.id} 
    LIMIT 1
  `
  
  const businessType = brandData?.business_type || "lifestyle"
  
  // Use blueprint template library
  const { getBlueprintTemplatePrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
  const templatePrompt = await getBlueprintTemplatePrompt({
    postType: post.post_type,
    businessType: businessType,
    position: post.position,
    // ... other params
  })
  
  finalPrompt = templatePrompt
}
```

**Template Library**: `lib/maya/blueprint-photoshoot-templates.ts`
- Contains pre-built prompts for different business types
- Templates are static (not AI-generated)
- Optimized for Nano Banana Pro format

**Prompt Characteristics**:
- **Length**: 50-80 words (natural language)
- **Format**: No trigger word (uses reference images instead)
- **Style**: Professional photography aesthetic
- **Content**: Business-specific styling and scenarios

**Example Template Prompt**:
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

---

## 💰 PAID BLUEPRINT USER Prompt Generation

### **Mode**: Pro Mode (Nano Banana Pro)
### **Prompt Source**: Maya AI Prompt Builder

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 321-368)

**Flow**:
1. **Detect Paid Blueprint User**: `access.isPaidBlueprint === true`
2. **Call Maya AI**: Uses `/api/maya/generate-feed-prompt` with Pro Mode
3. **Maya Generates Prompt**: AI-generated based on context
4. **Prompt Format**: Natural language, 50-80 words

**Code**:
```typescript
if (access.isPaidBlueprint) {
  console.log(`[v0] [GENERATE-SINGLE] Paid blueprint user - using Maya prompt builder (Nano Banana)...`)
  
  // Call Maya to generate Pro Mode prompt
  const mayaRequest = new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-studio-pro-mode": "true", // Pro Mode header
      "Cookie": cookieHeader,
    },
    body: JSON.stringify({
      postType: post.post_type,
      caption: post.caption,
      feedPosition: post.position,
      colorTheme: feedLayout?.color_palette,
      brandVibe: feedLayout?.brand_vibe,
      proMode: true, // Explicit Pro Mode flag
      category: post.category,
    }),
  })
  
  const mayaResponse = await generateFeedPromptHandler(mayaRequest)
  const mayaData = await mayaResponse.json()
  finalPrompt = mayaData.prompt
}
```

**Maya AI System Prompt**: `lib/maya/mode-adapters.ts` → `MAYA_PRO_CONFIG`
- **Mode**: Pro Mode
- **Prompt Length**: 50-80 words
- **Format**: Natural language (no trigger words)
- **Opening**: Identity preservation phrase required

**Prompt Characteristics**:
- **Length**: 50-80 words (natural language)
- **Format**: No trigger word (uses reference images)
- **Style**: Professional photography aesthetic
- **Content**: AI-generated based on:
  - Post type
  - Caption/content
  - Feed position
  - Brand colors
  - Brand vibe
  - User's personal brand data

**Example Maya-Generated Prompt**:
```
High fashion portrait of a woman, Influencer/pinterest style of a woman 
maintaining exactly the same physical characteristics of the woman in the 
attached image (face, body, skin tone, hair, and visual identity), without 
modifications. Woman in cream cashmere turtleneck with relaxed fit, paired 
with tailored black trousers and minimalist gold jewelry, seated at modern 
café with marble tables and natural light streaming through large windows, 
soft diffused natural window light creating gentle shadows, professional 
photography, 85mm lens, f/2.0 depth of field, natural skin texture, quiet 
luxury aesthetic
```

---

## 🎨 MEMBERSHIP USER Prompt Generation

### **Mode**: Classic Mode (Flux LoRA) - Default
### **Prompt Source**: Maya AI with Classic Mode

**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 415-576)

**Flow**:
1. **Detect Membership User**: `access.isMembership === true`
2. **Check Generation Mode**: Uses `post.generation_mode` from database (defaults to `'classic'`)
3. **Call Maya AI**: Uses `/api/maya/generate-feed-prompt` (Classic Mode, no header)
4. **Maya Generates Prompt**: AI-generated with trigger word
5. **Apply Enhancements**: 
   - Trigger word prefix (`ensureTriggerWordPrefix`)
   - Gender validation (`ensureGenderInPrompt`)
6. **Prompt Format**: 30-60 words with trigger word

**Code**:
```typescript
// Classic Mode path (Membership users)
console.log("[v0] [GENERATE-SINGLE] Classic Mode post - using trained model")

// Always use Maya's expertise to generate/enhance prompts
const mayaRequest = new NextRequest(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": cookieHeader,
    // NO x-studio-pro-mode header = Classic Mode
  },
  body: JSON.stringify({
    postType: post.post_type,
    caption: post.caption,
    feedPosition: post.position,
    colorTheme: feedLayout?.color_palette,
    brandVibe: feedLayout?.brand_vibe,
    referencePrompt: post.prompt,
    isRegeneration: true,
    category: post.category,
    // NO proMode flag = Classic Mode
  }),
})

const mayaResponse = await generateFeedPromptHandler(mayaRequest)
const mayaData = await mayaResponse.json()
let finalPrompt = mayaData.prompt || mayaData.enhancedPrompt

// Apply trigger word prefix
finalPrompt = ensureTriggerWordPrefix(finalPrompt, model.trigger_word)

// Apply gender validation
finalPrompt = ensureGenderInPrompt(finalPrompt, model.trigger_word, userGender, model.ethnicity)
```

**Maya AI System Prompt**: `lib/maya/mode-adapters.ts` → `MAYA_CLASSIC_CONFIG`
- **Mode**: Classic Mode
- **Prompt Length**: 30-60 words
- **Format**: Trigger word + gender + outfit + location + lighting + technical specs
- **Opening**: Trigger word required (first word)

**Prompt Characteristics**:
- **Length**: 30-60 words (optimal for LoRA activation)
- **Format**: Trigger word first, then gender, then description
- **Style**: Amateur iPhone photo aesthetic
- **Content**: AI-generated based on:
  - Post type
  - Caption/content
  - Feed position
  - Brand colors
  - Brand vibe
  - User's trigger word
  - User's gender/ethnicity
  - User's physical preferences

**Example Maya-Generated Prompt**:
```
sandra, White woman, in sage green silk blouse with relaxed fit tucked into 
high-waisted cream linen trousers, standing with hand on marble bar counter, 
looking over shoulder naturally, upscale restaurant with marble surfaces, 
uneven natural lighting, shot on iPhone 15 Pro portrait mode, shallow depth 
of field, candid photo, amateur cellphone photo
```

---

## 🔄 Complete Flow Diagram

```
User Clicks "Generate Image"
    ↓
Check User Access (getFeedPlannerAccess)
    ↓
Determine Generation Mode
    ├─ FREE → 'pro' (Pro Mode)
    ├─ PAID BLUEPRINT → 'pro' (Pro Mode)
    └─ MEMBERSHIP → 'classic' (Classic Mode, default)
    ↓
Check if Post Has Prompt
    ├─ Has Prompt → Use Existing
    └─ No Prompt → Generate New
        ↓
        FREE USER:
        ├─ Get Business Type
        ├─ Call Blueprint Template Library
        └─ Use Template Prompt
        ↓
        PAID BLUEPRINT USER:
        ├─ Call Maya AI (Pro Mode)
        ├─ Pass: postType, caption, position, colors, vibe
        └─ Get AI-Generated Prompt
        ↓
        MEMBERSHIP USER:
        ├─ Call Maya AI (Classic Mode)
        ├─ Pass: postType, caption, position, colors, vibe
        ├─ Get AI-Generated Prompt
        ├─ Apply Trigger Word Prefix
        └─ Apply Gender Validation
    ↓
Send to Replicate API
    ├─ Pro Mode → Nano Banana Pro (with reference images)
    └─ Classic Mode → Flux LoRA (with trigger word)
```

---

## 📊 Comparison Table

| Aspect | FREE User | PAID BLUEPRINT User | MEMBERSHIP User |
|--------|-----------|-------------------|-----------------|
| **Generation Mode** | Pro Mode | Pro Mode | Classic Mode |
| **Prompt Source** | Blueprint Templates | Maya AI | Maya AI |
| **Prompt Length** | 50-80 words | 50-80 words | 30-60 words |
| **Trigger Word** | ❌ No | ❌ No | ✅ Yes (required) |
| **Reference Images** | ✅ Yes (avatar images) | ✅ Yes (avatar images) | ❌ No (uses LoRA) |
| **AI Generation** | ❌ No (templates) | ✅ Yes | ✅ Yes |
| **Customization** | Limited (templates) | High (AI-generated) | High (AI-generated) |
| **Model Used** | Nano Banana Pro | Nano Banana Pro | Flux LoRA |
| **Credits Cost** | 2 credits | 2 credits | 1 credit |
| **Aspect Ratio** | 9:16 (free) | 4:5 (paid) | 4:5 (paid) |

---

## 🔍 Detailed Code Locations

### **Main Generation Endpoint**
- **File**: `app/api/feed/[feedId]/generate-single/route.ts`
- **Function**: `POST` handler
- **Key Sections**:
  - Line 84-91: Access control check
  - Line 162-168: Generation mode determination
  - Line 233-234: Route to Pro Mode or Classic Mode
  - Line 285-320: FREE user prompt generation (templates)
  - Line 321-368: PAID BLUEPRINT user prompt generation (Maya AI)
  - Line 415-576: MEMBERSHIP user prompt generation (Maya AI Classic)

### **Access Control**
- **File**: `lib/feed-planner/access-control.ts`
- **Function**: `getFeedPlannerAccess()`
- **Returns**: User access flags (isFree, isPaidBlueprint, isMembership)

### **Maya AI Prompt Generation**
- **File**: `app/api/maya/generate-feed-prompt/route.ts`
- **Function**: `POST` handler
- **Key Sections**:
  - Line 21-29: Pro Mode detection (header or body flag)
  - Line 96-134: User context gathering (trigger word, gender, ethnicity)
  - Line 200-400: System prompt construction (Classic vs Pro)
  - Line 400-600: Maya AI call with mode-specific prompts

### **Blueprint Templates**
- **File**: `lib/maya/blueprint-photoshoot-templates.ts`
- **Function**: `getBlueprintTemplatePrompt()`
- **Purpose**: Returns pre-built prompts for FREE users

### **Mode Adapters**
- **File**: `lib/maya/mode-adapters.ts`
- **Exports**: `MAYA_CLASSIC_CONFIG`, `MAYA_PRO_CONFIG`, `getMayaSystemPrompt()`
- **Purpose**: Mode-specific system prompts for Maya AI

### **Prompt Helpers**
- **File**: `lib/replicate-helpers.ts`
- **Functions**: 
  - `ensureTriggerWordPrefix()` - Ensures trigger word is first
  - `ensureGenderInPrompt()` - Ensures gender is present
  - `buildClassicModeReplicateInput()` - Builds Replicate input for Classic Mode

---

## 🎯 Key Differences Summary

### **FREE Users**:
1. **Always Pro Mode** (forced, regardless of post.generation_mode)
2. **Template-Based Prompts** (not AI-generated)
3. **Blueprint Template Library** (pre-built prompts)
4. **9:16 Aspect Ratio** (vertical, mobile-first)
5. **2 Credits Per Image** (Pro Mode cost)

### **PAID BLUEPRINT Users**:
1. **Always Pro Mode** (forced, regardless of post.generation_mode)
2. **AI-Generated Prompts** (Maya AI with Pro Mode)
3. **Maya Prompt Builder** (dynamic generation)
4. **4:5 Aspect Ratio** (square, Instagram standard)
5. **2 Credits Per Image** (Pro Mode cost)

### **MEMBERSHIP Users**:
1. **Classic Mode** (default, can be changed per post)
2. **AI-Generated Prompts** (Maya AI with Classic Mode)
3. **Maya Prompt Builder** (dynamic generation)
4. **Trigger Word Required** (first word in prompt)
5. **4:5 Aspect Ratio** (square, Instagram standard)
6. **1 Credit Per Image** (Classic Mode cost)

---

## 🔧 Prompt Enhancement Process

### **For FREE & PAID BLUEPRINT (Pro Mode)**:
1. Get prompt from template or Maya AI
2. No trigger word needed (uses reference images)
3. Send directly to Nano Banana Pro

### **For MEMBERSHIP (Classic Mode)**:
1. Get prompt from Maya AI
2. **Apply Trigger Word Prefix**:
   - Check if prompt starts with trigger word
   - If not, prepend: `${triggerWord}, ${prompt}`
3. **Apply Gender Validation**:
   - Check if gender is present after trigger word
   - If not, insert: `${triggerWord}, ${gender}, ${restOfPrompt}`
4. Send to Flux LoRA with trigger word

---

## 📝 Example Prompts by User Type

### **FREE User (Template-Based)**:
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

### **PAID BLUEPRINT User (Maya AI-Generated)**:
```
High fashion portrait of a woman, Influencer/pinterest style of a woman 
maintaining exactly the same physical characteristics of the woman in the 
attached image (face, body, skin tone, hair, and visual identity), without 
modifications. Woman in cream cashmere turtleneck with relaxed fit, paired 
with tailored black trousers and minimalist gold jewelry, seated at modern 
café with marble tables and natural light streaming through large windows, 
soft diffused natural window light creating gentle shadows, professional 
photography, 85mm lens, f/2.0 depth of field, natural skin texture, quiet 
luxury aesthetic, cohesive with neutral tones color palette
```

### **MEMBERSHIP User (Maya AI-Generated, Classic Mode)**:
```
sandra, White woman, in sage green silk blouse with relaxed fit tucked into 
high-waisted cream linen trousers, standing with hand on marble bar counter, 
looking over shoulder naturally, upscale restaurant with marble surfaces, 
uneven natural lighting, shot on iPhone 15 Pro portrait mode, shallow depth 
of field, candid photo, amateur cellphone photo
```

---

## 🚨 Important Notes

1. **FREE users are FORCED to Pro Mode** - They cannot use Classic Mode even if they have a trained model
2. **PAID BLUEPRINT users are FORCED to Pro Mode** - They cannot use Classic Mode
3. **MEMBERSHIP users default to Classic Mode** - But can use Pro Mode if `post.generation_mode = 'pro'`
4. **Template prompts are static** - FREE users get pre-built prompts, not AI-generated
5. **Maya AI prompts are dynamic** - PAID BLUEPRINT and MEMBERSHIP users get AI-generated prompts based on context
6. **Trigger word is ONLY for Classic Mode** - Pro Mode uses reference images instead
7. **Aspect ratio differs** - FREE users get 9:16, PAID users get 4:5

---

*Last Updated: January 2026*
*Audit Date: January 2026*
