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
// DETAILED POSE DESCRIPTIONS BY CATEGORY
// ============================================================================

const DETAILED_POSE_DESCRIPTIONS: Record<string, string[]> = {
  'workout': [
    `Body supported slightly raised on three points, ONE arm extended diagonally, one leg slightly raised. Extended legs in front diagonally, one leg lightly folded over the other. Hip supported on the mat (no suspension). Torso in erect pose, without exaggerating. Aligned shoulders. Expression neutral, editorial (not sensual, not smiling).`,
    `Standing or semi-kneeling on the reformer, extended arms pulling the resistance cables. Activated core, erect spine. Aligned shoulders. Focused and confident expression. Gaze directed slightly forward or off camera.`,
    `Executing the Vrksasana yoga posture (tree posture). One foot firmly planted on the ground, the other placed on the inner part of the opposite thigh. Raised arms above the head. Hands joined in prayer position. Erect spine, perfect alignment. Eyes gently closed. Serene, centered and confident expression. Sculptural and elegant presence, without rigidity.`,
    `Standing with confident and sculptural posture, body slightly inclined towards the sunset. Spine turned to the horizon. Eyes closed, serene and powerful expression. Relaxed arms along the body or slightly away. Editorial, contemplative attitude, not overly posed.`,
    `Kneeling on a yoga mat at an outdoor event, holding a reusable water bottle with the brand logo clearly visible in the center of the bottle. Elegant posture, erect spine, natural gesture holding the bottle.`,
    `Standing on a tennis court, holding a racket. A white towel is placed over her shoulder, with the brand logo clearly visible and well-defined. Confident posture, focused expression.`,
    `In a minimalist outdoor space surrounded by green, doing a light stretch with arms raised above the head. Serene and natural expression.`,
    `Sitting casually on a yoga mat, holding a cup of coffee after training. Relaxed posture, one crossed leg, body slightly inclined. Confident and natural expression, looking away from the camera.`,
  ],
  'casual': [
    `Walking slowly through a modern and minimalist space, adjusting sunglasses during the walk. Relaxed posture, one crossed leg, body slightly inclined. Confident and natural expression, looking away from the camera.`,
    `Seated casually on a yoga mat, holding a cup of coffee after training. Relaxed posture, one crossed leg, body slightly inclined. Confident and natural expression, looking away from the camera.`,
    `Standing with weight on back leg, mid-stride walking. Leaning naturally. Relaxed, confident energy. One hand in pocket (casual confidence).`,
    `Walking naturally with coffee in hand, relaxed expression. Standing with weight on one leg, casual stance, natural smile.`,
    `Sitting comfortably, legs crossed, looking away naturally. One hand resting on table, other hand holding coffee cup.`,
  ],
  'luxury': [
    `Standing with elegant posture, one hand resting discreetly inside the bag, while the body leans slightly in rotation, with gaze cast subtly over the shoulder in a contemplative manner. Expression is serene and assured, with relaxed lips and elegant posture.`,
    `Seated gracefully in brown bouclé armchair, legs are bare and elegantly crossed. One arm resting on table, leaning elbow on table, holding passport and boarding card. Sophisticated evening expression.`,
    `Walking confidently through modern airport lobby with glass skylights above. Captured mid-step. One hand pulling suitcase, other hand holding coffee. Subtle smirk, firm forward gaze — confident posture of someone already ready for next destination.`,
    `Standing with couture mini dress look, structured bow detail. Straight elegant posture, sophisticated expression.`,
    `Seated on the bed of a classic luxury Parisian hotel. One hand resting on mattress and other lightly on chest, displaying accessories (ring and watch). Elegant and timeless pose.`,
    `Standing in front of luxury boutique, looking toward the camera in a medium body framing. One hand rests discreetly inside the bag, while the body leans slightly in rotation, with gaze cast subtly over the shoulder in a contemplative manner.`,
  ],
  'travel': [
    `Seated in minimalist airport lounge, holding an iced latte with transparent lid while smiling softly at the camera. Legs elegantly crossed, one foot resting on her rigid light green suitcase. Looking directly at camera with soft and confident expression.`,
    `Standing in front of airport terminal window during golden hour, with sunlight reflecting softly behind her through the glass. One hand holds a boarding pass and a folded passport close to her face, catching the light as an accessory. Expression: calm, carefree, lips parted with confidence.`,
    `Walking confidently through modern airport lobby with glass skylights above. Captured mid-step. One hand pulling silver textured suitcase, other hand holding coffee. Subtle smirk, firm forward gaze.`,
    `Seated in airport waiting area, with morning light entering through the tall terminal windows. Casually holding a travel coffee cup in one hand, with her wrist adorned by a gold watch and delicate rings. One casually folded leg, looking directly at camera with soft and confident expression.`,
    `Standing confidently in front of airport terminal window during golden hour. One hand holds boarding pass and folded passport close to face, catching the light as an accessory. Calm, carefree expression, lips parted with confidence.`,
    `Seated beside airport terminal window, holding an iced latte in one hand, while slides finger on phone with other hand. Looking up at camera, hands gently framing face or touching skin, serene beauty expression.`,
  ],
  'cozy': [
    `Seated comfortably on sofa, relaxed pose, peaceful expression. Curled up with blanket, cozy pose, content expression. Legs tucked under, relaxed into chair, natural contemplative expression.`,
    `Standing by window, gentle pose, serene expression. Looking outside, profile to 3/4 angle, peaceful contemplative expression.`,
    `Kneeling near decorated Christmas tree, holding transparent ornament. Elegant posture, soft expression.`,
    `Seated on floor beside decorated Christmas tree with warm golden lights, morning light streaming through window. Legs crossed, leaning against couch, natural relaxed expression with soft smile.`,
  ],
  'coffee-run': [
    `Walking naturally with coffee in hand, relaxed expression. Standing with weight on one leg, casual stance, natural smile.`,
    `Sitting comfortably at cafe table, legs crossed, looking away naturally. One hand resting on table, other hand holding coffee cup.`,
    `Standing at coffee counter, holding latte, natural casual expression.`,
  ],
  'street-style': [
    `Walking confidently down street, urban attitude, neutral expression. Standing with hand in pocket, street style pose, cool expression.`,
    `Leaning against wall, casual street pose, relaxed expression. One hand in pocket, weight on back leg.`,
  ],
}

// ============================================================================
// DETAILED LIGHTING DESCRIPTIONS
// ============================================================================

const DETAILED_LIGHTING_DESCRIPTIONS: Record<string, string[]> = {
  'workout': [
    `Natural golden hour light, coming laterally. No harsh shadows. Realistically highlighted on hair and body contours. Subtle and well-controlled shadows. Dramatic, clean and professional atmosphere.`,
    `Soft yet directed light, highlight for muscle definition and body lines. Subtle and well-controlled shadows. Dramatic, clean and professional atmosphere.`,
    `Natural daylight lighting, soft and diffused light. In the background, aligned yoga mats and large sculpture with brand logo integrated into the scene.`,
  ],
  'casual': [
    `Soft golden hour lighting. Medium framing (waist up). Real, spontaneous and lifestyle atmosphere.`,
    `Soft and diffused natural morning lighting. Clean blurred background. iPhone-style aesthetic, real UGC, without AI face.`,
    `Natural late afternoon lighting, soft contrast. Blurred sports background. Active lifestyle aesthetic, premium UGC, clean and elegant branding.`,
  ],
  'luxury': [
    `Natural golden hour light, soft contrast coming from the sunset. Light halo on hair contour and shoulders. Delicate and diffused shadows. Warm and harmonious atmosphere.`,
    `Soft natural light filtered between the trees. Diffused and balanced lighting. Delicate highlight on body lines. Soft and natural shadows. Sense of calm and harmony.`,
    `Warm firelight reflects softly on golden ring charm and delicate pendant resting on the collarbone. Warm and cozy firelight, creating soft shadows and real texture in fabrics and on skin.`,
  ],
  'travel': [
    `Brilliant golden sunlight with light halo around jawbone, diffused reflections on glass panels behind her. Visible skin texture, loose hair strands shining in backlight, slight highlight on passport corner, light background blur.`,
    `Soft natural light filtered through window shadows, highlighting real skin texture, natural shine in hair and material details. Natural blue light entering through wide terminal windows, creating soft shine on hair and realistic skin texture, without artificial smoothing.`,
    `Natural golden light entering through airport floor-to-ceiling windows, creating realistic shine on face, soft highlights on skin and reflections on coffee cup. Soft and diffused shadows reinforce realism.`,
  ],
  'cozy': [
    `Warm firelight from side, soft ambient room lighting, Christmas lights in background. Warm candlelight creating soft glow on face, ambient room lighting.`,
    `Soft natural morning light streaming through window. Bright clean bathroom lighting, skin glowing.`,
    `Warm and soft light, feminine and romantic atmosphere. 50mm lens, realistic skin texture.`,
    `Warm cinematic lighting luxury Christmas portrait style. 35mm lens, focus on face and realistic texture.`,
  ],
  'coffee-run': [
    `Soft afternoon sunlight. Natural daylight with warm glow.`,
    `Golden hour lighting at 5pm. Soft natural window light mixing with ambient interior lighting, creating authentic cafe atmosphere.`,
  ],
  'street-style': [
    `Natural late afternoon lighting, soft contrast. Blurred sports background. Active lifestyle aesthetic, premium UGC, clean and elegant branding.`,
    `Soft and diffused natural morning lighting. Clean blurred background.`,
  ],
}

// ============================================================================
// DETAILED ENVIRONMENT DESCRIPTIONS
// ============================================================================

const DETAILED_ENVIRONMENT_DESCRIPTIONS: Record<string, string[]> = {
  'workout': [
    `Modern and minimalist space, with minimalist black walls displaying the brand. She encounters the Pilates reformer using resistance cables. High-standard Pilates studio, professional reformer equipment. Visible resistance cables. Organized, modern and minimalist environment. Branding integrated elegantly into the space.`,
    `Outdoor environment with retreat wellness atmosphere. Black water mirror and tranquility next to the model. Large brand logo embedded in the metallic silver design reflected in the water. Lush green vegetation with palm trees around. Tall trees in the background. Blue sky in the background.`,
    `Clear sandy beach during golden hour, with clean, powerful and sophisticated aesthetic. Two high white surf boards positioned behind the model. Brand logo visible and sharp on the boards. Soft sea waves in the background. Sky in pastel sunset tones. Minimalist, elegant and cinematic environment.`,
  ],
  'casual': [
    `Urban street with architectural details, natural city backdrop, with urban textures, natural city lighting, and authentic street atmosphere. Modern city street minimal background.`,
    `Minimalist outdoor space surrounded by green. Clean blurred background.`,
  ],
  'luxury': [
    `Luxury hotel lobby (golden tones, cream marble, tall white floral arrangements). Modern private lounge, marble + beige furniture.`,
    `Five-star hotel room in Paris, with elegant and timeless architecture: dark upholstered headboard, classic moldings on the walls, tall French doors open in the background, tall mirrors and refined architectural details. In the background, the atmosphere suggests a sophisticated historic Parisian hotel, with real depth and sense of noble space.`,
    `Luxury boutique interior, warm lighting, bag shelves in background. Minimalist shelves in background.`,
  ],
  'travel': [
    `Minimalist airport lounge. Modern airport terminal with floor-to-ceiling windows, blurred travelers. Modern airport exterior, with smooth concrete floor and metallic pillars; glass doors blurred in background with real depth of field f/2.8.`,
    `Airport terminal window during golden hour, with sunlight reflecting softly behind her through the glass. Wide window with view to terminal, background slightly blurred to maintain total face and hands sharpness.`,
    `Modern airport lobby with glass skylights above. Wide windows, blurred airport terminal, modern architectural lines that create depth and sophistication.`,
  ],
  'cozy': [
    `Cozy Christmas living room setting with fireplace, garland and warm yellow lights. Modern living room, wrapped presents in background, cozy minimalist aesthetic.`,
    `Modern and minimalist environment with sophisticated bathtub in neutral tones. Elegant white bathtub with clean edges, water with light foam and organized. Light minimalist wood tray over bathtub with open book and discreet tea cup. Cozy yet clean scenario, with lit candle in background bringing cozy atmosphere without excess.`,
    `Elegant setting with large super illuminated white tree with red bows, silver ornaments and warm lights creating bokeh. Model is seated on floor, leaning on sofa, holding mug with marshmallows and hot chocolate.`,
    `Modern kitchen setting decorated for Christmas with red arrangements and warm ambient light.`,
  ],
  'coffee-run': [
    `Cobblestone sidewalk in Brooklyn, outdoor cafe with wicker chairs. Modern coffee shop with plants, exposed brick or clean walls, other patrons blurred.`,
    `Minimalist Scandi cafe with plants and natural wood. Vintage Italian espresso bar with marble counters.`,
  ],
  'street-style': [
    `Urban street with architectural details, natural city backdrop, with urban textures, natural city lighting, and authentic street atmosphere. Modern city street minimal background.`,
    `European stone architecture, modern city street minimal background, black architectural walls, outdoor cafe urban setting.`,
  ],
}

// ============================================================================
// MAKEUP DESCRIPTIONS BY CATEGORY
// ============================================================================

const MAKEUP_DESCRIPTIONS: Record<string, string[]> = {
  'workout': [
    `Natural glam makeup. Uniform and realistic skin. No contour exaggeration. Nude lips. Neutral eyes.`,
    `Natural glam makeup. Uniform and illuminated skin. Neutral and defined eyes. Nude lips. Clean and sophisticated appearance.`,
    `Natural glam makeup. Uniform skin with healthy glow. Extremely soft contour. Clean and natural eyes. Delicate nude lips.`,
  ],
  'casual': [
    `Natural glam makeup, illuminated skin. Serene and natural expression.`,
    `Natural glam makeup. Light and spontaneous expression.`,
  ],
  'luxury': [
    `Natural glam makeup. Uniform skin with slight glow. Soft contour. Clean eyes, no exaggeration. Sophisticated nude lips.`,
    `Makeup: intense red lipstick, long and well-defined lashes, elegant finish.`,
    `Natural elegant makeup (soft contour + warm nude lipstick).`,
  ],
  'travel': [
    `Natural makeup with sunkissed effect, natural shine on water bands creating brightness bands.`,
    `Light makeup with tanned effect sunkissed.`,
  ],
  'cozy': [
    `Natural makeup, fresh dewy skin, natural no-makeup expression.`,
    `Soft glam with visible glow skin. Elegant closed smile, calm and feminine expression.`,
    `Light glow clean girl style with soft glam finish. Real skin texture, visible pores, without artificial appearance.`,
    `Natural makeup, fresh dewy skin, natural no-makeup expression. Soft expression with closed smile, natural and delicate gaze to camera.`,
  ],
  'coffee-run': [
    `Natural glam makeup, illuminated skin. Serene and natural expression.`,
    `Natural makeup, fresh dewy skin. Light and spontaneous expression.`,
  ],
  'street-style': [
    `Natural glam makeup. Light and spontaneous expression.`,
    `Natural makeup with sunkissed effect. Confident and natural expression.`,
  ],
}

// ============================================================================
// HAIR DESCRIPTIONS BY CATEGORY
// ============================================================================

const HAIR_DESCRIPTIONS: Record<string, string[]> = {
  'workout': [
    `Brown hair loose with volume and waves. Realistic polished finish.`,
    `Brown lit. Long. Loose. Natural waves with soft volume. Realistic polished finish.`,
    `Brown lit. Long. Loose or slightly controlled behind the shoulders. Natural movement. Polished and editorial finish.`,
  ],
  'casual': [
    `Brown hair loose with waves and volume. Natural glam makeup.`,
    `Brown hair loose, soft waves and volume.`,
  ],
  'luxury': [
    `Hair is straight, sleek, and pulled back behind the ears.`,
    `Hair parted in the middle, extremely polished and shiny, held in a low sleek bun.`,
    `Polished brown hair is held in a low sleek bun (low chignon), reinforcing the clean sophistication of the visual.`,
  ],
  'travel': [
    `Long voluminous wavy brown hair falling over shoulders.`,
    `Long brown hair pulled into a casual low bun, with some loose natural strands around the face.`,
    `Long brown hair loose, in long waves with natural volume.`,
  ],
  'cozy': [
    `Illuminated brown hair, long, with soft waves and natural volume.`,
    `Hair pulled in elegant bun decorated with large red velvet bow, with two soft strands framing face.`,
    `Hair pulled in elegant and modern bun, with loose subtle strands framing face.`,
    `Long brown hair with waves and volume.`,
  ],
  'coffee-run': [
    `Brown hair loose with waves and volume. Natural glam makeup.`,
    `Long brown hair loose, soft waves and volume.`,
  ],
  'street-style': [
    `Brown hair loose with waves and volume. Natural glam makeup.`,
    `Long brown hair loose, soft waves and volume.`,
  ],
}

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
  const poseOptions = DETAILED_POSE_DESCRIPTIONS[categoryLower] || DETAILED_POSE_DESCRIPTIONS['casual']
  const pose = poseOptions[Math.floor(Math.random() * poseOptions.length)]
  
  const lightingOptions = DETAILED_LIGHTING_DESCRIPTIONS[categoryLower] || DETAILED_LIGHTING_DESCRIPTIONS['casual']
  const lighting = lightingOptions[Math.floor(Math.random() * lightingOptions.length)]
  
  const environmentOptions = DETAILED_ENVIRONMENT_DESCRIPTIONS[categoryLower] || DETAILED_ENVIRONMENT_DESCRIPTIONS['casual']
  const environment = environmentOptions[Math.floor(Math.random() * environmentOptions.length)]
  
  const makeupOptions = MAKEUP_DESCRIPTIONS[categoryLower] || MAKEUP_DESCRIPTIONS['casual']
  const makeup = makeupOptions[Math.floor(Math.random() * makeupOptions.length)]
  
  // Get hair description (prioritize image analysis, then user preferences, then category default)
  let hair = ''
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
  if (!hair) {
    const hairOptions = HAIR_DESCRIPTIONS[categoryLower] || HAIR_DESCRIPTIONS['casual']
    hair = hairOptions[Math.floor(Math.random() * hairOptions.length)]
  }
  
  // Get camera and framing
  const cameraInfo = CAMERA_AND_FRAMING[categoryLower] || CAMERA_AND_FRAMING['casual']
  
  // Build age/character description
  const age = userAge || 'Woman in late twenties'
  
  // Build the enhanced prompt with detailed sections (matching production examples)
  // Format: Identity instruction + Character + Detailed sections (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)
  
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

POSE:
${pose}

STYLING:
${styling}${accessories ? `, ${accessories}` : ''}

HAIR:
${hair}

MAKEUP:
${makeup}

SCENARIO:
${environment}

LIGHTING:
${lighting}

CAMERA:
${cameraInfo.distance}
${cameraInfo.framing}
LENS: ${cameraInfo.camera}

FINAL STYLE:
Hyper-realistic photo in vertical 2:3 portrait, ${vibe} aesthetic, premium ${category} lifestyle, clean and elegant branding, without artificial appearance or AI. Real, clean and aspirational aesthetic.`

  return prompt
}




















