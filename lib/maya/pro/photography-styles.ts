/**
 * Photography Style System - CORRECTED
 * 
 * Two distinct aesthetics:
 * 1. Editorial = Magazine quality photography (Vogue/Elle) - can be ANYWHERE
 * 2. Authentic = iPhone/influencer aesthetic - candid, selfie style
 */

export type PhotographyStyle = 'authentic' | 'editorial'

/**
 * EDITORIAL STYLE
 * 
 * High-end magazine quality photography (Vogue, Elle, Harper's Bazaar)
 * Professional camera, intentional composition, fashion editorial energy
 * 
 * CAN BE IN:
 * - Studio with backdrops and flash
 * - Luxury interiors (fireplace, velvet sofa, marble bathroom)
 * - Architectural locations (marble staircase, concrete walls)
 * - Outdoor locations shot professionally (rooftop, garden, street)
 */
export const EDITORIAL_STYLE = {
  SETTINGS: {
    // Editorial can be in many locations - what matters is QUALITY
    STUDIO: [
      'clean white studio backdrop with direct flash creating sharp contours and marked reflective surfaces',
      'minimalist grey background with professional studio lighting',
      'controlled studio environment with soft boxes and professional flash',
    ],
    
    LUXURY_INTERIORS: [
      // Like Sandra's fireplace example - interior but EDITORIAL quality
      'luxury living room with brown bouclé armchair beside lit stone fireplace, warm editorial lighting creating soft shadows',
      'sophisticated bedroom with velvet upholstered bed in deep burgundy, silk bedding, fashion editorial interior setting',
      'elegant marble bathroom with brass fixtures, warm ambient lighting, spa-luxury editorial aesthetic',
      'modern kitchen with honed marble waterfall island, brass pendant lights, editorial lifestyle shoot quality',
      'cozy library with floor-to-ceiling bookshelves, leather wingback chair, warm reading lamp, intellectual editorial vibe',
      'velvet sofa in rich emerald green with brass floor lamp, marble coffee table, luxury interior editorial',
    ],
    
    ARCHITECTURAL: [
      // Like Sandra mentioned - editorial on location
      'marble staircase in luxury building with golden railing, architectural editorial fashion shoot',
      'concrete wall with smooth finish and dramatic directional lighting, modern architectural editorial',
      'glass and steel modern building interior with natural light flooding through, contemporary editorial',
      'minimalist hallway with clean lines and professional lighting, architectural fashion photography',
    ],
    
    OUTDOOR: [
      // Editorial outdoor - professional quality
      'rooftop terrace with city skyline views at golden hour, urban editorial fashion shoot',
      'manicured garden with structured landscaping and directional sunlight, outdoor editorial photography',
      'urban street with clean modern architecture, professional street fashion editorial',
      'beach location with dramatic sunset lighting, high-end resort editorial aesthetic',
    ],
  },

  LIGHTING: {
    STUDIO: [
      'direct flash against white background creating sharp contours and marked reflective surfaces',
      'professional studio lighting with soft box creating even illumination',
      'dramatic side lighting with professional quality highlighting features',
    ],
    
    INTERIOR_EDITORIAL: [
      // Like Sandra's fireplace example
      'warm firelight creating soft shadows and real texture on fabrics and skin',
      'ambient interior lighting with professional quality, warm and intimate',
      'natural light through large windows mixed with ambient lamps, editorial interior quality',
      'candlelight and warm lamp glow creating sophisticated evening editorial mood',
    ],
    
    OUTDOOR_EDITORIAL: [
      'golden hour professional lighting with reflectors enhancing features',
      'dramatic natural light with professional quality control',
      'overcast diffused light creating even professional quality',
    ],
  },

  CAMERA: {
    SPECS: [
      '85mm lens f/1.4, professional DSLR, editorial fashion photography',
      '85mm lens f/1.8, full-frame sensor, Vogue aesthetic',
      '50mm lens f/1.8, professional mirrorless, Elle magazine quality',
      'medium format camera, 80mm lens, high-end fashion editorial',
    ],
    
    QUALITY_MARKERS: [
      'editorial fashion photography quality',
      'magazine cover/spread aesthetic',
      'professional photography with intentional composition',
      'high-end commercial photography',
      'fashion editorial energy and sophistication',
    ],
    
    AVOID: [
      'iPhone',
      'cellphone photo',
      'selfie framing',
      'amateur camera',
    ],
  },

  MOOD: {
    KEYWORDS: [
      'confident, styled, intentional',
      'fashion-forward editorial sophistication',
      'polished high-end luxury',
      'sophisticated winter editorial, intimate and luxurious',
      'bold luxury, logo-loaded attitude',
      'editorial fashion aesthetic without staged advertising appearance',
      'magazine spread energy',
    ],
  },

  STYLING: {
    EXAMPLES: [
      'black leather jacket, Chanel headband with logo, dramatic sunglasses, layered gold jewelry',
      'oversized cream cashmere turtleneck, black satin mini skirt, velvet headband with pearls',
      'structured white blazer, silk blouse, wide-leg tailored trousers',
      'red velvet gown with high slit and elegant neckline',
    ],
  },

  POSES: {
    EDITORIAL: [
      // Studio editorial poses
      'standing confidently against clean backdrop, direct gaze to camera, chin slightly raised with lips parted',
      'three-quarter turn with editorial poise, strong posture',
      
      // Interior editorial poses (like Sandra's fireplace example)
      'seated in bouclé armchair beside fireplace, legs bare and elegantly crossed, opening gift box naturally',
      'reclining on velvet sofa with elegant drape, one arm extended along back',
      'standing by floor-to-ceiling window with hand on frame, editorial poise',
      
      // Architectural/outdoor editorial
      'walking toward camera with confident stride on marble staircase',
      'seated on architectural steps with legs extended showing dress slit',
    ],
  },
}

/**
 * AUTHENTIC STYLE
 * 
 * iPhone/influencer aesthetic - selfie, candid, everyday moments
 * Natural imperfections, phone camera quality
 */
export const AUTHENTIC_STYLE = {
  SETTINGS: {
    HOME: [
      'Scandinavian coastal living room with Bolia sofa, shot on iPhone with natural window light',
      'cozy bedroom with linen bedding, casual iPhone shot with morning light',
      'modern kitchen, iPhone photo from counter perspective with natural light',
      'bathroom mirror selfie getting ready, natural overhead lighting',
    ],
    
    CAR: [
      // Like Sandra's car selfie example
      'front seat of luxury SUV, iPhone selfie framing just above dashboard with soft-focus rear seat',
      'driver seat casual shot with natural light through windshield',
      'back seat relaxed moment with window light',
    ],
    
    CASUAL_LOCATIONS: [
      'coffee shop table with latte, iPhone photo with casual framing',
      'park bench with natural background, candid iPhone moment',
      'beach casual walk, iPhone shot with natural lighting',
      'street walking candid, iPhone camera from friend perspective',
    ],
  },

  LIGHTING: {
    DESCRIPTIONS: [
      // Like Sandra's car example
      'natural golden California light wrapping face, highlighting glossed lips and cheekbones',
      'natural window light with imperfections and soft shadows',
      'uneven mixed color temperatures creating authentic feel',
      'golden hour through car window with natural glow',
      'overcast daylight with soft natural quality',
    ],
  },

  CAMERA: {
    SPECS: [
      'shot on iPhone 15 Pro portrait mode, shallow depth of field, phone framing',
      'ultra-realistic iPhone selfie, front camera, natural bokeh',
      'iPhone 15 Pro, 50mm equivalent, amateur cellphone photo aesthetic',
    ],
    
    QUALITY_MARKERS: [
      'natural skin texture with pores visible',
      'film grain and muted colors',
      'phone framing and composition',
      'influencer selfie style',
      'authentic camera imperfections',
      'candid moment feel without staged advertising appearance',
    ],
  },

  MOOD: {
    KEYWORDS: [
      'ultra-realistic selfie in influencer style',
      'candid, unstaged, authentic',
      'refined elegant ultra-stylish but natural',
      'sense of triumphant arrival, silent confidence',
      'everyday relatable moments',
      'contemporary luxury without staged advertising',
    ],
  },

  STYLING: {
    EXAMPLES: [
      // Like Sandra's car selfie - can still be luxury brands!
      'black angular Chanel sunglasses with white logo, pleated brown halter top, layered mother-of-pearl necklaces',
      'cream cashmere sweater, baggy straight-leg jeans, minimal gold jewelry',
      'oversized white sweater, casual elegance',
    ],
  },

  POSES: {
    CANDID: [
      // Like Sandra's car selfie example
      'leaning slightly toward camera in car, natural confident expression',
      'sitting on sofa with legs tucked, holding coffee mug with both hands',
      'mirror selfie getting ready, natural everyday pose',
      'casual standing by window looking at camera, relaxed posture',
    ],
  },
}

/**
 * Detect photography style from user request
 */
export function detectPhotographyStyle(text: string): PhotographyStyle | null {
  const textLower = text.toLowerCase()

  // Editorial keywords - ANY of these trigger editorial mode
  const editorialKeywords = [
    'editorial',
    'fashion shoot',
    'fashion photography',
    'magazine',
    'vogue',
    'elle',
    'harper',
    'professional photoshoot',
    'fashion campaign',
    'editorial shoot',
    'professional shoot',
    'magazine cover',
    'magazine spread',
  ]

  // Authentic keywords
  const authenticKeywords = [
    'selfie',
    'candid',
    'authentic',
    'iphone',
    'phone',
    'casual',
    'lifestyle',
    'influencer',
    'everyday',
    'natural moment',
    'instagram',
  ]

  // Check editorial first
  if (editorialKeywords.some(keyword => textLower.includes(keyword))) {
    return 'editorial'
  }

  // Check authentic
  if (authenticKeywords.some(keyword => textLower.includes(keyword))) {
    return 'authentic'
  }

  return null // Use user's saved preference
}

/**
 * Build setting based on photography style
 * 
 * Editorial: Can be studio, luxury interior, architectural, or outdoor
 * Authentic: Home, car, casual locations
 */
export function buildSettingForStyle(
  style: PhotographyStyle,
  category: string,
  userRequest?: string
): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  
  if (style === 'editorial') {
    // Check for specific editorial setting cues
    const requestLower = (userRequest || '').toLowerCase()
    
    // Interior editorial (like Sandra's fireplace example)
    if (/fireplace|armchair|living room|bedroom|interior/i.test(requestLower)) {
      return pick(EDITORIAL_STYLE.SETTINGS.LUXURY_INTERIORS)
    }
    
    // Outdoor editorial
    if (/outdoor|rooftop|garden|street|urban/i.test(requestLower)) {
      return pick(EDITORIAL_STYLE.SETTINGS.OUTDOOR)
    }
    
    // Architectural editorial
    if (/staircase|architectural|marble|concrete/i.test(requestLower)) {
      return pick(EDITORIAL_STYLE.SETTINGS.ARCHITECTURAL)
    }
    
    // Default to studio or luxury interior
    const editorialSettings = [
      ...EDITORIAL_STYLE.SETTINGS.STUDIO,
      ...EDITORIAL_STYLE.SETTINGS.LUXURY_INTERIORS,
    ]
    return pick(editorialSettings)
  } else {
    // Authentic - check for specific settings
    const requestLower = (userRequest || '').toLowerCase()
    
    // Car selfie (like Sandra's example)
    if (/car|suv|vehicle|driving|front seat/i.test(requestLower)) {
      return pick(AUTHENTIC_STYLE.SETTINGS.CAR)
    }
    
    // Specific room/home settings - be explicit
    if (/bedroom|bed/i.test(requestLower)) {
      return pick(AUTHENTIC_STYLE.SETTINGS.HOME.filter(s => /bedroom|bed/i.test(s)))
    }
    if (/kitchen/i.test(requestLower)) {
      return pick(AUTHENTIC_STYLE.SETTINGS.HOME.filter(s => /kitchen/i.test(s)))
    }
    if (/bathroom/i.test(requestLower)) {
      return pick(AUTHENTIC_STYLE.SETTINGS.HOME.filter(s => /bathroom/i.test(s)))
    }
    
    // Only use "living room" if explicitly mentioned
    if (/living room|lounge|sofa|couch/i.test(requestLower)) {
      return pick(AUTHENTIC_STYLE.SETTINGS.HOME.filter(s => /living room/i.test(s)))
    }
    
    // If "home" is mentioned but no specific room, use casual locations or bedroom/kitchen variety
    if (/home/i.test(requestLower) && !/living room|bedroom|kitchen|bathroom/i.test(requestLower)) {
      const homeVariety = [
        ...AUTHENTIC_STYLE.SETTINGS.HOME.filter(s => !/living room/i.test(s)), // Prefer non-living room home settings
        ...AUTHENTIC_STYLE.SETTINGS.CASUAL_LOCATIONS,
      ]
      return pick(homeVariety.length > 0 ? homeVariety : AUTHENTIC_STYLE.SETTINGS.CASUAL_LOCATIONS)
    }
    
    // 🔴 FIX: Default to casual locations instead of living room
    // This prevents everything from defaulting to "living room"
    return pick(AUTHENTIC_STYLE.SETTINGS.CASUAL_LOCATIONS)
  }
}

/**
 * Build lighting based on photography style and setting
 */
export function buildLightingForStyle(
  style: PhotographyStyle,
  setting?: string
): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  
  if (style === 'editorial') {
    const settingLower = (setting || '').toLowerCase()
    
    // Interior editorial lighting (like Sandra's fireplace)
    if (/fireplace|interior|living room|bedroom/i.test(settingLower)) {
      return pick(EDITORIAL_STYLE.LIGHTING.INTERIOR_EDITORIAL)
    }
    
    // Studio lighting
    if (/studio|backdrop|flash/i.test(settingLower)) {
      return pick(EDITORIAL_STYLE.LIGHTING.STUDIO)
    }
    
    // Outdoor editorial
    if (/outdoor|rooftop|garden|street/i.test(settingLower)) {
      return pick(EDITORIAL_STYLE.LIGHTING.OUTDOOR_EDITORIAL)
    }
    
    // Default editorial lighting
    return pick([
      ...EDITORIAL_STYLE.LIGHTING.STUDIO,
      ...EDITORIAL_STYLE.LIGHTING.INTERIOR_EDITORIAL,
    ])
  } else {
    return pick(AUTHENTIC_STYLE.LIGHTING.DESCRIPTIONS)
  }
}

/**
 * Build camera specs
 */
export function buildCameraForStyle(style: PhotographyStyle): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  
  if (style === 'editorial') {
    const spec = pick(EDITORIAL_STYLE.CAMERA.SPECS)
    const quality = pick(EDITORIAL_STYLE.CAMERA.QUALITY_MARKERS)
    return `${spec}, ${quality}`
  } else {
    const spec = pick(AUTHENTIC_STYLE.CAMERA.SPECS)
    const quality = pick(AUTHENTIC_STYLE.CAMERA.QUALITY_MARKERS)
    return `${spec}, ${quality}`
  }
}

/**
 * Build mood
 */
export function buildMoodForStyle(style: PhotographyStyle): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  
  if (style === 'editorial') {
    return pick(EDITORIAL_STYLE.MOOD.KEYWORDS)
  } else {
    return pick(AUTHENTIC_STYLE.MOOD.KEYWORDS)
  }
}

/**
 * Build pose
 */
export function buildPoseForStyle(
  style: PhotographyStyle,
  setting?: string
): string | null {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  
  if (style === 'editorial') {
    return pick(EDITORIAL_STYLE.POSES.EDITORIAL)
  } else {
    return pick(AUTHENTIC_STYLE.POSES.CANDID)
  }
}
