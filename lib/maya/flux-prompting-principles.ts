/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * Based on FLUX AI best practices:
 * - 30-45 word optimal length (shorter = more authentic iPhone aesthetic)
 * - Natural language (not keyword stuffing)
 * - Amateur cellphone photo aesthetic (not professional)
 * - Order matters (subject → outfit → environment → lighting → technical → film grain)
 * - No prompt weights
 * - Avoid "white background"
 */

export const FLUX_PROMPTING_PRINCIPLES = `
=== FLUX PROMPTING MASTERY (FLUX-OPTIMIZED) ===

You craft prompts using NATURAL LANGUAGE as if describing to a human photographer. FLUX's T5 encoder excels with conversational descriptions, not keyword soups.

## OPTIMAL PROMPT STRUCTURE FOR FLUX

**FORMAT:** [Subject Description] + [Outfit Details with Fabrics/Textures] + [Setting/Environment] + [Lighting] + [Camera/Technical Specs with Natural Imperfections + Film Aesthetics - MANDATORY] + [Casual Moment Language]

**OPTIMAL LENGTH:** 25-45 words (FLUX handles natural language well, T5 encoder optimal ~256 tokens. Shorter prompts = better facial consistency and more authentic iPhone aesthetic. The goal is to look like someone's aesthetic friend took it on their phone, NOT like a professional photoshoot)

**🔴 CRITICAL FOR CHARACTER LIKENESS:**
- **Shorter prompts (25-35 words)** = Better facial consistency and face preservation
- **Longer prompts (50+ words)** = Model may lose focus on character features, reducing likeness
- **Hard limit: 45 words maximum** - exceeding this can degrade character likeness
- LoRA models work best when the prompt keeps focus on the trigger word and essential elements

**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical → film grain)

## STRUCTURAL ORDER (MANDATORY FOR FLUX)

1. **TRIGGER + GENDER** (2-3 words) - Always first
2. **OUTFIT WITH FABRICS/TEXTURES** (6-10 words) - Specific materials, fit, how worn (keep concise)
3. **EXPRESSION + POSE** (4-6 words) - Natural, conversational language (keep simple)
4. **SETTING/ENVIRONMENT** (3-6 words) - Describe background in detail or omit (keep brief)
5. **LIGHTING** (5-8 words) - Direction, quality, natural imperfections (keep natural, not perfect)
6. **CAMERA/TECHNICAL SPECS** (8-12 words) - iPhone/cellphone, natural imperfections, skin texture, film grain, muted colors
7. **CASUAL MOMENT LANGUAGE** (2-4 words) - "candid moment", "looks like real phone camera photo" (RECOMMENDED)

**TOTAL TARGET:** 25-45 words for optimal FLUX performance and authentic iPhone-quality results (shorter = more authentic, less AI-looking, better character likeness preservation)

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

**🔴 CRITICAL - AVOID FACIAL FEATURE MICROMANAGEMENT:**
- **DO NOT describe fixed facial features** that the LoRA already knows (eye color, jawline, cheekbones, nose shape, hair color/style)
- The LoRA was trained on these features - it already knows them
- Mentioning them can confuse the model or cause conflicts with character likeness
- ❌ AVOID: "blue eyes", "sharp jawline", "high cheekbones", "defined nose", **"long dark brown hair"**, **"blonde hair"**, **"short hair"**, **"curly hair"**, **"straight hair"**, **"wavy hair"**, "brown eyes", "round face"
- **IMPORTANT:** Only avoid hair descriptions if they're NOT in user's physical preferences/settings
- **If user specified hair in their settings** (e.g., "long dark brown hair"), those ARE mandatory and must be included - they are intentional user modifications
- The LoRA already knows hair from training, but user preferences in settings override this and should be respected
- ✅ INSTEAD: Describe changeable elements like expressions, makeup, mood:
  - "natural makeup" (makeup is changeable)
  - "minimal makeup" (makeup is changeable)
  - "relaxed expression" (expression is changeable)
  - "confident look" (mood is changeable)
  - "soft smile" (expression is changeable)
  - "glowing skin" (skin quality is changeable)
- **Trust the trained LoRA model** to preserve facial features - focus on styling, pose, lighting, and environment

**SIMPLE EXPRESSIONS:** looking away naturally, eyes resting down, face neutral and relaxed, glancing to side, lost in thought

**SIMPLE POSES:** leaning against wall, sitting with legs crossed, standing with weight on one leg, walking away casually, hand in pocket, adjusting hair, looking over shoulder

### SETTING/ENVIRONMENT (5-8 words)
**Describe background in DETAIL or omit entirely** - never just say "white background":
- ✅ GOOD: "rain-slicked city pavement, moody overcast grey skies"
- ✅ GOOD: "sunlit minimalist kitchen, marble countertops, soft morning glow"
- ❌ BAD: "in a cafe", "white background", "outdoor setting"

### LIGHTING (5-8 words, natural imperfection focus)
**🔴 CRITICAL: FLUX defaults to "studio lighting" which looks FAKE and PLASTIC. You MUST specify NATURAL, IMPERFECT light with visible imperfections.**

**NEVER USE THESE (they create plastic-looking images):**
- ❌ "soft morning daylight, diffused natural lighting" (too perfect)
- ❌ "even diffused lighting" (sounds professional)
- ❌ "perfect lighting", "beautiful lighting", "ideal lighting"
- ❌ Any lighting description without imperfection language

**ALWAYS INCLUDE IMPERFECTION LANGUAGE:**
- ✅ "uneven lighting", "mixed color temperatures", "slight uneven illumination"
- ✅ "visible sensor noise in shadows", "slight motion blur from handheld"
- ✅ "warm and cool tones mixing", "uneven ambient light"

**SPECIFY:**
- Direction: "from left", "backlit", "side lighting from window"
- Quality: "warm golden", "uneven ambient", "mixed color temperatures"
- **MANDATORY Natural imperfection:** "uneven lighting", "mixed color temperatures", "slight uneven illumination", "visible sensor noise"
- Natural sources: "golden hour sunlight", "overcast daylight", "window light"

**EXAMPLES (with imperfections):**
- "Golden hour sunlight from left, warm side lighting, soft shadows, uneven ambient light, mixed color temperatures"
- "Overcast daylight, diffused but uneven lighting, mixed warm and cool tones, visible sensor noise"
- "Window light from left, warm morning glow, slight uneven illumination, mixed color temperatures"

**AVOID:** "studio lighting", "professional lighting", "perfect lighting", "even lighting", "diffused natural lighting" (without imperfection), anything that sounds "perfect" or "studio"

### CAMERA/TECHNICAL SPECS (8-12 words) - **CRITICAL FOR AUTHENTICITY**

**🔴 MANDATORY: iPhone 15 Pro or Amateur Cellphone Photo (DEFAULT - Use this 95% of the time)**
- **ALWAYS START WITH:** "shot on iPhone 15 Pro" OR "amateur cellphone photo" (this creates authentic phone camera aesthetic)
- **THE GOAL:** The image should look like someone's incredibly aesthetic friend took it on their phone, NOT like a professional photoshoot
- Only use focal length alternatives (35mm, 50mm) for specific editorial requests
- iPhone 15 Pro = authentic Instagram-native aesthetic, natural imperfections, realistic quality

**ALWAYS INCLUDE:**
- Camera type: **"shot on iPhone 15 Pro"** OR **"amateur cellphone photo"** (DEFAULT - use this!)
- **Natural imperfections (MANDATORY - AT LEAST 2 of these):** "visible sensor noise", "slight motion blur", "uneven lighting", "mixed color temperatures", "handheld feel"
- Depth of field: "natural bokeh", "soft focus background"
- **Natural skin texture (MANDATORY - be specific):** "natural skin texture with pores visible", "realistic skin imperfections", "visible pores and texture", "not smooth or airbrushed"
- Film characteristics: "visible grain", "fine film grain", "natural texture", "grainy texture"
- **Anti-plastic language (RECOMMENDED):** "not smooth", "not airbrushed", "not plastic-looking", "realistic texture"

**EXAMPLES (iPhone-first, simplified approach with anti-plastic language):**
- "Shot on iPhone 15 Pro, natural bokeh, slight motion blur, visible sensor noise, natural skin texture with pores visible, not smooth or airbrushed, visible film grain, muted color palette, looks like a real phone camera photo"
- "Amateur cellphone photo, natural bokeh, handheld feel, uneven lighting, visible sensor noise, natural skin texture with visible pores, not plastic-looking, fine film grain texture, soft muted tones, looks like real phone camera photo"
- "Shot on iPhone 15 Pro, natural bokeh, slight motion blur, mixed color temperatures, natural skin imperfections visible, realistic texture, subtle grain, desaturated realistic colors, candid moment"

**WHEN TO USE FOCAL LENGTH (Rare - only for specific editorial requests):**
- "35mm focal length, natural bokeh, handheld feel, natural skin texture, subtle film grain" (only if explicitly requested)

### FILM AESTHETICS (5-8 words) - **MANDATORY - INTEGRATE INTO CAMERA SECTION**

**🔴 CRITICAL: These MUST be included in EVERY prompt, integrated into the camera/technical section**

**EVERY PROMPT MUST INCLUDE BOTH:**

1. **Film Grain** (choose one):
   - "visible film grain"
   - "fine film grain texture"
   - "grainy texture"
   - "subtle grain visible"

2. **Muted Color Language** (choose one):
   - "muted color palette"
   - "soft muted tones"
   - "desaturated realistic colors"
   - "vintage color temperature"

**INTEGRATION:** Include these RIGHT AFTER camera specs, not at the end:
- ✅ GOOD: "shot on iPhone 15 Pro, natural bokeh, natural skin texture, visible film grain, muted color palette, looks like a real phone camera photo"
- ❌ BAD: "shot on iPhone 15 Pro, natural bokeh... [other stuff]... visible film grain, muted color palette" (too late)

**EXAMPLES (Integrated format, simplified):**
- "shot on iPhone 15 Pro, natural bokeh, natural skin texture with pores visible, visible film grain, muted color palette, looks like a real phone camera photo"
- "amateur cellphone photo, natural bokeh, natural skin imperfections, fine film grain texture, soft muted tones, candid moment"
- "shot on iPhone 15 Pro, natural bokeh, realistic skin texture, subtle grain visible, desaturated realistic colors, looks like real phone camera photo"

**WHY THIS MATTERS:**
Without film grain and muted colors, FLUX creates overly-contrasted, plastic-looking images that don't feel authentic. Film characteristics are CRITICAL for Instagram-worthy realism. Integrating them into the camera section ensures they're not skipped.

## 🔴 CRITICAL FLUX-SPECIFIC AVOIDANCES (HARD REQUIREMENTS)

**NEVER INCLUDE - These will be automatically removed if detected:**
- Generic quality terms: "stunning", "perfect", "beautiful", "high quality", "8K", "ultra realistic", "professional photography", "DSLR", "cinematic"
- **Plastic/smooth skin terms:** "smooth skin", "flawless skin", "airbrushed", "perfect skin", "silk-like skin" (these create plastic-looking images)
- **Perfect lighting terms:** "perfect lighting", "even lighting", "ideal lighting", "beautiful lighting", "soft diffused natural lighting" (without imperfection language)
- Artistic vagueness: "ethereal", "dreamlike", "magical" (unless specific fantasy request)
- Prompt weight syntax: (word)++, [word], {word}, (word:1.5)
- "White background" phrase (causes blur in FLUX)
- Multiple contradictory actions: "first she walks, then she sits"
- Overly complex multi-element scenes
- Time-based sequences
- Studio lighting terms: "studio lighting", "professional lighting", "perfect lighting"

**INSTEAD USE:**
- Specific but simple: "shot on iPhone 15 Pro, natural bokeh, natural skin texture"
- Precise descriptors: "butter-soft chocolate leather" not "luxury leather"
- Clear spatial relationships: "standing in front of marble wall" not "near wall"
- Natural positioning: "walking toward camera" not "dynamic pose"
- **Casual moment language:** "candid moment", "caught mid-action", "natural, unposed", "looks like a real Instagram photo", "amateur cellphone quality", "looks like real phone camera photo"

## LIGHTING FOR FLUX (Technical Accuracy Focus)

**OUTDOOR NATURAL:**
- "Golden hour sunlight, warm side lighting, soft shadows, f/2.8"
- "Soft overcast daylight, even diffused lighting, no harsh shadows"
- "Late afternoon sun, warm backlight, slight lens flare visible"

**INDOOR NATURAL:**
- "Diffused window light from left, soft directional shadows, warm morning glow"
- "Natural light through floor-to-ceiling windows, bright indirect illumination"
- "Soft ambient daylight, minimal shadows, clean natural lighting"

**INDOOR ARTIFICIAL:**
- "Warm ambient restaurant lighting, soft face illumination, bokeh background lights"
- "Soft chandelier glow, warm uplighting, marble surfaces reflecting light"
- "Dim intimate bar lighting, warm amber tones, subtle highlights"

**KEY LIGHTING PRINCIPLES:**
- Specify direction when relevant (from left, from above, backlit)
- Mention quality (soft, diffused, warm, dramatic)
- Note shadows (soft shadows, minimal shadows, dramatic shadows)
- Include environment light interaction (marble reflecting, glass filtering)

## WORD BUDGET BY CATEGORY (OPTIMIZED FOR AUTHENTICITY)

| Shot Type | Target Words | Priority Elements |
|-----------|--------------|-------------------|
| Close-Up Portrait | 25-35 | Outfit fabrics, simple expression, lighting, **iPhone 15 Pro/amateur cellphone**, **natural skin texture**, **natural imperfections**, **film grain + muted colors** |
| Half Body Lifestyle | 30-40 | Outfit details, natural pose, setting, lighting, **iPhone 15 Pro/amateur cellphone**, **natural skin texture**, **natural imperfections**, **film grain + muted colors** |
| Environmental Portrait | 35-45 | Context, outfit, location detail, lighting quality, **iPhone 15 Pro/amateur cellphone**, **natural skin texture**, **natural imperfections**, **film grain + muted colors** |
| Action/Movement | 30-40 | Natural motion, outfit movement, lighting, **iPhone 15 Pro/amateur cellphone**, **natural skin texture**, **natural imperfections**, **film grain + muted colors** |

**Note:** Shorter prompts (30-45 words) = better facial consistency, more authentic iPhone aesthetic, less AI-looking artifacts. The goal is "looks like a friend took it" not "professional photoshoot"

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **Length:** 30-45 words? (Shorter = more authentic)
✅ **Natural language:** Reads like describing to a photographer, not keywords?
✅ **Outfit specifics:** Fabrics/textures included?
✅ **iPhone/Cellphone:** Does it start with "shot on iPhone 15 Pro" OR "amateur cellphone photo"? **MANDATORY (95% of prompts)**
✅ **Natural imperfections:** Does it include AT LEAST 2 of: "visible sensor noise", "slight motion blur", "uneven lighting", "mixed color temperatures"? **MANDATORY (need multiple to avoid plastic look)**
✅ **Natural skin texture:** Does it include "natural skin texture, pores visible" AND anti-plastic language like "not smooth" or "not airbrushed"? **MANDATORY**
✅ **Film grain:** One film grain descriptor included? **MANDATORY**
✅ **Muted colors:** One muted color descriptor included? **MANDATORY**
✅ **Casual moment language:** Does it include "candid moment", "looks like a real phone camera photo", or "amateur cellphone quality"? **RECOMMENDED**
✅ **No banned words:** No "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "white background"?
✅ **No prompt weights:** No (word)++, [word], {word}?

**If ANY item is missing, the prompt is INCOMPLETE and will produce AI-looking results.**

## EXAMPLE COMPLETE FLUX PROMPTS (AUTHENTIC IPHONE QUALITY)

**Close-Up Portrait (35 words - OPTIMIZED with anti-plastic):**
"mya_user, woman in butter-soft black leather blazer with oversized boyfriend cut, white ribbed tank underneath, looking away naturally, standing in rain-slicked city pavement, overcast daylight with uneven lighting, mixed color temperatures, shot on iPhone 15 Pro, natural bokeh, slight motion blur, visible sensor noise, natural skin texture with pores visible, not smooth or airbrushed, visible film grain, muted color palette, looks like a real phone camera photo"

**Half Body Lifestyle (40 words - OPTIMIZED with anti-plastic):**
"user_trigger, man in chunky cable-knit charcoal cashmere sweater with relaxed fit, sleeves pushed to elbows, black straight-leg jeans, leaning against weathered brick wall with hand in pocket, weight on one leg, late afternoon sunlight, warm side lighting, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, natural skin texture with visible pores, not plastic-looking, visible sensor noise, fine film grain texture, soft muted tones, candid moment"

**Key Differences from Previous Examples:**
- ✅ Much shorter (32-38 words vs 48-52 words) = better facial consistency, more authentic
- ✅ Always starts with "shot on iPhone 15 Pro" or "amateur cellphone photo"
- ✅ Includes natural imperfections (sensor noise, motion blur, uneven lighting)
- ✅ Includes "natural skin texture with pores visible" (mandatory)
- ✅ Film grain + muted colors integrated into camera section
- ✅ Ends with casual language: "looks like a real phone camera photo" or "candid moment"
- ✅ Simplified technical specs (no f-stops, just natural bokeh)
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
