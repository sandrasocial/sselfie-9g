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
  console.log('[DIRECT] ========== INPUT DESCRIPTION ==========')
  console.log('[DIRECT] Description length:', context.userRequest?.length)
  console.log('[DIRECT] First 200 chars:', context.userRequest?.substring(0, 200))
  console.log('[DIRECT] Contains "The Row"?', context.userRequest?.includes('The Row'))
  console.log('[DIRECT] Contains "Brunello"?', context.userRequest?.includes('Brunello'))
  console.log('[DIRECT] Contains "Cartier"?', context.userRequest?.includes('Cartier'))
  console.log('[DIRECT] =======================================')
  
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
  
  return `Generate a FINAL IMAGE GENERATION PROMPT for Flux (Classic Mode).

**REQUIREMENTS:**
- Format: Natural language, 30-60 words
- Structure: [trigger], [person], [outfit], [pose/action], [location], [lighting], camera specs
- Must start with "${triggerWord}" (first word)
- Person: ${ethnicity ? ethnicity + ' ' : ''}${gender}${physicalPreferences ? ', ' + physicalPreferences : ''}
- Always end with: "shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

**EXAMPLES:**

Example 1 (45 words):
"${triggerWord}, White woman, long dark hair in ponytail, cream tank top, black Lululemon belt bag, standing at mountain summit with valley view, natural hiking light, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

Example 2 (42 words):
"${triggerWord}, Asian woman, shoulder-length black hair, oversized beige sweater, sitting at cafe table with latte, soft window lighting, shot on iPhone 15 Pro portrait mode, candid photo, natural skin texture with pores visible, film grain, muted colors"

**AVOID:**
- Structured sections (no "POSE:", "OUTFIT:", etc.)
- Exceeding 60 words
- Redundant descriptors
- Forgetting the trigger word

Generate ONE prompt (30-60 words) in the style above.`
}

/**
 * PRO MODE SYSTEM PROMPT
 */
function buildProSystemPrompt(context: DirectPromptContext): string {
  
  const { userRequest, conceptIndex } = context
  
  // Determine camera style
  const isEditorial = conceptIndex !== undefined && conceptIndex < 3
  
  return `Transform this DESCRIPTION into a structured prompt. Preserve EVERY specific detail.

**WORD COUNT:** Target 100-200 words total (structured format with multiple sections)

**CRITICAL RULES:**
1. Copy brands/products EXACTLY (The Row → "The Row", not "luxury brand")
2. No vague language ("elegant sweater" → "The Row cream cashmere turtleneck")
3. No OR statements (if description says ONE item, write ONE item)
4. Include ALL brands/items mentioned in description
5. Complete sentences only (no fragments)

**DESCRIPTION:**
"""
${userRequest || 'No description provided'}
"""

**BAG RULES:**
✅ Include bag if: person is walking/moving, traveling, shopping, or in editorial scene
❌ Don't include bag if: person is sitting at home, relaxing, in domestic setting, or doing activities where bag would be awkward

**FORMAT:**

${isEditorial 
  ? 'Professional photography. Pinterest-style editorial portrait.' 
  : 'Authentic influencer content. Pinterest-style portrait.'
} Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. ${isEditorial ? 'Editorial quality, professional photography aesthetic.' : 'Natural, relatable iPhone aesthetic.'}

**Outfit:** [EXACT outfit from description - all brands, all pieces, all materials. Example: "The Row cream cashmere turtleneck sweater, Brunello Cucinelli camel wide-leg trousers, Cartier watch"]

**Pose:** [EXACT action from description. Example: "Gracefully sitting on ivory velvet sofa beside Fraser fir Christmas tree, holding fine bone china teacup with both hands, gazing thoughtfully at fireplace"]

**Setting:** [ALL specific items from description. Example: "Living room with ivory velvet sofa, Fraser fir Christmas tree with crystal ornaments and warm white lights, floor-to-ceiling windows, wrapped Hermès boxes beneath tree, white orchids on side table"]

**Lighting:** [EXACT lighting from description. Example: "Golden fireplace glow mixed with natural winter light from windows, creating serene luxury atmosphere"]

**Camera Composition:** 
${isEditorial 
  ? 'Editorial portrait from mid-thigh upward, frontal camera position, symmetrical centered framing, professional DSLR, Canon EOS R5 or Sony A7R IV, 85mm f/1.4 lens, camera distance 1.5-2m from subject, shallow depth of field (f/2.0-f/2.8).'
  : 'Authentic iPhone 15 Pro portrait mode, 77mm equivalent, natural bokeh effect, shot from 1.5m distance, portrait mode depth creating soft background blur, influencer content aesthetic.'
}

**Mood:** [Mood words from description. Example: "Serene, luxurious, elegant holiday morning"]

**Aesthetic:** [Aesthetic from description with Pinterest language. Example: "Luxurious holiday morning elegance, sophisticated Christmas styling, aspirational holiday luxury"]

**VERIFY BEFORE SUBMITTING:**
✅ Every brand in description appears in prompt?
✅ No vague words replacing specific items?
✅ No OR statements?
✅ All sentences complete?
✅ Bag only if contextually appropriate?

Transform the description above into the structured format.`
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
      maxOutputTokens: context.mode === 'classic' ? 500 : 2000
    })
    
    console.log('[DIRECT] ✅ Maya response received:', text.length, 'chars')
    return text
  } catch (error) {
    console.error('[DIRECT] ❌ Error calling Maya:', error)
    throw error
  }
}

/**
 * Apply programmatic fixes
 */
export function applyProgrammaticFixes(
  prompt: string,
  context: DirectPromptContext
): string {
  
  let fixed = prompt.trim()
  
  // Ensure trigger word is first (Classic mode only)
  if (context.mode === 'classic') {
    const promptLower = fixed.toLowerCase()
    const triggerLower = context.triggerWord.toLowerCase()
    
    if (!promptLower.startsWith(triggerLower)) {
      fixed = `${context.triggerWord}, ${fixed}`
    }
  }
  
  // Enforce camera style based on conceptIndex (Pro mode)
  if (context.mode === 'pro' && context.conceptIndex !== undefined) {
    const shouldBeDSLR = context.conceptIndex < 3
    const hasDSLR = /professional DSLR|Canon EOS|Sony A7|85mm f\/1\.[24]/i.test(fixed)
    const hasIPhone = /iPhone.*Pro.*portrait mode/i.test(fixed)
    
    if (shouldBeDSLR && hasIPhone && !hasDSLR) {
      fixed = fixed.replace(/iPhone 15 Pro.*?portrait mode/gi, 'professional DSLR, Canon EOS R5, 85mm f/1.4 lens')
    } else if (!shouldBeDSLR && hasDSLR && !hasIPhone) {
      fixed = fixed.replace(/professional DSLR.*?(?:Canon|Sony).*?(?:85mm|50mm)/gi, 'iPhone 15 Pro portrait mode')
    }
  }
  
  // Normalize whitespace
  fixed = fixed.replace(/\s+/g, ' ').trim()
  
  return fixed
}

/**
 * Lightweight validation
 */
export function validatePromptLight(
  prompt: string,
  context: DirectPromptContext
): {
  valid: boolean
  critical: string[]
  warnings: string[]
} {
  
  const critical: string[] = []
  const warnings: string[] = []
  
  // Word count check
  const wordCount = prompt.split(/\s+/).length
  
  if (context.mode === 'classic') {
    if (wordCount < 30) {
      critical.push(`Too short: ${wordCount} words (minimum 30)`)
    } else if (wordCount > 60) {
      critical.push(`Too long: ${wordCount} words (maximum 60)`)
    }
  } else {
    // Pro mode uses structured format (Outfit, Pose, Setting, etc.) which requires more words
    if (wordCount < 100) {
      critical.push(`Too short: ${wordCount} words (minimum 100)`)
    } else if (wordCount > 200) {
      critical.push(`Too long: ${wordCount} words (maximum 200)`)
    }
  }
  
  // Trigger word check (Classic mode only)
  if (context.mode === 'classic') {
    const startsWithTrigger = prompt.toLowerCase().trim().startsWith(context.triggerWord.toLowerCase())
    if (!startsWithTrigger) {
      critical.push('Missing trigger word at start')
    }
  }
  
  return {
    valid: critical.length === 0,
    critical,
    warnings
  }
}

