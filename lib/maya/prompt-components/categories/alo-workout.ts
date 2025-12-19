/**
 * ALO Workout Components
 * 
 * Extracted from ALO Collection (10 prompts)
 */

import type { PromptComponent } from '../types'

export const ALO_POSES: PromptComponent[] = [
  {
    id: 'alo-pose-001',
    category: 'alo-workout',
    type: 'pose',
    description: 'Walking through space, adjusting sunglasses',
    promptText: 'walks slowly through a modern and minimalist space, adjusting sunglasses during the walk',
    tags: ['movement', 'casual', 'dynamic', 'alo', 'fitness'],
    metadata: {
      poseType: 'walking',
    },
  },
  {
    id: 'alo-pose-002',
    category: 'alo-workout',
    type: 'pose',
    description: 'Kneeling on yoga mat at event',
    promptText: 'kneeling on an Alo yoga mat at an outdoor event, elegant posture, erect spine, natural gesture',
    tags: ['static', 'yoga', 'event', 'alo', 'wellness'],
    metadata: {
      poseType: 'kneeling',
    },
  },
  {
    id: 'alo-pose-003',
    category: 'alo-workout',
    type: 'pose',
    description: 'Standing on tennis court holding racket',
    promptText: 'standing on a tennis court, holding a tennis racket, confident and athletic posture',
    tags: ['standing', 'athletic', 'sport', 'alo'],
    metadata: {
      poseType: 'standing',
    },
  },
  {
    id: 'alo-pose-004',
    category: 'alo-workout',
    type: 'pose',
    description: 'Editorial terrace pose',
    promptText: 'in an editorial pose on a white modern terrace, sophisticated and dynamic movement',
    tags: ['editorial', 'dynamic', 'terrace', 'alo'],
    metadata: {
      poseType: 'editorial',
    },
  },
  {
    id: 'alo-pose-005',
    category: 'alo-workout',
    type: 'pose',
    description: 'Using Pilates reformer with cables',
    promptText: 'using a Pilates reformer with cables, demonstrating movement and strength',
    tags: ['dynamic', 'pilates', 'equipment', 'alo', 'fitness'],
    metadata: {
      poseType: 'dynamic',
    },
  },
  {
    id: 'alo-pose-006',
    category: 'alo-workout',
    type: 'pose',
    description: 'Standing sculptural pose at beach sunset',
    promptText: 'standing in a sculptural pose at beach sunset, elegant and powerful',
    tags: ['standing', 'sculptural', 'beach', 'sunset', 'alo'],
    metadata: {
      poseType: 'standing',
    },
  },
  {
    id: 'alo-pose-007',
    category: 'alo-workout',
    type: 'pose',
    description: 'Yoga tree pose (Vrksasana)',
    promptText: 'in yoga tree pose (Vrksasana), balanced and centered, demonstrating flexibility and strength',
    tags: ['yoga', 'balance', 'flexibility', 'alo', 'wellness'],
    metadata: {
      poseType: 'yoga',
    },
  },
  {
    id: 'alo-pose-008',
    category: 'alo-workout',
    type: 'pose',
    description: 'Outdoor stretch with arms raised',
    promptText: 'outdoor stretch with arms raised, natural and dynamic movement',
    tags: ['stretching', 'outdoor', 'dynamic', 'alo', 'fitness'],
    metadata: {
      poseType: 'dynamic',
    },
  },
  {
    id: 'alo-pose-009',
    category: 'alo-workout',
    type: 'pose',
    description: 'Sitting casually post-workout',
    promptText: 'sitting casually post-workout, relaxed and natural, holding coffee',
    tags: ['sitting', 'casual', 'relaxed', 'alo'],
    metadata: {
      poseType: 'sitting',
    },
  },
]

export const ALO_OUTFITS: PromptComponent[] = [
  {
    id: 'alo-outfit-001',
    category: 'alo-workout',
    type: 'outfit',
    description: 'Monochromatic ALO outfit with sneakers',
    promptText: 'wearing a monochromatic Alo outfit and sneakers',
    tags: ['casual', 'athleisure', 'alo'],
    brand: 'ALO',
    metadata: {
      outfitStyle: 'athletic',
    },
  },
  {
    id: 'alo-outfit-002',
    category: 'alo-workout',
    type: 'outfit',
    description: 'Nude-toned ALO sports outfit',
    promptText: 'wears a nude-toned Alo sports outfit',
    tags: ['elegant', 'minimal', 'athletic', 'alo'],
    brand: 'ALO',
    metadata: {
      outfitStyle: 'athletic',
    },
  },
  {
    id: 'alo-outfit-003',
    category: 'alo-workout',
    type: 'outfit',
    description: 'ALO athleisure set with logo visible',
    promptText: 'wearing an Alo athleisure set with "alo" logo visible, modern and functional',
    tags: ['athleisure', 'logo', 'modern', 'alo'],
    brand: 'ALO',
    metadata: {
      outfitStyle: 'athletic',
    },
  },
]

export const ALO_LOCATIONS: PromptComponent[] = [
  {
    id: 'alo-location-001',
    category: 'alo-workout',
    type: 'location',
    description: 'White modern terrace with yoga elements',
    promptText: 'White modern terrace, white minimalist architecture floor, green vegetation in the background, blue sky visible, minimalist yoga elements (black mats and metallic bottle)',
    tags: ['outdoor', 'terrace', 'minimalist', 'yoga', 'alo'],
    metadata: {
      locationType: 'outdoor',
    },
  },
  {
    id: 'alo-location-002',
    category: 'alo-workout',
    type: 'location',
    description: 'Tennis court',
    promptText: 'on a professional tennis court, clean lines and modern design',
    tags: ['outdoor', 'sport', 'tennis', 'alo'],
    metadata: {
      locationType: 'outdoor',
    },
  },
  {
    id: 'alo-location-003',
    category: 'alo-workout',
    type: 'location',
    description: 'Pilates studio',
    promptText: 'in a modern Pilates studio with reformer equipment, clean and minimalist space',
    tags: ['indoor', 'studio', 'pilates', 'alo'],
    metadata: {
      locationType: 'indoor',
    },
  },
  {
    id: 'alo-location-004',
    category: 'alo-workout',
    type: 'location',
    description: 'Beach at sunset',
    promptText: 'at beach at sunset, natural and serene environment',
    tags: ['outdoor', 'beach', 'sunset', 'alo'],
    metadata: {
      locationType: 'outdoor',
    },
  },
  {
    id: 'alo-location-005',
    category: 'alo-workout',
    type: 'location',
    description: 'Modern cafe post-workout',
    promptText: 'in a modern minimalist cafe, post-workout setting, clean and relaxed atmosphere',
    tags: ['indoor', 'cafe', 'casual', 'alo'],
    metadata: {
      locationType: 'indoor',
    },
  },
]

export const ALO_LIGHTING: PromptComponent[] = [
  {
    id: 'alo-lighting-001',
    category: 'alo-workout',
    type: 'lighting',
    description: 'Natural golden hour light',
    promptText: 'Natural golden hour light coming laterally, no harsh shadows, realistically highlighted on hair and body contours, subtle and well-controlled shadows',
    tags: ['golden-hour', 'natural', 'soft', 'editorial'],
    metadata: {
      lightingType: 'golden-hour',
    },
  },
  {
    id: 'alo-lighting-002',
    category: 'alo-workout',
    type: 'lighting',
    description: 'Soft studio flash',
    promptText: 'soft studio flash, creating controlled shine and professional lighting',
    tags: ['studio', 'flash', 'professional', 'controlled'],
    metadata: {
      lightingType: 'studio',
    },
  },
  {
    id: 'alo-lighting-003',
    category: 'alo-workout',
    type: 'lighting',
    description: 'Natural daylight',
    promptText: 'Natural daylight lighting, soft and diffused, natural shadows',
    tags: ['natural', 'daylight', 'soft', 'diffused'],
    metadata: {
      lightingType: 'natural',
    },
  },
]

export const ALO_CAMERA: PromptComponent[] = [
  {
    id: 'alo-camera-001',
    category: 'alo-workout',
    type: 'camera',
    description: 'Editorial medium distance shot',
    promptText: '35mm lens, Aperture f/2.8, distance approximately 2.5 to 3 meters, height slightly below eye line, straight angle',
    tags: ['editorial', 'medium-shot', 'professional'],
    metadata: {
      framing: 'medium',
    },
  },
  {
    id: 'alo-camera-002',
    category: 'alo-workout',
    type: 'camera',
    description: 'Full body editorial shot',
    promptText: 'Vertical 2:3, Full body (feet to head), balanced negative space, professional editorial framing',
    tags: ['full-body', 'editorial', 'vertical'],
    metadata: {
      framing: 'full-body',
    },
  },
  {
    id: 'alo-camera-003',
    category: 'alo-workout',
    type: 'camera',
    description: 'Close-up with logo',
    promptText: 'Medium framing (waist up), close-up focus on outfit and logo, professional detail shot',
    tags: ['close-up', 'medium', 'detail'],
    metadata: {
      framing: 'medium',
    },
  },
]

export const ALO_BRAND_ELEMENTS: PromptComponent[] = [
  {
    id: 'alo-brand-001',
    category: 'alo-workout',
    type: 'brand_element',
    description: 'ALO logo visible',
    promptText: '"alo" logo visible on outfit, subtle brand integration',
    tags: ['logo', 'brand', 'alo'],
    brand: 'ALO',
  },
  {
    id: 'alo-brand-002',
    category: 'alo-workout',
    type: 'brand_element',
    description: 'ALO yoga mat',
    promptText: 'Alo yoga mat visible in scene, brand element naturally integrated',
    tags: ['yoga-mat', 'brand', 'alo'],
    brand: 'ALO',
  },
]

// Export all ALO components
export const ALO_COMPONENTS: PromptComponent[] = [
  ...ALO_POSES,
  ...ALO_OUTFITS,
  ...ALO_LOCATIONS,
  ...ALO_LIGHTING,
  ...ALO_CAMERA,
  ...ALO_BRAND_ELEMENTS,
]
