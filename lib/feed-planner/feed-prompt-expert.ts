/**
 * Feed Prompt Expert
 * 
 * Specialized AI prompting for cohesive 9-post Instagram feeds
 * Unlike concept cards (maximize diversity), feeds require visual harmony
 * 
 * Supports:
 * - Classic Mode: LoRA-trained model prompts (short, trigger word)
 * - Pro Mode: NanaBanana Pro prompts (detailed, editorial)
 * - 5 signature aesthetics with specific visual elements
 * - 80% user photos / 20% lifestyle content
 */

// ============================================================================
// COLOR PALETTE DEFINITIONS
// ============================================================================

export interface ColorPalette {
  name: string
  id: string
  colors: string[]
  hexCodes: string[]
  lighting: string
  mood: string
  temperature: 'cool' | 'warm' | 'neutral'
  backgroundStyle: string
  fashionStyle: string
  forbiddenTones?: string[]
  lifestyleObjects?: string[]
  typicalPoses?: string[]
}

export const MAYA_SIGNATURE_PALETTES: Record<string, ColorPalette> = {
  DARK_MOODY: {
    name: 'Dark & Moody',
    id: 'dark_moody',
    colors: ['pure black', 'charcoal gray', 'medium gray', 'cool white'],
    hexCodes: ['#000000', '#2d2d2d', '#6b6b6b', '#f5f5f5'],
    lighting: 'high contrast directional lighting with deep blacks and bright highlights, editorial studio quality, clean modern shadows',
    mood: 'sophisticated, editorial luxury, modern minimalism, fashion-forward, urban chic, powerful',
    temperature: 'neutral',
    backgroundStyle: 'concrete walls, urban architecture, minimalist gray spaces, modern buildings, clean geometric backgrounds, industrial modern settings',
    fashionStyle: 'black leather jackets, all-black monochrome outfits, black dresses with structured silhouettes, white shirts with black blazers, black bodysuits, editorial fashion pieces',
    forbiddenTones: ['warm browns', 'sepia', 'vintage yellow', 'warm orange', 'rust', 'terracotta'],
    lifestyleObjects: ['black coffee on white surface', 'architectural details in grayscale', 'urban geometric patterns', 'monochrome flatlays', 'minimal black objects on concrete'],
    typicalPoses: ['confident editorial stance', 'looking away or down', 'walking in urban setting', 'architectural framing', 'full body fashion shot', 'mirror selfie in black']
  },
  
  CLEAN_MINIMAL: {
    name: 'Clean & Minimalistic',
    id: 'clean_minimal',
    colors: ['pure white', 'soft off-white', 'very light cream', 'barely-there beige'],
    hexCodes: ['#ffffff', '#fefefe', '#faf9f8', '#f5f3f1'],
    lighting: 'extremely bright high-key photography, almost overexposed, soft diffused light, airy ethereal quality, minimal shadows',
    mood: 'serene, peaceful, meditative, fresh, pure, ethereal, aspirational simplicity',
    temperature: 'cool',
    backgroundStyle: 'pure white walls smooth and clean, white bedding organized and pristine, minimal white interiors, very light coastal elements, white curtains with natural light',
    fashionStyle: 'all-white everything, white oversized t-shirts, white smooth knit sweaters, white casual loungewear, white sneakers, white linen sets, flowing white fabrics',
    lifestyleObjects: ['white flowers (baby\'s breath, white roses)', 'white candles and tea lights', 'white books and notebooks', 'white ceramic cups', 'white everyday objects', 'coastal shells and light sand', 'text overlay quotes'],
    typicalPoses: ['serene peaceful expression', 'lying in white bedding', 'minimal movement calm poses', 'overhead flatlay angles', 'symmetrical compositions']
  },
  
  SCANDINAVIAN_MUTED: {
    name: 'Scandinavian Muted',
    id: 'scandi_muted',
    colors: ['greige', 'soft gray', 'warm taupe', 'cool beige', 'soft cream', 'natural linen'],
    hexCodes: ['#d4cfc9', '#b8b5b0', '#a89f91', '#c9c5bf', '#f5f1ec', '#e6e2dd'],
    lighting: 'abundant natural window light, soft diffused quality, gentle dimensional shadows, bright and airy, warm daylight',
    mood: 'calm, serene, hygge, sophisticated but approachable, natural, organic, warm minimalism',
    temperature: 'neutral',
    backgroundStyle: 'pure white walls modern and clean, soft cream beige walls, white bedding textured and layered, modern minimalist architecture, light wood surfaces subtle',
    fashionStyle: 'all-white outfits (blazers pants dresses), cream ivory knitwear textured, white linen loose and flowy, neutral loungewear soft, ribbed white tops, natural fabrics (linen cotton knit silk)',
    lifestyleObjects: ['coffee tea in neutral ceramic cups', 'skincare in white packaging', 'fashion books neutral tones', 'white bedding and textiles', 'natural ceramic objects', 'knit bags and accessories', 'sculptural furniture details'],
    typicalPoses: ['cozy relaxed moments', 'sitting cross-legged', 'holding coffee or tea', 'wrapped in blankets', 'natural comfortable poses', 'intimate close-ups']
  },
  
  BEIGE_SIMPLE: {
    name: 'Beige & Simple',
    id: 'beige_simple',
    colors: ['soft beige', 'warm cream', 'latte brown', 'cappuccino tan', 'chocolate brown', 'warm caramel'],
    hexCodes: ['#e8e4df', '#f5f1ec', '#c9b8a8', '#d4c5b8', '#8b7355', '#b89968'],
    lighting: 'warm natural light golden hour quality indoors, soft diffused warmth, cozy inviting atmosphere, warm amber undertones',
    mood: 'warm, cozy, inviting, sophisticated yet approachable, urban coffee culture, comfortable elegance, latte lifestyle',
    temperature: 'warm',
    backgroundStyle: 'warm beige cream walls, natural wood surfaces light to medium, beige bedding textured, café interiors, neutral stone marble warm undertones, warm white spaces',
    fashionStyle: 'beige tan ribbed knit dresses and sets, cream oversized shirts with beige bottoms, brown knitwear cardigans sweaters, chocolate brown vests over white, beige loungewear athleisure, tan beige pants skirts',
    forbiddenTones: ['orange', 'terracotta', 'rust', 'warm amber orange tones'],
    lifestyleObjects: ['coffee drinks (iced hot latte art) CENTRAL THEME', 'pastries and baked goods croissants chocolate', 'vintage stacked books', 'vinyl records music', 'dried flowers pampas grass neutral', 'classical art sculptures', 'skincare beige brown packaging', 'candles warm tones', 'wooden trays'],
    typicalPoses: ['holding coffee cups', 'morning routine moments', 'cozy café settings', 'relaxed comfortable poses', 'lifestyle authenticity']
  },
  
  PASTELS_SCANDIC: {
    name: 'Pastels Scandic',
    id: 'pastels_scandic',
    colors: ['dusty rose blush pink', 'powder blue', 'soft lavender', 'sage green', 'soft cream ivory'],
    hexCodes: ['#d4a5a5', '#b8c5d6', '#d1c9e0', '#b8c5b0', '#f5f1ec'],
    lighting: 'soft diffused gentle light, ethereal dreamy quality, natural window light, slightly overexposed bright but soft, cool to neutral',
    mood: 'romantic, serene, dreamy, feminine but sophisticated, Nordic elegance, soft, gentle, ethereal beauty',
    temperature: 'cool',
    backgroundStyle: 'soft white cream walls, light gray backgrounds, beach coastal settings, clean white spaces, soft pink or blue tinted walls, natural soft settings',
    fashionStyle: 'dusty pink blush clothing common, soft cream ivory pieces, ribbed white crop tops, soft pastel knitwear, white linen and cotton, cream loungewear, feminine silhouettes, soft flowy fabrics',
    forbiddenTones: ['bright vibrant pastels candy colors', 'saturated colors', 'warm golden beige'],
    lifestyleObjects: ['beauty skincare pink packaging', 'pink drinks lattes smoothies', 'soft dried flowers pampas grass', 'pastel-colored objects', 'white ceramic items', 'books and magazines', 'coastal shells and sand', 'yellow flowers accent', 'cloudy skies'],
    typicalPoses: ['romantic dreamy expressions', 'soft gentle movements', 'beauty self-care moments', 'coastal beach settings', 'feminine poses', 'serene peaceful']
  }
}

// ============================================================================
// AESTHETIC-SPECIFIC OBJECT LIBRARIES
// ============================================================================

/**
 * Specific objects that appear in each aesthetic's lifestyle posts
 * These should be used when generating lifestyle/flatlay prompts
 */
export const AESTHETIC_LIFESTYLE_OBJECTS: Record<string, string[]> = {
  dark_moody: [
    'black coffee cup on white marble surface',
    'modern black candle on concrete',
    'architectural concrete detail with shadows',
    'black leather journal on gray surface',
    'monochrome geometric pattern',
    'urban building facade in grayscale',
    'black and white minimal flatlay',
    'industrial metal objects on concrete'
  ],
  
  clean_minimal: [
    'white ceramic cup with tea on white surface',
    'white baby\'s breath flowers in clear vase',
    'white candles simple tea lights',
    'stack of white books minimal',
    'white ceramic bowl empty clean',
    'white shells on light sand',
    'white feather delicate on white',
    'white headphones or earbuds',
    'inspirational quote text overlay on white background'
  ],
  
  scandi_muted: [
    'cappuccino in neutral ceramic cup on linen',
    'white ceramic mug with coffee on knit blanket',
    'neutral skincare bottles on white surface',
    'cream colored candle on beige surface',
    'natural linen bag with minimal styling',
    'white laptop on greige desk',
    'ceramic vase with dried pampas grass',
    'textured knit sweater folded on white bedding'
  ],
  
  beige_simple: [
    'iced latte in glass on wooden table',
    'cappuccino with latte art in beige cup',
    'croissant on neutral ceramic plate',
    'chocolate pastry with powdered sugar',
    'vintage books stacked on wood surface',
    'vinyl record player with beige tones',
    'dried pampas grass in neutral vase',
    'classical sculpture bust in cream tones',
    'brown leather journal with coffee',
    'wooden tray with beige candle'
  ],
  
  pastels_scandic: [
    'pink smoothie in clear glass on white',
    'dusty rose skincare product on white bedding',
    'soft pink dried flowers in white vase',
    'powder blue ceramic cup with coffee',
    'lavender candle on light surface',
    'pink beauty products flatlay on white',
    'soft cream ceramic bowl with natural elements',
    'yellow flowers in clear vase (accent)',
    'white shells on pale sand coastal',
    'soft pink drink with ice on marble'
  ]
}

// ============================================================================
// POSE & MOMENT LIBRARIES FOR USER POSTS
// ============================================================================

/**
 * Authentic poses and moments specific to each aesthetic
 * These create the "stolen from life" quality vs staged/produced
 */
export const AESTHETIC_POSES_MOMENTS: Record<string, string[]> = {
  dark_moody: [
    'walking confidently in urban setting, looking straight ahead',
    'leaning against concrete wall, looking down pensively',
    'mid-stride on city street, hair moving naturally',
    'standing in architectural doorway, strong posture',
    'mirror selfie in all-black outfit, phone raised',
    'looking over shoulder with serious expression',
    'sitting on steps, elbows on knees, contemplative'
  ],
  
  clean_minimal: [
    'lying in white bedding, peaceful serene expression',
    'sitting cross-legged in white space, calm',
    'standing by white curtain, soft natural light',
    'overhead view lying in white sheets, relaxed',
    'holding white cup near face, minimal movement',
    'walking in white space, ethereal quality',
    'sitting on white surface, knees pulled up gently'
  ],
  
  scandi_muted: [
    'sitting cross-legged on bed, holding coffee cup warmly',
    'wrapped in cream blanket, cozy comfortable',
    'standing by window with natural light, relaxed posture',
    'lying in textured bedding, reading or resting',
    'sitting on floor with knees up, casual comfortable',
    'adjusting cream sweater naturally, candid',
    'holding warm drink with both hands, intimate moment'
  ],
  
  beige_simple: [
    'holding iced coffee cup, casual morning moment',
    'sitting in café setting, relaxed posture',
    'morning routine with coffee, authentic lifestyle',
    'wearing beige outfit, holding warm drink',
    'lounging in beige athleisure, comfortable',
    'mid-sip of coffee, natural moment',
    'adjusting beige knit sweater, candid gesture'
  ],
  
  pastels_scandic: [
    'holding pink drink, soft feminine moment',
    'sitting in soft cream outfit, romantic pose',
    'touching hair gently, dreamy expression',
    'standing by white wall, soft natural pose',
    'lying in white bedding with soft blanket, serene',
    'holding beauty product near face, self-care moment',
    'walking on beach in white, ethereal movement'
  ]
}

// ============================================================================
// PROMPT GENERATION FUNCTIONS
// ============================================================================

interface FeedPromptParams {
  mode: 'classic' | 'pro'
  postType: 'user' | 'lifestyle'
  shotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery'
  colorPalette: ColorPalette
  visualDirection?: string
  purpose?: string
  background?: string
  triggerWord?: string
  gender?: string
  ethnicity?: string
  physicalPreferences?: string
}

/**
 * Generate feed-optimized prompt for Classic Mode (LoRA)
 */
function generateClassicModePrompt(params: FeedPromptParams): string {
  const { postType, shotType, colorPalette, visualDirection, background, triggerWord, gender, ethnicity, physicalPreferences } = params
  
  if (postType === 'lifestyle') {
    // Select random lifestyle object from aesthetic
    const objects = AESTHETIC_LIFESTYLE_OBJECTS[colorPalette.id as keyof typeof AESTHETIC_LIFESTYLE_OBJECTS] || []
    const objectExample = objects.length > 0 ? objects[Math.floor(Math.random() * objects.length)] : visualDirection || 'minimal object composition'
    
    return `${objectExample}, ${colorPalette.lighting}, ${colorPalette.colors[0]} and ${colorPalette.colors[1]} color palette, editorial flatlay photography, ${colorPalette.mood} aesthetic`
  }
  
  // User posts: Start with trigger word
  const starter = `${triggerWord} ${ethnicity ? ethnicity + ', ' : ''}${gender}`
  const physicalPrefs = physicalPreferences ? `, ${physicalPreferences}` : ''
  
  // Select random pose/moment from aesthetic
  const poses = AESTHETIC_POSES_MOMENTS[colorPalette.id as keyof typeof AESTHETIC_POSES_MOMENTS] || []
  const poseExample = poses.length > 0 ? poses[Math.floor(Math.random() * poses.length)] : 'natural candid moment'
  
  // Extract fashion from visual direction or use aesthetic default
  const fashionHint = visualDirection || colorPalette.fashionStyle.split(',')[0]
  
  return `${starter}${physicalPrefs}, ${fashionHint}, ${colorPalette.lighting}, ${poseExample}, ${background || colorPalette.backgroundStyle.split(',')[0]}, ${colorPalette.colors[0]} and ${colorPalette.colors[1]} color palette`
}

/**
 * Generate feed-optimized prompt for Pro Mode (NanaBanana)
 */
function generateProModePrompt(params: FeedPromptParams): string {
  const { postType, shotType, colorPalette, visualDirection, purpose, background, gender, ethnicity, physicalPreferences } = params
  
  if (postType === 'lifestyle') {
    // Detailed lifestyle object description
    const objects = AESTHETIC_LIFESTYLE_OBJECTS[colorPalette.id as keyof typeof AESTHETIC_LIFESTYLE_OBJECTS] || []
    const objectBase = objects.length > 0 ? objects[Math.floor(Math.random() * objects.length)] : visualDirection || 'editorial lifestyle composition'
    
    return `${objectBase} with attention to material textures and surface details, ${colorPalette.lighting} creating subtle dimensional shadows and depth, minimalist editorial composition with generous negative space, ${colorPalette.mood} aesthetic, ${colorPalette.colors.join(' and ')} color harmony creating visual cohesion, shot on iPhone 15 Pro, ${shotType === 'flatlay' ? 'flatlay photography style from overhead' : 'lifestyle photography style'}, natural depth of field, magazine-quality styling, ${colorPalette.temperature} color temperature, professional product photography aesthetic`
  }
  
  // User posts: Detailed editorial description
  const ageEstimate = gender === 'woman' ? 'in her early 30s' : gender === 'man' ? 'in his early 30s' : 'young adult'
  const pronouns = gender === 'woman' ? { subject: 'she', possessive: 'her' } : gender === 'man' ? { subject: 'he', possessive: 'his' } : { subject: 'they', possessive: 'their' }
  
  // Physical preferences handling
  const physicalDesc = physicalPreferences ? `, ${physicalPreferences}` : ''
  
  // Select pose/moment
  const poses = AESTHETIC_POSES_MOMENTS[colorPalette.id as keyof typeof AESTHETIC_POSES_MOMENTS] || []
  const moment = poses.length > 0 ? poses[Math.floor(Math.random() * poses.length)] : 'natural authentic candid moment'
  
  // Fashion details from visual direction or aesthetic default
  const fashionDetails = visualDirection || colorPalette.fashionStyle.split(',').slice(0, 2).join(' with ')
  
  // Background from params or aesthetic default
  const bgDetails = background || colorPalette.backgroundStyle.split(',')[0]
  
  // Aesthetic-specific editorial reference
  const editorialRef = colorPalette.id === 'dark_moody' ? 'dark high-fashion Vogue editorials and luxury monochrome campaigns' :
                        colorPalette.id === 'clean_minimal' ? 'ethereal minimalist wellness photography and clean beauty editorials' :
                        colorPalette.id === 'scandi_muted' ? 'Scandinavian lifestyle editorials and Nordic home publications' :
                        colorPalette.id === 'beige_simple' ? 'warm luxury lifestyle magazines and coffee culture editorials' :
                        'soft romantic fashion editorials and feminine luxury campaigns'
  
  return `A ${gender} ${ethnicity ? ethnicity + ', ' : ''}${ageEstimate}${physicalDesc}, wearing ${fashionDetails} with attention to fabric textures and styling details, ${colorPalette.lighting} creating dimensional shadows and highlighting textures, ${moment}, positioned against ${bgDetails} with subtle environmental details, editorial luxury aesthetic reminiscent of ${editorialRef}, shot on iPhone 15 Pro using portrait mode, 35mm equivalent focal length, shallow depth of field with professional bokeh, ${colorPalette.colors.join(', ')} color palette creating visual cohesion across feed, magazine-quality composition following rule of thirds, ${colorPalette.temperature} color temperature throughout, ${colorPalette.mood} mood`
}

/**
 * Main export: Generate feed prompt
 */
export function generateFeedPrompt(params: FeedPromptParams): string {
  if (params.mode === 'classic') {
    return generateClassicModePrompt(params)
  } else {
    return generateProModePrompt(params)
  }
}

// ============================================================================
// PROMPT VALIDATION
// ============================================================================

/**
 * Validate prompt meets feed quality standards
 */
export function validateFeedPrompt(prompt: string, mode: 'classic' | 'pro'): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Length validation
  if (mode === 'classic' && prompt.length > 500) {
    warnings.push('Classic mode prompt is longer than recommended (>500 chars)')
  }
  if (mode === 'pro' && prompt.length < 200) {
    warnings.push('Pro mode prompt is shorter than recommended (<200 chars)')
  }
  
  // Forbidden terms check
  const forbiddenTerms = [
    'professional woman working',
    'entrepreneur at desk',
    'office setting',
    'laptop prominently',
    'corporate',
    'business meeting',
    'linkedin',
    'stock photo'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  forbiddenTerms.forEach(term => {
    if (lowerPrompt.includes(term)) {
      errors.push(`Contains forbidden business language: "${term}"`)
    }
  })
  
  // Check for color palette mention
  if (!lowerPrompt.includes('color') && !lowerPrompt.includes('palette') && !lowerPrompt.includes('tone')) {
    warnings.push('Prompt should mention color palette for visual cohesion')
  }
  
  // Check for lighting description
  if (!lowerPrompt.includes('light')) {
    errors.push('Prompt must include lighting description')
  }
  
  // Check for aesthetic mood
  const aestheticMoods = ['editorial', 'luxury', 'sophisticated', 'minimal', 'romantic', 'serene', 'cozy', 'elegant']
  const hasMood = aestheticMoods.some(mood => lowerPrompt.includes(mood))
  if (!hasMood) {
    warnings.push('Consider adding aesthetic mood descriptor for better quality')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color palette by user preference or brand profile
 */
export function getColorPaletteByPreference(
  userPreference?: string,
  brandVibe?: string
): ColorPalette {
  // Direct match
  if (userPreference) {
    const normalizedPref = userPreference.toUpperCase().replace(/ /g, '_').replace(/&/g, '')
    if (MAYA_SIGNATURE_PALETTES[normalizedPref]) {
      return MAYA_SIGNATURE_PALETTES[normalizedPref]
    }
  }
  
  // Infer from brand vibe keywords
  const vibeMatches: Record<string, string> = {
    'dark': 'DARK_MOODY',
    'moody': 'DARK_MOODY',
    'monochrome': 'DARK_MOODY',
    'black': 'DARK_MOODY',
    'edgy': 'DARK_MOODY',
    
    'minimal': 'CLEAN_MINIMAL',
    'clean': 'CLEAN_MINIMAL',
    'white': 'CLEAN_MINIMAL',
    'pure': 'CLEAN_MINIMAL',
    'ethereal': 'CLEAN_MINIMAL',
    
    'scandinavian': 'SCANDINAVIAN_MUTED',
    'scandi': 'SCANDINAVIAN_MUTED',
    'nordic': 'SCANDINAVIAN_MUTED',
    'hygge': 'SCANDINAVIAN_MUTED',
    'greige': 'SCANDINAVIAN_MUTED',
    'gray': 'SCANDINAVIAN_MUTED',
    
    'beige': 'BEIGE_SIMPLE',
    'neutral': 'BEIGE_SIMPLE',
    'warm': 'BEIGE_SIMPLE',
    'coffee': 'BEIGE_SIMPLE',
    'cozy': 'BEIGE_SIMPLE',
    'latte': 'BEIGE_SIMPLE',
    
    'pastel': 'PASTELS_SCANDIC',
    'soft': 'PASTELS_SCANDIC',
    'pink': 'PASTELS_SCANDIC',
    'romantic': 'PASTELS_SCANDIC',
    'feminine': 'PASTELS_SCANDIC',
    'dusty': 'PASTELS_SCANDIC'
  }
  
  if (brandVibe) {
    const lowerVibe = brandVibe.toLowerCase()
    for (const [keyword, paletteKey] of Object.entries(vibeMatches)) {
      if (lowerVibe.includes(keyword)) {
        return MAYA_SIGNATURE_PALETTES[paletteKey]
      }
    }
  }
  
  // Default to Beige & Simple (most versatile)
  return MAYA_SIGNATURE_PALETTES.BEIGE_SIMPLE
}

/**
 * Ensure prompts create cohesion across 9-post grid
 */
export function ensureFeedCohesion(prompts: string[], colorPalette: ColorPalette): {
  cohesive: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Check that all prompts mention the chosen color palette
  const paletteColors = colorPalette.colors.join('|').toLowerCase()
  
  prompts.forEach((prompt, index) => {
    const lowerPrompt = prompt.toLowerCase()
    
    // Check for color palette reference
    const hasColorRef = colorPalette.colors.some(color => 
      lowerPrompt.includes(color.toLowerCase())
    )
    if (!hasColorRef) {
      issues.push(`Post ${index + 1} doesn't reference chosen color palette`)
    }
    
    // Check for aesthetic mood consistency
    if (!lowerPrompt.includes(colorPalette.mood.split(',')[0].toLowerCase())) {
      issues.push(`Post ${index + 1} missing aesthetic mood (${colorPalette.mood.split(',')[0]})`)
    }
  })
  
  // Check lighting consistency
  const lightingKeywords = colorPalette.lighting.split(',')[0].toLowerCase().split(' ').slice(0, 3).join(' ')
  prompts.forEach((prompt, index) => {
    if (!prompt.toLowerCase().includes('light')) {
      issues.push(`Post ${index + 1} missing lighting description`)
    }
  })
  
  return {
    cohesive: issues.length === 0,
    issues
  }
}

/**
 * Get recommended post type distribution for aesthetic
 */
export function getPostTypeDistribution(colorPalette: ColorPalette): {
  userPosts: number
  lifestylePosts: number
  ratio: string
} {
  // Clean & Minimal has more lifestyle posts (40%)
  if (colorPalette.id === 'clean_minimal') {
    return {
      userPosts: 6,
      lifestylePosts: 3,
      ratio: '60/40'
    }
  }
  
  // All others: 80/20 rule
  return {
    userPosts: 7,
    lifestylePosts: 2,
    ratio: '80/20'
  }
}

