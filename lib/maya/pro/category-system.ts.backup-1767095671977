/**
 * Pro Mode Category System
 * 
 * Defines 6 categories with brand associations and detection logic.
 * Used for intelligent concept generation and prompt building.
 */

export interface ImageLibrary {
  selfies: string[]
  products: string[]
  people: string[]
  vibes: string[]
  intent: string
}

export interface CategoryInfo {
  key: string
  name: string
  brands: string[]
  templates: number
  description: string
}

export interface UniversalPrompt {
  id: string
  title: string
  description: string
  category: string
  aesthetic: string
  fullPrompt: string
  template?: string
  brandReferences?: string[]
  stylingDetails?: string
  technicalSpecs?: string
}

/**
 * Pro Mode Categories
 * 
 * 6 categories with brand associations and template counts.
 */
export const PRO_MODE_CATEGORIES: Record<string, CategoryInfo> = {
  WELLNESS: {
    key: 'WELLNESS',
    name: 'Wellness',
    brands: ['Alo Yoga', 'Lululemon', 'Outdoor Voices'],
    templates: 8,
    description: 'Athletic wear, meditation, yoga, fitness',
  },
  LUXURY: {
    key: 'LUXURY',
    name: 'Luxury',
    brands: ['CHANEL', 'Dior', 'Bottega Veneta', 'The Row'],
    templates: 9,
    description: 'High fashion, editorial, sophisticated styling',
  },
  LIFESTYLE: {
    key: 'LIFESTYLE',
    name: 'Lifestyle',
    brands: ['Glossier', 'Free People', 'Jenni Kayne'],
    templates: 9,
    description: 'Everyday moments, coastal living, clean aesthetic',
  },
  FASHION: {
    key: 'FASHION',
    name: 'Fashion',
    brands: ['Reformation', 'Everlane', 'Aritzia', 'Toteme'],
    templates: 10,
    description: 'Street style, editorial, Scandi minimalism',
  },
  TRAVEL: {
    key: 'TRAVEL',
    name: 'Travel',
    brands: [],
    templates: 10,
    description: 'Airport scenes, vacation mode, jet-set',
  },
  BEAUTY: {
    key: 'BEAUTY',
    name: 'Beauty & Skincare',
    brands: ['Rhode', 'Glossier', 'The Ordinary'],
    templates: 0, // shares lifestyle templates
    description: 'Routines, product shots, self-care moments',
  },
} as const

/**
 * Detect category based on user request and image library
 * 
 * Detection logic:
 * 1. User request keywords (wellness, luxury, fashion, etc.)
 * 2. Products in library (brand detection)
 * 3. Context clues from intent
 */
export function detectCategory(
  userRequest: string,
  imageLibrary: ImageLibrary
): CategoryInfo | null {
  // Safe null handling for all inputs
  const safeUserRequest = (userRequest && typeof userRequest === 'string') ? userRequest : ''
  const safeIntent = (imageLibrary.intent && typeof imageLibrary.intent === 'string') ? imageLibrary.intent : ''
  const combinedText = `${safeUserRequest} ${safeIntent}`.toLowerCase()

  // Brand detection from products in library (safe array handling)
  const safeProducts = (imageLibrary.products && Array.isArray(imageLibrary.products)) ? imageLibrary.products : []
  const productText = safeProducts.join(' ').toLowerCase()
  const allText = `${combinedText} ${productText}`

  // Check for brand matches first (strongest signal)
  for (const [key, category] of Object.entries(PRO_MODE_CATEGORIES)) {
    if (category.brands && Array.isArray(category.brands)) {
      for (const brand of category.brands) {
        if (brand && typeof brand === 'string' && allText.includes(brand.toLowerCase())) {
          return category
        }
      }
    }
  }

  // Keyword detection from user request
  const keywordPatterns: Record<string, string[]> = {
    WELLNESS: [
      'wellness', 'yoga', 'fitness', 'workout', 'gym', 'meditation', 'athletic',
      'alo', 'lululemon', 'athleisure', 'activewear', 'sport', 'exercise',
    ],
    LUXURY: [
      'luxury', 'chanel', 'dior', 'bottega', 'the row', 'high fashion',
      'editorial', 'sophisticated', 'designer', 'couture', 'premium',
    ],
    LIFESTYLE: [
      'lifestyle', 'everyday', 'coastal', 'clean aesthetic', 'minimal',
      'glossier', 'free people', 'jenni kayne', 'home', 'casual',
    ],
    FASHION: [
      'fashion', 'street style', 'reformation', 'everlane', 'aritzia',
      'toteme', 'scandi', 'minimalism', 'outfit', 'style',
    ],
    TRAVEL: [
      'travel', 'airport', 'vacation', 'jet-set', 'trip', 'destination',
      'hotel', 'resort', 'beach', 'tropical', 'wanderlust',
    ],
    BEAUTY: [
      'beauty', 'skincare', 'makeup', 'routine', 'self-care', 'rhode',
      'the ordinary', 'product', 'glow', 'ritual',
    ],
  }

  // Count keyword matches for each category
  const categoryScores: Record<string, number> = {}
  for (const [key, keywords] of Object.entries(keywordPatterns)) {
    categoryScores[key] = keywords.reduce((score, keyword) => {
      return score + (allText.includes(keyword) ? 1 : 0)
    }, 0)
  }

  // Find category with highest score
  const maxScore = Math.max(...Object.values(categoryScores))
  if (maxScore > 0) {
    const topCategory = Object.entries(categoryScores).find(
      ([_, score]) => score === maxScore
    )?.[0]
    if (topCategory && PRO_MODE_CATEGORIES[topCategory]) {
      return PRO_MODE_CATEGORIES[topCategory]
    }
  }

  // 🔴 FIX: Return null instead of defaulting to LIFESTYLE
  // Let Maya determine categories dynamically using her expertise
  return null
}

/**
 * Get appropriate Universal Prompts for a category
 * 
 * This function should return prompts that match the category
 * and can be linked to the user's images.
 * 
 * TODO: Integrate with actual Universal Prompts system
 */
export function getCategoryPrompts(
  category: string | null,
  userLibrary: ImageLibrary
): UniversalPrompt[] {
  // 🔴 FIX: If category is null, return empty array to signal dynamic generation should be used
  if (!category) {
    console.log(`[Category System] No category provided - will use dynamic generation with Maya fashion knowledge`)
    return [] // Empty array signals caller to use dynamic generation
  }
  
  const categoryInfo = PRO_MODE_CATEGORIES[category.toUpperCase()]
  if (!categoryInfo) {
    console.warn(`[Category System] Unknown category: ${category}`)
    return [] // Return empty to signal dynamic generation
  }

  // TODO: Fetch actual Universal Prompts from the prompt system
  // For now, return placeholder structure
  // This should integrate with lib/maya/prompt-components/universal-prompts-raw.ts
  
  const placeholderPrompts: UniversalPrompt[] = [
    {
      id: `concept-1-${category}`,
      title: `${categoryInfo.name} Concept 1`,
      description: `Professional ${categoryInfo.name.toLowerCase()} content with ${categoryInfo.description}`,
      category: categoryInfo.name,
      aesthetic: categoryInfo.description,
      fullPrompt: `Professional photography. Influencer/Pinterest style portrait maintaining exactly the same physical characteristics. ${categoryInfo.description}. Shot on iPhone 15 Pro, natural skin texture, film grain, muted colors.`,
      template: `${categoryInfo.name} Template 1`,
      brandReferences: categoryInfo.brands.slice(0, 2),
      stylingDetails: `Styling details for ${categoryInfo.name.toLowerCase()} aesthetic`,
      technicalSpecs: 'Shot on iPhone 15 Pro portrait mode, shallow depth of field, natural lighting',
    },
    {
      id: `concept-2-${category}`,
      title: `${categoryInfo.name} Concept 2`,
      description: `Editorial ${categoryInfo.name.toLowerCase()} moment with sophisticated styling`,
      category: categoryInfo.name,
      aesthetic: categoryInfo.description,
      fullPrompt: `Professional photography. Influencer/Pinterest style portrait maintaining exactly the same physical characteristics. ${categoryInfo.description}. Shot on iPhone 15 Pro, natural skin texture, film grain, muted colors.`,
      template: `${categoryInfo.name} Template 2`,
      brandReferences: categoryInfo.brands.slice(0, 2),
      stylingDetails: `Styling details for ${categoryInfo.name.toLowerCase()} aesthetic`,
      technicalSpecs: 'Shot on iPhone 15 Pro, 50mm, natural bokeh',
    },
    {
      id: `concept-3-${category}`,
      title: `${categoryInfo.name} Concept 3`,
      description: `Authentic ${categoryInfo.name.toLowerCase()} content with real brand references`,
      category: categoryInfo.name,
      aesthetic: categoryInfo.description,
      fullPrompt: `Professional photography. Influencer/Pinterest style portrait maintaining exactly the same physical characteristics. ${categoryInfo.description}. Shot on iPhone 15 Pro, natural skin texture, film grain, muted colors.`,
      template: `${categoryInfo.name} Template 3`,
      brandReferences: categoryInfo.brands.slice(0, 2),
      stylingDetails: `Styling details for ${categoryInfo.name.toLowerCase()} aesthetic`,
      technicalSpecs: 'Shot on iPhone 15 Pro, 85mm, natural lighting',
    },
  ]

  // Link user's images to prompts
  // TODO: Implement intelligent image linking based on category and image types
  return placeholderPrompts.map((prompt) => ({
    ...prompt,
    // Link images based on category
    // For now, use all available images
    linkedImages: [
      ...userLibrary.selfies.slice(0, 1),
      ...userLibrary.products.slice(0, 1),
      ...userLibrary.vibes.slice(0, 1),
    ].filter(Boolean),
  }))
}

/**
 * Get category by key
 */
export function getCategoryByKey(key: string | null): CategoryInfo | null {
  if (!key || typeof key !== 'string') {
    return null
  }
  return PRO_MODE_CATEGORIES[key.toUpperCase()] || null
}

/**
 * Get all categories
 */
export function getAllCategories(): CategoryInfo[] {
  return Object.values(PRO_MODE_CATEGORIES)
}

/**
 * Check if a brand belongs to a category
 */
export function getCategoryForBrand(brandName: string): CategoryInfo | null {
  for (const category of Object.values(PRO_MODE_CATEGORIES)) {
    if (category.brands.some((brand) => brand.toLowerCase() === brandName.toLowerCase())) {
      return category
    }
  }
  return null
}
