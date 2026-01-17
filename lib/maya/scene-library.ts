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
    sceneDNA: "Full-body or midshot portrait with person in frame, natural pose, establishing shot",
    composition: "Full-body or midshot, centered or rule-of-thirds framing",
    lighting: "Natural lighting matching feed aesthetic (golden hour, bright daylight, or moody evening)",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Primary location matching feed setting (indoor/outdoor/architectural)",
    cameraConstraints: "iPhone photography style, natural film grain, authentic framing",
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
    sceneDNA: "Overhead flatlay of coffee/drink and accessories on surface, minimal styling",
    composition: "Overhead view, centered composition, clean flatlay arrangement",
    lighting: "Natural window light or ambient lighting matching feed aesthetic",
    wardrobe: undefined, // No person in frame
    location: "Indoor surface (table, desk, counter) matching feed setting",
    cameraConstraints: "Overhead angle, iPhone photography style, clean minimal composition",
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
    sceneDNA: "Full-body portrait against architectural background, dynamic pose, urban/architectural context",
    composition: "Full-body framing, architectural background visible, dynamic pose",
    lighting: "Natural lighting with architectural shadows, matching feed aesthetic",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Architectural location (building facade, interior architecture, urban structure)",
    cameraConstraints: "iPhone photography style, architectural framing, natural shadows",
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
    sceneDNA: "Close-up of accessory or detail (hand, jewelry, accessory), soft focus, intimate framing",
    composition: "Close-up framing, detail-focused, soft focus on subject",
    lighting: "Soft natural light, warm skin tones, gentle shadows",
    wardrobe: "Accessory or detail visible (hand, jewelry, accessory)",
    location: "Minimal background, detail-focused",
    cameraConstraints: "Close-up angle, soft focus, iPhone photography style",
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
    sceneDNA: "Street sign, text graphic, or minimalist text element on architectural background",
    composition: "Text-focused composition, architectural background, centered or rule-of-thirds",
    lighting: "Natural lighting matching feed aesthetic, text legibility",
    wardrobe: undefined, // No person in frame
    location: "Architectural background matching feed setting",
    cameraConstraints: "iPhone photography style, text-focused framing, architectural context",
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
    sceneDNA: "Extreme close-up of fabric texture, material detail, or outfit element, high detail",
    composition: "Extreme close-up, texture-focused, material detail visible",
    lighting: "Natural lighting highlighting texture, matching feed aesthetic",
    wardrobe: "Fabric/texture detail from outfit matching brand kit",
    location: "Minimal background, texture-focused",
    cameraConstraints: "Extreme close-up angle, high detail, iPhone photography style",
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
    sceneDNA: "Full-body walking or movement shot, natural stride, lifestyle context",
    composition: "Full-body framing, movement captured, natural stride pose",
    lighting: "Natural lighting matching feed aesthetic, movement-friendly shadows",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Outdoor or indoor location matching feed setting",
    cameraConstraints: "iPhone photography style, movement-friendly framing, natural shadows",
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
    sceneDNA: "Overhead workspace flatlay with laptop, coffee, notebook, minimal desk setup",
    composition: "Overhead view, workspace-focused, minimal arrangement",
    lighting: "Natural window light or ambient lighting matching feed aesthetic",
    wardrobe: undefined, // No person in frame (or hands only)
    location: "Indoor workspace (desk, table) matching feed setting",
    cameraConstraints: "Overhead angle, iPhone photography style, clean minimal composition",
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
    sceneDNA: "Mirror selfie or self-portrait, phone visible, intimate closing shot",
    composition: "Selfie framing, mirror reflection or self-portrait angle, phone visible",
    lighting: "Natural bathroom/indoor lighting matching feed aesthetic",
    wardrobe: "Outfit matching brand kit colors and style",
    location: "Indoor location (bathroom, mirror, interior) matching feed setting",
    cameraConstraints: "Selfie angle, iPhone photography style, mirror reflection visible",
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
 * @param position - Feed position (1-9)
 * @returns Scene specification or null if invalid position
 */
export function getSceneSpec(position: number): SceneSpec | null {
  if (position < 1 || position > 9) {
    return null
  }
  return SCENE_LIBRARY[position] || null
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
