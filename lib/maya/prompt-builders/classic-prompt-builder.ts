/**
 * Classic Mode Prompt Builder (Flux)
 * 
 * Builds prompts for Classic mode using Flux model.
 * Natural language, 30-60 words, iPhone aesthetic, trigger words.
 */

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
}

/**
 * Build a Flux-optimized prompt for Classic mode
 */
export function buildClassicPrompt(context: ClassicPromptContext): string {
  const parts: string[] = []
  
  // Start with trigger word
  parts.push(context.triggerWord)
  
  // Add ethnicity if specified
  if (context.userEthnicity) {
    parts.push(context.userEthnicity)
  }
  
  // Add gender
  parts.push(context.userGender)
  
  // Add physical preferences (converted to descriptive only)
  if (context.physicalPreferences) {
    // Remove instruction phrases like "don't change" or "keep my"
    const cleanPrefs = context.physicalPreferences
      .replace(/\b(don't|do not|keep my|maintain|preserve)\s+/gi, "")
      .trim()
    if (cleanPrefs) {
      parts.push(cleanPrefs)
    }
  }
  
  // Add outfit
  parts.push(context.outfit)
  
  // Add location (keep it simple)
  parts.push(context.location)
  
  // Add lighting (natural, uneven, mixed)
  parts.push(context.lighting)
  
  // Add pose/action
  parts.push(context.pose)
  
  // Add mood if specified
  if (context.mood) {
    parts.push(context.mood)
  }
  
  // Add camera specs (iPhone)
  parts.push("shot on iPhone 15 Pro portrait mode, shallow depth of field")
  
  // Add authenticity markers
  parts.push("candid photo, natural skin texture with pores visible, film grain, muted colors")
  
  // Join and return
  let prompt = parts.join(", ").trim()
  
  // Ensure it's 30-60 words
  const wordCount = prompt.split(/\s+/).length
  if (wordCount > 60) {
    // Trim if too long
    const words = prompt.split(/\s+/)
    prompt = words.slice(0, 60).join(" ")
  }
  
  return prompt
}














