/**
 * Fashion Style Mapper
 * 
 * Maps fashion styles from the brand profile wizard to vibe library styles.
 * Handles differences in naming conventions.
 */

/**
 * Maps fashion style from wizard/onboarding to vibe library format
 * 
 * Wizard styles: casual, business, trendy, timeless
 * Vibe library styles: business, casual, bohemian, classic, trendy, athletic
 * 
 * @param wizardStyle - Style from brand profile wizard
 * @returns Mapped style for vibe library (defaults to 'business')
 */
export function mapFashionStyleToVibeLibrary(wizardStyle: string | null | undefined): string {
  if (!wizardStyle) {
    return 'business' // Default
  }
  
  const style = wizardStyle.toLowerCase().trim()
  
  // Direct mappings
  const styleMap: Record<string, string> = {
    'casual': 'casual',
    'business': 'business',
    'business professional': 'business',
    'trendy': 'trendy',
    'trendy/fashion-forward': 'trendy',
    'fashion-forward': 'trendy',
    'timeless': 'classic',
    'timeless classic': 'classic',
    'classic': 'classic',
    'bohemian': 'bohemian',
    'athletic': 'athletic',
  }
  
  // Try exact match first
  if (styleMap[style]) {
    return styleMap[style]
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(styleMap)) {
    if (style.includes(key) || key.includes(style)) {
      return value
    }
  }
  
  // Default to business if no match
  console.warn(`[Fashion Style Mapper] Unknown fashion style "${wizardStyle}", defaulting to "business"`)
  return 'business'
}

/**
 * Validates that a fashion style is valid for vibe libraries
 * 
 * @param style - Style to validate
 * @returns True if valid, false otherwise
 */
export function isValidFashionStyle(style: string): boolean {
  const validStyles = ['business', 'casual', 'bohemian', 'classic', 'trendy', 'athletic']
  return validStyles.includes(style.toLowerCase().trim())
}
