/**
 * Aesthetic Extractor for Feed Planner Background Generation
 * 
 * PURPOSE: Extract locked aesthetic elements from preview template prompts
 * to ensure paid blueprint images maintain consistent style.
 * 
 * The preview template contains aesthetic elements (vibe, color, setting, outfit, lighting)
 * that must be preserved across all 12 individual images in the paid blueprint grid.
 */

export interface LockedAesthetic {
  // Visual elements
  vibe: string
  colorGrade: string
  setting: string
  outfit: string
  lightingQuality: string
  
  // Technical NanoBanana Pro parameters
  assembly: string          // e.g., "luxury_minimal_beige"
  baseIdentityPrompt: string // The NanoBanana identity preservation text (FIXED)
  qualityModifiers: string  // Technical quality keywords
}

/**
 * Extract aesthetic elements from a preview template prompt
 * 
 * The preview template has a structured format:
 * - Vibe: [description]
 * - Setting: [description]
 * - Outfits: [description]
 * - Color grade: [description]
 * 
 * This function parses these elements to create a locked aesthetic guide.
 */
export function extractAestheticFromTemplate(previewPrompt: string): LockedAesthetic {
  if (!previewPrompt || typeof previewPrompt !== 'string') {
    console.warn('[Aesthetic Extractor] Invalid preview prompt, using defaults')
    return getDefaultAesthetic()
  }

  const prompt = previewPrompt.trim()
  
  console.log('[Aesthetic Extractor] Extracting from preview template...')
  
  // Extract all required fields
  const vibe = extractVibe(prompt)
  const colorGrade = extractColorGrade(prompt)
  const setting = extractSetting(prompt)
  const outfit = extractOutfit(prompt)
  const lightingQuality = extractLighting(prompt)
  const assembly = extractAssembly(prompt)
  const baseIdentityPrompt = getBaseIdentityPrompt()
  const qualityModifiers = extractQualityModifiers(prompt)
  
  const aesthetic: LockedAesthetic = {
    // Visual elements
    vibe,
    colorGrade,
    setting,
    outfit,
    lightingQuality,
    
    // Technical NanoBanana Pro parameters
    assembly,
    baseIdentityPrompt,
    qualityModifiers,
  }
  
  // Enhanced logging for three-part prompt structure
  console.log('[Aesthetic Extractor] ✅ Extracted aesthetic:')
  console.log('  Visual Elements:')
  console.log('    - Vibe:', vibe)
  console.log('    - Color Grade:', colorGrade)
  console.log('    - Setting:', setting)
  console.log('    - Outfit:', outfit)
  console.log('    - Lighting:', lightingQuality)
  console.log('  Technical NanoBanana Pro Parameters:')
  console.log('    - Assembly:', assembly)
  console.log('    - Base Identity Prompt:', baseIdentityPrompt.substring(0, 80) + '...')
  console.log('    - Quality Modifiers:', qualityModifiers)
  
  return aesthetic
}

/**
 * Extract vibe/mood keywords from the prompt
 * Looks for: luxury, minimal, cozy, editorial, bold, soft, warm, dark, bright
 */
function extractVibe(prompt: string): string {
  const vibePatterns = [
    /vibe:\s*([^.\n]+)/i,
    /(luxury|minimal|cozy|editorial|bold|soft|warm|dark|bright|moody|sophisticated|elegant|refined|stripped-back|zen|quiet|understated)/gi,
  ]
  
  // First, try to find explicit "Vibe:" section
  for (const pattern of vibePatterns) {
    const match = prompt.match(pattern)
    if (match) {
      // If it's a "Vibe:" match, extract the description
      if (match[1]) {
        // Clean up the description (remove extra whitespace, limit length)
        const description = match[1].trim().split(/[.\n]/)[0].trim()
        if (description.length > 0 && description.length < 100) {
          return description
        }
      }
      // If it's a keyword match, collect multiple keywords
      if (match[0] && !match[1]) {
        const keywords: string[] = []
        let lastIndex = 0
        while (lastIndex < prompt.length) {
          const keywordMatch = prompt.slice(lastIndex).match(pattern)
          if (!keywordMatch) break
          keywords.push(keywordMatch[0].toLowerCase())
          lastIndex = lastIndex + (keywordMatch.index || 0) + keywordMatch[0].length
          if (keywords.length >= 3) break // Limit to 3 keywords
        }
        if (keywords.length > 0) {
          return keywords.slice(0, 2).join(' ')
        }
      }
    }
  }
  
  // Fallback: look for common aesthetic descriptors
  const fallbackPatterns = [
    /(dark\s+(luxury|minimal|editorial|moody))/i,
    /(light\s+(luxury|minimal|minimalistic|scandinavian))/i,
    /(beige\s+(aesthetic|luxury|minimal))/i,
    /(warm\s+(beige|luxury|aesthetic))/i,
  ]
  
  for (const pattern of fallbackPatterns) {
    const match = prompt.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }
  
  return 'professional'
}

/**
 * Extract color grade/color palette from the prompt
 * Looks for: "Color grade:", color descriptions, warm/cool tones
 */
function extractColorGrade(prompt: string): string {
  // First, try to find explicit "Color grade:" section
  const colorGradePattern = /color\s+grade:\s*([^.\n]+)/i
  const colorGradeMatch = prompt.match(colorGradePattern)
  if (colorGradeMatch && colorGradeMatch[1]) {
    const description = colorGradeMatch[1].trim().split(/[.\n]/)[0].trim()
    if (description.length > 0 && description.length < 150) {
      return description
    }
  }
  
  // Look for color descriptions
  const colorPatterns = [
    /(warm\s+(tone|hour|light|beige|camel|golden))/gi,
    /(cool\s+(tone|gray|grey|slate|blue))/gi,
    /(golden\s+hour)/gi,
    /(deep\s+(black|gray|grey|charcoal))/gi,
    /(bright\s+(white|cream|ivory))/gi,
    /(soft\s+(beige|cream|warm|tone))/gi,
    /(high\s+contrast)/gi,
    /(muted\s+(color|tone|palette))/gi,
  ]
  
  const matches: string[] = []
  for (const pattern of colorPatterns) {
    const found = prompt.match(pattern)
    if (found) {
      matches.push(...found.map(m => m.toLowerCase()))
    }
  }
  
  if (matches.length > 0) {
    // Return first 2-3 color descriptors
    return matches.slice(0, 3).join(', ')
  }
  
  // Look for specific color mentions
  const specificColors = [
    /(black|white|beige|camel|cream|tan|gray|grey|charcoal|ivory|nude|chocolate|brown)/gi,
  ]
  
  for (const pattern of specificColors) {
    const found = prompt.match(pattern)
    if (found && found.length >= 2) {
      // Return first 3-4 color mentions
      return found.slice(0, 4).join(', ')
    }
  }
  
  return 'natural color tones'
}

/**
 * Extract setting/location from the prompt
 * Looks for: "Setting:", location keywords (penthouse, studio, home, office, etc.)
 */
function extractSetting(prompt: string): string {
  // First, try to find explicit "Setting:" section
  const settingPattern = /setting:\s*([^.\n]+)/i
  const settingMatch = prompt.match(settingPattern)
  if (settingMatch && settingMatch[1]) {
    const description = settingMatch[1].trim().split(/[.\n]/)[0].trim()
    if (description.length > 0 && description.length < 150) {
      return description
    }
  }
  
  // Look for location keywords
  const locationPatterns = [
    /(penthouse|apartment|loft|studio|home|house|office|workspace|desk)/gi,
    /(concrete|brutalist|modern|minimal|white|beige|urban|city|street)/gi,
    /(gallery|hotel|lobby|interior|exterior|outdoor|beach|forest|urban)/gi,
    /(scandinavian|parisian|copenhagen|soho|berlin|nyc|new york)/gi,
  ]
  
  const matches: string[] = []
  for (const pattern of locationPatterns) {
    const found = prompt.match(pattern)
    if (found) {
      matches.push(...found.map(m => m.toLowerCase()))
    }
  }
  
  if (matches.length > 0) {
    // Return first 2-3 location descriptors
    return matches.slice(0, 3).join(', ')
  }
  
  return 'indoor setting'
}

/**
 * Extract outfit/wardrobe from the prompt
 * Looks for: "Outfits:", "wearing", clothing descriptions
 */
function extractOutfit(prompt: string): string {
  // First, try to find explicit "Outfits:" section
  const outfitPattern = /outfits?:\s*([^.\n]+)/i
  const outfitMatch = prompt.match(outfitPattern)
  if (outfitMatch && outfitMatch[1]) {
    const description = outfitMatch[1].trim().split(/[.\n]/)[0].trim()
    if (description.length > 0 && description.length < 200) {
      return description
    }
  }
  
  // Look for clothing keywords
  const clothingPatterns = [
    /(wearing|in|outfit|dressed in)\s+([^.\n]{10,100})/i,
    /(blazer|blouse|dress|sweater|turtleneck|pants|trousers|jacket|coat|shirt)/gi,
    /(silk|linen|cotton|cashmere|leather|wool|knit|ribbed|tailored|oversized)/gi,
    /(casual|formal|professional|minimal|luxury|elegant|sophisticated)/gi,
  ]
  
  for (const pattern of clothingPatterns) {
    const match = prompt.match(pattern)
    if (match) {
      if (match[2]) {
        // Extract the outfit description
        const description = match[2].trim().split(/[.\n]/)[0].trim()
        if (description.length > 10 && description.length < 150) {
          return description
        }
      } else if (match[0]) {
        // Collect clothing keywords
        const keywords: string[] = []
        let lastIndex = 0
        while (lastIndex < prompt.length && keywords.length < 5) {
          const keywordMatch = prompt.slice(lastIndex).match(pattern)
          if (!keywordMatch) break
          keywords.push(keywordMatch[0].toLowerCase())
          lastIndex = lastIndex + (keywordMatch.index || 0) + keywordMatch[0].length
        }
        if (keywords.length > 0) {
          return keywords.slice(0, 4).join(', ')
        }
      }
    }
  }
  
  return 'professional attire'
}

/**
 * Extract lighting quality from the prompt
 * Looks for: "Lighting:", lighting keywords (natural, window, golden, soft, studio, etc.)
 */
function extractLighting(prompt: string): string {
  // First, try to find explicit "Lighting:" section
  const lightingPattern = /lighting:\s*([^.\n]+)/i
  const lightingMatch = prompt.match(lightingPattern)
  if (lightingMatch && lightingMatch[1]) {
    const description = lightingMatch[1].trim().split(/[.\n]/)[0].trim()
    if (description.length > 0 && description.length < 150) {
      return description
    }
  }
  
  // Look for lighting keywords
  const lightingPatterns = [
    /(natural\s+(light|daylight|window|lighting))/gi,
    /(window\s+(light|lighting|daylight))/gi,
    /(golden\s+(hour|light|glow|warmth))/gi,
    /(soft\s+(light|lighting|shadow|focus|natural))/gi,
    /(bright\s+(daylight|even|light|natural))/gi,
    /(warm\s+(tone|light|lighting|glow))/gi,
    /(moody\s+(light|lighting|shadow|city))/gi,
    /(high\s+contrast)/gi,
    /(uneven\s+(light|lighting|natural))/gi,
    /(mixed\s+(color|temperature|source))/gi,
    /(studio\s+lighting)/gi,
    /(overhead|side|backlit|rim\s+light)/gi,
  ]
  
  const matches: string[] = []
  for (const pattern of lightingPatterns) {
    const found = prompt.match(pattern)
    if (found) {
      matches.push(...found.map(m => m.toLowerCase()))
    }
  }
  
  if (matches.length > 0) {
    // Return first 2-3 lighting descriptors
    return matches.slice(0, 3).join(', ')
  }
  
  // Look for general lighting mentions
  const generalLighting = [
    /(daylight|morning\s+light|afternoon\s+light|evening\s+light|dusk)/gi,
    /(ambient|diffused|harsh|gentle|dramatic)/gi,
  ]
  
  for (const pattern of generalLighting) {
    const match = prompt.match(pattern)
    if (match) {
      return match[0].toLowerCase()
    }
  }
  
  return 'natural lighting'
}

/**
 * Get the base identity preservation prompt for NanoBanana Pro
 * This is FIXED for all NanoBanana Pro generations
 */
function getBaseIdentityPrompt(): string {
  return `Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.`
}

/**
 * Extract assembly/style modifier from template prompt
 * Looks for: "Assembly: luxury_minimal_beige" or similar patterns
 */
function extractAssembly(prompt: string): string {
  // First, try to find explicit "Assembly:" section
  const assemblyPattern = /assembly:\s*([^\n,]+)/i
  const assemblyMatch = prompt.match(assemblyPattern)
  if (assemblyMatch && assemblyMatch[1]) {
    const assembly = assemblyMatch[1].trim()
    if (assembly.length > 0 && assembly.length < 50) {
      return assembly
    }
  }
  
  // Look for assembly patterns in template keys
  const assemblyPatterns = [
    /(luxury_dark_moody|luxury_light_minimalistic|luxury_beige_aesthetic)/i,
    /(minimal_dark_moody|minimal_light_minimalistic|minimal_beige_aesthetic)/i,
    /(beige_dark_moody|beige_light_minimalistic|beige_beige_aesthetic)/i,
    /(warm_dark_moody|warm_light_minimalistic|warm_beige_aesthetic)/i,
    /(edgy_dark_moody|edgy_light_minimalistic|edgy_beige_aesthetic)/i,
    /(professional_dark_moody|professional_light_minimalistic|professional_beige_aesthetic)/i,
  ]
  
  for (const pattern of assemblyPatterns) {
    const match = prompt.match(pattern)
    if (match) {
      return match[1].toLowerCase()
    }
  }
  
  // Try to infer from vibe and color
  const vibe = extractVibe(prompt).toLowerCase()
  const colorGrade = extractColorGrade(prompt).toLowerCase()
  
  if (vibe.includes('luxury')) {
    if (colorGrade.includes('dark') || colorGrade.includes('black') || colorGrade.includes('moody')) {
      return 'luxury_dark_moody'
    } else if (colorGrade.includes('light') || colorGrade.includes('white') || colorGrade.includes('bright')) {
      return 'luxury_light_minimalistic'
    } else if (colorGrade.includes('beige') || colorGrade.includes('camel') || colorGrade.includes('tan')) {
      return 'luxury_beige_aesthetic'
    }
  } else if (vibe.includes('minimal')) {
    if (colorGrade.includes('dark') || colorGrade.includes('black')) {
      return 'minimal_dark_moody'
    } else if (colorGrade.includes('light') || colorGrade.includes('white')) {
      return 'minimal_light_minimalistic'
    } else if (colorGrade.includes('beige')) {
      return 'minimal_beige_aesthetic'
    }
  }
  
  // Default assembly
  return 'professional_editorial'
}

/**
 * Extract quality/technical modifiers from template prompt
 * Looks for: "Quality:", quality keywords (professional photography, 8k, high detail, film grain, etc.)
 */
function extractQualityModifiers(prompt: string): string {
  // First, try to find explicit "Quality:" section
  const qualityPattern = /quality:\s*([^\n]+)/i
  const qualityMatch = prompt.match(qualityPattern)
  if (qualityMatch && qualityMatch[1]) {
    const quality = qualityMatch[1].trim()
    if (quality.length > 0 && quality.length < 200) {
      return quality
    }
  }
  
  // Look for quality keywords
  const qualityPatterns = [
    /(professional\s+photography)/gi,
    /(8k|4k|high\s+resolution|high\s+detail)/gi,
    /(film\s+grain|grain|cinematic)/gi,
    /(high\s+quality|ultra\s+realistic|photorealistic)/gi,
    /(iPhone\s+photography\s+style)/gi,
  ]
  
  const qualities: string[] = []
  for (const pattern of qualityPatterns) {
    const matches = prompt.match(pattern)
    if (matches) {
      qualities.push(...matches.map(m => m.toLowerCase()))
    }
  }
  
  if (qualities.length > 0) {
    // Return unique qualities joined
    const uniqueQualities = [...new Set(qualities)]
    return uniqueQualities.join(', ')
  }
  
  // Default quality modifiers
  return 'professional photography, high detail'
}

/**
 * Get default aesthetic when extraction fails
 */
function getDefaultAesthetic(): LockedAesthetic {
  return {
    vibe: 'professional',
    colorGrade: 'natural color tones',
    setting: 'indoor setting',
    outfit: 'professional attire',
    lightingQuality: 'natural lighting',
    assembly: 'professional_editorial',
    baseIdentityPrompt: getBaseIdentityPrompt(),
    qualityModifiers: 'professional photography, high detail',
  }
}

/**
 * Validate that a blueprint template prompt contains extractable fields
 * Returns validation result with missing fields
 */
export function validateBlueprintTemplate(templatePrompt: string): {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
} {
  if (!templatePrompt || typeof templatePrompt !== 'string') {
    return {
      isValid: false,
      missingFields: ['template', 'vibe', 'setting', 'outfit', 'lighting', 'assembly', 'qualityModifiers'],
      warnings: ['Template prompt is empty or invalid'],
    }
  }

  const missingFields: string[] = []
  const warnings: string[] = []

  // Check for visual elements
  const hasVibe = /vibe:/i.test(templatePrompt) || /(luxury|minimal|cozy|editorial|bold|soft|warm|dark|bright|moody)/i.test(templatePrompt)
  if (!hasVibe) {
    missingFields.push('vibe')
    warnings.push('No explicit "Vibe:" section or vibe keywords found')
  }

  const hasSetting = /setting:/i.test(templatePrompt) || /(penthouse|apartment|loft|studio|home|office|workspace|desk|concrete|brutalist|modern|minimal|white|beige|urban|city|street)/i.test(templatePrompt)
  if (!hasSetting) {
    missingFields.push('setting')
    warnings.push('No explicit "Setting:" section or location keywords found')
  }

  const hasOutfit = /outfits?:/i.test(templatePrompt) || /(wearing|in|outfit|dressed in|blazer|blouse|dress|sweater|turtleneck|pants|trousers|jacket|coat|shirt)/i.test(templatePrompt)
  if (!hasOutfit) {
    missingFields.push('outfit')
    warnings.push('No explicit "Outfits:" section or clothing keywords found')
  }

  const hasLighting = /lighting:/i.test(templatePrompt) || /(natural|window|golden|soft|bright|warm|moody|studio|overhead|side|backlit|rim light)/i.test(templatePrompt)
  if (!hasLighting) {
    missingFields.push('lighting')
    warnings.push('No explicit "Lighting:" section or lighting keywords found')
  }

  const hasColorGrade = /color\s+grade:/i.test(templatePrompt) || /(warm|cool|golden|deep|bright|soft|high contrast|muted)/i.test(templatePrompt)
  if (!hasColorGrade) {
    missingFields.push('colorGrade')
    warnings.push('No explicit "Color grade:" section or color keywords found')
  }

  // Check for technical NanoBanana Pro parameters
  const hasAssembly = /assembly:/i.test(templatePrompt) || /(luxury_dark_moody|luxury_light_minimalistic|luxury_beige_aesthetic|minimal_dark_moody|minimal_light_minimalistic|minimal_beige_aesthetic|beige_dark_moody|beige_light_minimalistic|beige_beige_aesthetic|warm_dark_moody|warm_light_minimalistic|warm_beige_aesthetic|edgy_dark_moody|edgy_light_minimalistic|edgy_beige_aesthetic|professional_dark_moody|professional_light_minimalistic|professional_beige_aesthetic)/i.test(templatePrompt)
  if (!hasAssembly) {
    missingFields.push('assembly')
    warnings.push('No explicit "Assembly:" section or assembly pattern found - will be inferred from vibe/color')
  }

  const hasQuality = /quality:/i.test(templatePrompt) || /(professional photography|8k|4k|high resolution|high detail|film grain|cinematic|high quality|ultra realistic|photorealistic|iPhone photography style)/i.test(templatePrompt)
  if (!hasQuality) {
    missingFields.push('qualityModifiers')
    warnings.push('No explicit "Quality:" section or quality keywords found - will use defaults')
  }

  // baseIdentityPrompt is always present (it's fixed), so we don't need to check it

  const isValid = missingFields.length === 0

  return {
    isValid,
    missingFields,
    warnings,
  }
}
