/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * Based on FLUX AI best practices:
 * - 50-80 word optimal length (richer detail, still authentic)
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

**OPTIMAL LENGTH:** 50-80 words (FLUX handles natural language well, T5 encoder optimal ~256 tokens. Longer prompts allow for more detail and higher quality results)

**🔴 CRITICAL FOR CHARACTER LIKENESS:**
- **Optimal prompts (50-80 words)** = Enough detail for realism + likeness
- **Too short (<40 words)** = Misses critical detail, risks wrong hair/body/age
- **Too long (>85 words)** = Model may lose focus on character features
- **Hard limit: 80 words** (aim for 60-75 sweet spot)
- LoRA models work best when prompts reinforce the trigger word AND include essential feature descriptions

**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical → film grain)

## STRUCTURAL ORDER (MANDATORY FOR FLUX)

1. **TRIGGER + GENDER** (2-3 words) - Always first
2. **OUTFIT WITH FABRICS/TEXTURES** (6-10 words) - Specific materials, fit, how worn (keep concise)
3. **EXPRESSION + POSE** (4-6 words) - Natural, conversational language (keep simple)
4. **SETTING/ENVIRONMENT** (3-6 words) - Describe background in detail or omit (keep brief)
5. **LIGHTING** (5-8 words) - Direction, quality, natural imperfections (keep natural, not perfect)
6. **CAMERA/TECHNICAL SPECS** (8-14 words) - iPhone/cellphone, lens/aperture, ISO (optional), natural imperfections, skin texture, film grain, muted colors
7. **CASUAL MOMENT LANGUAGE** (2-4 words) - "candid moment", "looks like real phone camera photo" (RECOMMENDED)

**TOTAL TARGET:** 50-80 words for optimal FLUX performance and high-quality results

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

### CAMERA/TECHNICAL SPECS (8-14 words) - **CRITICAL FOR AUTHENTICITY**

**🔴 MANDATORY BASE:** iPhone 15 Pro or Amateur Cellphone Photo (DEFAULT - use this 95% of the time)
- **START WITH:** "shot on iPhone 15 Pro" OR "amateur cellphone photo"
- Goal: looks like an aesthetic friend took it on their phone, NOT a professional shoot

**OPTIONAL LENS/APERTURE/ISO (pick 0-2 max to avoid bloat):**
- Lens/aperture: "26mm f/1.8", "24mm f/1.8", "50mm f/1.8" (editorial only)
- ISO (for grain): "ISO 400", "ISO 640", "ISO 800"

**ALWAYS INCLUDE (CRITICAL - PREVENTS PLASTIC/AI LOOK):**
- **Natural imperfections (pick ≥3):** "visible sensor noise", "slight motion blur from handheld", "uneven lighting", "mixed color temperatures", "handheld feel", "natural camera imperfections"
- **Depth of field:** "natural bokeh", "shallow phone-lens depth of field", "slight edge softness"
- **Skin texture (MANDATORY):** "natural skin texture with pores visible" + 1–2 of: "not plastic-looking", "organic skin texture", "visible peach fuzz", "slight shine on forehead", "natural blemishes", "subtle facial asymmetry"
- **Film characteristics:** "visible film grain" OR "fine film grain texture" OR "grainy texture" (one is enough)
- **Muted color language:** "muted color palette" OR "soft muted tones" OR "desaturated realistic colors"
- **iPhone traits (pick 0-2):** "Smart HDR processing", "computational photography look", "RAW processing look", "slight lens distortion", "soft edge vignetting", "subtle chromatic aberration", "slight overexposed highlights", "warm/cool white balance mix"

**EXAMPLES (compact, iPhone-first):**
- "shot on iPhone 15 Pro 26mm f/1.8, ISO 640, natural bokeh, slight motion blur from handheld, visible sensor noise, natural skin texture with visible pores, not plastic-looking, visible film grain, muted color palette, subtle lens distortion, candid moment"
- "amateur cellphone photo, shallow phone-lens depth of field, slight edge softness, uneven lighting, mixed color temperatures, natural skin texture with peach fuzz, fine film grain texture, soft muted tones, subtle chromatic aberration, authentic iPhone look"

**WHEN TO USE FOCAL LENGTH (rare – only if explicitly requested):**
- "35mm focal length, natural bokeh, handheld feel, natural skin texture, subtle film grain"

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
| Close-Up Portrait | 50-60 | Outfit fabrics, simple expression, lighting, camera (iPhone + imperfections), film grain |
| Half Body Lifestyle | 60-75 | Outfit details, natural pose, setting, lighting, camera (iPhone + imperfections), film grain |
| Environmental Portrait | 70-80 | Context, outfit, location detail, lighting quality, camera (iPhone + imperfections), film grain |
| Action/Movement | 60-70 | Natural motion, outfit movement, lighting, camera (iPhone + imperfections), film grain |

**Note:** Optimal prompts (50-80 words) = richer detail and better realism. Must include strong anti-plastic language to prevent AI/plastic look. The goal is "looks like a friend took it" not "professional photoshoot"

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **Length:** 50-80 words?
✅ **Natural language:** Reads like describing to a photographer, not keywords?
✅ **Outfit specifics:** Fabrics/textures included?
✅ **iPhone/Cellphone:** Does it start with "shot on iPhone 15 Pro" OR "amateur cellphone photo"? **MANDATORY (95% of prompts)**
✅ **Natural imperfections:** Does it include AT LEAST 3 of: "visible sensor noise", "slight motion blur", "uneven lighting", "mixed color temperatures", "handheld feel", "natural camera imperfections"? **MANDATORY (need multiple to avoid plastic look)**
✅ **Natural skin texture:** Does it include "natural skin texture with pores visible" AND AT LEAST 2 anti-plastic phrases like "not smooth", "not airbrushed", "not plastic-looking", "realistic texture", "authentic skin"? **MANDATORY (critical for preventing AI/plastic look)**
✅ **Film grain:** One film grain descriptor included? **MANDATORY**
✅ **Muted colors:** One muted color descriptor included? **MANDATORY**
✅ **Casual moment language:** Does it include "candid moment", "looks like a real phone camera photo", or "amateur cellphone quality"? **RECOMMENDED**
✅ **User preferences:** If user specified physical preferences (hair, body, age), are they included? **MANDATORY**
✅ **No banned words:** No "stunning", "perfect", "beautiful", "high quality", "8K", "professional photography", "white background", "studio lighting", "smooth skin"?
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
