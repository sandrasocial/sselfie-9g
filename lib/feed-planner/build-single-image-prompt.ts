/**
 * Single Image Prompt Builder
 * 
 * ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
 * This file must NOT decide prompt content
 * 
 * Feed Planner now uses scene-resolver.ts + prompt-shaper.ts (THE AUTHORITY).
 * This parser is legacy and should NOT be used for Feed Planner prompts.
 * 
 * This file may:
 * - Pass data
 * - Call the authority
 * - Format UI
 * 
 * It may NOT:
 * - Build strings for Feed Planner
 * - Modify Feed Planner prompt text
 * - Inject scene descriptions for Feed Planner
 * 
 * Parses blueprint photoshoot templates and builds complete NanoBanana prompts
 * for individual frame generation (LEGACY ONLY - NOT FOR FEED PLANNER).
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
 * REFACTORED: Now supports natural language templates (no headers, narrative prose)
 * Also supports old format for backward compatibility
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
  let vibe = ''
  let setting = ''
  let colorGrade = ''
  
  // Check if this is the new natural language format (no headers)
  const isNaturalLanguageFormat = !templatePrompt.includes('Vibe:') && !templatePrompt.includes('9 frames:')
  
  if (isNaturalLanguageFormat) {
    // NEW FORMAT: Natural language prose
    // Extract vibe from "The aesthetic is..." paragraph (may span multiple sentences)
    const vibeMatch = templatePrompt.match(/The aesthetic is ([^\.]+(?:\.[^\.]+)*?)(?=\.\s*The (?:setting|photography|first frame))/is)
    if (vibeMatch) {
      vibe = vibeMatch[1].trim()
    } else {
      // Fallback: get first sentence after "The aesthetic is"
      const vibeFallback = templatePrompt.match(/The aesthetic is ([^\.]+)/i)
      vibe = vibeFallback ? vibeFallback[1].trim() : ''
    }
    
    // Extract setting from "The setting spans..." paragraph
    const settingMatch = templatePrompt.match(/The setting spans ([^\.]+(?:\.[^\.]+)*?)(?=\.\s*The (?:outfits|first frame))/is)
    if (settingMatch) {
      setting = settingMatch[1].trim()
    } else {
      // Fallback: get first sentence after "The setting spans"
      const settingFallback = templatePrompt.match(/The setting spans ([^\.]+)/i)
      setting = settingFallback ? settingFallback[1].trim() : ''
    }
    
    // Extract frames by looking for "The first frame...", "The second frame...", etc.
    // Each frame description may span multiple sentences until the next frame
    const frameOrdinals = [
      { ordinal: 'first', position: 1 },
      { ordinal: 'second', position: 2 },
      { ordinal: 'third', position: 3 },
      { ordinal: 'fourth', position: 4 },
      { ordinal: 'fifth', position: 5 },
      { ordinal: 'sixth', position: 6 },
      { ordinal: 'seventh', position: 7 },
      { ordinal: 'eighth', position: 8 },
      { ordinal: 'ninth', position: 9 },
    ]
    
    // Extract all frames at once by splitting on frame markers
    // Frames are written as "The first frame... The second frame..." etc., sometimes on the same line
    for (const { ordinal, position } of frameOrdinals) {
      // Find the start of this frame (case-insensitive)
      const frameStartMarker = `The ${ordinal} frame `
      const frameStartIndex = templatePrompt.toLowerCase().indexOf(frameStartMarker.toLowerCase())
      
      if (frameStartIndex === -1) continue
      
      // Find the start of the next frame or color grade section
      let frameEndIndex = templatePrompt.length
      const nextOrdinals = frameOrdinals.filter(f => f.position > position)
      
      for (const nextFrame of nextOrdinals) {
        const nextMarker = `The ${nextFrame.ordinal} frame `
        const nextIndex = templatePrompt.toLowerCase().indexOf(nextMarker.toLowerCase(), frameStartIndex)
        if (nextIndex !== -1 && nextIndex < frameEndIndex) {
          frameEndIndex = nextIndex
        }
      }
      
      // Also check for color grade section
      const colorGradeMarker = 'The color grade features'
      const colorGradeIndex = templatePrompt.toLowerCase().indexOf(colorGradeMarker.toLowerCase(), frameStartIndex)
      if (colorGradeIndex !== -1 && colorGradeIndex < frameEndIndex) {
        frameEndIndex = colorGradeIndex
      }
      
      // Extract the frame description
      const frameText = templatePrompt.substring(frameStartIndex, frameEndIndex)
      // Remove the "The [ordinal] frame " prefix (case-insensitive)
      const description = frameText.replace(new RegExp(`^The ${ordinal} frame `, 'i'), '').trim()
      
      // Clean up: remove trailing period and whitespace
      const cleanedDescription = description.replace(/\.\s*$/, '').trim()
      
      if (cleanedDescription.length > 0) {
        frames.push({
          position,
          description: cleanedDescription
        })
      }
    }
    
    // Extract color grade from "The color grade features..." paragraph
    const colorGradeMatch = templatePrompt.match(/The color grade features ([^\.]+(?:\.[^\.]+)*)/is)
    if (colorGradeMatch) {
      colorGrade = colorGradeMatch[1].trim()
    } else {
      // Fallback: get everything after "The color grade features" until end
      const colorGradeFallback = templatePrompt.match(/The color grade features (.+)/is)
      colorGrade = colorGradeFallback ? colorGradeFallback[1].trim() : ''
    }
    
  } else {
    // OLD FORMAT: Template headers (backward compatibility)
    // Extract vibe section (everything after "Vibe:" until next section)
    const vibeMatch = templatePrompt.match(/Vibe:\s*([^\n]+(?:\n(?!Setting:|Outfits:|9 frames:)[^\n]+)*)/i)
    vibe = vibeMatch ? vibeMatch[1].trim() : ''
    
    // Extract setting section (everything after "Setting:" until next section)
    const settingMatch = templatePrompt.match(/Setting:\s*([^\n]+(?:\n(?!Outfits:|9 frames:|Color grade:)[^\n]+)*)/i)
    setting = settingMatch ? settingMatch[1].trim() : ''
    
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
    colorGrade = colorGradeMatch ? colorGradeMatch[1].trim() : ''
  }
  
  return { frames, vibe, setting, colorGrade }
}

/**
 * Base identity prompt for NanoBanana Pro
 * This is fixed for all generations to maintain identity consistency
 * Updated to include explicit reference image language per NanoBanana Pro best practices
 */
const BASE_IDENTITY_PROMPT = "Maintain strict identity consistency using uploaded reference images. Preserve exact physical characteristics: face structure, body proportions, skin tone, and hair texture. Influencer-style photography with authentic, natural presentation."

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
 * Builds complete NanoBanana prompt for single image generation
 * 
 * Phase P0: Enhanced with Scene Contract enforcement
 * Phase 1A: Enhanced with BrandKit injection
 * 
 * Structure:
 * 1. STYLE LOCK (global brand realism + NanoBanana rules)
 * 2. USER BRAND PROFILE (Phase 1A: injected from BrandKit)
 * 3. SCENE DNA (verbatim scene spec from scene library)
 * 4. USER / BRAND KIT VARIABLES (only fill slots, do not rewrite scene)
 * 5. CAMERA + COMPOSITION
 * 6. QUALITY CONSTRAINTS (sharpness, realism, no artifacts)
 * 7. NEGATIVE RULES
 * 
 * @param templatePrompt - Full template prompt from BLUEPRINT_PHOTOSHOOT_TEMPLATES (should already have placeholders replaced)
 * @param position - Frame position (1-9), maps deterministically to sceneId
 * @param brandKit - Optional BrandKit for brand profile injection (Phase 1A)
 * @returns Complete prompt for NanoBanana generation
 * @throws Error if frame not found for position
 */
export async function buildSingleImagePrompt(
  templatePrompt: string,
  position: number,
  brandKit?: {
    brandVibe?: string | null
    fashionStyle?: string[] | null
    visualAesthetic?: string[] | null
    colorPalette?: {
      primary?: string | null
      secondary?: string | null
      accent?: string | null
    } | null
    communicationVoice?: string[] | null
    brandVoice?: string | null
    targetAudience?: string | null
    settingsPreference?: string[] | null
    contentPillars?: string | null
    businessType?: string | null
  } | null,
  category?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" | null,
  mood?: "luxury" | "minimal" | "beige" | null
): Promise<string> {
  // Validate position
  if (position < 1 || position > 9) {
    throw new Error(`Position must be between 1 and 9, got ${position}`)
  }
  
  // Phase P0: Get scene specification (deterministic mapping: position = sceneId)
  // Phase 1C: Pass category to make Scene 8 category-aware
  // Use dynamic import to avoid circular dependencies
  const sceneLibrary = await import('@/lib/maya/scene-library')
  const sceneSpec = sceneLibrary.getSceneSpec(position, {
    category: category || null // Phase 1C: Pass category for Scene 8 customization
  })
  
  // Parse template to extract frames, vibe, setting, and color grade
  const { frames, vibe, setting, colorGrade } = parseTemplateFrames(templatePrompt)
  
  // Find frame for this position
  const frame = frames.find(f => f.position === position)
  if (!frame) {
    throw new Error(`Frame ${position} not found in template. Available frames: ${frames.map(f => f.position).join(', ')}`)
  }
  
  // Detect frame type for validation
  const frameType = detectFrameType(frame.description)
  
  // Phase P0: Validate frame type matches scene spec
  if (sceneSpec && sceneSpec.frameType !== frameType) {
    console.warn(`[SCENE-CONTRACT] Frame type mismatch: template has '${frameType}', scene spec expects '${sceneSpec.frameType}' for position ${position}. Using scene spec.`)
  }
  
  // Phase P0 + Phase 1A: Build prompt with Scene Contract enforcement + BrandKit injection
  // Structure: STYLE LOCK + USER BRAND PROFILE + SCENE DNA + USER VARIABLES + CAMERA + QUALITY + NEGATIVE RULES
  const promptParts: string[] = []
  
  // 1. STYLE LOCK (global brand realism + NanoBanana rules)
  // Only add identity prompt for user photos (not flatlays)
  if (frameType !== 'flatlay') {
    promptParts.push(BASE_IDENTITY_PROMPT)
  }
  
  // 2. USER BRAND PROFILE (Phase 1A: Required brand profile injection)
  // SEMANTIC AUTHORITY ENFORCEMENT: Pass subjectRole to gate business semantics
  if (brandKit) {
    const { formatBrandProfileBlock } = await import('@/lib/brand/build-brand-kit')
    const { resolveSubjectRole } = await import('@/lib/semantic/resolve-subject-role')
    const subjectRole = resolveSubjectRole(category)
    const brandProfileBlock = formatBrandProfileBlock(brandKit, subjectRole)
    if (brandProfileBlock) {
      promptParts.push(brandProfileBlock)
    }
  }
  
  // 3. SCENE DNA (verbatim scene spec - Phase P0 enhancement)
  if (sceneSpec) {
    // Add scene DNA as explicit constraint
    promptParts.push(`Scene: ${sceneSpec.sceneDNA}`)
    promptParts.push(`Composition: ${sceneSpec.composition}`)
    promptParts.push(`Location: ${sceneSpec.location}`)
    
    // Add negative rules as constraints
    if (sceneSpec.negativeRules.length > 0) {
      const criticalRules = sceneSpec.negativeRules.filter(r => 
        r.includes('Do not change location') || 
        r.includes('Do not mix') || 
        r.includes('Do not change outfit')
      )
      if (criticalRules.length > 0) {
        promptParts.push(`Critical constraints: ${criticalRules.join(' ')}`)
      }
    }
  }
  
  // 4. USER / BRAND KIT VARIABLES (only fill slots, do not rewrite scene)
  // Add vibe context if available (as natural language, not label)
  if (vibe && vibe.length > 0) {
    promptParts.push(`Aesthetic direction: ${vibe}`)
  }
  
  // Add setting context if available (as natural language, not label)
  if (setting && setting.length > 0) {
    promptParts.push(`Setting: ${setting}`)
  }
  
  // Add frame description verbatim (already natural language) - this fills brand kit variables
  promptParts.push(frame.description)
  
  // 5. CAMERA + COMPOSITION
  if (sceneSpec) {
    promptParts.push(`Camera approach: ${sceneSpec.cameraConstraints}`)
    promptParts.push(`Lighting direction: ${sceneSpec.lighting}`)
  }
  
  // 6. QUALITY CONSTRAINTS (sharpness, realism, no artifacts)
  promptParts.push(`Technical requirements: Sharp focus throughout, natural realism, zero artifacts, authentic iPhone photography aesthetic`)
  
  // Add color grade (as natural language, not label)
  if (colorGrade && colorGrade.length > 0) {
    promptParts.push(`Color grading: ${colorGrade}`)
  }
  
  // 7. NEGATIVE RULES (Phase P0: Explicit scene contract enforcement)
  if (sceneSpec && sceneSpec.negativeRules.length > 0) {
    const negativeRulesText = sceneSpec.negativeRules
      .filter(r => !r.includes('Do not change location') && !r.includes('Do not mix') && !r.includes('Do not change outfit')) // Already added above
      .map(r => r.replace('Do not ', 'Avoid ').replace('Do not add', 'Exclude').replace('Do not change', 'Maintain'))
      .join('. ')
    if (negativeRulesText) {
      promptParts.push(`Restrictions: ${negativeRulesText}`)
    }
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
