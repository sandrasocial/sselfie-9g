/**
 * Selfie Converter for Maya Pro Mode
 * 
 * Converts traditional professional photography concepts
 * into authentic selfie concepts while maintaining quality.
 * 
 * CRITICAL: Selfies are NOT a separate category - they're a variation
 * that can be applied to ANY category (Luxury, Wellness, Fashion, etc.)
 * 
 * Selfie Types:
 * 1. Handheld (50%) - Arm extended, front camera, intimate
 * 2. Mirror (30%) - Reflection, full body, outfit showcase
 * 3. Elevated (20%) - Tripod/ring light, polished, professional
 */

export type SelfieType = 'handheld' | 'mirror' | 'elevated'

export interface ConceptToConvert {
  title: string
  description: string
  prompt: string
  category: string
  aesthetic?: string
}

/**
 * Convert a traditional concept to selfie concept
 * 
 * @param concept - The concept to convert
 * @param type - Type of selfie to create (default: handheld)
 * @returns Converted selfie concept
 */
export function convertToSelfie(
  concept: ConceptToConvert,
  type: SelfieType = 'handheld'
): ConceptToConvert {
  
  const { prompt, title, description, category } = concept
  
  console.log(`[SELFIE-CONVERTER] Converting to ${type} selfie:`, {
    originalTitle: title,
    category
  })
  
  // Extract key elements from original prompt
  const elements = extractPromptElements(prompt)
  
  // Build selfie prompt based on type
  let selfiePrompt = ''
  let selfieTitle = ''
  let selfieDescription = ''
  
  switch (type) {
    case 'handheld':
      selfiePrompt = buildHandheldSelfiePrompt(elements)
      selfieTitle = `${title} - Selfie`
      selfieDescription = `Authentic front camera selfie: ${description}`
      break
      
    case 'mirror':
      selfiePrompt = buildMirrorSelfiePrompt(elements)
      selfieTitle = `${title} - Mirror Selfie`
      selfieDescription = `Mirror reflection selfie: ${description}`
      break
      
    case 'elevated':
      selfiePrompt = buildElevatedSelfiePrompt(elements)
      selfieTitle = `${title} - Pro Selfie`
      selfieDescription = `Professional selfie setup: ${description}`
      break
  }
  
  console.log(`[SELFIE-CONVERTER] Created ${type} selfie:`, {
    newTitle: selfieTitle,
    promptLength: selfiePrompt.length
  })
  
  return {
    ...concept,
    title: selfieTitle,
    description: selfieDescription,
    prompt: selfiePrompt
  }
}

/**
 * Extract key prompt elements for reconstruction
 * 
 * This is a simplified extraction - looks for common sections
 * in the professional photography prompts.
 */
function extractPromptElements(prompt: string): {
  outfit: string
  setting: string
  lighting: string
  mood: string
  aesthetic: string
  brands: string[]
} {
  // Extract outfit section (usually after "wearing" or "in")
  const outfitMatch = prompt.match(/wearing\s+([^,\.]+)/i) || 
                      prompt.match(/in\s+([^,]+(?:blazer|dress|pants|leggings|sweater|pajama|robe|set)[^,\.]*)/i)
  const outfit = outfitMatch ? outfitMatch[1].trim() : ''
  
  // Extract setting (look for location indicators)
  const settingMatch = prompt.match(/(?:in|at)\s+([^,]+(?:room|studio|kitchen|bathroom|cafe|restaurant|table|mirror|boutique|home|hotel)[^,\.]*)/i)
  const setting = settingMatch ? settingMatch[1].trim() : 'elegant setting'
  
  // Extract lighting
  const lightingMatch = prompt.match(/(natural|soft|warm|bright|window|overhead|studio|ring)\s+(?:light|lighting)[^,\.]*(?:creating|with)?[^,\.]*/i)
  const lighting = lightingMatch ? lightingMatch[0].trim() : 'natural window lighting'
  
  // Extract mood/atmosphere
  const moodMatch = prompt.match(/(?:creating|atmosphere|vibe|aesthetic|mood)[^,\.]*(?:with|of)?\s+([^,\.]+)/i)
  const mood = moodMatch ? moodMatch[1].trim() : 'elegant atmosphere'
  
  // Extract aesthetic descriptors
  const aestheticMatch = prompt.match(/(luxury|elegant|minimal|polished|authentic|professional|sophisticated|relaxed|cozy)\s+(?:aesthetic|vibe|style)/i)
  const aesthetic = aestheticMatch ? aestheticMatch[0].trim() : 'polished aesthetic'
  
  // Extract brand names (capitalized words, common luxury brands)
  const brandPattern = /\b(Alo|Lululemon|Set Active|Sleeper|Toteme|Khaite|Reformation|Glossier|Goop|Athleta|The Row|Bottega Veneta|Chanel|Dior|Hermès|Jenni Kayne|Quince|Everlane|Mango|Zara|& Other Stories|COS|Maison Margiela|Free People|Aritzia)\b/g
  const brands = prompt.match(brandPattern) || []
  
  return {
    outfit,
    setting,
    lighting,
    mood,
    aesthetic,
    brands: [...new Set(brands)] // Remove duplicates
  }
}

/**
 * Build handheld selfie prompt
 * Most common type (50%) - authentic, intimate, front camera
 */
function buildHandheldSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, lighting, mood, aesthetic, brands } = elements
  
  // Build brand context if brands present
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in styled outfit'
  
  return `Ultra-realistic iPhone 15 Pro front camera selfie. Influencer maintaining exactly the same physical characteristics, facial features, and body proportions. Authentic selfie aesthetic with natural bokeh, influencer selfie style.

Intimate selfie setting: ${setting}, ${brandContext}. Arm extended holding phone at slight angle, creating close-up to medium shot framing showing face and upper body. Looking at phone screen with natural, genuine expression that feels authentic and in-the-moment.

${lighting} creating soft, flattering illumination. ${mood} with ${aesthetic}. Front-facing camera characteristics: natural bokeh from iPhone portrait mode, slightly wide-angle lens effect typical of front cameras, authentic influencer content style.

Selfie framing: Close enough to feel personal and intimate, showing personality and genuine moment, with enough context to show setting and styling details. Natural hand positioning holding phone, slight tilt for flattering angle, authentic selfie composition that feels relatable yet aspirational.`
}

/**
 * Build mirror selfie prompt
 * Second most common (30%) - outfit showcase, full body, reflection
 */
function buildMirrorSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, lighting, mood, aesthetic, brands } = elements
  
  // Build brand context
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in complete styled outfit'
  
  // Determine mirror type based on setting
  let mirrorType = 'large mirror'
  if (setting.includes('bathroom')) mirrorType = 'bathroom vanity mirror'
  if (setting.includes('boutique') || setting.includes('fitting')) mirrorType = 'full-length boutique mirror'
  if (setting.includes('gym') || setting.includes('studio')) mirrorType = 'studio mirror'
  if (setting.includes('bedroom') || setting.includes('home')) mirrorType = 'floor-length bedroom mirror'
  
  return `Ultra-realistic iPhone 15 Pro mirror selfie reflection. Influencer maintaining exactly the same physical characteristics, facial features, and body proportions. Authentic mirror selfie aesthetic showing complete outfit and setting.

Standing in front of ${mirrorType} in ${setting}, ${brandContext}. Holding phone at chest to waist level, capturing full body or three-quarter reflection in mirror. Mirror clearly visible in frame showing complete outfit styling from head to toe, phone visible in reflection creating authentic selfie composition.

${lighting} creating balanced illumination across reflection. ${mood} with ${aesthetic}. Mirror reflection showing: complete outfit details, subtle room/setting details in background through mirror, natural selfie positioning with phone held confidently.

Looking at phone screen or glancing at mirror reflection, creating natural mirror selfie dynamic. Reflection framing: Full outfit visible showing styling choices, posture confident but natural, authentic influencer mirror selfie that showcases both outfit and setting elegantly. Clean mirror surface with realistic reflection quality, subtle room details visible creating context and depth.`
}

/**
 * Build elevated selfie prompt
 * Least common (20%) - professional setup, polished, ring light
 */
function buildElevatedSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, lighting, mood, aesthetic, brands } = elements
  
  // Build brand context
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in polished styled outfit'
  
  return `Ultra-realistic iPhone 15 Pro elevated selfie setup. Influencer maintaining exactly the same physical characteristics, facial features, and body proportions. Professional influencer selfie aesthetic with polished production quality.

Professional selfie setting: ${setting}, ${brandContext}. Phone positioned on small tripod or elevated stable surface, creating controlled self-timer or remote shutter setup. Face to upper body framing, slightly elevated camera angle creating flattering perspective, looking directly at camera lens with confident, polished expression.

Ring light positioned at face level providing soft, even, flattering illumination, combined with ${lighting} for dimensional lighting. ${mood} with ${aesthetic} elevated to professional influencer content standard. Consistent, controlled lighting creating flawless, polished look while maintaining iPhone selfie authenticity.

Elevated selfie characteristics: Professional lighting setup visible or implied, consistent exposure across frame, slightly elevated angle for flattering perspective, polished influencer content quality. Setup shows: ring light catchlights in eyes, even skin tones, professional content creator aesthetic, but unmistakably iPhone selfie style not DSLR photography.

Framing: Waist-up or bust shot showing face clearly with enough context for styling details, professional posing with relaxed confidence, authentic influencer who invests in content quality. Studio-quality selfie that maintains iPhone front camera authenticity while achieving professional influencer production values.`
}

/**
 * Check if concept is already a selfie
 * 
 * @param prompt - The prompt to check
 * @returns true if prompt contains selfie indicators
 */
export function isSelfieConceptAlready(prompt: string): boolean {
  if (!prompt) return false
  
  const selfieKeywords = [
    'selfie',
    'front camera',
    'front-facing camera',
    'mirror reflection',
    'holding phone',
    'arm extended',
    'iphone.*selfie',
    'mirror.*phone',
    'phone.*mirror'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  
  return selfieKeywords.some(keyword => {
    const regex = new RegExp(keyword, 'i')
    return regex.test(lowerPrompt)
  })
}

/**
 * Get random selfie type with weighted distribution
 * 
 * Distribution:
 * - 50% handheld (most common, most authentic)
 * - 30% mirror (popular for outfit showcase)
 * - 20% elevated (professional influencer content)
 * 
 * @returns Random selfie type based on weighted distribution
 */
export function getRandomSelfieType(): SelfieType {
  const random = Math.random()
  
  if (random < 0.5) {
    console.log('[SELFIE-CONVERTER] Selected: handheld (50% weight)')
    return 'handheld'
  }
  
  if (random < 0.8) {
    console.log('[SELFIE-CONVERTER] Selected: mirror (30% weight)')
    return 'mirror'
  }
  
  console.log('[SELFIE-CONVERTER] Selected: elevated (20% weight)')
  return 'elevated'
}

/**
 * Get category-appropriate selfie type
 * Some categories work better with certain selfie types
 * 
 * @param category - The category to check
 * @returns Recommended selfie type for category
 */
export function getCategoryPreferredSelfieType(category: string): SelfieType | null {
  const upperCategory = category.toUpperCase()
  
  // Wellness often works better with handheld (post-workout glow)
  if (upperCategory.includes('WELLNESS') || upperCategory.includes('FITNESS')) {
    return Math.random() < 0.7 ? 'handheld' : 'mirror'
  }
  
  // Fashion often works better with mirror (outfit showcase)
  if (upperCategory.includes('FASHION') || upperCategory.includes('STYLE')) {
    return Math.random() < 0.6 ? 'mirror' : 'handheld'
  }
  
  // Luxury can use elevated more often
  if (upperCategory.includes('LUXURY') || upperCategory.includes('EDITORIAL')) {
    return Math.random() < 0.4 ? 'elevated' : (Math.random() < 0.5 ? 'mirror' : 'handheld')
  }
  
  // Default: use weighted random
  return null
}

/**
 * Validate selfie prompt quality
 * Ensures converted prompt maintains quality standards
 * 
 * @param prompt - The selfie prompt to validate
 * @returns Validation result with any warnings
 */
export function validateSelfiePrompt(prompt: string): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Check minimum length (should be 200+ words like other prompts)
  const wordCount = prompt.split(/\s+/).length
  if (wordCount < 150) {
    warnings.push(`Selfie prompt too short: ${wordCount} words (target: 200+)`)
  }
  
  // Check for required selfie elements
  const requiredElements = [
    { pattern: /iPhone.*(?:front camera|mirror|selfie)/i, name: 'iPhone selfie camera' },
    { pattern: /influencer/i, name: 'influencer reference' },
    { pattern: /authentic|natural/i, name: 'authenticity markers' },
    { pattern: /phone|mirror/i, name: 'selfie setup' }
  ]
  
  for (const element of requiredElements) {
    if (!element.pattern.test(prompt)) {
      warnings.push(`Missing ${element.name}`)
    }
  }
  
  // Check that it doesn't have professional camera language
  const professionalIndicators = [
    'DSLR',
    'professional camera',
    'Canon',
    'Nikon',
    'Sony camera',
    '85mm',
    'professional photography'
  ]
  
  for (const indicator of professionalIndicators) {
    if (prompt.includes(indicator)) {
      warnings.push(`Contains professional camera language: "${indicator}"`)
    }
  }
  
  const valid = warnings.length === 0
  
  if (!valid) {
    console.warn('[SELFIE-CONVERTER] Validation warnings:', warnings)
  }
  
  return { valid, warnings }
}

