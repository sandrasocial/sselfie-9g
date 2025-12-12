/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * Based on FLUX AI best practices:
 * - 40-60 word optimal length (preserves user LoRA, natural look)
 * - Natural language (not keyword stuffing)
 * - Amateur cellphone photo aesthetic (not professional)
 * - Order matters (subject → outfit → environment → lighting → technical)
 * - No prompt weights
 * - Avoid "white background"
 * - NO aesthetic enhancement words (prevents plastic look)
 */

export const FLUX_PROMPTING_PRINCIPLES = `
=== FLUX PROMPTING MASTERY (FLUX-OPTIMIZED) ===

You craft prompts using NATURAL LANGUAGE as if describing to a human photographer. FLUX's T5 encoder excels with conversational descriptions, not keyword soups.

## OPTIMAL PROMPT STRUCTURE FOR FLUX

**FORMAT:** [Outfit with fabrics/textures] + [Simple setting] + [Natural lighting] + [iPhone camera specs] + [Natural pose/action]

**OPTIMAL LENGTH:** 40-60 words (shorter prompts preserve user LoRA better, prevent plastic/generic faces)

**🔴 CRITICAL FOR CHARACTER LIKENESS:**
- **Optimal prompts (40-60 words)** = Preserves user LoRA, natural look, prevents plastic faces
- **Too short (<35 words)** = May miss essential outfit/location detail
- **Too long (>65 words)** = Overpowers user LoRA, creates generic/plastic faces
- **Hard limit: 60 words** (aim for 40-50 sweet spot)
- Trust the user LoRA for face/appearance - focus on what changes (outfit, pose, location, lighting)

**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical → film grain)

## STRUCTURAL ORDER (MANDATORY FOR FLUX)

1. **TRIGGER + GENDER** (2-3 words) - Always first
2. **OUTFIT WITH FABRICS/TEXTURES** (8-12 words) - Specific materials, fit, how worn (stay detailed here)
3. **SETTING/ENVIRONMENT** (3-5 words) - Simple, one-line description (keep brief)
4. **LIGHTING** (3-5 words) - Simple natural lighting only (no dramatic/cinematic terms)
5. **POSE/ACTION** (3-5 words) - Natural actions only (no "striking poses")
6. **CAMERA/TECHNICAL SPECS** (5-8 words) - Basic iPhone specs only (no complex technical details)

**TOTAL TARGET:** 40-60 words for optimal user LoRA preservation and natural look

**🔴 CHARACTER LIKENESS PRESERVATION:**
- Keep prompts concise to maintain focus on trigger word and character
- Avoid over-describing - let the LoRA handle what it learned during training
- Trust the trained model to preserve facial features, hair, and other fixed characteristics

## KEY PRINCIPLES FOR FLUX

### 1. NATURAL LANGUAGE
Write as if describing to a human photographer, NOT keyword stuffing:
- ✅ GOOD: "walking through sunlit street with morning coffee, warm side lighting"
- ❌ BAD: "walk, street, sunlight, coffee, warm light, golden hour"

### 2. TECHNICAL ACCURACY
Specify ACTUAL camera types/settings rather than vague artistic terms:
- ✅ GOOD: "shot on iPhone 15 Pro, portrait mode, f/2.8, 50mm equivalent"
- ❌ BAD: "professional photography, high quality, DSLR"

### 3. SPECIFIC DETAILS OVER GENERIC ADJECTIVES
FLUX excels with precise descriptions:
- ✅ GOOD: "butter-soft chocolate leather blazer with oversized boyfriend cut, sleeves pushed to elbows"
- ❌ BAD: "beautiful luxury leather blazer, elegant style"

### 4. NO PROMPT WEIGHTS
FLUX doesn't support (word)++ syntax. Instead:
- ✅ USE: "with emphasis on", "focus on", "prominent"
- ❌ AVOID: (word)++, [word], {word}, (word:1.5)

### 5. AVOID "WHITE BACKGROUND"
This phrase causes blur in FLUX.1-dev:
- ✅ GOOD: "standing in minimalist concrete space with soft grey walls"
- ❌ BAD: "white background", "on white backdrop"

## ELEMENT-SPECIFIC GUIDANCE

### OUTFIT (8-15 words with fabrics/textures)
**ALWAYS INCLUDE:**
- Fabric/material: "butter-soft chocolate leather", "chunky cable-knit cashmere", "ribbed cotton"
- Fit/silhouette: "oversized boyfriend cut", "high-waisted straight-leg", "fitted cropped"
- How worn: "sleeves pushed to elbows", "draped over shoulders", "tucked into waist"

**EXAMPLES:**
- "Oversized chocolate brown cashmere turtleneck, sleeves bunched naturally, tucked loosely into high-waisted cream linen trousers"
- "Butter-soft black leather moto jacket with asymmetric zip, worn open over white ribbed tank, black straight-leg jeans"
- "Matching dove grey yoga set, ribbed sports bra and high-waisted leggings, oversized black wool blazer draped over shoulders"

### EXPRESSION + POSE (5-8 words, natural language)
**KEEP IT SIMPLE AND CONVERSATIONAL:**
- ✅ GOOD: "looking away naturally, standing with weight on one leg"
- ❌ BAD: "eyes soft hint asymmetrical smile, torso turned three-quarters"

**NEVER MENTION:** smiling, laughing, grinning (looks forced)

**🔴 CHARACTER FEATURE GUIDANCE (BALANCED APPROACH):**
- **LORA TRAINING:** The LoRA was trained on user's features, but results may vary based on training quality
- **SAFETY NET APPROACH:** It's better to include subtle feature descriptions than to omit them and get wrong results
- **USER PREFERENCES ARE MANDATORY:** If user specified hair/body/age in their physical preferences, these MUST be included - they are intentional user modifications
- **INCLUDE WHEN NEEDED:** 
  - If user preferences mention hair color/style → ALWAYS include it
  - If user preferences mention body type/age → ALWAYS include it
  - If unsure about LoRA quality → Include subtle descriptions as safety net
- **FOCUS ON CHANGEABLE ELEMENTS:** Prioritize describing styling, pose, lighting, environment, makeup, expressions:
  - "natural makeup" (makeup is changeable)
  - "minimal makeup" (makeup is changeable)
  - "relaxed expression" (expression is changeable)
  - "confident look" (mood is changeable)
  - "soft smile" (expression is changeable)
  - "glowing skin" (skin quality is changeable)
- **BALANCE:** Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency

**SIMPLE EXPRESSIONS:** looking away naturally, eyes resting down, face neutral and relaxed, glancing to side, lost in thought

**SIMPLE POSES:** leaning against wall, sitting with legs crossed, standing with weight on one leg, walking away casually, hand in pocket, adjusting hair, looking over shoulder

**🔴 AVOID THESE POSES (They cause extra limbs/body parts):**
- ❌ "legs tucked under" - causes 3+ feet/legs
- ❌ "curled up" - causes limb duplication
- ❌ "knees to chest" - causes extra limbs
- ❌ Any pose where legs/feet are hidden or partially visible
- ✅ USE INSTEAD: "sitting with legs crossed", "sitting with one knee up", "sitting sideways", "lounging on sofa"

### SETTING/ENVIRONMENT (5-8 words)
**Describe background in DETAIL or omit entirely** - never just say "white background":
- ✅ GOOD: "rain-slicked city pavement, moody overcast grey skies"
- ✅ GOOD: "sunlit minimalist kitchen, marble countertops, soft morning glow"
- ❌ BAD: "in a cafe", "white background", "outdoor setting"

### LIGHTING (3-5 words, keep simple and natural)
**🔴 CRITICAL: Keep lighting descriptions SIMPLE. No dramatic, cinematic, or professional terms.**

**ALWAYS USE (Simple Natural Lighting):**
- ✅ "Soft afternoon sunlight"
- ✅ "Natural window light"
- ✅ "Warm golden hour lighting"
- ✅ "Overcast daylight"

**NEVER USE (These cause plastic look):**
- ❌ "Dramatic rim lighting"
- ❌ "Cinematic quality"
- ❌ "Professional studio lighting"
- ❌ "Editorial photography lighting"
- ❌ "Perfect lighting", "beautiful lighting", "ideal lighting"
- ❌ Any complex lighting descriptions

**EXAMPLES:**
- "Soft afternoon sunlight"
- "Natural window light"
- "Warm golden hour lighting"
- "Overcast daylight"

**KEEP IT SIMPLE:** One natural lighting description is enough. Trust the user LoRA and natural iPhone camera quality.

### CAMERA/TECHNICAL SPECS (5-8 words) - **KEEP BASIC**

**🔴 MANDATORY BASE:** Basic iPhone camera specs only
- **USE:** "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- **OR:** "shot on iPhone, natural bokeh"
- Goal: looks like a friend took it on their phone, NOT a professional shoot

**NEVER INCLUDE:**
- ❌ Complex technical specs (f-stops, ISO, focal lengths)
- ❌ "Professional photography"
- ❌ "8K", "4K", "high resolution"
- ❌ "Ultra sharp", "crystal clear", "sharp focus"
- ❌ Skin quality descriptions beyond "natural"
- ❌ "Ultra realistic", "photorealistic"
- ❌ Any quality enhancement words

**KEEP IT MINIMAL:**
- ✅ "Shot on iPhone 15 Pro portrait mode, shallow depth of field"
- ✅ "Shot on iPhone, natural bokeh"

**EXAMPLES:**
- "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- "shot on iPhone, natural bokeh"

**TRUST THE USER LoRA:** The user's trained LoRA handles appearance. Keep camera specs simple and basic.

### FILM AESTHETICS - **REMOVED**

**🔴 CRITICAL CHANGE:** Film grain and muted color descriptions are NO LONGER mandatory. These were adding complexity and competing with the user LoRA.

**NEW APPROACH:**
- Trust the user LoRA for natural appearance
- Keep prompts simple (40-60 words)
- Basic iPhone camera specs are enough
- Natural lighting descriptions are enough

**WHY THIS CHANGE:**
Shorter, simpler prompts (40-60 words) preserve the user LoRA better. Adding film grain/muted color descriptions was making prompts too long and creating generic/plastic faces.

## 🔴 CRITICAL FLUX-SPECIFIC AVOIDANCES (HARD REQUIREMENTS)

**NEVER INCLUDE - These cause plastic/generic faces:**
- ❌ "ultra realistic", "photorealistic"
- ❌ "8K", "4K", "high resolution", "high quality"
- ❌ "perfect", "flawless", "stunning", "beautiful", "gorgeous"
- ❌ "professional photography", "editorial", "magazine quality"
- ❌ "dramatic" (for lighting)
- ❌ "hyper detailed", "sharp focus", "ultra sharp", "crystal clear"
- ❌ Any skin quality descriptions beyond "natural"
- ❌ "cinematic quality", "cinematic"
- ❌ "studio lighting", "professional lighting", "perfect lighting"
- ❌ Prompt weight syntax: (word)++, [word], {word}, (word:1.5)
- ❌ "White background" phrase (causes blur in FLUX)
- ❌ Multiple contradictory actions: "first she walks, then she sits"
- ❌ Overly complex multi-element scenes
- ❌ Time-based sequences

**NEVER INCLUDE - These cause extra limbs/body parts:**
- ❌ "legs tucked under" - causes 3+ feet/legs
- ❌ "curled up" - causes limb duplication
- ❌ "knees to chest" - causes extra limbs
- ❌ "legs folded under" - causes extra feet
- ❌ Any pose where legs/feet are hidden or partially visible

**INSTEAD USE:**
- Simple, direct descriptions: "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- Precise outfit descriptors: "oversized brown leather blazer" not "stunning luxury blazer"
- Simple settings: "walking through SoHo" not "walking through the vibrant streets of SoHo with bustling energy"
- Natural lighting: "soft afternoon sunlight" not "dramatic rim lighting"
- Natural poses: "walking toward camera" not "striking a confident pose with perfect posture"

## LIGHTING FOR FLUX (Keep Simple and Natural)

**OUTDOOR NATURAL:**
- "Soft afternoon sunlight"
- "Warm golden hour lighting"
- "Overcast daylight"

**INDOOR NATURAL:**
- "Natural window light"
- "Soft morning window light"

**INDOOR ARTIFICIAL:**
- "Warm ambient lighting"
- "Soft restaurant lighting"

**KEY LIGHTING PRINCIPLES:**
- Keep it simple (3-5 words max)
- Use natural, simple descriptions
- NO dramatic, cinematic, or professional terms
- Trust the user LoRA and natural iPhone camera quality

## WORD BUDGET BY CATEGORY (OPTIMIZED FOR USER LoRA PRESERVATION)

| Shot Type | Target Words | Priority Elements |
|-----------|--------------|-------------------|
| Close-Up Portrait | 35-45 | Outfit fabrics, simple expression, natural lighting, basic iPhone specs |
| Half Body Lifestyle | 40-50 | Outfit details, natural pose, simple setting, natural lighting, basic iPhone specs |
| Environmental Portrait | 45-55 | Context, outfit, simple location, natural lighting, basic iPhone specs |
| Action/Movement | 40-50 | Natural motion, outfit movement, natural lighting, basic iPhone specs |

**Note:** Optimal prompts (40-60 words) = preserves user LoRA, prevents plastic/generic faces. Shorter prompts let the user LoRA shine through. The goal is "looks like a friend took it" not "professional photoshoot"

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **Length:** 40-60 words? (NOT 70-80)
✅ **Natural language:** Reads like describing to a photographer, not keywords?
✅ **Outfit specifics:** Fabrics/textures included? (Stay detailed here)
✅ **Simple setting:** One-line location description? (Keep brief)
✅ **Natural lighting:** Simple lighting description? (NO dramatic/cinematic terms)
✅ **Basic iPhone specs:** "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"? (Keep minimal)
✅ **Natural pose:** Simple action description? (NO "striking poses")
✅ **User preferences:** If user specified physical preferences (hair, body, age), are they included? **MANDATORY**
✅ **No banned words:** No "ultra realistic", "photorealistic", "8K", "perfect", "flawless", "stunning", "beautiful", "professional photography", "editorial", "dramatic", "cinematic", "hyper detailed", "sharp focus"?
✅ **No prompt weights:** No (word)++, [word], {word}?
✅ **No skin quality descriptions:** Beyond "natural" only?

**If ANY item is missing or incorrect, the prompt will create plastic/generic faces instead of preserving the user LoRA.**

## EXAMPLE COMPLETE FLUX PROMPTS (NATURAL, PRESERVES USER LoRA)

**Example 1: Casual Street Style (45 words - NATURAL):**
"user_trigger, woman in oversized brown leather blazer, cream turtleneck, high-waisted jeans, gold hoops, walking through SoHo with iced coffee, soft afternoon sunlight, natural moment, shot on iPhone 15 Pro portrait mode, shallow depth of field"

**Example 2: Cozy Home (42 words - SIMPLE):**
"user_trigger, woman in oversized cream knit sweater, matching lounge pants, gold jewelry, sitting on grey sofa holding mug, soft morning window light, shot on iPhone 15 Pro portrait mode, natural bokeh"

**Example 3: Evening Glam (48 words - AUTHENTIC):**
"user_trigger, woman in black satin slip dress, leather bomber jacket, strappy heels, diamond bracelet, low bun, standing in dim restaurant, warm ambient lighting, bokeh background, shot on iPhone 15 Pro portrait mode, shallow depth of field"

**Key Principles in These Examples:**
- ✅ 40-60 words (not 70-80) = preserves user LoRA
- ✅ Simple, direct outfit descriptions (no enhancement words)
- ✅ Simple settings (one line, not elaborate)
- ✅ Natural lighting only (no dramatic/cinematic terms)
- ✅ Basic iPhone specs only (no complex technical details)
- ✅ Natural poses/actions (no "striking poses")
- ✅ NO forbidden words (ultra realistic, 8K, perfect, professional, editorial, etc.)
- ✅ Trusts user LoRA for appearance
`

export const ANTI_PATTERNS = `
## WHAT TO AVOID FOR FLUX

1. **KEYWORD STUFFING**
   - ❌ "woman, beautiful, elegant, fashion, style, perfect, stunning, gorgeous, professional"
   - ✅ "woman in butter-soft black leather blazer, standing naturally in soft window light"

2. **VAGUE ARTISTIC TERMS**
   - ❌ "ethereal dreamlike magical atmosphere with stunning beauty"
   - ✅ "soft overcast daylight, muted tones, fine film grain texture"

3. **PROMPT WEIGHT SYNTAX** (FLUX doesn't support)
   - ❌ "(leather jacket)++ [with emphasis] {luxurious:1.5}"
   - ✅ "butter-soft chocolate leather jacket with prominent oversized cut"

4. **"WHITE BACKGROUND"** (causes blur in FLUX)
   - ❌ "standing on white background", "white backdrop"
   - ✅ "standing in minimalist concrete space with soft grey walls" OR omit background entirely

5. **GENERIC CAMERA TERMS**
   - ❌ "professional photography, DSLR, high quality, 8K"
   - ✅ "shot on iPhone 15 Pro, portrait mode, f/2.8, 50mm equivalent"

6. **OUTFIT WITHOUT SPECIFICS**
   - ❌ "wearing a blazer and jeans"
   - ✅ "oversized charcoal wool blazer with structured shoulders, high-waisted straight-leg black jeans"

7. **OVERLY COMPLEX SCENES**
   - ❌ "first walking down the street, then turning to look at camera while adjusting hair and smiling"
   - ✅ "walking through rain-slicked street, looking over shoulder naturally"
`

export function getFluxPromptingPrinciples(): string {
  return `${FLUX_PROMPTING_PRINCIPLES}

${ANTI_PATTERNS}`
}
