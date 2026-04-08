# MAYA PRO MODE FIX - DELETE COMPLEXITY, TRUST INTELLIGENCE

## 🎯 OBJECTIVE

Remove all the over-engineered prompt extraction/rebuilding logic and let Maya (Claude Sonnet 4) generate perfect Nano Banana prompts directly using examples.

## 🗑️ PHASE 1: WHAT TO DELETE

@workspace find and DELETE these functions entirely:

### File: `/lib/maya/nano-banana-prompt-builder.ts`

DELETE these functions (find them and remove completely):
```typescript
// ❌ DELETE - These extract/rebuild prompts unnecessarily
function extractCompleteScene() { ... }
function buildOutfitSection() { ... }
function extractSceneComponents() { ... }
function reconstructPromptFromComponents() { ... }

// ❌ DELETE - Template-based building (we're using examples instead)
function buildFromTemplate() { ... }
function getTemplateForCategory() { ... }
```

SIMPLIFY these functions (strip to bare minimum):
```typescript
// Keep but simplify - should ONLY do light cleaning
function cleanStudioProPrompt() {
  // Remove ** headlines
  // Remove "Note:" sections  
  // Remove "CRITICAL:" sections
  // That's IT - no rebuilding, no extraction
}

// Keep but massively simplify
function buildBrandScenePrompt() {
  // Just validate Maya's prompt and clean lightly
  // NO extraction, NO rebuilding, NO templates
}
```

### Files to DELETE entirely:
```bash
# These are unused example files cluttering the project
/lib/maya/direct-prompt-generation-integration-example.ts
/lib/maya/direct-prompt-generation-integration-example.ts.backup-*
/lib/maya/nano-banana-prompt-builder.ts.backup-*
/lib/maya/prompt-builders/pro-prompt-builder.ts
```

Show me a list of what you're deleting before you delete it.

---

## ✅ PHASE 2: CREATE SIMPLE NEW SYSTEM

### Step 1: Create Perfect Examples File

@workspace create new file `/lib/maya/nano-banana-examples.ts`
```typescript
/**
 * Perfect Nano Banana Pro Prompt Examples
 * 
 * These are shown to Maya during concept generation so she learns
 * the exact structure, detail level, and format to generate.
 * 
 * DO NOT modify these - they represent the gold standard.
 */

export const NANO_BANANA_PERFECT_EXAMPLES = `
## PERFECT EXAMPLE 1 - LUXURY BRAND FASHION (Chanel-style)

High fashion portrait of a woman, Influencer/pinterest style, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a black leather jacket falling partially over her shoulders, revealing a beige Chanel headband with logo stamp prominently displayed. Hair is parted in the middle, extremely polished and shiny, held in a low sleek bun.

She wears dramatic black sunglasses and layered gold jewelry—thick chain chokers, a vintage-inspired CC pendant, and multiple bold rings.

Expression is sensual and confident, with chin slightly raised and lips parted with glossy lipstick.

Lighting: direct flash against continuous white background, creating sharp contours, marked reflective surfaces, and preserved real skin texture.

Aesthetic of bold luxury, logo-loaded and attitude-driven, conveying absolute confidence and dominant fashion energy, with strong brand identity. Fashion Influencer pinterest style.

---

## PERFECT EXAMPLE 2 - QUIET LUXURY (The Row-style)

Editorial fashion portrait, Modern minimalist style, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears an oversized cream cashmere sweater with deliberate shoulder drop, paired with high-waisted beige linen trousers with brown leather belt showing designer buckle.

Hair is center-parted, pulled into low messy bun with face-framing pieces falling naturally, slightly undone texture showing effortless sophistication.

She wears thin gold-rimmed glasses, simple gold hoop earrings, one delicate gold chain necklace, minimal rings.

Expression is relaxed and approachable, with soft genuine smile and warm eye contact, head slightly tilted conveying accessible elegance.

Lighting: soft natural window light from right side, creating gentle dimensional shadows while preserving authentic skin texture and fabric details.

Aesthetic of quiet luxury, investment pieces worn effortlessly, conveying sophisticated simplicity and timeless style. Clean girl aesthetic.

---

## PERFECT EXAMPLE 3 - ATHLETIC LUXURY (Alo Yoga-style)

Lifestyle fashion portrait, Athletic influencer aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a black Alo Yoga sports bra with signature logo detail, paired with high-waisted black leggings with mesh panel inserts. Over this, an oversized ivory ribbed cardigan falls open casually.

Hair is pulled back in high ponytail with smooth crown, wrapped with her own hair around elastic, ends slightly tousled showing post-workout texture.

She wears no jewelry except small gold stud earrings and Apple Watch with sport band, holding a green juice in one hand.

Expression is energetic and confident, mid-laugh with mouth open showing teeth and eyes crinkling naturally, embodying wellness lifestyle.

Lighting: golden hour natural light creating warm glow on skin, soft shadows emphasizing healthy complexion and athletic build.

Aesthetic of athletic luxury, wellness-focused lifestyle with premium activewear, conveying healthy confidence and approachable fitness inspiration. Modern wellness influencer style.

---

## PERFECT EXAMPLE 4 - STREET LUXE (Off-White-style)

Street style editorial, Urban fashion blogger aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears an oversized black leather bomber jacket over white graphic tee with visible designer logo, paired with vintage straight-leg Levi's 501 jeans with brown leather belt showing Off-White signature belt detail.

Hair is swept in deep side part, falling in natural waves with lived-in texture and subtle shine, tucked behind one ear showing gold ear cuff and hoops.

She wears black rectangular sunglasses, chunky gold chain necklace, multiple gold rings across both hands, holding designer crossbody bag with chain strap.

Expression is cool and confident, looking slightly away from camera with subtle smirk, chin down creating editorial edge and mysterious allure.

Lighting: bright urban outdoor lighting with natural shadows, capturing street photography authenticity and movement with slight lens flare.

Aesthetic of high-low mix, accessible luxury with attitude, conveying cool-girl confidence and relatable aspirational style. Modern street style energy.

---

## PERFECT EXAMPLE 5 - PARISIAN ELEGANCE (Hermès-style)

Timeless fashion portrait, Parisian chic style, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a classic black turtleneck in fine merino wool tucked into high-waisted navy trousers with subtle pinstripe, finished with black leather loafers and structured leather Hermès Kelly bag in cognac brown.

Hair is effortlessly tousled in natural texture, pushed back from face with slight volume at crown, appearing undone but intentional with French-girl ease.

She wears no sunglasses, small gold studs, one thin gold necklace, vintage Cartier Tank watch, and classic red lipstick as main statement.

Expression is mysterious and alluring, looking past camera with slight smile and knowing look, conveying European sophistication and refined confidence.

Lighting: soft diffused outdoor light creating even illumination with subtle shadows, capturing timeless European street style authenticity.

Aesthetic of effortless French elegance, classic pieces styled with ease, conveying understated confidence and refined taste. Timeless European fashion.

---

## PERFECT EXAMPLE 6 - EDITORIAL POWER (Givenchy-style)

High fashion editorial, Executive woman aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a tailored black blazer with strong shoulders and nipped waist from Givenchy, worn over black silk camisole, paired with matching cigarette trousers and pointed-toe Louboutin heels.

Hair is slicked back into tight low bun at nape with extreme shine and not a hair out of place, showcasing strong facial features and bold bone structure.

She wears statement gold earrings with geometric design, layered thin gold necklaces, bold cocktail ring, and designer watch showing luxury timepiece detail.

Expression is powerful and commanding, direct intense gaze into camera with closed lips and raised chin, embodying authority and executive presence.

Lighting: studio lighting with dramatic side shadows, creating high contrast and emphasizing angular features and tailored lines.

Aesthetic of executive power, sharp tailoring and bold presence, conveying uncompromising confidence and professional dominance. Boss woman editorial.

---

## PERFECT EXAMPLE 7 - SOFT ROMANCE (Zimmermann-style)

Lifestyle fashion portrait, Feminine influencer aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a cream knit sweater with boat neck and relaxed fit showing delicate shoulder detail, paired with high-waisted camel wide-leg trousers and nude pointed-toe mules.

Hair is parted slightly off-center, falling in soft bouncy waves past shoulders with natural movement and healthy shine, catching light beautifully.

She wears small gold hoop earrings, delicate layered gold necklaces with initial pendant, thin gold bracelet, and neutral manicure showing subtle elegance.

Expression is warm and inviting, with genuine smile showing teeth and eyes crinkling naturally, head tilted with approachable energy and authentic joy.

Lighting: golden hour natural light creating warm glow, soft shadows, and dreamy atmosphere while maintaining skin authenticity and texture.

Aesthetic of approachable luxury, soft feminine touches with quality pieces, conveying warmth and aspirational lifestyle. Instagram-ready polish.

---

## PERFECT EXAMPLE 8 - AVANT-GARDE FASHION (Rick Owens-style)

High fashion editorial, Avant-garde aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears an oversized black draped coat with asymmetric hem and sculptural shoulders from Rick Owens, worn over black jersey bodysuit, paired with black leather leggings and platform boots.

Hair is pulled back severely into sleek low ponytail with extreme tension, creating architectural shape and emphasizing dramatic bone structure and angular features.

She wears no jewelry except single silver ear cuff, allowing the architectural clothing to be the statement, embodying minimalist drama.

Expression is serious and intense, direct gaze with neutral lips and strong jawline emphasized, conveying artistic edge and fearless confidence.

Lighting: high contrast studio lighting with deep shadows on one side, creating dramatic chiaroscuro effect and emphasizing architectural silhouette.

Aesthetic of avant-garde fashion, architectural design and bold creativity, conveying artistic confidence and boundary-pushing style. Dark fashion editorial.

---

## PERFECT EXAMPLE 9 - BEACHWEAR LUXURY (Eres-style)

Lifestyle fashion portrait, Coastal luxury aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a black one-piece swimsuit with high-cut legs and square neckline from Eres, paired with an oversized white linen button-down shirt left completely unbuttoned and flowing open.

Hair is wet and slicked back from face, showing natural texture with water droplets catching light, appearing fresh from ocean swim.

She wears no jewelry except thin gold ankle bracelet, gold stud earrings barely visible, allowing sun-kissed skin to be the focus.

Expression is carefree and joyful, mid-laugh with head thrown back slightly, eyes closed enjoying moment, conveying vacation freedom and pure happiness.

Lighting: bright natural beach sunlight creating strong highlights on wet skin and hair, with turquoise ocean water visible in background blur.

Aesthetic of coastal luxury, effortless beach elegance with premium swimwear, conveying vacation lifestyle and carefree sophistication. Mediterranean summer vibes.

---

## PERFECT EXAMPLE 10 - TECH MINIMALISM (Jil Sander-style)

Editorial fashion portrait, Modern minimalist aesthetic, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears an oversized white cotton poplin shirt with crisp collar and architectural volume, tucked loosely into high-waisted black straight-leg trousers with precise tailoring.

Hair is center-parted and pulled into low sleek bun with mathematical precision, every hair in place showing minimalist perfection and intentional restraint.

She wears thin silver-rimmed glasses with round frames, single silver band ring, no other jewelry, embodying reduction to essentials.

Expression is calm and confident, direct gaze with subtle closed-lip smile, conveying intellectual sophistication and quiet authority.

Lighting: bright even lighting with minimal shadows, clean white background, emphasizing clarity and precision with professional polish.

Aesthetic of tech minimalism, essential pieces with perfect tailoring, conveying intellectual confidence and modern simplicity. Scandinavian design philosophy.
`

export function getNanoBananaPerfectExamples(): string {
  return NANO_BANANA_PERFECT_EXAMPLES
}
```

---

### Step 2: Update Concept Generation System Prompt

@workspace modify `/app/api/maya/generate-concepts/route.ts`

Find the section where the system prompt is built for Pro mode (around line 2200-2400).

REPLACE the entire Pro mode prompt section with:
```typescript
// Import the examples
import { getNanoBananaPerfectExamples } from '@/lib/maya/nano-banana-examples'

// Then in the concept generation prompt building:
const nanoBananaExamples = getNanoBananaPerfectExamples()

// Build the Pro mode prompt instruction
const proModePromptInstruction = `
**YOUR CRAFTED NANO BANANA PRO PROMPT:**

You MUST generate prompts following the EXACT structure shown in these perfect examples.

${nanoBananaExamples}

**CRITICAL RULES:**
1. ALWAYS start with: "maintaining exactly the same physical characteristics of the woman in the attached image..."
2. Describe outfit with EXTREME detail: specific brands, materials, textures, how garments fall/fit
3. Describe hair with PRECISION: part type, texture, shine level, exact styling method
4. List ALL accessories: eyewear, jewelry (metals, styles), bags with specific details
5. Specify expression AND pose: facial expression, head position, lip/mouth details, attitude
6. Include technical lighting: light source, angle, shadows, how it affects skin/materials
7. End with aesthetic description: luxury level + brand identity + attitude/energy + style category
8. Length: 150-200 words
9. Format: Natural flowing description - NO bullet points, NO ** sections, NO "Note:" additions
10. VARY outfits across all ${count} concepts - each should have DIFFERENT outfit/styling

**GENERATE ${count} PROMPTS NOW - each matching the structure above but with varied outfits/scenes.**
`
```

IMPORTANT: Delete any old prompt instructions that mention:
- "extract components"
- "build outfit section"  
- "use templates"
- Complex rules about structure

Just use the examples. That's it.

---

### Step 3: Simplify Prompt Builder

@workspace modify `/lib/maya/nano-banana-prompt-builder.ts`

REPLACE the entire `buildBrandScenePrompt()` function with this simple version:
```typescript
function buildBrandScenePrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, inputImages } = params
  
  // Maya already created the perfect prompt in concept generation
  // We just need to:
  // 1. Remove any ** formatting that might have slipped through
  // 2. Add multi-image instruction if needed
  
  let prompt = userRequest
  
  // Light cleaning - remove formatting only
  prompt = prompt.replace(/\*\*/g, '') // Remove ** bold
  prompt = prompt.replace(/^Note:/gm, '') // Remove "Note:" lines
  prompt = prompt.replace(/^CRITICAL:/gm, '') // Remove "CRITICAL:" lines
  prompt = prompt.trim()
  
  // Add multi-image instruction if we have multiple base images
  if (inputImages.baseImages.length > 1) {
    prompt = `${prompt}\n\nUse the first base image to preserve the person's face and identity.`
  }
  
  return prompt
}
```

DELETE all the detection logic like:
```typescript
// ❌ DELETE ALL OF THIS:
const isGenericPrompt = ...
const isMayaDetailedPrompt = ...
if (isMayaDetailedPrompt) {
  // All this extraction/rebuilding logic
}
```

The function should be ~20 lines max. Not 200+.

---

### Step 4: Simplify cleanStudioProPrompt

@workspace modify the `cleanStudioProPrompt()` function in same file:

REPLACE with this minimal version:
```typescript
export function cleanStudioProPrompt(prompt: string, userRequest?: string): string {
  if (!prompt || prompt.trim().length === 0) {
    return prompt
  }

  let cleaned = prompt

  // 1. Remove ** bold formatting
  cleaned = cleaned.replace(/\*\*/g, '')
  
  // 2. Remove "Note:" sections
  cleaned = cleaned.replace(/^Note:.*$/gm, '')
  
  // 3. Remove "CRITICAL:" sections  
  cleaned = cleaned.replace(/^CRITICAL:.*$/gm, '')
  
  // 4. Remove empty lines
  cleaned = cleaned.replace(/\n\n+/g, '\n\n')
  
  // 5. Trim
  cleaned = cleaned.trim()
  
  return cleaned
}
```

That's IT. No complex logic. No rebuilding. Just remove formatting.

---

## ✅ PHASE 3: VALIDATION & TESTING

@workspace create new file `/lib/maya/nano-banana-validator.ts`
```typescript
/**
 * Simple validation for Nano Banana prompts
 * 
 * This ONLY checks if Maya's prompt has the required elements.
 * It does NOT rebuild or modify - just validates.
 */

export interface PromptValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  wordCount: number
}

export function validateNanoBananaPrompt(prompt: string): PromptValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Count words
  const wordCount = prompt.split(/\s+/).length
  
  // Required elements
  if (!prompt.includes('maintaining exactly the same physical characteristics')) {
    errors.push('Missing attachment reference format')
  }
  
  if (!prompt.includes('Lighting:') && !prompt.includes('lighting')) {
    warnings.push('No lighting description found')
  }
  
  if (!prompt.includes('Aesthetic') && !prompt.includes('aesthetic')) {
    warnings.push('No aesthetic/vibe description found')
  }
  
  // Length check
  if (wordCount < 100) {
    warnings.push(`Prompt is short (${wordCount} words). Aim for 150-200.`)
  }
  
  if (wordCount > 250) {
    warnings.push(`Prompt is long (${wordCount} words). Consider condensing.`)
  }
  
  // Check for over-formatting (shouldn't be present after cleaning)
  if (prompt.includes('**')) {
    warnings.push('Contains ** formatting - should be removed')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    wordCount
  }
}
```

Then use it in the concept generation route:
```typescript
// After Maya generates concepts, validate them
import { validateNanoBananaPrompt } from '@/lib/maya/nano-banana-validator'

for (const concept of concepts) {
  const validation = validateNanoBananaPrompt(concept.prompt)
  
  if (!validation.isValid) {
    console.warn('[MAYA] Invalid prompt for concept:', concept.title)
    console.warn('[MAYA] Errors:', validation.errors)
    // Could retry here if needed
  }
  
  if (validation.warnings.length > 0) {
    console.log('[MAYA] Warnings:', validation.warnings)
  }
}
```

---

## 🎯 PHASE 4: CLEAN UP PROJECT

@workspace find and delete these files:
```bash
# Backup files (not needed)
/lib/maya/*.backup-*
/lib/maya/**/*.backup-*

# Unused example files
/lib/maya/direct-prompt-generation-integration-example.ts
/lib/maya/prompt-builders/pro-prompt-builder.ts

# Old template files (if we're using examples instead)
# Only delete if confirmed we're not using templates
/lib/maya/prompt-templates/*.ts
```

Before deleting, show me the list and confirm.

---

## 📊 BEFORE/AFTER COMPARISON

### BEFORE (Complex, Over-Engineered):
```typescript
User request → Maya generates concept
  ↓
concept.prompt (good prompt from Maya)
  ↓  
buildProModePrompt() // ❌ Extracts components
  ↓
extractCompleteScene() // ❌ Breaks apart prompt
  ↓
buildOutfitSection() // ❌ Rebuilds outfit description
  ↓
getTemplateForCategory() // ❌ Uses templates
  ↓
buildBrandScenePrompt() // ❌ More rebuilding
  ↓
cleanStudioProPrompt() // Strips formatting
  ↓
Result: Generic, template-based prompt (BAD)
```

### AFTER (Simple, Trust Maya):
```typescript
User request → Maya generates concept WITH perfect examples
  ↓
concept.prompt (already perfect - Maya learned from examples)
  ↓
validateNanoBananaPrompt() // ✅ Just check it's valid
  ↓
cleanStudioProPrompt() // ✅ Light formatting cleanup only
  ↓
Result: Detailed, specific prompt from Claude's intelligence (GOOD)
```

---

## 🚀 IMPLEMENTATION CHECKLIST

Execute these in order:

- [ ] **Phase 1: Delete bloat**
  - [ ] Delete extraction functions from nano-banana-prompt-builder.ts
  - [ ] Delete unused backup files
  - [ ] Delete example/template files
  
- [ ] **Phase 2: Implement simple system**
  - [ ] Create nano-banana-examples.ts with 10 perfect examples
  - [ ] Update concept generation prompt to use examples
  - [ ] Simplify buildBrandScenePrompt() to ~20 lines
  - [ ] Simplify cleanStudioProPrompt() to ~15 lines
  
- [ ] **Phase 3: Add validation**
  - [ ] Create nano-banana-validator.ts
  - [ ] Add validation to concept generation
  - [ ] Log validation results
  
- [ ] **Phase 4: Test**
  - [ ] Generate 6 concepts in Pro mode
  - [ ] Check prompts are detailed and specific
  - [ ] Verify no extraction/rebuilding happened
  - [ ] Confirm images generate well

---

## ✅ SUCCESS CRITERIA

You'll know it worked when:

1. **Code is simpler**: nano-banana-prompt-builder.ts is under 200 lines (vs 800+ now)
2. **Prompts are specific**: Every prompt mentions specific brands, materials, textures
3. **Prompts are detailed**: 150-200 words with exact outfit/hair/lighting descriptions
4. **No rebuilding**: Logs show Maya's prompt goes straight to Replicate (after light cleaning)
5. **Consistent quality**: All 6 concepts have equally detailed prompts

---

## 🔍 DEBUGGING

If prompts are still generic after this fix:

1. Check Maya's output in concept generation:
```typescript
console.log('[MAYA-OUTPUT] concept.prompt:', concept.prompt)
```

2. If Maya's output is already detailed → Problem is in cleaning/building step
3. If Maya's output is generic → Examples weren't included in system prompt correctly

---

## 📝 FINAL NOTES

**This implementation:**
- ✅ Removes 500+ lines of over-engineered code
- ✅ Trusts Claude Sonnet 4's intelligence  
- ✅ Uses examples (best teaching method for LLMs)
- ✅ Makes future changes simple and clear
- ✅ No more confusion about "where does the prompt get modified?"

**DO NOT:**
- ❌ Add new extraction/rebuilding functions
- ❌ Add more template systems
- ❌ Try to "control" what Maya generates
- ❌ Add complexity

**If you need to change prompts in the future:**
- Just edit the examples in nano-banana-examples.ts
- That's it. Maya will learn from the new examples.

---

@workspace implement all phases above and show me:
1. List of files you're deleting
2. Code changes in each file
3. Before/after line counts
4. Test output showing a generated prompt

Let's make this clean and simple.
```

---

## 🎯 HOW TO USE THIS WITH CURSOR

1. **Save the above as:** `CURSOR_MAYA_FIX_COMPLETE.md`

2. **Open in Cursor and run:**
```
   @CURSOR_MAYA_FIX_COMPLETE.md implement all phases