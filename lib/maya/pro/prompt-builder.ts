/**
 * Pro Mode Prompt Builder
 * 
 * Builds sophisticated 250-500 word prompts for Studio Pro Mode.
 * Uses real brand names, professional photography language, and specific sections.
 */

import { PRO_MODE_CATEGORIES, getCategoryByKey, ImageLibrary } from './category-system'
import { selectMixedBrands } from './prompt-architecture'
import {
  buildChristmasSetting,
  buildChristmasOutfit,
  buildNewYearsSetting,
  detectSeasonalContent,
  CHRISTMAS_INTERIORS,
  CHRISTMAS_OUTFITS,
  CHRISTMAS_DECOR,
  NEW_YEARS_CONTENT,
  SEASONAL_POSES,
  SEASONAL_PHOTOGRAPHY,
  SEASONAL_MOOD,
} from './seasonal-luxury-content'
import {
  PhotographyStyle,
  detectPhotographyStyle,
  buildSettingForStyle,
  buildLightingForStyle,
  buildCameraForStyle,
  buildMoodForStyle,
} from './photography-styles'
import {
  FramingType,
  CameraAngle,
  CameraPosition,
  CompositionRule,
  buildCameraComposition,
  detectFramingPreference,
  detectAnglePreference,
  detectCompositionPreference,
  selectCompositionForConcept,
} from './camera-composition'
import {
  buildSmartSetting,
  getSettingDetailLevel,
} from './smart-setting-builder'

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
export async function buildProModePrompt(
  category: string | null,
  concept: ConceptComponents,
  userImages: ImageLibrary,
  userRequest?: string,
  userPhotographyStyle?: PhotographyStyle,
  conceptIndex?: number // NEW: Which concept (0-5) for variation
): Promise<{ fullPrompt: string; category: string }> {
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

  // 🎯 Detect photography style from user request
  const combinedTextForStyle = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`
  const detectedStyle = detectPhotographyStyle(combinedTextForStyle)
  const photographyStyle: PhotographyStyle = detectedStyle || userPhotographyStyle || 'authentic' // Default to authentic if not detected
  
  console.log('[buildProModePrompt] Photography style:', {
    detected: detectedStyle,
    userProvided: userPhotographyStyle,
    final: photographyStyle,
  })

  // 🎯 Detect user preferences for composition
  const userFraming = detectFramingPreference(userRequest || '')
  const userAngle = detectAnglePreference(userRequest || '')
  const userComposition = detectCompositionPreference(userRequest || '')

  // Select composition for this concept (with variety across 6 concepts)
  const index = conceptIndex !== undefined ? conceptIndex : 0
  const cameraComp = selectCompositionForConcept(
    index,
    userFraming,
    userAngle,
    userComposition
  )

  console.log('[buildProModePrompt] Camera composition:', {
    conceptIndex: index,
    framing: cameraComp.framing,
    angle: cameraComp.angle,
    position: cameraComp.position,
    composition: cameraComp.composition,
  })

  // 🔴 CRITICAL: Build sections using concept title/description and userRequest
  // Build sections in order, coordinating them so they match each other
  const outfitSection = buildOutfitSection(concept, categoryInfo, userRequest)
  
  // Build pose first - we'll use this to coordinate setting
  const poseSection = buildPoseSection(concept, userRequest)
  
  // Build setting - it can coordinate with pose if needed
  const fullSettingSection = buildSettingSection(concept, userRequest, photographyStyle, poseSection)
  
  // Build lighting - can coordinate with pose and setting
  const lightingSection = buildLightingSection(concept, userRequest, poseSection, fullSettingSection)
  
  // 🎯 Smart Setting: Calibrate setting detail based on framing
  // Close-ups get bokeh backgrounds, environmental gets full detail
  // Extract seasonal context for smart setting builder
  const combinedTextForSeasonal = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`
  const seasonal = detectSeasonalContent(combinedTextForSeasonal)
  const seasonalType = seasonal.season === 'christmas' ? 'christmas' : seasonal.season === 'new-years' ? 'new-years' : null
  
  // Extract original setting text (remove "Setting: " prefix if present)
  const originalSettingText = fullSettingSection.replace(/^Setting:\s*/i, '').replace(/\.\s*$/, '')
  
  // Apply smart setting calibration based on framing
  // This prevents wasting detailed descriptions in close-up bokeh shots
  const calibratedSetting = buildSmartSetting(
    cameraComp.framing,
    originalSettingText,
    seasonalType
  )
  
  const settingSection = `Setting: ${calibratedSetting}.`
  
  console.log('[buildProModePrompt] Setting calibration:', {
    framing: cameraComp.framing,
    detailLevel: getSettingDetailLevel(cameraComp.framing),
    originalLength: originalSettingText.length,
    calibratedLength: calibratedSetting.length,
  })
  
  const moodSection = buildMoodSection(concept, userRequest)
  const aestheticSection = buildAestheticDescription(categoryInfo, concept, userRequest)

  // Build camera composition description
  const cameraDescription = buildCameraComposition(
    cameraComp.framing,
    cameraComp.angle,
    cameraComp.position,
    cameraComp.composition,
    photographyStyle
  )

  // 🔴 DEBUG: Log generated sections
  console.log('[buildProModePrompt] Generated sections:', {
    outfit: outfitSection.substring(0, 50),
    pose: poseSection.substring(0, 50),
    setting: settingSection.substring(0, 50),
  })

  // Determine camera specs - prioritize photography style if detected, otherwise use category-based defaults
  const categoryLower = safeCategory.toLowerCase()
  let cameraSpecs: string
  
  // 🎯 Use photography style functions when style is explicitly detected or provided
  if (photographyStyle && (detectedStyle || userPhotographyStyle)) {
    // Use style-specific camera specs
    cameraSpecs = buildCameraForStyle(photographyStyle)
    console.log('[buildProModePrompt] Using photography style camera specs:', cameraSpecs.substring(0, 100))
  } else if (categoryLower.includes('luxury') || isEditorialStyle) {
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
    // Default: Use photography style function (will default to authentic)
    cameraSpecs = buildCameraForStyle(photographyStyle)
  }

  const prompt = `Professional photography. ${isPinterestStyle ? 'Pinterest-style' : isEditorialStyle ? 'Editorial' : 'Influencer'} portrait maintaining exactly the same physical characteristics, facial features, and body proportions. Editorial quality, professional photography aesthetic.

${outfitSection}

${poseSection}

${settingSection}

${lightingSection}

Camera Composition: ${cameraDescription}.

${moodSection}

Aesthetic: ${aestheticSection}

${cameraSpecs}`

  return {
    fullPrompt: prompt.trim(),
    category: safeCategory,
  }
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
  // 🔴 VALIDATION: Setting keywords to detect when outfit descriptions contain setting details
  const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'backdrop', 'sofa', 'couch', 'armchair', 'flooring', 'floor', 'wall', 'window', 'shelves', 'art', 'vase', 'marble', 'oak', 'countertop', 'interior', 'outdoor', 'scene', 'elegant living room', 'with fireplace']
  
  const category = (categoryInfo.name && typeof categoryInfo.name === 'string')
    ? categoryInfo.name.toLowerCase()
    : 'lifestyle'

  // If concept has specific outfit details, use them
  if (concept.outfit) {
    // 🔴 FIX 1.1: Handle case where outfit might be a string (from extraction/API)
    if (typeof concept.outfit === 'string') {
      const outfitLower = concept.outfit.toLowerCase()
      const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
      
      if (hasSettingKeywords) {
        console.warn('[buildOutfitSection] ⚠️ Detected setting in outfit field (string), ignoring:', concept.outfit.substring(0, 80))
        // Skip broken outfit, build fresh one - fall through to outfit building below
      } else {
        // Valid outfit string - return it
        return `Outfit: ${concept.outfit}.`
      }
    }
    
    // 🔴 VALIDATION: Check each outfit part to ensure it's actually clothing, not setting
    // (outfit is an object with top, bottom, etc.)
    const parts: string[] = []
    const invalidParts: string[] = []
    
    // Validate each outfit part individually
    if (concept.outfit.top) {
      const topLower = concept.outfit.top.toLowerCase()
      if (settingKeywords.some(kw => topLower.includes(kw))) {
        console.warn('[buildOutfitSection] ⚠️ Outfit.top contains setting keywords, skipping:', concept.outfit.top.substring(0, 60))
        invalidParts.push('top')
      } else {
        parts.push(concept.outfit.top)
      }
    }
    
    if (concept.outfit.bottom) {
      const bottomLower = concept.outfit.bottom.toLowerCase()
      if (settingKeywords.some(kw => bottomLower.includes(kw))) {
        console.warn('[buildOutfitSection] ⚠️ Outfit.bottom contains setting keywords, skipping:', concept.outfit.bottom.substring(0, 60))
        invalidParts.push('bottom')
      } else {
        parts.push(concept.outfit.bottom)
      }
    }
    
    if (concept.outfit.outerwear) {
      const outerwearLower = concept.outfit.outerwear.toLowerCase()
      if (settingKeywords.some(kw => outerwearLower.includes(kw))) {
        console.warn('[buildOutfitSection] ⚠️ Outfit.outerwear contains setting keywords, skipping:', concept.outfit.outerwear.substring(0, 60))
        invalidParts.push('outerwear')
      } else {
        parts.push(concept.outfit.outerwear)
      }
    }
    
    if (concept.outfit.accessories && concept.outfit.accessories.length > 0) {
      const accessoriesText = concept.outfit.accessories.join(', ')
      const accessoriesLower = accessoriesText.toLowerCase()
      if (settingKeywords.some(kw => accessoriesLower.includes(kw))) {
        console.warn('[buildOutfitSection] ⚠️ Outfit.accessories contains setting keywords, skipping')
        invalidParts.push('accessories')
      } else {
        parts.push(accessoriesText)
      }
    }
    
    if (concept.outfit.shoes) {
      const shoesLower = concept.outfit.shoes.toLowerCase()
      if (settingKeywords.some(kw => shoesLower.includes(kw))) {
        console.warn('[buildOutfitSection] ⚠️ Outfit.shoes contains setting keywords, skipping:', concept.outfit.shoes.substring(0, 60))
        invalidParts.push('shoes')
      } else {
        parts.push(concept.outfit.shoes)
      }
    }

    // If any part had invalid content (setting keywords), skip the entire outfit object
    // This ensures we don't mix valid clothing with invalid setting descriptions
    if (invalidParts.length > 0) {
      console.warn('[buildOutfitSection] ⚠️ Outfit object contained setting descriptions in:', invalidParts.join(', '), '- building fresh outfit instead')
      // Fall through to build proper outfit below
    } else if (parts.length > 0) {
      // All parts are valid clothing descriptions
      return `Outfit: ${parts.join(', ')}.`
    }
  }

  // Extract context from all available sources
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // 🔴 PRIORITY 1: Try to extract outfit from description FIRST (Maya's vision)
  // This ensures we use Maya's specific outfit details from her description
  // This MUST happen before seasonal/category defaults to preserve Maya's vision
  if (descText && descText.length > 30) {
    console.log('[buildOutfitSection] 🔍 Attempting to extract outfit from Maya\'s description (length:', descText.length, ')')
    // Multiple patterns to catch different ways outfits are described
    const outfitPatterns = [
      // Pattern 1: "wearing [outfit details]" - capture until pose action or sentence end
      // Example: "wearing Reformation slip dress in champagne silk, adjusting necklace"
      // Should capture: "Reformation slip dress in champagne silk"
      // Use non-greedy match with lookahead for pose actions
      /wearing\s+((?:(?!,\s*(?:adjusting|smoothing|holding|looking|standing|sitting|walking|one hand|both hands|touching|putting|before|in front of|beside))[^.,]){10,250}?)(?:\s*,\s*(?:adjusting|smoothing|holding|looking|standing|sitting|walking|one hand|both hands|touching|putting)|[.,]|$)/i,
      // Pattern 2: Simpler pattern - capture after "wearing" until comma+action or period
      /wearing\s+([^.,]{15,250}?)(?=\s*,\s*(?:adjusting|smoothing|holding|looking|one hand|both hands|touching|putting|standing|sitting|walking)|[.,]|$)/i,
      // Pattern 3: "in [outfit]" for dress/skirt (but not "in [room]")
      // Example: "in Reformation slip dress"
      /\bin\s+([a-z][^.,]{10,150}?(?:dress|sweater|shirt|blouse|pants|jeans|skirt|coat|jacket|blazer))(?=\s*,\s*|[.,]|$)/i,
      // Pattern 4: Explicit outfit mentions
      /(?:outfit|dressed in|styled in|attire)\s*:?\s*([^.]{15,200})/i,
    ]

    for (const outfitPattern of outfitPatterns) {
      const match = descText.match(outfitPattern)
      if (match && match[1] && match[1].length > 10) {
        let extractedOutfit = match[1].trim()
        
        // 🔴 CLEANUP: Stop at pose/action keywords that indicate we've moved to pose section
        // Stop at: "adjusting", "smoothing", "holding", "one hand", "both hands", pose verbs
        const poseActionPattern = /\s*,\s*\b(adjusting|smoothing|holding|touching|putting|standing|sitting|walking|looking|gazing|one hand|both hands)\b/i
        const poseMatch = extractedOutfit.match(poseActionPattern)
        if (poseMatch && poseMatch.index !== undefined) {
          extractedOutfit = extractedOutfit.substring(0, poseMatch.index).trim()
        }
        
        // Remove trailing commas and clean up
        extractedOutfit = extractedOutfit.replace(/[,\.\s]+$/, '').trim()
        
        // 🔴 FIX 1.1: VALIDATION - Make sure we're building CLOTHING, not setting
        const extractedOutfitLower = extractedOutfit.toLowerCase()
        const hasSettingKeywords = settingKeywords.some(kw => extractedOutfitLower.includes(kw))
        
        if (hasSettingKeywords) {
          console.warn('[buildOutfitSection] ⚠️ Detected setting in extracted outfit field, skipping:', extractedOutfit.substring(0, 80))
          continue // Try next pattern - don't use this broken outfit description
        }
        
        // Validate it contains actual clothing words or brand names (luxury brands count as clothing indicators)
        const clothingWords = /\b(dress|sweater|shirt|blouse|pants|jeans|denim|skirt|coat|jacket|blazer|top|bottom|outerwear|shoes|heels|sneakers|boots|bag|clutch|necklace|jewelry|accessories|Reformation|Jenni Kayne|Bottega Veneta|Van Cleef|Gianvito Rossi|The Row|Chanel|Dior)\b/i
        if (!clothingWords.test(extractedOutfit) && extractedOutfit.length < 50) {
          console.warn('[buildOutfitSection] ⚠️ Extracted text doesn\'t seem to be clothing, skipping:', extractedOutfit.substring(0, 80))
          continue // Try next pattern
        }
        
        // Valid outfit description - return it immediately (don't fall through to seasonal/category defaults)
        console.log('[buildOutfitSection] ✅ Extracted outfit from Maya\'s description:', extractedOutfit.substring(0, 100))
        return `Outfit: ${extractedOutfit}.`
      }
    }
    console.log('[buildOutfitSection] ⚠️ Could not extract outfit from description, falling back to seasonal/category defaults')
  }

  // 🎄 Check for seasonal outfits (only if description extraction failed)
  const seasonal = detectSeasonalContent(combinedText)
  
  if (seasonal.season === 'christmas' && seasonal.outfit) {
    console.log('[buildOutfitSection] ✅ Detected Christmas outfit request')
    
    const colorTheme = /red|burgundy/i.test(combinedText) ? 'burgundy' :
                       /traditional|classic/i.test(combinedText) ? 'holiday' : 'neutral'
    
    const christmasOutfit = buildChristmasOutfit(seasonal.outfit, colorTheme)
    return `Outfit: ${christmasOutfit}.`
  }
  
  if (seasonal.season === 'new-years') {
    console.log('[buildOutfitSection] ✅ Detected New Years outfit request')
    
    // New Years outfits from NEW_YEARS_CONTENT.OUTFITS
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    if (seasonal.style === 'party') {
      const outfit = pick(NEW_YEARS_CONTENT.OUTFITS.PARTY_GLAMOUR)
      const accessories = pick(NEW_YEARS_CONTENT.OUTFITS.ACCESSORIES)
      return `Outfit: ${outfit}, ${accessories}.`
    } else {
      const outfit = pick(NEW_YEARS_CONTENT.OUTFITS.COZY_CELEBRATION)
      return `Outfit: ${outfit}.`
    }
  }

  // Detect theme from combined context
  const theme = detectThemeFromText(combinedText)
  
  // Select mixed brands dynamically (1-2 accessible + 1 luxury max)
  const { accessible, luxury } = selectMixedBrands(category, theme, userRequest)

  // Build outfit based on category and theme
  let outfitDescription = 'Outfit: '

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
    // 🔴 FIX 1.3: Diversified knitwear (not always Jenni Kayne)
    const KNITWEAR_OPTIONS = [
      'oversized cashmere crewneck in cream (Jenni Kayne, Quince, Everlane)',
      'chunky cable knit sweater in oatmeal (& Other Stories, COS)',
      'ribbed turtleneck in black (Uniqlo, Wolford)',
      'cashmere v-neck in camel (Everlane, Naadam)',
      'oversized cardigan in grey (Toteme, Mango)',
      'cropped cashmere hoodie in taupe (Reformation, Zara)',
      'fine merino knit in ivory (COS, Arket)',
      'chunky turtleneck in charcoal (& Other Stories, Toteme)',
    ]
    const selectedKnitwear = KNITWEAR_OPTIONS[Math.floor(Math.random() * KNITWEAR_OPTIONS.length)]
    
    // 🔴 FIX 1.2: Baggy/wide-leg jeans (NOT skinny/fitted)
    const JEANS_OPTIONS = [
      'baggy straight-leg jeans in light wash',
      'wide-leg jeans in medium wash with relaxed fit',
      'relaxed straight denim in vintage blue',
      '90s-inspired baggy jeans in light wash',
      'barrel jeans in medium wash',
      'wide-leg denim with relaxed straight fit',
    ]
    const selectedJeans = JEANS_OPTIONS[Math.floor(Math.random() * JEANS_OPTIONS.length)]
    
    outfitDescription += `${selectedKnitwear}, ${selectedJeans}`
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
    // 🔴 FIX: Stop extraction at clothing keywords or commas that indicate outfit details
    const clothingStopWords = /\b(wearing|outfit|dressed|in|with)\s+[a-z]/i
    const posePatterns = [
      // Match pose verbs but stop before clothing details
      /(?:sitting|standing|walking|leaning|lying|kneeling|crouching)(?:[^\.]|(?<!,\s*wearing|,\s*in|,\s*with|,\s*dressed)){10,80}/i,
      /(?:holding|looking|reading|smiling|laughing|gazing)(?:[^\.]|(?<!,\s*wearing|,\s*in|,\s*with)){10,80}/i,
      /pose[^\.]{10,80}/i,
    ]

    for (const pattern of posePatterns) {
      const match = descText.match(pattern)
      if (match && match[0] && match[0].length > 20) {
        let extractedPose = match[0].trim()
        
        // 🔴 CLEANUP: Aggressively remove outfit and setting details that might have been captured
        
        // First, stop at clothing keywords (these ALWAYS indicate outfit, not pose)
        const clothingKeywords = /\b(wearing|outfit|dressed|wearing|in|with|sweater|dress|blouse|shirt|pants|jeans|denim|skirt|coat|jacket|blazer|heels|sneakers|shoes|boots|bag|clutch|necklace|jewelry)\s+/i
        const clothingMatch = extractedPose.match(clothingKeywords)
        if (clothingMatch && clothingMatch.index !== undefined) {
          console.log('[buildPoseSection] 🔴 Removing outfit details from pose at index', clothingMatch.index)
          extractedPose = extractedPose.substring(0, clothingMatch.index).trim()
        }
        
        // Stop at action verbs that often precede outfit descriptions
        // "standing before mirror, wearing dress" -> stop before "wearing"
        // "adjusting necklace" -> stop (accessory/outfit detail)
        const outfitActionPatterns = [
          /\b(adjusting|smoothing|touching|putting on|wearing|putting)\s+/i,
        ]
        for (const pattern of outfitActionPatterns) {
          const match = extractedPose.match(pattern)
          if (match && match.index !== undefined) {
            // Only stop if it's followed by clothing-related words
            const afterMatch = extractedPose.substring(match.index + match[0].length)
            if (/\b(dress|sweater|necklace|clutch|heels|bag|fabric|outfit|jewelry|accessories)\b/i.test(afterMatch)) {
              console.log('[buildPoseSection] 🔴 Removing outfit action from pose at index', match.index)
              extractedPose = extractedPose.substring(0, match.index).trim()
              break
            }
          }
        }
        
        // Stop at setting keywords if they appear (but only if they're clearly setting, not part of pose)
        const settingMatch = extractedPose.match(/\b(in|before|beside|near|at)\s+(?:a|the|full-length|dresser|mirror|room|fireplace|tree|living|bedroom|kitchen|market|sofa|couch|armchair|flooring|wall|window)\s+/i)
        if (settingMatch && settingMatch.index !== undefined && settingMatch.index > 20) {
          // Only stop if it's clearly a setting mention (not part of the pose action)
          // "standing before full-length mirror" -> keep "standing before mirror", but stop if followed by outfit
          const beforeSetting = extractedPose.substring(0, settingMatch.index + settingMatch[0].length).trim()
          // Check if what comes after is outfit-related
          const afterSetting = extractedPose.substring(settingMatch.index + settingMatch[0].length)
          if (/\b(wearing|outfit|dressed|sweater|dress)\b/i.test(afterSetting)) {
            console.log('[buildPoseSection] 🔴 Setting mention followed by outfit, stopping at setting')
            extractedPose = beforeSetting
          }
        }
        
        // Clean up trailing commas, "and", "with", etc. that might lead to outfit details
        extractedPose = extractedPose.replace(/[,\s]+(and|with|in|wearing|outfit|dressed).*$/i, '').trim()
        extractedPose = extractedPose.replace(/[,\s]+(adjusting|smoothing|touching|putting).*$/i, '').trim()
        
        // Clean up and return pose
        if (extractedPose.length > 20 && extractedPose.length < 200) {
          console.log('[buildPoseSection] ✅ Extracted and cleaned pose from description:', extractedPose.substring(0, 80))
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
function buildLightingSection(
  concept: ConceptComponents, 
  userRequest?: string,
  poseSection?: string,
  settingSection?: string
): string {
  if (concept.lighting) {
    return `Lighting: ${concept.lighting}.`
  }

  // 🔴 COORDINATION: Check pose and setting to match lighting context
  const poseText = poseSection ? poseSection.toLowerCase() : ''
  const settingText = settingSection ? settingSection.toLowerCase() : ''
  
  // 🔴 CRITICAL: Extract lighting from description FIRST if it contains detailed lighting information
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  
  // Extract combinedText for later use
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // 🔴 COORDINATION: If pose/setting mention market, use market lighting (check early)
  if ((/market|shopping|outdoor/i.test(poseText) || /market|shopping|outdoor/i.test(settingText)) && /christmas|holiday/i.test(combinedText)) {
    return 'Lighting: String lights overhead, wooden market stalls with evergreen garlands, warm golden hour light casting festive shadows, magical holiday market atmosphere.'
  }
  
  if (descText && descText.length > 30) {
    // Look for lighting patterns in description
    const lightingPatterns = [
      /(?:morning|evening|soft|warm|natural|ambient|twinkling|fireplace|glow|streaming).{0,50}(?:light|lighting|illumination|glow|sunlight|daylight)[^\.]{0,100}/i,
      /(?:light|lighting).{0,50}(?:streaming|filtering|glowing|shining|warm|soft|natural|morning|evening)[^\.]{0,100}/i,
    ]

    for (const pattern of lightingPatterns) {
      const match = descText.match(pattern)
      if (match && match[0] && match[0].length > 20) {
        let extractedLighting = match[0].trim()
        
        // 🔴 CLEANUP: Remove setting details that might have been captured
        // Stop at setting keywords if they appear
        const settingStopWords = /\b(market|stall|sofa|couch|room|fireplace|tree|living|bedroom|kitchen)\s+/i
        const settingMatch = extractedLighting.match(settingStopWords)
        if (settingMatch && settingMatch.index !== undefined && settingMatch.index > 50) {
          extractedLighting = extractedLighting.substring(0, settingMatch.index).trim()
        }
        
        // Extract a more complete sentence if possible, but only if it's about lighting
        const sentences = descText.split(/[\.!?]/)
        for (const sentence of sentences) {
          if (sentence.includes(match[0].substring(0, 20))) {
            if (sentence.length > 30 && sentence.length < 200 && /light|lighting|glow|illumination/i.test(sentence)) {
              // Check if sentence is primarily about lighting, not setting
              const lightingWords = (sentence.match(/\b(light|lighting|glow|illumination|bright|dark|shade|shadow|sun|daylight|ambient)\b/gi) || []).length
              const settingWords = (sentence.match(/\b(market|stall|sofa|room|fireplace|tree|table|chair)\b/gi) || []).length
              if (lightingWords >= settingWords) {
                console.log('[buildLightingSection] ✅ Extracted lighting from description:', sentence.substring(0, 80))
                return `Lighting: ${sentence.trim()}.`
              }
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
function buildSettingSection(
  concept: ConceptComponents,
  userRequest?: string,
  photographyStyle: PhotographyStyle = 'authentic',
  poseSection?: string
): string {
  if (concept.setting) {
    return `Setting: ${concept.setting}.`
  }

  // Extract context
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // 🎄 PRIORITY 0: Check for SEASONAL content (Christmas, New Years)
  const seasonal = detectSeasonalContent(combinedText)
  
  if (seasonal.season === 'christmas') {
    console.log('[buildSettingSection] ✅ Detected Christmas seasonal content')
    
    // 🔴 COORDINATION: Check pose section to ensure setting matches pose location
    const poseTextLower = poseSection ? poseSection.toLowerCase() : ''
    
    // If pose mentions market/outdoor shopping, use market setting instead of indoor
    if (/market|shopping|outdoor|walking.*through/i.test(poseTextLower) || /market|shopping|outdoor/i.test(combinedText)) {
      console.log('[buildSettingSection] ✅ Coordinating with pose: using outdoor market setting')
      return 'Setting: Festive holiday market, twinkling lights everywhere, wooden market stalls with evergreen garlands, holiday decorations, winter atmosphere, natural daylight, magical seasonal ambiance.'
    }
    
    // Detect room type - prioritize pose cues, then combinedText
    let roomType: 'living' | 'bedroom' | 'kitchen' | 'dining' | 'entryway'
    if (/sitting|seated|sofa|couch|living/i.test(poseTextLower) || /living room|lounge|sofa|couch/i.test(combinedText)) {
      roomType = 'living'
    } else if (/bedroom|bed/i.test(combinedText) || /bedroom|bed/i.test(poseTextLower)) {
      roomType = 'bedroom'
    } else if (/kitchen/i.test(combinedText) || /kitchen/i.test(poseTextLower)) {
      roomType = 'kitchen'
    } else if (/dining/i.test(combinedText) || /dining/i.test(poseTextLower)) {
      roomType = 'dining'
    } else {
      roomType = 'living' // default
    }
    
    const style = seasonal.style === 'elegant' ? 'luxury' : 
                  seasonal.style === 'cozy' ? 'cozy' : 'minimal'
    
    const timeOfDay = /morning|breakfast/i.test(combinedText) ? 'morning' :
                      /evening|night/i.test(combinedText) ? 'evening' : 'morning'
    
    const christmasSetting = buildChristmasSetting(roomType, style, timeOfDay)
    return `Setting: ${christmasSetting}.`
  }
  
  if (seasonal.season === 'new-years') {
    console.log('[buildSettingSection] ✅ Detected New Years seasonal content')
    
    const type = seasonal.style === 'party' ? 'party' : 'dinner'
    const newYearsSetting = buildNewYearsSetting(type)
    return `Setting: ${newYearsSetting}.`
  }

  // 🎯 PHOTOGRAPHY STYLE CHECK
  if (photographyStyle === 'editorial') {
    console.log('[buildSettingSection] ✅ Using editorial setting')
    
    // Editorial can be: studio, luxury interior, architectural, outdoor
    // Let buildSettingForStyle decide based on userRequest cues
    const editorialSetting = buildSettingForStyle('editorial', concept.category || 'LIFESTYLE', userRequest)
    return `Setting: ${editorialSetting}.`
  }

  // 🎯 For authentic, use Scandinavian interiors or car/casual
  if (photographyStyle === 'authentic') {
    const authenticSetting = buildSettingForStyle('authentic', concept.category || 'LIFESTYLE', userRequest)
    
    // If it returned a specific authentic setting, use it
    if (authenticSetting) {
      return `Setting: ${authenticSetting}.`
    }
  }

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

  // (Christmas/Holiday settings now handled by seasonal system above)

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
