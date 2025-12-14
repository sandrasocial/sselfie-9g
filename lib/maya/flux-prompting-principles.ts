/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * Based on FLUX AI best practices:
 * - 30-60 word optimal length (better LoRA activation, accurate character representation)
 * - Natural language (not keyword stuffing)
 * - Amateur cellphone photo aesthetic (not professional)
 * - Order matters (subject → outfit → environment → lighting → technical)
 * - No prompt weights
 * - Avoid "white background"
 * - NO aesthetic enhancement words (prevents plastic look)
 */

export const FLUX_PROMPTING_PRINCIPLES = `
=== FLUX PROMPTING MASTERY (FLUX-OPTIMIZED) ===

## 🔴 CRITICAL AVOIDANCES (Auto-removed if present)

### Banned Quality Terms:
- ❌ "stunning", "perfect", "beautiful", "flawless"
- ❌ "high quality", "8K", "ultra realistic", "photorealistic"
- ❌ "professional photography", "DSLR", "professional camera"

### Banned Lighting Terms:
- ❌ "perfect lighting", "studio lighting", "professional lighting"
- ❌ "clean lighting", "even lighting"
- ✅ **Instead use:** "uneven lighting", "mixed color temperatures", "natural window light"

### Banned Skin/Texture Terms:
- ❌ "smooth skin", "airbrushed", "flawless skin", "perfect skin"
- ❌ "plastic", "mannequin-like", "doll-like"
- ✅ **Instead use:** "natural skin texture", "visible pores", "realistic texture"

You craft prompts using NATURAL LANGUAGE as if describing to a human photographer. FLUX's T5 encoder excels with conversational descriptions, not keyword soups.

## OPTIMAL PROMPT STRUCTURE FOR FLUX

**FORMAT:** [TRIGGER WORD] + [Subject/Clothing Description] + [Setting/Context] + [Lighting Description] + [Camera/Technical] + [Mood/Action]

**OPTIMAL LENGTH:** 30-60 words (optimal for LoRA activation with room for safety net feature descriptions)

**🔴 CRITICAL FOR CHARACTER LIKENESS:**
- **Optimal prompts (30-60 words)** = Better LoRA activation with room for safety net descriptions
- **Too short (<30 words)** = May miss essential detail, risks wrong hair/body/age
- **Too long (>60 words)** = Model may lose focus on character features
- **Target range: 30-60 words** (optimal balance)
- Include safety net feature descriptions (hair color/style) when needed, especially from user preferences

**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical → film grain)

## STRUCTURAL ORDER (MANDATORY FOR FLUX)

1. **TRIGGER + GENDER** (2-3 words) - Always first
2. **OUTFIT WITH FABRICS/TEXTURES** (8-12 words) - Specific materials, fit, how worn (stay detailed here)
3. **SETTING/ENVIRONMENT** (3-5 words) - Simple, one-line description (keep brief)
4. **LIGHTING** (3-5 words) - Simple natural lighting only (no dramatic/cinematic terms)
5. **POSE/ACTION** (3-5 words) - Natural actions only (no "striking poses")
6. **CAMERA/TECHNICAL SPECS** (5-8 words) - Basic iPhone specs only (no complex technical details)

**TOTAL TARGET:** 30-60 words for optimal LoRA activation and accurate character representation

**🔴 CHARACTER LIKENESS PRESERVATION:**

### FEATURE SAFETY NET APPROACH:

**Include key features (hair color/style, distinctive traits) concisely as guidance**
- Even if LoRA should know features, mentioning them improves consistency
- Keep descriptions brief but present: "brown hair" not "long luxurious brown hair"
- This acts as a safety net when LoRA didn't learn features perfectly

**Key Principles:**
- Keep prompts concise to maintain focus on trigger word and character
- **USER PREFERENCES ARE MANDATORY:** If user specified hair/body/age in their physical preferences, these MUST be included - they are intentional user modifications
- Trust the trained model but reinforce critical features (especially from user preferences) to ensure consistency

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

**🔴 CHARACTER FEATURE GUIDANCE (FEATURE SAFETY NET APPROACH):**

**Include key features (hair color/style, distinctive traits) concisely as guidance**
- Even if LoRA should know features, mentioning them improves consistency
- Keep descriptions brief but present: "brown hair" not "long luxurious brown hair"
- This acts as a safety net when LoRA didn't learn features perfectly

**Key Principles:**
- **LORA TRAINING:** The LoRA was trained on user's features, but results may vary based on training quality
- **SAFETY NET APPROACH:** Include hair color/style and key features concisely as safety net guidance, even if LoRA should know them. It's better to include subtle feature descriptions than to omit them and get wrong results.
- **USER PREFERENCES ARE MANDATORY:** If user specified hair/body/age in their physical preferences, these MUST be included - they are intentional user modifications. Never remove them.
- **INCLUDE WHEN NEEDED:** 
  - If user preferences mention hair color/style → ALWAYS include it (e.g., "keep my natural hair color" → "natural hair color")
  - If user preferences mention body type/age → ALWAYS include it
  - Include hair color/style as safety net guidance even if LoRA should know it
- **FOCUS ON CHANGEABLE ELEMENTS:** Prioritize describing styling, pose, lighting, environment, makeup, expressions:
  - "natural makeup" (makeup is changeable)
  - "minimal makeup" (makeup is changeable)
  - "relaxed expression" (expression is changeable)
  - "confident look" (mood is changeable)
  - "soft smile" (expression is changeable)
- **BALANCE:** Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency. Include hair color/style as safety net.

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

### LIGHTING (3-6 words, authentic and realistic)
**🔴 CRITICAL: Use REALISTIC lighting descriptions that look like real phone photos. Avoid idealized or "perfect" lighting terms.**

**ALWAYS USE (Authentic Realistic Lighting):**
- ✅ "Uneven natural lighting"
- ✅ "Mixed color temperatures"
- ✅ "Natural window light with shadows"
- ✅ "Overcast daylight, soft shadows"
- ✅ "Ambient lighting, mixed sources"
- ✅ "Natural light, slight unevenness"
- ✅ "Window light, cool and warm mix"
- ✅ "Daylight with natural shadows"

**NEVER USE (These cause plastic/artificial look):**
- ❌ "Soft afternoon sunlight" (too idealized)
- ❌ "Warm golden hour lighting" (too perfect)
- ❌ "Perfect lighting", "beautiful lighting", "ideal lighting"
- ❌ "Dramatic rim lighting"
- ❌ "Cinematic quality"
- ❌ "Professional studio lighting"
- ❌ "Editorial photography lighting"
- ❌ "Soft diffused natural lighting" (too perfect)
- ❌ Any lighting descriptions that sound too polished or professional

**EXAMPLES:**
- "Uneven natural lighting"
- "Mixed color temperatures"
- "Natural window light with shadows"
- "Overcast daylight, soft shadows"
- "Ambient lighting, mixed sources"

**KEEP IT REALISTIC:** Real phone photos have uneven lighting, mixed color temperatures, and natural shadows. Avoid descriptions that sound too perfect or polished.

### CAMERA/TECHNICAL SPECS (8-12 words) - **AUTHENTIC IPHONE STYLE**

**🔴 MANDATORY BASE:** Authentic iPhone photography descriptors
- **MANDATORY:** MUST include "shot on iPhone 15 Pro" OR specific focal length (e.g., "50mm", "85mm")
- **ALWAYS INCLUDE:** "candid photo" OR "candid moment" (creates authentic, unposed feel)
- **ALWAYS INCLUDE:** "amateur photography" OR "cellphone photo" (prevents professional/plastic look)
- **USE:** "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- **OR:** "shot on iPhone 15 Pro, 50mm, natural bokeh"
- Goal: looks like a friend took it on their phone, NOT a professional shoot

**AUTHENTICITY KEYWORDS (Research-backed):**
- ✅ "candid photo" or "candid moment" - Creates unposed, authentic feel
- ✅ "amateur photography" or "cellphone photo" - Prevents professional/plastic look
- ✅ "raw photo" - Signals unprocessed, authentic image
- ✅ "boring low quality snapchat photo circa 2015" style (optional, very casual)
- ✅ "Medium shot photo of" or "Close-up photo of" - Natural framing descriptors

**NEVER INCLUDE:**
- ❌ Complex technical specs (f-stops, ISO, focal lengths)
- ❌ "Professional photography"
- ❌ "8K", "4K", "high resolution"
- ❌ "Ultra sharp", "crystal clear", "sharp focus"
- ❌ Skin quality descriptions beyond "natural"
- ❌ "Ultra realistic", "photorealistic"
- ❌ Any quality enhancement words

**AUTHENTIC EXAMPLES:**
- "candid photo, shot on iPhone 15 Pro portrait mode, shallow depth of field"
- "amateur cellphone photo, shot on iPhone, natural bokeh"
- "candid moment, raw photo, shot on iPhone 15 Pro portrait mode"
- "cellphone photo, shot on iPhone, shallow depth of field"

**TRUST THE USER LoRA:** The user's trained LoRA handles appearance. Keep camera specs simple and authentic.

### MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):

**🔴 CRITICAL - ALL PROMPTS MUST INCLUDE:**

1. **Camera Specs:** "shot on iPhone 15 Pro" OR specific focal length (e.g., "shot on iPhone 15 Pro, 50mm")
2. **Natural Skin Texture:** "natural skin texture with pores visible" (use positive descriptions only - no "not" phrases)
3. **Film Grain + Muted Colors:** "film grain, muted colors" OR "visible film grain, muted color palette"
4. **Uneven Lighting:** "uneven lighting with mixed color temperatures" OR "uneven natural lighting, mixed color temperatures"

**Why These Are Mandatory:**
- Natural skin texture prevents plastic/AI-looking images
- Film grain + muted colors create authentic iPhone aesthetic
- Uneven lighting mimics real phone photos (not professional studio lighting)

## 🔴 CRITICAL FLUX-SPECIFIC AVOIDANCES (HARD REQUIREMENTS)

**NEVER INCLUDE - These cause plastic/generic faces:**
- ❌ "ultra realistic", "photorealistic"
- ❌ "8K", "4K", "high resolution", "high quality"
- ❌ "perfect", "flawless", "stunning", "beautiful", "gorgeous"
- ❌ "professional photography", "editorial", "magazine quality"
- ❌ "dramatic" (for lighting)
- ❌ "hyper detailed", "sharp focus", "ultra sharp", "crystal clear"
- ❌ "smooth skin", "airbrushed", "flawless skin", "perfect skin", "plastic", "mannequin-like"
- ❌ "cinematic quality", "cinematic"
- ❌ "studio lighting", "professional lighting", "perfect lighting", "clean lighting", "even lighting"
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
- Realistic lighting: "uneven natural lighting" not "soft afternoon sunlight" or "dramatic rim lighting"
- Natural poses: "walking toward camera" not "striking a confident pose with perfect posture"

## LIGHTING FOR FLUX (Authentic and Realistic)

**OUTDOOR NATURAL:**
- "Overcast daylight, natural shadows"
- "Daylight with uneven illumination"
- "Natural outdoor light, mixed temperatures"
- "Ambient daylight, soft shadows"

**INDOOR NATURAL:**
- "Natural window light with shadows"
- "Window light, cool and warm mix"
- "Uneven window lighting"
- "Natural light, slight unevenness"

**INDOOR ARTIFICIAL:**
- "Ambient lighting, mixed sources"
- "Mixed color temperatures"
- "Uneven ambient lighting"
- "Natural room lighting with shadows"

**KEY LIGHTING PRINCIPLES:**
- Keep it realistic (3-6 words max)
- Use authentic descriptions that sound like real phone photos
- Include natural imperfections: unevenness, mixed temperatures, shadows
- NO idealized terms like "soft", "warm golden hour", "perfect"
- Real phone photos have natural lighting flaws - embrace them

## WORD BUDGET BY CATEGORY (OPTIMIZED FOR USER LoRA PRESERVATION)

| Shot Type | Target Words | Priority Elements |
|-----------|--------------|-------------------|
| Close-Up Portrait | 40-55 | Outfit fabrics, simple expression, natural lighting, iPhone specs, natural skin texture, film grain, safety net features |
| Half Body Lifestyle | 40-55 | Outfit details, natural pose, simple setting, natural lighting, iPhone specs, natural skin texture, film grain, safety net features |
| Environmental Portrait | 45-60 | Context, outfit, simple location, natural lighting, iPhone specs, natural skin texture, film grain, safety net features |
| Action/Movement | 40-55 | Natural motion, outfit movement, natural lighting, iPhone specs, natural skin texture, film grain, safety net features |

**Note:** Optimal prompts (30-60 words, target 40-55) = better LoRA activation with room for safety net descriptions. Include hair color/style as safety net guidance. The goal is "looks like a friend took it" not "professional photoshoot"

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **Length:** 30-60 words? (Target 40-55 words for optimal LoRA activation with safety net)
✅ **Natural language:** Reads like describing to a photographer, not keywords?
✅ **Outfit specifics:** Fabrics/textures included? (Stay detailed here)
✅ **Simple setting:** One-line location description? (Keep brief)
✅ **Realistic lighting:** Authentic lighting description with natural imperfections? Includes "uneven lighting with mixed color temperatures"? (NO idealized terms like "soft afternoon sunlight" or "warm golden hour")
✅ **Authentic iPhone specs:** MUST include "shot on iPhone 15 Pro" OR specific focal length? Includes "candid photo" or "candid moment"? Includes "amateur cellphone photo" or "cellphone photo"?
✅ **Natural skin texture:** MUST include "natural skin texture with pores visible" (positive description only - no negative phrases)?
✅ **Film grain + muted colors:** MUST include "film grain, muted colors" OR "visible film grain, muted color palette"?
✅ **Natural pose:** Simple action description? (NO "striking poses")
✅ **User preferences:** If user specified physical preferences (hair, body, age), are they included? **MANDATORY**
✅ **Safety net features:** Hair color/style included as safety net guidance?
✅ **No banned words:** No "ultra realistic", "photorealistic", "8K", "perfect", "flawless", "stunning", "beautiful", "professional photography", "editorial", "dramatic", "cinematic", "hyper detailed", "sharp focus", "smooth skin", "airbrushed", "studio lighting", "perfect lighting"?
✅ **No prompt weights:** No (word)++, [word], {word}?

**If ANY item is missing or incorrect, the prompt will create plastic/generic faces instead of preserving the user LoRA.**

## EXAMPLE COMPLETE FLUX PROMPTS (AUTHENTIC, PRESERVES USER LoRA)

**Example 1: Casual Street Style (50 words - AUTHENTIC):**
"user_trigger, woman, brown hair, in oversized brown leather blazer with relaxed fit, cream cashmere turtleneck underneath, high-waisted straight-leg jeans, walking through SoHo carrying iced coffee, uneven natural lighting with mixed color temperatures, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic"

**Example 2: Cozy Home (46 words - AUTHENTIC):**
"user_trigger, woman, natural hair color, in oversized cream knit sweater with wide sleeves, matching lounge pants, sitting on grey sectional sofa holding ceramic mug, natural window light with shadows, uneven lighting, candid photo, shot on iPhone 15 Pro, 50mm, natural skin texture with pores visible, film grain, muted color palette, authentic iPhone photo aesthetic"

**Example 3: Evening Glam (50 words - AUTHENTIC):**
"user_trigger, woman, blonde hair, in black satin slip dress with thin straps, vintage leather bomber jacket draped over shoulders, standing in dimly lit restaurant, ambient lighting with mixed sources, uneven lighting, candid moment, shot on iPhone 15 Pro, 85mm, natural skin texture with pores visible, realistic texture, film grain, muted colors, authentic iPhone photo aesthetic"

**Key Principles in These Examples:**
- ✅ 40-55 words = optimal LoRA activation with safety net descriptions
- ✅ **ALL start with "shot on iPhone 15 Pro"** - Mandatory requirement
- ✅ **ALL include "natural skin texture with pores visible"** - Use positive descriptions only (no "not" phrases)
- ✅ **ALL include "film grain, muted colors"** - Authentic iPhone aesthetic
- ✅ **NO negative instructions** - Flux works better with positive descriptions only
- ✅ **ALL include "uneven lighting with mixed color temperatures"** - Realistic phone photo lighting
- ✅ **ALL end with "authentic iPhone photo aesthetic"** - Reinforces authentic feel
- ✅ Detailed outfit descriptions with fabrics/textures (no enhancement words)
- ✅ Simple but descriptive settings (one line, not elaborate)
- ✅ Realistic lighting with natural imperfections (no idealized terms)
- ✅ **ALWAYS includes "candid photo" or "candid moment"** - Creates authentic, unposed feel
- ✅ Natural poses/actions (no "striking poses", no "legs tucked under")
- ✅ NO forbidden words (ultra realistic, 8K, perfect, professional, editorial, etc.)
- ✅ Includes hair color/style as safety net guidance
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
