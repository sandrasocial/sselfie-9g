/**
 * Selfie Converter - FIRST-PERSON POV
 * 
 * Converts traditional professional photography concepts
 * into authentic selfie concepts while maintaining quality.
 * 
 * CRITICAL: Selfies are NOT a separate category - they're a variation
 * that can be applied to ANY category (Luxury, Wellness, Fashion, etc.)
 * 
 * CRITICAL FIX: Selfie prompts describe what the SELFIE shows (first-person POV),
 * NOT describing someone taking a selfie (external observer perspective).
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
 * Scene elements extracted from description
 * Used to build first-person POV selfie prompts
 */
interface SceneElements {
  action: string
  posture: string
  outfit: string
  brands: string[]
  setting: string
  details: string[]
  lighting: string
  mood: string
}

/**
 * Extract scene elements from description for first-person POV selfie prompts
 */
function extractSceneFromDescription(description: string): SceneElements {
  const scene: SceneElements = {
    action: '',
    posture: '',
    outfit: '',
    brands: [],
    setting: '',
    details: [],
    lighting: '',
    mood: ''
  }
  
  if (!description || description.length < 30) {
    return scene
  }
  
  // Extract outfit
  const outfitMatch = description.match(/wearing\s+([^,\.]{15,200}?)(?:\s*,\s*(?:standing|sitting|with|looking|in|at)|[.,]|$)/i)
  if (outfitMatch && outfitMatch[1]) {
    scene.outfit = outfitMatch[1].trim()
  }
  
  // Extract brands
  const brandPattern = /\b(Ganni|Reformation|Alo|Lululemon|Set Active|Sleeper|Toteme|Khaite|The Row|Bottega Veneta|Chanel|Dior|Hermès|Jenni Kayne|Everlane|Mango|Zara|COS|Eberjey|Saint Laurent|Jimmy Choo)\b/gi
  const brandMatches = description.match(brandPattern)
  if (brandMatches) {
    scene.brands = [...new Set(brandMatches.map(b => b.charAt(0).toUpperCase() + b.slice(1)))]
  }
  
  // Extract posture
  const postureMatch = description.match(/\b(sitting|standing|seated|kneeling|lying|leaning|walking)\b/i)
  if (postureMatch) {
    scene.posture = postureMatch[1].toLowerCase()
  }
  
  // Extract action
  const actionMatch = description.match(/((?:sitting|standing|leaning|walking)\s+(?:on|in|at|by)\s+[^,\.]{5,80})/i)
  if (actionMatch) {
    scene.action = actionMatch[1].trim()
  } else if (scene.posture) {
    scene.action = scene.posture
  }
  
  // Extract setting
  const settingMatch = description.match(/(?:in|at)\s+((?:industrial|modern|cozy|bright|elegant|luxury|spacious|minimal)[^,]{10,150}?)(?:,|\.|with|wearing)/i)
  if (settingMatch && settingMatch[1]) {
    scene.setting = settingMatch[1].trim()
  }
  
  // Extract details (props, decor, etc.)
  const detailsPatterns = [
    /(?:with|featuring|decorated with)\s+([^,\.]{5,80})/gi,
    /(?:Christmas tree|garland|ornaments|lights|candles|flowers)/gi
  ]
  
  for (const pattern of detailsPatterns) {
    const matches = description.match(pattern)
    if (matches) {
      scene.details.push(...matches.map(m => m.trim()))
    }
  }
  
  // Extract lighting
  const lightingMatch = description.match(/((?:string lights|natural (?:window )?light|warm (?:contrast|glow)|soft (?:light|lighting)|golden hour|evening light)(?:\s+[^,.]{0,60})?)/i)
  if (lightingMatch) {
    scene.lighting = lightingMatch[1].trim()
  }
  
  // Extract mood
  const moodMatch = description.match(/(modern gothic|industrial|cozy|elegant|sophisticated|edgy|minimal(?:ist)?|confident|natural)/i)
  if (moodMatch) {
    scene.mood = moodMatch[1]
  }
  
  return scene
}

/**
 * Convert a traditional concept to selfie concept - FIRST-PERSON POV
 * 
 * @param concept - The concept to convert
 * @param type - Type of selfie to create (default: handheld)
 * @returns Converted selfie concept
 */
export function convertToSelfie(
  concept: ConceptToConvert,
  type: SelfieType = 'handheld',
  hasReferenceImages: boolean = false
): ConceptToConvert {
  
  console.log(`[SELFIE-CONVERTER] Converting to ${type} selfie - FIRST-PERSON POV`)
  
  const { prompt, title, description } = concept
  
  // Extract scene from description
  const scene = extractSceneFromDescription(description || '')
  
  // Build selfie prompt with proper POV
  let selfiePrompt = ''
  let selfieTitle = ''
  let selfieDescription = ''
  
  switch (type) {
    case 'handheld':
      selfiePrompt = buildHandheldSelfieFromScene(scene, hasReferenceImages)
      selfieTitle = `${title} - Selfie`
      selfieDescription = `Authentic front camera selfie: ${description}`
      break
      
    case 'mirror':
      selfiePrompt = buildMirrorSelfieFromScene(scene, hasReferenceImages)
      selfieTitle = `${title} - Mirror Selfie`
      selfieDescription = `Mirror selfie reflection: ${description}`
      break
      
    case 'elevated':
      selfiePrompt = buildElevatedSelfieFromScene(scene, hasReferenceImages)
      selfieTitle = `${title} - Pro Selfie`
      selfieDescription = `Professional selfie setup: ${description}`
      break
  }
  
  // Remove any external observer language
  selfiePrompt = removeExternalObserverLanguage(selfiePrompt)
  
  // Ensure first-person POV elements present
  selfiePrompt = ensureFirstPersonPOV(selfiePrompt)
  
  console.log(`[SELFIE-CONVERTER] Created ${type} selfie (${selfiePrompt.length} chars)`)
  console.log(`[SELFIE-CONVERTER] First 150 chars:`, selfiePrompt.substring(0, 150))
  
  return {
    ...concept,
    title: selfieTitle,
    description: selfieDescription,
    prompt: selfiePrompt
  }
}

/**
 * CRITICAL FIX: Remove external observer language
 */
function removeExternalObserverLanguage(prompt: string): string {
  
  // Remove phrases that describe TAKING a selfie (external view)
  const externalPhrases = [
    /\bnatural hand positioning holding phone\b/gi,
    /\bslight tilt for flattering angle\b/gi,
    /\bauthentic selfie composition that feels\b/gi,
    /\bperson taking selfie\b/gi,
    /\bwoman taking selfie\b/gi,
    /\bman taking selfie\b/gi,
    /\btaking a selfie\b/gi,
    /\bpositioning phone for selfie\b/gi,
    /\bholding phone to take selfie\b/gi
  ]
  
  let cleaned = prompt
  
  for (const phrase of externalPhrases) {
    cleaned = cleaned.replace(phrase, '')
  }
  
  // Clean up any double spaces or commas
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim()
  
  return cleaned
}

/**
 * CRITICAL FIX: Add first-person POV elements
 */
function ensureFirstPersonPOV(prompt: string): string {
  
  // Check for required first-person POV elements
  const hasArmExtended = /arm extended holding phone|holding phone at (?:angle|chest|waist)/i.test(prompt)
  const hasFaceVisible = /face (?:and upper body )?visible|showing face|face close to camera/i.test(prompt)
  const hasSelfieFraming = /close-up to medium shot|selfie framing|front camera/i.test(prompt)
  
  let enhanced = prompt
  
  // Add missing first-person elements
  if (!hasArmExtended && /front camera selfie/i.test(prompt) && !/mirror/i.test(prompt)) {
    // For handheld selfies, arm must be visible
    enhanced = enhanced.replace(
      /(iPhone 15 Pro front camera selfie\.)/i,
      '$1 Arm extended holding phone at slight angle,'
    )
  }
  
  if (!hasFaceVisible) {
    // Face should be mentioned as visible in frame
    const insertPoint = enhanced.search(/\./i)
    if (insertPoint >= 0) {
      // Handle edge case where period is at position 0
      enhanced = enhanced.substring(0, insertPoint + 1) + ' Face and upper body visible in frame.' + enhanced.substring(insertPoint + 1)
    }
  }
  
  return enhanced
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
 * Build HANDHELD SELFIE - First-Person POV
 * 
 * CRITICAL: This is what the SELFIE shows, not describing taking it
 * Authentic handheld selfie - think human taking the image themselves
 * Do NOT mention iPhone being visible (creates meta-image of someone taking picture of user)
 */
function buildHandheldSelfieFromScene(scene: SceneElements, hasReferenceImages: boolean = false): string {
  
  // Build outfit description
  const outfitText = scene.brands.length > 0
    ? `wearing ${scene.brands.join(' and ')} ${scene.outfit}`
    : scene.outfit ? `wearing ${scene.outfit}` : 'in styled outfit'
  
  // Build setting context
  const settingText = scene.details.length > 0
    ? `${scene.setting}, ${scene.details.slice(0, 3).join(', ')} visible in background`
    : scene.setting
  
  // Reference image text (only if reference images exist)
  const referenceText = hasReferenceImages
    ? 'Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. '
    : ''
  
  return `${referenceText}Ultra-realistic iPhone 15 Pro front camera selfie. Authentic handheld iPhone selfie, ${scene.action || 'standing'} ${settingText ? 'in ' + settingText : ''}, ${outfitText}, arm extended naturally holding phone. Face and upper body visible in frame, close-up to medium shot framing showing personality and scene context. ${scene.lighting || 'Natural lighting'} creating soft flattering illumination ${scene.mood ? 'with ' + scene.mood : ''}. Looking directly at camera with natural ${scene.mood || 'confident'} expression. Natural bokeh, authentic influencer selfie aesthetic, shot on iPhone front camera. Natural selfie angle and composition, like a real person taking a photo of themselves.`.trim()
}

/**
 * Build MIRROR SELFIE - First-Person POV
 * 
 * CRITICAL: Shows reflection in mirror, not describing someone at mirror
 * Authentic mirror selfie - NO ring light or tripod visible (think human taking the image)
 */
function buildMirrorSelfieFromScene(scene: SceneElements, hasReferenceImages: boolean = false): string {
  
  // Build outfit description
  const outfitText = scene.brands.length > 0
    ? `wearing ${scene.brands.join(' and ')} ${scene.outfit}`
    : scene.outfit ? `wearing ${scene.outfit}` : 'in styled outfit'
  
  // Build setting context
  const settingText = scene.details.length > 0
    ? `${scene.setting}, ${scene.details.slice(0, 3).join(', ')} visible in mirror reflection`
    : scene.setting
  
  // Determine mirror type
  let mirrorType = 'full-length mirror'
  if (scene.setting.includes('bathroom')) mirrorType = 'bathroom mirror'
  if (scene.setting.includes('boutique')) mirrorType = 'boutique fitting room mirror'
  if (scene.setting.includes('bedroom')) mirrorType = 'bedroom full-length mirror'
  
  // Reference image text (only if reference images exist)
  const referenceText = hasReferenceImages
    ? 'Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. '
    : ''
  
  return `${referenceText}Ultra-realistic iPhone 15 Pro front camera selfie. Authentic mirror selfie, ${scene.posture || 'standing'} in front of ${mirrorType}, ${outfitText}, holding phone at chest to waist level capturing full body or three-quarter reflection. Mirror clearly visible in frame showing complete outfit styling from head to toe, full outfit visible in reflection. ${settingText ? settingText + ' visible through mirror.' : ''} ${scene.lighting || 'Natural overhead and side lighting'} creating balanced illumination ${scene.mood ? 'with ' + scene.mood : ''}. Looking at mirror reflection with natural ${scene.mood || 'confident'} expression, creating authentic mirror selfie dynamic. Reflection shows complete scene: full outfit details visible, ${scene.action || 'natural pose'}, authentic influencer mirror selfie aesthetic. Clean mirror surface with realistic reflection quality, like a real person taking a mirror selfie showing their full outfit.`.trim()
}

/**
 * Build ELEVATED SELFIE - First-Person POV (DEPRECATED - Use handheld or mirror instead)
 * 
 * CRITICAL: User doesn't want tripod or ring light visible
 * This type is deprecated - use handheld or mirror for authentic selfies
 * Keeping function for backward compatibility but should not be used
 */
function buildElevatedSelfieFromScene(scene: SceneElements, hasReferenceImages: boolean = false): string {
  
  // Build outfit description
  const outfitText = scene.brands.length > 0
    ? `wearing ${scene.brands.join(' and ')} ${scene.outfit}`
    : scene.outfit ? `wearing ${scene.outfit}` : 'in styled outfit'
  
  // Build setting context
  const settingText = scene.details.length > 0
    ? `${scene.setting}, ${scene.details.slice(0, 3).join(', ')} visible in background`
    : scene.setting
  
  // Reference image text (only if reference images exist)
  const referenceText = hasReferenceImages
    ? 'Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. '
    : ''
  
  // Use handheld style instead (no tripod/ring light visible)
  return `${referenceText}Ultra-realistic iPhone 15 Pro front camera selfie. Authentic handheld iPhone selfie, ${scene.action || 'standing'} ${settingText ? 'in ' + settingText : ''}, ${outfitText}, arm extended naturally holding phone. Face and upper body visible in frame, close-up to medium shot framing showing personality and scene context. ${scene.lighting || 'Natural lighting'} creating soft flattering illumination ${scene.mood ? 'with ' + scene.mood : ''}. Looking directly at camera with natural ${scene.mood || 'confident'} expression. Natural bokeh, authentic influencer selfie aesthetic, shot on iPhone front camera. Natural selfie angle and composition, like a real person taking a photo of themselves.`.trim()
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
 * - 60% handheld (most common, most authentic)
 * - 40% mirror (popular for outfit showcase)
 * - 0% elevated (deprecated - tripod/ring light not wanted)
 * 
 * @returns Random selfie type based on weighted distribution
 */
export function getRandomSelfieType(): SelfieType {
  const random = Math.random()
  
  if (random < 0.6) {
    console.log('[SELFIE-CONVERTER] Selected: handheld (60% weight)')
    return 'handheld'
  }
  
  console.log('[SELFIE-CONVERTER] Selected: mirror (40% weight)')
  return 'mirror'
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
  
  // Luxury prefers mirror for outfit showcase
  if (upperCategory.includes('LUXURY') || upperCategory.includes('EDITORIAL')) {
    return Math.random() < 0.6 ? 'mirror' : 'handheld'
  }
  
  // Default: use weighted random (handheld or mirror only)
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

