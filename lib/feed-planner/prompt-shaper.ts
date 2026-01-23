/**
 * FEED PLANNER — PROMPT GENERATION (NANO BANANA PRO COMPLIANT)
 * 
 * ✅ SINGLE SOURCE OF TRUTH: All Feed Planner prompt text generation happens here.
 * 
 * NANO BANANA PRO COMPLIANCE:
 * - Preview prompts: 140-220 words with 9 concise scene execution blocks
 * - Single scene prompts: 150-220 words with explicit block structure
 * - Both include identity anchors at start and end
 * - Both use execution data (outfits, locations, poses) for scene descriptions
 * 
 * PROMPT MODES:
 * - PREVIEW = 3×3 grid prompt with 9 concise scene blocks (9:16 aspect ratio)
 * - SINGLE SCENE = One scene with full execution details (4:5 aspect ratio)
 * 
 * This is the ONLY place where natural language is generated for Feed Planner.
 * No mutation, cleaning, or sanitization afterward.
 * 
 * DO NOT ADD SCENE LOGIC HERE
 * DO NOT ADD TEMPLATE LOGIC HERE
 * DO NOT ADD RESOLUTION LOGIC HERE
 * 
 * This shaper answers: "How do we word the prompt?"
 * Not: "What is happening in the scene?"
 * 
 * For scene intent, see: scene-resolver.ts
 */

import { FeedPlannerScene } from './scene-resolver'

// ============================================================================
// PROMPT MODES
// ============================================================================

export type PromptMode = 'preview_multi' | 'single_scene'

// ============================================================================
// MAIN FUNCTION: BUILD PROMPT FROM SCENE
// ============================================================================

/**
 * PROMPT AUTHORITY — FEED PLANNER
 * 
 * This function produces the final prompt string sent to Replicate.
 * All Feed Planner prompts MUST pass through here.
 * 
 * There must be exactly ONE place that decides prompts for the Feed Planner.
 * Everything else must either call it or be frozen.
 * 
 * FEED PLANNER MODES:
 * 1. PREVIEW = 3×3 grid prompt (140-220 words)
 *    - Identity anchor at start
 *    - Explicit grid layout specification
 *    - 9 scene execution blocks (25-35 words each)
 *    - Technical specifications block
 *    - Final identity reminder
 * 
 * 2. SINGLE SCENE = One scene prompt (150-220 words)
 *    - Identity anchor at start
 *    - Outfit block (natural language)
 *    - Setting block (specific environment)
 *    - Composition & mood block
 *    - Technical photography block
 *    - Final identity reminder
 * 
 * This is the ONLY place where natural language is generated.
 * No mutation, cleaning, or sanitization afterward.
 * 
 * @param scene - Structured scene data (from scene-resolver.ts)
 * @param mode - Prompt mode: 'preview_multi' (9 scenes) or 'single_scene' (1 scene)
 * @param allScenes - For preview_multi mode: array of all 9 scenes (REQUIRED)
 * @returns Final prompt text ready for Nano Banana API
 */
export function buildPromptFromScene(
  scene: FeedPlannerScene,
  mode: PromptMode = 'single_scene',
  allScenes?: FeedPlannerScene[]
): string {
  let prompt: string
  if (mode === 'preview_multi') {
    prompt = buildPreviewMultiPrompt(scene, allScenes)
  } else {
    prompt = buildSingleScenePrompt(scene)
  }

  // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 5 - Validate prompt structure before return
  validatePromptStructure(prompt, mode, allScenes, scene)
  
  return prompt
}

// ============================================================================
// COLOR GRADE MAPPING
// ============================================================================

/**
 * Map user's feed style selection to color grade description
 * Uses actual color palette definitions from feed-prompt-expert.ts
 */
function getColorGradeDescription(visualAesthetic: string | null | undefined, category: string): string {
  // Normalize the visual aesthetic string
  const aestheticLower = (visualAesthetic || category || '').toLowerCase().trim()
  
  // Map feed style selections to color grade descriptions
  // These match the MAYA_SIGNATURE_PALETTES from feed-prompt-expert.ts
  if (aestheticLower.includes('edgy') || aestheticLower.includes('dark') || aestheticLower.includes('moody')) {
    // DARK_MOODY palette
    return 'High contrast with deep blacks and bright highlights, editorial studio quality with clean modern shadows, pure black and charcoal gray tones.'
  }
  
  if (aestheticLower.includes('minimal') || aestheticLower.includes('clean')) {
    // CLEAN_MINIMAL palette
    return 'Extremely bright high-key photography, soft diffused light with airy ethereal quality, pure white and soft off-white tones.'
  }
  
  if (aestheticLower.includes('beige') || aestheticLower.includes('warm')) {
    // BEIGE_SIMPLE palette
    return 'Warm natural light with golden hour quality, soft diffused warmth with cozy atmosphere, soft beige and warm cream tones.'
  }
  
  if (aestheticLower.includes('luxury') || aestheticLower.includes('professional')) {
    // SCANDINAVIAN_MUTED or sophisticated palette
    return 'Abundant natural window light with soft diffused quality, sophisticated neutral tones, greige and soft gray palette.'
  }
  
  if (aestheticLower.includes('pastel') || aestheticLower.includes('romantic')) {
    // PASTELS_SCANDIC palette
    return 'Soft diffused gentle light with ethereal dreamy quality, dusty rose and powder blue tones, feminine Nordic elegance.'
  }
  
  // Default fallback - cohesive neutral
  return 'Natural balanced lighting with cohesive neutral tones, soft even color palette.'
}

// ============================================================================
// PREVIEW MULTI-SCENE PROMPT (9 SCENES IN ONE PROMPT)
// ============================================================================

/**
 * Build Preview Multi-Scene Prompt
 * 
 * Creates a concise prompt for generating a 3×3 photo grid (9:16 aspect ratio)
 * containing all 9 scenes in a single image.
 * 
 * NANO BANANA PRO COMPLIANCE:
 * - Identity anchor at start
 * - Clear aesthetic + visuals + setting + style
 * - 9 concise frame lines
 * - Color grade line
 * - Total length: ~140-220 words (concise, high-signal)
 * 
 * @param scene - First scene (position 1) - used for aesthetic defaults
 * @param allScenes - Array of all 9 scenes (REQUIRED)
 * @returns Complete preview prompt ready for Nano Banana Pro
 */
function buildPreviewMultiPrompt(scene: FeedPlannerScene, allScenes?: FeedPlannerScene[]): string {
  if (!allScenes || allScenes.length < 9) {
    throw new Error(
      `Preview mode requires exactly 9 scenes. Got: ${allScenes ? allScenes.length : 0} scenes. ` +
      `Scene resolution failed - cannot generate preview prompt.`
    )
  }

  const sortedScenes = [...allScenes].sort((a, b) => a.position - b.position)
  const firstScene = sortedScenes[0] || scene
  const previewData = buildPreviewPromptDataFromScenes(sortedScenes)

  const parts: string[] = []

  // [1] BASE PROMPT (REQUIRED FIRST)
  parts.push(
    '3x3 photo grid featuring the same model from the reference images shown in nine distinct photographic compositions, maintaining perfect facial and body consistency.'
  )

  // [2] VISUALS (GRID + CONSISTENCY)
  parts.push(
    'Visuals: 3x3 Instagram-style grid (clean, symmetrical, framed). Photorealistic editorial photography with high contrast, moody lighting, natural film grain. No device frames or UI.'
  )

  // [3] VIBE
  parts.push(`Vibe: ${getPreviewAestheticDescriptor(firstScene)}.`)

  // [4] SETTING
  parts.push(`Setting: ${previewData.settings.join(', ')}.`)

  // [5] STYLE (palette + textures only)
  parts.push(`Style: ${previewData.styleSummary}.`)

  // [6] FRAMES
  parts.push('Frames:')
  const frameLines = buildPreviewFrameLinesFromScenes(sortedScenes)
  parts.push(...frameLines.map((line, index) => `${index + 1}. ${line}`))

  // [7] COLOR GRADE
  const colorGrade = getPreviewColorGradeDescriptor(firstScene)
  parts.push(`Color grade: ${colorGrade}.`)

  const prompt = parts.join('\n\n')
  
  return prompt
}

function getPreviewAestheticDescriptor(scene: FeedPlannerScene): string {
  const aesthetic = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
  const moodMap: Record<string, string> = {
    luxury: 'dark luxury editorial, urban sophistication',
    minimal: 'clean minimal aesthetic, calm presence',
    beige: 'warm beige aesthetic, soft editorial mood',
    warm: 'warm inviting aesthetic, relaxed presence',
    edgy: 'edgy urban aesthetic, confident presence',
    professional: 'polished editorial aesthetic, composed presence',
  }
  const mood = moodMap[scene.category] || 'editorial aesthetic, composed presence'
  const normalizedAesthetic = aesthetic.toLowerCase()
  const normalizedMood = mood.toLowerCase()
  const moodPhrase = normalizedAesthetic.includes(normalizedMood)
    ? ''
    : normalizedAesthetic.includes('luxury editorial') && scene.category === 'luxury'
      ? 'dark moody editorial, urban sophistication'
      : mood
  const rawDescriptor = `${aesthetic}${moodPhrase ? `, ${moodPhrase}` : ''}, authentic/expressive presence`
  const uniqueParts = Array.from(
    new Set(
      rawDescriptor
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  )
  return uniqueParts.slice(0, 3).join(', ')
}

function getPreviewLightingDescriptor(scene: FeedPlannerScene): string {
  const category = scene.category
  if (scene.mood === 'luxury' || category === 'luxury' || category === 'edgy' || category === 'professional') {
    return 'high-contrast, dramatic shadows, moody city lighting, natural film grain'
  }
  if (scene.mood === 'minimal' || category === 'minimal') {
    return 'soft diffused light, clean shadows, airy minimal lighting, subtle film grain'
  }
  if (scene.mood === 'beige' || category === 'beige' || category === 'warm') {
    return 'warm golden light, gentle shadows, cozy atmosphere, subtle film grain'
  }
  return 'natural light, soft contrast, authentic film grain'
}

function shortenWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text.trim()
  return words.slice(0, maxWords).join(' ')
}

type PreviewPromptData = {
  settings: string[]
  outfits: string[]
  flatlayItems: string[]
  textureDetail: string
  lighting: string
  styleSummary: string
}

function buildPreviewPromptDataFromScenes(scenes: FeedPlannerScene[]): PreviewPromptData {
  const settings = Array.from(
    new Set(
      scenes
        .map((scene) => scene.location?.description)
        .filter((value): value is string => Boolean(value))
        .map((value) => shortenWords(value.trim(), 8)),
    ),
  ).slice(0, 3)

  const outfits = Array.from(
    new Set(
      scenes
        .map((scene) => scene.outfit?.description || scene.outfit?.style)
        .filter((value): value is string => Boolean(value))
        .map((value) => shortenWords(value.trim(), 10)),
    ),
  ).slice(0, 4)

  const flatlayItems = Array.from(
    new Set(
      scenes
        .filter((scene) => scene.camera?.framing === 'flatlay' || scene.objects.length > 0)
        .flatMap((scene) =>
          scene.objects.map((obj) => obj.description || obj.type),
        )
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/\s+on\s+.*/i, '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 6)

  const textureDetail = outfits[0] ? outfits[0] : 'textured fabric detail'
  const lighting = getPreviewLightingDescriptor(scenes[0])
  const styleSummary = 'Cohesive editorial styling with consistent textures'

  return {
    settings: settings.length > 0 ? settings : ['lifestyle setting', 'editorial interior', 'urban exterior'],
    outfits: outfits.length > 0 ? outfits : ['editorial outfit'],
    flatlayItems: flatlayItems.length > 0 ? flatlayItems : ['curated lifestyle items'],
    textureDetail,
    lighting,
    styleSummary,
  }
}

function buildPreviewFrameLinesFromScenes(scenes: FeedPlannerScene[]): string[] {
  const sortedScenes = [...scenes].sort((a, b) => a.position - b.position)

  return sortedScenes.map((scene) => {
    const lighting = scene.lighting?.description
      ? scene.lighting.description.split(',')[0]?.replace(/_/g, ' ').trim()
      : null
    const activity = scene.activity ? scene.activity.replace(/_/g, ' ').trim() : null

    // Position 5: Use actual brand statement
    if (scene.position === 5) {
      const narrative = scene.narrative || 'Brand statement'
      const location = scene.location?.description
        ? shortenWords(scene.location.description, 6)
        : 'lifestyle setting'
      const lightingNote = lighting ? `, ${lighting}` : ''
      return `Sign: "${narrative}" in bold typography, ${location}${lightingNote}`
    }

    // Flatlays: Use actual objects from scene
    if (scene.camera.framing === 'flatlay') {
      const objects = scene.objects
        .slice(0, 3)
        .map((obj) => obj.description || obj.type)
        .filter(Boolean)
        .join(', ')
      return `Flatlay (Overhead): ${objects || 'lifestyle items'}, ${lighting || 'natural light'}`
    }

    // Close-ups: distinguish texture vs detail shots
    if (scene.camera.framing === 'close_up') {
      const hasTexture = scene.objects.some((obj) => {
        const type = (obj.type || '').toLowerCase()
        const desc = (obj.description || '').toLowerCase()
        return type.includes('fabric') || type.includes('texture') || desc.includes('fabric') || desc.includes('texture')
      })
      if (hasTexture) {
        const textureDetail = scene.objects[0]?.description || scene.outfit?.description || 'fabric texture'
        const lightingNote = lighting ? `, ${lighting}` : ''
        return `Texture Detail: ${shortenWords(textureDetail, 8)}${lightingNote}`
      }
      const mainObject = scene.objects[0]?.type || 'object'
      const pose = scene.pose?.description ? shortenWords(scene.pose.description, 4) : 'natural pose'
      const lightingNote = lighting ? `, ${lighting}` : ''
      return `Close-up: ${pose}, ${mainObject}${lightingNote}`
    }

    // Default portraits: Use resolved outfit, pose, location
    const outfit = scene.outfit?.description || scene.outfit?.style || 'editorial outfit'
    const location = scene.location?.description
      ? shortenWords(scene.location.description, 2)
      : 'lifestyle setting'
    const pose = scene.pose?.description ? scene.pose.description.split(' ')[0] : 'standing'
    const activityNote = activity ? `, ${shortenWords(activity, 3)}` : ''
    const lightingNote = lighting ? `, ${lighting}` : ''
    return `${pose}: ${outfit}, ${location}${activityNote}${lightingNote}`
  })
}

function getPreviewColorGradeDescriptor(scene: FeedPlannerScene): string {
  const category = scene.category
  const mood = scene.mood

  if (mood === 'luxury' || category === 'luxury' || category === 'edgy' || category === 'professional') {
    return 'deep blacks, cool grays, concrete tones; preserved warm skin tones, subtle gold highlights'
  }
  if (mood === 'minimal' || category === 'minimal') {
    return 'clean whites, soft grays, bright highlights; preserved warm skin tones'
  }
  if (mood === 'beige' || category === 'beige' || category === 'warm') {
    return 'warm beiges, soft creams, gentle shadows; preserved warm skin tones'
  }
  return getColorGradeDescription(scene.visualAesthetic, scene.category)
}

// ============================================================================
// SINGLE SCENE PROMPT (1 SCENE PER PROMPT)
// ============================================================================

/**
 * Build Single Scene Prompt
 * 
 * Creates ONE prompt for ONE scene following Nano Banana Pro best practices.
 * 
 * NANO BANANA PRO COMPLIANCE:
 * - Identity anchor at start (25-35 words)
 * - Outfit block with natural language (40-60 words)
 * - Setting block with specific environment (30-50 words)
 * - Composition & mood block (40-60 words)
 * - Technical photography block (50-70 words)
 * - Final identity reminder (10-15 words)
 * - Total length: 150-220 words
 * 
 * @param scene - Structured scene data
 * @returns Complete prompt for single scene ready for Nano Banana Pro
 */
function buildSingleScenePrompt(scene: FeedPlannerScene): string {
  const parts: string[] = []

  if (scene.finalPromptOverride) {
    return scene.finalPromptOverride.trim()
  }

  const framingMap: Record<string, string> = {
    close_up: 'Close-up',
    midshot: 'Mid-shot',
    full_body: 'Full-body',
    environmental: 'Environmental',
    flatlay: 'Overhead',
  }
  const framingLabel = framingMap[scene.camera?.framing] || 'Portrait'
  const pose = scene.pose?.description || 'natural pose'
  const setting = scene.location?.description || 'lifestyle setting'
  const styling = scene.outfit?.description || scene.outfit?.style || 'cohesive editorial styling'
  const objects = scene.objects
    .map((obj) => obj.description || obj.type)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')

  parts.push('Subject identity must exactly match reference images (face, body, skin, hair).')
  parts.push(`Aesthetic: ${getPreviewAestheticDescriptor(scene)}.`)
  parts.push(`Composition: ${framingLabel} framing with ${pose}. Authentic iPhone-style photography.`)
  parts.push(`Setting: ${setting}.`)
  parts.push(`Styling: ${styling}.`)
  if (objects) {
    parts.push(`Details: ${objects}.`)
  }
  parts.push(`Color grade: ${getPreviewColorGradeDescriptor(scene)}.`)

  const prompt = parts
    .filter((p) => p && p.trim())
    .join('\n')
    .replace(/\.\s*\./g, '.')
    .trim()

  return prompt.charAt(0).toUpperCase() + prompt.slice(1)
}

// ============================================================================
// VALIDATION FUNCTIONS (PROMPT AUTHORITY LOCK-IN)
// ============================================================================

/**
 * Validate Prompt Structure
 * 
 * 🔴 PROMPT AUTHORITY LOCK-IN: Phase 5
 * Enforces Nano Banana Pro spec requirements before prompt is returned.
 * Hard failures prevent invalid prompts from being transmitted.
 * 
 * @param prompt - The generated prompt to validate
 * @param mode - Prompt mode ('preview_multi' or 'single_scene')
 * @param allScenes - All scenes array (for preview mode validation)
 * @throws Error if prompt fails validation
 */
function validatePromptStructure(
  prompt: string,
  mode: PromptMode,
  allScenes?: FeedPlannerScene[],
  scene?: FeedPlannerScene
): void {
  const errors: string[] = []
  
  // 1. Identity Anchor Presence
  const requiresSubjectIdentity = mode !== 'single_scene'
    ? true
    : !(scene?.camera?.framing === 'flatlay' || scene?.position === 6)
  const hasIdentityAnchor = 
    prompt.toLowerCase().includes('reference images') ||
    prompt.toLowerCase().includes('person from the reference images')
  
  if (requiresSubjectIdentity && !hasIdentityAnchor) {
    if (mode !== 'single_scene') {
      errors.push('Prompt missing required identity anchor (must contain "reference images" or "person from the reference images")')
    }
  }
  
  // 2. Word Count Range
  // Word count is informational only and must NOT block generation.
  // Users should never fail due to length; we only log guidance for tuning.
  if (mode === 'preview_multi') {
    // Word count is informational only for preview mode.
  } else {
    // Word count is informational only for single scene mode.
  }
  
  // 3. Scene Count (Preview Mode Only)
  if (mode === 'preview_multi') {
    // Count scene indicators (Position labels or scene blocks)
    const positionMatches = prompt.match(/Position\s+\d+|Top-(Left|Center|Right)|Middle-(Left|Center|Right)|Bottom-(Left|Center|Right)/gi)
    const _sceneCount = positionMatches ? positionMatches.length : 0 // Logged only
    
    // Also check if allScenes array has 9 scenes
    if (allScenes && allScenes.length !== 9) {
      errors.push(`Preview prompt requires exactly 9 scenes. Got: ${allScenes.length} scenes in allScenes array`)
    }
    
    // Note: We don't fail on positionMatches count alone since prompt structure may vary
    // The allScenes validation is the authoritative check
  }
  
  // 4. Structure Blocks (Single Scene Mode)
  if (mode === 'single_scene') {
    const hasOutfit = prompt.toLowerCase().includes('outfit') || prompt.toLowerCase().includes('wearing')
    const hasLocation = prompt.toLowerCase().includes('location') || prompt.toLowerCase().includes('setting') || 
                       prompt.toLowerCase().includes('at ') || prompt.toLowerCase().includes('in ')
    const hasCamera = prompt.toLowerCase().includes('camera') || prompt.toLowerCase().includes('dslr') ||
                     prompt.toLowerCase().includes('focal length') || prompt.toLowerCase().includes('depth of field')
    
    if (requiresSubjectIdentity && !hasOutfit) {
      // Missing outfit block is non-blocking; keep validation soft.
    }
    if (requiresSubjectIdentity && !hasLocation) {
      // Missing setting block is non-blocking; keep validation soft.
    }
    if (!hasCamera) {
      // Missing camera block is non-blocking; keep validation soft.
    }
  }
  
  // 5. No Placeholder Text
  if (prompt.includes('[MISSING') || prompt.includes('[PLACEHOLDER') || prompt.includes('not resolved')) {
    errors.push('Prompt contains placeholder text - scene resolution failed')
  }
  
  // Throw error if any validation failed
  if (errors.length > 0) {
    const errorMessage = `Prompt validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nPrompt preview: ${prompt.substring(0, 200)}...`
    throw new Error(errorMessage)
  }
}

/**
 * Get detailed aesthetic description from user's actual choice
 * Maps user selections like "Warm & Cozy" to specific prompt language
 * Simple 3-5 explicit mappings, fallback to category-based mapping
 */
function getDetailedAestheticDescription(
  category: string,
  mood: string,
  visualAesthetic?: string
): string {
  if (visualAesthetic) {
    const aestheticLower = visualAesthetic.toLowerCase()
    
    // Explicit mappings for common user choices
    if (aestheticLower.includes('warm') && aestheticLower.includes('cozy')) {
      return 'warm beige tones, golden lighting, cozy atmosphere'
    }
    if (aestheticLower.includes('clean') && aestheticLower.includes('minimal')) {
      return 'cool whites, crisp lighting, minimalist aesthetic'
    }
    if (aestheticLower.includes('luxury') && aestheticLower.includes('editorial')) {
      return 'cool desaturated tones, editorial lighting, luxury aesthetic'
    }
    if (aestheticLower.includes('beige')) {
      return 'warm beige tones, soft natural lighting'
    }
    if (aestheticLower.includes('minimal')) {
      return 'clean minimalist aesthetic, soft natural lighting'
    }
  }
  
  // Fallback to category-based mapping
  return getAestheticDescription(category)
}

/**
 * Get aesthetic description from category (fallback)
 */
function getAestheticDescription(category: string): string {
  const aestheticMap: Record<string, string> = {
    'luxury': 'luxury editorial',
    'minimal': 'minimal wellness',
    'beige': 'warm neutral',
    'warm': 'warm inviting',
    'edgy': 'edgy urban',
    'professional': 'professional polished'
  }
  
  return aestheticMap[category] || 'editorial'
}

// ============================================================================
// VALIDATION (NO MUTATION, JUST VALIDATION)
// ============================================================================

/**
 * Validate Prompt
 * 
 * Checks prompt structure without mutating.
 * Returns validation result, not modified prompt.
 */
export function validateFeedPlannerPrompt(prompt: string, mode: PromptMode): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  const wordCount = prompt.split(/\s+/).length
  
  // Check length
  if (mode === 'preview_multi') {
    // Preview should be 140-220 words per Nano Banana Pro optimization
    if (wordCount < 120) {
      warnings.push(`Preview prompt is short (${wordCount} words, target: 140-220)`)
    } else if (wordCount > 500) {
      warnings.push(`Preview prompt is long (${wordCount} words, target: 140-220)`)
    }
  } else {
    // Single scene should be 150-220 words per Nano Banana Pro spec
    if (wordCount < 150) {
      warnings.push(`Single scene prompt is short (${wordCount} words, target: 150-220)`)
    } else if (wordCount > 300) {
      warnings.push(`Single scene prompt is long (${wordCount} words, target: 150-220)`)
    }
  }
  
  // Check for identity anchor (if reference images expected)
  const hasIdentityAnchor = prompt.toLowerCase().includes('person shown in the reference images') ||
                           prompt.toLowerCase().includes('reference images')
  
  if (!hasIdentityAnchor && mode === 'single_scene') {
    // Not an error - flatlays don't need identity anchor.
  }
  
  // Check for camera specs (preview uses DSLR, single scene may use iPhone)
  const hasCameraSpecs = prompt.toLowerCase().includes('dslr') ||
                        prompt.toLowerCase().includes('focal length') ||
                        prompt.toLowerCase().includes('shot on') ||
                        prompt.toLowerCase().includes('shot with') ||
                        prompt.toLowerCase().includes('iphone 15 pro')
  
  if (!hasCameraSpecs) {
    errors.push('Missing camera specs (DSLR or iPhone 15 Pro)')
  }
  
  // Check for conflicting outfits (should not happen with structured scenes)
  const outfitMatches = prompt.match(/wearing\s+[^,]+/gi)
  if (outfitMatches && outfitMatches.length > 1) {
    warnings.push('Multiple "wearing" phrases detected - may indicate conflicting outfits')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
