/**
 * Scene Library - Source of Truth for 9-Scene Feed Planner
 * 
 * Phase P0: Paid Blueprint FeedPlanner 9-Scene Prompt Quality Fix
 * 
 * This library defines the deterministic scene specifications for each position (1-9)
 * in the Feed Planner preview feed. Each scene has a fixed "sceneDNA" that must be
 * preserved exactly to ensure scene-consistent generation.
 * 
 * IMPORTANT:
 * - sceneDNA must match the feed preview style exactly
 * - Each scene is deterministic: position 1 = scene 1, position 2 = scene 2, etc.
 * - Scene specs are extracted from BLUEPRINT_PHOTOSHOOT_TEMPLATES but stored here
 *   as the canonical source of truth for enforcement
 */

export interface SceneSpec {
  sceneId: number // 1-9
  title: string // Human-readable scene name
  sceneDNA: string // Fixed description matching preview (verbatim)
  composition: string // Camera angle, framing
  lighting: string // Lighting requirements
  wardrobe?: string // Outfit requirements (if applicable)
  location: string // Location type/description
  cameraConstraints: string // Camera/realism constraints
  negativeRules: string[] // What NOT to include
  frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot' // Frame type detection
}

/**
 * Universal 9-Scene Library
 * 
 * These scenes are extracted from the most common blueprint template patterns
 * and represent the standard 9-scene feed layout used across all categories/moods.
 * 
 * Scene DNA is kept generic enough to work with any category/mood while being
 * specific enough to ensure consistency.
 */
export const SCENE_LIBRARY: Record<number, SceneSpec> = {
  1: {
    sceneId: 1,
    title: "Opening Portrait",
    sceneDNA: "Full-body or midshot portrait establishing the subject with natural, confident pose",
    composition: "Full-body or midshot framing, centered or rule-of-thirds composition",
    lighting: "Natural lighting aligned with feed aesthetic—golden hour warmth, bright daylight clarity, or moody evening atmosphere",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Primary location matching feed setting—indoor, outdoor, or architectural context",
    cameraConstraints: "Authentic iPhone photography aesthetic with natural film grain and genuine framing",
    negativeRules: [
      "Do not mix multiple scenes in one image",
      "Do not change location beyond scene specification",
      "Do not change outfit beyond brand kit variables",
      "Do not add elements not specified in sceneDNA"
    ],
    frameType: 'fullbody'
  },
  2: {
    sceneId: 2,
    title: "Lifestyle Flatlay",
    sceneDNA: "Overhead flatlay featuring coffee or drink with curated accessories arranged on surface, minimal editorial styling",
    composition: "Overhead perspective, centered composition, thoughtfully arranged flatlay",
    lighting: "Natural window light or ambient lighting that complements feed aesthetic",
    wardrobe: undefined, // No person in frame
    location: "Indoor surface—table, desk, or counter—matching feed setting",
    cameraConstraints: "Overhead angle, authentic iPhone photography aesthetic, clean minimal composition",
    negativeRules: [
      "Do not include person in frame",
      "Do not change to non-flatlay composition",
      "Do not add items beyond coffee/drink and specified accessories",
      "Do not change surface material beyond scene specification"
    ],
    frameType: 'flatlay'
  },
  3: {
    sceneId: 3,
    title: "Architectural Portrait",
    sceneDNA: "Full-body portrait positioned against architectural backdrop with dynamic, confident pose in urban or architectural context",
    composition: "Full-body framing with architectural background clearly visible, dynamic pose",
    lighting: "Natural lighting enhanced by architectural shadows, aligned with feed aesthetic",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Architectural setting—building facade, interior architecture, or urban structure",
    cameraConstraints: "Authentic iPhone photography aesthetic with architectural framing and natural shadow play",
    negativeRules: [
      "Do not change architectural background",
      "Do not switch to non-architectural location",
      "Do not change pose beyond dynamic portrait pose",
      "Do not mix architectural and non-architectural elements"
    ],
    frameType: 'fullbody'
  },
  4: {
    sceneId: 4,
    title: "Close-Up Detail",
    sceneDNA: "Intimate close-up of accessory or detail—hand, jewelry, or accessory—with soft focus and editorial framing",
    composition: "Close-up framing with detail-focused composition, soft focus on primary subject",
    lighting: "Soft natural light enhancing warm skin tones with gentle, flattering shadows",
    wardrobe: "Accessory or detail visible—hand, jewelry, or accessory",
    location: "Minimal background, detail-focused environment",
    cameraConstraints: "Close-up angle with soft focus, authentic iPhone photography aesthetic",
    negativeRules: [
      "Do not change to full-body or midshot",
      "Do not add full location context",
      "Do not change focus from detail/accessory",
      "Do not include multiple accessories beyond scene specification"
    ],
    frameType: 'closeup'
  },
  5: {
    sceneId: 5,
    title: "Text/Graphic Element",
    sceneDNA: "Street sign, text graphic, or minimalist text element positioned on architectural background",
    composition: "Text-focused composition with architectural background, centered or rule-of-thirds framing",
    lighting: "Natural lighting aligned with feed aesthetic, ensuring text legibility",
    wardrobe: undefined, // No person in frame
    location: "Architectural background matching feed setting",
    cameraConstraints: "Authentic iPhone photography aesthetic with text-focused framing and architectural context",
    negativeRules: [
      "Do not include person in frame",
      "Do not change text/graphic element",
      "Do not switch to non-text scene",
      "Do not change architectural background"
    ],
    frameType: 'midshot' // Text/graphic scenes are typically midshot framing
  },
  6: {
    sceneId: 6,
    title: "Texture Detail",
    sceneDNA: "Extreme close-up revealing fabric texture, material detail, or outfit element with exceptional detail",
    composition: "Extreme close-up with texture-focused composition, material detail clearly visible",
    lighting: "Natural lighting that highlights texture and material qualities, aligned with feed aesthetic",
    wardrobe: "Fabric or texture detail from outfit matching brand kit",
    location: "Minimal background, texture-focused environment",
    cameraConstraints: "Extreme close-up angle with high detail capture, authentic iPhone photography aesthetic",
    negativeRules: [
      "Do not change to full-body or midshot",
      "Do not add full location context",
      "Do not change focus from texture/material detail",
      "Do not include multiple textures beyond scene specification"
    ],
    frameType: 'closeup'
  },
  7: {
    sceneId: 7,
    title: "Lifestyle Movement",
    sceneDNA: "Full-body walking or movement shot capturing natural stride in authentic lifestyle context",
    composition: "Full-body framing with movement captured, natural stride pose",
    lighting: "Natural lighting aligned with feed aesthetic, movement-friendly shadow play",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Outdoor or indoor location matching feed setting",
    cameraConstraints: "Authentic iPhone photography aesthetic with movement-friendly framing and natural shadows",
    negativeRules: [
      "Do not change to static pose",
      "Do not remove movement/lifestyle context",
      "Do not change location beyond scene specification",
      "Do not mix static and movement poses"
    ],
    frameType: 'fullbody'
  },
  8: {
    sceneId: 8,
    title: "Workspace Flatlay",
    sceneDNA: "Overhead workspace flatlay featuring laptop, coffee, and notebook arranged in minimal desk setup",
    composition: "Overhead perspective, workspace-focused composition with minimal, intentional arrangement",
    lighting: "Natural window light or ambient lighting that complements feed aesthetic",
    wardrobe: undefined, // No person in frame (or hands only)
    location: "Indoor workspace—desk or table—matching feed setting",
    cameraConstraints: "Overhead angle, authentic iPhone photography aesthetic, clean minimal composition",
    negativeRules: [
      "Do not include full person in frame (hands only if specified)",
      "Do not change to non-workspace scene",
      "Do not add items beyond laptop, coffee, notebook",
      "Do not change surface material beyond scene specification"
    ],
    frameType: 'flatlay'
  },
  9: {
    sceneId: 9,
    title: "Closing Selfie",
    sceneDNA: "Mirror selfie or self-portrait with phone visible, creating intimate closing moment",
    composition: "Selfie framing with mirror reflection or self-portrait angle, phone clearly visible",
    lighting: "Natural bathroom or indoor lighting aligned with feed aesthetic",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Indoor location—bathroom, mirror, or interior—matching feed setting",
    cameraConstraints: "Selfie angle, authentic iPhone photography aesthetic, mirror reflection visible",
    negativeRules: [
      "Do not change to non-selfie composition",
      "Do not remove phone from frame",
      "Do not change to non-mirror/self-portrait scene",
      "Do not mix selfie and non-selfie elements"
    ],
    frameType: 'midshot'
  }
}

/**
 * Get scene specification for a given position (1-9)
 * 
 * Phase 1C: Made category-aware for Scene 8 (workspace flatlay vs lifestyle flatlay)
 * 
 * @param position - Feed position (1-9)
 * @param options - Optional category for Scene 8 customization
 * @returns Scene specification or null if invalid position
 */
export function getSceneSpec(
  position: number,
  options?: {
    category?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" | null
  }
): SceneSpec | null {
  if (position < 1 || position > 9) {
    return null
  }
  
  const baseSpec = SCENE_LIBRARY[position]
  if (!baseSpec) {
    return null
  }
  
  // Phase 1C: Make Scene 8 category-aware (remove hardcoded workspace for non-professional)
  if (position === 8 && options?.category && options.category !== 'professional') {
    // Non-professional categories: lifestyle flatlay (NO laptop/office props)
      return {
        ...baseSpec,
        title: "Lifestyle Flatlay",
        sceneDNA: "Overhead lifestyle flatlay featuring coffee or drink with curated accessories arranged on surface, minimal editorial styling",
        composition: "Overhead perspective, lifestyle-focused composition with minimal, intentional arrangement",
        location: "Indoor surface—table, counter, or surface—matching feed setting",
        negativeRules: [
          "Do not include full person in frame (hands only if specified)",
          "Do not change to non-flatlay composition",
          "Do not add laptop, office desk, or work-related items",
          "Do not add items beyond coffee/drink and specified accessories",
          "Do not change surface material beyond scene specification"
        ],
      }
  }
  
  // Professional category or no category specified: use original workspace flatlay
  return baseSpec
}

/**
 * Get all scene specifications (1-9)
 * 
 * @returns Array of all scene specifications in order
 */
export function getAllSceneSpecs(): SceneSpec[] {
  return Array.from({ length: 9 }, (_, i) => SCENE_LIBRARY[i + 1])
}

/**
 * Validate that a prompt contains the required sceneDNA
 * 
 * @param prompt - Generated prompt string
 * @param sceneId - Expected scene ID (1-9)
 * @returns True if prompt appears to match scene specification
 */
export function validateSceneContract(prompt: string, sceneId: number): {
  isValid: boolean
  missingElements: string[]
  warnings: string[]
} {
  const scene = getSceneSpec(sceneId)
  if (!scene) {
    return {
      isValid: false,
      missingElements: [`Invalid sceneId: ${sceneId}`],
      warnings: []
    }
  }

  const missingElements: string[] = []
  const warnings: string[] = []
  const promptLower = prompt.toLowerCase()

  // Check for sceneDNA keywords (flexible matching)
  const sceneDNAKeywords = scene.sceneDNA.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const hasSceneDNA = sceneDNAKeywords.some(keyword => promptLower.includes(keyword))
  
  if (!hasSceneDNA) {
    missingElements.push(`Missing sceneDNA keywords from scene ${sceneId}`)
  }

  // Check for frame type consistency
  const frameTypeKeywords: Record<string, string[]> = {
    flatlay: ['flatlay', 'overhead', 'overhead view'],
    closeup: ['close-up', 'closeup', 'close up', 'extreme close'],
    fullbody: ['full-body', 'fullbody', 'full body'],
    midshot: ['midshot', 'mid shot', 'waist-up']
  }
  
  const expectedKeywords = frameTypeKeywords[scene.frameType] || []
  const hasFrameType = expectedKeywords.some(keyword => promptLower.includes(keyword))
  
  if (!hasFrameType && scene.frameType !== 'midshot') {
    warnings.push(`Frame type '${scene.frameType}' not clearly indicated in prompt`)
  }

  // Check for negative rule violations
  for (const rule of scene.negativeRules) {
    if (rule.toLowerCase().includes('do not mix')) {
      // Check for scene mixing indicators
      const mixingKeywords = ['and also', 'combined with', 'along with', 'plus']
      if (mixingKeywords.some(kw => promptLower.includes(kw))) {
        warnings.push(`Possible scene mixing detected: ${rule}`)
      }
    }
  }

  return {
    isValid: missingElements.length === 0,
    missingElements,
    warnings
  }
}
