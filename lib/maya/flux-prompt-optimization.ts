/**
 * FLUX AI Prompt Length Optimization & Face Preservation Guide
 *
 * Research-backed best practices for Flux models (Dev, Schnell, Pro, etc.)
 * to maximize facial likeness while maintaining creative quality
 */

export const FLUX_PROMPT_OPTIMIZATION = {
  /**
   * TECHNICAL LIMITS
   */
  TECHNICAL_MAXIMUM_TOKENS: 512, // Hard limit from Flux API

  /**
   * OPTIMAL PROMPT LENGTHS FOR DIFFERENT CONTEXTS
   *
   * Based on research: shorter, focused prompts preserve facial likeness better
   * Longer prompts dilute trigger word importance and cause feature drift
   */
  OPTIMAL_LENGTHS: {
    // Solo portraits - focus on face
    CLOSE_UP_PORTRAIT: {
      min: 30,
      optimal: 40,
      max: 55,
      reasoning:
        "Close-ups need face emphasis with room for safety net feature descriptions. Keep prompts focused but include key features.",
    },

    // Half body - balance face + outfit
    HALF_BODY_LIFESTYLE: {
      min: 30,
      optimal: 45,
      max: 60,
      reasoning:
        "Medium shots need facial detail AND outfit context. Moderate length allows both with safety net descriptions.",
    },

    // Full body - more scene context
    ENVIRONMENTAL_PORTRAIT: {
      min: 30,
      optimal: 50,
      max: 60,
      reasoning:
        "Wide shots can handle slightly longer prompts since face is smaller. Still prioritize subject over background with safety net.",
    },

    // Action shots - movement focus
    CLOSE_UP_ACTION: {
      min: 30,
      optimal: 42,
      max: 55,
      reasoning: "Action requires describing movement, but face must stay recognizable. Include safety net features.",
    },

    // Product/object focus - less face prominence
    PRODUCT_FOCUS: {
      min: 30,
      optimal: 45,
      max: 60,
      reasoning: "Product shots allow more descriptive room, but trigger word still crucial for recognizability.",
    },
  },

  /**
   * FACE PRESERVATION STRATEGIES
   *
   * Critical techniques to maintain user likeness with trained LoRA models
   */
  FACE_PRESERVATION: {
    // Trigger word must be FIRST in prompt (first 3-5 words) - CRITICAL for LoRA activation
    TRIGGER_PLACEMENT: "FIRST",
    TRIGGER_POSITION: "1-3", // First 1-3 words for optimal character likeness

    // Use explicit face preservation phrases when needed (but avoid overusing)
    PRESERVATION_PHRASES: [
      "maintaining exact facial features",
      "preserving recognizable face",
      "same person throughout",
      "consistent facial identity",
    ],

    // BALANCED APPROACH: Include key features as safety net guidance
    // While LoRA was trained on these features, results may vary based on training quality
    // It's better to include subtle feature descriptions than to omit them and get wrong results
    // USER PREFERENCES ARE MANDATORY - if user specified hair/body/age, these MUST be included
    SAFETY_NET_APPROACH: {
      // Include hair color/style as safety net guidance even if LoRA should know it
      INCLUDE_WHEN_NEEDED: [
        "hair color/style from user preferences (MANDATORY if specified)",
        "body type from user preferences (MANDATORY if specified)",
        "distinctive traits as safety net",
      ],
      // Focus on changeable elements (these are always safe to describe)
      DESCRIBE_ALWAYS: [
        "natural makeup", // Makeup is changeable
        "minimal makeup", // Makeup is changeable
        "relaxed expression", // Expression is changeable
        "confident look", // Mood is changeable
        "soft smile", // Expression is changeable
        "looking away naturally", // Expression/pose is changeable
        "eyes resting down", // Expression is changeable
      ],
    },

    // Trust the trained LoRA model but reinforce critical features (especially from user preferences)
    // Focus on styling, pose, lighting, and environment, but include safety net feature descriptions
    BALANCED_LORA_APPROACH: true,
  },

  /**
   * PROMPT STRUCTURE FOR MAXIMUM EFFECTIVENESS
   */
  PROMPT_STRUCTURE: {
    ORDER: [
      "1. TRIGGER WORD (required, first)",
      "2. GENDER (woman/man/person)",
      "3. KEY OUTFIT DETAILS (specific and concise)",
      "4. POSE/ACTION (simple, natural)",
      "5. LOCATION (brief, atmospheric)",
      "6. LIGHTING (1-3 words)",
      "7. AESTHETIC KEYWORDS (2-3 max)",
      "8. TECHNICAL SPECS (camera + texture)",
    ],

    PRINCIPLES: [
      "Keep prompts 30-60 words for optimal face preservation with room for safety net descriptions",
      "Outfit descriptions: material + color + garment type (3-4 words max)",
      "Location: atmosphere + setting (2-3 words)",
      "Always end with camera/texture specs",
      "Target range (30-60 words) = optimal balance of detail and character consistency",
      "Include safety net feature descriptions (hair color/style) when needed, especially from user preferences",
      "MUST preserve: iPhone 15 Pro, natural skin texture, film grain, muted colors",
    ],
  },

  /**
   * WORD ECONOMY - SAY MORE WITH LESS
   */
  CONCISE_DESCRIPTIONS: {
    // Instead of long-winded descriptions, use precise language
    EFFICIENCY_RULES: [
      "One adjective per noun (max two if critical)",
      "Combine related details into 3-4 word descriptions",
      "Use atmosphere words instead of detailed descriptions",
      "Trust the model with simple directional cues",
    ],

    PRINCIPLES: [
      "Compress verbose descriptions to their essence",
      "Material + color + garment (e.g., 'silk cream blouse')",
      "Location + lighting in 3-4 words",
      "Remove redundant qualifiers",
    ],
  },

  /**
   * CATEGORY-SPECIFIC PROMPT TEMPLATES
   */
  TEMPLATES: {
    CLOSE_UP:
      "{trigger}, {gender} in {outfit_2_words}, {simple_pose}, {location_2_words}, {lighting_1_word}, {aesthetic}, shot on iPhone 15 Pro, 85mm, natural skin texture, film grain",

    HALF_BODY:
      "{trigger}, {gender} in {outfit_3_words}, {action}, {location_3_words}, {lighting_2_words}, {aesthetic}, shot on iPhone 15 Pro, 50mm, natural skin texture, shallow depth of field",

    FULL_BODY:
      "{trigger}, {gender} in {outfit_4_words}, {movement}, {environment_3_words}, {lighting_2_words}, {vibe}, shot on iPhone 15 Pro, 35mm, natural skin texture, film grain",

    ACTION:
      "{trigger}, {gender} in {outfit_3_words}, {dynamic_action}, {setting_2_words}, {lighting_1_word}, {aesthetic}, shot on iPhone 15 Pro, 50mm, natural skin texture, film grain",
  },

  /**
   * QUALITY OVER QUANTITY
   *
   * The "Less is More" principle for Flux prompting
   */
  LESS_IS_MORE: {
    WHY_SHORTER_WINS: [
      "Trigger word has more weight in shorter prompts",
      "Model focuses on fewer elements = better execution",
      "Face features don't compete with excessive details",
      "LoRA influence is stronger with concise prompts",
      "Natural results come from simple instructions",
    ],

    WORD_COUNT_GUIDE: {
      "30-40 words": "Optimal balance with safety net descriptions (RECOMMENDED)",
      "40-55 words": "More scene detail with safety net, good for complex concepts",
      "55-60 words": "Maximum recommended length with all safety features",
      "60+ words": "HIGH RISK - trigger word loses importance, face may drift",
    },
  },

  /**
   * MAYA'S GENERATION STRATEGY
   */
  GENERATION_STRATEGY: {
    CONCEPT_MODE: {
      description: "Standalone images - diverse concepts",
      target_length: "30-60 words",
      priority: "Variety in outfits, locations, vibes",
      face_preservation: "HIGH - trigger word prominent, includes safety net feature descriptions",
    },

    PHOTOSHOOT_MODE: {
      description: "Carousel - consistent outfit/location",
      target_length: "30-60 words (can be slightly longer since outfit repeats)",
      priority: "Same look, varied poses only",
      face_preservation: "HIGH - trigger word + outfit consistency helps, includes safety net",
    },
  },
}

/**
 * HELPER FUNCTION: Analyze prompt length and quality
 */
export function analyzePromptQuality(prompt: string) {
  const words = prompt.trim().split(/\s+/)
  const wordCount = words.length

  let quality: "excellent" | "good" | "acceptable" | "too_long" = "excellent"
  let recommendation = ""
  const missingFeatures: string[] = []

  // Check word count
  if (wordCount >= 30 && wordCount <= 40) {
    quality = "excellent"
    recommendation = "Perfect length for optimal face preservation with safety net descriptions"
  } else if (wordCount >= 30 && wordCount <= 60) {
    quality = "good"
    recommendation = "Good balance of detail and face preservation with safety net"
  } else if (wordCount < 30) {
    quality = "acceptable"
    recommendation = "Too short - add safety net feature descriptions to reach 30+ words"
  } else {
    quality = "too_long"
    recommendation = "TOO LONG - high risk of face drift. Remove unnecessary details."
  }

  // Validate safety features
  if (!hasSafetyFeature(prompt, "CAMERA")) {
    missingFeatures.push("camera spec (iPhone 15 Pro or focal length)")
  }
  if (!hasSafetyFeature(prompt, "SKIN_TEXTURE")) {
    missingFeatures.push("natural skin texture")
  }
  if (!hasSafetyFeature(prompt, "FILM_GRAIN")) {
    missingFeatures.push("film grain")
  }
  if (!hasSafetyFeature(prompt, "MUTED_COLORS")) {
    missingFeatures.push("muted colors")
  }

  if (missingFeatures.length > 0) {
    recommendation += ` Missing: ${missingFeatures.join(", ")}`
    if (quality === "excellent") {
      quality = "good" // Downgrade if missing safety features
    }
  }

  return {
    wordCount,
    quality,
    recommendation,
    hasTriggerWord: /^[a-zA-Z0-9_]+/.test(prompt), // Check if starts with trigger pattern
    hasCamera: hasSafetyFeature(prompt, "CAMERA"),
    hasSkinTexture: hasSafetyFeature(prompt, "SKIN_TEXTURE"),
    hasFilmGrain: hasSafetyFeature(prompt, "FILM_GRAIN"),
    hasMutedColors: hasSafetyFeature(prompt, "MUTED_COLORS"),
    missingFeatures,
  }
}

/**
 * SAFETY FEATURES that must be preserved during optimization
 */
const SAFETY_FEATURES = {
  CAMERA: {
    patterns: [
      /shot\s+on\s+iPhone\s+15\s+Pro/gi,
      /shot\s+on\s+iPhone/gi,
      /\d+mm/gi, // Focal length
    ],
    default: "shot on iPhone 15 Pro",
  },
  SKIN_TEXTURE: {
    patterns: [
      /natural\s+skin\s+texture/gi,
      /pores\s+visible/gi,
      /visible\s+pores/gi,
      /realistic\s+texture/gi,
      /organic\s+skin\s+texture/gi,
    ],
    default: "natural skin texture with pores visible",
  },
  FILM_GRAIN: {
    patterns: [/film\s+grain/gi, /visible\s+film\s+grain/gi],
    default: "film grain",
  },
  MUTED_COLORS: {
    patterns: [/muted\s+colors?/gi, /muted\s+color\s+palette/gi],
    default: "muted colors",
  },
  HAIR_COLOR: {
    patterns: [
      /\b(?:blonde|brown|black|red|gray|grey|auburn|brunette|natural)\s+hair\s+color/gi,
      /\b(?:blonde|brown|black|red|gray|grey|auburn|brunette|natural)\s+hair\b/gi,
    ],
    default: null, // No default, only preserve if present
  },
}

/**
 * ANTI-PATTERNS to automatically remove
 */
const ANTI_PATTERNS = {
  QUALITY_TERMS: [
    /\bstunning\b/gi,
    /\bperfect\b/gi,
    /\bbeautiful\b/gi,
    /\bflawless\b/gi,
    /\bhigh\s+quality\b/gi,
    /\b8K\b/gi,
    /\b4K\b/gi,
    /\bultra\s+realistic\b/gi,
    /\bphotorealistic\b/gi,
  ],
  LIGHTING_TERMS: [
    /\bstudio\s+lighting\b/gi,
    /\bprofessional\s+lighting\b/gi,
    /\bclean\s+lighting\b/gi,
    /\beven\s+lighting\b/gi,
    /\bperfect\s+lighting\b/gi,
  ],
  SKIN_TERMS: [
    /\bsmooth\s+skin\b/gi,
    /\bairbrushed\b/gi,
    /\bflawless\s+skin\b/gi,
    /\bperfect\s+skin\b/gi,
    /\bplastic\b/gi,
    /\bmannequin-like\b/gi,
    /\bdoll-like\b/gi,
  ],
}

/**
 * HELPER FUNCTION: Check if prompt contains safety features
 */
function hasSafetyFeature(prompt: string, featureType: keyof typeof SAFETY_FEATURES): boolean {
  const feature = SAFETY_FEATURES[featureType]
  return feature.patterns.some((pattern) => pattern.test(prompt))
}

/**
 * HELPER FUNCTION: Extract safety features before optimization
 */
function extractSafetyFeatures(prompt: string): {
  camera: string | null
  skinTexture: string | null
  filmGrain: string | null
  mutedColors: string | null
  hairColor: string | null
} {
  const result = {
    camera: null as string | null,
    skinTexture: null as string | null,
    filmGrain: null as string | null,
    mutedColors: null as string | null,
    hairColor: null as string | null,
  }

  // Extract camera spec
  const cameraMatch = prompt.match(/shot\s+on\s+iPhone(?:\s+15\s+Pro)?(?:\s+[^,]+)?/gi)
  if (cameraMatch) {
    result.camera = cameraMatch[0]
  } else {
    const focalMatch = prompt.match(/\d+mm/gi)
    if (focalMatch) {
      result.camera = `shot on iPhone 15 Pro, ${focalMatch[0]}`
    }
  }

  // Extract skin texture
  const skinMatch = prompt.match(/natural\s+skin\s+texture(?:\s+with\s+pores\s+visible)?/gi)
  if (skinMatch) {
    result.skinTexture = skinMatch[0]
  } else if (prompt.match(/pores\s+visible/gi)) {
    result.skinTexture = "natural skin texture with pores visible"
  }

  // Extract film grain
  const grainMatch = prompt.match(/(?:visible\s+)?film\s+grain/gi)
  if (grainMatch) {
    result.filmGrain = grainMatch[0]
  }

  // Extract muted colors
  const colorMatch = prompt.match(/muted\s+(?:color\s+)?(?:palette|colors?)/gi)
  if (colorMatch) {
    result.mutedColors = colorMatch[0]
  }

  // Extract hair color (if present)
  const hairMatch = prompt.match(/\b(?:blonde|brown|black|red|gray|grey|auburn|brunette|natural)\s+(?:hair\s+color|hair)\b/gi)
  if (hairMatch) {
    result.hairColor = hairMatch[0]
  }

  return result
}

/**
 * HELPER FUNCTION: Remove anti-patterns while preserving safety features
 */
function removeAntiPatterns(prompt: string): string {
  let cleaned = prompt

  // Remove quality terms
  ANTI_PATTERNS.QUALITY_TERMS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "")
  })

  // Remove lighting terms
  ANTI_PATTERNS.LIGHTING_TERMS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "")
  })

  // Remove skin terms
  ANTI_PATTERNS.SKIN_TERMS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "")
  })

  // Clean up extra spaces and commas
  cleaned = cleaned
    .replace(/,\s*,/g, ",") // Remove double commas
    .replace(/,\s*,/g, ",") // Remove double commas again
    .replace(/^,\s*/, "") // Remove leading comma
    .replace(/\s*,\s*$/, "") // Remove trailing comma
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim()

  return cleaned
}

/**
 * HELPER FUNCTION: Add missing safety features
 */
function addMissingSafetyFeatures(
  prompt: string,
  extracted: ReturnType<typeof extractSafetyFeatures>,
): string {
  let result = prompt

  // Add camera spec if missing
  if (!extracted.camera && !hasSafetyFeature(prompt, "CAMERA")) {
    result = `${result}, ${SAFETY_FEATURES.CAMERA.default}`
  }

  // Add skin texture if missing
  if (!extracted.skinTexture && !hasSafetyFeature(prompt, "SKIN_TEXTURE")) {
    result = `${result}, ${SAFETY_FEATURES.SKIN_TEXTURE.default}`
  }

  // Add film grain if missing
  if (!extracted.filmGrain && !hasSafetyFeature(prompt, "FILM_GRAIN")) {
    result = `${result}, ${SAFETY_FEATURES.FILM_GRAIN.default}`
  }

  // Add muted colors if missing
  if (!extracted.mutedColors && !hasSafetyFeature(prompt, "MUTED_COLORS")) {
    result = `${result}, ${SAFETY_FEATURES.MUTED_COLORS.default}`
  }

  // Hair color is optional - only preserve if it was there

  // Clean up
  result = result.replace(/,\s*,/g, ",").replace(/^,\s*/, "").replace(/\s*,\s*$/, "").trim()

  return result
}

/**
 * HELPER FUNCTION: Condense a prompt while preserving safety features
 */
export function condensePrompt(prompt: string): string {
  // Step 1: Extract safety features before any modification
  const extracted = extractSafetyFeatures(prompt)

  // Step 2: Remove anti-patterns
  let condensed = removeAntiPatterns(prompt)

  // Step 3: Remove redundant descriptors (but preserve safety features)
  condensed = condensed
    .replace(/beautiful\s+/gi, "")
    .replace(/amazing\s+/gi, "")
    .replace(/incredible\s+/gi, "")
    .replace(/very\s+/gi, "")
    .replace(/highly\s+/gi, "")
    .replace(/extremely\s+/gi, "")
    .replace(/\s+with\s+/gi, " ")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/,\s*,/g, ",")
    .trim()

  // Step 4: Add back missing safety features
  condensed = addMissingSafetyFeatures(condensed, extracted)

  return condensed
}

/**
 * HELPER FUNCTION: Optimize and validate prompt
 */
export function optimizePrompt(prompt: string, targetLength: { min: number; max: number } = { min: 30, max: 60 }): {
  optimized: string
  wordCount: number
  warnings: string[]
  addedFeatures: string[]
} {
  const warnings: string[] = []
  const addedFeatures: string[] = []

  // Step 1: Extract safety features
  const extracted = extractSafetyFeatures(prompt)

  // Step 2: Remove anti-patterns
  let optimized = removeAntiPatterns(prompt)

  // Step 3: Remove redundant descriptors
  optimized = optimized
    .replace(/beautiful\s+/gi, "")
    .replace(/amazing\s+/gi, "")
    .replace(/incredible\s+/gi, "")
    .replace(/very\s+/gi, "")
    .replace(/highly\s+/gi, "")
    .replace(/extremely\s+/gi, "")
    .replace(/\s+with\s+/gi, " ")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/,\s*,/g, ",")
    .trim()

  // Step 4: Validate and add missing safety features
  const beforeAdd = optimized
  optimized = addMissingSafetyFeatures(optimized, extracted)

  // Track what was added
  if (optimized !== beforeAdd) {
    const added = optimized.replace(beforeAdd, "").trim()
    if (added) {
      addedFeatures.push(added)
    }
  }

  // Step 5: Check word count
  const words = optimized.trim().split(/\s+/)
  const wordCount = words.length

  if (wordCount < targetLength.min) {
    warnings.push(`Prompt too short (${wordCount} words). Target: ${targetLength.min}-${targetLength.max} words.`)
  } else if (wordCount > targetLength.max) {
    warnings.push(`Prompt too long (${wordCount} words). Target: ${targetLength.min}-${targetLength.max} words.`)
  }

  // Step 6: Final validation
  if (!hasSafetyFeature(optimized, "CAMERA")) {
    warnings.push("Missing camera spec (iPhone 15 Pro or focal length)")
  }
  if (!hasSafetyFeature(optimized, "SKIN_TEXTURE")) {
    warnings.push("Missing natural skin texture mention")
  }
  if (!hasSafetyFeature(optimized, "FILM_GRAIN")) {
    warnings.push("Missing film grain")
  }
  if (!hasSafetyFeature(optimized, "MUTED_COLORS")) {
    warnings.push("Missing muted colors")
  }

  return {
    optimized,
    wordCount,
    warnings,
    addedFeatures,
  }
}
