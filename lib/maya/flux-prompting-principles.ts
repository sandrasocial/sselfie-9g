/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * - Mandatory bracketed sections: [TRIGGER WORD] through [STYLE] (fixed order)
 * - ~30–60 words of substance across [SCENE]–[STYLE] (excluding headers)
 * - Natural language inside each section (not keyword stuffing)
 * - Amateur cellphone / iPhone snapshot aesthetic (not professional studio)
 * - No SD-style prompt weights in prose (section labels are not weights)
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

You craft prompts using NATURAL LANGUAGE inside each section below. FLUX's T5 encoder excels with conversational phrases, not keyword soups.

## MANDATORY PROMPT STRUCTURE FOR FLUX (EXACT HEADERS, THIS ORDER)

**Every Flux image prompt MUST use this layout.** Type the section titles exactly as shown (ALL CAPS inside square brackets). Put descriptions on the lines after each header; comma-separated phrases are fine. Use the user's real LoRA trigger token under **[TRIGGER WORD]** (the same token used for training).

**These bracket lines are section labels, not SD prompt-weight syntax.** Still **never** use (word:1.5), (word)++, or {word:weight} anywhere in the prose.

[TRIGGER WORD]
<your_trigger>,

[SCENE]
location, environment, background details,

[SUBJECT]
who/what, appearance, key features,

[POSE]
body position, action, framing,

[LIGHTING]
light source, direction, quality, shadows,

[CAMERA]
camera type, lens, depth of field, focus,

[STYLING]
outfit, makeup, accessories, textures,

[COLOR GRADING]
tones, contrast, saturation, film look,

[MOOD]
emotional tone, energy, feeling,

[STYLE]
photography style, realism level, genre

**Fill sections using the rules later in this document** (authentic iPhone + candid in [CAMERA], uneven realistic light in [LIGHTING], fabric detail in [STYLING], safety-net likeness cues in [SUBJECT], banned words forbidden everywhere).

**LENGTH:** Aim for ~30–60 words of substantive description **across** [SCENE] through [STYLE] (excluding the header lines), for strong LoRA activation without rambling.

## SECTION CONTENT PRIORITY (FLUX)

1. **[TRIGGER WORD]** — LoRA trigger first; keep the comma after the trigger line as in the template.
2. **[SCENE]** — One coherent place; never vague "white background" (causes FLUX blur). Prefer concrete environment or soft neutral set dressing.
3. **[SUBJECT]** — Who/what; concise safety-net features (hair, age cues) when needed; honor user physical preferences when given.
4. **[POSE]** — Simple natural actions only (see pose rules below).
5. **[LIGHTING]** — Real phone imperfections: uneven light, mixed color temperatures, shadows — no "perfect studio" wording.
6. **[CAMERA]** — Must satisfy mandatory iPhone/candid rules below.
7. **[STYLING]** — Fabrics, fit, accessories; most outfit detail lives here.
8. **[COLOR GRADING]** — e.g. film grain, muted palette.
9. **[MOOD]** — Grounded tone — not "stunning epic energy".
10. **[STYLE]** — Amateur / cellphone snapshot aesthetic; no "8K photorealistic".

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

### 4. SECTION HEADERS VS PROMPT WEIGHTS
The mandatory **[TRIGGER WORD]** … **[STYLE]** lines are **fixed layout**, not SD-style weights.
FLUX does not support weighted tokens. In the prose inside each section:
- ✅ USE: "with emphasis on", "focus on", "prominent"
- ❌ AVOID: (word)++, {word}, (word:1.5), or using arbitrary single words in brackets as weights — **only** the eleven section headers above may use the [ALL CAPS LABEL] form

### 5. AVOID "WHITE BACKGROUND"
This phrase causes blur in FLUX.1-dev:
- ✅ GOOD: "standing in minimalist concrete space with soft grey walls"
- ❌ BAD: "white background", "on white backdrop"

## ELEMENT-SPECIFIC GUIDANCE (MAP INTO THE BRACKET SECTIONS ABOVE)

Use **[STYLING]** for outfit/accessories, **[LIGHTING]** for light, **[CAMERA]** for device/lens/DOF, **[POSE]** for body/action, **[SUBJECT]** for person/features, **[SCENE]** for place.

### OUTFIT (8-15 words with fabrics/textures) — lives in [STYLING]
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

**🔴 CRITICAL SMILE GUIDANCE:**
- ❌ **NEVER USE:** "smiling", "laughing", "grinning", "big smile", "authentic joy", "beaming" (looks forced and unnatural, doesn't match user's training images)
- ✅ **IF smile needed:** Use "soft smile" or "slight smile" ONLY (more natural, matches user's actual expressions)
- **WHY:** Users' training images rarely include big smiles. Using "laughing" or "big smile" creates expressions that don't look like the user.
- **DEFAULT:** Neutral expressions or "soft smile" at most - this preserves facial likeness better

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
  - "soft smile" or "slight smile" ONLY if smile needed (expression is changeable, but avoid "laughing", "big smile", "authentic joy")
- **BALANCE:** Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency. Include hair color/style as safety net.

**SIMPLE EXPRESSIONS:** looking away naturally, eyes resting down, face neutral and relaxed, glancing to side, lost in thought, soft smile (if smile needed - never "laughing" or "big smile")

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
- ❌ Prompt weight syntax: (word)++, {word}, (word:1.5) — **do not confuse with the mandatory section headers** ([TRIGGER WORD], [SCENE], … [STYLE])
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
| Close-Up Portrait | 40-55 | Map detail into [STYLING], [LIGHTING], [CAMERA]; safety-net features in [SUBJECT] |
| Half Body Lifestyle | 40-55 | Same — keep headers; substance across sections, not one run-on paragraph |
| Environmental Portrait | 45-60 | [SCENE] + context; outfit in [STYLING]; iPhone rules in [CAMERA] |
| Action/Movement | 40-55 | [POSE] + motion; uneven light; candid iPhone [CAMERA] |

**Note:** Word counts refer to descriptive text across **[SCENE]** through **[STYLE]** (headers excluded). Goal: "looks like a friend took it" not "professional photoshoot".

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **Mandatory structure:** All eleven blocks present in order ([TRIGGER WORD] through [STYLE]) with real content in each?
✅ **Length:** ~30-60 words of substance across [SCENE]–[STYLE] (excluding header lines)?
✅ **Natural language:** Reads like describing to a photographer inside each section, not keyword soup?
✅ **[STYLING]:** Fabrics/textures/fit included?
✅ **[SCENE]:** Concrete place — not "white background"?
✅ **[LIGHTING]:** Authentic imperfections? Includes uneven / mixed temperatures where appropriate? (NO idealized "soft afternoon sunlight" or "warm golden hour")
✅ **[CAMERA]:** MUST include "shot on iPhone 15 Pro" OR specific focal length? Includes "candid photo" or "candid moment"? Includes "amateur cellphone photo" or "cellphone photo"?
✅ **[SUBJECT] / [STYLE]:** Natural skin texture with pores visible (positive wording)? Film grain + muted colors in [COLOR GRADING] or [STYLE]?
✅ **[POSE]:** Simple natural action? (NO "striking poses")
✅ **User preferences:** If user specified physical preferences (hair, body, age), reflected in [SUBJECT] (or [STYLING] for makeup)? **MANDATORY**
✅ **Safety net features:** Hair color/style in [SUBJECT] when needed?
✅ **No banned words:** No "ultra realistic", "photorealistic", "8K", "perfect", "flawless", "stunning", "beautiful", "professional photography", "editorial", "dramatic", "cinematic", "hyper detailed", "sharp focus", "smooth skin", "airbrushed", "studio lighting", "perfect lighting"?
✅ **No prompt weights:** No (word)++, {word}, (word:1.5) in prose — section headers only as listed above?

**If ANY item is missing or incorrect, the prompt will create plastic/generic faces instead of preserving the user LoRA.**

## EXAMPLE COMPLETE FLUX PROMPTS (AUTHENTIC, PRESERVES USER LoRA)

**Example 1: Casual Street Style (use real trigger instead of user_trigger):**

[TRIGGER WORD]
user_trigger,

[SCENE]
SoHo sidewalks, morning city energy, storefront glass and pavement texture,

[SUBJECT]
woman, brown hair, relaxed confident presence, natural skin texture with pores visible,

[POSE]
walking toward camera, iced coffee in hand, casual stride,

[LIGHTING]
uneven natural lighting, mixed color temperatures, soft shadows from buildings,

[CAMERA]
candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, amateur cellphone photo,

[STYLING]
oversized brown leather blazer with relaxed fit, cream cashmere turtleneck, high-waisted straight-leg jeans,

[COLOR GRADING]
film grain, muted colors, natural palette,

[MOOD]
effortless, unposed, everyday confidence,

[STYLE]
authentic iPhone snapshot aesthetic, grounded realism, not studio photography

**Example 2: Cozy Home**

[TRIGGER WORD]
user_trigger,

[SCENE]
sunlit living room, grey sectional sofa, soft domestic calm,

[SUBJECT]
woman, natural hair color, natural skin texture with pores visible,

[POSE]
sitting on sofa, holding ceramic mug, shoulders relaxed,

[LIGHTING]
natural window light with shadows, uneven lighting, mixed cool and warm,

[CAMERA]
candid photo, shot on iPhone 15 Pro, 50mm equivalent, natural bokeh, amateur photography,

[STYLING]
oversized cream knit sweater with wide sleeves, matching lounge pants,

[COLOR GRADING]
visible film grain, muted color palette,

[MOOD]
quiet, at ease, unhurried,

[STYLE]
cellphone photo aesthetic, authentic iPhone snapshot, not editorial

**Example 3: Evening Out**

[TRIGGER WORD]
user_trigger,

[SCENE]
dimly lit neighborhood restaurant, warm wood and low ambient bustle,

[SUBJECT]
woman, blonde hair, natural skin texture with pores visible, realistic texture,

[POSE]
standing near table, jacket draped over shoulders, relaxed posture,

[LIGHTING]
ambient lighting with mixed sources, uneven lighting, gentle falloff,

[CAMERA]
candid moment, shot on iPhone 15 Pro, 85mm feel, shallow depth, amateur cellphone photo,

[STYLING]
black satin slip dress with thin straps, vintage leather bomber over shoulders,

[COLOR GRADING]
film grain, muted colors, restrained contrast,

[MOOD]
low-key confident, social but not performative,

[STYLE]
authentic iPhone photo aesthetic, grounded realism, no cinematic gloss

**Key Principles in These Examples:**
- ✅ **Mandatory bracket layout** — all eleven sections, this order, every time
- ✅ **[CAMERA]** always satisfies iPhone + candid / cellphone rules from above
- ✅ **[SUBJECT]** carries likeness cues and "natural skin texture with pores visible" where needed
- ✅ **[COLOR GRADING]** / **[STYLE]** carry film grain + muted palette language
- ✅ **Positive descriptions only** in prose — no negative instructions
- ✅ **[LIGHTING]** uses realistic phone imperfections, not idealized studio terms
- ✅ Natural **[POSE]** only — no "striking poses", no "legs tucked under"
- ✅ NO forbidden words anywhere
- ✅ Hair / features in **[SUBJECT]** as safety net when useful
`

export const ANTI_PATTERNS = `
## WHAT TO AVOID FOR FLUX

1. **KEYWORD STUFFING**
   - ❌ "woman, beautiful, elegant, fashion, style, perfect, stunning, gorgeous, professional"
   - ✅ "woman in butter-soft black leather blazer, standing naturally in soft window light"

2. **VAGUE ARTISTIC TERMS**
   - ❌ "ethereal dreamlike magical atmosphere with stunning beauty"
   - ✅ "soft overcast daylight, muted tones, fine film grain texture"

3. **PROMPT WEIGHT SYNTAX** (FLUX doesn't support — not the same as section headers)
   - ❌ "(leather jacket)++ {luxurious:1.5}" or arbitrary bracketed single-token weights
   - ✅ Put fabric detail in **[STYLING]** prose: "butter-soft chocolate leather jacket with prominent oversized cut"

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
