/**
 * Template Placeholder System
 * 
 * Handles placeholder replacement in blueprint photoshoot templates.
 * Placeholders are replaced with dynamic content from vibe libraries.
 */

// ============================================================================
// PLACEHOLDER DEFINITIONS
// ============================================================================

/**
 * Template placeholder values that will be injected into templates
 */
export interface TemplatePlaceholders {
  // Outfit placeholders (full-body scenes)
  OUTFIT_FULLBODY_1: string  // Frame 1
  OUTFIT_FULLBODY_2: string  // Frame 3
  OUTFIT_FULLBODY_3: string  // Frame 8
  OUTFIT_FULLBODY_4: string  // Frame 9
  
  // Outfit placeholders (mid-shot scenes)
  OUTFIT_MIDSHOT_1: string   // Frame 2
  OUTFIT_MIDSHOT_2: string   // Frame 5
  
  // Accessory/flatlay placeholders
  ACCESSORY_CLOSEUP_1: string  // Frame 4
  ACCESSORY_FLATLAY_1: string   // Frame 6
  ACCESSORY_FLATLAY_2: string   // Frame 7
  
  // Location placeholders
  LOCATION_OUTDOOR_1: string
  LOCATION_INDOOR_1: string
  LOCATION_INDOOR_2: string
  LOCATION_INDOOR_3: string
  LOCATION_ARCHITECTURAL_1: string
  
  // Styling details
  LIGHTING_EVENING: string
  LIGHTING_BRIGHT: string
  LIGHTING_AMBIENT: string
  STYLING_NOTES: string
  COLOR_PALETTE: string
  TEXTURE_NOTES: string
}

// ============================================================================
// PLACEHOLDER REPLACEMENT
// ============================================================================

/**
 * Replace placeholders in template string with actual values
 * 
 * @param template - Template string containing placeholders like {{OUTFIT_FULLBODY_1}}
 * @param placeholders - Object containing placeholder values
 * @returns Template with placeholders replaced
 */
export function replacePlaceholders(
  template: string,
  placeholders: Partial<TemplatePlaceholders>
): string {
  // Validate inputs
  if (!template || typeof template !== 'string') {
    console.error('[Template Placeholders] replacePlaceholders called with invalid template:', {
      template,
      type: typeof template
    })
    throw new Error(`Invalid template: expected string, got ${typeof template}`)
  }
  
  if (!placeholders || typeof placeholders !== 'object') {
    console.error('[Template Placeholders] replacePlaceholders called with invalid placeholders:', {
      placeholders,
      type: typeof placeholders
    })
    throw new Error(`Invalid placeholders: expected object, got ${typeof placeholders}`)
  }
  
  let result = template
  
  // Replace each placeholder found in the template
  for (const [key, value] of Object.entries(placeholders)) {
    if (value && typeof value === 'string') {
      // Match {{KEY}} pattern (case-insensitive, handles whitespace)
      const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
      result = result.replace(placeholderPattern, value)
    }
  }
  
  const trimmed = result.trim()
  
  // Validate result is still a string
  if (typeof trimmed !== 'string') {
    console.error('[Template Placeholders] replacePlaceholders returned invalid result:', {
      result: trimmed,
      type: typeof trimmed
    })
    throw new Error(`Placeholder replacement failed: result is not a string`)
  }
  
  return trimmed
}

/**
 * Extract all placeholder keys from a template string
 * 
 * @param template - Template string to analyze
 * @returns Array of unique placeholder keys found
 */
export function extractPlaceholderKeys(template: string): string[] {
  // Validate input
  if (!template || typeof template !== 'string') {
    console.warn('[Template Placeholders] extractPlaceholderKeys called with invalid template:', {
      template,
      type: typeof template
    })
    return []
  }
  
  const keys = new Set<string>()
  
  // Manual parsing approach to avoid regex state issues
  // Split by {{ and }} to find all placeholders
  let i = 0
  while (i < template.length) {
    // Find opening {{
    const openIndex = template.indexOf('{{', i)
    if (openIndex === -1) break
    
    // Find closing }}
    const closeIndex = template.indexOf('}}', openIndex + 2)
    if (closeIndex === -1) break
    
    // Extract the key between {{ and }}
    const key = template.substring(openIndex + 2, closeIndex).trim()
    
    // Validate it's a valid key (only uppercase letters and underscores)
    if (/^[A-Z_]+$/.test(key)) {
      keys.add(key)
    }
    
    // Move past this placeholder
    i = closeIndex + 2
  }
  
  return Array.from(keys).sort()
}

/**
 * Validate that all placeholders in template have corresponding values
 * 
 * @param template - Template string with placeholders
 * @param placeholders - Placeholder values object
 * @returns Validation result with missing placeholders
 */
export function validatePlaceholders(
  template: string,
  placeholders: Partial<TemplatePlaceholders>
): {
  isValid: boolean
  missingPlaceholders: string[]
  unusedPlaceholders: string[]
} {
  const templateKeys = extractPlaceholderKeys(template)
  const providedKeys = new Set(Object.keys(placeholders))
  
  const missingPlaceholders = templateKeys.filter(key => !providedKeys.has(key))
  const unusedPlaceholders = Array.from(providedKeys).filter(
    key => !templateKeys.includes(key)
  )
  
  return {
    isValid: missingPlaceholders.length === 0,
    missingPlaceholders,
    unusedPlaceholders
  }
}
