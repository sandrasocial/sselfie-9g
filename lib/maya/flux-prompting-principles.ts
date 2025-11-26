/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * Based on FLUX AI best practices:
 * - 50-80 word optimal length
 * - Natural language (not keyword stuffing)
 * - Technical accuracy (specific camera/settings)
 * - Order matters (subject → outfit → environment → lighting → technical)
 * - No prompt weights
 * - Avoid "white background"
 */

export const FLUX_PROMPTING_PRINCIPLES = `
=== FLUX PROMPTING MASTERY (FLUX-OPTIMIZED) ===

You craft prompts using NATURAL LANGUAGE as if describing to a human photographer. FLUX's T5 encoder excels with conversational descriptions, not keyword soups.

## OPTIMAL PROMPT STRUCTURE FOR FLUX

**FORMAT:** [Subject Description] + [Outfit Details with Fabrics/Textures] + [Setting/Environment] + [Lighting] + [Camera/Technical Specs] + [Mood/Positioning]

**OPTIMAL LENGTH:** 50-80 words (FLUX handles natural language well, T5 encoder optimal ~256 tokens)

**WORD ORDER CRITICAL:** Place most important elements FIRST (subject → outfit → environment → lighting → technical)

## STRUCTURAL ORDER (MANDATORY FOR FLUX)

1. **TRIGGER + GENDER** (2-3 words) - Always first
2. **OUTFIT WITH FABRICS/TEXTURES** (8-15 words) - Specific materials, fit, how worn
3. **EXPRESSION + POSE** (5-8 words) - Natural, conversational language
4. **SETTING/ENVIRONMENT** (5-8 words) - Describe background in detail or omit
5. **LIGHTING** (8-12 words) - Direction, quality, temperature, natural sources
6. **CAMERA/TECHNICAL SPECS** (8-12 words) - Actual camera types, focal length, aperture
7. **MOOD/ATMOSPHERE** (3-5 words) - Overall feeling, film characteristics

**TOTAL TARGET:** 50-80 words for optimal FLUX performance

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

**SIMPLE EXPRESSIONS:** looking away naturally, eyes resting down, face neutral and relaxed, glancing to side, lost in thought

**SIMPLE POSES:** leaning against wall, sitting with legs crossed, standing with weight on one leg, walking away casually, hand in pocket, adjusting hair, looking over shoulder

### SETTING/ENVIRONMENT (5-8 words)
**Describe background in DETAIL or omit entirely** - never just say "white background":
- ✅ GOOD: "rain-slicked city pavement, moody overcast grey skies"
- ✅ GOOD: "sunlit minimalist kitchen, marble countertops, soft morning glow"
- ❌ BAD: "in a cafe", "white background", "outdoor setting"

### LIGHTING (8-12 words, technical accuracy)
**SPECIFY:**
- Direction: "from left", "backlit", "side lighting from window"
- Quality: "soft diffused", "warm golden", "dramatic", "even"
- Temperature: "warm amber tones", "cool blue shadows", "neutral daylight"
- Natural sources: "golden hour sunlight", "overcast daylight", "window light"

**EXAMPLES:**
- "Golden hour sunlight, warm side lighting from left, soft shadows, f/2.8 aperture"
- "Soft overcast daylight, even diffused lighting, no harsh shadows, natural color temperature"
- "Diffused window light from floor-to-ceiling glass, bright indirect illumination, warm morning glow"

**AVOID:** "studio lighting", "professional lighting", "perfect lighting", "white background"

### CAMERA/TECHNICAL SPECS (8-12 words)
**ALWAYS INCLUDE:**
- Camera type: "shot on iPhone 15 Pro" OR focal length "35mm lens", "50mm portrait lens"
- Aperture: "f/2.8", "f/1.8", "shallow depth of field"
- Depth of field: "natural bokeh", "soft focus background", "shallow depth of field"
- Film characteristics: "visible grain", "fine film grain", "natural texture", "slight motion blur"

**EXAMPLES:**
- "Shot on iPhone 15 Pro, portrait mode, f/2.8, shallow depth of field, natural grain visible"
- "35mm focal length, f/2.8 aperture, natural bokeh, handheld feel, subtle film grain"
- "Shot with 85mm portrait lens, f/2.2, creamy background bokeh, fine film grain texture"

## CRITICAL FLUX-SPECIFIC AVOIDANCES

**NEVER INCLUDE:**
- Generic quality terms: "stunning", "perfect", "beautiful", "high quality", "8K", "ultra realistic"
- Artistic vagueness: "ethereal", "dreamlike", "magical" (unless specific fantasy request)
- Prompt weight syntax: (word)++, [word], {word}
- "White background" phrase (causes blur)
- Multiple contradictory actions: "first she walks, then she sits"
- Overly complex multi-element scenes
- Time-based sequences

**INSTEAD USE:**
- Specific technical details: "shot on iPhone 15 Pro, portrait mode, f/2.8"
- Precise descriptors: "butter-soft chocolate leather" not "luxury leather"
- Clear spatial relationships: "standing in front of marble wall" not "near wall"
- Natural positioning: "walking toward camera" not "dynamic pose"

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

## WORD BUDGET BY CATEGORY

| Shot Type | Target Words | Priority Elements |
|-----------|--------------|-------------------|
| Close-Up Portrait | 50-60 | Outfit fabrics, simple expression, lighting, camera |
| Half Body Lifestyle | 60-75 | Outfit details, natural pose, setting, lighting, technical |
| Environmental Portrait | 70-80 | Context, outfit, location detail, lighting quality, camera |
| Action/Movement | 60-70 | Natural motion, outfit movement, lighting, technical specs |

## THE FLUX QUALITY CHECKLIST

Before finalizing ANY prompt, verify:

✅ **Length:** 50-80 words?
✅ **Natural language:** Reads like describing to a photographer, not keywords?
✅ **Outfit specifics:** Fabrics/textures included?
✅ **Camera specs:** iPhone OR focal length + aperture?
✅ **Lighting detail:** Direction, quality, source specified?
✅ **No banned words:** No "stunning", "perfect", "white background"?
✅ **No prompt weights:** No (word)++, [word], {word}?
✅ **Film characteristics:** Grain or texture mentioned?

## EXAMPLE COMPLETE FLUX PROMPTS

**Close-Up Portrait (58 words):**
"mya_user, woman in butter-soft black leather blazer with oversized boyfriend cut, white ribbed tank underneath, looking away naturally with face neutral, standing in rain-slicked city pavement with moody overcast grey skies, soft diffused daylight from above, minimal shadows, shot on iPhone 15 Pro portrait mode f/2.8, visible fine film grain, muted realistic tones"

**Half Body Lifestyle (72 words):**
"user_trigger, man in chunky cable-knit charcoal cashmere sweater with relaxed fit, sleeves pushed to elbows, black straight-leg jeans, leaning against weathered brick wall with hand in pocket, weight on one leg, natural relaxed posture, late afternoon sunlight creating warm side lighting from left with soft shadows, shot with 50mm lens f/2.2 shallow depth of field, natural bokeh background, subtle film grain visible, authentic street photography feel"
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
