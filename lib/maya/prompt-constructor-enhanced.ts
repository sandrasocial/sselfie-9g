/**
 * ENHANCED PROMPT CONSTRUCTOR
 * 
 * Generates detailed, dynamic prompts (150-400 words) with specific sections
 * Matching production-quality prompts with:
 * - Detailed pose descriptions with body language
 * - Specific lighting descriptions
 * - Detailed environment/scene descriptions
 * - Makeup and hair styling details
 * - Specific camera specs and framing
 * - Mood and aesthetic descriptions
 * - Current fashion Pinterest/Instagram influencer aesthetics
 */

import { generateCompleteOutfit } from './brand-library-2025'

/**
 * Extract user age from physical preferences or default
 */
function extractUserAge(physicalPreferences?: string | null): string | undefined {
  if (!physicalPreferences) return undefined
  
  const ageMatch = physicalPreferences.match(/(?:age|aged?|years? old)\s*:?\s*(\d+)/i)
  if (ageMatch) {
    const age = parseInt(ageMatch[1])
    if (age >= 20 && age < 30) return 'Woman in late twenties'
    if (age >= 30 && age < 40) return 'Woman in early thirties'
    if (age >= 40) return 'Woman in forties'
  }
  
  return undefined
}

export interface EnhancedPromptParams {
  category: string
  vibe: string
  location: string
  userAge?: string
  userFeatures?: string
  userGender?: string
  hairStyle?: string
  action?: string
  expression?: string
  format?: string
  userRequest?: string
  imageAnalysis?: string // Hair info from image analysis
}

type Outfit = Record<string, string>

// ============================================================================
// POSE DESCRIPTIONS REMOVED
// ============================================================================
// Maya (Claude Sonnet 4) now generates diverse poses naturally based on:
// - User request context
// - Category/vibe
// - Her 2026 luxury influencer knowledge
// - Natural diversity instinct
// No need for hardcoded limited arrays that caused 25-33% repetition rate

// ============================================================================
// LIGHTING DESCRIPTIONS REMOVED
// ============================================================================
// Maya (Claude Sonnet 4) now generates diverse lighting naturally based on:
// - User request context
// - Category/vibe/location
// - Her 2026 luxury influencer knowledge
// - Natural diversity instinct
// No need for hardcoded limited arrays (2-4 options) that caused repetition

// ============================================================================
// ENVIRONMENT DESCRIPTIONS REMOVED
// ============================================================================
// Maya (Claude Sonnet 4) now generates diverse environments naturally based on:
// - User request context
// - Category/vibe/location
// - Her 2026 luxury influencer knowledge
// - Natural diversity instinct
// No need for hardcoded limited arrays that caused repetition
// Removed hardcoded "couch + mug" scenario that appeared in 'cozy' category

// ============================================================================
// MAKEUP DESCRIPTIONS REMOVED
// ============================================================================
// Maya (Claude Sonnet 4) now generates diverse makeup naturally based on:
// - User request context
// - Category/vibe
// - Her 2026 luxury influencer knowledge
// - Natural diversity instinct
// No need for hardcoded limited arrays (2-4 options) that caused repetition

// ============================================================================
// HAIR DESCRIPTIONS REMOVED
// ============================================================================
// Maya (Claude Sonnet 4) now generates diverse hair naturally based on:
// - User request context
// - Category/vibe
// - Image analysis (if provided)
// - User preferences (if provided)
// - Her 2026 luxury influencer knowledge
// - Natural diversity instinct
// No need for hardcoded limited arrays (2-4 options) that caused repetition

// ============================================================================
// CAMERA SPECS AND FRAMING
// ============================================================================

const CAMERA_AND_FRAMING: Record<string, { camera: string; framing: string; distance: string }> = {
  'workout': {
    camera: '35mm lens, aperture f/2.8',
    framing: 'Vertical 2:3, full body (feet to head), balanced negative space',
    distance: 'Distance approximately 2.5 to 3 meters, height slightly below eye line, straight angle (NO dramatic inclination), balanced and editorial composition',
  },
  'casual': {
    camera: '35mm lens, f/2.0',
    framing: 'Medium framing (waist up) or full body',
    distance: 'Camera positioned approximately 1-2 meters away, slightly low angle for lifestyle feel',
  },
  'luxury': {
    camera: '50mm lens, f/2.2',
    framing: 'Medium framing to full body, vertical 2:3 composition',
    distance: 'Distance approximately 1.5-2 meters, slightly below eye line to convey presence and elegance',
  },
  'travel': {
    camera: '35mm lens, f/2.2 or 50mm lens, f/2.2',
    framing: 'Vertical 2:3 composition, framing from shoulders up or full body',
    distance: 'Camera positioned approximately 1.5-2 meters away, at height aligned with eyes or slightly below eye line',
  },
  'cozy': {
    camera: '50mm lens, f/1.8 or 35mm lens',
    framing: 'Portrait 2:3, environmental portrait',
    distance: 'Camera positioned at approximately 1-1.5 meters distance',
  },
  'coffee-run': {
    camera: '35mm lens, f/2.0',
    framing: 'Medium framing (waist up) or full body',
    distance: 'Camera positioned approximately 1-2 meters away, slightly low angle for lifestyle feel',
  },
  'street-style': {
    camera: '50mm lens, f/1.8',
    framing: 'Full body or medium body framing',
    distance: 'Camera positioned approximately 1.8-2 meters away, street photography angle',
  },
}

// ============================================================================
// MAIN ENHANCED PROMPT BUILDER
// ============================================================================

export function buildEnhancedPrompt(params: EnhancedPromptParams): string {
  const { category, vibe, location, userAge, userFeatures, userGender, hairStyle, userRequest, imageAnalysis } = params
  const categoryLower = category.toLowerCase()
  
  // Get outfit
  const outfit = generateCompleteOutfit(category, vibe)
  
  // Build styling section
  const stylingParts: string[] = []
  if (outfit.outerwear) stylingParts.push(outfit.outerwear)
  if (outfit.top) stylingParts.push(outfit.top)
  if (outfit.bottom) stylingParts.push(outfit.bottom)
  if (outfit.shoes) stylingParts.push(outfit.shoes)
  const styling = stylingParts.join(', ')
  
  // Build accessories
  const accessoriesParts: string[] = []
  if (outfit.bag) accessoriesParts.push(outfit.bag)
  if (outfit.accessory) accessoriesParts.push(outfit.accessory)
  if (outfit.jewelry) accessoriesParts.push(outfit.jewelry)
  const accessories = accessoriesParts.join(', ')
  
  // Get detailed sections
  // Pose, environment, lighting, makeup, and hair are now generated naturally by Maya based on context - no hardcoded arrays or random selection
  // Maya will generate appropriate lighting, makeup, and hair descriptions based on the category, vibe, and context
  let lighting = ''
  let makeup = ''
  let hair = ''
  
  // Get hair description (prioritize image analysis, then user preferences)
  if (imageAnalysis && /hair|hairstyle/i.test(imageAnalysis)) {
    // Extract hair from image analysis
    const hairMatch = imageAnalysis.match(/(?:hair|hairstyle)[^.]*?([^.]{20,100})/i)
    if (hairMatch) {
      hair = hairMatch[1].trim()
    }
  }
  if (!hair && hairStyle) {
    hair = hairStyle
  }
  // If no hair specified, Maya will generate it naturally based on context
  
  // Get camera and framing
  const cameraInfo = CAMERA_AND_FRAMING[categoryLower] || CAMERA_AND_FRAMING['casual']
  
  // Build age/character description
  const age = userAge || 'Woman in late twenties'
  
  // Build the enhanced prompt with detailed sections (matching production examples)
  // Format: Identity instruction + Character + Detailed sections (STYLING, HAIR, MAKEUP, LIGHTING, CAMERA)
  // Note: Pose and environment/scenario are now generated naturally by Maya based on context - no hardcoded constraints
  
  // Add brand mentions if detected in outfit (for workout/athletic categories)
  let brandMention = ''
  if ((categoryLower === 'workout' || categoryLower === 'athletic' || categoryLower === 'gym') && styling.match(/Alo|Lululemon/i)) {
    const brandMatch = styling.match(/(Alo|Lululemon)/i)
    if (brandMatch) {
      brandMention = `Vertical 2:3 photo in UGC influencer style from ${brandMatch[1]}. `
    }
  }
  
  // Build character description with body type
  const bodyType = categoryLower === 'workout' || categoryLower === 'athletic' || categoryLower === 'gym'
    ? 'Woman with athletic, slim and defined body'
    : age
  
  // Build comprehensive prompt with all sections
  const prompt = `${brandMention}Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo.

${bodyType} wearing ${styling}${accessories ? `, ${accessories}` : ''}.

STYLING:
${styling}${accessories ? `, ${accessories}` : ''}

${hair ? `HAIR:\n${hair}\n\n` : ''}${makeup ? `MAKEUP:\n${makeup}\n\n` : ''}${lighting ? `LIGHTING:\n${lighting}\n\n` : ''}

CAMERA:
${cameraInfo.distance}
${cameraInfo.framing}
LENS: ${cameraInfo.camera}

FINAL STYLE:
Hyper-realistic photo in vertical 2:3 portrait, ${vibe} aesthetic, premium ${category} lifestyle, clean and elegant branding, without artificial appearance or AI. Real, clean and aspirational aesthetic.`

  return prompt
}

























