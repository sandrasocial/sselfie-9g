/**
 * Pro Mode Prompt Builder
 * 
 * Builds sophisticated 250-500 word prompts for Studio Pro Mode.
 * Uses real brand names, professional photography language, and specific sections.
 */

import { PRO_MODE_CATEGORIES, getCategoryByKey, ImageLibrary } from './category-system'

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

  // Extract style/aesthetic keywords from userRequest to personalize the prompt
  const userRequestLower = (userRequest || '').toLowerCase()
  const isPinterestStyle = /pinterest|curated|aesthetic|dreamy|soft|feminine/i.test(userRequest || '')
  const isEditorialStyle = /editorial|fashion|sophisticated|refined/i.test(userRequest || '')
  const isLifestyleStyle = /lifestyle|casual|everyday|authentic|real/i.test(userRequest || '')
  const isLuxuryStyle = /luxury|elegant|chic|sophisticated|premium/i.test(userRequest || '')

  // 🔴 CRITICAL: Build sections using concept title/description and userRequest
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

  const prompt = `Professional photography. ${isPinterestStyle ? 'Pinterest-style' : isEditorialStyle ? 'Editorial' : 'Influencer'} portrait maintaining exactly the same physical characteristics, facial features, and body proportions. Editorial quality with authentic iPhone aesthetic.

${outfitSection}

${poseSection}

${lightingSection}

${settingSection}

${moodSection}

Aesthetic: ${aestheticSection}

Shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic amateur cellphone photo aesthetic.`

  return prompt.trim()
}

/**
 * Build outfit section with real brand names
 * 
 * Uses category-specific brands and specific item descriptions.
 * NO generic "stylish outfit" - always specific brand items.
 * Personalizes based on userRequest when available.
 */
function buildOutfitSection(
  concept: ConceptComponents,
  categoryInfo: { brands: string[]; name: string },
  userRequest?: string
): string {
  // Safe null handling
  const brands = (categoryInfo.brands && Array.isArray(categoryInfo.brands)) ? categoryInfo.brands : []
  const category = (categoryInfo.name && typeof categoryInfo.name === 'string') ? categoryInfo.name.toLowerCase() : 'lifestyle'

  // If concept has specific outfit details, use them
  if (concept.outfit) {
    const parts: string[] = []

    if (concept.outfit.top) {
      parts.push(concept.outfit.top)
    }
    if (concept.outfit.bottom) {
      parts.push(concept.outfit.bottom)
    }
    if (concept.outfit.outerwear) {
      parts.push(concept.outfit.outerwear)
    }
    if (concept.outfit.accessories && concept.outfit.accessories.length > 0) {
      parts.push(concept.outfit.accessories.join(', '))
    }
    if (concept.outfit.shoes) {
      parts.push(concept.outfit.shoes)
    }

    if (parts.length > 0) {
      return `Outfit: ${parts.join(', ')}.`
    }
  }

  // 🔴 CRITICAL: Extract outfit from concept description FIRST (before theme detection)
  // The AI should be generating detailed descriptions with outfit details
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()
  
  // Try to extract outfit from description first
  if (descText && descText.length > 30) {
    // Look for outfit patterns in description - be more flexible
    const outfitPatterns = [
      /(?:wearing|in|outfit|dressed in|styled in|attire)\s+([^\.]{15,200})/i,
      /(cozy|elegant|sophisticated|festive|holiday|beach|resort|athletic|luxury)\s+(?:holiday|morning|evening|beach|resort|athletic|luxury)?\s*(?:outfit|wear|attire|clothing|pajamas|sweater|dress|blazer|coat|jacket|loungewear)[^\.]{0,150}/i,
      /(cashmere|silk|knit|wool|linen|leather|holiday|festive|cozy)\s+(?:sweater|pajamas|dress|blazer|coat|jacket|outfit|wear|attire)[^\.]{0,150}/i,
      /(holiday|festive|cozy|christmas)\s+(?:pajamas|sweater|outfit|wear|attire|clothing|loungewear)[^\.]{0,150}/i,
    ]
    
    for (const pattern of outfitPatterns) {
      const match = descText.match(pattern)
      if (match) {
        const extractedOutfit = match[1] ? match[1].trim() : match[0].trim()
        // Clean up the extracted outfit
        let cleanedOutfit = extractedOutfit
          .replace(/\s+/g, ' ')
          .replace(/,\s*,/g, ',')
          .replace(/^[^a-z]*/i, '') // Remove leading non-alphabetic
          .trim()
        
        // If we got a good match, use it
        if (cleanedOutfit.length > 15 && cleanedOutfit.length < 200 && /[a-z]/i.test(cleanedOutfit)) {
          console.log('[buildOutfitSection] ✅ Extracted outfit from description:', cleanedOutfit.substring(0, 80))
          return `Outfit: ${cleanedOutfit}.`
        }
      }
    }
    
    // Also check if description contains outfit keywords directly
    if (/wearing|outfit|dressed|attire|clothing|pajamas|sweater|dress|blazer|coat|jacket/i.test(descText)) {
      // Try to extract a sentence or phrase containing outfit
      const sentences = descText.split(/[\.!?]/)
      for (const sentence of sentences) {
        if (sentence.length > 20 && sentence.length < 200 && 
            /wearing|outfit|dressed|attire|clothing|pajamas|sweater|dress|blazer|coat|jacket/i.test(sentence)) {
          const cleaned = sentence.trim().replace(/^[^a-z]*/i, '').trim()
          if (cleaned.length > 15 && cleaned.length < 200) {
            console.log('[buildOutfitSection] ✅ Extracted outfit sentence from description:', cleaned.substring(0, 80))
            return `Outfit: ${cleaned}.`
          }
        }
      }
    }
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer outfit
  // This ensures prompts match Maya's vision from her chat response
  
  console.log('[buildOutfitSection] Checking for themes in:', {
    title: titleText.substring(0, 50),
    description: descText.substring(0, 50),
    userRequest: requestText.substring(0, 50),
    combined: combinedText.substring(0, 100),
  })
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  // Use more comprehensive patterns to catch variations
  const hasChristmas = /christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy|christmas.*morning|christmas.*evening|christmas.*fireplace|holiday.*market/i.test(combinedText)
  
  if (hasChristmas) {
    console.log('[buildOutfitSection] ✅ Detected Christmas theme')
    if (/pajamas|pjs|loungewear|cozy.*set|sleepwear/i.test(combinedText)) {
      return 'Outfit: Cozy holiday pajamas in festive colors (red, green, or cream), matching set, soft textures, comfortable holiday loungewear.'
    } else if (/elegant|evening|dinner|party|sophisticated/i.test(combinedText)) {
      return 'Outfit: Elegant holiday evening wear, sophisticated festive outfit, refined holiday styling, elegant accessories.'
    } else if (/morning|coffee|breakfast|waking|wake/i.test(combinedText)) {
      return 'Outfit: Cozy holiday morning outfit, soft cashmere or knit sweater in festive colors (red, green, or cream), comfortable holiday attire, warm textures, holiday-themed accessories.'
    } else if (/fireplace|reading|book|cozy.*evening/i.test(combinedText)) {
      return 'Outfit: Cozy holiday loungewear, soft cashmere or knit sweater in festive colors, comfortable holiday attire, warm textures, elegant holiday styling.'
    } else {
      return 'Outfit: Cozy holiday outfit, festive colors and textures (red, green, cream, or warm neutrals), warm winter styling, comfortable and elegant holiday wear, holiday-themed accessories.'
    }
  }
  
  console.log('[buildOutfitSection] No specific theme detected, using category defaults')

  // 🔴 CRITICAL: Check for other specific themes BEFORE category defaults
  // This ensures user requests are honored over generic category templates
  if (/beach|coastal|ocean|seaside|swimwear|bikini/i.test(combinedText)) {
    console.log('[buildOutfitSection] ✅ Detected beach theme')
    return 'Outfit: Beach or coastal outfit, swimwear or resort wear, beach accessories, sandals or barefoot, coastal styling.'
  }
  if (/workout|gym|fitness|athletic|yoga|sport/i.test(combinedText)) {
    console.log('[buildOutfitSection] ✅ Detected workout theme')
    if (brands.length > 0) {
      const brand = brands[0]
      return `Outfit: Athletic wear, ${brand} high-waisted leggings, matching sports bra, athletic sneakers, workout styling.`
    }
    return 'Outfit: Athletic wear in neutral tones, high-waisted leggings, sports bra, athletic sneakers, workout styling.'
  }
  if (/travel|airport|vacation|jet-set|packing/i.test(combinedText)) {
    console.log('[buildOutfitSection] ✅ Detected travel theme')
    return 'Outfit: Travel-ready outfit, comfortable yet stylish, travel accessories, practical yet elegant travel styling.'
  }
  if (/luxury|elegant|chic|sophisticated|premium|high-end/i.test(combinedText)) {
    console.log('[buildOutfitSection] ✅ Detected luxury theme')
    if (brands.length > 0) {
      const brand = brands[0]
      return `Outfit: Sophisticated luxury ensemble, ${brand} accessories, elegant styling, refined luxury aesthetic.`
    }
    return 'Outfit: Sophisticated luxury ensemble, elegant styling, refined pieces, luxury aesthetic.'
  }

  // Build outfit based on category and available brands (ONLY if no specific theme detected)
  let outfitDescription = 'Outfit: '

  switch (categoryInfo.name) {
    case 'WELLNESS':
      if (brands.length > 0) {
        const brand = brands[0] // Alo Yoga
        outfitDescription += `Butter-soft ${brand} high-waisted leggings in neutral tone, matching ${brand} sports bra, oversized cream cashmere cardigan draped over shoulders, white sneakers.`
      } else {
        outfitDescription += 'Athletic wear in neutral tones, high-waisted leggings, sports bra, oversized cardigan, white sneakers.'
      }
      break

    case 'LUXURY':
      if (brands.length > 0) {
        const brand = brands[0] // CHANEL
        outfitDescription += `${brand} headband in black, oversized black cashmere coat, cream silk blouse, high-waisted black trousers, black leather loafers.`
      } else {
        outfitDescription += 'Sophisticated black and cream ensemble, cashmere coat, silk blouse, tailored trousers, leather loafers.'
      }
      break

    case 'LIFESTYLE':
      // 🔴 CRITICAL: Check if concept description has outfit details - use them instead of generic
      if (descText && descText.length > 20 && /wearing|outfit|dress|sweater|top|bottom|shoes|coat|jacket|pants|jeans/i.test(descText)) {
        // Extract outfit from description
        const outfitMatch = descText.match(/(?:wearing|outfit|in|with)\s+([^\.]{20,150})/i)
        if (outfitMatch && outfitMatch[1]) {
          outfitDescription += outfitMatch[1].trim() + '.'
          console.log('[buildOutfitSection] ✅ Using outfit from concept description')
          return outfitDescription
        }
      }
      // Only use generic if no specific outfit mentioned
      if (brands.length > 0) {
        const brand = brands[0] // Glossier
        outfitDescription += `Oversized cream knit sweater, matching lounge pants, ${brand} product visible on vanity, bare feet on hardwood floor.`
      } else {
        outfitDescription += 'Oversized cream knit sweater, matching lounge pants, minimalist accessories, bare feet.'
      }
      break

    case 'FASHION':
      // 🔴 CRITICAL: Check if concept description has outfit details - use them instead of generic
      if (descText && descText.length > 20 && /wearing|outfit|dress|sweater|top|bottom|shoes|coat|jacket|pants|jeans|blazer/i.test(descText)) {
        // Extract outfit from description
        const outfitMatch = descText.match(/(?:wearing|outfit|in|with)\s+([^\.]{20,150})/i)
        if (outfitMatch && outfitMatch[1]) {
          outfitDescription += outfitMatch[1].trim() + '.'
          console.log('[buildOutfitSection] ✅ Using outfit from concept description')
          return outfitDescription
        }
      }
      // Only use generic if no specific outfit mentioned
      if (brands.length > 0) {
        const brand = brands[0] // Reformation
        outfitDescription += `${brand} midi dress in neutral tone, oversized brown leather blazer, black ankle boots, minimal jewelry.`
      } else {
        outfitDescription += 'Neutral midi dress, oversized leather blazer, ankle boots, minimal accessories.'
      }
      break

    case 'TRAVEL':
      outfitDescription += 'Oversized cream trench coat, black turtleneck, high-waisted black trousers, black ankle boots, leather tote bag, airport terminal setting.'
      break

    case 'BEAUTY':
      if (brands.length > 0) {
        const brand = brands[0] // Rhode
        outfitDescription += `White ribbed tank top, ${brand} Peptide Treatment visible, cream linen pants, minimal makeup, natural glow.`
      } else {
        outfitDescription += 'White ribbed tank top, skincare products visible, cream linen pants, natural makeup.'
      }
      break

    default:
      outfitDescription += 'Sophisticated neutral ensemble, tailored pieces, minimal accessories.'
  }

  return outfitDescription
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
 * Personalizes based on userRequest when available.
 */
function buildSettingSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.setting) {
    return `Setting: ${concept.setting}.`
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer setting
  // This ensures prompts match Maya's vision from her chat response
  // Combine ALL context: title, description, aesthetic, and userRequest
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()
  
  console.log('[buildSettingSection] Checking for themes in:', {
    title: titleText.substring(0, 50),
    description: descText.substring(0, 50),
    userRequest: requestText.substring(0, 50),
  })
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  // Use more comprehensive patterns to catch variations
  const hasChristmas = /christmas|holiday|festive|winter|snow|fireplace|tree|cozy.*holiday|holiday.*cozy|christmas.*morning|christmas.*evening|christmas.*fireplace|holiday.*market/i.test(combinedText)
  
  if (hasChristmas) {
    console.log('[buildSettingSection] ✅ Detected Christmas theme')
    if (/morning|coffee|breakfast|waking|wake/i.test(combinedText)) {
      return 'Setting: Cozy Christmas morning scene, decorated living room with Christmas tree, warm fireplace, holiday decorations, soft morning light through windows, festive atmosphere.'
    } else if (/fireplace|reading|evening|night|book/i.test(combinedText)) {
      return 'Setting: Elegant living room with crackling fireplace, Christmas tree with twinkling lights, cozy holiday atmosphere, warm evening lighting, festive decorations.'
    } else if (/market|shopping|outdoor|winter.*market/i.test(combinedText)) {
      return 'Setting: Festive holiday market or outdoor Christmas setting, twinkling lights, holiday decorations, winter atmosphere, natural daylight.'
    } else {
      return 'Setting: Cozy holiday setting with Christmas tree, warm festive atmosphere, holiday decorations, soft natural lighting, magical seasonal ambiance.'
    }
  }
  
  // Check for other specific themes
  if (/beach|coastal|ocean|seaside|tropical/i.test(combinedText)) {
    console.log('[buildSettingSection] ✅ Detected beach theme')
    return 'Setting: Coastal beach setting, ocean views, natural textures, soft coastal light, beach atmosphere.'
  }
  if (/cafe|coffee|brunch|restaurant|bistro/i.test(combinedText)) {
    console.log('[buildSettingSection] ✅ Detected cafe theme')
    return 'Setting: Charming cafe or restaurant, natural textures, warm lighting, cozy atmosphere, authentic setting.'
  }
  if (/airport|travel|terminal|jet|vacation/i.test(combinedText)) {
    console.log('[buildSettingSection] ✅ Detected travel theme')
    return 'Setting: Airport terminal with natural light, modern architecture, travel accessories visible, sophisticated travel atmosphere.'
  }
  if (/gym|workout|fitness|studio|yoga/i.test(combinedText)) {
    console.log('[buildSettingSection] ✅ Detected workout theme')
    return 'Setting: Minimalist home studio with natural light, yoga mat visible, plants in background, clean athletic space.'
  }
  
  console.log('[buildSettingSection] No specific theme detected, using category defaults')

  // Category-specific default settings (only if no specific theme detected)
  const defaultSettings: Record<string, string> = {
    WELLNESS: 'Minimalist home studio with natural light, yoga mat visible, plants in background',
    LUXURY: 'Sophisticated urban setting, concrete or marble surfaces, architectural elements',
    LIFESTYLE: 'Coastal home interior, natural textures, soft morning light through windows',
    FASHION: 'Urban street setting, SoHo neighborhood, natural city atmosphere',
    TRAVEL: 'Airport terminal with natural light, modern architecture, travel accessories visible',
    BEAUTY: 'Sun-drenched bathroom or bedroom, natural morning light, skincare products arranged',
  }

  // Default to lifestyle if category not found
  const conceptCategory = (concept.category && typeof concept.category === 'string') ? concept.category.toUpperCase() : 'LIFESTYLE'
  return `Setting: ${defaultSettings[conceptCategory] || defaultSettings.LIFESTYLE}.`
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
  const aestheticEnhancements: Record<string, string> = {
    WELLNESS: 'Coastal wellness, clean beauty, morning ritual, natural glow',
    LUXURY: 'Quiet luxury, editorial sophistication, timeless elegance',
    LIFESTYLE: 'Coastal living, clean aesthetic, everyday moments, authentic',
    FASHION: 'Street style, Scandi minimalism, modern editorial, clean lines',
    TRAVEL: 'Jet-set aesthetic, sophisticated packing, wanderlust, refined',
    BEAUTY: 'Coastal wellness, clean beauty, morning ritual, self-care',
  }

  return aestheticEnhancements[categoryInfo.name] || baseAesthetic
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
