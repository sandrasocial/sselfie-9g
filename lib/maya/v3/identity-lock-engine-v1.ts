/**
 * Identity Lock Engine V1
 * Lightweight identity descriptors for FLUX Custom LoRA
 * Ensures facial identity dominance without overpowering the LoRA
 */

export interface IdentityLockConfig {
  userFeatures?: string[] // Optional user-specific features from settings
  gender?: string
  ethnicity?: string
}

export function buildIdentityLock(config: IdentityLockConfig): string {
  const parts: string[] = ["clear facial structure", "recognizable features", "consistent likeness"]

  // Add user-specific features if provided
  if (config.userFeatures && config.userFeatures.length > 0) {
    // Only add 2-4 lightweight descriptors
    const safeFeatures = config.userFeatures.slice(0, 4).filter((feature) => {
      const lower = feature.toLowerCase()
      // Reject anything that modifies core identity
      const forbidden = ["age", "race", "skin tone", "face shape", "younger", "older"]
      return !forbidden.some((word) => lower.includes(word))
    })

    parts.push(...safeFeatures)
  }

  return parts.join("; ")
}

/**
 * Extract user features from user context
 * Safe features: freckles, dimples, hair length/style, tattoos, piercings
 */
export function extractUserFeatures(userContext: any): string[] {
  const features: string[] = []

  // Check physical_preferences field
  if (userContext.physicalPreferences) {
    const prefs = userContext.physicalPreferences.toLowerCase()

    if (prefs.includes("freckle")) features.push("freckles")
    if (prefs.includes("dimple")) features.push("dimples")
    if (prefs.includes("long hair")) features.push("long hair")
    if (prefs.includes("short hair")) features.push("short hair")
    if (prefs.includes("curly hair") || prefs.includes("curly")) features.push("curly hair")
    if (prefs.includes("straight hair") || prefs.includes("straight")) features.push("straight hair")
    if (prefs.includes("tattoo")) features.push("tattoo")
    if (prefs.includes("piercing")) features.push("piercings")
  }

  return features
}
