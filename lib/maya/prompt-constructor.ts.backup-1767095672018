/**
 * PROMPT CONSTRUCTOR
 * 
 * Builds prompts EXACTLY like our actual prompt library.
 * Based on 100+ real prompts used in production.
 * 
 * Output: 250-500 words with specific brand names, detailed descriptions,
 * camera specs, lighting, location details, aesthetic reference,
 * "Hyper-realistic" + "4K resolution"
 */

import { generateCompleteOutfit, getDetailedDescription } from './brand-library-2025'

// ============================================================================
// TYPES
// ============================================================================

export interface PromptConstructorParams {
  category: string | null // 🔴 FIX: Allow null for dynamic generation
  vibe: string | null
  location: string | null
  userAge?: string
  userFeatures?: string
  userGender?: string
  hairStyle?: string
  action?: string
  expression?: string
  format?: string
  userRequest?: string // For preserving context (e.g., Christmas)
}

// Outfit is returned as Record<string, string> from brand library
type Outfit = Record<string, string>

// ============================================================================
// CAMERA SPECS BY CATEGORY
// ============================================================================

const CAMERA_SPECS: Record<string, string> = {
  'workout': 'Canon EOS R6 Mark II 24-70mm f/2.8 lens',
  'athletic': 'Canon EOS R6 Mark II 24-70mm f/2.8 lens',
  'gym': 'Canon EOS R6 Mark II 24-70mm f/2.8 lens',
  'casual': 'Fujifilm X-T5 35mm f/2 lens',
  'coffee-run': 'Fujifilm X-T5 35mm f/2 lens',
  'street-style': 'Canon EOS R5 50mm f/1.8 lens',
  'luxury': 'Hasselblad X2D 100C 55mm f/2.5 lens',
  'travel': 'Sony A7R V 35mm f/1.4 lens',
  'airport': 'Sony A7R V 35mm f/1.4 lens',
  'cozy': 'Fujifilm X-T5 35mm f/2 lens',
  'home': 'Fujifilm X-T5 35mm f/2 lens',
  'selfie': 'iPhone 15 Pro front camera, arm\'s length',
}

// ============================================================================
// AESTHETIC REFERENCES
// ============================================================================

const AESTHETIC_REFERENCES: Record<string, string> = {
  'workout': 'athletic lifestyle editorial aesthetic',
  'athletic': 'athletic lifestyle editorial aesthetic',
  'gym': 'athletic lifestyle editorial aesthetic',
  'casual': 'casual lifestyle street photography aesthetic',
  'coffee-run': 'casual lifestyle street photography aesthetic',
  'street-style': 'contemporary street style editorial',
  'luxury': 'quiet luxury aesthetic reminiscent of The Row campaigns',
  'travel': 'luxury travel lifestyle aesthetic',
  'airport': 'luxury travel lifestyle aesthetic',
  'cozy': 'cozy luxury lifestyle aesthetic',
  'home': 'cozy luxury lifestyle aesthetic',
}

// ============================================================================
// LIGHTING OPTIONS BY CATEGORY
// ============================================================================

const LIGHTING_OPTIONS: Record<string, string[]> = {
  'workout': [
    'bright morning sunlight at 8am creating energetic mood',
    'natural daylight, clean athletic aesthetic',
    'soft diffused gym lighting with natural window light',
  ],
  'athletic': [
    'bright morning sunlight at 8am creating energetic mood',
    'natural daylight, clean athletic aesthetic',
    'soft diffused gym lighting with natural window light',
  ],
  'gym': [
    'bright morning sunlight at 8am creating energetic mood',
    'natural daylight, clean athletic aesthetic',
    'soft diffused gym lighting with natural window light',
  ],
  'casual': [
    'soft afternoon sunlight',
    'golden hour lighting at 5pm',
    'natural daylight with warm glow',
  ],
  'coffee-run': [
    'soft afternoon sunlight',
    'golden hour lighting at 5pm',
    'natural daylight with warm glow',
  ],
  'street-style': [
    'soft afternoon sunlight',
    'golden hour lighting at 5pm',
    'natural daylight with warm glow',
  ],
  'luxury': [
    'dramatic spotlight lighting creating soft shadows',
    'warm cinematic lighting with golden tones',
    'natural golden hour light creating silky halo',
  ],
  'travel': [
    'natural airport terminal lighting with floor-to-ceiling windows',
    'soft diffused daylight through glass',
    'bright ambient lighting with natural shadows',
  ],
  'airport': [
    'natural airport terminal lighting with floor-to-ceiling windows',
    'soft diffused daylight through glass',
    'bright ambient lighting with natural shadows',
  ],
  'cozy': [
    'soft natural window light filtering through',
    'warm ambient lighting with cozy glow',
    'gentle afternoon light creating intimate atmosphere',
  ],
  'home': [
    'soft natural window light filtering through',
    'warm ambient lighting with cozy glow',
    'gentle afternoon light creating intimate atmosphere',
  ],
}

// ============================================================================
// ENVIRONMENT DESCRIPTIONS
// ============================================================================

const ENVIRONMENT_DESCRIPTIONS: Record<string, string> = {
  'gym': 'modern glass-front gym with cityscape background, clean equipment visible',
  'coffee-shop': 'cobblestone sidewalk in Brooklyn, outdoor cafe with wicker chairs',
  'airport': 'modern airport terminal with floor-to-ceiling windows, blurred travelers',
  'home': 'minimalist living room with cream sofa, white walls, soft decor',
  'street': 'urban street with architectural details, natural city backdrop',
  'outdoor': 'natural outdoor setting with environmental context',
}

// ============================================================================
// POSE DESCRIPTIONS BY CATEGORY
// ============================================================================

const POSE_OPTIONS: Record<string, string[]> = {
  'workout': [
    'standing confidently with hands on hips, determined expression',
    'mid-movement pose, dynamic energy, focused expression',
    'leaning against gym equipment, relaxed but strong posture',
  ],
  'athletic': [
    'standing confidently with hands on hips, determined expression',
    'mid-movement pose, dynamic energy, focused expression',
    'leaning against gym equipment, relaxed but strong posture',
  ],
  'casual': [
    'walking naturally with coffee in hand, relaxed expression',
    'standing with weight on one leg, casual stance, natural smile',
    'sitting comfortably, legs crossed, looking away naturally',
  ],
  'street-style': [
    'walking confidently down street, urban attitude, neutral expression',
    'standing with hand in pocket, street style pose, cool expression',
    'leaning against wall, casual street pose, relaxed expression',
  ],
  'luxury': [
    'elegant standing pose, sophisticated posture, refined expression',
    'seated gracefully, poised position, serene expression',
    'walking with purpose, elegant movement, confident expression',
  ],
  'travel': [
    'walking through terminal with luggage, travel-ready pose, excited expression',
    'standing at airport window, contemplative pose, serene expression',
    'sitting at gate, relaxed travel pose, calm expression',
  ],
  'cozy': [
    'sitting comfortably on sofa, relaxed pose, peaceful expression',
    'curled up with blanket, cozy pose, content expression',
    'standing by window, gentle pose, serene expression',
  ],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getCameraSpec(category: string | null): string {
  if (!category) return CAMERA_SPECS['casual'] // Fallback if null
  return CAMERA_SPECS[category.toLowerCase()] || CAMERA_SPECS['casual']
}

function getAestheticReference(category: string | null): string {
  if (!category) return AESTHETIC_REFERENCES['casual'] // Fallback if null
  return AESTHETIC_REFERENCES[category.toLowerCase()] || AESTHETIC_REFERENCES['casual']
}

// ============================================================================
// COMPONENT BUILDERS
// ============================================================================

/**
 * Build header section (for workout and luxury prompts)
 */
function buildHeader(params: PromptConstructorParams): string {
  const format = params.format || 'portrait 2:3'
  const hairStyle = params.hairStyle || 'natural styling'
  
  // 🔴 CRITICAL: For Studio Pro Mode (NanoBanana), use the mandatory identity preservation instruction
  // This replaces trigger words which are only for Classic Mode (Flux)
  // The prompt constructor is ONLY used in Studio Pro Mode, so always use NanoBanana instruction
  if (params.category === 'luxury') {
    return `Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo. Format: ${format}. Hair with ${hairStyle}. Hyper-realistic.`
  }
  
  return `Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo. Format: ${format}. Hair with ${hairStyle}. Without altering features. Hyper-realistic.`
}

/**
 * Build scene section
 */
function buildScene(params: PromptConstructorParams, outfit: Outfit): string {
  if (!params.category || !params.location) {
    // Fallback for null category - use generic scene
    return `woman in a stylish location. Camera at medium distance, ${getCameraSpec(null)}, full body shot.`
  }
  const category = params.category.toLowerCase()
  const action = params.action || getDefaultAction(category)
  const location = params.location
  const time = getTimeForCategory(category)
  
  if (category === 'luxury') {
    return `woman in ${location} during ${time}. Camera at medium distance, ${getCameraSpec(category)}, full body shot.`
  }
  
  return `woman ${action} in ${location}. Camera at medium distance, ${getCameraSpec(category)}, full body shot.`
}

function getDefaultAction(category: string | null): string {
  if (!category) return 'standing' // Fallback if null
  const actions: Record<string, string> = {
    'workout': 'exercising',
    'athletic': 'exercising',
    'gym': 'working out',
    'casual': 'walking',
    'coffee-run': 'walking with coffee',
    'street-style': 'walking',
    'luxury': 'standing',
    'travel': 'traveling',
    'airport': 'at airport',
    'cozy': 'relaxing',
    'home': 'at home',
  }
  return actions[category.toLowerCase()] || 'standing'
}

function getTimeForCategory(category: string | null): string {
  if (!category) return 'afternoon' // Fallback if null
  const times: Record<string, string> = {
    'workout': 'early morning',
    'athletic': 'early morning',
    'gym': 'morning',
    'casual': 'afternoon',
    'coffee-run': 'afternoon',
    'street-style': 'afternoon',
    'luxury': 'evening',
    'travel': 'daytime',
    'airport': 'daytime',
    'cozy': 'evening',
    'home': 'evening',
  }
  return times[category.toLowerCase()] || 'afternoon'
}

/**
 * Build styling section with branded pieces
 */
function buildStyling(outfit: Outfit): string {
  const parts: string[] = []
  
  // Outerwear first (if present)
  if (outfit.outerwear) {
    parts.push(outfit.outerwear)
  }
  
  // Top
  if (outfit.top) {
    parts.push(outfit.top)
  }
  
  // Bottom
  if (outfit.bottom) {
    parts.push(outfit.bottom)
  }
  
  // Shoes - ALWAYS detailed
  if (outfit.shoes) {
    parts.push(outfit.shoes)
  }
  
  return parts.join(',\n')
}

/**
 * Build accessories section
 */
function buildAccessories(outfit: Outfit): string {
  const accessories: string[] = []
  
  if (outfit.bag) {
    accessories.push(outfit.bag)
  }
  
  if (outfit.accessory) {
    accessories.push(outfit.accessory)
  }
  
  if (outfit.jewelry) {
    accessories.push(outfit.jewelry)
  }
  
  if (outfit.luggage) {
    accessories.push(outfit.luggage)
  }
  
  return accessories.join('\n')
}

/**
 * Build pose section
 */
function buildPose(params: PromptConstructorParams): string {
  if (!params.category) return 'natural pose, relaxed expression.' // Fallback if null
  const category = params.category.toLowerCase()
  const expression = params.expression || 'natural expression'
  
  if (params.action) {
    return `${params.action}, ${expression}.`
  }
  
  const poseOptions = POSE_OPTIONS[category] || POSE_OPTIONS['casual']
  const selectedPose = randomChoice(poseOptions)
  
  return `${selectedPose}.`
}

/**
 * Build lighting section
 */
function buildLighting(category: string): string {
  const categoryLower = category.toLowerCase()
  const options = LIGHTING_OPTIONS[categoryLower] || LIGHTING_OPTIONS['casual']
  return randomChoice(options)
}

/**
 * Build environment section with detailed descriptions
 */
function buildEnvironment(location: string, category: string): string {
  const locationLower = location.toLowerCase()
  const categoryLower = category.toLowerCase()
  
  // Check if we have a specific environment description
  if (ENVIRONMENT_DESCRIPTIONS[locationLower]) {
    return ENVIRONMENT_DESCRIPTIONS[locationLower]
  }
  
  // Category-based defaults with enhanced details
  if (categoryLower === 'gym') {
    return ENVIRONMENT_DESCRIPTIONS['gym']
  }
  if (categoryLower === 'coffee-run' || locationLower.includes('coffee') || locationLower.includes('cafe')) {
    return ENVIRONMENT_DESCRIPTIONS['coffee-shop']
  }
  if (categoryLower === 'airport' || categoryLower === 'travel') {
    return ENVIRONMENT_DESCRIPTIONS['airport']
  }
  if (categoryLower === 'cozy' || categoryLower === 'home') {
    return ENVIRONMENT_DESCRIPTIONS['home']
  }
  if (categoryLower === 'luxury') {
    return `${location} with elegant architectural details, sophisticated ambiance, refined interior design elements`
  }
  if (categoryLower === 'street-style') {
    return `${location} with urban architectural details, natural city backdrop, contemporary street elements`
  }
  
  // Default: use location as-is with enhanced detail
  return `${location} with natural environmental details, authentic setting, realistic background elements`
}

/**
 * Build mood section with aesthetic keywords
 */
function buildMood(vibe: string): string {
  const aesthetic = getAestheticReference(vibe)
  const vibeLower = vibe.toLowerCase()
  
  // Add specific mood keywords based on vibe
  const moodKeywords: Record<string, string[]> = {
    'athletic': ['energetic', 'dynamic', 'motivated', 'strong'],
    'casual': ['relaxed', 'effortless', 'natural', 'authentic'],
    'luxury': ['sophisticated', 'elegant', 'refined', 'polished'],
    'cozy': ['comfortable', 'intimate', 'warm', 'peaceful'],
    'street-style': ['urban', 'edgy', 'contemporary', 'cool'],
    'travel': ['adventurous', 'exploratory', 'curious', 'free-spirited'],
  }
  
  const keywords = moodKeywords[vibeLower] || ['natural', 'authentic']
  const selectedKeywords = keywords.slice(0, 2).join(', ')
  
  return `${aesthetic}, ${vibe} mood, ${selectedKeywords} atmosphere`
}

// ============================================================================
// MAIN PROMPT BUILDER
// ============================================================================

/**
 * Build a complete prompt matching production patterns
 */
export function buildPrompt(params: PromptConstructorParams & { userRequest?: string }): string {
  // 🔴 FIX: If category is null, return empty string to signal caller should use dynamic generation
  if (!params.category || !params.vibe || !params.location) {
    console.log('[v0] [PROMPT-CONSTRUCTOR] Category/vibe/location is null - caller should use dynamic generation')
    return '' // Return empty to signal dynamic generation needed
  }
  const { category, vibe, location, userAge, userFeatures, userRequest } = params
  const categoryLower = category.toLowerCase()
  
  // Check for Christmas context from userRequest (preserve Christmas context even if category is 'cozy')
  const hasChristmasContext = userRequest ? /christmas|holiday|festive|winter party|nye|new year|tree|gifts|presents|christmas tree|christmas morning|christmas market/i.test(userRequest.toLowerCase()) : false
  
  // 1. Get brand selections
  const outfit = generateCompleteOutfit(category, vibe)
  
  // 2. Build sections
  const styling = buildStyling(outfit)
  const accessories = buildAccessories(outfit)
  const pose = buildPose(params)
  const lighting = buildLighting(category)
  const environment = buildEnvironment(location, category)
  const mood = buildMood(vibe)
  const cameraSpec = getCameraSpec(category)
  const aestheticRef = getAestheticReference(category)
  
  // 3. Assemble based on category
  if (categoryLower === 'workout' || categoryLower === 'athletic' || categoryLower === 'gym') {
    const header = buildHeader(params)
    const scene = buildScene(params, outfit)
    const accessoriesText = accessories ? `Accessories: ${accessories}\n\n` : ''
    
    // Expand styling with detailed fabric, texture, and fit descriptions
    const expandedStyling = expandStylingDescription(styling, category)
    
    // Expand environment with more atmospheric details
    const expandedEnvironment = expandEnvironmentDescription(environment, category, location)
    
    // Expand lighting with more nuanced descriptions
    const expandedLighting = expandLightingDescription(lighting, category)
    
    // Add detailed pose and body language
    const expandedPose = expandPoseDescription(pose, category, params.action)
    
    // Add mood and aesthetic details
    const expandedMood = expandMoodDescription(mood, vibe, aestheticRef)
    
    return `${header}

Scene: ${scene}

Outfit: ${expandedStyling}

${accessoriesText}Pose: ${expandedPose}

Lighting: ${expandedLighting}, creating natural shadows and authentic athletic atmosphere.

Environment: ${expandedEnvironment}, with authentic gym or athletic space details that feel real and lived-in.

Mood: ${expandedMood}

Shot with ${cameraSpec}, ${aestheticRef}, 4K resolution, hyper-realistic quality. Every detail from the performance fabrics to the environmental elements is rendered with photographic precision, creating an image that captures the authentic energy and atmosphere of an active lifestyle moment.`
  }
  
  if (categoryLower === 'casual' || categoryLower === 'coffee-run' || categoryLower === 'street-style') {
    // 🔴 CRITICAL: Studio Pro Mode (NanoBanana) requires identity preservation instruction at start
    const identityInstruction = 'Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo.'
    const age = userAge || 'Woman in late twenties'
    const action = params.action || getDefaultAction(category)
    const accessoriesText = accessories ? `${accessories},\n` : ''
    
    // Expand styling with detailed fabric, texture, and fit descriptions
    const expandedStyling = expandStylingDescription(styling, category)
    
    // Expand environment with more atmospheric details
    const expandedEnvironment = expandEnvironmentDescription(environment, category, location)
    
    // Expand lighting with more nuanced descriptions
    const expandedLighting = expandLightingDescription(lighting, category)
    
    // Add detailed pose and body language
    const expandedPose = expandPoseDescription(pose, category, action)
    
    // Add mood and aesthetic details
    const expandedMood = expandMoodDescription(mood, vibe, aestheticRef)
    
    return `${identityInstruction} ${age} wearing ${expandedStyling}.

${accessoriesText}${expandedPose} in ${expandedEnvironment}, where ${expandedLighting} creates a natural, authentic atmosphere. The scene captures ${expandedMood}, with every detail rendered in hyper-realistic quality.

Shot with ${cameraSpec}, the image maintains ${aestheticRef}, with 4K resolution ensuring every texture, fabric detail, and environmental element is rendered with photographic precision. The composition balances natural movement with intentional framing, creating an image that feels both spontaneous and carefully considered.`
  }
  
  if (categoryLower === 'luxury') {
    const header = buildHeader(params)
    const scene = buildScene(params, outfit)
    const accessoriesText = accessories ? `Accessories:\n${accessories}\n\n` : ''
    
    // Expand styling with detailed fabric, texture, and fit descriptions
    const expandedStyling = expandStylingDescription(styling, category)
    
    // Expand environment with more atmospheric details
    const expandedEnvironment = expandEnvironmentDescription(environment, category, location)
    
    // Expand lighting with more nuanced descriptions
    const expandedLighting = expandLightingDescription(lighting, category)
    
    // Add detailed pose and body language
    const expandedPose = expandPoseDescription(pose, category, params.action)
    
    // Add mood and aesthetic details
    const expandedMood = expandMoodDescription(mood, vibe, aestheticRef)
    
    return `${header}

Scene: ${scene}

Look: ${expandedStyling}

${accessoriesText}Pose: ${expandedPose}

Lighting: ${expandedLighting}, creating refined illumination that enhances the sophisticated atmosphere and highlights the quality of materials and textures.

Environment: ${expandedEnvironment}, where every architectural detail, surface texture, and ambient element contributes to an atmosphere of quiet luxury and refined elegance.

Mood: ${expandedMood}

Shot with ${cameraSpec}, ${aestheticRef}, 4K resolution, hyper-realistic quality. The composition balances natural elegance with intentional framing, ensuring every detail from the luxurious fabrics to the sophisticated environment is rendered with photographic precision and authentic character.`
  }
  
  // Default format (similar to casual) - includes travel, cozy, Christmas, etc.
  // 🔴 CRITICAL: Studio Pro Mode (NanoBanana) requires identity preservation instruction at start
  const identityInstruction = 'Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo.'
  const age = userAge || 'Woman in late twenties'
  const action = params.action || getDefaultAction(category)
  const accessoriesText = accessories ? `${accessories},\n` : ''
  
  // Check if this is a Christmas request (preserve Christmas context from userRequest)
  const isChristmas = hasChristmasContext || /christmas|holiday|festive|winter party|nye|new year|tree|gifts|presents|christmas tree|christmas morning|christmas market/i.test(
    `${params.category || ''} ${params.vibe || ''} ${location || ''}`.toLowerCase()
  )
  
  // Expand styling with detailed fabric, texture, and fit descriptions
  const expandedStyling = expandStylingDescription(styling, category)
  
  // Expand environment with more atmospheric details (include Christmas elements if applicable)
  const expandedEnvironment = isChristmas 
    ? expandEnvironmentDescription(environment, category, location) + ', with festive holiday atmosphere, Christmas decorations, and seasonal warmth'
    : expandEnvironmentDescription(environment, category, location)
  
  // Expand lighting with more nuanced descriptions (warm for Christmas)
  const expandedLighting = isChristmas
    ? expandLightingDescription(lighting, category) + ', with warm holiday glow and festive ambiance'
    : expandLightingDescription(lighting, category)
  
  // Add detailed pose and body language
  const expandedPose = expandPoseDescription(pose, category, action)
  
  // Add mood and aesthetic details (festive for Christmas)
  const expandedMood = isChristmas
    ? expandMoodDescription(mood, vibe, aestheticRef) + ' The festive holiday atmosphere adds warmth and seasonal charm to the scene.'
    : expandMoodDescription(mood, vibe, aestheticRef)
  
  return `${identityInstruction} ${age} wearing ${expandedStyling}.

${accessoriesText}${expandedPose} in ${expandedEnvironment}, where ${expandedLighting} creates a natural, authentic atmosphere. The scene captures ${expandedMood}, with every detail rendered in hyper-realistic quality.

Shot with ${cameraSpec}, the image maintains ${aestheticRef}, with 4K resolution ensuring every texture, fabric detail, and environmental element is rendered with photographic precision. The composition balances natural movement with intentional framing, creating an image that feels both spontaneous and carefully considered.`
}

/**
 * Expand styling description with detailed fabric, texture, and fit information
 */
function expandStylingDescription(styling: string, category: string): string {
  // Split styling into individual pieces
  const pieces = styling.split(',').map(p => p.trim()).filter(p => p.length > 0)
  
  const expandedPieces = pieces.map(piece => {
    // Add fabric/texture details based on keywords
    let expanded = piece
    
    // Add fabric details for common materials
    if (piece.toLowerCase().includes('sweater') || piece.toLowerCase().includes('knit')) {
      expanded = `${piece} with soft, tactile texture and natural drape`
    } else if (piece.toLowerCase().includes('leather')) {
      expanded = `${piece} with supple texture and subtle sheen`
    } else if (piece.toLowerCase().includes('jeans') || piece.toLowerCase().includes('denim')) {
      expanded = `${piece} with authentic denim texture and natural fading`
    } else if (piece.toLowerCase().includes('cotton') || piece.toLowerCase().includes('tank')) {
      expanded = `${piece} with soft cotton texture and relaxed fit`
    } else if (piece.toLowerCase().includes('leggings') || piece.toLowerCase().includes('yoga')) {
      expanded = `${piece} with sculpting fit and performance fabric`
    } else if (piece.toLowerCase().includes('sneakers') || piece.toLowerCase().includes('shoes')) {
      expanded = `${piece} with authentic materials and realistic wear`
    } else {
      expanded = `${piece} with natural texture and authentic details`
    }
    
    return expanded
  })
  
  return expandedPieces.join(', ')
}

/**
 * Expand environment description with atmospheric details
 */
function expandEnvironmentDescription(environment: string, category: string, location: string): string {
  const categoryLower = category.toLowerCase()
  const locationLower = location.toLowerCase()
  
  let expanded = environment
  
  // Add category-specific atmospheric details
  if (categoryLower === 'cozy' || categoryLower === 'home') {
    expanded = `${environment}, with soft ambient lighting, comfortable textures, and intimate atmosphere that feels lived-in and authentic`
  } else if (categoryLower === 'coffee-run' || locationLower.includes('coffee') || locationLower.includes('cafe')) {
    expanded = `${environment}, with warm lighting, natural textures, and the authentic atmosphere of a real coffee shop`
  } else if (categoryLower === 'street-style' || locationLower.includes('street') || locationLower.includes('urban')) {
    expanded = `${environment}, with urban textures, natural city lighting, and authentic street atmosphere`
  } else if (categoryLower === 'luxury') {
    expanded = `${environment}, with refined architectural details, sophisticated ambiance, and elegant atmosphere`
  } else if (categoryLower === 'travel' || categoryLower === 'airport') {
    expanded = `${environment}, with travel atmosphere, natural lighting, and authentic airport environment`
  } else {
    expanded = `${environment}, with natural textures, authentic details, and realistic atmosphere`
  }
  
  return expanded
}

/**
 * Expand lighting description with more nuanced details
 */
function expandLightingDescription(lighting: string, category: string): string {
  const categoryLower = category.toLowerCase()
  
  let expanded = lighting
  
  // Add category-specific lighting nuances
  if (categoryLower === 'cozy' || categoryLower === 'home') {
    expanded = `${lighting}, creating soft shadows and warm tones that enhance the intimate atmosphere`
  } else if (categoryLower === 'coffee-run') {
    expanded = `${lighting}, with natural window light mixing with ambient interior lighting, creating authentic cafe atmosphere`
  } else if (categoryLower === 'street-style') {
    expanded = `${lighting}, with natural urban lighting that creates authentic street photography feel`
  } else if (categoryLower === 'luxury') {
    expanded = `${lighting}, with refined illumination that enhances the sophisticated atmosphere`
  } else {
    expanded = `${lighting}, creating natural shadows and authentic photographic quality`
  }
  
  return expanded
}

/**
 * Expand pose description with body language details
 */
function expandPoseDescription(pose: string, category: string, action?: string): string {
  const categoryLower = category.toLowerCase()
  const basePose = action || pose
  
  let expanded = basePose
  
  // Add natural body language based on category
  if (categoryLower === 'cozy' || categoryLower === 'home') {
    expanded = `${basePose}, with relaxed body language, natural positioning, and comfortable, authentic posture`
  } else if (categoryLower === 'coffee-run') {
    expanded = `${basePose}, with casual body language, natural movement, and authentic everyday posture`
  } else if (categoryLower === 'street-style') {
    expanded = `${basePose}, with confident body language, natural stance, and authentic street style positioning`
  } else if (categoryLower === 'luxury') {
    expanded = `${basePose}, with elegant body language, refined posture, and sophisticated positioning`
  } else {
    expanded = `${basePose}, with natural body language and authentic positioning`
  }
  
  return expanded
}

/**
 * Expand mood description with aesthetic details
 */
function expandMoodDescription(mood: string, vibe: string, aestheticRef: string): string {
  return `${mood}, where every element from the styling to the environment works together to create a cohesive visual narrative. The ${aestheticRef} aesthetic is evident in the careful attention to detail, from fabric textures to environmental elements, all rendered with photographic realism and authentic character.`
}

/**
 * Build prompt with user features included
 */
export function buildPromptWithFeatures(
  params: PromptConstructorParams & { 
    triggerWord?: string
    physicalPreferences?: string
    userRequest?: string
  }
): string {
  const basePrompt = buildPrompt({ ...params, userRequest: params.userRequest })
  const { triggerWord, physicalPreferences, userFeatures } = params
  
  let enhancedPrompt = basePrompt
  
  // Add trigger word at the beginning if provided
  if (triggerWord) {
    enhancedPrompt = `${triggerWord}, ${enhancedPrompt}`
  }
  
  // Add physical preferences or user features if provided
  // Use physicalPreferences if available, otherwise fall back to userFeatures
  // This prevents duplication when both are set to the same value
  const featuresToAdd = physicalPreferences || userFeatures
  if (featuresToAdd) {
    // 🔴 CRITICAL: In Studio Pro Mode, physicalPreferences may include hair info from image analysis
    // Image analysis can see actual hair from uploaded selfies, so we should use it
    // Only filter out generic assumptions that don't come from image analysis or user preferences
    let cleanedFeatures = featuresToAdd
    
    // Check if this looks like it came from image analysis (has descriptive context)
    const isFromImageAnalysis = cleanedFeatures && (
      /(?:long|short|medium|length|color|brown|blonde|black|red|auburn|brunette).*hair/i.test(cleanedFeatures) ||
      /hair.*(?:long|short|medium|length|color|brown|blonde|black|red|auburn|brunette)/i.test(cleanedFeatures)
    )
    
    // Only remove generic hair assumptions if they're NOT from image analysis or user preferences
    // Image analysis and user preferences are valid sources - keep those
    if (cleanedFeatures && !isFromImageAnalysis && 
        /long dark brown hair|blonde hair|brown hair|black hair/i.test(cleanedFeatures) && 
        !cleanedFeatures.match(/keep my|my natural|user specified|user preference|image analysis|from the|visible in|shown in/i)) {
      // This looks like a generic assumption, not from image analysis or user preferences - remove it
      cleanedFeatures = cleanedFeatures.replace(/\s*(?:long\s+)?(?:dark\s+)?(?:brown|blonde|black)\s+hair\s*/gi, ' ').trim()
    }
    
    if (cleanedFeatures && cleanedFeatures.trim().length > 0) {
      // Only apply once to avoid duplication
      enhancedPrompt = enhancedPrompt.replace(
        /(Maintain|Woman|woman)/,
        `$1, ${cleanedFeatures}`
      )
    }
  }
  
  return enhancedPrompt
}

/**
 * Validate prompt length (should be 250-500 words)
 */
export function validatePromptLength(prompt: string): { valid: boolean; wordCount: number; message?: string } {
  const wordCount = prompt.split(/\s+/).length
  
  if (wordCount < 250) {
    return {
      valid: false,
      wordCount,
      message: `Prompt too short: ${wordCount} words (minimum 250 words)`,
    }
  }
  
  if (wordCount > 500) {
    return {
      valid: false,
      wordCount,
      message: `Prompt too long: ${wordCount} words (maximum 500 words)`,
    }
  }
  
  return {
    valid: true,
    wordCount,
  }
}










