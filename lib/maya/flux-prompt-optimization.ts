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
      min: 15,
      optimal: 25,
      max: 35,
      reasoning:
        "Close-ups need face emphasis. Keep prompts SHORT to prioritize trigger word and facial features over environmental details.",
    },

    // Half body - balance face + outfit
    HALF_BODY_LIFESTYLE: {
      min: 20,
      optimal: 30,
      max: 40,
      reasoning:
        "Medium shots need facial detail AND outfit context. Moderate length allows both without overwhelming the trigger.",
    },

    // Full body - more scene context
    ENVIRONMENTAL_PORTRAIT: {
      min: 25,
      optimal: 35,
      max: 45,
      reasoning:
        "Wide shots can handle slightly longer prompts since face is smaller. Still prioritize subject over background.",
    },

    // Action shots - movement focus
    CLOSE_UP_ACTION: {
      min: 20,
      optimal: 28,
      max: 38,
      reasoning: "Action requires describing movement, but face must stay recognizable. Keep concise and specific.",
    },

    // Product/object focus - less face prominence
    PRODUCT_FOCUS: {
      min: 22,
      optimal: 32,
      max: 42,
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

    // CRITICAL: Avoid overloading with facial details (LoRA handles this)
    // The LoRA was trained on these features - it already knows them
    // Mentioning them can confuse the model or cause conflicts with character likeness
    AVOID_FACE_MICROMANAGEMENT: [
      "blue eyes", // LoRA knows user's eye color
      "brown eyes", // LoRA knows user's eye color
      "green eyes", // LoRA knows user's eye color
      "sharp jawline", // LoRA knows face structure
      "high cheekbones", // Trust the trained model
      "defined nose", // Let LoRA handle features
      "long hair", // LoRA knows hair length/style
      "short hair", // LoRA knows hair length/style
      "dark hair", // LoRA knows hair color
      "blonde hair", // LoRA knows hair color
      "round face", // LoRA knows face shape
      "oval face", // LoRA knows face shape
    ],

    // DO describe face-adjacent elements (these are changeable, not fixed features)
    DESCRIBE_INSTEAD: [
      "natural makeup", // Makeup is changeable
      "minimal makeup", // Makeup is changeable
      "glowing skin", // Skin quality is changeable
      "relaxed expression", // Expression is changeable
      "confident look", // Mood is changeable
      "soft smile", // Expression is changeable
      "looking away naturally", // Expression/pose is changeable
      "eyes resting down", // Expression is changeable
    ],

    // Trust the trained LoRA model to preserve facial features
    // Focus on styling, pose, lighting, and environment instead
    TRUST_LORA: true,
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
      "Keep prompts 25-45 words for optimal face preservation (shorter = better character likeness)",
      "Outfit descriptions: material + color + garment type (3-4 words max)",
      "Location: atmosphere + setting (2-3 words)",
      "Always end with camera/texture specs",
      "Hard limit: 45 words maximum - exceeding degrades character likeness",
      "Shorter prompts (25-35 words) = better facial consistency",
      "Longer prompts (50+ words) = model may lose focus on character features",
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
      "15-25 words": "Maximum face preservation, minimal scene",
      "25-35 words": "Balanced face + outfit + basic environment (RECOMMENDED)",
      "35-45 words": "More scene detail, slight face dilution risk",
      "45+ words": "HIGH RISK - trigger word loses importance, face may drift",
    },
  },

  /**
   * MAYA'S GENERATION STRATEGY
   */
  GENERATION_STRATEGY: {
    CONCEPT_MODE: {
      description: "Standalone images - diverse concepts",
      target_length: "25-35 words",
      priority: "Variety in outfits, locations, vibes",
      face_preservation: "HIGH - trigger word prominent, simple descriptions",
    },

    PHOTOSHOOT_MODE: {
      description: "Carousel - consistent outfit/location",
      target_length: "30-40 words (can be slightly longer since outfit repeats)",
      priority: "Same look, varied poses only",
      face_preservation: "HIGH - trigger word + outfit consistency helps",
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

  if (wordCount <= 25) {
    quality = "excellent"
    recommendation = "Perfect length for maximum face preservation"
  } else if (wordCount <= 35) {
    quality = "good"
    recommendation = "Good balance of detail and face preservation"
  } else if (wordCount <= 45) {
    quality = "acceptable"
    recommendation = "Slightly long - consider condensing to strengthen trigger word"
  } else {
    quality = "too_long"
    recommendation = "TOO LONG - high risk of face drift. Remove unnecessary details."
  }

  return {
    wordCount,
    quality,
    recommendation,
    hasTriggerWord: /^[a-zA-Z0-9_]+/.test(prompt), // Check if starts with trigger pattern
  }
}

/**
 * HELPER FUNCTION: Condense a prompt while preserving meaning
 */
export function condensePrompt(prompt: string): string {
  // Remove redundant descriptors
  const condensed = prompt
    .replace(/beautiful\s+/gi, "")
    .replace(/stunning\s+/gi, "")
    .replace(/gorgeous\s+/gi, "")
    .replace(/amazing\s+/gi, "")
    .replace(/perfect\s+/gi, "")
    .replace(/incredible\s+/gi, "")
    .replace(/very\s+/gi, "")
    .replace(/highly\s+/gi, "")
    .replace(/extremely\s+/gi, "")
    .replace(/\s+with\s+/gi, " ")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/,\s*,/g, ",")
    .trim()

  return condensed
}
