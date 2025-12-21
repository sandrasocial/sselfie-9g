/**
 * Camera Composition & Framing System
 * 
 * Defines framing types, camera angles, positions, composition rules, and specs
 * Works independently with both Editorial and Authentic photography styles
 */

export type FramingType = 'close-up' | 'medium' | 'half-body' | 'three-quarter' | 'full-body' | 'environmental'
export type CameraAngle = 'eye-level' | 'slightly-above' | 'low-angle' | 'high-angle' | 'dutch-angle'
export type CameraPosition = 'front-facing' | 'three-quarter-turn' | 'profile' | 'over-shoulder' | 'back-view-turn'
export type CompositionRule = 'rule-of-thirds' | 'centered' | 'negative-space' | 'leading-lines' | 'symmetry' | 'frame-within-frame'

/**
 * Framing Types
 * 
 * Different shot types from close-up to environmental
 */
export const FRAMING_TYPES = {
  'close-up': {
    description: 'Face and shoulders, intimate portrait',
    coverage: 'Head, neck, and upper shoulders visible',
    idealFor: ['portraits', 'beauty shots', 'emotional connection', 'product details near face'],
    cameraDistance: '60-80cm from subject',
    lensSpecs: {
      editorial: '85mm f/1.4 or 135mm f/2.0, professional DSLR',
      authentic: 'iPhone 15 Pro portrait mode, 77mm equivalent, front or rear camera',
    },
    depthOfField: 'Very shallow (f/1.4-f/2.0) - sharp focus on eyes, soft bokeh background',
    examples: [
      'close-up portrait focusing on face, eyes sharply in focus with soft bokeh background',
      'intimate close-up shot capturing facial expression and details, shoulders visible',
      'tight portrait framing head and upper shoulders, emphasizing facial features',
    ],
  },

  'medium': {
    description: 'Chest up, conversational portrait',
    coverage: 'From mid-chest upward, shows upper body and face',
    idealFor: ['conversational portraits', 'showing outfit top', 'jewelry and accessories', 'professional headshots'],
    cameraDistance: '1-1.2m from subject',
    lensSpecs: {
      editorial: '85mm f/1.8 or 50mm f/1.4, professional DSLR',
      authentic: 'iPhone 15 Pro portrait mode, 50mm equivalent',
    },
    depthOfField: 'Shallow (f/1.8-f/2.8) - subject sharp, background softly blurred',
    examples: [
      'medium shot from chest up, showing outfit details and facial expression',
      'portrait capturing from mid-chest upward, balanced framing',
      'conversational distance portrait, chest to head visible',
    ],
  },

  'half-body': {
    description: 'Waist up, classic portrait framing',
    coverage: 'From waist upward, shows torso, arms, and face',
    idealFor: ['outfit showcasing (top half)', 'seated portraits', 'lifestyle content', 'hand gestures and posing'],
    cameraDistance: '1.2-1.5m from subject',
    lensSpecs: {
      editorial: '50mm f/1.8 or 85mm f/2.0, professional DSLR',
      authentic: 'iPhone 15 Pro, 50mm equivalent, portrait mode',
    },
    depthOfField: 'Medium shallow (f/2.0-f/2.8) - subject clear, background softly out of focus',
    examples: [
      'half-body shot from waist up, showing outfit and pose',
      'portrait capturing from waist to head, arms and hands visible',
      'classic waist-up framing with natural posing',
    ],
  },

  'three-quarter': {
    description: 'Mid-thigh up, fashion editorial favorite',
    coverage: 'From mid-thigh upward, shows most of outfit and stance',
    idealFor: ['fashion editorials', 'outfit showcasing', 'showing dress/skirt length', 'editorial poses'],
    cameraDistance: '1.5-2m from subject',
    lensSpecs: {
      editorial: '50mm f/2.0 or 85mm f/2.8, professional DSLR',
      authentic: 'iPhone 15 Pro, 50mm equivalent, full frame',
    },
    depthOfField: 'Moderate (f/2.8-f/4.0) - subject sharp, background gently blurred',
    examples: [
      'three-quarter body shot from mid-thigh up, showing dress and styling',
      'fashion editorial framing capturing from thighs to head',
      'portrait from mid-thigh upward with editorial pose',
    ],
  },

  'full-body': {
    description: 'Head to toe, complete outfit showcase',
    coverage: 'Entire body from head to feet visible',
    idealFor: ['full outfit showcase', 'fashion campaigns', 'showing shoes', 'movement and dance', 'architectural settings'],
    cameraDistance: '2-3m from subject',
    lensSpecs: {
      editorial: '50mm f/2.8 or 35mm f/2.0, professional DSLR',
      authentic: 'iPhone 15 Pro, 26mm or 50mm equivalent',
    },
    depthOfField: 'Moderate to deep (f/2.8-f/5.6) - entire subject sharp, background with some detail',
    examples: [
      'full-body shot showing complete outfit from head to toe',
      'fashion photograph capturing entire silhouette and styling',
      'head-to-toe portrait with clear view of all outfit elements',
    ],
  },

  'environmental': {
    description: 'Subject in context of full scene',
    coverage: 'Wide shot showing subject within their environment',
    idealFor: ['lifestyle content', 'storytelling', 'showing interior design', 'location showcase', 'brand environments'],
    cameraDistance: '3-5m from subject',
    lensSpecs: {
      editorial: '35mm f/2.8 or 24mm f/4.0, professional DSLR',
      authentic: 'iPhone 15 Pro, 26mm ultra-wide or 50mm standard',
    },
    depthOfField: 'Deep (f/4.0-f/8.0) - both subject and environment reasonably sharp',
    examples: [
      'environmental portrait showing subject within full room setting',
      'wide shot capturing subject in context of luxurious interior',
      'lifestyle photograph with subject as part of larger scene',
    ],
  },
}

/**
 * Camera Angles
 * 
 * Vertical angle of camera relative to subject
 */
export const CAMERA_ANGLES = {
  'eye-level': {
    description: 'Camera at subject\'s eye height',
    effect: 'Neutral, natural, conversational feel',
    idealFor: ['natural portraits', 'honest connection', 'professional headshots', 'editorial standards'],
    technicalNote: 'Camera lens aligned with subject\'s eyes, horizontal plane',
    examples: [
      'camera at eye-level creating neutral natural perspective',
      'eye-height camera angle for conversational portrait feel',
      'horizontal camera position aligned with subject\'s gaze',
    ],
  },

  'slightly-above': {
    description: 'Camera 10-30cm above eye level',
    effect: 'Flattering, slimming, most universally attractive angle',
    idealFor: ['beauty shots', 'flattering portraits', 'most portraits', 'selfies', 'professional photos'],
    technicalNote: 'Camera tilted down 5-15 degrees, creates subtle elongation',
    examples: [
      'camera positioned slightly above eye-level for flattering angle, subject looking up naturally',
      'elevated camera angle creating slimming effect and defined features',
      'camera 20cm above eye-height with subtle downward tilt',
    ],
  },

  'low-angle': {
    description: 'Camera below eye level looking up',
    effect: 'Empowering, confident, dramatic, fashion editorial energy',
    idealFor: ['fashion editorials', 'powerful poses', 'showing height/confidence', 'dramatic shots'],
    technicalNote: 'Camera positioned 30-60cm below eye level, tilted upward 15-30 degrees',
    examples: [
      'low camera angle looking up at subject creating powerful confident presence',
      'camera positioned below eye-level emphasizing height and editorial drama',
      'upward camera angle for empowering fashion editorial aesthetic',
    ],
  },

  'high-angle': {
    description: 'Camera significantly above subject looking down',
    effect: 'Vulnerable, intimate, or playful depending on context',
    idealFor: ['overhead shots', 'flatlay style', 'bed/floor poses', 'creative editorial'],
    technicalNote: 'Camera 60cm-2m above subject, looking down 30-90 degrees',
    examples: [
      'high camera angle looking down at subject creating intimate perspective',
      'overhead camera position capturing subject from above',
      'elevated viewpoint with camera positioned directly overhead',
    ],
  },

  'dutch-angle': {
    description: 'Camera tilted on horizontal axis',
    effect: 'Dynamic, energetic, unconventional, artistic',
    idealFor: ['creative editorials', 'dynamic fashion', 'artistic portraits', 'avant-garde'],
    technicalNote: 'Camera tilted 15-45 degrees on roll axis, creating diagonal horizon',
    examples: [
      'dutch angle with camera tilted creating dynamic diagonal composition',
      'tilted camera angle adding energy and unconventional artistic feel',
      'diagonal perspective with 30-degree camera tilt',
    ],
  },
}

/**
 * Camera Positions
 * 
 * Horizontal position/orientation relative to subject
 */
export const CAMERA_POSITIONS = {
  'front-facing': {
    description: 'Camera directly in front of subject',
    effect: 'Direct connection, bold, confrontational or intimate',
    idealFor: ['editorial confidence', 'direct gaze portraits', 'beauty shots', 'symmetrical faces'],
    pose: 'Subject facing camera straight-on, shoulders square or slightly angled',
    examples: [
      'camera positioned directly in front, subject facing forward with direct gaze',
      'frontal camera position creating bold eye contact and connection',
      'straight-on perspective with subject looking directly at lens',
    ],
  },

  'three-quarter-turn': {
    description: 'Subject turned 45 degrees from camera',
    effect: 'Most flattering, classic portrait angle, dimensional',
    idealFor: ['most portraits', 'professional shots', 'flattering angles', 'creating depth'],
    pose: 'Subject\'s body at 45-degree angle to camera, face turned toward lens',
    examples: [
      'subject in three-quarter turn, body angled 45 degrees with face toward camera',
      'classic three-quarter position creating dimensional flattering perspective',
      'body turned 45 degrees while face engages camera, most flattering angle',
    ],
  },

  'profile': {
    description: 'Subject at 90-degree angle to camera, side view',
    effect: 'Dramatic, artistic, shows facial structure and silhouette',
    idealFor: ['dramatic editorials', 'showing profile beauty', 'artistic portraits', 'architectural settings'],
    pose: 'Subject\'s body and face perpendicular to camera, side view',
    examples: [
      'pure profile shot with subject at 90-degree angle to camera',
      'side view capturing silhouette and facial profile',
      'profile perspective showing side of face and body line',
    ],
  },

  'over-shoulder': {
    description: 'Camera positioned behind and to side of subject',
    effect: 'Intimate, voyeuristic, storytelling, mysterious',
    idealFor: ['lifestyle content', 'storytelling', 'showing environment', 'candid feel'],
    pose: 'Subject\'s back/shoulder in foreground, face partially visible or looking away',
    examples: [
      'over-shoulder perspective with subject\'s back partially visible',
      'camera behind and beside subject capturing intimate storytelling moment',
      'shoulder and back in foreground, face in profile or looking ahead',
    ],
  },

  'back-view-turn': {
    description: 'Subject\'s back to camera with head turned',
    effect: 'Mysterious, fashion editorial, elegant, alluring',
    idealFor: ['fashion editorials', 'showing back of outfit/dress', 'elegant poses', 'luxury content'],
    pose: 'Subject\'s back to camera, head turned over shoulder with gaze to lens',
    examples: [
      'back view with head turned over shoulder, elegant editorial pose',
      'subject facing away with dramatic head turn toward camera',
      'back to camera with face turned showing profile and creating mystery',
    ],
  },
}

/**
 * Composition Rules
 * 
 * Professional photography composition techniques
 */
export const COMPOSITION_RULES = {
  'rule-of-thirds': {
    description: 'Subject positioned on intersection of thirds grid lines',
    effect: 'Dynamic, professional, visually balanced but not static',
    placement: 'Eyes or face on upper third line, or body on left/right third line',
    idealFor: ['professional portraits', 'editorial fashion', 'creating visual interest', 'most photography'],
    examples: [
      'subject positioned on right third line with eyes on upper third intersection',
      'rule of thirds composition, face aligned with left vertical third',
      'dynamic framing with subject\'s eyes at upper third horizontal line',
    ],
  },

  'centered': {
    description: 'Subject centered in frame',
    effect: 'Bold, symmetrical, formal, Instagram-style',
    placement: 'Subject directly in center of frame',
    idealFor: ['bold statements', 'symmetrical faces', 'social media', 'selfies', 'formal portraits'],
    examples: [
      'centered composition with subject directly in middle of frame',
      'symmetrical centered framing creating bold formal portrait',
      'subject positioned in exact center for Instagram-style composition',
    ],
  },

  'negative-space': {
    description: 'Subject occupies small portion of frame with empty space',
    effect: 'Minimalist, artistic, contemplative, breathing room',
    placement: 'Subject on one side/bottom with large empty area',
    idealFor: ['minimalist aesthetics', 'editorial artistry', 'creating mood', 'architectural settings'],
    examples: [
      'negative space composition with subject in lower third, sky/wall above',
      'minimalist framing with large empty area emphasizing subject isolation',
      'subject positioned right with expansive negative space on left',
    ],
  },

  'leading-lines': {
    description: 'Lines in environment lead eye toward subject',
    effect: 'Directional, dynamic, architectural, draws viewer in',
    placement: 'Subject at convergence point of environmental lines',
    idealFor: ['architectural settings', 'staircases', 'hallways', 'urban environments', 'depth'],
    examples: [
      'leading lines composition with staircase railing guiding eye to subject',
      'architectural lines converging toward subject creating depth',
      'hallway perspective with lines drawing viewer toward subject',
    ],
  },

  'symmetry': {
    description: 'Symmetrical elements on both sides of subject',
    effect: 'Formal, balanced, architectural, Instagram-worthy',
    placement: 'Subject centered with symmetrical elements mirrored on sides',
    idealFor: ['architectural settings', 'formal portraits', 'luxury aesthetics', 'Instagram content'],
    examples: [
      'symmetrical composition with subject centered between matching columns',
      'balanced framing with identical elements on both sides of subject',
      'formal symmetry with subject as central axis point',
    ],
  },

  'frame-within-frame': {
    description: 'Environmental elements frame the subject',
    effect: 'Depth, context, storytelling, draws focus to subject',
    placement: 'Subject framed by doorway, window, arch, or natural elements',
    idealFor: ['environmental portraits', 'architectural settings', 'storytelling', 'adding depth'],
    examples: [
      'subject framed within doorway creating natural vignette',
      'window frame composition with subject centered in opening',
      'archway framing subject and drawing eye to center',
    ],
  },
}

/**
 * Build complete camera composition description
 */
export function buildCameraComposition(
  framing: FramingType,
  angle: CameraAngle,
  position: CameraPosition,
  composition: CompositionRule,
  photographyStyle: 'editorial' | 'authentic'
): string {
  const framingData = FRAMING_TYPES[framing]
  const angleData = CAMERA_ANGLES[angle]
  const positionData = CAMERA_POSITIONS[position]
  const compositionData = COMPOSITION_RULES[composition]

  // Get appropriate lens spec based on photography style
  const lensSpec = framingData.lensSpecs[photographyStyle]

  // Build composition description
  const parts = []

  // Framing
  const framingExample = framingData.examples[Math.floor(Math.random() * framingData.examples.length)]
  parts.push(framingExample)

  // Camera position
  const positionExample = positionData.examples[Math.floor(Math.random() * positionData.examples.length)]
  parts.push(positionExample)

  // Camera angle
  const angleExample = angleData.examples[Math.floor(Math.random() * angleData.examples.length)]
  parts.push(angleExample)

  // Composition rule
  const compositionExample = compositionData.examples[Math.floor(Math.random() * compositionData.examples.length)]
  parts.push(compositionExample)

  // Camera specs
  parts.push(`${lensSpec}, camera distance ${framingData.cameraDistance}`)

  // Depth of field
  parts.push(framingData.depthOfField)

  return parts.join(', ')
}

/**
 * Select varied compositions for 6 concepts
 * 
 * Ensures visual variety across concept cards
 */
export function selectVariedCompositions(): Array<{
  framing: FramingType
  angle: CameraAngle
  position: CameraPosition
  composition: CompositionRule
}> {
  // Pre-defined variety mix for 6 concepts
  return [
    // Concept 1: Classic close-up portrait
    {
      framing: 'close-up',
      angle: 'slightly-above',
      position: 'three-quarter-turn',
      composition: 'rule-of-thirds',
    },
    
    // Concept 2: Editorial half-body
    {
      framing: 'half-body',
      angle: 'eye-level',
      position: 'front-facing',
      composition: 'centered',
    },
    
    // Concept 3: Full-body fashion
    {
      framing: 'full-body',
      angle: 'slightly-above',
      position: 'three-quarter-turn',
      composition: 'negative-space',
    },
    
    // Concept 4: Environmental storytelling
    {
      framing: 'environmental',
      angle: 'eye-level',
      position: 'three-quarter-turn',
      composition: 'rule-of-thirds',
    },
    
    // Concept 5: Dramatic 3/4 body
    {
      framing: 'three-quarter',
      angle: 'low-angle',
      position: 'front-facing',
      composition: 'centered',
    },
    
    // Concept 6: Intimate medium shot
    {
      framing: 'medium',
      angle: 'slightly-above',
      position: 'three-quarter-turn',
      composition: 'frame-within-frame',
    },
  ]
}

/**
 * Detect framing preference from user request
 */
export function detectFramingPreference(text: string): FramingType | null {
  const textLower = text.toLowerCase()

  if (/close.*up|headshot|face.*shot|portrait.*close/i.test(textLower)) return 'close-up'
  if (/half.*body|waist.*up|torso/i.test(textLower)) return 'half-body'
  if (/full.*body|head.*to.*toe|whole.*body|complete.*outfit/i.test(textLower)) return 'full-body'
  if (/environmental|context|scene|room.*shot/i.test(textLower)) return 'environmental'
  if (/three.*quarter|3\/4|mid.*thigh/i.test(textLower)) return 'three-quarter'
  if (/medium.*shot|chest.*up/i.test(textLower)) return 'medium'

  return null // Let system select varied compositions
}

/**
 * Detect angle preference from user request
 */
export function detectAnglePreference(text: string): CameraAngle | null {
  const textLower = text.toLowerCase()

  if (/eye.*level|straight.*on|neutral.*angle/i.test(textLower)) return 'eye-level'
  if (/slight.*above|flattering|above/i.test(textLower)) return 'slightly-above'
  if (/low.*angle|looking.*up|from.*below|powerful/i.test(textLower)) return 'low-angle'
  if (/high.*angle|overhead|from.*above|looking.*down/i.test(textLower)) return 'high-angle'
  if (/dutch.*angle|tilted|diagonal/i.test(textLower)) return 'dutch-angle'

  return null // Use default slightly-above (most flattering)
}

/**
 * Detect composition preference from user request
 */
export function detectCompositionPreference(text: string): CompositionRule | null {
  const textLower = text.toLowerCase()

  if (/rule.*third|thirds/i.test(textLower)) return 'rule-of-thirds'
  if (/center|centered|middle/i.test(textLower)) return 'centered'
  if (/negative.*space|minimal|minimalist/i.test(textLower)) return 'negative-space'
  if (/leading.*line|lines.*leading/i.test(textLower)) return 'leading-lines'
  if (/symmetr/i.test(textLower)) return 'symmetry'
  if (/frame.*frame|doorway|window.*frame/i.test(textLower)) return 'frame-within-frame'

  return null // Use varied compositions
}

/**
 * Select composition for specific concept index (0-5)
 */
export function selectCompositionForConcept(
  conceptIndex: number,
  userFramingPreference?: FramingType | null,
  userAnglePreference?: CameraAngle | null,
  userCompositionPreference?: CompositionRule | null
): {
  framing: FramingType
  angle: CameraAngle
  position: CameraPosition
  composition: CompositionRule
} {
  const variedCompositions = selectVariedCompositions()
  const baseComposition = variedCompositions[conceptIndex % 6]

  // Apply user preferences if specified
  return {
    framing: userFramingPreference || baseComposition.framing,
    angle: userAnglePreference || baseComposition.angle,
    position: baseComposition.position, // Keep varied position
    composition: userCompositionPreference || baseComposition.composition,
  }
}
