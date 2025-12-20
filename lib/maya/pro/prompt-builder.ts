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

  // Extract style/aesthetic keywords from userRequest to personalize the prompt
  const userRequestLower = (userRequest || '').toLowerCase()
  const isPinterestStyle = /pinterest|curated|aesthetic|dreamy|soft|feminine/i.test(userRequest || '')
  const isEditorialStyle = /editorial|fashion|sophisticated|refined/i.test(userRequest || '')
  const isLifestyleStyle = /lifestyle|casual|everyday|authentic|real/i.test(userRequest || '')
  const isLuxuryStyle = /luxury|elegant|chic|sophisticated|premium/i.test(userRequest || '')

  const prompt = `Professional photography. ${isPinterestStyle ? 'Pinterest-style' : isEditorialStyle ? 'Editorial' : 'Influencer'} portrait maintaining exactly the same physical characteristics, facial features, and body proportions. Editorial quality with authentic iPhone aesthetic.

${buildOutfitSection(concept, categoryInfo, userRequest)}

${buildPoseSection(concept, userRequest)}

${buildLightingSection(concept, userRequest)}

${buildSettingSection(concept, userRequest)}

${buildMoodSection(concept, userRequest)}

Aesthetic: ${buildAestheticDescription(categoryInfo, concept, userRequest)}

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

  // Build outfit based on category and available brands
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
      if (brands.length > 0) {
        const brand = brands[0] // Glossier
        outfitDescription += `Oversized cream knit sweater, matching lounge pants, ${brand} product visible on vanity, bare feet on hardwood floor.`
      } else {
        outfitDescription += 'Oversized cream knit sweater, matching lounge pants, minimalist accessories, bare feet.'
      }
      break

    case 'FASHION':
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

  // Default natural poses
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

  // Realistic lighting options
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

  // Category-specific default settings
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

  // Category-specific moods
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
