/**
 * Maya Pro Mode Prompt Architecture
 * 
 * Defines the structured architecture for all Pro Mode prompts
 * Based on NanoBanana Pro best practices for Pinterest/fashion influencer content
 * 
 * Architecture follows this structure:
 * 1. Subject Identity & Pose
 * 2. Outfit Description (Mixed Brands)
 * 3. Luxury & Editorial Mood Language
 * 4. Environment & Context
 * 5. Camera, Framing & Lighting
 * 6. Negative Instructions
 */

export interface PromptArchitecture {
  subjectAndPose: {
    description: string
    stance: string
    bodyLanguage: string
  }
  outfit: {
    description: string
    accessibleBrands: string[]  // 1-2 foundation brands
    luxuryAccent?: string        // 1 luxury hero max
    mixedBrandRule: 'one-luxury-hero-max'
  }
  mood: {
    keywords: string[]           // quiet luxury, effortless, editorial, etc.
    aesthetic: string
    avoidTerms: string[]         // marketing language to avoid
  }
  environment: {
    setting: string
    colorStory: string
    atmosphere: string
    visualPriority: 'subject-focused' | 'balanced'
  }
  camera: {
    format: 'vertical' | 'square'
    lighting: string
    depthOfField: string
    photographyStyle: 'lifestyle' | 'editorial' | 'influencer'
  }
  negativeInstructions: string[]
}

/**
 * Brand Pool organized by usage category
 * 
 * Rules:
 * - Use 1-2 accessible brands as foundation
 * - Add max 1 luxury brand as accent
 * - Brands must feel worn, not advertised
 */
export const BRAND_POOLS = {
  athleticCasualBase: ['Alo Yoga', 'Nike', 'Lululemon', 'Outdoor Voices'],
  sneakersFootwear: ['Adidas', 'New Balance', 'Common Projects', 'UGG', 'Golden Goose'],
  denimStaples: ['Levi\'s', 'Agolde', 'Zara', 'COS', 'Everlane', 'Madewell'],
  luxuryAccents: ['Bottega Veneta', 'The Row', 'Cartier', 'Chanel', 'Dior', 'Hermès'],
  accessories: ['Ray-Ban', 'New Era', 'Mejuri'],
  feminineDressy: ['Reformation', 'Aritzia', 'Free People', '& Other Stories'],
  beautyLifestyle: ['Glossier', 'Rhode', 'Goop', 'Jenni Kayne', 'The Ordinary'],
  minimalModern: ['COS', 'Everlane', 'Toteme', 'Frankie Shop'],
} as const

/**
 * Key rules for mixing brands successfully
 */
export const BRAND_MIXING_RULES = {
  oneOutfitOneStory: 'Each outfit tells a single cohesive story',
  oneLuxuryHeroMax: 'Maximum one luxury piece per outfit',
  brandsMustFeelWorn: 'Brands should feel worn, not advertised',
  basicsMakeLuxuryBelievable: 'Accessible basics make luxury details believable',
  editorialOverInfluencer: 'Editorial restraint beats influencer excess',
} as const

/**
 * Select appropriate brands for category and theme
 * 
 * Returns:
 * - accessible: 1-2 foundation brands
 * - luxury: optional 1 luxury accent brand
 */
export function selectMixedBrands(
  category: string,
  theme: string,
  userRequest?: string
): { accessible: string[]; luxury?: string } {
  const categoryLower = category.toLowerCase()
  const themeLower = theme.toLowerCase()
  const requestLower = (userRequest || '').toLowerCase()

  let accessibleBrands: string[] = []
  let luxuryAccent: string | undefined

  // WELLNESS/FITNESS CATEGORY
  if (categoryLower.includes('wellness') || categoryLower.includes('fitness') || themeLower.includes('workout')) {
    accessibleBrands = ['Alo Yoga']
    
    // Add luxury if theme indicates it
    if (themeLower.includes('luxury') || requestLower.includes('luxury') || requestLower.includes('sophisticated')) {
      luxuryAccent = 'The Row'
    }
  }
  
  // LUXURY CATEGORY
  else if (categoryLower.includes('luxury')) {
    // For luxury category, use luxury brand as foundation
    accessibleBrands = ['The Row', 'Toteme']
    
    // Add second luxury as accent
    const luxuryOptions = ['Bottega Veneta', 'Chanel', 'Hermès']
    luxuryAccent = luxuryOptions[Math.floor(Math.random() * luxuryOptions.length)]
  }
  
  // LIFESTYLE CATEGORY
  else if (categoryLower.includes('lifestyle')) {
    // Rotate through lifestyle brands instead of always Glossier
    const lifestyleOptions = [
      ['Everlane', 'COS'],
      ['Jenni Kayne', 'Free People'],
      ['COS', 'Toteme'],
      ['Madewell', 'Everlane'],
    ]
    accessibleBrands = lifestyleOptions[Math.floor(Math.random() * lifestyleOptions.length)]
    
    // Add luxury accent if theme suggests it
    if (themeLower.includes('luxury') || requestLower.includes('chic') || requestLower.includes('elevated')) {
      const luxuryOptions = ['Bottega Veneta', 'The Row']
      luxuryAccent = luxuryOptions[Math.floor(Math.random() * luxuryOptions.length)]
    }
  }
  
  // FASHION CATEGORY
  else if (categoryLower.includes('fashion')) {
    accessibleBrands = ['Reformation', 'Aritzia']
    
    // Fashion category often benefits from luxury accent
    if (themeLower.includes('luxury') || themeLower.includes('editorial') || Math.random() > 0.5) {
      const luxuryOptions = ['Chanel', 'Bottega Veneta', 'The Row']
      luxuryAccent = luxuryOptions[Math.floor(Math.random() * luxuryOptions.length)]
    }
  }
  
  // TRAVEL CATEGORY
  else if (categoryLower.includes('travel')) {
    accessibleBrands = ['Zara', 'COS']
    
    // Travel usually has a luxury touch
    const luxuryOptions = ['The Row', 'Bottega Veneta']
    luxuryAccent = luxuryOptions[Math.floor(Math.random() * luxuryOptions.length)]
  }
  
  // BEAUTY CATEGORY
  else if (categoryLower.includes('beauty')) {
    // Rotate through beauty brands
    const beautyOptions = [
      ['Glossier', 'Rhode'],
      ['Rhode', 'The Ordinary'],
      ['Glossier'],
    ]
    accessibleBrands = beautyOptions[Math.floor(Math.random() * beautyOptions.length)]
    
    // Beauty typically doesn't need luxury fashion accent
    luxuryAccent = undefined
  }
  
  // DEFAULT/FALLBACK
  else {
    accessibleBrands = ['Everlane', 'COS']
    
    if (requestLower.includes('luxury') || requestLower.includes('chic') || requestLower.includes('sophisticated')) {
      luxuryAccent = 'Bottega Veneta'
    }
  }

  // Log selection for debugging
  console.log(`[selectMixedBrands] Category: ${category}, Theme: ${theme}`)
  console.log(`[selectMixedBrands] Selected brands:`, { accessible: accessibleBrands, luxury: luxuryAccent })

  return { accessible: accessibleBrands, luxury: luxuryAccent }
}

/**
 * Build prompt section following architecture
 * 
 * This function assembles a complete prompt following the 6-section structure
 */
export function buildArchitecturedPrompt(architecture: PromptArchitecture): string {
  const sections: string[] = []

  // 1. Subject Identity & Pose
  sections.push(
    `${architecture.subjectAndPose.description}, ${architecture.subjectAndPose.stance}, ${architecture.subjectAndPose.bodyLanguage}`
  )

  // 2. Outfit (Mixed Brands)
  let outfitText = architecture.outfit.description
  if (architecture.outfit.luxuryAccent) {
    outfitText += `, ${architecture.outfit.luxuryAccent} as luxury accent`
  }
  sections.push(outfitText)

  // 3. Mood & Aesthetic
  const moodText = `${architecture.mood.keywords.join(', ')}. ${architecture.mood.aesthetic}`
  sections.push(moodText)

  // 4. Environment
  sections.push(
    `${architecture.environment.setting}. ${architecture.environment.colorStory}. ${architecture.environment.atmosphere}`
  )

  // 5. Camera & Lighting
  sections.push(
    `${architecture.camera.format} format, ${architecture.camera.lighting}, ${architecture.camera.depthOfField}, ${architecture.camera.photographyStyle} photography feel`
  )

  // 6. Negative Instructions
  if (architecture.negativeInstructions.length > 0) {
    sections.push(`Avoid: ${architecture.negativeInstructions.join(', ')}`)
  }

  return sections.join('. ')
}

/**
 * Category-specific prompt defaults following NanoBanana architecture
 * 
 * These provide structured defaults while allowing dynamic adaptation
 */
export const CATEGORY_PROMPT_DEFAULTS: Record<
  string,
  Partial<PromptArchitecture>
> = {
  WELLNESS: {
    mood: {
      keywords: ['calm', 'grounded', 'natural', 'soft movement', 'wellness', 'balance', 'quiet confidence'],
      aesthetic: 'earthy, neutral, light color palette',
      avoidTerms: ['extreme fitness', 'intense workout', 'dramatic poses'],
    },
    environment: {
      setting: 'Minimal, airy space',
      colorStory: 'Neutral tones, natural textures, breathable fabrics',
      atmosphere: 'Peaceful, clean, wellness-focused, serene',
      visualPriority: 'subject-focused',
    },
    camera: {
      format: 'vertical',
      lighting: 'Soft daylight, natural shadows',
      depthOfField: 'Lifestyle photography feel',
      photographyStyle: 'lifestyle',
    },
    negativeInstructions: ['harsh contrast', 'exaggerated posing', 'clutter'],
  },

  LUXURY: {
    mood: {
      keywords: ['quiet luxury', 'editorial', 'polished', 'modern', 'sophisticated', 'understated elegance'],
      aesthetic: 'neutral palette, matte finishes, timeless silhouettes',
      avoidTerms: ['flashy', 'trendy', 'loud', 'logo overload'],
    },
    environment: {
      setting: 'Architectural, minimalist, premium setting',
      colorStory: 'Muted tones, clean lines',
      atmosphere: 'Sophisticated, refined, modern, quiet luxury',
      visualPriority: 'balanced',
    },
    camera: {
      format: 'vertical',
      lighting: 'Editorial lighting, controlled shadows',
      depthOfField: 'Fashion-editorial framing',
      photographyStyle: 'editorial',
    },
    negativeInstructions: ['logo overload', 'trendy exaggeration', 'flashy styling'],
  },

  LIFESTYLE: {
    mood: {
      keywords: ['relatable', 'modern', 'warm', 'effortless', 'natural', 'accessible'],
      aesthetic: 'Pinterest lifestyle aesthetic, wearable styling',
      avoidTerms: ['staged', 'artificial', 'overly produced', 'stiff'],
    },
    environment: {
      setting: 'Cafe, home, street, city moments',
      colorStory: 'Warm tones, natural elements',
      atmosphere: 'Real, lived-in, authentic, relatable',
      visualPriority: 'subject-focused',
    },
    camera: {
      format: 'vertical',
      lighting: 'Natural light, lifestyle framing',
      depthOfField: 'Shallow, lifestyle photography',
      photographyStyle: 'lifestyle',
    },
    negativeInstructions: ['stiff posing', 'staged expressions', 'artificial backgrounds'],
  },

  FASHION: {
    mood: {
      keywords: ['editorial', 'trend-aware', 'modern', 'intentional', 'confident', 'fashion-forward'],
      aesthetic: 'clean but expressive, clear silhouette',
      avoidTerms: ['messy', 'cluttered', 'unintentional', 'random styling'],
    },
    environment: {
      setting: 'Simple, fashion-supportive background',
      colorStory: 'Neutral, allows outfit to stand out',
      atmosphere: 'Editorial, minimal, focused, no visual competition',
      visualPriority: 'balanced',
    },
    camera: {
      format: 'vertical',
      lighting: 'Defined lighting, controlled depth of field',
      depthOfField: 'Fashion photography framing',
      photographyStyle: 'editorial',
    },
    negativeInstructions: ['clutter', 'distorted proportions', 'random styling elements'],
  },

  TRAVEL: {
    mood: {
      keywords: ['effortless', 'aspirational', 'calm', 'wanderlust', 'sophisticated', 'chic travel energy'],
      aesthetic: 'neutral, chic color palette, travel-ready',
      avoidTerms: ['chaotic', 'rushed', 'messy', 'unrealistic'],
    },
    environment: {
      setting: 'Airport terminals, city streets, destination settings',
      colorStory: 'Neutral, travel-appropriate, recognizable',
      atmosphere: 'Calm travel energy, sophisticated, not busy',
      visualPriority: 'balanced',
    },
    camera: {
      format: 'vertical',
      lighting: 'Natural or soft ambient lighting',
      depthOfField: 'Lifestyle travel photography',
      photographyStyle: 'lifestyle',
    },
    negativeInstructions: ['chaotic backgrounds', 'unrealistic crowds', 'motion blur chaos'],
  },

  BEAUTY: {
    mood: {
      keywords: ['clean', 'fresh', 'natural glow', 'soft', 'minimal', 'editorial beauty'],
      aesthetic: 'clean beauty, skin-focused',
      avoidTerms: ['heavy makeup', 'artificial', 'overdone', 'heavy filters'],
    },
    environment: {
      setting: 'Neutral background or clean interior',
      colorStory: 'Soft, neutral, beauty-focused',
      atmosphere: 'Fresh, minimal, editorial, no distractions',
      visualPriority: 'subject-focused',
    },
    camera: {
      format: 'vertical',
      lighting: 'Beauty photography lighting, soft, even illumination',
      depthOfField: 'Close-up or medium framing',
      photographyStyle: 'editorial',
    },
    negativeInstructions: ['heavy filters', 'exaggerated makeup', 'artificial skin texture'],
  },

  SEASONAL_CHRISTMAS: {
    mood: {
      keywords: ['warm', 'cozy', 'festive', 'elegant', 'holiday magic'],
      aesthetic: 'warm tones, soft glow, Pinterest holiday framing',
      avoidTerms: ['kitschy', 'overpowering decor', 'cartoonish'],
    },
    environment: {
      setting: 'Holiday interiors, winter streets, seasonal decor',
      colorStory: 'Warm festive tones, tasteful decorations',
      atmosphere: 'Cozy, festive, elegant, not overdone',
      visualPriority: 'balanced',
    },
    camera: {
      format: 'vertical',
      lighting: 'Warm lighting, soft shadows',
      depthOfField: 'Pinterest holiday framing',
      photographyStyle: 'lifestyle',
    },
    negativeInstructions: ['kitschy elements', 'overpowering decor', 'cartoonish vibes'],
  },
}

/**
 * Selfie-specific architecture rules
 * 
 * Selfies have unique requirements to maintain realism
 */
export const SELFIE_ARCHITECTURE: Partial<PromptArchitecture> = {
  subjectAndPose: {
    description: 'Self-taken photo, front-facing camera perspective',
    stance: 'Natural selfie posture, relaxed confidence, self-aware',
    bodyLanguage: 'Real, human presence, slight natural angle, not perfectly straight',
  },
  mood: {
    keywords: [
      'confident but relaxed',
      'calm',
      'grounded',
      'self-assured',
      'modern',
      'clean',
      'approachable',
    ],
    aesthetic: 'realistic, authentic, natural, relatable',
    avoidTerms: [
      'overly polished',
      'AI perfect',
      'too editorial',
      'too seductive',
      'too dramatic',
      'photoshoot vibes',
    ],
  },
  environment: {
    setting: 'Clean interiors, neutral walls, windows with natural light, mirrors, bedrooms, bathrooms',
    colorStory: 'Simple, real spaces that support the person',
    atmosphere: 'Personal, authentic, relatable, not competitive',
    visualPriority: 'subject-focused',
  },
  camera: {
    format: 'vertical',
    lighting: 'Soft daylight or window light, front-facing camera perspective',
    depthOfField: 'Slight natural angle, phone camera realism',
    photographyStyle: 'lifestyle',
  },
  negativeInstructions: [
    'distorted anatomy',
    'extra fingers',
    'uncanny facial symmetry',
    'cartoon or illustration style',
    'over-processed skin',
    'warped reflections',
    'smoothing filters',
    'artificial glow',
    'correct phone proportions required',
    'realistic hands and fingers',
  ],
}

/**
 * Negative instructions that apply to ALL categories
 */
export const UNIVERSAL_NEGATIVE_INSTRUCTIONS = [
  'distorted anatomy',
  'extra fingers or limbs',
  'messy logos',
  'random objects',
  'over-sharpening',
  'cartoon or AI-art look',
]

/**
 * Detect theme from combined text (title + description + request)
 * 
 * Used to apply theme-specific details to prompts
 */
export function detectThemeFromText(text: string): string {
  const textLower = text.toLowerCase()

  // Specific theme patterns
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(textLower)) {
    return 'christmas'
  }
  if (/beach|coastal|ocean|seaside|resort|tropical|swim/i.test(textLower)) {
    return 'beach'
  }
  if (/workout|gym|fitness|athletic|yoga|sport|wellness/i.test(textLower)) {
    return 'workout'
  }
  if (/luxury|elegant|chic|sophisticated|premium|high-end|refined/i.test(textLower)) {
    return 'luxury'
  }
  if (/travel|airport|vacation|destination|jet.*set|wanderlust/i.test(textLower)) {
    return 'travel'
  }
  if (/cafe|coffee|brunch|restaurant|bistro|dining/i.test(textLower)) {
    return 'cafe'
  }
  if (/selfie|mirror|front.*facing|self.*portrait/i.test(textLower)) {
    return 'selfie'
  }
  if (/casual|everyday|lifestyle|relatable|authentic/i.test(textLower)) {
    return 'casual'
  }

  // Default
  return 'lifestyle'
}

/**
 * Get mood keywords based on theme and category
 */
export function getMoodKeywords(
  category: string,
  theme: string,
  userRequest?: string
): string[] {
  const categoryDefaults = CATEGORY_PROMPT_DEFAULTS[category.toUpperCase()]
  const baseKeywords = categoryDefaults?.mood?.keywords || [
    'modern',
    'clean',
    'authentic',
  ]

  // Add theme-specific keywords
  const themeKeywords: Record<string, string[]> = {
    christmas: [
      'warm',
      'cozy',
      'festive',
      'holiday magic',
      'peaceful',
      'joyful',
    ],
    beach: ['breezy', 'relaxed', 'coastal', 'serene', 'vacation vibes'],
    workout: ['energetic', 'strong', 'confident', 'focused', 'athletic'],
    luxury: [
      'sophisticated',
      'refined',
      'elegant',
      'quiet luxury',
      'understated',
    ],
    travel: ['adventurous', 'sophisticated', 'wanderlust', 'effortless', 'chic'],
    cafe: ['cozy', 'casual', 'warm', 'inviting', 'relatable'],
    selfie: ['confident', 'natural', 'authentic', 'relaxed', 'real'],
  }

  const additionalKeywords = themeKeywords[theme] || []

  // Combine and deduplicate
  return Array.from(new Set([...baseKeywords, ...additionalKeywords]))
}

/**
 * Build detailed setting description based on category and theme
 * 
 * Returns specific, Pinterest-worthy setting descriptions
 */
export function buildDetailedSetting(
  category: string,
  theme: string,
  userRequest?: string
): string {
  const requestLower = (userRequest || '').toLowerCase()

  // Theme-specific detailed settings
  if (theme === 'christmas') {
    if (/morning|breakfast|coffee/i.test(requestLower)) {
      return 'Cozy Christmas morning scene, decorated living room with illuminated tree, warm fireplace, holiday decorations, soft morning light through windows, festive atmosphere'
    } else if (/fireplace|evening|night/i.test(requestLower)) {
      return 'Elegant living room with crackling fireplace, Christmas tree with twinkling lights, luxurious holiday atmosphere, warm evening lighting, tasteful festive decorations'
    } else if (/market|outdoor|shopping/i.test(requestLower)) {
      return 'Festive holiday market, twinkling lights everywhere, holiday decorations, winter atmosphere, natural daylight, magical seasonal ambiance'
    } else {
      return 'Cozy holiday setting with beautifully decorated Christmas tree, warm festive atmosphere, elegant holiday decorations, soft natural lighting, magical seasonal ambiance'
    }
  }

  if (theme === 'luxury') {
    if (/hotel|lobby|lounge/i.test(requestLower)) {
      return 'Luxurious five-star hotel lobby, marble floors, sophisticated architectural details, soft ambient lighting, refined atmosphere'
    } else if (/boutique|store/i.test(requestLower)) {
      return 'High-end luxury boutique interior, minimalist design, premium materials, elegant lighting, sophisticated retail atmosphere'
    } else if (/restaurant|dining/i.test(requestLower)) {
      return 'Sophisticated fine dining restaurant, marble surfaces, elegant table settings, refined lighting, upscale ambiance'
    } else {
      return 'Sophisticated modern interior with architectural details, polished marble surfaces, floor-to-ceiling windows, refined furniture, understated luxury atmosphere'
    }
  }

  if (theme === 'beach') {
    return 'Pristine coastal beach, turquoise ocean views, white sand, natural beach textures, soft coastal light, serene beach atmosphere'
  }

  if (theme === 'cafe') {
    return 'Charming coastal cafe or modern bistro, natural textures, warm ambient lighting, cozy authentic atmosphere, real lived-in setting'
  }

  if (theme === 'travel') {
    return 'Modern airport terminal with floor-to-ceiling windows, natural light, contemporary architecture, sophisticated travel atmosphere, subtle travel accessories visible'
  }

  if (theme === 'workout') {
    return 'Minimalist wellness studio, natural light streaming through windows, yoga mat visible, plants in background, clean athletic space, calm atmosphere'
  }

  // Category-specific defaults
  const categorySettings: Record<string, string> = {
    WELLNESS:
      'Minimalist wellness studio with abundant natural light, yoga mat and meditation cushions visible, potted plants creating calming atmosphere, clean white walls',
    LUXURY:
      'Sophisticated modern interior with architectural details, polished marble surfaces, floor-to-ceiling windows, refined furniture, understated luxury atmosphere',
    LIFESTYLE:
      'Coastal home interior with natural textures, soft morning light filtering through linen curtains, organic materials, lived-in comfortable atmosphere',
    FASHION:
      'Clean urban setting in SoHo district, minimalist street backdrop, modern architecture, natural city atmosphere, fashion-supportive environment',
    TRAVEL:
      'Contemporary airport terminal with natural light from large windows, modern minimalist design, sophisticated travel atmosphere',
    BEAUTY:
      'Sun-drenched bathroom or bedroom, soft morning light creating natural glow, skincare products artfully arranged, marble or natural stone surfaces',
  }

  return (
    categorySettings[category.toUpperCase()] ||
    'Modern, clean setting with natural light and authentic atmosphere'
  )
}
