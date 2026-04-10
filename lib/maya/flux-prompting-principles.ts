/**
 * MAYA'S FLUX PROMPTING PRINCIPLES (FLUX-OPTIMIZED)
 *
 * - Output: storytelling prose (1–2 short paragraphs), NO [BRACKET] section labels in the prompt
 * - ~90–150 words: weave scene, subject, pose, light, camera, outfit, palette, mood in narrative order
 * - Trigger token exactly once at the start; no duplicate trigger, gender, or ethnicity
 * - Amateur cellphone / iPhone snapshot aesthetic (not professional studio)
 * - No SD-style prompt weights in prose
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

You craft prompts as **short storytelling** for FLUX's T5 encoder: flowing sentences, not keyword stacks or labeled blocks.

## MANDATORY PROMPT SHAPE FOR FLUX (NO BRACKET TAGS IN OUTPUT)

**Do not type** the literal tags [TRIGGER WORD], [SCENE], [SUBJECT], or any [ALL CAPS LABEL] **into the final prompt.** Those names are only a **mental checklist** for you while writing.

**Output format:**
1. **Line 1:** the user's real LoRA trigger token, then a comma — **only once in the entire prompt** (example shape: user12345,).
2. **After that:** **one or two cohesive paragraphs** of natural language (present tense / cinematic present) that **weave together**, in a logical order:
   - **Place & environment** (concrete; never bare "white background")
   - **Who** (gender/ethnicity **at most once** if needed for the scene; hair / likeness cues as safety net when known from user prefs — never invent traits)
   - **What she's doing & framing** (simple natural pose; see pose rules)
   - **Light** (uneven, mixed temperatures, shadows — no perfect studio clichés unless user/reference overrides)
   - **Wardrobe** (fabrics, fit, accessories — rich but not a duplicate list of things already said)
   - **Camera feel** (candid + iPhone rules below, woven into a sentence)
   - **Palette & mood** (film grain, muted colors, grounded tone — woven in, not a second copy of the same adjectives)

**🔴 ANTI-DUPLICATION (CRITICAL):**
- ❌ Never repeat the **trigger token** after the opening.
- ❌ Never restate **gender + ethnicity** in a second full phrase ("White woman" once is enough).
- ❌ Never paste the same **camera line** twice with different wording.
- ❌ Do not follow a **comma-list** with the **same list** rephrased as a second paragraph.
- ✅ Read the draft aloud: if two phrases mean the same thing, **delete one**.

**LENGTH:** **~90–150 words** after the trigger line. Under ~85 words is usually too thin; if thin, expand **setting, outfit, and light** with new detail — not repetition.

## CONTENT PRIORITY (WEAVE IN ORDER — NO LABELS IN OUTPUT)

1. **Opening:** trigger + comma only.
2. **Scene** — one coherent place; concrete sensory detail.
3. **Subject / likeness** — concise safety-net features when needed; user prefs mandatory when set.
4. **Pose & moment** — simple natural actions only.
5. **Light** — realistic phone imperfections.
6. **Outfit** — fabrics, fit, accessories.
7. **Camera** — mandatory iPhone + candid / cellphone language (unless override).
8. **Finish** — film grain, muted palette, grounded mood in **one** pass (not repeated).

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

### 4. NO FAKE SECTION TAGS OR PROMPT WEIGHTS
- ❌ **Never** output [SCENE], [POSE], etc. — those are planning aids only, not prompt text.
- ❌ **Never** use SD weights: (word)++, {word}, (word:1.5)
- ✅ Emphasis lives in **natural language**: "the jacket dominates the frame", "light catches the cheekbone"

### 5. AVOID "WHITE BACKGROUND"
This phrase causes blur in FLUX.1-dev:
- ✅ GOOD: "standing in minimalist concrete space with soft grey walls"
- ❌ BAD: "white background", "on white backdrop"

## ELEMENT-SPECIFIC GUIDANCE (MAP INTO THE BRACKET SECTIONS ABOVE)

In your **narrative**, cover outfit/accessories, light, device/lens/DOF, body/action, person/features, and place — **without** typing those words as bracket tags.

### OUTFIT (8-15 words with fabrics/textures) — weave into the story
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

### LIGHTING (authentic and realistic — weave into a phrase or sentence in the story)
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

### CAMERA / TECHNICAL FEEL (one tight beat in the story) - **AUTHENTIC IPHONE STYLE**

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
- ❌ Prompt weight syntax: (word)++, {word}, (word:1.5) — and **do not** output fake [LABEL] section tags in the prompt
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
- Keep it realistic (concise clauses or one sentence in the narrative)
- Use authentic descriptions that sound like real phone photos
- Include natural imperfections: unevenness, mixed temperatures, shadows
- NO idealized terms like "soft", "warm golden hour", "perfect"
- Real phone photos have natural lighting flaws - embrace them

## WORD BUDGET BY CATEGORY (OPTIMIZED FOR USER LoRA PRESERVATION)

| Shot Type | Target Words | Priority Elements |
|-----------|--------------|-------------------|
| Close-Up Portrait | 90-130 | Outfit, light, camera, pores/skin texture woven in narrative |
| Half Body Lifestyle | 90-140 | Scene + body language + wardrobe in one flow; no duplicate lists |
| Environmental Portrait | 95-150 | Rich place first, then figure and outfit; iPhone candid finish |
| Action/Movement | 90-135 | Motion in one clear sentence; uneven light; no repeated pose clauses |

**Note:** Word counts = everything **after** the trigger comma. Goal: reads like a **short story beat** a friend could photograph, not a spec sheet.

## THE FLUX QUALITY CHECKLIST (MANDATORY VERIFICATION)

Before finalizing ANY prompt, verify ALL of these:

✅ **No bracket labels:** Zero [TRIGGER WORD], [SCENE], [POSE], etc. in the output string?
✅ **Trigger once:** Token only at the very start (with comma), never repeated mid-prompt?
✅ **No demographic echo:** Gender/ethnicity not stated twice in different words?
✅ **Length:** ~90-150 words after the trigger comma? (Under ~85 is usually too thin.)
✅ **Story flow:** Reads as 1-2 short paragraphs, not a duplicated list + summary?
✅ **Outfit:** Fabrics, fit, accessories in prose (not repeated)?
✅ **Place:** Concrete environment — not "white background"?
✅ **Light:** Authentic imperfections; uneven / mixed temperatures where appropriate? (NO idealized "soft afternoon sunlight" or "warm golden hour" unless user asks)
✅ **Camera:** "shot on iPhone 15 Pro" OR focal-length equivalent + "candid" / "cellphone" / "amateur" language once?
✅ **Skin / grade:** Natural skin texture with pores (positive wording) + film grain / muted palette **once**?
✅ **Pose:** Simple natural action? (NO "striking poses", no cramped-leg poses)
✅ **User preferences:** Reflected in narrative when set? **MANDATORY**
✅ **No banned words:** No "ultra realistic", "photorealistic", "8K", "perfect", "flawless", "stunning", "beautiful", "professional photography", "dramatic", "cinematic", "hyper detailed", "sharp focus", "smooth skin", "airbrushed", "studio lighting", "perfect lighting" (and avoid "editorial" unless user/reference demands it)?
✅ **No SD weights:** No (word)++, {word}, (word:1.5)?

**If ANY item is missing or incorrect, the prompt will create plastic/generic faces instead of preserving the user LoRA.**

## EXAMPLE COMPLETE FLUX PROMPTS (STORYTELLING, NO BRACKET TAGS)

**Example 1 — Street coffee (replace user_trigger with real token):**

user_trigger, She's cutting through SoHo in the morning, paper cup in hand, storefront glass throwing broken reflections onto the pavement. A woman with brown hair and natural skin texture with visible pores moves with an easy stride, weight on one leg as she walks toward the lens. She's in an oversized brown leather blazer over a cream cashmere turtleneck and high-waisted straight jeans; uneven light slips between buildings with mixed warm and cool tones. Candid moment, shot on iPhone 15 Pro portrait mode with shallow depth of field, amateur cellphone photo. Fine film grain and a muted palette keep it feeling like a friend's snapshot, not a shoot.

**Example 2 — Sunlit living room:**

user_trigger, Quiet sun fills a living room where linen and a grey sectional settle into a slow weekend. She sits on the sofa edge with a ceramic mug, shoulders soft, natural hair color, skin reading real with visible pores. An oversized cream knit with wide sleeves and matching lounge pants rumples naturally at the sleeves. Window light drags gentle shadows across the floor and her face, cooler near the glass and warmer inland. Candid photo on iPhone 15 Pro with a 50mm-equivalent feel and natural bokeh, amateur photography. Muted colors and visible film grain finish the hush of the moment.

**Example 3 — Evening bistro:**

user_trigger, A neighborhood restaurant hums low behind her, wood panels and amber lamps blurring into bokeh. She stands near the table with a vintage leather bomber draped over a black satin slip dress, blonde hair catching uneven ambient light that mixes warm bulbs with cooler spill from the doorway. Relaxed posture, natural skin texture with pores visible, no performative smile. Candid moment on iPhone 15 Pro with shallow depth and an 85mm-ish compression feel, amateur cellphone photo. Film grain, muted contrast, grounded confidence without cinematic gloss.

**Key principles in these examples:**
- ✅ Trigger **only** at the start; **no** [LABEL] lines; **no** repeated trigger or duplicate "woman + ethnicity" blocks
- ✅ One continuous narrative voice; camera and grade appear **once**
- ✅ iPhone + candid / cellphone language satisfied inside the story
- ✅ Positive, specific wording; no banned quality soup
- ✅ Simple pose; no cramped-leg setups
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
   - ❌ "(leather jacket)++ {luxurious:1.5}" or arbitrary bracketed single-token weights — and **no** [SCENE]-style labels in output
   - ✅ Weave fabric detail into the story: "butter-soft chocolate leather jacket falls open over her shoulders"

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
