/**
 * Single Image Prompt Builder
 * 
 * Parses blueprint photoshoot templates and builds complete NanoBanana prompts
 * for individual frame generation.
 * 
 * Each template contains:
 * - Grid description (first paragraph - only used for free mode)
 * - Vibe description
 * - Setting
 * - Outfits
 * - 9 frames: Each frame is a COMPLETE, self-contained scene description
 * - Color grade: Color grading instructions
 * 
 * For paid mode single image generation:
 * - Extract frame description for the requested position
 * - Combine with base identity prompt + color grade
 * - Frame descriptions are COMPLETE and should be used exactly as written
 */

/**
 * Parses template and extracts frame descriptions
 * 
 * @param templatePrompt - Full template prompt from BLUEPRINT_PHOTOSHOOT_TEMPLATES
 * @returns Object containing array of frames and color grade
 */
export function parseTemplateFrames(templatePrompt: string): {
  frames: Array<{ position: number; description: string }>
  colorGrade: string
} {
  const frames: Array<{ position: number; description: string }> = []
  
  // Extract frames section (everything between "9 frames:" and "Color grade:")
  const framesMatch = templatePrompt.match(/9 frames:([\s\S]+?)(?=Color grade:|$)/i)
  
  if (framesMatch) {
    const framesText = framesMatch[1]
    // Split by newlines and parse each frame
    const frameLines = framesText.split('\n')
    
    for (const line of frameLines) {
      // Match pattern: "1. Frame description" or "1. Frame description with - dashes"
      const match = line.match(/^(\d+)\.\s*(.+)$/i)
      if (match) {
        const position = parseInt(match[1], 10)
        const description = match[2].trim()
        
        // Only add if position is valid (1-9) and description is not empty
        if (position >= 1 && position <= 9 && description.length > 0) {
          frames.push({
            position,
            description
          })
        }
      }
    }
  }
  
  // Extract color grade (everything after "Color grade:")
  const colorGradeMatch = templatePrompt.match(/Color grade:\s*([^\n`]+)/i)
  const colorGrade = colorGradeMatch ? colorGradeMatch[1].trim() : ''
  
  return { frames, colorGrade }
}

/**
 * Base identity prompt for NanoBanana Pro
 * This is fixed for all generations to maintain identity consistency
 */
const BASE_IDENTITY_PROMPT = "Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications."

/**
 * Builds complete NanoBanana prompt for single image generation
 * 
 * Structure:
 * 1. Base identity prompt (fixed)
 * 2. Frame description (from template, position-specific)
 * 3. Color grade (from template)
 * 
 * @param templatePrompt - Full template prompt from BLUEPRINT_PHOTOSHOOT_TEMPLATES
 * @param position - Frame position (1-9)
 * @returns Complete prompt for NanoBanana generation
 * @throws Error if frame not found for position
 */
export function buildSingleImagePrompt(
  templatePrompt: string,
  position: number
): string {
  // Validate position
  if (position < 1 || position > 9) {
    throw new Error(`Position must be between 1 and 9, got ${position}`)
  }
  
  // Parse template to extract frames and color grade
  const { frames, colorGrade } = parseTemplateFrames(templatePrompt)
  
  // Find frame for this position
  const frame = frames.find(f => f.position === position)
  if (!frame) {
    throw new Error(`Frame ${position} not found in template. Available frames: ${frames.map(f => f.position).join(', ')}`)
  }
  
  // Build complete prompt
  // Structure: Base identity + Frame description + Color grade
  const prompt = `${BASE_IDENTITY_PROMPT}

${frame.description}

${colorGrade}`
  
  return prompt.trim()
}

/**
 * Validates that a template has all required sections
 * 
 * @param templatePrompt - Template to validate
 * @returns Validation result with missing sections
 */
export function validateTemplate(templatePrompt: string): {
  isValid: boolean
  hasFrames: boolean
  hasColorGrade: boolean
  frameCount: number
  missingSections: string[]
} {
  const { frames, colorGrade } = parseTemplateFrames(templatePrompt)
  
  const missingSections: string[] = []
  
  if (frames.length === 0) {
    missingSections.push('9 frames section')
  }
  
  if (!colorGrade || colorGrade.length === 0) {
    missingSections.push('Color grade section')
  }
  
  const isValid = missingSections.length === 0 && frames.length === 9
  
  return {
    isValid,
    hasFrames: frames.length > 0,
    hasColorGrade: colorGrade.length > 0,
    frameCount: frames.length,
    missingSections
  }
}
