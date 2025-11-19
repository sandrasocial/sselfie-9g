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
      reasoning: "Close-ups need face emphasis. Keep prompts SHORT to prioritize trigger word and facial features over environmental details."
    },
    
    // Half body - balance face + outfit
    HALF_BODY_LIFESTYLE: {
      min: 20,
      optimal: 30,
      max: 40,
      reasoning: "Medium shots need facial detail AND outfit context. Moderate length allows both without overwhelming the trigger."
    },
    
    // Full body - more scene context
    ENVIRONMENTAL_PORTRAIT: {
      min: 25,
      optimal: 35,
      max: 45,
      reasoning: "Wide shots can handle slightly longer prompts since face is smaller. Still prioritize subject over background."
    },
    
    // Action shots - movement focus
    CLOSE_UP_ACTION: {
      min: 20,
      optimal: 28,
      max: 38,
      reasoning: "Action requires describing movement, but face must stay recognizable. Keep concise and specific."
    },

    // Product/object focus - less face prominence
    PRODUCT_FOCUS: {
      min: 22,
      optimal: 32,
      max: 42,
      reasoning: "Product shots allow more descriptive room, but trigger word still crucial for recognizability."
    },
  },

  /**
   * FACE PRESERVATION STRATEGIES
   * 
   * Critical techniques to maintain user likeness with trained LoRA models
   */
  FACE_PRESERVATION: {
    // Trigger word must be EARLY in prompt (first 5-10 words)
    TRIGGER_PLACEMENT: "START",
    
    // Use explicit face preservation phrases when needed
    PRESERVATION_PHRASES: [
      "maintaining exact facial features",
      "preserving recognizable face",
      "same person throughout",
      "consistent facial identity",
    ],
    
    // Avoid overloading with facial details (LoRA handles this)
    AVOID_FACE_MICROMANAGEMENT: [
      "blue eyes", // LoRA knows user's eye color
      "sharp jawline", // LoRA knows face structure
      "high cheekbones", // Trust the trained model
      "defined nose", // Let LoRA handle features
    ],
    
    // DO describe face-adjacent elements
    DESCRIBE_INSTEAD: [
      "natural makeup", 
      "minimal makeup",
      "glowing skin",
      "relaxed expression",
      "confident look",
      "soft smile", // Expression, not features
    ],
  },

  /**
   * PROMPT STRUCTURE FOR MAXIMUM EFFECTIVENESS
   */
  STRUCTURE: {
    ORDER: [
      "1. TRIGGER WORD (mandatory first)",
      "2. GENDER/PERSON (if needed for grammar)",
      "3. KEY OUTFIT DETAILS (specific and concise)",
      "4. POSE/ACTION (simple, natural)",
      "5. LOCATION (brief, atmospheric)",
      "6. LIGHTING (1-3 words)",
      "7. AESTHETIC KEYWORDS (2-3 max)",
      "8. TECHNICAL SPECS (camera + texture)",
    ],
    
    EXAMPLE_GOOD: "mya_user woman in black corset top, ice blue wide-leg jeans, standing at cafe counter with coffee, soft morning light, candid moment, shot on iPhone 15 Pro, 85mm, natural skin texture",
    
    EXAMPLE_TOO_LONG: "mya_user woman with long flowing hair and bright eyes wearing a stunning black strapless corset-style bustier top with intricate structured boning details and ice blue oversized wide-leg high-waisted jeans with subtle light distressing and vintage-inspired wash, paired with sleek modern black-and-white minimalist low-top sneakers with clean rubber soles...", // TOO MUCH - face gets lost
  },

  /**
   * INSTAGRAM STORYTELLING - NATURAL & REALISTIC
   * 
   * Keys to authentic influencer-style content
   */
  INSTAGRAM_AUTHENTICITY: {
    PRINCIPLES: [
      "Imperfect is better - grain, noise, and HDR glow add realism",
      "Candid beats posed - 'caught in moment' feels authentic",
      "Simple actions - one clear activity, not multiple",
      "Natural expressions - no exaggerated emotions",
      "iPhone aesthetic - amateur quality signals authenticity",
    ],
    
    REALISTIC_ACTIONS: [
      "sipping coffee",
      "checking phone",
      "adjusting sunglasses",
      "looking over shoulder",
      "mid-stride walking",
      "sitting relaxed",
      "touching hair naturally",
    ],
    
    AVOID_STAGED: [
      "perfectly posed professional model",
      "studio lighting perfection",
      "flawless retouched skin",
      "catalog-style symmetry",
      "overly directed actions",
    ],
  },

  /**
   * WORD ECONOMY - SAY MORE WITH LESS
   */
  CONCISE_DESCRIPTIONS: {
    // Instead of long-winded descriptions, use precise language
    VERBOSE_VS_CONCISE: {
      "wearing an oversized luxury designer black wool blazer with structured shoulders and a relaxed fit": "oversized black blazer",
      "standing in a beautiful European-style cafe with vintage architectural details and warm ambient lighting": "European cafe, warm light",
      "captured in a natural candid moment with authentic genuine expression": "candid moment",
      "shot on the latest iPhone 15 Pro Max with advanced computational photography": "shot on iPhone 15 Pro",
    },
    
    EFFICIENCY_RULES: [
      "One adjective per noun (max two if critical)",
      "Combine related details: 'black corset top' not 'black strapless corset-style bustier top with boning'",
      "Use atmosphere words: 'moody' instead of 'dramatic shadows and crushed blacks'",
      "Trust the model: 'natural light' instead of describing every light beam",
    ],
  },

  /**
   * CATEGORY-SPECIFIC PROMPT TEMPLATES
   */
  TEMPLATES: {
    CLOSE_UP: "{trigger}, {gender} in {outfit_2_words}, {simple_pose}, {location_2_words}, {lighting_1_word}, {aesthetic}, shot on iPhone 15 Pro, 85mm, natural skin texture, film grain",
    
    HALF_BODY: "{trigger}, {gender} in {outfit_3_words}, {action}, {location_3_words}, {lighting_2_words}, {aesthetic}, shot on iPhone 15 Pro, 50mm, natural skin texture, shallow depth of field",
    
    FULL_BODY: "{trigger}, {gender} in {outfit_4_words}, {movement}, {environment_3_words}, {lighting_2_words}, {vibe}, shot on iPhone 15 Pro, 35mm, natural skin texture, film grain",
    
    ACTION: "{trigger}, {gender} in {outfit_3_words}, {dynamic_action}, {setting_2_words}, {lighting_1_word}, {aesthetic}, shot on iPhone 15 Pro, 50mm, natural skin texture, film grain",
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
  let condensed = prompt
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
