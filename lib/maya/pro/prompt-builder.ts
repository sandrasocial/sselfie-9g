/**
 * Pro Mode Prompt Builder
 * 
 * Builds sophisticated 250-500 word prompts for Studio Pro Mode.
 * Uses real brand names, professional photography language, and specific sections.
 */

import { PRO_MODE_CATEGORIES, getCategoryByKey, ImageLibrary } from './category-system'
import { selectMixedBrands } from './prompt-architecture'

export interface ConceptComponents {
  title: string
  description: string
  category: string
  aesthetic?: string
  outfit?: {
    top?: string
    bottom?: string
    outerwear?: string
    accessories?: string[]
    shoes?: string
  }
  pose?: string
  lighting?: string
  setting?: string
  mood?: string
  brandReferences?: string[]
}

/**
 * Build complete Pro Mode prompt (250-500 words)
 * 
 * Structure:
 * - Professional photography introduction
 * - Outfit section (with real brand names)
 * - Pose section
 * - Lighting section
 * - Setting section
 * - Mood section
 * - Aesthetic description
 */
export function buildProModePrompt(
  category: string | null,
  concept: ConceptComponents,
  userImages: ImageLibrary,
  userRequest?: string
): string {
  // 🔴 FIX: Use concept's category if provided, otherwise use category parameter, fallback to LIFESTYLE only for prompt builder compatibility
  // The concept's category comes from Maya's AI generation, so it's the most accurate
  const conceptCategory = (concept.category && typeof concept.category === 'string') ? concept.category.toUpperCase() : null
  const safeCategory = conceptCategory || (category && typeof category === 'string' ? category.toUpperCase() : 'LIFESTYLE')
  const categoryInfo = getCategoryByKey(safeCategory) || PRO_MODE_CATEGORIES.LIFESTYLE

  // 🔴 DEBUG: Log inputs
  console.log('[buildProModePrompt] Inputs:', {
    conceptTitle: concept.title?.substring(0, 50),
    conceptDescription: concept.description?.substring(0, 50),
    conceptCategory: concept.category,
    safeCategory,
    userRequest: userRequest?.substring(0, 50),
  })

  // 🔴 CRITICAL: Extract ALL details from concept description FIRST
  // The description should already contain outfit, setting, pose, lighting details
  // Only fall back to category defaults if description lacks specific details
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const descriptionWordCount = descText.split(/\s+/).length
  const hasDetailedDescription = descriptionWordCount >= 50 && 
    /wearing|sitting|standing|in|with|holding|looking|outfit|attire|setting|room|interior|pose|lighting/i.test(descText)

  if (hasDetailedDescription) {
    console.log('[buildProModePrompt] ✅ Using detailed description directly (description has', descriptionWordCount, 'words)')
    // Use description as primary source for all sections
    // Extract outfit, pose, setting, lighting from description
  } else {
    console.log('[buildProModePrompt] ⚠️ Description lacks detail (', descriptionWordCount, 'words), using category defaults with description as context')
    // Fall back to category defaults, but use description as context
  }

  // Extract style/aesthetic keywords from userRequest to personalize the prompt
  const userRequestLower = (userRequest || '').toLowerCase()
  const isPinterestStyle = /pinterest|curated|aesthetic|dreamy|soft|feminine/i.test(userRequest || '')
  const isEditorialStyle = /editorial|fashion|sophisticated|refined/i.test(userRequest || '')
  const isLifestyleStyle = /lifestyle|casual|everyday|authentic|real/i.test(userRequest || '')
  const isLuxuryStyle = /luxury|elegant|chic|sophisticated|premium/i.test(userRequest || '')

  // 🔴 CRITICAL: Build sections using concept title/description and userRequest
  // buildOutfitSection, buildPoseSection, etc. will extract from description first, then fall back to category defaults
  const outfitSection = buildOutfitSection(concept, categoryInfo, userRequest)
  const poseSection = buildPoseSection(concept, userRequest)
  const lightingSection = buildLightingSection(concept, userRequest)
  const settingSection = buildSettingSection(concept, userRequest)
  const moodSection = buildMoodSection(concept, userRequest)
  const aestheticSection = buildAestheticDescription(categoryInfo, concept, userRequest)

  // 🔴 DEBUG: Log generated sections
  console.log('[buildProModePrompt] Generated sections:', {
    outfit: outfitSection.substring(0, 50),
    pose: poseSection.substring(0, 50),
    setting: settingSection.substring(0, 50),
  })

  // Determine photography style based on category and request
  const categoryLower = safeCategory.toLowerCase()
  let cameraSpecs: string
  
  if (categoryLower.includes('luxury') || isEditorialStyle) {
    // Editorial/Luxury: Professional fashion photography
    cameraSpecs = 'Vertical format, editorial photography, controlled lighting, fashion-editorial framing, professional fashion shoot aesthetic.'
  } else if (categoryLower.includes('fashion')) {
    // Fashion: Professional editorial photography
    cameraSpecs = 'Vertical format, fashion photography, defined lighting, controlled depth of field, professional editorial aesthetic.'
  } else if (categoryLower.includes('wellness') || categoryLower.includes('lifestyle') || isLifestyleStyle || isPinterestStyle) {
    // Lifestyle/Wellness: Lifestyle photography
    cameraSpecs = 'Vertical format, lifestyle photography, natural or soft editorial lighting, shallow depth of field, lifestyle photography feel.'
  } else if (categoryLower.includes('beauty')) {
    // Beauty: Editorial beauty photography
    cameraSpecs = 'Vertical format, beauty photography, soft even illumination, close-up or medium framing, professional beauty aesthetic.'
  } else if (categoryLower.includes('travel')) {
    // Travel: Lifestyle travel photography
    cameraSpecs = 'Vertical format, lifestyle travel photography, natural or soft ambient lighting, lifestyle photography feel.'
  } else {
    // Default: Lifestyle photography
    cameraSpecs = 'Vertical format, lifestyle photography, natural or soft editorial lighting, shallow depth of field, lifestyle photography feel.'
  }

  const prompt = `Professional photography. ${isPinterestStyle ? 'Pinterest-style' : isEditorialStyle ? 'Editorial' : 'Influencer'} portrait maintaining exactly the same physical characteristics, facial features, and body proportions. Editorial quality, professional photography aesthetic.

${outfitSection}

${poseSection}

${lightingSection}

${settingSection}

${moodSection}

Aesthetic: ${aestheticSection}

${cameraSpecs}`

  return prompt.trim()
}

/**
 * Build outfit section with real brand names
 * 
 * Uses category-specific brands and specific item descriptions.
 * NO generic "stylish outfit" - always specific brand items.
 * Personalizes based on userRequest when available.
 * Uses mixed-brand strategy: 1-2 accessible brands + 1 luxury accent max.
 */
function buildOutfitSection(
  concept: ConceptComponents,
  categoryInfo: { brands: string[]; name: string },
  userRequest?: string
): string {
  const category = (categoryInfo.name && typeof categoryInfo.name === 'string') 
    ? categoryInfo.name.toLowerCase() 
    : 'lifestyle'

  // If concept has specific outfit details, use them
  if (concept.outfit) {
    const parts: string[] = []
    if (concept.outfit.top) parts.push(concept.outfit.top)
    if (concept.outfit.bottom) parts.push(concept.outfit.bottom)
    if (concept.outfit.outerwear) parts.push(concept.outfit.outerwear)
    if (concept.outfit.accessories && concept.outfit.accessories.length > 0) {
      parts.push(concept.outfit.accessories.join(', '))
    }
    if (concept.outfit.shoes) parts.push(concept.outfit.shoes)

    if (parts.length > 0) {
      return `Outfit: ${parts.join(', ')}.`
    }
  }

  // Extract context from all available sources
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // Try to extract outfit from description first
  if (descText && descText.length > 30) {
    // First pattern: captures outfit details after common keywords
    const outfitPattern = /(?:wearing|in|outfit|dressed in|styled in|attire)\s+([^\.]{15,200})/i
    const match = descText.match(outfitPattern)
    if (match && match[1] && match[1].length > 15) {
      return `Outfit: ${match[1].trim()}.`
    }
  }

  // Detect theme from combined context
  const theme = detectThemeFromText(combinedText)
  
  // Select mixed brands dynamically (1-2 accessible + 1 luxury max)
  const { accessible, luxury } = selectMixedBrands(category, theme, userRequest)

  // Build outfit based on category and theme
  let outfitDescription = 'Outfit: '

  // CHRISTMAS/HOLIDAY THEME (must check before other categories for consistency)
  if (theme === 'christmas' || /christmas|holiday|festive|winter|cozy.*holiday/i.test(combinedText)) {
    // Christmas-specific cozy outfits with appropriate brands
    if (/morning|coffee|breakfast/i.test(combinedText)) {
      // Morning: cozy loungewear/cashmere
      const accessibleBrand = accessible[0] || 'Jenni Kayne'
      outfitDescription += `${accessibleBrand} cashmere sweater in warm cream or festive red, high-waisted denim or cozy knit pants`
      if (luxury) outfitDescription += `, ${luxury} crossbody bag as subtle luxury accent`
      outfitDescription += ', warm slippers or cozy socks, minimal jewelry, relaxed comfortable holiday morning vibe.'
    } else if (/fireplace|evening|night|dinner/i.test(combinedText)) {
      // Evening: elegant but cozy
      const accessibleBrand = accessible[0] || 'Everlane'
      outfitDescription += `${accessibleBrand} cashmere turtleneck or cozy knit sweater in neutral or festive tone, tailored trousers or elegant skirt`
      if (luxury) outfitDescription += `, ${luxury} structured bag as elegant accent`
      else outfitDescription += ', Everlane leather bag'
      outfitDescription += ', elegant flats or ankle boots, refined jewelry, sophisticated holiday evening look.'
    } else if (/market|shopping|outdoor/i.test(combinedText)) {
      // Outdoor/market: practical but chic
      outfitDescription += 'Warm oversized coat in camel or cream, chunky knit sweater, high-waisted denim'
      if (luxury) outfitDescription += `, ${luxury} leather tote`
      else outfitDescription += ', Everlane crossbody bag'
      outfitDescription += ', comfortable boots, warm accessories, practical but stylish holiday market look.'
    } else {
      // Default Christmas: cozy and festive
      const accessibleBrand = accessible[0] || 'Jenni Kayne'
      outfitDescription += `${accessibleBrand} cashmere sweater in warm festive colors, high-waisted denim or cozy knit pants`
      if (luxury) outfitDescription += `, ${luxury} crossbody bag`
      outfitDescription += ', comfortable loafers or boots, minimal jewelry, cozy festive holiday outfit.'
    }
    return outfitDescription
  }

  // WELLNESS/FITNESS
  if (category.includes('wellness') || category.includes('fitness') || theme.includes('workout')) {
    const accessibleBrand = accessible[0] || 'Alo Yoga'
    outfitDescription += `${accessibleBrand} high-waisted leggings in neutral tone, matching cropped sports bra, lightweight jacket`
    if (luxury) outfitDescription += `, ${luxury} minimal tote as subtle luxury accent`
    outfitDescription += ', athletic sneakers, minimal jewelry.'
  }
  // LUXURY
  else if (category.includes('luxury') || theme.includes('luxury')) {
    const luxuryBrand = luxury || 'The Row'
    outfitDescription += `${luxuryBrand} tailored blazer in neutral tone, silk camisole, wide-leg trousers`
    if (accessible.length > 0) outfitDescription += `, ${accessible[0]} minimal accessories`
    outfitDescription += ', pointed-toe pumps, understated jewelry.'
  }
  // LIFESTYLE
  else if (category.includes('lifestyle')) {
    const accessibleBrand = accessible[0] || 'Everlane'
    outfitDescription += `${accessibleBrand} oversized knit sweater in cream, high-waisted denim`
    if (luxury) outfitDescription += `, ${luxury} leather bag as luxury accent`
    else if (accessible[1]) outfitDescription += `, ${accessible[1]} crossbody bag`
    outfitDescription += ', white sneakers, minimal gold jewelry.'
  }
  // FASHION
  else if (category.includes('fashion')) {
    const accessibleBrand = accessible[0] || 'Reformation'
    outfitDescription += `${accessibleBrand} midi dress in neutral tone, oversized leather blazer`
    if (luxury) outfitDescription += `, ${luxury} structured bag as statement piece`
    outfitDescription += ', ankle boots, minimal accessories.'
  }
  // TRAVEL
  else if (category.includes('travel')) {
    outfitDescription += 'Oversized cream trench coat, black turtleneck, high-waisted trousers'
    if (luxury) outfitDescription += `, ${luxury} leather tote`
    else outfitDescription += ', Everlane leather tote'
    outfitDescription += ', comfortable loafers, minimal jewelry.'
  }
  // BEAUTY
  else if (category.includes('beauty')) {
    const beautyBrand = accessible[0] || 'Glossier'
    outfitDescription += `White ribbed tank top, ${beautyBrand} products visible, cream linen pants, natural makeup, glowing skin.`
  }
  // DEFAULT
  else {
    outfitDescription += 'Sophisticated neutral ensemble, tailored pieces'
    if (luxury) outfitDescription += `, ${luxury} as subtle luxury accent`
    outfitDescription += ', minimal accessories.'
  }

  return outfitDescription
}

// Helper function to detect theme from text
function detectThemeFromText(text: string): string {
  if (/christmas|holiday|festive|winter|cozy.*holiday/i.test(text)) return 'christmas'
  if (/beach|coastal|ocean|resort|tropical/i.test(text)) return 'beach'
  if (/workout|gym|fitness|athletic|yoga/i.test(text)) return 'workout'
  if (/luxury|elegant|chic|sophisticated|premium/i.test(text)) return 'luxury'
  if (/travel|airport|vacation|destination/i.test(text)) return 'travel'
  if (/casual|everyday|lifestyle|relatable/i.test(text)) return 'casual'
  return 'lifestyle'
}

/**
 * Build pose section
 * 
 * Natural, authentic poses - no "striking poses"
 * Personalizes based on userRequest when available.
 */
function buildPoseSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.pose) {
    return `Pose: ${concept.pose}.`
  }

  // 🔴 CRITICAL: Extract pose from description FIRST if it contains detailed pose information
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  if (descText && descText.length > 30) {
    // Look for pose patterns in description
    const posePatterns = [
      /(?:sitting|standing|walking|leaning|lying|kneeling|crouching)[^\.]{10,100}/i,
      /(?:holding|looking|reading|smiling|laughing|gazing)[^\.]{10,100}/i,
      /pose[^\.]{10,100}/i,
    ]

    for (const pattern of posePatterns) {
      const match = descText.match(pattern)
      if (match && match[0] && match[0].length > 20) {
        const extractedPose = match[0].trim()
        // Clean up and return pose
        if (extractedPose.length > 20 && extractedPose.length < 200) {
          console.log('[buildPoseSection] ✅ Extracted pose from description:', extractedPose.substring(0, 80))
          return `Pose: ${extractedPose}.`
        }
      }
    }
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer pose
  // This ensures prompts match Maya's vision from her chat response
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(combinedText)) {
    if (/morning|coffee|breakfast/i.test(combinedText)) {
      return 'Pose: Sitting comfortably on sofa, holding warm mug, looking at Christmas tree with peaceful expression, cozy morning moment.'
    } else if (/fireplace|reading|evening|night/i.test(combinedText)) {
      return 'Pose: Relaxed on sofa near fireplace, reading or looking at Christmas tree, peaceful and cozy evening moment.'
    } else if (/market|shopping|outdoor/i.test(combinedText)) {
      return 'Pose: Walking through festive market, holding holiday items, natural movement, joyful expression.'
    } else {
      return 'Pose: Comfortable and relaxed, enjoying cozy holiday moment, natural and peaceful expression.'
    }
  }

  // Default natural poses (only if no specific theme detected)
  const naturalPoses = [
    'Standing with weight on one leg, looking away naturally',
    'Sitting with legs crossed, hand resting on knee',
    'Walking casually, looking toward camera',
    'Leaning against wall, relaxed posture',
    'Sitting on edge of surface, legs dangling naturally',
  ]

  const randomPose = naturalPoses[Math.floor(Math.random() * naturalPoses.length)]
  return `Pose: ${randomPose}.`
}

/**
 * Build lighting section
 * 
 * Realistic, authentic lighting - no "perfect lighting"
 * Personalizes based on userRequest when available.
 */
function buildLightingSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.lighting) {
    return `Lighting: ${concept.lighting}.`
  }

  // 🔴 CRITICAL: Extract lighting from description FIRST if it contains detailed lighting information
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  if (descText && descText.length > 30) {
    // Look for lighting patterns in description
    const lightingPatterns = [
      /(?:morning|evening|soft|warm|natural|ambient|twinkling|fireplace|glow|streaming).{0,50}(?:light|lighting|illumination|glow|sunlight|daylight)[^\.]{0,100}/i,
      /(?:light|lighting).{0,50}(?:streaming|filtering|glowing|shining|warm|soft|natural|morning|evening)[^\.]{0,100}/i,
    ]

    for (const pattern of lightingPatterns) {
      const match = descText.match(pattern)
      if (match && match[0] && match[0].length > 20) {
        const extractedLighting = match[0].trim()
        // Extract a more complete sentence if possible
        const sentences = descText.split(/[\.!?]/)
        for (const sentence of sentences) {
          if (sentence.includes(match[0].substring(0, 20))) {
            if (sentence.length > 30 && sentence.length < 200 && /light|lighting|glow|illumination/i.test(sentence)) {
              console.log('[buildLightingSection] ✅ Extracted lighting from description:', sentence.substring(0, 80))
              return `Lighting: ${sentence.trim()}.`
            }
          }
        }
        if (extractedLighting.length > 20 && extractedLighting.length < 200) {
          console.log('[buildLightingSection] ✅ Extracted lighting from description:', extractedLighting.substring(0, 80))
          return `Lighting: ${extractedLighting}.`
        }
      }
    }
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer lighting
  // This ensures prompts match Maya's vision from her chat response
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(combinedText)) {
    if (/morning|coffee|breakfast/i.test(combinedText)) {
      return 'Lighting: Warm morning light streaming through windows, soft holiday glow, twinkling Christmas tree lights in background, cozy festive atmosphere.'
    } else if (/fireplace|evening|night/i.test(combinedText)) {
      return 'Lighting: Warm fireplace glow, twinkling Christmas tree lights, soft evening lighting, magical holiday atmosphere, cozy festive ambiance.'
    } else {
      return 'Lighting: Warm festive lighting, twinkling holiday lights, soft natural glow, magical Christmas atmosphere, cozy holiday ambiance.'
    }
  }

  // Realistic lighting options (only if no specific theme detected)
  const lightingOptions = [
    'Uneven natural lighting with mixed color temperatures',
    'Natural window light with shadows and slight unevenness',
    'Overcast daylight with natural shadows',
    'Ambient lighting with mixed sources',
    'Natural light with cool and warm mix',
  ]

  const randomLighting = lightingOptions[Math.floor(Math.random() * lightingOptions.length)]
  return `Lighting: ${randomLighting}.`
}

/**
 * Build setting section
 * 
 * Specific, detailed settings - not generic
 * Includes detailed luxury settings with marble, premium materials, etc.
 * Personalizes based on userRequest when available.
 */
function buildSettingSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.setting) {
    return `Setting: ${concept.setting}.`
  }

  // Extract context
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // Detailed luxury settings based on theme
  if (/luxury|elegant|chic|sophisticated|premium|high-end/i.test(combinedText)) {
    if (/hotel|lobby|lounge/i.test(combinedText)) {
      return 'Setting: Luxurious five-star hotel lobby, marble floors, sophisticated architectural details, soft ambient lighting, refined atmosphere.'
    } else if (/boutique|store|shopping/i.test(combinedText)) {
      return 'Setting: High-end luxury boutique interior, minimalist design, premium materials, elegant lighting, sophisticated retail atmosphere.'
    } else if (/restaurant|dining/i.test(combinedText)) {
      return 'Setting: Sophisticated fine dining restaurant, marble surfaces, elegant table settings, refined lighting, upscale ambiance.'
    } else if (/home|interior|living/i.test(combinedText)) {
      return 'Setting: Luxurious modern interior, marble staircase, architectural elements, floor-to-ceiling windows, sophisticated home atmosphere.'
    } else {
      return 'Setting: Sophisticated urban setting with architectural details, marble or concrete surfaces, premium materials, refined modern atmosphere.'
    }
  }

  // Christmas/Holiday settings
  if (/christmas|holiday|festive|winter|cozy.*holiday/i.test(combinedText)) {
    if (/morning|breakfast|coffee/i.test(combinedText)) {
      return 'Setting: Cozy Christmas morning scene, decorated living room with illuminated tree, warm fireplace, holiday decorations, soft morning light through windows, festive atmosphere.'
    } else if (/fireplace|evening|night/i.test(combinedText)) {
      return 'Setting: Elegant living room with crackling fireplace, Christmas tree with twinkling lights, luxurious holiday atmosphere, warm evening lighting, tasteful festive decorations.'
    } else if (/market|outdoor|shopping/i.test(combinedText)) {
      return 'Setting: Festive holiday market, twinkling lights everywhere, holiday decorations, winter atmosphere, natural daylight, magical seasonal ambiance.'
    } else {
      return 'Setting: Cozy holiday setting with beautifully decorated Christmas tree, warm festive atmosphere, elegant holiday decorations, soft natural lighting, magical seasonal ambiance.'
    }
  }

  // Beach/Coastal settings
  if (/beach|coastal|ocean|seaside|tropical|resort/i.test(combinedText)) {
    return 'Setting: Pristine coastal beach, turquoise ocean views, white sand, natural beach textures, soft coastal light, serene beach atmosphere.'
  }

  // Cafe/Restaurant settings
  if (/cafe|coffee|brunch|restaurant|bistro/i.test(combinedText)) {
    return 'Setting: Charming coastal cafe or modern bistro, natural textures, warm ambient lighting, cozy authentic atmosphere, real lived-in setting.'
  }

  // Airport/Travel settings
  if (/airport|travel|terminal|jet|vacation/i.test(combinedText)) {
    return 'Setting: Modern airport terminal with floor-to-ceiling windows, natural light, contemporary architecture, sophisticated travel atmosphere, subtle travel accessories visible.'
  }

  // Gym/Workout settings
  if (/gym|workout|fitness|studio|yoga/i.test(combinedText)) {
    return 'Setting: Minimalist home wellness studio, natural light streaming through windows, yoga mat visible, plants in background, clean athletic space, calm atmosphere.'
  }

  // Category-specific detailed settings
  const conceptCategory = (concept.category && typeof concept.category === 'string') 
    ? concept.category.toUpperCase() 
    : 'LIFESTYLE'

  const detailedSettings: Record<string, string> = {
    WELLNESS: 'Minimalist wellness studio with abundant natural light, yoga mat and meditation cushions visible, potted plants creating calming atmosphere, clean white walls, serene dedicated space.',
    LUXURY: 'Sophisticated modern interior with architectural details, polished marble surfaces, floor-to-ceiling windows, refined furniture, understated luxury atmosphere, muted color palette.',
    LIFESTYLE: 'Coastal home interior with natural textures, soft morning light filtering through linen curtains, organic materials, lived-in comfortable atmosphere, Pinterest-worthy aesthetic.',
    FASHION: 'Clean urban setting in SoHo district, minimalist street backdrop, modern architecture, natural city atmosphere, fashion-supportive environment without visual clutter.',
    TRAVEL: 'Contemporary airport terminal with natural light from large windows, modern minimalist design, sophisticated travel atmosphere, subtle premium travel accessories visible.',
    BEAUTY: 'Sun-drenched bathroom or bedroom, soft morning light creating natural glow, skincare products artfully arranged, marble or natural stone surfaces, serene beauty-focused space.',
  }

  return `Setting: ${detailedSettings[conceptCategory] || detailedSettings.LIFESTYLE}.`
}

/**
 * Build mood section
 * 
 * Authentic mood descriptions
 * Personalizes based on userRequest when available.
 */
function buildMoodSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.mood) {
    return `Mood: ${concept.mood}.`
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer mood
  // This ensures prompts match Maya's vision from her chat response
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(combinedText)) {
    if (/cozy|warm|comfortable|relaxed/i.test(combinedText)) {
      return 'Mood: Cozy, warm, festive, magical holiday atmosphere, peaceful and joyful.'
    } else if (/elegant|sophisticated|refined|evening/i.test(combinedText)) {
      return 'Mood: Elegant, sophisticated, refined holiday spirit, festive and graceful.'
    } else {
      return 'Mood: Festive, joyful, warm holiday atmosphere, magical and cozy.'
    }
  }

  // Category-specific moods (only if no specific theme detected)
  const moodOptions: Record<string, string[]> = {
    WELLNESS: ['Calm, centered, peaceful', 'Energetic, motivated, fresh', 'Relaxed, mindful, present'],
    LUXURY: ['Sophisticated, refined, elegant', 'Confident, poised, editorial', 'Quiet luxury, understated elegance'],
    LIFESTYLE: ['Effortless, relaxed, authentic', 'Cozy, comfortable, lived-in', 'Clean, minimal, intentional'],
    FASHION: ['Confident, street-style, authentic', 'Editorial, fashion-forward, modern', 'Scandi minimal, clean lines'],
    TRAVEL: ['Jet-set, sophisticated, wanderlust', 'Adventurous, free-spirited, ready', 'Elegant travel, refined packing'],
    BEAUTY: ['Fresh, glowing, natural', 'Ritual-focused, self-care, intentional', 'Morning routine, peaceful, centered'],
  }

  const conceptCategory = (concept.category && typeof concept.category === 'string') ? concept.category.toUpperCase() : 'LIFESTYLE'
  const categoryMoods = moodOptions[conceptCategory] || moodOptions.LIFESTYLE
  const randomMood = categoryMoods[Math.floor(Math.random() * categoryMoods.length)]
  return `Mood: ${randomMood}.`
}

/**
 * Build aesthetic description
 * 
 * Combines category description with concept aesthetic
 * Personalizes based on userRequest when available.
 */
function buildAestheticDescription(
  categoryInfo: { description: string; name: string },
  concept: ConceptComponents,
  userRequest?: string
): string {
  const baseAesthetic = categoryInfo.description
  const userRequestLower = (userRequest || '').toLowerCase()

  // Extract context for luxury detection
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // Extract aesthetic keywords from userRequest
  const aestheticKeywords: string[] = []
  if (/pinterest|curated|dreamy|soft|feminine|aspirational/i.test(userRequest || '')) {
    aestheticKeywords.push('Pinterest-curated', 'dreamy aesthetic', 'aspirational moments')
  }
  if (/editorial|fashion|sophisticated|refined|elegant/i.test(userRequest || '')) {
    aestheticKeywords.push('editorial sophistication', 'fashion-forward', 'refined elegance')
  }
  if (/lifestyle|casual|everyday|authentic|real|natural/i.test(userRequest || '')) {
    aestheticKeywords.push('authentic lifestyle', 'everyday moments', 'natural authenticity')
  }
  if (/luxury|chic|premium|high-end/i.test(userRequest || '')) {
    aestheticKeywords.push('quiet luxury', 'premium aesthetic', 'sophisticated elegance')
  }

  // Combine concept aesthetic with user request keywords
  let finalAesthetic = concept.aesthetic || ''
  if (aestheticKeywords.length > 0) {
    finalAesthetic = finalAesthetic 
      ? `${finalAesthetic}, ${aestheticKeywords.join(', ')}`
      : aestheticKeywords.join(', ')
  }

  if (finalAesthetic) {
    return `${finalAesthetic}, ${baseAesthetic}`
  }

  // Enhanced aesthetic based on category
  const aestheticEnhancements: string[] = [
    'editorial quality',
    'authentic moment',
    'sophisticated simplicity',
    'timeless appeal',
    'luxurious materials',
    'refined elegance',
    'quiet luxury',
    'effortless sophistication',
    'understated opulence',
  ]

  // Add luxury-specific enhancements based on category/theme
  if (/luxury|elegant|sophisticated|premium|high-end/i.test(combinedText)) {
    aestheticEnhancements.push(
      'cashmere textures',
      'silk details',
      'leather accents',
      'marble surfaces',
      'architectural refinement',
      'premium materials'
    )
  }

  const categoryAesthetics: Record<string, string> = {
    WELLNESS: 'Coastal wellness, clean beauty, morning ritual, natural glow',
    LUXURY: 'Quiet luxury, editorial sophistication, timeless elegance',
    LIFESTYLE: 'Coastal living, clean aesthetic, everyday moments, authentic',
    FASHION: 'Street style, Scandi minimalism, modern editorial, clean lines',
    TRAVEL: 'Jet-set aesthetic, sophisticated packing, wanderlust, refined',
    BEAUTY: 'Coastal wellness, clean beauty, morning ritual, self-care',
  }

  const baseCategoryAesthetic = categoryAesthetics[categoryInfo.name] || baseAesthetic
  return `${baseCategoryAesthetic}, ${aestheticEnhancements.slice(0, 4).join(', ')}`
}

/**
 * Helper: Get random brand from category
 */
function getRandomBrand(categoryInfo: { brands: string[] }): string | null {
  if (categoryInfo.brands.length === 0) return null
  return categoryInfo.brands[Math.floor(Math.random() * categoryInfo.brands.length)]
}

/**
 * Helper: Build brand-specific item description
 */
function buildBrandItem(brand: string, itemType: string, category: string): string {
  const brandLower = brand.toLowerCase()

  // Category-specific brand items
  if (category === 'WELLNESS') {
    if (brandLower.includes('alo')) {
      return `butter-soft ${brand} high-waisted leggings`
    } else if (brandLower.includes('lululemon')) {
      return `${brand} Align leggings`
    }
  } else if (category === 'LUXURY') {
    if (brandLower.includes('chanel')) {
      return `${brand} headband`
    } else if (brandLower.includes('dior')) {
      return `${brand} accessories`
    }
  } else if (category === 'BEAUTY') {
    if (brandLower.includes('rhode')) {
      return `${brand} Peptide Treatment`
    } else if (brandLower.includes('glossier')) {
      return `${brand} products`
    }
  }

  return `${brand} ${itemType}`
}
