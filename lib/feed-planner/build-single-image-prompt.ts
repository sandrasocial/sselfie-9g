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
 * Parses template and extracts frame descriptions, vibe, setting, and color grade
 * 
 * @param templatePrompt - Full template prompt from BLUEPRINT_PHOTOSHOOT_TEMPLATES
 * @returns Object containing array of frames, vibe, setting, and color grade
 */
export function parseTemplateFrames(templatePrompt: string): {
  frames: Array<{ position: number; description: string }>
  vibe: string
  setting: string
  colorGrade: string
} {
  const frames: Array<{ position: number; description: string }> = []
  
  // Extract vibe section (everything after "Vibe:" until next section)
  const vibeMatch = templatePrompt.match(/Vibe:\s*([^\n]+(?:\n(?!Setting:|Outfits:|9 frames:)[^\n]+)*)/i)
  const vibe = vibeMatch ? vibeMatch[1].trim() : ''
  
  // Extract setting section (everything after "Setting:" until next section)
  const settingMatch = templatePrompt.match(/Setting:\s*([^\n]+(?:\n(?!Outfits:|9 frames:|Color grade:)[^\n]+)*)/i)
  const setting = settingMatch ? settingMatch[1].trim() : ''
  
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
  
  return { frames, vibe, setting, colorGrade }
}

/**
 * Base identity prompt for NanoBanana Pro
 * This is fixed for all generations to maintain identity consistency
 * Updated to include explicit reference image language per NanoBanana Pro best practices
 */
const BASE_IDENTITY_PROMPT = "Use the uploaded photos as strict identity reference. Influencer/pinterest style of a woman maintaining exactly the same physical characteristics (face, body, skin tone, hair) as the reference images."

/**
 * Detects frame type from frame description
 * Used to determine how location descriptions should be formatted
 */
export function detectFrameType(description: string): 'flatlay' | 'closeup' | 'fullbody' | 'midshot' {
  const lower = description.toLowerCase()
  
  // Check for flatlay indicators
  if (lower.includes('flatlay') || lower.includes('overhead') || lower.includes('overhead view') || lower.includes('overhead flatlay')) {
    return 'flatlay'
  }
  
  // Check for closeup indicators
  if (lower.includes('close-up') || lower.includes('closeup') || lower.includes('close up') || lower.includes('close-up of') || lower.includes('extreme close')) {
    return 'closeup'
  }
  
  // Check for fullbody indicators
  if (lower.includes('full-body') || lower.includes('fullbody') || lower.includes('full body')) {
    return 'fullbody'
  }
  
  // Default to midshot for everything else
  return 'midshot'
}

/**
 * Cleans frame description for flatlay and closeup scenes
 * Removes redundant location details and ambient descriptions
 */
function cleanFrameDescription(description: string, frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'): string {
  if (frameType === 'flatlay') {
    // For flatlay, remove redundant location details that might have been injected
    // Keep: items, surface, lighting, camera angle
    // Remove: full location descriptions with ambient details
    
    let cleaned = description
    
    // Pattern 1: Find "on [location]" and replace with simplified surface description
    // Example: "Coffee and accessories on Luxurious hotel lobby with floor-to-ceiling dark marble walls..." 
    // Should become: "Coffee and accessories on dark marble surface"
    cleaned = cleaned.replace(/on\s+([^-\n\.]+?)(?=\s*-\s*(overhead|flatlay)|\.|$)/gi, (match, locationText) => {
      // Extract surface/material keywords from the location text
      const lowerText = locationText.toLowerCase()
      
      // Look for material keywords
      if (lowerText.includes('marble')) {
        // Extract color if present
        const colorMatch = locationText.match(/(dark|light|black|white|grey|gray|beige)/i)
        const color = colorMatch ? colorMatch[0].toLowerCase() : 'dark'
        return `on ${color} marble surface`
      }
      if (lowerText.includes('wood') || lowerText.includes('wooden')) {
        return 'on wooden surface'
      }
      if (lowerText.includes('concrete')) {
        return 'on concrete surface'
      }
      if (lowerText.includes('stone')) {
        return 'on stone surface'
      }
      if (lowerText.includes('glass')) {
        return 'on glass surface'
      }
      if (lowerText.includes('metal')) {
        return 'on metal surface'
      }
      if (lowerText.includes('table') || lowerText.includes('desk') || lowerText.includes('counter')) {
        // Extract material if mentioned
        const materialMatch = locationText.match(/(marble|wood|concrete|stone|glass|metal)/i)
        if (materialMatch) {
          return `on ${materialMatch[0].toLowerCase()} ${lowerText.includes('table') ? 'table' : lowerText.includes('desk') ? 'desk' : 'counter'}`
        }
        return lowerText.includes('table') ? 'on table' : lowerText.includes('desk') ? 'on desk' : 'on counter'
      }
      
      // Fallback: just "on surface"
      return 'on surface'
    })
    
    // Pattern 2: Remove sentences with ambient details that come after the location
    // These are usually separate sentences after the location description
    // Example: ". Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones."
    cleaned = cleaned.replace(/\.\s*[A-Z][^.]*?(ambient|atmosphere|furniture|fixtures|creates|designer|interior|exterior|floor-to-ceiling|geometric patterns|moody atmosphere)[^.]*\./gi, '')
    
    // Pattern 3: Remove any remaining location context that's part of the same sentence
    // Example: "Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns"
    // Should be simplified to just the surface
    cleaned = cleaned.replace(/\s+(lobby|room|space|interior|exterior|hotel|building|venue|location)\s+[^,\-\.]+/gi, '')
    
    // Pattern 4: Clean up any double spaces or extra punctuation
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim()
    
    return cleaned
  }
  
  if (frameType === 'closeup') {
    // For closeup, remove location descriptions entirely
    // Keep: accessory/outfit detail, minimal context, lighting
    
    let cleaned = description
    
    // Remove location descriptions (usually after "on" or "in" or "at")
    // Pattern: "Close-up accessory on [location]" -> "Close-up accessory"
    cleaned = cleaned.replace(/\s+(on|in|at)\s+[^,\-\.]+(?=[,\-\.]|$)/gi, '')
    
    // Remove full sentences with location/ambient details
    cleaned = cleaned.replace(/\.\s*[A-Z][^.]*?(ambient|atmosphere|furniture|fixtures|creates|designer|interior|exterior|lobby|room|space|location)[^.]*\./gi, '')
    
    // Remove any remaining location context that's too detailed
    // Keep only essential closeup details: accessory, pose, lighting
    const parts = cleaned.split(/[,\-]/)
    const essentialParts = parts.filter(part => {
      const lower = part.toLowerCase()
      return !lower.includes('lobby') && 
             !lower.includes('room') && 
             !lower.includes('interior') && 
             !lower.includes('exterior') &&
             !lower.includes('furniture') &&
             !lower.includes('ambient')
    })
    
    return essentialParts.join(', ').trim()
  }
  
  // For fullbody/midshot, return as-is (full location descriptions are appropriate)
  return description
}

/**
 * Builds complete NanoBanana prompt for single image generation
 * 
 * Structure:
 * 1. Base identity prompt (fixed)
 * 2. Vibe context (from template)
 * 3. Setting context (from template)
 * 4. Frame description (from template, position-specific, cleaned for frame type)
 * 5. Color grade (from template)
 * 
 * @param templatePrompt - Full template prompt from BLUEPRINT_PHOTOSHOOT_TEMPLATES (should already have placeholders replaced)
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
  
  // Parse template to extract frames, vibe, setting, and color grade
  const { frames, vibe, setting, colorGrade } = parseTemplateFrames(templatePrompt)
  
  // Find frame for this position
  const frame = frames.find(f => f.position === position)
  if (!frame) {
    throw new Error(`Frame ${position} not found in template. Available frames: ${frames.map(f => f.position).join(', ')}`)
  }
  
  // Detect frame type for cleanup
  const frameType = detectFrameType(frame.description)
  
  // Clean frame description based on frame type
  const cleanedFrameDescription = cleanFrameDescription(frame.description, frameType)
  
  // Build complete prompt with all context
  // Structure: Base identity (for user photos only) + Vibe + Setting + Frame description (cleaned) + Color grade
  // Use natural language joining (space separated) for coherent sentence structure
  const promptParts: string[] = []
  
  // Only add identity prompt for user photos (not flatlays)
  if (frameType !== 'flatlay') {
    promptParts.push(BASE_IDENTITY_PROMPT)
  }
  
  // Add vibe context if available (as natural language, not label)
  if (vibe && vibe.length > 0) {
    promptParts.push(`with ${vibe} aesthetic`)
  }
  
  // Add setting context if available (as natural language, not label)
  if (setting && setting.length > 0) {
    promptParts.push(`in ${setting}`)
  }
  
  // Add cleaned frame description (already natural language)
  promptParts.push(cleanedFrameDescription)
  
  // Add color grade (as natural language, not label)
  if (colorGrade && colorGrade.length > 0) {
    promptParts.push(`with ${colorGrade} color palette`)
  }
  
  // Join with spaces for natural language flow (identity anchor is always first)
  return promptParts.join(' ').trim()
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
  hasVibe: boolean
  hasSetting: boolean
  hasColorGrade: boolean
  frameCount: number
  missingSections: string[]
} {
  const { frames, vibe, setting, colorGrade } = parseTemplateFrames(templatePrompt)
  
  const missingSections: string[] = []
  
  if (frames.length === 0) {
    missingSections.push('9 frames section')
  }
  
  if (!vibe || vibe.length === 0) {
    missingSections.push('Vibe section')
  }
  
  if (!setting || setting.length === 0) {
    missingSections.push('Setting section')
  }
  
  if (!colorGrade || colorGrade.length === 0) {
    missingSections.push('Color grade section')
  }
  
  const isValid = missingSections.length === 0 && frames.length === 9
  
  return {
    isValid,
    hasFrames: frames.length > 0,
    hasVibe: vibe.length > 0,
    hasSetting: setting.length > 0,
    hasColorGrade: colorGrade.length > 0,
    frameCount: frames.length,
    missingSections
  }
}

/**
 * Cleans blueprint prompt by removing ONLY unreplaced placeholders
 * 
 * IMPORTANT: This function ONLY removes placeholders like {{LOCATION_ARCHITECTURAL_1}}
 * It does NOT remove:
 * - Grid instructions ("Create a 3x3 grid...")
 * - Section headers ("Vibe:", "Setting:", "9 frames:", "Color grade:")
 * - Any other template structure
 * 
 * This is used for preview feeds which need the full template structure.
 * 
 * @param prompt - Prompt that may contain unreplaced placeholders
 * @returns Prompt with placeholders removed, everything else intact
 */
export function cleanBlueprintPrompt(prompt: string): string {
  if (!prompt || prompt.trim().length === 0) {
    return prompt
  }

  // Remove ONLY unreplaced placeholders ({{...}})
  // Everything else stays exactly as is
  const cleaned = prompt.replace(/\{\{[^}]+\}\}/g, '')
  
  // Clean up any double spaces that might result from placeholder removal
  const finalCleaned = cleaned.replace(/\s{2,}/g, ' ').trim()

  return finalCleaned
}
