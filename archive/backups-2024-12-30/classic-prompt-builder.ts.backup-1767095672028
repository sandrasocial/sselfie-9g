/**
 * Classic Mode Prompt Builder v2 (Flux-Optimized)
 * 
 * CHANGELOG v1 → v2:
 * - Removed hard truncation (Flux can handle longer prompts)
 * - Added validation for required elements
 * - Added photography style support (authentic/editorial)
 * - Returns metadata (wordCount, validated, warnings)
 * - Better error logging
 * 
 * NOT INCLUDED (Flux limitations):
 * - No negative prompts (Flux doesn't support them)
 * - No hard word count enforcement (Flux is flexible 30-80+)
 */

// UPDATED INTERFACES
export interface ClassicPromptContext {
  triggerWord: string
  userGender: string
  userEthnicity?: string
  physicalPreferences?: string
  outfit: string
  location: string
  lighting: string
  pose: string
  mood?: string
  photographyStyle?: 'authentic' | 'editorial' // NEW
}

// NEW - Return metadata instead of just string
export interface ClassicPromptResult {
  prompt: string
  wordCount: number
  validated: boolean
  warnings: string[]
}

// NEW - Constants
const MIN_WORDS = 30
const MAX_WORDS = 80  // Soft limit - Flux can handle longer, just warns

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Clean physical preferences by removing instruction phrases
 * "don't change my long hair" → "long hair"
 */
function cleanPhysicalPreferences(prefs: string): string {
  if (!prefs || prefs.trim().length === 0) return ''
  
  // Remove instruction phrases, keep only descriptors
  const cleaned = prefs
    .replace(/\b(don't|do not|doesn't|keep my|maintain|preserve|keep the|the same)\s+/gi, '')
    .trim()
  
  // Validate result makes sense (at least 2 words)
  const words = cleaned.split(/\s+/)
  if (words.length < 2) {
    return '' // Too vague after cleaning
  }
  
  return cleaned
}

/**
 * Validate lighting and replace banned terms
 * Banned: dramatic, cinematic, perfect, studio lighting
 */
function validateLighting(lighting: string): string {
  if (!lighting || lighting.trim().length === 0) {
    return 'natural window lighting with soft shadows'
  }
  
  const bannedTerms = [
    'dramatic',
    'cinematic', 
    'perfect',
    'studio lighting',
    'professional lighting'
  ]
  
  const lowerLighting = lighting.toLowerCase()
  
  // Check for banned terms
  for (const term of bannedTerms) {
    if (lowerLighting.includes(term)) {
      console.warn(`⚠️ Classic Mode: Lighting contains banned term "${term}", replacing`)
      return 'natural window lighting with soft shadows'
    }
  }
  
  // Ensure "natural" or "uneven" is mentioned
  if (!lowerLighting.includes('natural') && !lowerLighting.includes('uneven')) {
    return `natural ${lighting}`
  }
  
  return lighting
}

/**
 * Get camera specs based on photography style
 */
function getCameraSpecs(style: 'authentic' | 'editorial' = 'authentic'): string {
  if (style === 'editorial') {
    return 'professional DSLR photography, 85mm f/1.4 lens, magazine quality'
  }
  return 'shot on iPhone 15 Pro portrait mode, shallow depth of field'
}

/**
 * Get authenticity markers based on photography style
 */
function getAuthenticityMarkers(style: 'authentic' | 'editorial' = 'authentic'): string {
  if (style === 'editorial') {
    return 'professional photography, polished aesthetic, high-end fashion editorial, flawless skin'
  }
  return 'candid photo, natural skin texture with pores visible, film grain, muted colors'
}

/**
 * Validate prompt contains all required elements
 */
function validatePrompt(prompt: string, context: ClassicPromptContext): boolean {
  const promptLower = prompt.toLowerCase()
  
  const checks = {
    hasTrigger: promptLower.startsWith(context.triggerWord.toLowerCase()),
    hasOutfit: /\b(in|wearing|outfit|blouse|shirt|dress|sweater|jacket|trousers|pants|skirt|jeans)\b/i.test(prompt),
    hasLocation: /\b(room|cafe|street|office|kitchen|restaurant|park|bar|rooftop|terrace|home|building|space)\b/i.test(prompt),
    hasCamera: /iphone|portrait mode|dslr|professional photography|camera/i.test(prompt),
  }
  
  const missing = Object.entries(checks)
    .filter(([_, pass]) => !pass)
    .map(([key]) => key)
  
  if (missing.length > 0) {
    console.error('❌ Classic Mode: Prompt validation failed')
    console.error(`   Missing elements: ${missing.join(', ')}`)
    console.error(`   Prompt: ${prompt}`)
    return false
  }
  
  return true
}

/**
 * Build a Flux-optimized prompt for Classic mode
 * 
 * Returns prompt + metadata for debugging and quality tracking
 */
export function buildClassicPrompt(
  context: ClassicPromptContext
): ClassicPromptResult {
  const warnings: string[] = []
  const parts: string[] = []
  
  // =============================================================================
  // PART 1: TRIGGER WORD (Required, always first)
  // =============================================================================
  parts.push(context.triggerWord)
  
  // =============================================================================
  // PART 2: ETHNICITY (If specified)
  // =============================================================================
  if (context.userEthnicity) {
    parts.push(context.userEthnicity)
  }
  
  // =============================================================================
  // PART 3: GENDER (Required)
  // =============================================================================
  parts.push(context.userGender)
  
  // =============================================================================
  // PART 4: PHYSICAL PREFERENCES (Cleaned, descriptive only)
  // =============================================================================
  if (context.physicalPreferences) {
    const cleanPrefs = cleanPhysicalPreferences(context.physicalPreferences)
    if (cleanPrefs) {
      parts.push(cleanPrefs)
    }
  }
  
  // =============================================================================
  // PART 5: OUTFIT (Required, detailed)
  // =============================================================================
  if (!context.outfit || context.outfit.trim().length === 0) {
    warnings.push('Missing outfit - using default')
    parts.push('in casual outfit')
  } else {
    parts.push(context.outfit)
  }
  
  // =============================================================================
  // PART 6: LOCATION (Required, can be simple)
  // =============================================================================
  if (!context.location || context.location.trim().length === 0) {
    warnings.push('Missing location - using default')
    parts.push('in neutral setting')
  } else {
    parts.push(context.location)
  }
  
  // =============================================================================
  // PART 7: LIGHTING (Validated for banned terms)
  // =============================================================================
  const originalLighting = context.lighting
  const validatedLighting = validateLighting(originalLighting)
  
  if (validatedLighting !== originalLighting) {
    warnings.push(`Lighting adjusted: removed banned terms`)
  }
  
  parts.push(validatedLighting)
  
  // =============================================================================
  // PART 8: POSE/ACTION (Required)
  // =============================================================================
  if (!context.pose || context.pose.trim().length === 0) {
    warnings.push('Missing pose - using default')
    parts.push('standing naturally')
  } else {
    parts.push(context.pose)
  }
  
  // =============================================================================
  // PART 9: MOOD (Optional)
  // =============================================================================
  if (context.mood) {
    parts.push(context.mood)
  }
  
  // =============================================================================
  // PART 10: CAMERA SPECS (Based on photography style)
  // =============================================================================
  const photographyStyle = context.photographyStyle || 'authentic'
  const cameraSpecs = getCameraSpecs(photographyStyle)
  parts.push(cameraSpecs)
  
  // =============================================================================
  // PART 11: AUTHENTICITY MARKERS (Based on photography style)
  // =============================================================================
  const authenticityMarkers = getAuthenticityMarkers(photographyStyle)
  parts.push(authenticityMarkers)
  
  // =============================================================================
  // ASSEMBLE FINAL PROMPT
  // =============================================================================
  const prompt = parts.join(', ').trim()
  
  // =============================================================================
  // WORD COUNT CHECK (Warn only, DON'T truncate)
  // =============================================================================
  const wordCount = prompt.split(/\s+/).length
  
  if (wordCount < MIN_WORDS) {
    warnings.push(`Prompt short: ${wordCount} words (target: ${MIN_WORDS}-${MAX_WORDS})`)
    console.warn(`⚠️ Classic Mode: Short prompt (${wordCount} words)`)
  } else if (wordCount > MAX_WORDS) {
    warnings.push(`Prompt long: ${wordCount} words (target: ${MIN_WORDS}-${MAX_WORDS}, but OK)`)
    console.info(`ℹ️ Classic Mode: Long prompt (${wordCount} words) - Flux can handle this`)
  }
  
  // =============================================================================
  // VALIDATION
  // =============================================================================
  const validated = validatePrompt(prompt, context)
  
  if (!validated) {
    warnings.push('Prompt failed validation - missing required elements')
  }
  
  // =============================================================================
  // LOGGING
  // =============================================================================
  if (warnings.length > 0) {
    console.warn(`⚠️ Classic Mode Warnings: ${warnings.join('; ')}`)
  }
  
  if (validated && wordCount >= MIN_WORDS && wordCount <= MAX_WORDS) {
    console.log(`✅ Classic Mode: Generated ${wordCount}-word prompt successfully`)
  }
  
  // =============================================================================
  // RETURN RESULT
  // =============================================================================
  return {
    prompt,
    wordCount,
    validated,
    warnings
  }
}

/**
 * BACKWARD COMPATIBILITY WRAPPER
 * 
 * For code that still expects just a string, not the full result object.
 * This allows gradual migration across the codebase.
 */
export function buildClassicPromptLegacy(
  context: ClassicPromptContext
): string {
  const result = buildClassicPrompt(context)
  return result.prompt
}

// Export both for flexibility
export { buildClassicPrompt as buildClassicPromptV2 }














