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
  
  // Extract key elements - PRIORITY: Use description first (Maya's outfit details), then fall back to prompt
  const elements = extractPromptElements(description || prompt, prompt)
  
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
 * PRIORITY: Extract from description first (Maya's outfit details, scenes, and details from description),
 * then fall back to extracting from the built prompt if description doesn't have details.
 */
function extractPromptElements(description: string, prompt: string): {
  outfit: string
  setting: string
  locationDetails: string
  lighting: string
  mood: string
  aesthetic: string
  brands: string[]
  props: string[]
  decor: string[]
  activity: string
  posture: string
} {
  // PRIORITY 1: Extract outfit from description (Maya's original vision)
  let outfit = ''
  
  if (description && description.length > 30) {
    // Multiple patterns to catch different ways outfits are described
    const outfitPatterns = [
      // Pattern 1: "wearing [outfit details]"
      /wearing\s+([^,\.]{15,200}?)(?:\s*,\s*(?:standing|sitting|with|looking|in|at|one hand|both hands|preparing|holding|adjusting)|[.,]|$)/i,
      // Pattern 2: "in [outfit]" for dresses/sets
      /\bin\s+((?:[a-z][^,\.]{10,150}?(?:dress|sweater|shirt|blouse|pants|jeans|skirt|coat|jacket|blazer|pajama|set|outfit)))(?=\s*,\s*|[.,]|$)/i,
      // Pattern 3: "dressed in [outfit]"
      /dressed\s+in\s+([^,\.]{15,200}?)(?:\s*,\s*|[.,]|$)/i,
    ]
    
    for (const pattern of outfitPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        let extractedOutfit = match[1].trim()
        // Stop at pose/action keywords
        extractedOutfit = extractedOutfit.replace(/,\s*(?:standing|sitting|with|looking|in|at|one hand|both hands|preparing|holding|adjusting|reaching|decorating).*$/i, '')
        
        // Validate it's actually clothing
        const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'sofa', 'couch', 'marble', 'countertop']
        const outfitLower = extractedOutfit.toLowerCase()
        const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
        const clothingWords = /\b(dress|sweater|shirt|blouse|pants|jeans|denim|skirt|coat|jacket|blazer|top|bottom|outerwear|shoes|heels|sneakers|boots|bag|clutch|necklace|jewelry|accessories|pajama|set|robe|tie|loosely tied)\b/i
        const hasClothingWords = clothingWords.test(extractedOutfit)
        
        if (!hasSettingKeywords && (hasClothingWords || extractedOutfit.length > 30)) {
          outfit = extractedOutfit
          console.log('[SELFIE-CONVERTER] ✅ Extracted outfit from description:', outfit.substring(0, 100))
          break
        }
      }
    }
  }
  
  // PRIORITY 2: Fall back to extracting from prompt if description didn't yield outfit
  if (!outfit || outfit.length < 10) {
    const outfitMatch = prompt.match(/wearing\s+([^,\.]+)/i) || 
                        prompt.match(/in\s+([^,]+(?:blazer|dress|pants|leggings|sweater|pajama|robe|set)[^,\.]*)/i)
    outfit = outfitMatch ? outfitMatch[1].trim() : ''
    if (outfit) {
      console.log('[SELFIE-CONVERTER] Extracted outfit from prompt (fallback):', outfit.substring(0, 100))
    }
  }
  
  // ============================================
  // EXTRACT SETTING/LOCATION (from description first, then prompt)
  // ============================================
  let setting = ''
  let locationDetails = ''
  
  if (description && description.length > 30) {
    const locationPatterns = [
      // Specific location with descriptor (e.g., "minimal white studio", "elegant bathroom")
      /((?:marble|granite|wooden|modern|bright|cozy|elegant|minimal|white|luxury|spacious|warm|sleek|sophisticated|intimate)\s+(?:kitchen|living room|bedroom|bathroom|dining room|studio|market|boutique|hotel|restaurant|cafe|room|setting))/i,
      // Furniture/specific elements
      /(?:in|at|on)\s+((?:minimal|white|elegant|luxury)?\s*(?:mirror|studio|kitchen|living room|bedroom|bathroom|dining room|vanity|table|counter|island|sofa|couch|bed))/i,
      // Simple room type
      /(?:in|at)\s+(kitchen|living room|bedroom|bathroom|dining room|studio|market|boutique|hotel|restaurant|cafe)/i,
    ]
    
    for (const pattern of locationPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        locationDetails = match[1].trim()
        setting = locationDetails
        console.log('[SELFIE-CONVERTER] ✅ Extracted setting from description:', setting)
        break
      }
    }
  }
  
  // Fall back to prompt if description didn't yield setting
  if (!setting || setting.length < 5) {
    const settingMatch = prompt.match(/(?:in|at)\s+([^,]+(?:room|studio|kitchen|bathroom|cafe|restaurant|table|mirror|boutique|home|hotel|setting)[^,\.]*)/i)
    setting = settingMatch ? settingMatch[1].trim() : 'elegant setting'
    locationDetails = setting
  }
  
  // ============================================
  // EXTRACT LIGHTING (from description first, then prompt)
  // ============================================
  let lighting = ''
  
  if (description && description.length > 30) {
    const lightingMatch = description.match(/((?:soft|natural|warm|bright|ambient|morning|evening|streaming|filtering|clean|studio|window|overhead|ring)\s+(?:light|lighting|glow|sunlight|daylight|illumination)[^,\.]{0,80})/i)
    if (lightingMatch && lightingMatch[1]) {
      lighting = lightingMatch[1].trim()
      console.log('[SELFIE-CONVERTER] ✅ Extracted lighting from description:', lighting)
    }
  }
  
  // Fall back to prompt
  if (!lighting || lighting.length < 5) {
    const lightingMatch = prompt.match(/((?:natural|soft|warm|bright|window|overhead|studio|ring)\s+(?:light|lighting)[^,\.]*(?:creating|with)?[^,\.]*)/i)
    lighting = lightingMatch ? lightingMatch[0].trim() : 'natural window lighting'
  }
  
  // ============================================
  // EXTRACT MOOD/EXPRESSION (from description first, then prompt)
  // ============================================
  let mood = ''
  
  if (description && description.length > 30) {
    const moodPatterns = [
      /((?:laughing|smiling|looking)\s+(?:joyfully|warmly|peacefully|confidently|over shoulder)[^,\.]{0,40})/i,
      /(warm smile)/i,
      /(natural expression)/i,
      /(joyful|peaceful|confident|soft confidence|direct gaze)/i,
    ]
    
    for (const pattern of moodPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        mood = match[1].trim()
        console.log('[SELFIE-CONVERTER] ✅ Extracted mood from description:', mood)
        break
      }
    }
  }
  
  // Fall back to prompt
  if (!mood || mood.length < 5) {
    const moodMatch = prompt.match(/(?:creating|atmosphere|vibe|aesthetic|mood)[^,\.]*(?:with|of)?\s+([^,\.]+)/i)
    mood = moodMatch ? moodMatch[1].trim() : 'elegant atmosphere'
  }
  
  // ============================================
  // EXTRACT AESTHETIC (from description first, then prompt)
  // ============================================
  let aesthetic = ''
  
  if (description && description.length > 30) {
    const aestheticMatch = description.match(/((?:luxury|elegant|minimal|polished|authentic|professional|sophisticated|relaxed|cozy|editorial|beauty)\s+(?:aesthetic|vibe|style|photography))/i)
    if (aestheticMatch && aestheticMatch[1]) {
      aesthetic = aestheticMatch[1].trim()
      console.log('[SELFIE-CONVERTER] ✅ Extracted aesthetic from description:', aesthetic)
    }
  }
  
  // Fall back to prompt
  if (!aesthetic || aesthetic.length < 5) {
    const aestheticMatch = prompt.match(/((?:luxury|elegant|minimal|polished|authentic|professional|sophisticated|relaxed|cozy)\s+(?:aesthetic|vibe|style))/i)
    aesthetic = aestheticMatch ? aestheticMatch[0].trim() : 'polished aesthetic'
  }
  
  // ============================================
  // EXTRACT POSTURE/ACTIVITY (from description)
  // ============================================
  let posture = ''
  let activity = ''
  
  if (description && description.length > 30) {
    // Extract posture
    const postureMatch = description.match(/\b(standing|sitting|seated|kneeling|lying|leaning|walking|reaching|relaxed|posing)\b/i)
    if (postureMatch && postureMatch[1]) {
      posture = postureMatch[1].toLowerCase()
    }
    
    // Extract activity
    const activityPatterns = [
      /(preparing\s+[^,\.]{5,40})/i,
      /(holding\s+[^,\.]{5,40})/i,
      /(reaching for\s+[^,\.]{5,40})/i,
      /(looking\s+(?:over|at|toward)[^,\.]{5,40})/i,
      /(decorating\s+[^,\.]{5,40})/i,
      /(arranging\s+[^,\.]{5,40})/i,
      /(adjusting\s+[^,\.]{5,40})/i,
      /(applying\s+[^,\.]{5,40})/i,
      /((?:hand|arm)\s+(?:on|at|extended|holding)[^,\.]{5,40})/i, // "hand on hip", "arm extended"
    ]
    
    for (const pattern of activityPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        activity = match[1].trim()
        break
      }
    }
  }
  
  // ============================================
  // EXTRACT PROPS & DECOR (from description)
  // ============================================
  const props: string[] = []
  const decor: string[] = []
  
  if (description && description.length > 30) {
    // Descriptive phrase patterns that indicate props/decor
    const descriptivePhrasePatterns = [
      /\b[^,\.]{0,50}?\bwith\s+[^,\.]{5,70}/gi, // "tray with croissants"
      /\b[^,\.]{0,40}?\b(?:arranged|scattered|draped|placed|stacked)\s+(?:on|over|in)?\s+[^,\.]{5,70}/gi, // "scattered on bed"
      /\b[^,\.]{0,40}?\b(?:wrapped|tied|decorated|adorned)\s+(?:in|with|on)?\s+[^,\.]{5,70}/gi, // "wrapped in paper"
      /\b[^,\.]{0,30}?\bon\s+(?:crisp|white|cream|luxury|vintage|elegant)?\s*[^,\.]{5,60}(?:bedding|bed|table|tray|counter|surface|floor|shelf|desk|vanity)/gi, // "berries on tray"
    ]
    
    // Comprehensive prop/decor keywords
    const propDecorKeywords = [
      'tray', 'breakfast', 'croissants', 'berries', 'fruit', 'coffee', 'mug', 'cup', 'bowl', 'plate', 'pastries',
      'presents', 'gifts', 'gift boxes', 'wrapping papers', 'ribbon', 'scissors', 'boxes', 'packaging', 'wrapping',
      'bedding', 'pillows', 'throws', 'blankets', 'cushions', 'curtains', 'rugs', 'artwork', 'frames', 'vases', 'lamps', 'mirrors',
      'garland', 'ornaments', 'decorations', 'wreaths', 'candles', 'flowers', 'plants', 'eucalyptus', 'sprigs',
      'books', 'magazines', 'notebooks', 'accessories', 'jewelry', 'bags', 'shoes', 'sunglasses',
      'skincare', 'products', 'bottles', 'jars', 'brushes', 'towels', 'robes', 'makeup',
      'phone', 'wallet', 'keys', 'perfumes', 'cameras', 'watches',
      'tables', 'chairs', 'surfaces', 'counters', 'shelves',
    ]
    
    // Build regex pattern for keywords (separate patterns for .test() vs .match() to avoid lastIndex issues)
    const keywordsPatternForTest = new RegExp(`\\b(${propDecorKeywords.join('|')})\\b`, 'i') // No 'g' flag for .test()
    const keywordsPatternForMatch = new RegExp(`\\b(${propDecorKeywords.join('|')})\\b`, 'gi') // 'g' flag for .match()
    
    // Extract descriptive phrases
    const allDescriptivePhrases: string[] = []
    for (const pattern of descriptivePhrasePatterns) {
      const matches = description.match(pattern)
      if (matches) {
        allDescriptivePhrases.push(...matches.map(m => m.trim()))
      }
    }
    
    // Filter phrases that contain prop/decor keywords
    for (const phrase of allDescriptivePhrases) {
      if (keywordsPatternForTest.test(phrase)) {
        const lowerPhrase = phrase.toLowerCase()
        // Skip outfit-related phrases
        if (!/\bwearing|outfit|dressed|in\s+(?:a|an|the)\s+(?:dress|sweater|shirt|pants|jeans|skirt)\b/i.test(lowerPhrase)) {
          // Decor items
          if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?|plants?|artwork|frames?|tapestry|curtains?)\b/i.test(phrase)) {
            decor.push(phrase)
          } 
          // Props (functional items)
          else {
            props.push(phrase)
          }
        }
      }
    }
    
    // Extract standalone items
    const standaloneItems = description.match(keywordsPatternForMatch)
    if (standaloneItems) {
      for (const item of standaloneItems) {
        const itemContext = description.match(new RegExp(`([^,\.]{0,40}\\b${item}\\b[^,\.]{0,30})`, 'i'))
        if (itemContext && itemContext[0].split(' ').length >= 3) {
          if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?)\b/i.test(itemContext[0])) {
            decor.push(itemContext[0].trim())
          } else {
            props.push(itemContext[0].trim())
          }
        }
      }
    }
    
    // Deduplicate
    const dedupeProps = new Map<string, string>()
    props.forEach(p => {
      const key = p.toLowerCase()
      if (!dedupeProps.has(key) || dedupeProps.get(key)!.length < p.length) {
        dedupeProps.set(key, p)
      }
    })
    const finalProps = Array.from(dedupeProps.values()).filter(p => p.length > 0)
    
    const dedupeDecor = new Map<string, string>()
    decor.forEach(d => {
      const key = d.toLowerCase()
      if (!dedupeDecor.has(key) || dedupeDecor.get(key)!.length < d.length) {
        dedupeDecor.set(key, d)
      }
    })
    const finalDecor = Array.from(dedupeDecor.values()).filter(d => d.length > 0)
    
    if (finalProps.length > 0 || finalDecor.length > 0) {
      console.log('[SELFIE-CONVERTER] ✅ Extracted props:', finalProps)
      console.log('[SELFIE-CONVERTER] ✅ Extracted decor:', finalDecor)
    }
    
    props.length = 0
    props.push(...finalProps)
    decor.length = 0
    decor.push(...finalDecor)
  }
  
  // ============================================
  // EXTRACT BRANDS (from description and prompt)
  // ============================================
  const brandPattern = /\b(Alo|Lululemon|Set Active|Sleeper|Toteme|Khaite|Reformation|Glossier|Goop|Athleta|The Row|Bottega Veneta|Chanel|Dior|Hermès|Jenni Kayne|Quince|Everlane|Mango|Zara|& Other Stories|COS|Maison Margiela|Free People|Aritzia|Lemaire)\b/g
  const brands = Array.from(new Set([
    ...(description.match(brandPattern) || []),
    ...(prompt.match(brandPattern) || [])
  ]))
  
  return {
    outfit,
    setting: setting || 'elegant setting',
    locationDetails: locationDetails || setting || 'elegant setting',
    lighting: lighting || 'natural window lighting',
    mood: mood || 'elegant atmosphere',
    aesthetic: aesthetic || 'polished aesthetic',
    brands,
    props,
    decor,
    activity,
    posture
  }
}

/**
 * Build handheld selfie prompt
 * Most common type (50%) - authentic, intimate, front camera
 */
function buildHandheldSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, locationDetails, lighting, mood, aesthetic, brands, props, decor, activity, posture } = elements
  
  // Build brand context if brands present
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in styled outfit'
  
  // Build setting with details
  let settingWithDetails = locationDetails || setting
  if (decor.length > 0) {
    const decorText = decor.slice(0, 3).join(', ')
    settingWithDetails = `${settingWithDetails}${decorText ? `, ${decorText}` : ''}`
  }
  
  // Build props/details text
  let propsText = ''
  if (props.length > 0) {
    propsText = props.slice(0, 4).join(', ')
  }
  
  // Build pose/activity text
  let poseText = ''
  if (activity) {
    poseText = activity
  } else if (posture) {
    poseText = posture
  } else {
    poseText = 'Arm extended holding phone at slight angle'
  }
  
  return `Ultra-realistic iPhone 15 Pro front camera selfie. Reference images attached: use these reference images to maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Authentic selfie aesthetic with natural bokeh, influencer selfie style.

Intimate selfie setting: ${settingWithDetails}, ${brandContext}${propsText ? `. Details visible: ${propsText}` : ''}. ${poseText}, creating close-up to medium shot framing showing face and upper body. Looking at phone screen with natural, genuine expression that feels authentic and in-the-moment.

${lighting} creating soft, flattering illumination. ${mood} with ${aesthetic}. Front-facing camera characteristics: natural bokeh from iPhone portrait mode, slightly wide-angle lens effect typical of front cameras, authentic influencer content style.

Selfie framing: Close enough to feel personal and intimate, showing personality and genuine moment, with enough context to show setting and styling details. Natural hand positioning holding phone, slight tilt for flattering angle, authentic selfie composition that feels relatable yet aspirational.`
}

/**
 * Build mirror selfie prompt
 * Second most common (30%) - outfit showcase, full body, reflection
 */
function buildMirrorSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, locationDetails, lighting, mood, aesthetic, brands, props, decor, activity, posture } = elements
  
  // Build brand context
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in complete styled outfit'
  
  // Determine mirror type based on setting
  let mirrorType = 'large mirror'
  const settingLower = (locationDetails || setting).toLowerCase()
  if (settingLower.includes('bathroom')) mirrorType = 'bathroom vanity mirror'
  if (settingLower.includes('boutique') || settingLower.includes('fitting')) mirrorType = 'full-length boutique mirror'
  if (settingLower.includes('gym') || settingLower.includes('studio')) mirrorType = 'studio mirror'
  if (settingLower.includes('bedroom') || settingLower.includes('home')) mirrorType = 'floor-length bedroom mirror'
  
  // Build setting with details
  let settingWithDetails = locationDetails || setting
  if (decor.length > 0) {
    const decorText = decor.slice(0, 4).join(', ')
    settingWithDetails = `${settingWithDetails}${decorText ? `, ${decorText}` : ''}`
  }
  
  // Build props/details text
  let propsText = ''
  if (props.length > 0) {
    propsText = props.slice(0, 5).join(', ')
  }
  
  // Build pose text
  let poseText = 'Standing'
  if (posture) {
    poseText = posture.charAt(0).toUpperCase() + posture.slice(1)
  }
  
  return `Ultra-realistic iPhone 15 Pro mirror selfie reflection. Reference images attached: use these reference images to maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Authentic mirror selfie aesthetic showing complete outfit and setting.

${poseText} in front of ${mirrorType} in ${settingWithDetails}, ${brandContext}${propsText ? `. Details visible in reflection: ${propsText}` : ''}. Holding phone at chest to waist level, capturing full body or three-quarter reflection in mirror. Mirror clearly visible in frame showing complete outfit styling from head to toe, phone visible in reflection creating authentic selfie composition.

${lighting} creating balanced illumination across reflection. ${mood} with ${aesthetic}. Mirror reflection showing: complete outfit details, subtle room/setting details in background through mirror${propsText ? `, ${propsText}` : ''}, natural selfie positioning with phone held confidently.

Looking at phone screen or glancing at mirror reflection, creating natural mirror selfie dynamic. Reflection framing: Full outfit visible showing styling choices, posture confident but natural, authentic influencer mirror selfie that showcases both outfit and setting elegantly. Clean mirror surface with realistic reflection quality, subtle room details visible creating context and depth.`
}

/**
 * Build elevated selfie prompt
 * Least common (20%) - professional setup, polished, ring light
 */
function buildElevatedSelfiePrompt(elements: ReturnType<typeof extractPromptElements>): string {
  const { outfit, setting, locationDetails, lighting, mood, aesthetic, brands, props, decor, activity, posture } = elements
  
  // Build brand context
  const brandContext = brands.length > 0 
    ? `wearing ${brands.join(' and ')} pieces - ${outfit}` 
    : outfit ? `wearing ${outfit}` : 'in polished styled outfit'
  
  // Build setting with details
  let settingWithDetails = locationDetails || setting
  if (decor.length > 0) {
    const decorText = decor.slice(0, 3).join(', ')
    settingWithDetails = `${settingWithDetails}${decorText ? `, ${decorText}` : ''}`
  }
  
  // Build props/details text
  let propsText = ''
  if (props.length > 0) {
    propsText = props.slice(0, 4).join(', ')
  }
  
  // Build pose text
  let poseText = 'looking directly at camera lens with confident, polished expression'
  if (posture || activity) {
    const poseParts: string[] = []
    if (posture) poseParts.push(posture)
    if (activity) poseParts.push(activity)
    if (poseParts.length > 0) {
      poseText = `${poseParts.join(', ')}, looking directly at camera lens with confident, polished expression`
    }
  }
  
  return `Ultra-realistic iPhone 15 Pro elevated selfie setup. Reference images attached: use these reference images to maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Professional influencer selfie aesthetic with polished production quality.

Professional selfie setting: ${settingWithDetails}, ${brandContext}${propsText ? `. Details visible: ${propsText}` : ''}. Phone positioned on small tripod or elevated stable surface, creating controlled self-timer or remote shutter setup. Face to upper body framing, slightly elevated camera angle creating flattering perspective, ${poseText}.

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

