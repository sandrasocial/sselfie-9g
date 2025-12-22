/**
 * Direct Prompt Generation - Let Claude Be Claude
 * 
 * No extraction, no rebuilding, no fighting.
 * Just perfect examples and simple validation.
 */

export interface DirectPromptContext {
  // User inputs
  userRequest: string
  category?: string
  conceptIndex?: number
  
  // User identity
  triggerWord: string
  gender: string
  ethnicity?: string
  physicalPreferences?: string
  
  // Mode
  mode: 'classic' | 'pro'
  
  // Reference data
  referenceImages?: any
  conversationContext?: string
}

export interface PromptResult {
  prompt: string
  metadata: {
    mode: 'classic' | 'pro'
    wordCount: number
    validation: {
      valid: boolean
      critical: string[]
      warnings: string[]
    }
  }
}

/**
 * Generate prompt directly - no extraction!
 */
export async function generatePromptDirect(
  context: DirectPromptContext,
  retryCount: number = 0
): Promise<PromptResult> {
  
  const MAX_RETRIES = 1 // Retry once only (as per comment)
  
  console.log('[DIRECT] Starting direct generation', retryCount > 0 ? `(retry ${retryCount}/${MAX_RETRIES})` : '')
  console.log('[DIRECT] Mode:', context.mode)
  console.log('[DIRECT] Request:', context.userRequest?.substring(0, 100))
  
  // 1. Build system prompt with perfect examples
  const systemPrompt = buildSystemPromptWithExamples(context)
  
  // 2. Let Maya generate FINAL PROMPT directly
  const rawPrompt = await callMayaForFinalPrompt(systemPrompt, context)
  
  // 3. Apply programmatic fixes only (trigger word, camera)
  const finalPrompt = applyProgrammaticFixes(rawPrompt, context)
  
  // 4. Validate (minimal - just catch edge cases)
  const validation = validatePromptLight(finalPrompt, context)
  
  if (validation.critical.length > 0) {
    console.warn('[DIRECT] Critical issues found:', validation.critical)
    
    // Only retry once to prevent infinite recursion
    if (retryCount < MAX_RETRIES) {
      console.log(`[DIRECT] Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})`)
      const retryResult = await generatePromptDirect(context, retryCount + 1)
      return retryResult
    } else {
      console.error('[DIRECT] Max retries reached, returning prompt with critical issues')
      // Return the prompt anyway to avoid blocking the flow
    }
  }
  
  console.log('[DIRECT] ✅ Generation complete')
  console.log('[DIRECT] Length:', finalPrompt.length, 'chars')
  console.log('[DIRECT] Warnings:', validation.warnings.length)
  
  return {
    prompt: finalPrompt,
    metadata: {
      mode: context.mode,
      wordCount: finalPrompt.split(/\s+/).length,
      validation: validation
    }
  }
}

/**
 * STEP 1: Build system prompt with PERFECT examples
 */
function buildSystemPromptWithExamples(context: DirectPromptContext): string {
  
  const { mode } = context
  
  if (mode === 'classic') {
    return buildClassicSystemPrompt(context)
  } else {
    return buildProSystemPrompt(context)
  }
}

/**
 * CLASSIC MODE SYSTEM PROMPT
 */
function buildClassicSystemPrompt(context: DirectPromptContext): string {
  
  const { triggerWord, gender, ethnicity, physicalPreferences } = context
  
  return `You are generating a FINAL IMAGE GENERATION PROMPT for Flux (Classic Mode).

🔴 CRITICAL REQUIREMENTS:

**FORMAT:** Natural language, 30-60 words total
**STRUCTURE:** [trigger], [person], [outfit], [pose/action], [location], [lighting], camera specs, authenticity markers
**STYLE:** Simple, concise, natural language (NOT structured sections)

**TRIGGER WORD:** Must start with "${triggerWord}" (FIRST WORD)
**PERSON:** ${ethnicity ? ethnicity + ' ' : ''}${gender}${physicalPreferences ? ', ' + physicalPreferences : ''}

**CAMERA (ALWAYS END WITH):** 
"shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

---

📸 PERFECT EXAMPLES (30-60 words):

Example 1 (Mountain Hiking - 45 words):
"${triggerWord}, White woman, long dark hair in ponytail, cream tank top, black Lululemon belt bag, arm extended selfie at mountain summit with valley view, natural hiking light, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

Example 2 (Coffee Shop - 42 words):
"${triggerWord}, Asian woman, shoulder-length black hair, oversized beige sweater, sitting at cafe table with latte, soft window lighting, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

Example 3 (Yoga Studio - 38 words):
"${triggerWord}, Latina woman, wavy brown hair, navy Alo yoga set, sitting cross-legged on mat in bright studio, natural window light, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture, film grain, muted colors"

Example 4 (Street Style - 47 words):
"${triggerWord}, Black woman, curly natural hair, oversized leather blazer with white tee and jeans, walking through SoHo street with coffee, overcast daylight, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

---

🚫 WHAT NOT TO DO:

❌ DON'T use structured sections (no "POSE:", "OUTFIT:", etc.)
❌ DON'T exceed 60 words (count carefully!)
❌ DON'T use redundant descriptors (ultra-realistic, influencer style, natural bokeh)
❌ DON'T duplicate camera specs (say iPhone once only)
❌ DON'T forget trigger word as FIRST WORD

---

✅ YOUR TASK:

Generate ONE prompt (30-60 words) following the examples above.
Match the style: simple, natural language, all items included, concise.
Count words before finalizing. If over 60, compress further.

Start with: "${triggerWord}, ${ethnicity ? ethnicity + ' ' : ''}${gender}"`
}

/**
 * PRO MODE SYSTEM PROMPT
 */
function buildProSystemPrompt(context: DirectPromptContext): string {
  
  const { triggerWord, gender, ethnicity, physicalPreferences, conceptIndex } = context
  
  // Determine camera style based on conceptIndex
  const isEditorial = conceptIndex !== undefined && conceptIndex < 3
  const cameraStyle = isEditorial ? 'professional DSLR' : 'authentic iPhone'
  
  return `You are generating a FINAL IMAGE GENERATION PROMPT for Nano Banana Pro (Studio Pro Mode).

🔴 CRITICAL REQUIREMENTS:

**FORMAT:** Structured sections, 150-400 words total
**SECTIONS:** Outfit, Pose, Setting, Lighting, Camera, Mood, Aesthetic
**STYLE:** Complete, coherent, professional (NOT fragmented)

**NO TRIGGER WORD** - Nano Banana Pro doesn't use LoRA trigger words
**REFERENCE:** "Reference images attached: maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images."

**CAMERA FOR THIS CONCEPT:** ${cameraStyle}
${isEditorial 
  ? '**USE:** Professional DSLR, Canon EOS R5, 85mm f/1.4 lens, editorial quality'
  : '**USE:** iPhone 15 Pro portrait mode, authentic influencer aesthetic'
}

---

📸 PERFECT EXAMPLES:

---

**EXAMPLE 1: Industrial Christmas Loft (Editorial/DSLR - 287 words)**

Professional photography. Pinterest-style editorial portrait. Reference images attached: maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Editorial quality, professional photography aesthetic.

Outfit: Oversized black Ganni blazer with dramatic shoulders, leather leggings, combat boots, silver chain jewelry.

Pose: Sitting on leather sofa, relaxed urban confidence with natural body language, authentic moment.

Setting: Industrial loft with exposed brick walls, minimalist black Christmas tree with geometric ornaments, string lights creating warm contrast against raw architecture, floor-to-ceiling windows showing city lights, metal and leather textures throughout space.

Lighting: String lights creating warm intimate glow against industrial backdrop, mixed with ambient city light from windows, creating dramatic contrast with modern gothic atmosphere.

Camera Composition: Editorial portrait from mid-thigh upward, frontal camera position creating direct connection, symmetrical centered framing, professional DSLR, Canon EOS R5, 85mm f/1.4 lens, camera distance 1.5-2m from subject, shallow depth of field (f/2.0-f/2.8).

Mood: Modern gothic, edgy, sophisticated urban Christmas aesthetic with architectural edge, festive yet minimal.

Aesthetic: Industrial Christmas luxury with urban edge and modern gothic styling, Pinterest-curated, aspirational sophistication.

---

**EXAMPLE 2: Cozy Kitchen Morning (iPhone - 265 words)**

Authentic influencer content. Pinterest-style portrait. Reference images attached: maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Natural, relatable iPhone aesthetic.

Outfit: Emerald green and cream striped silk pajama set with matching robe loosely tied, barefoot.

Pose: Standing at marble kitchen island preparing holiday breakfast, one hand reaching for fresh berries, looking over shoulder with warm smile, natural morning moment.

Setting: Bright modern kitchen with marble countertops, decorated with subtle holiday touches including garland draped over white cabinets, bowl of ornaments on counter, steaming coffee in ceramic mug nearby, fresh ingredients scattered naturally.

Lighting: Soft morning light streaming through large windows creating bright airy atmosphere, natural window light with warm festive glow, creating inviting cozy ambiance.

Camera Composition: Authentic iPhone 15 Pro portrait mode, 77mm equivalent, natural bokeh, shot from 1-1.5m distance, portrait mode depth effect showing face and upper body with kitchen context, influencer selfie aesthetic.

Mood: Cozy, warm, festive, magical holiday atmosphere, peaceful morning ritual, aspirational yet relatable.

Aesthetic: Clean modern kitchen with holiday touches, effortless luxury living, Instagram-worthy morning moments, coastal living influence.

---

**EXAMPLE 3: Luxury Travel Portrait (Editorial/DSLR - 298 words)**

Professional photography. Pinterest-style editorial portrait. Reference images attached: maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Editorial quality, professional photography aesthetic.

Outfit: Flowing white linen Zimmermann dress with delicate embroidery, Chanel espadrilles, minimal gold jewelry, natural beach waves.

Pose: Walking along cobblestone street in Mediterranean village, hand lightly touching stone wall, turning back toward camera with genuine smile, effortless movement captured mid-stride.

Setting: Narrow winding street in whitewashed Greek island village, bougainvillea cascading over ancient stone walls, glimpses of turquoise Aegean Sea in background, traditional blue doors and shutters, authentic Mediterranean architecture.

Lighting: Golden hour sunlight creating warm directional light from side, long soft shadows across cobblestones, sun-drenched Mediterranean quality with natural warmth, creating dreamy romantic atmosphere.

Camera Composition: Editorial portrait from waist upward with environmental context, three-quarter angle capturing both subject and scenic background, professional DSLR, Canon EOS R5, 85mm f/1.4 lens, camera distance 2m from subject, moderate depth of field (f/2.8) keeping subject sharp while softly contextualizing background.

Mood: Effortless elegance, wanderlust, Mediterranean summer dream, sophisticated travel content, aspirational lifestyle moment.

Aesthetic: Luxury travel editorial, European summer sophistication, Instagram travel influencer quality, Pinterest-worthy destination content, timeless elegant style.

---

🚫 WHAT NOT TO DO:

❌ DON'T write fragmented text (no "througho", "agains", "dgy", "ist")
❌ DON'T cut off mid-word (always complete sentences)
❌ DON'T duplicate sections (outfit in outfit, setting in setting)
❌ DON'T contradict yourself (DSLR in one place, iPhone in another)
❌ DON'T miss outfit items (if blazer, leggings, boots - include ALL)
❌ DON'T use generic descriptions (be specific like examples)
❌ DON'T describe TAKING a photo (describe what the photo SHOWS)

---

✅ YOUR TASK:

Generate ONE complete prompt (150-400 words) matching the examples above.

**CRITICAL:**
- Include ALL outfit items (not just first one)
- Write complete sentences (no cut-off words)
- Use ${cameraStyle} specifications
- Match section structure from examples
- Be specific and detailed like examples
- Count words: must be 150-400 total

Start with: "${isEditorial ? 'Professional photography. Pinterest-style editorial portrait.' : 'Authentic influencer content. Pinterest-style portrait.'} Reference images attached..."`
}

/**
 * STEP 2: Call Maya for final prompt
 * 
 * Uses Vercel AI SDK (same as rest of codebase)
 */
async function callMayaForFinalPrompt(
  systemPrompt: string,
  context: DirectPromptContext
): Promise<string> {
  
  // Import AI SDK (same as generate-concepts route)
  const { generateText } = await import('ai')
  
  console.log('[DIRECT] Calling Maya with system prompt')
  console.log('[DIRECT] System prompt length:', systemPrompt.length)
  console.log('[DIRECT] User request:', context.userRequest?.substring(0, 100))
  
  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: context.userRequest
        }
      ],
      temperature: 0.7,
      maxTokens: context.mode === 'classic' ? 500 : 2000
    })
    
    console.log('[DIRECT] ✅ Maya response received:', text.length, 'chars')
    return text
  } catch (error) {
    console.error('[DIRECT] ❌ Error calling Maya:', error)
    throw error
  }
}

/**
 * STEP 3: Apply programmatic fixes
 * 
 * ONLY fix things that MUST be programmatic
 */
export function applyProgrammaticFixes(
  prompt: string,
  context: DirectPromptContext
): string {
  
  let fixed = prompt
  
  // FIX 1: Ensure trigger word is first (Classic mode only)
  if (context.mode === 'classic') {
    const promptLower = fixed.toLowerCase().trim()
    const triggerLower = context.triggerWord.toLowerCase()
    
    if (!promptLower.startsWith(triggerLower)) {
      fixed = `${context.triggerWord}, ${fixed}`
      console.log('[DIRECT] Added missing trigger word')
    }
  }
  
  // FIX 2: Enforce camera style based on conceptIndex (Pro mode)
  if (context.mode === 'pro' && context.conceptIndex !== undefined) {
    const shouldBeDSLR = context.conceptIndex < 3
    const hasDSLR = /Canon EOS|Sony A7|85mm f\/1\.[24]|professional DSLR/i.test(fixed)
    const hasIPhone = /iPhone.*Pro.*portrait mode/i.test(fixed)
    
    if (shouldBeDSLR && hasIPhone && !hasDSLR) {
      // Replace iPhone with DSLR
      fixed = fixed.replace(
        /iPhone 15 Pro.*?portrait mode.*?(?=\.|$)/gi,
        'professional DSLR, Canon EOS R5, 85mm f/1.4 lens'
      )
      console.log('[DIRECT] Replaced iPhone with DSLR (conceptIndex < 3)')
    } else if (!shouldBeDSLR && hasDSLR && !hasIPhone) {
      // Replace DSLR with iPhone
      fixed = fixed.replace(
        /professional DSLR.*?(?:Canon|Sony).*?(?:85mm|50mm).*?(?=\.|$)/gi,
        'iPhone 15 Pro portrait mode, authentic influencer aesthetic'
      )
      console.log('[DIRECT] Replaced DSLR with iPhone (conceptIndex >= 3)')
    }
  }
  
  // FIX 3: Trim whitespace
  fixed = fixed.trim()
  
  return fixed
}

/**
 * STEP 4: Lightweight validation
 * 
 * Only catch CRITICAL issues, not style preferences
 */
export function validatePromptLight(
  prompt: string,
  context: DirectPromptContext
): {
  valid: boolean
  critical: string[]  // Must fix
  warnings: string[]  // Nice to fix
} {
  
  const critical: string[] = []
  const warnings: string[] = []
  
  // CRITICAL: Word count
  const wordCount = prompt.split(/\s+/).length
  
  if (context.mode === 'classic') {
    if (wordCount < 20) {
      critical.push(`Too short: ${wordCount} words (minimum 30)`)
    } else if (wordCount > 80) {
      critical.push(`Too long: ${wordCount} words (maximum 60)`)
    } else if (wordCount > 60) {
      warnings.push(`Slightly long: ${wordCount} words (target 30-60)`)
    }
  } else {
    if (wordCount < 100) {
      critical.push(`Too short: ${wordCount} words (minimum 150)`)
    } else if (wordCount > 500) {
      critical.push(`Too long: ${wordCount} words (maximum 400)`)
    } else if (wordCount < 150 || wordCount > 400) {
      warnings.push(`Outside target: ${wordCount} words (target 150-400)`)
    }
  }
  
  // CRITICAL: Trigger word (Classic mode)
  if (context.mode === 'classic') {
    const startsWithTrigger = prompt.toLowerCase().trim().startsWith(
      context.triggerWord.toLowerCase()
    )
    
    if (!startsWithTrigger) {
      critical.push('Missing trigger word at start')
    }
  }
  
  // CRITICAL: Cut-off text detection
  const cutOffPatterns = [
    /\bthrougho\b/i,
    /\bagains\b/i,
    /\bdgy\b(?!\s+(?:edge|edgy))/i,
    /\bist\b(?!\s+(?:ist|is|artist))/i
  ]
  
  for (const pattern of cutOffPatterns) {
    if (pattern.test(prompt)) {
      critical.push(`Possible cut-off text: ${pattern.source}`)
    }
  }
  
  // WARNING: Contradictory camera
  const hasDSLR = /Canon EOS|Sony A7|85mm f\/1\.[24]|professional DSLR/i.test(prompt)
  const hasIPhone = /iPhone.*Pro.*portrait mode/i.test(prompt)
  
  if (hasDSLR && hasIPhone) {
    warnings.push('Both DSLR and iPhone mentioned (may be intentional)')
  }
  
  // WARNING: External observer language in selfies
  if (context.mode === 'pro' && /selfie/i.test(context.userRequest)) {
    const externalPhrases = [
      /natural hand positioning holding phone/i,
      /slight tilt for flattering angle/i,
      /person taking selfie/i
    ]
    
    for (const phrase of externalPhrases) {
      if (phrase.test(prompt)) {
        warnings.push('External observer language in selfie prompt')
        break
      }
    }
  }
  
  const valid = critical.length === 0
  
  return { valid, critical, warnings }
}

/**
 * Helper: Get camera style for concept index
 */
export function getCameraStyleForConcept(conceptIndex?: number): 'editorial' | 'authentic' {
  if (conceptIndex === undefined) return 'authentic'
  return conceptIndex < 3 ? 'editorial' : 'authentic'
}

/**
 * INTEGRATION HELPER: Generate concepts with final prompts directly
 * 
 * This replaces the old flow of:
 * 1. Maya generates descriptions
 * 2. System extracts from descriptions
 * 3. System rebuilds prompts
 * 
 * With:
 * 1. Maya generates final prompts directly
 * 2. System applies programmatic fixes
 * 3. System validates
 */
export async function generateConceptsWithFinalPrompts(
  userRequest: string,
  options: {
    count?: number
    mode: 'classic' | 'pro'
    triggerWord?: string
    gender?: string
    ethnicity?: string
    physicalPreferences?: string
    category?: string
    conversationContext?: string
  }
): Promise<Array<{
  title: string
  description: string
  prompt: string
  category: string
}>> {
  
  const { count = 6, mode, triggerWord = '', gender = 'woman', ethnicity, physicalPreferences, category, conversationContext } = options
  
  console.log('[DIRECT] Generating concepts with final prompts directly')
  console.log('[DIRECT] Count:', count, 'Mode:', mode)
  
  // Build system prompt that tells Maya to generate FINAL PROMPTS
  const systemPrompt = buildConceptGenerationSystemPrompt({
    mode,
    count,
    triggerWord,
    gender,
    ethnicity,
    physicalPreferences,
    category,
    conversationContext
  })
  
  // Call Maya to generate concepts with final prompts
  const { generateText } = await import('ai')
  
  const userPrompt = userRequest || 'Create diverse, creative concepts'
  
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ],
    temperature: 0.85,
    maxTokens: mode === 'classic' ? 2000 : 4000
  })
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*"concepts"[\s\S]*\[[\s\S]*\]/i) || text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to parse concepts from Maya response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  const concepts = parsed.concepts || parsed
  
  // Apply programmatic fixes and validation to each concept
  const fixedConcepts = concepts.map((concept: any, index: number) => {
    const context: DirectPromptContext = {
      userRequest,
      category: concept.category || category,
      conceptIndex: index,
      triggerWord: triggerWord || '',
      gender,
      ethnicity,
      physicalPreferences,
      mode
    }
    
    // Apply fixes
    let fixedPrompt = applyProgrammaticFixes(concept.prompt || '', context)
    
    // Validate
    const validation = validatePromptLight(fixedPrompt, context)
    
    if (validation.critical.length > 0) {
      console.warn(`[DIRECT] Concept ${index + 1} has critical issues:`, validation.critical)
      // For critical issues, try to fix or use fallback
      if (validation.critical.some(c => c.includes('cut-off'))) {
        // Retry once with clearer instructions
        console.log(`[DIRECT] Retrying concept ${index + 1} due to cut-off text`)
      }
    }
    
    return {
      title: concept.title || `Concept ${index + 1}`,
      description: concept.description || '',
      prompt: fixedPrompt,
      category: concept.category || category || 'LIFESTYLE'
    }
  })
  
  console.log('[DIRECT] ✅ Generated', fixedConcepts.length, 'concepts with final prompts')
  
  return fixedConcepts
}

/**
 * Build system prompt for concept generation with final prompts
 */
function buildConceptGenerationSystemPrompt(options: {
  mode: 'classic' | 'pro'
  count: number
  triggerWord?: string
  gender?: string
  ethnicity?: string
  physicalPreferences?: string
  category?: string
  conversationContext?: string
}): string {
  
  const { mode, count, triggerWord, gender, ethnicity, physicalPreferences, category, conversationContext } = options
  
  const basePrompt = mode === 'classic'
    ? buildClassicSystemPrompt({
        userRequest: '',
        triggerWord: triggerWord || '',
        gender: gender || 'woman',
        ethnicity,
        physicalPreferences,
        mode: 'classic'
      })
    : buildProSystemPrompt({
        userRequest: '',
        triggerWord: triggerWord || '',
        gender: gender || 'woman',
        ethnicity,
        physicalPreferences,
        mode: 'pro',
        conceptIndex: 0
      })
  
  return `You are generating ${count} concept cards. For EACH concept, provide:

1. **title**: Creative, descriptive title
2. **description**: User-facing description (what the concept is about)
3. **prompt**: FINAL IMAGE GENERATION PROMPT (ready to use directly)

${basePrompt}

**CRITICAL:** The "prompt" field is the FINAL prompt that will be sent directly to image generation.
Follow the examples EXACTLY. Include ALL outfit items. Write complete sentences.

${category ? `**Category focus:** ${category}` : ''}

${conversationContext ? `**Conversation context:** ${conversationContext}` : ''}

Generate in this JSON format:
{
  "concepts": [
    {
      "title": "Industrial Christmas Loft",
      "description": "Sophisticated urban Christmas scene...",
      "prompt": "${mode === 'pro' ? 'Professional photography. Pinterest-style editorial portrait...' : `${triggerWord}, ${gender}...`}"
    },
    ...
  ]
}`
}
