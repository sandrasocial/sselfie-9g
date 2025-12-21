/**
 * Type Guards for Studio Pro Mode Safety
 * 
 * These guards ensure Classic mode is never accidentally affected by Pro mode changes.
 */

/**
 * Type guard to validate Studio Pro mode flag
 * Ensures mode is explicitly boolean, never undefined or null
 */
export function isStudioProMode(mode: unknown): mode is boolean {
  return mode === true || mode === false
}

/**
 * Normalize Studio Pro mode to boolean
 * Converts undefined/null to false (Classic mode default)
 */
export function normalizeStudioProMode(mode: unknown): boolean {
  if (mode === true) return true
  if (mode === false) return false
  // Default to Classic mode if undefined/null/invalid
  return false
}

/**
 * Validate that Studio Pro header is safe to use
 * Returns true only if explicitly "true", false otherwise
 */
export function isValidStudioProHeader(header: string | null | undefined): boolean {
  return header === "true"
}

/**
 * Type guard for Studio Pro mode prop in components
 * Ensures prop is explicitly boolean before using in conditionals
 */
export function isValidStudioProProp(prop: unknown): prop is boolean {
  return prop === true || prop === false
}

/**
 * Safety check: Ensure Classic mode generation route is not affected
 * Logs warning if Pro mode is detected in Classic route
 */
export function guardClassicModeRoute(studioProMode: unknown, routeName: string): void {
  if (isStudioProMode(studioProMode) && studioProMode === true) {
    console.warn(`[CLASSIC-MODE-GUARD] Pro mode detected in Classic route: ${routeName}`)
  }
}

/**
 * Safety check: Ensure Pro mode generation route has valid mode
 * Throws error if mode is invalid
 */
export function guardProModeRoute(studioProMode: unknown, routeName: string): void {
  if (!isStudioProMode(studioProMode)) {
    throw new Error(`[PRO-MODE-GUARD] Invalid mode in Pro route: ${routeName}. Mode must be boolean.`)
  }
}






















