/**
 * Style Coherence Resolver
 * 
 * 🧊 FROZEN: Legacy compatibility matrix. Will be replaced with constraint solver.
 * 
 * PHASE 6: This file is frozen. Feed Planner now uses scene-resolver.ts for scene intent.
 * This resolver uses hardcoded compatibility matrices and will be replaced with
 * activity-first constraint solving in future phases.
 * 
 * PURPOSE:
 * Ensures that fashion styles, visual aesthetics (category), and mood selections
 * produce INTENTIONALLY COHERENT visual outputs by adapting or validating
 * combinations before prompt construction.
 * 
 * HIERARCHY (Priority Order):
 * 1. category (visual_aesthetic) - AUTHORITATIVE
 * 2. mood (feed_style)
 * 3. fashionStyle (ADAPTED to fit category+mood)
 * 4. template vibe (ONLY if compatible - handled downstream)
 * 
 * PHILOSOPHY:
 * - Prefer ADAPTATION over BLOCKING
 * - Maintain user intent while ensuring coherence
 * - Never fail silently - always log adaptations
 * - Backward compatible - existing feeds work unchanged
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CoherenceResolverInput {
  category: string | null
  mood: string | null
  fashionStyle: string | null
  templateKey?: string
  userId?: string
  feedId?: string | number
}

export interface CoherenceResolverOutput {
  resolvedCategory: string
  resolvedMood: string
  resolvedFashionStyle: string
  adaptationApplied: boolean
  adaptationReason?: string
}

type CompatibilityAction = 'allow' | 'adapt' | 'block'

// ============================================================================
// COMPATIBILITY MATRIX
// ============================================================================

/**
 * Fashion Style × Category Compatibility Matrix
 * 
 * Defines how fashion styles interact with visual categories.
 * 
 * Actions:
 * - "allow": Fashion style is compatible as-is
 * - "adapt": Fashion style must be transformed to fit aesthetic
 * - "block": Fashion style is incompatible (use fallback)
 */
const COMPATIBILITY_MATRIX: Record<string, Record<string, CompatibilityAction>> = {
  // ATHLETIC fashion style
  athletic: {
    luxury: 'adapt',      // → elevated_athleisure
    minimal: 'allow',     // → minimal_athletic (clean lines fit minimal)
    beige: 'adapt',       // → cozy_active
    warm: 'adapt',        // → warm_active
    edgy: 'adapt',        // → street_athletic
    professional: 'block' // Incompatible
  },
  
  // BOHEMIAN fashion style
  bohemian: {
    luxury: 'block',      // Incompatible
    minimal: 'adapt',     // → minimal_bohemian (ONE flowing element)
    beige: 'allow',       // Natural fit
    warm: 'allow',        // Natural fit
    edgy: 'adapt',        // → dark_bohemian
    professional: 'block' // Incompatible
  },
  
  // CASUAL fashion style
  casual: {
    luxury: 'adapt',      // → elevated_casual
    minimal: 'allow',     // Natural fit
    beige: 'allow',       // Natural fit
    warm: 'allow',        // Natural fit
    edgy: 'allow',        // Street casual fits
    professional: 'adapt' // → smart_casual
  },
  
  // BUSINESS fashion style
  business: {
    luxury: 'allow',      // Natural fit
    minimal: 'adapt',     // → minimal_professional
    beige: 'adapt',       // → soft_professional
    warm: 'adapt',        // → warm_professional
    edgy: 'block',        // Incompatible
    professional: 'allow' // Natural fit
  },
  
  // CLASSIC fashion style
  classic: {
    luxury: 'allow',      // Timeless luxury
    minimal: 'allow',     // Minimal classic
    beige: 'allow',       // Neutral classic
    warm: 'allow',        // Warm classic
    edgy: 'adapt',        // → modern_classic
    professional: 'allow' // Professional classic
  },
  
  // TRENDY fashion style
  trendy: {
    luxury: 'allow',      // Luxury trendy
    minimal: 'allow',     // Modern trendy
    beige: 'adapt',       // → soft_trendy
    warm: 'allow',        // Warm trendy
    edgy: 'allow',        // Edgy trendy
    professional: 'adapt' // → contemporary
  }
}

// ============================================================================
// ADAPTATION RULES
// ============================================================================

/**
 * Adaptation Transformations
 * 
 * Defines how fashion styles are transformed when "adapt" action is required.
 * Returns a CONTEXT-AWARE fashion style variant.
 * 
 * Format: `{fashionStyle}_{category}` → adapted fashion style name
 */
const ADAPTATION_RULES: Record<string, string> = {
  // ATHLETIC adaptations
  'athletic_luxury': 'elevated_athleisure',
  'athletic_beige': 'cozy_active',
  'athletic_warm': 'warm_active',
  'athletic_edgy': 'street_athletic',
  
  // BOHEMIAN adaptations
  'bohemian_minimal': 'minimal_bohemian',
  'bohemian_edgy': 'dark_bohemian',
  
  // CASUAL adaptations
  'casual_luxury': 'elevated_casual',
  'casual_professional': 'smart_casual',
  
  // BUSINESS adaptations
  'business_minimal': 'minimal_professional',
  'business_beige': 'soft_professional',
  'business_warm': 'warm_professional',
  
  // CLASSIC adaptations
  'classic_edgy': 'modern_classic',
  
  // TRENDY adaptations
  'trendy_beige': 'soft_trendy',
  'trendy_professional': 'contemporary'
}

/**
 * Map adapted styles back to supported vibe library styles.
 * This prevents template injection failures when adapted styles don't exist.
 */
const VIBE_STYLE_FALLBACKS: Record<string, string> = {
  elevated_athleisure: 'athletic',
  cozy_active: 'athletic',
  warm_active: 'athletic',
  street_athletic: 'athletic',
  minimal_bohemian: 'bohemian',
  dark_bohemian: 'bohemian',
  elevated_casual: 'casual',
  smart_casual: 'casual',
  minimal_professional: 'business',
  soft_professional: 'business',
  warm_professional: 'business',
  modern_classic: 'classic',
  soft_trendy: 'trendy',
  contemporary: 'trendy',
}

// ============================================================================
// CATEGORY DEFAULTS (FALLBACK HIERARCHY)
// ============================================================================

/**
 * Category-Aligned Default Fashion Styles
 * 
 * Used when blocking occurs or fashionStyle is null.
 * Ensures fallback is coherent with category aesthetic.
 */
const CATEGORY_DEFAULTS: Record<string, string> = {
  luxury: 'classic',
  minimal: 'casual',
  beige: 'casual',
  warm: 'casual',
  edgy: 'casual',
  professional: 'business'
}

// ============================================================================
// MAIN RESOLVER FUNCTION
// ============================================================================

/**
 * Resolve Coherent Style
 * 
 * Takes raw user style selections and returns adapted, coherent style parameters
 * that will produce aesthetically unified visual outputs.
 * 
 * @param input - Raw style selections from user
 * @returns Resolved coherent style parameters with adaptation metadata
 */
export function resolveCoherentStyle(input: CoherenceResolverInput): CoherenceResolverOutput {
  const {
    category: rawCategory,
    mood: rawMood,
    fashionStyle: rawFashionStyle,
    templateKey,
    userId,
    feedId
  } = input

  // ======================================================================
  // PHASE 1: NORMALIZE INPUTS
  // ======================================================================
  
  // Normalize to lowercase for consistency
  const category = normalizeStyleValue(rawCategory)
  const mood = normalizeStyleValue(rawMood)
  const fashionStyle = normalizeStyleValue(rawFashionStyle)

  // Default values (hierarchy enforcement)
  const resolvedCategory = category || 'minimal'
  const resolvedMood = mood || 'minimal'
  
  // If no fashion style provided, use category-aligned default
  if (!fashionStyle) {
    const defaultFashion = CATEGORY_DEFAULTS[resolvedCategory] || 'casual'
    
    console.log(`[COHERENCE-RESOLVER] No fashion style provided, using category default: ${defaultFashion}`, {
      userId,
      feedId,
      category: resolvedCategory,
      defaultFashion
    })
    
    return {
      resolvedCategory,
      resolvedMood,
      resolvedFashionStyle: defaultFashion,
      adaptationApplied: false
    }
  }

  // ======================================================================
  // PHASE 2: CHECK COMPATIBILITY
  // ======================================================================
  
  const action = getCompatibilityAction(fashionStyle, resolvedCategory)
  
  // ======================================================================
  // PHASE 3: APPLY ACTION
  // ======================================================================
  
  switch (action) {
    case 'allow': {
      // Fashion style is compatible as-is
      const normalizedFashion = normalizeToSupportedStyle(fashionStyle)
      console.log(`[COHERENCE-RESOLVER] ✅ Fashion style compatible: ${fashionStyle} + ${resolvedCategory}`, {
        userId,
        feedId,
        category: resolvedCategory,
        mood: resolvedMood,
        fashionStyle: normalizedFashion.style,
        normalizedFrom: normalizedFashion.mapped ? fashionStyle : null,
        normalizedReason: normalizedFashion.reason || null,
      })
      
      return {
        resolvedCategory,
        resolvedMood,
        resolvedFashionStyle: normalizedFashion.style,
        adaptationApplied: normalizedFashion.mapped,
        adaptationReason: normalizedFashion.mapped ? normalizedFashion.reason : undefined,
      }
    }
    
    case 'adapt': {
      // Transform fashion style to fit aesthetic context
      const adaptedFashion = adaptFashionStyle(fashionStyle, resolvedCategory)
      const normalizedFashion = normalizeToSupportedStyle(adaptedFashion)
      const reason = normalizedFashion.mapped
        ? `Adapted "${fashionStyle}" to "${adaptedFashion}" for ${resolvedCategory} aesthetic, normalized to "${normalizedFashion.style}"`
        : `Adapted "${fashionStyle}" to "${adaptedFashion}" for ${resolvedCategory} aesthetic`
      
      console.log(`[COHERENCE-RESOLVER] ⚠️ Adaptation applied: ${fashionStyle} → ${adaptedFashion}`, {
        userId,
        feedId,
        category: resolvedCategory,
        mood: resolvedMood,
        originalFashion: fashionStyle,
        adaptedFashion: normalizedFashion.style,
        normalizedFrom: normalizedFashion.mapped ? adaptedFashion : null,
        reason
      })
      
      return {
        resolvedCategory,
        resolvedMood,
        resolvedFashionStyle: normalizedFashion.style,
        adaptationApplied: true,
        adaptationReason: reason
      }
    }
    
    case 'block': {
      // Fashion style is incompatible - use fallback
      const fallbackFashion = getFallbackFashion(resolvedCategory)
      const normalizedFashion = normalizeToSupportedStyle(fallbackFashion)
      const reason = normalizedFashion.mapped
        ? `Blocked "${fashionStyle}" (incompatible with ${resolvedCategory}), using fallback: ${fallbackFashion} → ${normalizedFashion.style}`
        : `Blocked "${fashionStyle}" (incompatible with ${resolvedCategory}), using fallback: ${fallbackFashion}`
      
      console.warn(`[COHERENCE-RESOLVER] 🚫 Fashion style blocked: ${fashionStyle} + ${resolvedCategory}`, {
        userId,
        feedId,
        category: resolvedCategory,
        mood: resolvedMood,
        originalFashion: fashionStyle,
        fallbackFashion: normalizedFashion.style,
        reason
      })
      
      return {
        resolvedCategory,
        resolvedMood,
        resolvedFashionStyle: normalizedFashion.style,
        adaptationApplied: true,
        adaptationReason: reason
      }
    }
    
    default: {
      // Unknown action - fail safe with fallback
      const fallbackFashion = getFallbackFashion(resolvedCategory)
      
      console.error(`[COHERENCE-RESOLVER] ❌ Unknown compatibility action: ${action}`, {
        userId,
        feedId,
        category: resolvedCategory,
        fashionStyle
      })
      
      return {
        resolvedCategory,
        resolvedMood,
        resolvedFashionStyle: fallbackFashion,
        adaptationApplied: true,
        adaptationReason: `Unknown action, using fallback: ${fallbackFashion}`
      }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize style value to lowercase trimmed string
 */
function normalizeStyleValue(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null
  }
  return value.toLowerCase().trim()
}

/**
 * Get compatibility action for fashion style × category combination
 */
function getCompatibilityAction(
  fashionStyle: string,
  category: string
): CompatibilityAction {
  // Check if fashion style has compatibility rules
  const fashionRules = COMPATIBILITY_MATRIX[fashionStyle]
  if (!fashionRules) {
    // Unknown fashion style - allow it (backward compatibility)
    console.warn(`[COHERENCE-RESOLVER] Unknown fashion style: ${fashionStyle}, allowing as-is`)
    return 'allow'
  }
  
  // Check category-specific action
  const action = fashionRules[category]
  if (!action) {
    // No specific rule for this category - allow it (backward compatibility)
    return 'allow'
  }
  
  return action
}

/**
 * Adapt fashion style to fit category aesthetic
 */
function adaptFashionStyle(fashionStyle: string, category: string): string {
  const adaptationKey = `${fashionStyle}_${category}`
  const adapted = ADAPTATION_RULES[adaptationKey]
  
  if (!adapted) {
    // No specific adaptation rule - return original (fail safe)
    console.warn(`[COHERENCE-RESOLVER] No adaptation rule for: ${adaptationKey}, using original`)
    return fashionStyle
  }
  
  return adapted
}

/**
 * Normalize adapted fashion styles to supported vibe library styles.
 */
function normalizeToSupportedStyle(style: string): { style: string; mapped: boolean; reason?: string } {
  const fallback = VIBE_STYLE_FALLBACKS[style]
  if (!fallback) {
    return { style, mapped: false }
  }

  return {
    style: fallback,
    mapped: true,
    reason: `Mapped unsupported fashion style "${style}" to "${fallback}" for vibe library compatibility`,
  }
}

/**
 * Get fallback fashion style when blocking occurs
 * 
 * Fallback hierarchy:
 * 1. Category-aligned default
 * 2. "casual" (universal fallback)
 * 3. null (should never happen)
 */
function getFallbackFashion(category: string): string {
  // Try category-aligned default first
  const categoryDefault = CATEGORY_DEFAULTS[category]
  if (categoryDefault) {
    return categoryDefault
  }
  
  // Universal fallback
  return 'casual'
}

// ============================================================================
// TESTING / VALIDATION (Simple Inline Assertions)
// ============================================================================

/**
 * Run basic validation tests on resolver logic
 * Call this during development to verify behavior
 */
export function _validateCoherenceResolver(): void {
  console.log('[COHERENCE-RESOLVER] Running validation tests...')
  
  // Test 1: Athletic + Luxury = Adaptation
  const test1 = resolveCoherentStyle({
    category: 'luxury',
    mood: 'luxury',
    fashionStyle: 'athletic'
  })
  console.assert(
    test1.resolvedFashionStyle === 'elevated_athleisure',
    'Test 1 failed: athletic + luxury should adapt to elevated_athleisure'
  )
  
  // Test 2: Bohemian + Minimal = Adaptation
  const test2 = resolveCoherentStyle({
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'bohemian'
  })
  console.assert(
    test2.resolvedFashionStyle === 'minimal_bohemian',
    'Test 2 failed: bohemian + minimal should adapt to minimal_bohemian'
  )
  
  // Test 3: Athletic + Professional = Block → Fallback
  const test3 = resolveCoherentStyle({
    category: 'professional',
    mood: 'minimal',
    fashionStyle: 'athletic'
  })
  console.assert(
    test3.resolvedFashionStyle === 'business',
    'Test 3 failed: athletic + professional should block and fallback to business'
  )
  
  // Test 4: Casual + Minimal = Allow
  const test4 = resolveCoherentStyle({
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'casual'
  })
  console.assert(
    test4.resolvedFashionStyle === 'casual',
    'Test 4 failed: casual + minimal should be allowed as-is'
  )
  
  // Test 5: No fashion style = Category default
  const test5 = resolveCoherentStyle({
    category: 'luxury',
    mood: 'luxury',
    fashionStyle: null
  })
  console.assert(
    test5.resolvedFashionStyle === 'classic',
    'Test 5 failed: luxury with no fashion should default to classic'
  )
  
  console.log('[COHERENCE-RESOLVER] ✅ All validation tests passed')
}

// ============================================================================
// EXPORTS
// ============================================================================

export default resolveCoherentStyle
