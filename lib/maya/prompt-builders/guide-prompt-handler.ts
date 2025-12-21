/**
 * Guide Prompt Handler
 * 
 * Handles guide prompts from users - creates concept #1 from the exact guide prompt,
 * then generates consistent variations (concepts 2-6) that maintain outfit, location,
 * lighting, and camera specs while varying pose, angle, and expression.
 */

export interface GuidePromptElements {
  outfit: string | null
  lighting: string | null
  location: string | null
  cameraSpecs: string | null
  mood: string | null
}

export interface ReferenceImages {
  selfies?: any[]
  products?: any[]
  styleRefs?: any[]
  userDescription?: string
}

/**
 * Check if skin texture should be added based on user prompt, guide prompt, or templates
 */
export function shouldIncludeSkinTexture(
  userRequest?: string,
  guidePrompt?: string,
  templateExamples?: string[]
): boolean {
  const userHasSkinTexture = userRequest && /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(userRequest)
  const guideHasSkinTexture = guidePrompt && /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(guidePrompt)
  const templatesHaveSkinTexture = templateExamples && templateExamples.some(template => 
    /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(template)
  )
  return !!(userHasSkinTexture || guideHasSkinTexture || templatesHaveSkinTexture)
}

/**
 * Merge guide prompt with user's image references
 */
export function mergeGuidePromptWithImages(
  guidePrompt: string,
  referenceImages: ReferenceImages | null,
  studioProMode: boolean
): string {
  let merged = guidePrompt
  
  if (referenceImages) {
    const selfies = referenceImages.selfies || []
    const products = referenceImages.products || []
    const styleRefs = referenceImages.styleRefs || []
    
    const hasImageRef = /image\s+\d+|attachment\s+\d+|reference\s+image/i.test(guidePrompt)
    
    if (!hasImageRef && (selfies.length > 0 || products.length > 0 || styleRefs.length > 0)) {
      if (studioProMode) {
        const totalImages = selfies.length + products.length + styleRefs.length
        if (totalImages > 0) {
          merged = `Woman, maintaining exactly the characteristics of the woman in ${totalImages > 1 ? `images 1-${totalImages}` : 'image 1'} (face, body, skin tone, hair and visual identity), without copying the photo. ${merged}`
        }
      }
    }
  }
  
  return merged
}

/**
 * Extract key elements from guide prompt for creating variations
 */
export function extractPromptElements(guidePrompt: string): GuidePromptElements {
  const elements: GuidePromptElements = {
    outfit: null,
    lighting: null,
    location: null,
    cameraSpecs: null,
    mood: null,
  }
  
  // Extract outfit
  const outfitMatch = guidePrompt.match(/(?:wearing|outfit|dressed in|clothing|garment|turtleneck|sweater|dress|trousers|pants|shirt|blazer|jacket)[^,.]*[.,]/i)
  if (outfitMatch) {
    elements.outfit = outfitMatch[0].trim()
  }
  
  // Extract lighting
  const lightingMatch = guidePrompt.match(/(?:lighting|light|illuminated|glow|ambient|natural.*light|window.*light|warm.*light|soft.*light)[^,.]*[.,]/i)
  if (lightingMatch) {
    elements.lighting = lightingMatch[0].trim()
  }
  
  // Extract location/scene
  const locationMatch = guidePrompt.match(/(?:sitting|standing|in|at|near|beside|with|surrounded by|setting|scene|location|background)[^,.]*[.,]/i)
  if (locationMatch) {
    elements.location = locationMatch[0].trim()
  }
  
  // Extract camera specs
  const cameraMatch = guidePrompt.match(/(?:\d+mm|lens|f\/|depth of field|professional photography|camera)[^,.]*[.,]/i)
  if (cameraMatch) {
    elements.cameraSpecs = cameraMatch[0].trim()
  }
  
  return elements
}

/**
 * Create a variation of the guide prompt for concepts 2-6
 * Maintains: outfit, lighting, location type, camera specs
 * Varies: pose, angle, moment, expression
 */
export function createVariationFromGuidePrompt(
  baseGuidePrompt: string,
  baseElements: GuidePromptElements,
  variationNumber: number,
  referenceImages: ReferenceImages | null,
  studioProMode: boolean
): string {
  // Variation poses/moments for each concept - DIVERSE actions for video editing
  const variations = [
    { pose: "standing", moment: "adjusting hair", angle: "front view", expression: "gentle smile" },
    { pose: "sitting", moment: "reading book", angle: "side profile", expression: "focused expression" },
    { pose: "leaning", moment: "reaching for ornament", angle: "three-quarter view", expression: "playful smile" },
    { pose: "walking", moment: "carrying blanket", angle: "dynamic front view", expression: "content expression" },
    { pose: "kneeling", moment: "arranging decorations", angle: "casual side view", expression: "thoughtful expression" },
  ]
  
  const variation = variations[(variationNumber - 2) % variations.length]
  
  // Extract image reference prefix if present
  let imageRefPrefix = ""
  const imageRefMatch = baseGuidePrompt.match(/^(Woman, maintaining exactly the characteristics of the woman in (?:images? \d+(?:-\d+)?|image \d+|attachment \d+)[^.]*\.)/i)
  if (imageRefMatch) {
    imageRefPrefix = imageRefMatch[1] + " "
  } else if (referenceImages) {
    const selfies = referenceImages.selfies || []
    const products = referenceImages.products || []
    const styleRefs = referenceImages.styleRefs || []
    const totalImages = selfies.length + products.length + styleRefs.length
    if (totalImages > 0 && studioProMode) {
      imageRefPrefix = `Woman, maintaining exactly the characteristics of the woman in ${totalImages > 1 ? `images 1-${totalImages}` : 'image 1'} (face, body, skin tone, hair and visual identity), without copying the photo. `
    }
  }
  
  // Remove image reference prefix to work with the rest of the prompt
  let workingPrompt = baseGuidePrompt
  if (imageRefPrefix) {
    workingPrompt = workingPrompt.replace(new RegExp("^" + imageRefPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i"), "").trim()
  }
  
  // Split prompt by periods AND commas to get chunks
  const sentences = workingPrompt.split(/[.,]\s+/).filter(s => s.trim().length > 0)
  
  // Extract outfit description - PRESERVE ALL FABRIC/MATERIAL DETAILS
  let outfitText = ""
  let outfitChunks: string[] = []
  let foundPose = false
  
  // CRITICAL: First, extract COMPLETE outfit description including all components and fabrics
  // Pattern: "couture mini red dress look with structured bow + long black satin gloves + heels"
  // This captures the ENTIRE outfit description, not just fragments
  const completeOutfitPattern = /(?:couture|wearing|dressed|outfit|clothing|model)\s+[^,.]*(?:dress|sweater|pajamas|blazer|trousers|shirt)[^,.]*(?:\s+(?:with|and|\+)\s+[^,.]*)*(?:silk|cashmere|satin|velvet|wool|cotton|leather|gloves|heels|bow)/i
  const completeOutfitMatch = workingPrompt.match(completeOutfitPattern)
  if (completeOutfitMatch) {
    let extracted = completeOutfitMatch[0].trim()
    // Remove pose/location/action words but PRESERVE ALL outfit components and fabrics
    extracted = extracted.replace(/\b(?:standing|sitting|seated|kneeling|walking|leaning|looking|expression|posture|comfortably|elegantly|confident|feminine|serene|holding|delicately|gracefully|straight|elegant|sophisticated)\b[^,.]*[.,]?/gi, "").trim()
    extracted = extracted.replace(/\b(?:model|in|at|near|beside|background|tree|fireplace|room|setting|scene|location|sofa|Christmas|interior|illuminated|presents)\b[^,.]*[.,]?/gi, "").trim()
    extracted = extracted.replace(/\b(?:drinking|holding|sipping|grasping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
    // Remove "look" if present but keep everything else
    extracted = extracted.replace(/\b(look)\b/gi, "").trim()
    // Clean up extra spaces but preserve fabric/material keywords
    extracted = extracted.replace(/\s+/g, " ").trim()
    if (extracted.length > 20) {
      outfitText = extracted.replace(/[.,]$/, "").trim()
      if (!/^wearing/i.test(outfitText)) {
        outfitText = "Wearing " + outfitText
      }
    }
  }
  
  // First, try to find outfit starting with "Wearing" - PRESERVE FABRIC DETAILS
  const wearingMatch = workingPrompt.match(/\bWearing\s+([^,.]*(?:,\s*[^,.]*)*?)(?:\.|,|$)/i)
  if (wearingMatch && wearingMatch[1]) {
    let wearingText = wearingMatch[1].trim()
    // CRITICAL: Preserve ALL fabric/material keywords and outfit components
    // Only remove pose/action words, NOT fabric or garment details
    wearingText = wearingText.replace(/\b(?:standing|sitting|seated|kneeling|walking|leaning|looking|expression|posture|comfortably|elegantly|confident|feminine|serene|holding|delicately|gracefully|straight|elegant|sophisticated)\b[^,.]*[.,]?/gi, "").trim()
    // Remove location words but keep clothing and fabric details
    wearingText = wearingText.replace(/\b(?:in|at|near|beside|background|tree|fireplace|room|setting|scene|location|sofa|Christmas|interior|illuminated|presents)\b[^,.]*[.,]?/gi, "").trim()
    // Remove action words but PRESERVE fabric/material keywords
    wearingText = wearingText.replace(/\b(?:drinking|holding|sipping|grasping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
    // Clean up but preserve fabric keywords
    wearingText = wearingText.replace(/\s+/g, " ").trim()
    if (wearingText.length > 10) {
      outfitText = "Wearing " + wearingText.replace(/[.,]$/, "").trim()
    }
  }
  
  // If "Wearing" pattern didn't work, try sentence-by-sentence extraction
  if (!outfitText || outfitText.length < 20) {
    for (let i = 0; i < sentences.length; i++) {
      const chunk = sentences[i].trim()
      
      const hasPoseKeywords = /(?:seated|kneeling|standing|sitting|walking|leaning|looking|expression|posture|comfortably|elegantly|confident|feminine|serene)/i.test(chunk)
      // Include fabric/material keywords in clothing detection
      const hasClothingKeywords = /(?:sweater|dress|trousers|pants|shirt|blazer|jacket|turtleneck|cable-knit|socks|jewelry|outfit|clothing|garment|wearing|dressed|hair|bun|bow|gloves|earrings|necklace|satin|silk|cashmere|velvet|wool|cotton|linen|denim|leather|suede|chiffon|organza|taffeta|crepe|jersey|knit|architectural|lines|texture|chain|drop|earrings|shiny|couture|opera|heels|mini|structured)/i.test(chunk)
      
      if (hasPoseKeywords && !hasClothingKeywords) {
        foundPose = true
      }
      
      if (hasClothingKeywords) {
        const isLocationChunk = /(?:background|tree|fireplace|room|setting|scene|location|bokeh|lights|glow|atmosphere|surrounded|decorated)/i.test(chunk) &&
                                !/(?:dress|sweater|gloves|earrings|necklace|satin|architectural|texture|chain|drop|shiny|couture|velvet|opera|heels|mini|structured)/i.test(chunk)
        
        if (!foundPose || hasClothingKeywords) {
          if (!isLocationChunk) {
            outfitChunks.push(chunk)
          }
        }
      }
    }
    
    if (outfitChunks.length > 0) {
      outfitText = outfitChunks.join(", ").trim()
      // Remove pose/action/location words but preserve clothing
      outfitText = outfitText.replace(/\b(?:kneeling|standing|sitting|beside|near|at|in|with|holding|delicately|gracefully|background|tree|fireplace|seated|looking|expression|posture|confident|feminine|serene|drinking|sipping|grasping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
      outfitText = outfitText.replace(/[.,]$/, "").trim()
      if (!/^wearing/i.test(outfitText)) {
        outfitText = "Wearing " + outfitText
      }
    }
  }
  
  // Fallback: If we still don't have outfit - IMPROVED EXTRACTION
  if (!outfitText || outfitText.length < 20) {
    for (const chunk of sentences) {
      // Look for clothing keywords INCLUDING fabric/material details
      const hasClothing = /(?:sweater|dress|trousers|pants|shirt|blazer|jacket|turtleneck|gloves|earrings|necklace|satin|silk|cashmere|velvet|wool|cotton|linen|denim|leather|suede|chiffon|organza|taffeta|crepe|jersey|knit|architectural|couture|opera|heels|mini|structured|pajamas|striped|camisole)/i.test(chunk)
      // Exclude location/pose/action words
      const hasLocationOrPose = /(?:kneeling|standing|sitting|walking|leaning|beside|near|at|lighting|light|background|tree|fireplace|sofa|room|holding|drinking|sipping|carrying|reading|checking)/i.test(chunk)
      
      if (hasClothing && chunk.length > 20 && !hasLocationOrPose) {
        outfitText = chunk.replace(/[.,]$/, "").trim()
        // Remove any remaining pose/action words
        outfitText = outfitText.replace(/\b(?:kneeling|standing|sitting|walking|leaning|holding|drinking|sipping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
        if (!/^wearing/i.test(outfitText)) {
          outfitText = "Wearing " + outfitText
        }
        break
      }
    }
  }
  
  // Additional fallback: Look for clothing patterns in the entire prompt
  if (!outfitText || outfitText.length < 15) {
    const clothingPatterns = [
      /(?:candy\s+cane\s+striped\s+pajamas?|striped\s+pajamas?)/i,
      /(?:couture\s+mini\s+red\s+dress|mini\s+red\s+dress)/i,
      /(?:cream\s+cashmere\s+(?:sweater|turtleneck|lounge\s+set))/i,
      /(?:black\s+satin\s+(?:dress|gloves|opera\s+gloves))/i,
      /(?:chic\s+bun\s+with\s+(?:red\s+)?velvet\s+bow)/i,
      // Pattern: Any fabric + garment (silk dress, cashmere sweater, etc.)
      /(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede)\s+(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole)/i,
      // Pattern: Garment + fabric (dress with silk, sweater in cashmere)
      /(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole)\s+(?:with|in|of|made\s+of|from)\s+(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede)/i,
    ]
    for (const pattern of clothingPatterns) {
      const match = workingPrompt.match(pattern)
      if (match) {
        outfitText = "Wearing " + match[0].trim()
        break
      }
    }
  }
  
  // Final validation: Ensure we have a valid outfit - try extracting from full prompt
  if (!outfitText || outfitText.length < 15) {
    // Try to extract outfit from the full guide prompt using common patterns
    const outfitPatterns = [
      // Pattern: "candy cane striped pajamas" or "striped pajamas"
      /(?:candy\s+cane\s+)?striped\s+(?:pajamas?|silk\s+pajamas?)/i,
      // Pattern: "couture mini red dress" or "mini red dress"
      /(?:couture\s+)?mini\s+red\s+dress/i,
      // Pattern: "cream cashmere sweater" or "cashmere turtleneck"
      /(?:cream|white|beige)\s+cashmere\s+(?:sweater|turtleneck|lounge\s+set)/i,
      // Pattern: "black satin dress" or "satin dress"
      /(?:black|red|white)\s+satin\s+(?:dress|gloves|opera\s+gloves)/i,
      // Pattern: Any fabric + garment (silk dress, cashmere sweater, velvet blazer, etc.)
      /(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede|chiffon|organza|taffeta|crepe|jersey|knit)\s+(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole|lounge\s+set)/i,
      // Pattern: Garment + fabric (dress with silk, sweater in cashmere)
      /(?:dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|pajamas|gloves|camisole)\s+(?:with|in|of|made\s+of|from)\s+(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede|chiffon|organza|taffeta|crepe|jersey|knit)/i,
      // Pattern: clothing with specific details (must include fabric keyword to preserve materials)
      /(?:wearing|dressed\s+in|outfit|clothing)\s+[^,.]*(?:silk|cashmere|satin|velvet|wool|cotton|linen|denim|leather|suede)[^,.]*/i,
    ]
    
    for (const pattern of outfitPatterns) {
      const match = workingPrompt.match(pattern)
      if (match && match[0].length > 15) {
        outfitText = match[0].trim()
        // Clean up action/pose words
        outfitText = outfitText.replace(/\b(?:kneeling|standing|sitting|walking|leaning|holding|drinking|sipping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
        if (!/^wearing/i.test(outfitText)) {
          outfitText = "Wearing " + outfitText
        }
        break
      }
    }
    
    // Last resort: use first sentence if it has clothing keywords
    if ((!outfitText || outfitText.length < 15) && sentences.length > 0) {
      const firstSentence = sentences[0].trim()
      if (/(?:pajamas|dress|sweater|trousers|pants|shirt|blazer|jacket|turtleneck|gloves|earrings|necklace|satin|couture|velvet|opera|heels|mini|structured)/i.test(firstSentence) && firstSentence.length > 15) {
        outfitText = firstSentence.replace(/[.,]$/, "").trim()
        outfitText = outfitText.replace(/\b(?:kneeling|standing|sitting|walking|leaning|holding|drinking|sipping|carrying|reading|checking|adjusting|arranging)\b[^,.]*[.,]?/gi, "").trim()
        if (!/^wearing/i.test(outfitText)) {
          outfitText = "Wearing " + outfitText
        }
      }
    }
  }
  
  // Extract location/scene description
  let locationText = ""
  let locationChunks: string[] = []
  foundPose = false
  
  for (let i = 0; i < sentences.length; i++) {
    const chunk = sentences[i].trim()
    
    if (/(?:seated|kneeling|standing|sitting|walking|leaning|looking|expression|posture|comfortably|elegantly|confident|feminine|serene)/i.test(chunk) && 
        !/(?:dress|sweater|gloves|earrings|necklace|satin|architectural|clothing|outfit)/i.test(chunk)) {
      foundPose = true
    }
    
    const hasLocationKeywords = /(?:beside|near|at|in|with|surrounded by|decorated|setting|scene|location|background|room|space|area|sofa|fireplace|tree|Christmas tree|living room|garland|candles|holiday|festive|twinkling|lights|decorations|bokeh|magical|glow)/i.test(chunk)
    const isPoseOnly = /^(?:kneeling|standing|sitting|walking|leaning|holding|delicately|gracefully|seated|looking|expression|posture|confident|feminine|serene)/i.test(chunk) && 
                       !/(?:tree|sofa|fireplace|room|background|setting|scene|location|bokeh|lights|glow)/i.test(chunk)
    const isLightingOnly = /^(?:lighting|light|illuminated|glow|ambient|warm|golden|romantic|cozy|atmosphere|shadows|dreamy|soft|diffused|flickering)/i.test(chunk) &&
                           !/(?:tree|sofa|fireplace|room|background|setting|scene|location)/i.test(chunk)
    
    if (hasLocationKeywords && !isPoseOnly && !isLightingOnly) {
      let loc = chunk
      loc = loc.replace(/^(?:kneeling|standing|sitting|walking|leaning|holding|delicately|gracefully|seated|elegantly|comfortably|looking|expression)\s+/i, "").trim()
      if (loc.length > 10) {
        locationChunks.push(loc)
      }
    }
  }
  
  if (locationChunks.length > 0) {
    locationText = locationChunks.join(", ").trim()
    locationText = locationText.replace(/[.,]$/, "").trim()
  }
  
  // If we still don't have location, try to extract from sentences with both pose and location
  if (!locationText) {
    for (const chunk of sentences) {
      if (/(?:kneeling|standing|sitting|walking|leaning|seated)\s+(?:beside|near|at|in|with)\s+[^,.]*(?:tree|sofa|fireplace|room|setting|scene|background)/i.test(chunk)) {
        const locationPart = chunk.replace(/^(?:kneeling|standing|sitting|walking|leaning|seated|elegantly|comfortably)\s+/i, "")
        if (locationPart.length > 10) {
          locationText = locationPart.trim().replace(/[.,]$/, "").trim()
          break
        }
      }
    }
  }
  
  // Extract lighting description
  let lightingText = ""
  for (const chunk of sentences) {
    const trimmedChunk = chunk.trim()
    const hasLightingKeywords = /(?:lighting|light|illuminated|glow|ambient|warm|golden|romantic|cozy|atmosphere|shadows|dreamy|soft|diffused|flickering|intimate)/i.test(trimmedChunk)
    const isLocationChunk = /(?:tree|sofa|fireplace|room|background|setting|scene|location|decorated|garland|candles|holiday|festive|bokeh)/i.test(trimmedChunk) &&
                            !/(?:lighting|light|illuminated|glow|ambient|atmosphere|shadows)/i.test(trimmedChunk)
    const isPoseChunk = /^(?:kneeling|standing|sitting|walking|leaning|holding|seated|looking|expression|posture)/i.test(trimmedChunk)
    
    if (hasLightingKeywords && !isLocationChunk && !isPoseChunk) {
      lightingText = trimmedChunk.replace(/[.,]$/, "").trim()
      if (lightingText.length > 10) break
    }
  }
  
  // Extract camera specs
  let cameraText = ""
  const cameraMatch = workingPrompt.match(/(?:\d+mm|lens|f\/[\d.]+|depth of field|professional photography|camera)[^,.]*(?:,|\.|$)/gi)
  if (cameraMatch && cameraMatch.length > 0) {
    cameraText = cameraMatch[cameraMatch.length - 1].trim()
    cameraText = cameraText.replace(/,\s*with\s+visible\s+pores/gi, "")
    cameraText = cameraText.replace(/with\s+visible\s+pores/gi, "")
    cameraText = cameraText.replace(/[.,]$/, "").trim()
  }
  
  // Extract skin texture separately (if present)
  let skinTextureText = ""
  if (/natural\s+skin\s+texture/i.test(workingPrompt)) {
    const skinMatch = workingPrompt.match(/natural\s+skin\s+texture[^,.]*(?:,|\.|$)/gi)
    if (skinMatch && skinMatch.length > 0) {
      skinTextureText = skinMatch[skinMatch.length - 1].trim().replace(/[.,]$/, "").trim()
    }
  } else if (/with\s+visible\s+pores/i.test(workingPrompt)) {
    skinTextureText = "natural skin texture with visible pores"
  }
  
  // Build the variation prompt
  const parts: string[] = []
  
  if (imageRefPrefix) {
    parts.push(imageRefPrefix.trim())
  }
  
  // Add hair styling FIRST (preserved from guide prompt)
  if (hairText && hairText.length > 10) {
    parts.push(hairText)
  }
  
  // Add outfit (preserved from guide prompt - MUST include all fabric/material details)
  if (outfitText && outfitText.length > 15) {
    // CRITICAL: Log what we're preserving to debug fabric/material issues
    console.log("[v0] 📦 Preserving outfit with fabric details:", outfitText.substring(0, 150))
    parts.push(outfitText)
  } else {
    console.log("[v0] ⚠️ WARNING: No outfit extracted from guide prompt! Prompt length:", workingPrompt.length)
  }
  
  // Add location - PRESERVE same concept (EXACT same)
  // Keep the same location/scene concept (e.g., "sofa with Christmas tree") but describe it differently
  if (locationText) {
    // Preserve the location - same concept, same scene
    parts.push(locationText)
  } else {
    // Fallback: look for any sentence with location keywords
    for (const sentence of sentences) {
      if (/(?:tree|sofa|fireplace|room|setting|scene|location|background|decorated|garland|candles|holiday|festive)/i.test(sentence)) {
        const loc = sentence.replace(/\b(?:kneeling|standing|sitting|walking|leaning|holding|delicately|gracefully)\s+/i, "").trim()
        if (loc.length > 10) {
          parts.push(loc.replace(/[.,]$/, "").trim())
          break
        }
      }
    }
  }
  
  // Add lighting (preserved from guide prompt - EXACT same)
  if (lightingText) {
    parts.push(lightingText)
  }
  
  // VARIED ELEMENTS (Only these change) - Nano Banana best practice: Be explicit about what changes
  // Add new pose variation (ONLY thing that changes - different action/pose/angle/expression)
  parts.push(`${variation.pose}, ${variation.moment}, ${variation.angle}, ${variation.expression}`)
  
  // Add camera specs (preserved from guide prompt - EXACT same)
  if (cameraText) {
    parts.push(cameraText)
  }
  
  // Add skin texture (preserved from guide prompt only - EXACT same)
  if (skinTextureText) {
    parts.push(skinTextureText)
  }
  
  // Join all parts
  let variationPrompt = parts.join(", ").trim()
  
  // Clean up
  variationPrompt = variationPrompt
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/^,\s*/, "")
    .replace(/\s*,$/, "")
    .trim()
  
  if (variationPrompt && !variationPrompt.endsWith(".")) {
    variationPrompt += "."
  }
  
  return variationPrompt
}

















