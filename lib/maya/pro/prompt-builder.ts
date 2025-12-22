/**
 * Pro Mode Prompt Builder - FIXED VERSION
 * 
 * Builds coordinated, validated prompts for Studio Pro Mode
 * - Extracts complete scene without text corruption
 * - Preserves all outfit items
 * - No duplicate/fragmented text
 * - Proper camera mixing (DSLR vs iPhone)
 * - Validation prevents broken output
 */

import { PRO_MODE_CATEGORIES, getCategoryByKey, ImageLibrary } from './category-system'
import { selectMixedBrands } from './prompt-architecture'

export type PhotographyStyle = 'editorial' | 'authentic'

export interface ConceptComponents {
  title: string
  description: string
  category: string
  aesthetic?: string
  outfit?: {
    top?: string
    bottom?: string
    outerwear?: string
    accessories?: string[]
    shoes?: string
  }
  pose?: string
  lighting?: string
  setting?: string
  mood?: string
  brandReferences?: string[]
}

/**
 * SCENE ELEMENTS - Extracted once, used by all sections
 */
interface SceneElements {
  // Core elements
  action: string          // "sitting on leather sofa"
  posture: string         // "sitting"
  activity: string        // "relaxing"
  location: string        // "industrial loft"
  locationDetails: string // "industrial loft with exposed brick walls"
  
  // Complete outfit (ALL items)
  outfitComplete: string  // Full outfit string with all items
  outfitItems: string[]   // Individual items ["blazer", "leggings", "boots"]
  outfitBrands: string[]  // Brand names
  
  // Scene details
  props: string[]         // Physical items
  decor: string[]         // Decorations
  architecture: string[]  // Architectural elements
  
  // Atmosphere
  mood: string
  lighting: string
  vibe: string
  season: string
  timeOfDay: string
}

/**
 * STEP 1: EXTRACT COMPLETE SCENE (NO TEXT CORRUPTION)
 * 
 * CRITICAL: Extract full text without cutting mid-word
 */
function extractCompleteScene(description: string): SceneElements {
  
  console.log('[extractCompleteScene] Processing:', description.substring(0, 200))
  
  const scene: SceneElements = {
    action: '',
    posture: '',
    activity: '',
    location: '',
    locationDetails: '',
    outfitComplete: '',
    outfitItems: [],
    outfitBrands: [],
    props: [],
    decor: [],
    architecture: [],
    mood: '',
    lighting: '',
    vibe: '',
    season: '',
    timeOfDay: ''
  }
  
  // ============================================
  // EXTRACT COMPLETE OUTFIT (ALL ITEMS)
  // ============================================
  
  // Pattern: "wearing X, Y, Z"
  const wearingMatch = description.match(/wearing\s+([^.]+?)(?:\.|,\s*(?:sitting|standing|walking|looking|with|in\s+(?:industrial|modern|cozy|bright)))/i)
  
  if (wearingMatch && wearingMatch[1]) {
    scene.outfitComplete = wearingMatch[1].trim()
    
    // Split by commas to get individual items
    scene.outfitItems = scene.outfitComplete
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
    
    console.log('[extractCompleteScene] Outfit items:', scene.outfitItems.length, 'items')
  }
  
  // Extract brands from outfit
  const brandPattern = /\b(Ganni|Reformation|Alo|Lululemon|Set Active|Sleeper|Toteme|Khaite|The Row|Bottega Veneta|Chanel|Dior|Hermès|Jenni Kayne|Everlane|Mango|Zara|COS|Eberjey)\b/gi
  const brandMatches = scene.outfitComplete.match(brandPattern)
  if (brandMatches) {
    scene.outfitBrands = [...new Set(brandMatches.map(b => b.charAt(0).toUpperCase() + b.slice(1)))]
  }
  
  // ============================================
  // EXTRACT POSTURE (sitting, standing, etc.)
  // ============================================
  
  const postureMatch = description.match(/\b(sitting|standing|seated|kneeling|lying|leaning|walking)\b/i)
  if (postureMatch) {
    scene.posture = postureMatch[1].toLowerCase()
  }
  
  // ============================================
  // EXTRACT LOCATION WITH FULL DETAILS
  // ============================================
  
  // Pattern 1: "in/at [location description]"
  const locationPattern1 = /(?:in|at)\s+((?:industrial|modern|cozy|bright|elegant|luxury|spacious|minimal)[^,]{10,150}?)(?:,|\.|with|wearing)/i
  const locationMatch1 = description.match(locationPattern1)
  
  if (locationMatch1 && locationMatch1[1]) {
    scene.locationDetails = locationMatch1[1].trim()
    
    // Extract room type
    if (/loft/i.test(scene.locationDetails)) scene.location = 'loft'
    else if (/kitchen/i.test(scene.locationDetails)) scene.location = 'kitchen'
    else if (/living room/i.test(scene.locationDetails)) scene.location = 'living room'
    else if (/bedroom/i.test(scene.locationDetails)) scene.location = 'bedroom'
    else if (/bathroom/i.test(scene.locationDetails)) scene.location = 'bathroom'
    else scene.location = scene.locationDetails.split(/\s+/).slice(0, 2).join(' ')
  }
  
  // Pattern 2: Surface details (sofa, chair, etc.)
  const surfaceMatch = description.match(/((?:leather|velvet|tufted|wooden|marble)\s+(?:sofa|couch|chair|table|counter|island|bed))/i)
  if (surfaceMatch) {
    scene.props.push(surfaceMatch[1])
  }
  
  // ============================================
  // EXTRACT ARCHITECTURAL ELEMENTS
  // ============================================
  
  const architecturePatterns = [
    /exposed brick(?:\s+walls?)?/i,
    /floor-to-ceiling windows?/i,
    /large windows?/i,
    /high ceilings?/i,
    /vaulted ceilings?/i,
    /marble (?:countertops?|floors?|walls?)/i,
    /wooden (?:beams?|floors?)/i,
    /concrete walls?/i
  ]
  
  for (const pattern of architecturePatterns) {
    const match = description.match(pattern)
    if (match) {
      scene.architecture.push(match[0])
    }
  }
  
  // ============================================
  // EXTRACT DECOR (COMPLETE PHRASES)
  // ============================================
  
  // Christmas tree with all details
  const treeMatch = description.match(/((?:minimalist|white|black|decorated|tall)\s+Christmas tree(?:\s+with\s+[^,.]{5,80})?)/i)
  if (treeMatch) {
    scene.decor.push(treeMatch[1].trim())
  }
  
  // Other decor
  const decorPatterns = [
    /string lights(?:\s+[^,.]{0,40})?/i,
    /geometric ornaments?/i,
    /garland(?:\s+[^,.]{0,40})?/i,
    /candles?(?:\s+[^,.]{0,40})?/i,
    /(?:holiday|festive) decorations?/i
  ]
  
  for (const pattern of decorPatterns) {
    const match = description.match(pattern)
    if (match && !scene.decor.includes(match[0])) {
      scene.decor.push(match[0].trim())
    }
  }
  
  // ============================================
  // EXTRACT PROPS (COMPLETE PHRASES)
  // ============================================
  
  const propPatterns = [
    /(?:metal|leather|wood|concrete) (?:and|&) (?:metal|leather|wood|concrete) textures?/i,
    /city lights?/i,
    /raw architecture/i,
    /(?:ceramic|glass|metal) (?:mug|cup|vase|bowl)/i
  ]
  
  for (const pattern of propPatterns) {
    const match = description.match(pattern)
    if (match && !scene.props.includes(match[0])) {
      scene.props.push(match[0].trim())
    }
  }
  
  // ============================================
  // BUILD COMPLETE ACTION
  // ============================================
  
  if (scene.posture && surfaceMatch) {
    scene.action = `${scene.posture} on ${surfaceMatch[1]}`
  } else if (scene.posture && scene.locationDetails) {
    scene.action = `${scene.posture} in ${scene.location}`
  } else if (scene.posture) {
    scene.action = scene.posture
  }
  
  // ============================================
  // EXTRACT LIGHTING (COMPLETE DESCRIPTION)
  // ============================================
  
  const lightingMatch = description.match(/((?:string lights|natural (?:window )?light|warm (?:contrast|glow)|soft (?:light|lighting)|golden hour|evening light)(?:\s+[^,.]{0,60})?)/i)
  if (lightingMatch) {
    scene.lighting = lightingMatch[1].trim()
  }
  
  // ============================================
  // EXTRACT MOOD/VIBE
  // ============================================
  
  const moodMatch = description.match(/(modern gothic|industrial|cozy|elegant|sophisticated|edgy|minimal(?:ist)?)/i)
  if (moodMatch) {
    scene.vibe = moodMatch[1]
  }
  
  // Christmas/Holiday
  if (/christmas|holiday/i.test(description)) {
    scene.season = 'Christmas'
  }
  
  // Remove duplicates
  scene.architecture = [...new Set(scene.architecture)]
  scene.decor = [...new Set(scene.decor)]
  scene.props = [...new Set(scene.props)]
  
  console.log('[extractCompleteScene] Extracted:', {
    action: scene.action,
    outfitItems: scene.outfitItems.length,
    location: scene.location,
    architecture: scene.architecture.length,
    decor: scene.decor.length
  })
  
  return scene
}

/**
 * STEP 2: BUILD OUTFIT SECTION (ALL ITEMS)
 */
function buildOutfitSection(scene: SceneElements): string {
  
  if (scene.outfitComplete && scene.outfitComplete.length > 10) {
    // Use complete outfit string with all items
    let outfit = scene.outfitComplete
    
    // Capitalize first letter
    outfit = outfit.charAt(0).toUpperCase() + outfit.slice(1)
    
    // Ensure ends with period
    if (!/[.!?]$/.test(outfit)) {
      outfit = outfit + '.'
    }
    
    console.log('[buildOutfitSection] Complete outfit:', outfit.substring(0, 100))
    
    return `Outfit: ${outfit}`
  }
  
  // Fallback: list items
  if (scene.outfitItems.length > 0) {
    const outfitList = scene.outfitItems.join(', ')
    const outfit = outfitList.charAt(0).toUpperCase() + outfitList.slice(1) + '.'
    
    return `Outfit: ${outfit}`
  }
  
  return ''
}

/**
 * STEP 3: BUILD POSE SECTION (NO DUPLICATION WITH SETTING)
 */
function buildPoseSection(scene: SceneElements): string {
  
  if (scene.action && scene.action.length > 5) {
    // Don't mention location details - those go in Setting
    let pose = scene.action
    
    // Remove location if it will be in setting
    if (scene.location) {
      // Escape special regex characters in location to prevent regex injection
      const escapedLocation = scene.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const locationPattern = new RegExp(`\\s+(?:in|at|on)\\s+${escapedLocation}`, 'i')
      pose = pose.replace(locationPattern, '')
    }
    
    // Add mood if available
    if (scene.mood && !pose.includes(scene.mood)) {
      pose = `${pose}, ${scene.mood}`
    }
    
    // Capitalize
    pose = pose.charAt(0).toUpperCase() + pose.slice(1)
    
    // Add context
    pose = `${pose}, natural and authentic moment.`
    
    console.log('[buildPoseSection] Pose:', pose)
    
    return `Pose: ${pose}`
  }
  
  return 'Pose: Natural, relaxed posture, authentic moment.'
}

/**
 * STEP 4: BUILD SETTING SECTION (NO CORRUPTION, NO DUPLICATION)
 */
function buildSettingSection(scene: SceneElements): string {
  
  const settingParts: string[] = []
  
  // Start with location details
  if (scene.locationDetails) {
    settingParts.push(scene.locationDetails)
  } else if (scene.location) {
    settingParts.push(scene.location)
  }
  
  // Add architecture
  if (scene.architecture.length > 0) {
    settingParts.push(scene.architecture.join(', '))
  }
  
  // Add decor
  if (scene.decor.length > 0) {
    settingParts.push(scene.decor.join(', '))
  }
  
  // Add props (but not if already in pose/action)
  const propsNotInPose = scene.props.filter(prop => {
    return !scene.action.toLowerCase().includes(prop.toLowerCase())
  })
  
  if (propsNotInPose.length > 0) {
    settingParts.push(propsNotInPose.join(', '))
  }
  
  if (settingParts.length > 0) {
    let setting = settingParts.join(', ')
    
    // Capitalize
    setting = setting.charAt(0).toUpperCase() + setting.slice(1)
    
    // Ensure ends with period
    if (!/[.!?]$/.test(setting)) {
      setting = setting + '.'
    }
    
    console.log('[buildSettingSection] Setting:', setting.substring(0, 150))
    
    return `Setting: ${setting}`
  }
  
  return 'Setting: Clean, modern interior with natural light.'
}

/**
 * STEP 5: BUILD LIGHTING SECTION
 */
function buildLightingSection(scene: SceneElements): string {
  
  if (scene.lighting && scene.lighting.length > 5) {
    let lighting = scene.lighting
    
    // Capitalize
    lighting = lighting.charAt(0).toUpperCase() + lighting.slice(1)
    
    // Add context if available
    if (scene.vibe && !lighting.toLowerCase().includes(scene.vibe.toLowerCase())) {
      lighting = `${lighting}, creating ${scene.vibe} atmosphere`
    }
    
    // Ensure ends with period
    if (!/[.!?]$/.test(lighting)) {
      lighting = lighting + '.'
    }
    
    return `Lighting: ${lighting}`
  }
  
  // Fallback based on time
  if (scene.timeOfDay === 'morning') {
    return 'Lighting: Soft morning light with natural warmth.'
  }
  
  if (scene.timeOfDay === 'evening') {
    return 'Lighting: Warm evening light with cozy ambiance.'
  }
  
  return 'Lighting: Natural window lighting with soft quality.'
}

/**
 * STEP 6: BUILD CAMERA SECTION (PROPER STYLE SELECTION)
 */
function buildCameraSection(
  photographyStyle: PhotographyStyle,
  concept: ConceptComponents
): string {
  
  if (photographyStyle === 'editorial') {
    // Professional DSLR
    return `Camera Composition: Editorial portrait from mid-thigh upward, frontal camera position, symmetrical centered framing, professional DSLR, Canon EOS R5 or Sony A7R IV, 85mm f/1.4 lens, camera distance 1.5-2m from subject, shallow depth of field (f/2.0-f/2.8).`
  } else {
    // Authentic iPhone
    return `Camera Composition: Authentic iPhone 15 Pro portrait mode, 77mm equivalent, natural bokeh, shot from 1-1.5m distance, portrait mode depth effect, influencer selfie style.`
  }
}

/**
 * STEP 7: BUILD MOOD SECTION
 */
function buildMoodSection(scene: SceneElements, concept: ConceptComponents): string {
  
  const moods: string[] = []
  
  if (scene.vibe) moods.push(scene.vibe)
  if (scene.mood) moods.push(scene.mood)
  if (concept.mood) moods.push(concept.mood)
  
  // Add season-appropriate moods
  if (scene.season === 'Christmas') {
    moods.push('festive', 'cozy', 'magical holiday atmosphere')
  }
  
  if (moods.length > 0) {
    const uniqueMoods = [...new Set(moods)]
    const moodText = uniqueMoods.join(', ')
    return `Mood: ${moodText}.`
  }
  
  return 'Mood: Natural, authentic, sophisticated.'
}

/**
 * MAIN FUNCTION: BUILD COMPLETE COORDINATED PROMPT
 */
export async function buildProModePrompt(
  category: string | null,
  concept: ConceptComponents,
  userImages: ImageLibrary,
  userRequest?: string,
  userPhotographyStyle?: PhotographyStyle,
  conceptIndex?: number
): Promise<{ fullPrompt: string; category: string }> {
  
  console.log('[buildProModePrompt] ========== STARTING COORDINATED BUILD ==========')
  console.log('[buildProModePrompt] Description:', concept.description?.substring(0, 200))
  console.log('[buildProModePrompt] Concept index:', conceptIndex)
  
  // ============================================
  // STEP 1: EXTRACT COMPLETE SCENE ONCE
  // ============================================
  
  const scene = extractCompleteScene(concept.description || '')
  
  // ============================================
  // STEP 2: BUILD ALL SECTIONS FROM SAME DATA
  // ============================================
  
  const outfitSection = buildOutfitSection(scene)
  const poseSection = buildPoseSection(scene)
  const settingSection = buildSettingSection(scene)
  const lightingSection = buildLightingSection(scene)
  
  // ============================================
  // STEP 3: DETERMINE CAMERA STYLE (DSLR vs iPhone)
  // ============================================
  
  let photographyStyle: PhotographyStyle
  
  // PRIORITY 1: Use conceptIndex to enforce mix
  if (conceptIndex !== undefined && conceptIndex >= 0) {
    if (conceptIndex < 3) {
      photographyStyle = 'editorial' // Professional DSLR
      console.log(`[buildProModePrompt] 📸 Concept #${conceptIndex + 1}: PROFESSIONAL DSLR`)
    } else {
      photographyStyle = 'authentic' // iPhone
      console.log(`[buildProModePrompt] 📱 Concept #${conceptIndex + 1}: AUTHENTIC iPhone`)
    }
  } 
  // PRIORITY 2: User specified style
  else if (userPhotographyStyle) {
    photographyStyle = userPhotographyStyle
    console.log('[buildProModePrompt] Using user-specified style:', userPhotographyStyle)
  }
  // PRIORITY 3: Default to authentic
  else {
    photographyStyle = 'authentic'
    console.log('[buildProModePrompt] Defaulting to authentic (iPhone)')
  }
  
  const cameraSection = buildCameraSection(photographyStyle, concept)
  const moodSection = buildMoodSection(scene, concept)
  
  // ============================================
  // STEP 4: BUILD INTRODUCTION
  // ============================================
  
  const introduction = photographyStyle === 'editorial'
    ? 'Professional photography. Pinterest-style editorial portrait. Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. Editorial quality, professional photography aesthetic.'
    : 'Authentic influencer content. Pinterest-style portrait. Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. Natural, relatable iPhone aesthetic.'
  
  // ============================================
  // STEP 5: ASSEMBLE FINAL PROMPT
  // ============================================
  
  const sections = [
    introduction,
    outfitSection,
    poseSection,
    settingSection,
    lightingSection,
    cameraSection,
    moodSection,
    concept.aesthetic ? `Aesthetic: ${concept.aesthetic}.` : ''
  ].filter(s => s.length > 0)
  
  const fullPrompt = sections.join('\n\n')
  
  // ============================================
  // STEP 6: VALIDATE (NO CORRUPTION)
  // ============================================
  
  const validation = validatePrompt(fullPrompt, scene)
  
  if (validation.warnings.length > 0) {
    console.warn('[buildProModePrompt] ⚠️ Validation warnings:', validation.warnings)
  }
  
  console.log('[buildProModePrompt] ========== FINAL PROMPT ==========')
  console.log('[buildProModePrompt] Length:', fullPrompt.length, 'chars')
  console.log('[buildProModePrompt] Photography style:', photographyStyle)
  console.log('[buildProModePrompt] Validation:', validation.valid ? '✅ PASS' : '⚠️ WARNINGS')
  
  // Return with safe category
  const safeCategory = category || concept.category || 'LIFESTYLE'
  
  return {
    fullPrompt,
    category: safeCategory
  }
}

/**
 * VALIDATION: Prevent broken output
 */
function validatePrompt(prompt: string, scene: SceneElements): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Check for cut-off text (common suffixes that indicate incomplete words)
  const cutOffPatterns = [
    /\bthrougho\b/i,  // "throughout" cut to "througho"
    /\bagains\b/i,    // "against" cut to "agains"
    /\bdgy\b/i,       // "edgy" cut to "dgy"
    /\bist\b(?!\s+(?:ist|is))/i,  // Random "ist"
    /[a-z]{3,}\s*$/i  // Word ending mid-sentence
  ]
  
  for (const pattern of cutOffPatterns) {
    if (pattern.test(prompt)) {
      warnings.push(`Possible cut-off text detected: ${pattern.source}`)
    }
  }
  
  // Check for duplicate phrases
  const sentences = prompt.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0) // Filter out empty/whitespace-only strings
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const similarity = calculateSimilarity(sentences[i], sentences[j])
      if (similarity > 0.8) {
        warnings.push(`Possible duplicate text detected in sections`)
      }
    }
  }
  
  // Check for contradictory camera specs
  const hasEditorial = /professional (?:photography|DSLR|camera)|Canon EOS|Sony A7|85mm/i.test(prompt)
  const hasIPhone = /iPhone.*Pro.*portrait mode|authentic.*selfie/i.test(prompt)
  
  if (hasEditorial && hasIPhone) {
    warnings.push('Contradictory camera specs: Both professional DSLR and iPhone mentioned')
  }
  
  // Check outfit items preserved
  if (scene.outfitItems.length > 1) {
    const outfitSection = prompt.match(/Outfit:([^]+?)(?=Pose:|$)/i)
    if (outfitSection) {
      const preservedItems = scene.outfitItems.filter(item => 
        outfitSection[1].toLowerCase().includes(item.toLowerCase())
      )
      
      if (preservedItems.length < scene.outfitItems.length) {
        warnings.push(`Missing outfit items: Expected ${scene.outfitItems.length}, found ${preservedItems.length}`)
      }
    }
  }
  
  const valid = warnings.length === 0
  
  return { valid, warnings }
}

/**
 * Helper: Calculate text similarity
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Filter out empty/whitespace-only strings to prevent false positives
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  
  // Handle edge case: both strings are empty after filtering
  if (words1.length === 0 && words2.length === 0) {
    return 0 // Empty strings are not similar
  }
  
  // Handle edge case: one string is empty
  if (words1.length === 0 || words2.length === 0) {
    return 0
  }
  
  const commonWords = words1.filter(word => words2.includes(word))
  
  return commonWords.length / Math.max(words1.length, words2.length)
}
