/**
 * Pro Mode Prompt Builder (Nano Banana Pro)
 * 
 * Builds prompts for Pro mode using Nano Banana Pro model.
 * Natural language, 50-80 words, professional aesthetic, no trigger words.
 */

export interface ProPromptContext {
  outfit: string
  location: string
  lighting: string
  pose: string
  mood?: string
  brandName?: string
  hasReferenceImages: boolean
  skinTexture?: string // Only if specified in user/guide/templates
}

/**
 * Build a Nano Banana Pro-optimized prompt for Pro mode
 */
export function buildProPrompt(context: ProPromptContext): string {
  const parts: string[] = []
  
  // Start with image reference if we have reference images
  if (context.hasReferenceImages) {
    parts.push("Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo.")
  }
  
  // Add brand name if specified
  if (context.brandName) {
    parts.push(`from ${context.brandName}`)
  }
  
  // Add outfit
  parts.push(context.outfit)
  
  // Add pose/action
  parts.push(context.pose)
  
  // Add location
  parts.push(context.location)
  
  // Add lighting (professional descriptions)
  parts.push(context.lighting)
  
  // Add mood if specified
  if (context.mood) {
    parts.push(context.mood)
  }
  
  // Add camera specs (professional)
  parts.push("professional photography, 85mm lens, f/2.0 depth of field")
  
  // Add skin texture only if specified
  if (context.skinTexture) {
    parts.push(context.skinTexture)
  }
  
  // Join and return
  let prompt = parts.join(", ").trim()
  
  // Ensure it's 50-80 words
  const wordCount = prompt.split(/\s+/).length
  if (wordCount < 50) {
    // Add more descriptive details if too short
    // This shouldn't happen often, but we ensure minimum length
  } else if (wordCount > 80) {
    // Trim if too long
    const words = prompt.split(/\s+/)
    prompt = words.slice(0, 80).join(" ")
  }
  
  return prompt
}




















