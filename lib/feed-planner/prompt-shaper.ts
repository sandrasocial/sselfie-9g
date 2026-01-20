/**
 * FEED PLANNER — PROMPT GENERATION (NANO BANANA PRO COMPLIANT)
 * 
 * ✅ SINGLE SOURCE OF TRUTH: All Feed Planner prompt text generation happens here.
 * 
 * NANO BANANA PRO COMPLIANCE:
 * - Preview prompts: 300-450 words with 9 concise scene execution blocks
 * - Single scene prompts: 200-270 words with explicit block structure
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
 * 1. PREVIEW = 3×3 grid prompt (300-450 words)
 *    - Identity anchor at start
 *    - Explicit grid layout specification
 *    - 9 scene execution blocks (25-35 words each)
 *    - Technical specifications block
 *    - Final identity reminder
 * 
 * 2. SINGLE SCENE = One scene prompt (200-270 words)
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
  // Debug logging (temporary - for Sandra to see prompt creation)
  const position = scene.position || (allScenes?.[0]?.position || 0)
  
  let prompt: string
  if (mode === 'preview_multi') {
    prompt = buildPreviewMultiPrompt(scene, allScenes)
  } else {
    prompt = buildSingleScenePrompt(scene)
  }
  
  // Debug logging (temporary - for Sandra to see prompt creation)
  console.log('[FEED PROMPT]', {
    mode,
    position,
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 120)
  })
  
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
 * Creates a comprehensive prompt for generating a 3×3 photo grid (9:16 aspect ratio)
 * containing all 9 scenes in a single image.
 * 
 * NANO BANANA PRO COMPLIANCE:
 * - Identity anchor at start (25-30 words)
 * - Explicit 3×3 grid layout specification (15-20 words)
 * - 9 scene blocks with execution data (25-35 words each)
 * - Technical specifications block (40-50 words)
 * - Cohesion statement (20-30 words)
 * - Final identity reminder (10-15 words)
 * - Total length: 500-700 words
 * 
 * @param scene - First scene (position 1) - used for aesthetic defaults
 * @param allScenes - Array of all 9 scenes (REQUIRED)
 * @returns Complete preview prompt ready for Nano Banana Pro
 */
function buildPreviewMultiPrompt(scene: FeedPlannerScene, allScenes?: FeedPlannerScene[]): string {
  const parts: string[] = []
  
  // [1] IDENTITY ANCHOR (25-30 words) - REQUIRED FIRST
  parts.push(
    'A professional 3x3 photo grid featuring the person from the reference images. ' +
    'Preserve facial features, skin tone, and identity strictly from the uploaded photos ' +
    'across all 9 frames.'
  )
  
  // [2] GRID LAYOUT SPECIFICATION (15-20 words)
  parts.push(
    'The grid contains 9 distinct scenes arranged in 3 rows and 3 columns with subtle ' +
    'separation lines. Each scene maintains the same person but varies in outfit, ' +
    'location, and composition.'
  )
  
  // [3] SCENE-BY-SCENE DESCRIPTIONS (25-35 words each × 9)
  // CRITICAL: Use ACTUAL execution data from allScenes
  if (allScenes && allScenes.length >= 9) {
    const sortedScenes = [...allScenes].sort((a, b) => a.position - b.position)
    
    for (let i = 0; i < 9; i++) {
      const sceneData = sortedScenes[i]
      if (!sceneData) {
        console.error(`[PROMPT-SHAPER] Missing scene at position ${i + 1}`)
        continue
      }
      
      // Validate position matches expected
      if (sceneData.position !== i + 1) {
        console.warn(`[PROMPT-SHAPER] Scene position mismatch: expected ${i + 1}, got ${sceneData.position}`)
      }
      
      // Build full scene block with outfit + location + composition
      const sceneBlock = buildSceneExecutionBlock(sceneData, i + 1)
      parts.push(sceneBlock)
    }
  } else {
    // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 4 - Hard failure instead of placeholder fallback
    // Preview mode requires exactly 9 scenes - no silent failures with placeholder prompts
    throw new Error(
      `Preview mode requires exactly 9 scenes. Got: ${allScenes ? allScenes.length : 0} scenes. ` +
      `Scene resolution failed - cannot generate preview prompt.`
    )
  }
  
  // [4] TECHNICAL SPECIFICATIONS (CONCISE: ~30-35 words for preview)
  parts.push(
    'Professional DSLR, 35-85mm focal length, f/2.0-2.8 depth of field. ' +
    'High-resolution with natural skin texture. Color-graded for cohesion across all 9 frames.'
  )
  
  // [5] COHESION & COLOR GRADE (COMBINED: ~20-30 words)
  // Use user's actual feed style selection for color grading
  const firstScene = allScenes && allScenes.length > 0 ? allScenes[0] : scene
  const colorGrade = getColorGradeDescription(firstScene?.visualAesthetic, firstScene?.category)
  
  parts.push(
    `${colorGrade} Maintain facial consistency from reference images.`
  )
  
  const prompt = parts.join(' ')
  
  // Log prompt length for verification
  const wordCount = prompt.split(/\s+/).length
  console.log(`[PROMPT-SHAPER] Preview prompt generated: ${wordCount} words (target: 300-450, optimized for Nano Banana Pro)`)
  
  return prompt
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
 * - Total length: 200-270 words
 * 
 * @param scene - Structured scene data
 * @returns Complete prompt for single scene ready for Nano Banana Pro
 */
function buildSingleScenePrompt(scene: FeedPlannerScene): string {
  // 🔴 POSITION 5: SIGN/TEXT CLOSE-UP (SPECIAL HANDLING)
  // Position 5 is the CENTER ANCHOR and should ALWAYS be a sign/text close-up with brand statement
  // This is a special content type that does NOT include the person or identity anchor
  if (scene.position === 5) {
    console.log(`[SINGLE SCENE] Position 5: Routing to SIGN/TEXT builder (no person, no identity anchor)`)
    return buildSignTextBlock(scene, scene.position, getPositionLabel(scene.position))
  }
  
  const parts: string[] = []
  const isNoSubjectScene = scene.camera.framing === 'flatlay' || scene.position === 6
  
  // [IDENTITY ANCHOR - Required First] (25-35 words)
  // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 3 - Always include identity anchor per spec
  // All prompts (including flatlay) MUST start with identity anchor per Nano Banana Pro spec
  if (!isNoSubjectScene) {
    parts.push(
      'A portrait photograph of the person from the reference images. ' +
      'Use the uploaded photos as strict identity reference—preserve facial features, ' +
      'skin tone, hair, and body proportions exactly.'
    )
  }
  
  // [OUTFIT DETAILS - Natural Language] (40-60 words)
  if (scene.camera.framing !== 'flatlay' && !isNoSubjectScene) {
    const outfitDesc = formatOutfitDescription(scene.outfit)
    const outfitBlock = buildOutfitBlock(outfitDesc)
    parts.push(outfitBlock)
    
    // Add objects in context if present
    if (scene.objects.length > 0) {
      const objectsDesc = buildObjectsDescription(scene.objects)
      if (objectsDesc) {
        parts.push(`The person is ${objectsDesc}`)
      }
    }
  } else if (scene.camera.framing === 'flatlay') {
    // Flatlay: Use flatlay description instead
    const flatlayDesc = buildFlatlayDescription(scene)
    parts.push(flatlayDesc)
  } else {
    const detailObjects = scene.objects.map(obj => obj.description).filter(Boolean)
    const detailItems = detailObjects.length > 0 ? detailObjects.join(', ') : 'textured materials'
    parts.push(
      `A detail-focused close-up featuring ${detailItems}, emphasizing material texture, craftsmanship, and styling details.`
    )
  }
  
  // [SETTING & ENVIRONMENT - Clear Context] (30-50 words)
  // Only add location if NOT flatlay (flatlays focus on objects, not location)
  if (scene.camera.framing !== 'flatlay') {
    const settingBlock = buildSettingBlock(scene.location.description, scene.lighting.description)
    parts.push(settingBlock)
  } else {
    // Flatlay: Add surface/background context
    const surfaceDesc = scene.category === 'minimal' 
      ? 'on a clean minimal surface'
      : scene.category === 'luxury'
      ? 'on a luxurious surface'
      : scene.category === 'beige'
      ? 'on a warm beige surface'
      : 'on an editorial surface'
    parts.push(`Setting: ${surfaceDesc}`)
  }
  
  // [COMPOSITION & MOOD - Photographic Direction] (40-60 words)
  if (scene.camera.framing !== 'flatlay' && !isNoSubjectScene) {
    const compositionBlock = buildCompositionBlock(scene)
    parts.push(compositionBlock)
  }
  
  // [TECHNICAL SPECIFICATIONS - Photography Quality] (50-70 words)
  const technicalBlock = buildTechnicalBlock(scene.category)
  parts.push(technicalBlock)
  
  // [CRITICAL REMINDER] (10-15 words)
  if (scene.camera.framing !== 'flatlay' && !isNoSubjectScene) {
    parts.push('Maintain exact facial identity and body proportions from reference images.')
  }
  
  // Assemble final prompt
  const prompt = parts
    .filter(p => p && p.trim())
    .join(' ')
    .replace(/\.\s*\./g, '.') // Clean up double periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  // Log prompt length for verification
  const wordCount = prompt.split(/\s+/).length
  console.log(`[PROMPT-SHAPER] Single scene prompt generated: ${wordCount} words (target: 200-270)`)
  
  // Ensure proper capitalization
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
    if (mode === 'single_scene') {
      console.warn('[PROMPT-SHAPER] ⚠️ Missing identity anchor for single scene prompt')
    } else {
      errors.push('Prompt missing required identity anchor (must contain "reference images" or "person from the reference images")')
    }
  }
  
  // 2. Word Count Range
  // 🔴 PROMPT AUTHORITY LOCK-IN: Validation with Nano Banana Pro-optimized thresholds
  // REVISED TARGETS (2026-01-19):
  // - Preview mode: Brief scene blocks (~25-35 words × 9) + tech/cohesion = 120-500 words optimal
  // - Single scene mode: Concise, focused description = 100-300 words (optimal: 150-220)
  // Nano Banana Pro performs better with concise, focused descriptions rather than verbose prompts
  const wordCount = prompt.split(/\s+/).length
  if (mode === 'preview_multi') {
    // Optimal range: 120-500 (target: 300-450 for concise grid generation)
    if (wordCount < 120 || wordCount > 500) {
      errors.push(`Prompt word count ${wordCount} outside acceptable range [120-500] for preview mode (optimal: 300-450)`)
    } else if (wordCount < 300 || wordCount > 450) {
      // Within tolerance but outside optimal - log info but don't fail
      console.log(`[PROMPT-SHAPER] ℹ️ Preview prompt word count ${wordCount} outside optimal range [300-450] but acceptable [120-500]`)
    }
  } else {
    // Single scene mode: Do NOT block on word count (safety for users)
    if (wordCount < 100 || wordCount > 300) {
      console.warn(`[PROMPT-SHAPER] ⚠️ Single scene prompt word count ${wordCount} outside acceptable range [100-300] (optimal: 150-220)`)
    } else if (wordCount < 150 || wordCount > 220) {
      // Within tolerance but outside target - log info but don't fail
      console.log(`[PROMPT-SHAPER] ℹ️ Single scene prompt word count ${wordCount} outside target range [150-220] but within acceptable range [100-300]`)
    }
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
      console.warn('[PROMPT-SHAPER] ⚠️ Missing outfit description block for single scene prompt')
    }
    if (requiresSubjectIdentity && !hasLocation) {
      console.warn('[PROMPT-SHAPER] ⚠️ Missing location/setting description block for single scene prompt')
    }
    if (!hasCamera) {
      console.warn('[PROMPT-SHAPER] ⚠️ Missing camera/technical specifications block for single scene prompt')
    }
  }
  
  // 5. No Placeholder Text
  if (prompt.includes('[MISSING') || prompt.includes('[PLACEHOLDER') || prompt.includes('not resolved')) {
    errors.push('Prompt contains placeholder text - scene resolution failed')
  }
  
  // Throw error if any validation failed
  if (errors.length > 0) {
    const errorMessage = `Prompt validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nPrompt preview: ${prompt.substring(0, 200)}...`
    console.error('[PROMPT-SHAPER] ❌ VALIDATION FAILED:', errorMessage)
    throw new Error(errorMessage)
  }
  
  console.log(`[PROMPT-SHAPER] ✅ Prompt validation passed (${wordCount} words, mode: ${mode})`)
}

// ============================================================================
// HELPER FUNCTIONS (PROMPT BUILDING ONLY)
// ============================================================================

/**
 * Get Position Label for Grid Layout
 * 
 * Converts position number (1-9) to grid position label (Top-Left, Top-Center, etc.)
 */
function getPositionLabel(position: number): string {
  const row = Math.floor((position - 1) / 3) + 1
  const col = ((position - 1) % 3) + 1
  
  if (row === 1 && col === 1) return 'Top-Left'
  if (row === 1 && col === 2) return 'Top-Center'
  if (row === 1 && col === 3) return 'Top-Right'
  if (row === 2 && col === 1) return 'Middle-Left'
  if (row === 2 && col === 2) return 'Middle-Center'
  if (row === 2 && col === 3) return 'Middle-Right'
  if (row === 3 && col === 1) return 'Bottom-Left'
  if (row === 3 && col === 2) return 'Bottom-Center'
  if (row === 3 && col === 3) return 'Bottom-Right'
  return `Position ${position}`
}

/**
 * Build Scene Execution Block for Preview Prompt
 * 
 * Creates a 40-60 word scene block with diverse content types:
 * - Portraits (person visible)
 * - Object flatlays (no person)
 * - Detail close-ups (cropped person)
 * - Texture shots (no person)
 * - Overhead flatlays (arms/partial person)
 * 
 * Used in preview prompts to describe each of the 9 scenes following Instagram feed layout principles.
 */
function buildSceneExecutionBlock(scene: FeedPlannerScene, position: number): string {
  const positionLabel = getPositionLabel(position)
  
  // 🔴 DIAGNOSTIC: Log actual scene data to understand routing
  console.log(`[SCENE DATA] Position ${position}:`, {
    framing: scene.camera.framing,
    activity: scene.activity,
    objects: scene.objects.map(obj => ({ type: obj.type, description: obj.description, position: obj.position })),
    location: scene.location.type,
    narrative: scene.narrative?.substring(0, 100),
  })
  
  // 🔴 POSITION 5: SIGN/TEXT CLOSE-UP (ALWAYS - HIGHEST PRIORITY)
  // Position 5 is the CENTER ANCHOR and should ALWAYS be a sign/text close-up with brand statement
  if (position === 5) {
    console.log(`[SCENE EXECUTION] Position 5: Routing to SIGN/TEXT block`)
    return buildSignTextBlockPreview(scene, position, positionLabel)
  }
  
  // Determine content type based on framing, objects, and activity
  const isFlatlay = scene.camera.framing === 'flatlay'
  const isCloseUp = scene.camera.framing === 'close_up'
  const activityLower = scene.activity?.toLowerCase() || ''
  const narrativeLower = scene.narrative?.toLowerCase() || ''
  
  // Check object descriptions (more flexible matching)
  const objectTypes = scene.objects.map(obj => (obj.type || '').toLowerCase()).join(' ')
  const objectDescriptions = scene.objects.map(obj => (obj.description || '').toLowerCase()).join(' ')
  const allObjectText = `${objectTypes} ${objectDescriptions}`.toLowerCase()
  
  // OBJECT FLATLAY (no person) - flatlay with food/wellness objects
  if (isFlatlay && (
    allObjectText.includes('smoothie') || allObjectText.includes('bowl') ||
    allObjectText.includes('yoga mat') || allObjectText.includes('granola') ||
    allObjectText.includes('berry') || allObjectText.includes('coconut') ||
    activityLower.includes('smoothie') || narrativeLower.includes('smoothie') ||
    (position === 2 && isFlatlay) // Strategic position 2 often object flatlay
  )) {
    return buildObjectFlatlayBlockPreview(scene, position, positionLabel)
  }
  
  // TEXTURE SHOT (no person) - close-up of fabric/material
  if (isCloseUp && (
    allObjectText.includes('fabric') || allObjectText.includes('texture') ||
    allObjectText.includes('mesh') || allObjectText.includes('material') ||
    activityLower.includes('fabric') || narrativeLower.includes('texture') ||
    (position === 6 && isCloseUp) // Strategic position 6 often texture shot
  )) {
    return buildTextureShotBlockPreview(scene, position, positionLabel)
  }
  
  // DETAIL CLOSE-UP (cropped person) - hands holding objects
  if (isCloseUp && (
    scene.objects.some(obj => obj.position === 'hand') ||
    allObjectText.includes('cup') || allObjectText.includes('tea') ||
    allObjectText.includes('coffee') || allObjectText.includes('ceramic') ||
    activityLower.includes('tea') || activityLower.includes('coffee') ||
    (position === 4 && isCloseUp) // Strategic position 4 often detail close-up
  )) {
    return buildDetailCloseUpBlockPreview(scene, position, positionLabel)
  }
  
  // OVERHEAD FLATLAY (arms only) - person's hands arranging workout gear
  if (isFlatlay && (
    allObjectText.includes('mat') || allObjectText.includes('bottle') ||
    allObjectText.includes('band') || allObjectText.includes('headphone') ||
    allObjectText.includes('resistance') || allObjectText.includes('workout') ||
    activityLower.includes('arrang') || activityLower.includes('prepar') ||
    (position === 8 && isFlatlay) // Strategic position 8 often overhead flatlay
  )) {
    return buildOverheadFlatlayBlockPreview(scene, position, positionLabel)
  }
  
  // DEFAULT: PORTRAIT (full person visible)
  return buildPortraitBlockPreview(scene, position, positionLabel)
}

/**
 * Build Object Flatlay Block - PREVIEW MODE (CONCISE: ~25-30 words)
 * Example: Smoothie bowl, yoga mat, wellness objects
 */
function buildObjectFlatlayBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const objects = scene.objects.slice(0, 2).map(obj => obj.type).join(', ') // Limit to 2 objects
  return `Position ${position} (${positionLabel}): Overhead flatlay of ${objects}, natural light, clean aesthetic.`
}

/**
 * Build Object Flatlay Block - SINGLE SCENE MODE (DETAILED)
 * Example: Smoothie bowl, yoga mat, wellness objects
 * @deprecated Kept for reference - currently unused
 */
function _buildObjectFlatlayBlock(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const objects = scene.objects.map(obj => obj.description || obj.type).join(', ')
  const surface = scene.location.description.includes('marble') ? 'marble countertop' :
                  scene.location.description.includes('wood') ? 'wooden surface' :
                  scene.location.description.includes('white') ? 'clean white surface' :
                  'clean minimal surface'
  const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
  
  return `Position ${position} (${positionLabel}): A minimalist flatlay photograph featuring ${objects} on a ${surface}. Shot from directly overhead with soft natural light creating clean shadows across the surface texture, emphasizing ${aestheticDesc} aesthetic and wellness ritual.`
}

/**
 * Build Texture Shot Block - PREVIEW MODE (CONCISE: ~20-25 words)
 * Example: Athletic fabric close-up, material texture
 */
function buildTextureShotBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const fabricType = scene.outfit.style || 'athletic fabric'
  return `Position ${position} (${positionLabel}): Macro close-up of ${fabricType} texture, natural lighting.`
}

/**
 * Build Texture Shot Block - SINGLE SCENE MODE (DETAILED)
 * Example: Athletic fabric close-up, material texture
 * @deprecated Kept for reference - currently unused
 */
function _buildTextureShotBlock(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const fabricDesc = scene.outfit.description || scene.outfit.style
  const textureDesc = scene.objects.find(obj => obj.description?.includes('fabric') || obj.description?.includes('texture'))?.description || 
                     `${fabricDesc} fabric with geometric pattern texture`
  
  return `Position ${position} (${positionLabel}): An extreme close-up detail photograph of ${textureDesc} with subtle sheen. The frame fills with the technical fabric's diagonal mesh weave, emphasizing quality craftsmanship. Shot macro with shallow depth of field creating soft background blur while maintaining razor focus on mesh pattern. Natural light grazes the surface highlighting dimensional texture.`
}

/**
 * Build Detail Close-Up Block - PREVIEW MODE (CONCISE: ~25-30 words)
 * Example: Hands holding tea cup, partial body visible
 */
function buildDetailCloseUpBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const mainObject = scene.objects[0]?.type || 'object'
  const outfit = scene.outfit.style || scene.outfit.base
  return `Position ${position} (${positionLabel}): Close-up of hands holding ${mainObject}, ${outfit} visible, soft window light.`
}

/**
 * Build Detail Close-Up Block - SINGLE SCENE MODE (DETAILED)
 * Example: Hands holding tea cup, partial body visible
 * @deprecated Kept for reference - currently unused
 */
function _buildDetailCloseUpBlock(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const objects = scene.objects.map(obj => obj.description || obj.type).join(' and ')
  const outfitDesc = formatOutfitDescription(scene.outfit)
  const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
  
  return `Position ${position} (${positionLabel}): An intimate close-up detail shot focused on the person's hands holding ${objects}, with ${outfitDesc} visible in the cropped frame. Only hands and ${objects.split(' and ')[0]} are visible, emphasizing the mindful moment. Soft natural window light creates gentle shadows on skin texture, conveying ${aestheticDesc} aesthetic.`
}

/**
 * Build Overhead Flatlay Block - PREVIEW MODE (CONCISE: ~25-30 words)
 * Example: Person's hands arranging workout gear
 */
function buildOverheadFlatlayBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const objects = scene.objects.slice(0, 2).map(obj => obj.type).join(', ')
  return `Position ${position} (${positionLabel}): Overhead view of hands arranging ${objects}, arms only, bright natural light.`
}

/**
 * Build Overhead Flatlay Block - SINGLE SCENE MODE (DETAILED)
 * Example: Person's hands arranging workout gear
 * @deprecated Kept for reference - currently unused
 */
function _buildOverheadFlatlayBlock(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const objects = scene.objects.map(obj => obj.description || obj.type).join(', ')
  const outfitDesc = formatOutfitDescription(scene.outfit)
  const surface = scene.location.description.includes('white') ? 'clean white flooring' :
                  scene.location.description.includes('wood') ? 'wooden floor' :
                  'clean surface'
  
  return `Position ${position} (${positionLabel}): An overhead flatlay photograph showing the person's hands arranging ${objects} on ${surface}. Face is cropped out, showing only arms in ${outfitDesc} preparing for workout. Shot directly above with bright even natural lighting creating clean shadows, emphasizing organized fitness lifestyle and intentional workout preparation ritual.`
}

/**
 * Build Portrait Block - PREVIEW MODE (CONCISE: ~25-35 words)
 * 
 * Creates brief descriptions suitable for 3x3 grid generation.
 * Focuses on essential elements: outfit, pose, location, lighting.
 */
function buildPortraitBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const outfit = scene.outfit.style || scene.outfit.base
  const location = scene.location.description.split(' ')[0] // First word only (e.g., "gym", "coffee", "home")
  const framing = scene.camera.framing === 'full_body' ? 'full-body' : 
                  scene.camera.framing === 'midshot' ? 'mid-shot' : 'portrait'
  const pose = scene.pose?.description || 'standing'
  const lighting = scene.lighting?.description || 'natural light'
  
  return `Position ${position} (${positionLabel}): ${outfit} outfit, ${pose.split(' ')[0]} in ${location}, ${framing} angle, ${lighting.replace(/_/g, ' ')}.`
}

/**
 * Build Sign/Text Block - PREVIEW MODE (CONCISE)
 * 
 * For position 5 (center anchor): Creates a close-up of a street sign or wall sign
 * displaying the brand statement. NO person holding the sign - the sign itself is the focus.
 */
function buildSignTextBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const narrative = scene.narrative || 'Brand statement'
  const aesthetic = getDetailedAestheticDescription(scene.category, scene.mood || '', scene.visualAesthetic)
  const location = scene.location.description || 'urban street'
  
  return `Position ${position} (${positionLabel}): Close-up of a vintage street sign or wall-mounted sign displaying "${narrative}" in bold typography, ${location} background softly blurred, natural daylight, modern editorial lifestyle photography, ${aesthetic}.`
}

/**
 * Build Sign/Text Block - SINGLE SCENE MODE (DETAILED)
 * 
 * For position 5 (center anchor): Creates a detailed close-up description of a sign/text
 * with the brand statement. NO person holding it - environmental/lifestyle context.
 */
function buildSignTextBlock(scene: FeedPlannerScene, position: number, _positionLabel: string): string {
  const narrative = scene.narrative || 'Brand statement'
  const location = scene.location.description || 'urban street corner'
  const lightingDesc = scene.lighting?.description || 'natural daylight'
  const lighting = expandLightingDescription(lightingDesc, position)
  const aesthetic = getDetailedAestheticDescription(scene.category, scene.mood || '', scene.visualAesthetic)
  
  // Create natural prose for sign/text scene
  const openings = [
    'A close-up photograph of a vintage street sign reading',
    'An eye-level shot of a wall-mounted sign displaying',
    'A detailed close-up of an elegant sign showcasing',
    'A lifestyle photograph of a street sign featuring'
  ]
  const opening = openings[position % openings.length]
  
  return `${opening} "${narrative}" in bold, modern typography. The sign is positioned at eye level in ${location}, creating an authentic lifestyle aesthetic. ${lighting}. The background is softly blurred with natural bokeh, keeping focus on the crisp lettering of the sign. ${aesthetic} across the frame. Shot on iPhone 15 Pro with shallow depth of field, the sign's text remains sharp while the environment provides context without distraction.`
}

/**
 * Build Portrait Block - SINGLE SCENE MODE (DETAILED)
 * 
 * Creates natural flowing prose (40-60 words) with variation across positions.
 * Avoids robotic repetition and fragmented sentences.
 * @deprecated Kept for reference - currently unused
 */
function _buildPortraitBlock(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  // Opening variations (avoid repetition)
  const openings = [
    'The person wears',
    'Wearing',
    'The person appears in',
    'Dressed in',
    'Outfitted in'
  ]
  const opening = openings[position % openings.length]
  
  // Build natural flowing paragraph components
  const outfitDesc = formatOutfitDescription(scene.outfit)
  const locationDetail = expandLocationDescription(scene.location.description)
  const poseDetail = expandPoseDescription(scene.pose?.description, scene.camera.framing)
  const cameraAngle = getCameraAngle(scene.camera.framing)
  const moodDesc = getMoodDescription(scene.category, scene.pose?.description)
  const lightingDetail = expandLightingDescription(scene.lighting?.description || '', position)
  const aestheticDesc = getDetailedAestheticDescription(scene.category, scene.mood, scene.visualAesthetic)
  
  // Assemble as natural prose (40-60 words)
  return (
    `Position ${position} (${positionLabel}): ${opening} ${outfitDesc}, ` +
    `${poseDetail} in ${locationDetail}. Shot from ${cameraAngle} ` +
    `capturing ${moodDesc}. ${lightingDetail}, emphasizing the ${aestheticDesc} aesthetic.`
  )
}

/**
 * Expand location description with environmental details
 */
function expandLocationDescription(locationDesc: string): string {
  const descLower = locationDesc.toLowerCase()
  
  // Add architectural/environmental details to basic locations
  if (descLower.includes('gym')) {
    return 'a modern gym with floor-to-ceiling windows providing natural daylight'
  }
  if (descLower.includes('coffee shop') || descLower.includes('coffeeshop')) {
    return 'a minimalist coffee shop interior with large storefront windows'
  }
  if (descLower.includes('living room')) {
    return 'a home living room with minimalist decor and abundant natural light'
  }
  if (descLower.includes('yoga studio')) {
    return 'a peaceful yoga studio with blonde wood floors and natural window light'
  }
  if (descLower.includes('wellness center')) {
    return 'a bright wellness center featuring abundant natural light from skylights'
  }
  if (descLower.includes('home') && !descLower.includes('living room')) {
    return 'a bright home space with minimalist decor and natural lighting'
  }
  
  // Fallback: return as-is
  return locationDesc
}

/**
 * Expand pose description with energy/mood context
 */
function expandPoseDescription(poseDesc: string | undefined, framing: string): string {
  if (!poseDesc) {
    return framing === 'full_body' ? 'standing confidently' : 
           framing === 'midshot' ? 'positioned naturally' : 
           'captured in close-up'
  }
  
  const descLower = poseDesc.toLowerCase()
  
  // Add context to basic pose descriptions
  if (descLower.includes('standing')) {
    return 'standing confidently with natural posture'
  }
  if (descLower.includes('sitting')) {
    return 'seated comfortably in a relaxed pose'
  }
  if (descLower.includes('walking')) {
    return 'walking naturally with confident stride'
  }
  if (descLower.includes('yoga') || descLower.includes('stretch')) {
    return 'in a serene yoga pose with focused energy'
  }
  if (descLower.includes('relaxed')) {
    return 'positioned in a relaxed, natural stance'
  }
  if (descLower.includes('meditation') || descLower.includes('meditative')) {
    return 'seated in a centered meditation pose with peaceful expression'
  }
  
  return poseDesc
}

/**
 * Expand lighting description with variety (avoid repetition)
 * Also fixes underscore issue: "window_light" → "window light"
 */
function expandLightingDescription(lightingDesc: string, position: number): string {
  // Normalize underscores (fix "window_light" → "window light")
  const normalized = lightingDesc.replace(/_/g, ' ')
  const descLower = normalized.toLowerCase()
  
  // Base lighting type detection
  const isNatural = descLower.includes('natural') || descLower.includes('window') || descLower.includes('daylight')
  const isWarm = descLower.includes('warm') || descLower.includes('artificial') || descLower.includes('evening')
  const isOvercast = descLower.includes('overcast')
  
  // Varied descriptions to avoid "natural window light with dramatic shadows" × 7
  const naturalVariations = [
    'Natural window light streams across the space creating soft directional shadows',
    'Soft natural light from large windows creates even, flattering illumination',
    'Natural daylight floods the space with bright, clean lighting',
    'Window light provides gentle side lighting that emphasizes form',
    'Natural light creates a bright, uplifting atmosphere with subtle shadows',
    'Diffused natural light from skylights provides even, soft illumination',
    'Natural window light casts long dramatic shadows across the floor',
    'Bright natural light through large windows creates clean, minimal lighting'
  ]
  
  const warmVariations = [
    'Warm artificial lighting creates an evening ambiance with golden glow',
    'Soft artificial lighting provides intimate atmosphere with gentle shadows',
    'Warm table lamps create cozy lighting with amber tones',
    'Artificial warm lighting casts soft shadows creating an inviting atmosphere'
  ]
  
  const overcastVariations = [
    'Overcast daylight provides soft, even illumination with minimal shadows',
    'Diffused overcast light creates a calm, neutral atmosphere',
    'Soft overcast lighting eliminates harsh shadows for even exposure'
  ]
  
  if (isNatural) {
    return naturalVariations[position % naturalVariations.length]
  }
  if (isWarm) {
    return warmVariations[position % warmVariations.length]
  }
  if (isOvercast) {
    return overcastVariations[position % overcastVariations.length]
  }
  
  // Fallback: return normalized description
  return normalized
}

/**
 * Get camera angle from framing type
 */
function getCameraAngle(framing: string): string {
  const framingMap: Record<string, string> = {
    'close_up': 'eye-level close-up angle',
    'midshot': 'eye-level mid-shot angle',
    'full_body': 'eye-level full-body angle',
    'environmental': 'wide environmental angle',
    'flatlay': 'overhead flatlay angle'
  }
  return framingMap[framing] || 'eye-level angle'
}

/**
 * Get mood description from category and pose
 */
function getMoodDescription(category: string, poseDesc?: string): string {
  const poseLower = poseDesc?.toLowerCase() || ''
  
  if (poseLower.includes('relaxed')) {
    return 'relaxed, natural energy'
  }
  if (poseLower.includes('confident')) {
    return 'confident, strong presence'
  }
  if (poseLower.includes('yoga') || poseLower.includes('meditation')) {
    return 'serene, meditative focus'
  }
  if (poseLower.includes('walking')) {
    return 'dynamic forward movement and relaxed energy'
  }
  if (poseLower.includes('standing')) {
    return 'post-workout energy and strong athletic posture'
  }
  if (poseLower.includes('sitting')) {
    return 'centered, grounded meditation pose with peaceful expression'
  }
  
  // Default based on category
  const moodMap: Record<string, string> = {
    'luxury': 'editorial sophistication and refined presence',
    'minimal': 'clean, minimalist aesthetic and calm energy',
    'beige': 'warm, inviting atmosphere and cozy comfort',
    'warm': 'welcoming, authentic warmth',
    'edgy': 'confident, bold attitude',
    'professional': 'polished, professional presence'
  }
  
  return moodMap[category] || 'natural, authentic energy'
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

/**
 * Build Outfit Block for Single Scene
 * 
 * Formats outfit description into natural language sentence block.
 */
function buildOutfitBlock(outfitDescription: string): string {
  return `The person is wearing ${outfitDescription}.`
}

/**
 * Build Setting Block for Single Scene
 * 
 * Formats location and lighting into setting block.
 */
function buildSettingBlock(locationDesc: string, lightingDesc?: string): string {
  const parts: string[] = []
  
  parts.push(`Setting: ${locationDesc}`)
  
  if (lightingDesc) {
    // Normalize underscores (fix "window_light" → "window light")
    const normalized = lightingDesc.replace(/_/g, ' ')
    parts.push(normalized)
  }
  
  return parts.join('. ') + '.'
}

/**
 * Build Composition Block for Single Scene
 * 
 * Formats camera angle, pose, and mood into composition block.
 */
function buildCompositionBlock(scene: FeedPlannerScene): string {
  const parts: string[] = []
  
  // Camera angle from framing
  const framingToAngle: Record<string, string> = {
    'close_up': 'Close-up',
    'midshot': 'Eye-level',
    'full_body': 'Eye-level',
    'environmental': 'Eye-level',
    'flatlay': 'Overhead'
  }
  const cameraAngle = framingToAngle[scene.camera.framing] || 'Eye-level'
  parts.push(`Camera angle: ${cameraAngle}`)
  
  // Framing
  const framingDesc = scene.camera.framing === 'close_up' ? 'close-up' : 
                      scene.camera.framing === 'midshot' ? 'mid-shot' : 
                      scene.camera.framing === 'full_body' ? 'full-body' : 
                      scene.camera.framing === 'environmental' ? 'environmental' : 
                      'overhead'
  parts.push(`${framingDesc} framing`)
  
  // Pose
  if (scene.pose?.description) {
    parts.push(`Pose: ${scene.pose.description}`)
  }
  
  // Mood/atmosphere (derive from category or use default)
  const moodMap: Record<string, string> = {
    'luxury': 'Editorial and sophisticated',
    'minimal': 'Clean and minimalistic',
    'beige': 'Warm and cozy',
    'warm': 'Warm and inviting',
    'edgy': 'Confident and bold',
    'professional': 'Professional and polished'
  }
  const mood = moodMap[scene.category] || 'Natural and authentic'
  parts.push(`Mood: ${mood}`)
  
  return parts.join('. ') + '.'
}

/**
 * Build Technical Block for Single Scene
 * 
 * Formats technical photography specifications.
 */
function buildTechnicalBlock(category: string): string {
  const aestheticMap: Record<string, string> = {
    'luxury': 'cool tones with desaturated urban palette',
    'minimal': 'warm neutral editorial tones',
    'beige': 'warm beige and camel tones',
    'warm': 'warm golden tones',
    'edgy': 'cool desaturated tones',
    'professional': 'neutral professional tones'
  }
  
  const colorGrade = aestheticMap[category] || 'warm neutral editorial tones'
  
  return (
    'Shot with professional DSLR, 35-85mm focal length range, f/2.0-2.8 depth of field ' +
    'creating soft background blur while maintaining sharp subject focus. Natural skin ' +
    'texture showing visible pores and authentic detail. Film grain aesthetic for organic ' +
    'photographic quality. High-resolution output. Color-graded for ' +
    `${colorGrade} with consistent lighting quality.`
  )
}

/**
 * Build Subject + Outfit Description
 * 
 * Formats subject and outfit into natural language.
 * Handles flatlays differently (no "subject wearing" phrasing).
 */
function _buildSubjectOutfitDescription(scene: FeedPlannerScene): string {
  const { camera, outfit, pose } = scene
  
  // Flatlays: No subject phrasing
  if (camera.framing === 'flatlay') {
    return buildFlatlayDescription(scene)
  }
  
  // Portrait/Movement scenes: Use subject phrasing
  const outfitDesc = formatOutfitDescription(outfit)
  const poseDesc = pose.description
  
  return `The subject is ${poseDesc} wearing ${outfitDesc}`
}

/**
 * Build Flatlay Description
 * 
 * Flatlays are lifestyle detail photos, not portraits.
 * No "subject wearing" phrasing.
 * Focus on objects and styling.
 */
function buildFlatlayDescription(scene: FeedPlannerScene): string {
  const { objects, outfit, category } = scene
  
  // Build flatlay from objects + outfit context
  const objectDescs = objects.map(obj => obj.description)
  const items = objectDescs.length > 0 
    ? objectDescs.join(', ')
    : 'lifestyle items'
  
  let flatlay = `An overhead lifestyle detail photo featuring ${items}`
  
  // Add outfit context if relevant (e.g., "athletic wear folded")
  if (outfit.base.includes('athletic')) {
    flatlay += ` with ${outfit.style} activewear arranged naturally`
  } else if (outfit.base.includes('lounge')) {
    flatlay += ` with cozy ${outfit.style} items arranged naturally`
  }
  
  // Add category aesthetic
  if (category === 'minimal') {
    flatlay += ' on a clean minimal surface'
  } else if (category === 'luxury') {
    flatlay += ' on a luxurious surface'
  } else if (category === 'beige') {
    flatlay += ' on a warm beige surface'
  }
  
  flatlay += '. The outfit pieces are arranged neatly with complementary accessories, showcasing textures, materials, and color harmony in a clean, curated layout.'
  
  return flatlay
}

/**
 * Format Outfit Description
 * 
 * Converts structured outfit data to natural language.
 */
function formatOutfitDescription(outfit: FeedPlannerScene['outfit']): string {
  const parts: string[] = []
  
  // Base outfit
  if (outfit.base === 'athletic_base') {
    parts.push(`${outfit.style} activewear`)
  } else if (outfit.base === 'casual_base') {
    parts.push(`${outfit.style} casual outfit`)
  } else if (outfit.base === 'lounge_base') {
    parts.push(`${outfit.style} lounge wear`)
  } else if (outfit.base === 'professional_base') {
    parts.push(`${outfit.style} professional outfit`)
  } else if (outfit.base === 'dressy_base') {
    parts.push(`${outfit.style} dressy outfit`)
  } else {
    parts.push(`${outfit.style} outfit`)
  }
  
  // Layer (if present)
  if (outfit.layer) {
    if (outfit.layer === 'casual_layer') {
      parts.push('with a casual layer')
    } else if (outfit.layer === 'outerwear') {
      parts.push('with outerwear')
    } else {
      parts.push(`with ${outfit.layer}`)
    }
  }
  
  return parts.join(' ')
}

/**
 * Build Objects Description
 * 
 * Formats objects into natural language context.
 */
function buildObjectsDescription(objects: FeedPlannerScene['objects']): string {
  if (objects.length === 0) return ''
  
  const inHand: string[] = []
  const onTable: string[] = []
  const inBag: string[] = []
  
  objects.forEach(obj => {
    if (obj.position === 'hand') {
      inHand.push(obj.description)
    } else if (obj.position === 'table') {
      onTable.push(obj.description)
    } else if (obj.position === 'bag') {
      inBag.push(obj.description)
    }
  })
  
  const parts: string[] = []
  
  if (inHand.length > 0) {
    if (inHand.length === 1) {
      parts.push(`holding ${inHand[0]}`)
    } else {
      parts.push(`holding ${inHand.join(' and ')}`)
    }
  }
  
  if (onTable.length > 0) {
    if (onTable.length === 1) {
      parts.push(`with ${onTable[0]} on the table`)
    } else {
      parts.push(`with ${onTable.join(' and ')} on the table`)
    }
  }
  
  if (inBag.length > 0) {
    parts.push(`with ${inBag.join(' and ')} in bag`)
  }
  
  return parts.join(', ')
}

/**
 * Build Position Strategy (Strategy Only, NOT Execution)
 * 
 * Creates a strategy description for preview layout.
 * Contains ONLY: content type, framing, visual role, composition hints.
 * 
 * NO outfits, NO locations, NO poses, NO activities, NO people descriptions.
 * 
 * @param scene - Scene data (used to derive strategy, NOT execution)
 * @returns Strategy description (e.g., "Portrait anchor — urban lifestyle, strong opening image")
 */
function _buildPositionStrategy(scene: FeedPlannerScene): string {
  const position = scene.position
  const framing = scene.camera.framing
  const contentType = framing === 'flatlay' ? 'overhead' : 'portrait'
  
  // Derive visual role from position (strategy pattern)
  let visualRole: string
  let compositionHint: string
  
  if (position === 1 || position === 7) {
    visualRole = 'anchor'
    compositionHint = 'strong opening image'
  } else if (position === 2 || position === 4 || position === 6) {
    visualRole = 'breathing space'
    compositionHint = 'visual pause'
  } else if (position === 3 || position === 5) {
    visualRole = 'statement'
    compositionHint = 'bold composition'
  } else if (position === 8) {
    visualRole = 'texture'
    compositionHint = 'lifestyle detail'
  } else {
    visualRole = 'closing'
    compositionHint = 'calm closing image'
  }
  
  // Build strategy description (NO execution data)
  if (contentType === 'overhead') {
    return `Overhead — ${visualRole}, ${compositionHint}, lifestyle detail focus`
  } else {
    const framingDesc = framing === 'close_up' ? 'close-up' : framing === 'midshot' ? 'mid-shot' : 'full-body'
    return `Portrait ${visualRole} — ${framingDesc} framing, ${compositionHint}`
  }
}

/**
 * Build Single Scene Description (Execution Only)
 * 
 * ❌ DO NOT USE FOR PREVIEW
 * This function contains execution data (outfits, locations, poses).
 * Use buildPositionStrategy() for preview instead.
 * 
 * Creates a brief scene description for single-scene execution.
 * Target: 18-25 words (compressed) or 80-130 words (full)
 */
function _buildSingleSceneDescription(scene: FeedPlannerScene, compressed: boolean = false): string {
  if (compressed) {
    // Compressed version for single scene execution (18-25 words)
    // ❌ BUG: This contains execution data - DO NOT use for preview
    const outfitDesc = formatOutfitDescription(scene.outfit)
    const locationDesc = scene.location.description
    const poseDesc = scene.pose.description
    
    return `the subject ${poseDesc} wearing ${outfitDesc} in ${locationDesc}`
  } else {
    // Full version for single scene execution (80-130 words)
    return buildSingleScenePrompt(scene)
  }
}

// ============================================================================
// VALIDATION (NO MUTATION, JUST VALIDATION)
// ============================================================================

/**
 * Validate Preview Strategy Prompt (DEPRECATED)
 * 
 * ⚠️ DEPRECATED: This validation is no longer used.
 * Preview prompts now use execution data per Nano Banana Pro spec.
 * 
 * This function is kept for reference but is not called.
 */
function _validatePreviewStrategy(_prompt: string): {
  valid: boolean
  errors: string[]
} {
  // Always return valid - validation removed per Nano Banana Pro compliance
  return {
    valid: true,
    errors: []
  }
}

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
    // Preview should be 300-450 words per Nano Banana Pro optimization
    if (wordCount < 120) {
      warnings.push(`Preview prompt is short (${wordCount} words, target: 300-450)`)
    } else if (wordCount > 500) {
      warnings.push(`Preview prompt is long (${wordCount} words, target: 300-450)`)
    }
  } else {
    // Single scene should be 200-270 words per Nano Banana Pro spec
    if (wordCount < 150) {
      warnings.push(`Single scene prompt is short (${wordCount} words, target: 200-270)`)
    } else if (wordCount > 300) {
      warnings.push(`Single scene prompt is long (${wordCount} words, target: 200-270)`)
    }
  }
  
  // Check for identity anchor (if reference images expected)
  const hasIdentityAnchor = prompt.toLowerCase().includes('person shown in the reference images') ||
                           prompt.toLowerCase().includes('reference images')
  
  if (!hasIdentityAnchor && mode === 'single_scene') {
    // Not an error - flatlays don't need identity anchor
    // But log for visibility
    console.log('[PROMPT-SHAPER] No identity anchor found (may be flatlay)')
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
