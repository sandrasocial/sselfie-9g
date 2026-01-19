/**
 * Nano Banana Adapter for Feed Planner
 * 
 * ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
 * This file must NOT decide prompt content
 * 
 * Feed Planner now uses scene-resolver.ts + prompt-shaper.ts (THE AUTHORITY).
 * This adapter mutates prompts and should NOT be called for Feed Planner.
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
 * ❌ DUPLICATE DECISION — MUST BE CENTRALIZED
 * This file contains buildSingleScenePrompt() which duplicates prompt-shaper.ts
 * Feed Planner MUST use prompt-shaper.ts:buildPromptFromScene() instead
 * 
 * CRITICAL REWRITE (2026-01-18):
 * - ENFORCES coherence resolver output (resolvedFashionStyle MANDATORY)
 * - FILTERS conflicting objects (laptop/coffee/desk for athletic)
 * - SINGLE-SCENE prompts only (no multi-scene mixing)
 * - PROPER Nano Banana structure (identity → outfit → setting → light)
 * - ATHLETIC/WELLNESS guardrails
 * 
 * This adapter converts Feed Planner templates into clean, single-scene
 * natural language prompts optimized for Nano Banana Pro (LEGACY ONLY - NOT FOR FEED PLANNER).
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Prompt Mode
 * 
 * - "single": ONE frame per prompt (strict enforcement)
 * - "preview_multi": 9 scenes in ONE prompt (preview grid generation)
 */
export type PromptMode = "single" | "preview_multi"

interface AdaptFeedPlannerParams {
  templatePrompt: string
  position: number
  brandKit: any
  userId: string
  category?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" | null
  mood?: "luxury" | "minimal" | "beige" | null
  resolvedFashionStyle: string // MANDATORY - from coherence resolver
  mode?: PromptMode // Default: "single"
}

type FrameType = 'full_body' | 'midshot' | 'closeup' | 'flatlay' | 'text' | 'unknown'

interface FrameData {
  position: number
  description: string
  frameType?: FrameType
}

interface ParsedTemplate {
  frames: FrameData[]
  vibe?: string
  setting?: string
  colorGrade?: string
}

// ============================================================================
// FASHION CONTEXT RULES (CRITICAL)
// ============================================================================

/**
 * Fashion Context Compatibility Rules
 * 
 * DESIGN CHANGE (2026-01-18):
 * - Flatlays are NOW ALLOWED in all contexts
 * - officeObjects defines what to AVOID in flatlays (not block flatlays)
 * - Flatlay CONTENT is substituted, not blocked
 */
const FASHION_CONTEXT_RULES: Record<string, {
  allowedFrameTypes: FrameType[]
  officeObjects: string[] // Objects to avoid in flatlays (triggers substitution)
  allowedLocations: string[]
}> = {
  // ATHLETIC & WELLNESS CONTEXTS (Flatlays ALLOWED, office content SUBSTITUTED)
  'athletic': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'coffee', 'desk', 'workspace', 'office', 'computer', 'notebook', 'journal', 'keyboard', 'mouse'],
    allowedLocations: ['gym', 'studio', 'outdoor', 'park', 'wellness', 'fitness', 'architectural', 'urban', 'minimal space']
  },
  'elevated_athleisure': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'coffee', 'desk', 'workspace', 'office', 'computer', 'notebook', 'journal', 'keyboard', 'mouse'],
    allowedLocations: ['luxury studio', 'modern gym', 'urban architectural', 'rooftop', 'penthouse', 'minimal space']
  },
  'street_athletic': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'desk', 'workspace', 'office', 'computer', 'notebook', 'journal', 'keyboard'],
    allowedLocations: ['street', 'urban', 'city', 'architectural', 'graffiti wall', 'subway', 'sidewalk']
  },
  'cozy_active': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'desk', 'workspace', 'office', 'computer', 'keyboard'],
    allowedLocations: ['home', 'cozy interior', 'living room', 'bedroom', 'outdoor', 'park']
  },
  'warm_active': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'desk', 'workspace', 'office', 'computer', 'keyboard'],
    allowedLocations: ['warm interior', 'cozy space', 'outdoor', 'natural setting']
  },
  
  // BUSINESS & PROFESSIONAL CONTEXTS (Flatlays allowed with office objects)
  'business': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    officeObjects: ['gym equipment', 'yoga mat', 'dumbbells', 'workout gear'], // Block gym items
    allowedLocations: ['office', 'workspace', 'conference room', 'hotel lobby', 'cafe', 'architectural']
  },
  'professional': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    officeObjects: ['gym equipment', 'yoga mat', 'dumbbells', 'workout gear'],
    allowedLocations: ['office', 'workspace', 'conference room', 'hotel lobby', 'cafe', 'architectural']
  },
  'smart_casual': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    officeObjects: ['gym equipment', 'yoga mat', 'dumbbells'],
    allowedLocations: ['cafe', 'restaurant', 'hotel', 'office', 'urban', 'architectural']
  },
  
  // LIFESTYLE CONTEXTS (Flatlays allowed)
  'casual': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    officeObjects: ['office desk', 'conference room'],
    allowedLocations: ['cafe', 'home', 'outdoor', 'park', 'street', 'urban', 'beach']
  },
  'elevated_casual': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    officeObjects: ['gym equipment', 'workout gear'],
    allowedLocations: ['luxury cafe', 'hotel', 'restaurant', 'upscale venue', 'architectural']
  },
  
  // BOHEMIAN & ARTISTIC CONTEXTS (Flatlays NOW ALLOWED)
  'bohemian': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'office', 'workspace', 'corporate', 'keyboard'],
    allowedLocations: ['outdoor', 'natural setting', 'bohemian interior', 'artistic space', 'market']
  },
  'minimal_bohemian': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED
    officeObjects: ['laptop', 'office', 'workspace', 'corporate', 'keyboard'],
    allowedLocations: ['minimal interior', 'outdoor', 'architectural', 'natural light space']
  }
}

// Universal fallback for unknown fashion styles
const DEFAULT_FASHION_RULES = {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'] as FrameType[],
  officeObjects: [] as string[], // Changed from blockedObjects
  allowedLocations: ['any'] as string[]
}

// ============================================================================
// FLATLAY CONTENT LIBRARIES (CONTEXTUAL SUBSTITUTION)
// ============================================================================

/**
 * Flatlay Content Libraries
 * 
 * Defines WHAT objects appear in flatlays for each fashion context.
 * Used to SUBSTITUTE office flatlays with lifestyle-appropriate content.
 */
const FLATLAY_CONTENT_LIBRARIES: Record<string, string[]> = {
  // ATHLETIC & WELLNESS FLATLAYS
  'athletic': [
    'water bottle',
    'green juice or smoothie',
    'gym gloves',
    'yoga mat edge detail',
    'resistance bands',
    'sneakers placed neatly',
    'gym outfit folded on neutral surface',
    'smartwatch or fitness tracker',
    'white towel and water bottle',
    'wireless earbuds and phone',
    'gym bag partially open'
  ],
  
  // ELEVATED ATHLEISURE FLATLAYS (Luxury + Athletic)
  'elevated_athleisure': [
    'neutral-toned gym wear on linen surface',
    'ceramic water bottle on marble',
    'minimalist gym accessories on stone surface',
    'leather gym bag detail',
    'monochrome designer sneakers',
    'luxury activewear folded on bed',
    'smartwatch on wooden surface',
    'high-end gym essentials on neutral fabric',
    'designer water bottle and towel'
  ],
  
  // STREET ATHLETIC FLATLAYS
  'street_athletic': [
    'bold sneakers on concrete',
    'streetwear hoodie folded',
    'phone with music app visible',
    'headphones and water bottle',
    'urban accessories on textured surface',
    'sneakers and cap arranged',
    'street-style activewear details'
  ],
  
  // COZY / WARM ACTIVE FLATLAYS
  'cozy_active': [
    'soft activewear on cozy bedding',
    'tea or hot beverage',
    'fuzzy socks and leggings',
    'journal and water bottle on bed',
    'cozy athleisure outfit laid out',
    'warm blanket and phone'
  ],
  
  'warm_active': [
    'warm-toned activewear on fabric',
    'herbal tea and towel',
    'cozy gym outfit details',
    'soft lighting on wellness items'
  ],
  
  // MINIMAL ATHLETIC FLATLAYS
  'minimal_athletic': [
    'white sneakers and socks on white surface',
    'water bottle on clean surface',
    'folded activewear on neutral fabric',
    'phone with fitness app visible',
    'minimalist gym essentials',
    'simple white towel and bottle'
  ],
  
  // BUSINESS & PROFESSIONAL FLATLAYS (Office objects OK)
  'business': [
    'laptop and coffee on desk',
    'planner and pen on workspace',
    'business essentials arranged',
    'notebook and phone',
    'professional accessories'
  ],
  
  'professional': [
    'minimalist desk setup',
    'laptop and coffee mug',
    'professional accessories on desk',
    'notebook and elegant pen'
  ],
  
  'smart_casual': [
    'coffee and magazine on cafe table',
    'phone and sunglasses',
    'casual accessories on table',
    'latte and book'
  ],
  
  // CASUAL & LIFESTYLE FLATLAYS
  'casual': [
    'coffee and pastry on cafe table',
    'phone and sunglasses on outdoor table',
    'casual accessories on bed',
    'book and beverage',
    'everyday items arranged naturally',
    'phone and keys on surface'
  ],
  
  'elevated_casual': [
    'luxury cafe latte on marble',
    'designer accessories on table',
    'elegant phone and sunglasses',
    'upscale casual items arranged'
  ],
  
  // BOHEMIAN FLATLAYS
  'bohemian': [
    'natural items on textured fabric',
    'crystals and plants',
    'vintage accessories on woven surface',
    'natural jewelry and stones',
    'bohemian accessories on cloth'
  ],
  
  'minimal_bohemian': [
    'single plant on clean surface',
    'minimal jewelry on neutral fabric',
    'simple natural items arranged',
    'one statement piece on white'
  ]
}

/**
 * Resolve Flatlay Content
 * 
 * Returns appropriate flatlay description based on fashion context.
 * Used to SUBSTITUTE office flatlays with lifestyle-appropriate content.
 */
function resolveFlatlayContent(params: {
  resolvedFashionStyle: string
  category?: string | null
  mood?: string | null
}): string {
  const { resolvedFashionStyle, category } = params
  
  // Get flatlay content library for this fashion style
  const contentLibrary = FLATLAY_CONTENT_LIBRARIES[resolvedFashionStyle] || FLATLAY_CONTENT_LIBRARIES['casual']
  
  // Select 2-3 items randomly for variety
  const itemCount = Math.min(3, contentLibrary.length)
  const selectedItems: string[] = []
  
  // Simple deterministic selection (not truly random, but varied)
  const step = Math.floor(contentLibrary.length / itemCount)
  for (let i = 0; i < itemCount; i++) {
    const index = (i * step) % contentLibrary.length
    selectedItems.push(contentLibrary[index])
  }
  
  // Build flatlay description
  let flatlayDesc = 'Overhead flatlay showing '
  
  if (selectedItems.length === 1) {
    flatlayDesc += selectedItems[0]
  } else if (selectedItems.length === 2) {
    flatlayDesc += `${selectedItems[0]} and ${selectedItems[1]}`
  } else {
    flatlayDesc += `${selectedItems.slice(0, -1).join(', ')}, and ${selectedItems[selectedItems.length - 1]}`
  }
  
  flatlayDesc += ' arranged naturally on a clean surface'
  
  // Add category aesthetic if applicable
  if (category && category !== 'professional') {
    const categoryModifiers: Record<string, string> = {
      'minimal': 'with minimalist composition',
      'luxury': 'with luxurious styling',
      'beige': 'with warm beige tones',
      'warm': 'with warm natural lighting',
      'edgy': 'with modern aesthetic'
    }
    
    const modifier = categoryModifiers[category]
    if (modifier) {
      flatlayDesc += ` ${modifier}`
    }
  }
  
  return flatlayDesc
}

// ============================================================================
// MAIN ADAPTER FUNCTION
// ============================================================================

/**
 * Adapt Feed Planner data to Nano Banana format
 * 
 * CRITICAL: This function enforces:
 * 1. Coherence resolver output (resolvedFashionStyle is MANDATORY)
 * 2. Frame type filtering (no flatlays for athletic in SINGLE mode)
 * 3. Object filtering (no laptops for athletic)
 * 4. Single-scene prompts (ONE frame only) OR multi-scene (9 frames for preview)
 * 5. Proper Nano Banana structure
 * 
 * @param params Feed Planner template data with RESOLVED fashion style
 * @returns Input format for buildNanoBananaPrompt()
 */
export async function adaptFeedPlannerToNanoBanana(params: AdaptFeedPlannerParams) {
  const { templatePrompt, position, brandKit, userId, category, mood, resolvedFashionStyle, mode = "single" } = params
  
  // ========================================================================
  // PHASE 1: VALIDATION (ENFORCE COHERENCE RESOLVER)
  // ========================================================================
  
  if (!resolvedFashionStyle) {
    console.error('[NANO-BANANA-ADAPTER] ❌ CRITICAL: resolvedFashionStyle is REQUIRED')
    console.error('[NANO-BANANA-ADAPTER] ❌ Coherence resolver output must be provided')
    console.error('[NANO-BANANA-ADAPTER] ❌ Raw fashion styles are NOT allowed')
    throw new Error('COHERENCE_RESOLVER_NOT_CALLED: resolvedFashionStyle is required')
  }
  
  console.log(`[NANO-BANANA-ADAPTER] mode=${mode} ✅ Coherence resolver enforced:`, {
    position,
    resolvedFashionStyle,
    category,
    mood,
    userId
  })
  
  // ========================================================================
  // PHASE 2: MODE ROUTING (SINGLE vs PREVIEW_MULTI)
  // ========================================================================
  
  const { parseTemplateFrames } = await import('./build-single-image-prompt')
  const parsed: ParsedTemplate = parseTemplateFrames(templatePrompt)
  
  // PREVIEW_MULTI MODE: Build 9-scene prompt
  if (mode === "preview_multi") {
    console.log('[NANO-BANANA-ADAPTER] 📸 Preview multi-scene mode: Building 9-scene grid prompt')
    
    const finalPrompt = buildPreviewMultiScenePrompt({
      frames: parsed.frames,
      resolvedFashionStyle,
      category,
      mood,
      setting: parsed.setting,
      brandKit
    })
    
    console.log('[NANO-BANANA-ADAPTER] 🔍 PREVIEW PROMPT TRACE:', {
      mode: 'preview_multi',
      frameCount: parsed.frames.length,
      resolvedFashionStyle,
      category,
      mood,
      promptLength: finalPrompt.length,
      promptPreview: finalPrompt.substring(0, 200) + '...'
    })
    
    return {
      userId,
      mode: 'brand-scene' as const,
      userRequest: finalPrompt,
      inputImages: { baseImages: [] },
      brandKit,
    }
  }
  
  // SINGLE MODE: Extract one frame
  // Find the frame for this position
  const frameData = parsed.frames.find(f => f.position === position)
  
  if (!frameData) {
    console.warn('[NANO-BANANA-ADAPTER] ⚠️ No frame found for position, using fallback')
    const fallbackFrame = parsed.frames[0] || { position: 1, description: templatePrompt }
    
    return {
      userId,
      mode: 'brand-scene' as const,
      userRequest: buildSingleScenePrompt({
        frameDescription: fallbackFrame.description,
        resolvedFashionStyle,
        category,
        mood,
        setting: parsed.setting,
        brandKit,
        position
      }),
      inputImages: { baseImages: [] },
      brandKit,
    }
  }
  
  // Detect frame type
  const frameType = detectFrameType(frameData.description)
  
  console.log('[NANO-BANANA-ADAPTER] Extracted single frame:', {
    position,
    frameType,
    descriptionLength: frameData.description.length
  })
  
  // ========================================================================
  // PHASE 3: APPLY FASHION CONTEXT RULES (CONTEXTUAL FLATLAY SUBSTITUTION)
  // ========================================================================
  
  const fashionRules = FASHION_CONTEXT_RULES[resolvedFashionStyle] || DEFAULT_FASHION_RULES
  
  // NEW DESIGN (2026-01-18): All frame types are ALLOWED
  // Flatlays are NOT blocked - their CONTENT is substituted based on fashion context
  // Frame type blocking has been REMOVED
  
  console.log(`[NANO-BANANA-ADAPTER] Frame type: ${frameType} → ALLOWED (content will be contextual)`)
  
  // Process frame description (substitute flatlay if needed, or sanitize objects)
  let processedDescription = processFrameDescription(
    frameData.description,
    fashionRules.officeObjects,
    resolvedFashionStyle,
    category,
    mood
  )
  
  // ========================================================================
  // PHASE 4: BUILD SINGLE-SCENE PROMPT (PROPER NANO BANANA STRUCTURE)
  // ========================================================================
  
  const finalPrompt = buildSingleScenePrompt({
    frameDescription: processedDescription,
    resolvedFashionStyle,
    category,
    mood,
    setting: parsed.setting,
    brandKit,
    position,
    frameType
  })
  
  // ========================================================================
  // PHASE 5: DEBUG VISIBILITY (TEMPORARY)
  // ========================================================================
  
  console.log('[NANO-BANANA-ADAPTER] 🔍 PROMPT TRACE:', {
    position,
    frameType,
    resolvedFashionStyle,
    category,
    mood,
    templateKey: `${category}_${mood}`,
    promptLength: finalPrompt.length,
    promptPreview: finalPrompt.substring(0, 150) + '...',
    officeObjects: fashionRules.officeObjects.length > 0 ? fashionRules.officeObjects : 'none'
  })
  
  return {
    userId,
    mode: 'brand-scene' as const,
    userRequest: finalPrompt,
    inputImages: {
      baseImages: [], // Base images are passed separately to generateWithNanoBanana
    },
    brandKit,
  }
}

// ============================================================================
// PREVIEW MULTI-SCENE PROMPT BUILDER
// ============================================================================

/**
 * Build preview multi-scene prompt (9 scenes in ONE prompt)
 * 
 * Optimized for Nano Banana Pro:
 * - Identity anchor ONCE at top
 * - 9 brief scene descriptions (18-25 words each)
 * - Lighting description ONCE
 * - Camera specs ONCE at end
 * - Target: 180-240 words total
 */
function buildPreviewMultiScenePrompt(params: {
  frames: FrameData[]
  resolvedFashionStyle: string
  category?: string | null
  mood?: string | null
  setting?: string
  brandKit: any
}): string {
  // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 6 - Legacy function GUARDED
  // This function is deprecated and must not be called
  // Use prompt-shaper.ts:buildPromptFromScene('preview_multi') instead
  throw new Error(
    'ERROR: nano-banana-adapter prompt builders are deprecated. ' +
    'Use prompt-shaper.ts:buildPromptFromScene() instead. ' +
    'This function violates Prompt Authority Lock-In and must not be called.'
  )
  
  const { frames, resolvedFashionStyle, category, mood, brandKit } = params
  
  const parts: string[] = []
  
  // ========================================================================
  // 1. IDENTITY ANCHOR (ONCE, AT TOP)
  // ========================================================================
  
  parts.push('A realistic photo grid showing the person from the reference images in 9 different scenes')
  
  // ========================================================================
  // 2. NINE SCENE DESCRIPTIONS (BRIEF, NUMBERED)
  // ========================================================================
  
  const fashionRules = FASHION_CONTEXT_RULES[resolvedFashionStyle] || DEFAULT_FASHION_RULES
  
  // Take up to 9 frames
  const scenesToInclude = frames.slice(0, 9)
  
  for (let i = 0; i < scenesToInclude.length; i++) {
    const frame = scenesToInclude[i]
    const sceneNum = i + 1
    
    // Detect scene type BEFORE processing
    const detectedFrameType = detectFrameType(frame.description)
    const isDetailScene = detectedFrameType === 'flatlay' || detectedFrameType === 'closeup'
    
    // Process frame description (substitute flatlay if needed, or sanitize objects)
    let sceneDesc = processFrameDescription(
      frame.description,
      fashionRules.officeObjects,
      resolvedFashionStyle,
      category,
      mood
    )
    
    // Clean up instruction phrases based on scene type
    if (isDetailScene) {
      // Detail scenes: Remove "subject" phrasing, use detail-only language
      sceneDesc = sceneDesc
        .replace(/^shows the subject\s*/i, '')
        .replace(/^the subject shows\s*/i, '')
        .replace(/^the subject\s+/i, '')
        .replace(/\s+shows the subject\s+/gi, ' ')
        .replace(/shows\s+/gi, '')
        .trim()
      
      // Ensure detail phrasing
      if (!sceneDesc.toLowerCase().startsWith('overhead') && 
          !sceneDesc.toLowerCase().startsWith('an overhead') &&
          !sceneDesc.toLowerCase().startsWith('lifestyle detail')) {
        sceneDesc = 'an overhead lifestyle detail photo featuring ' + sceneDesc
      }
    } else {
      // Portrait/Movement scenes: Use subject phrasing
      sceneDesc = sceneDesc
        .replace(/^shows the subject\s*/i, 'the subject ')
        .replace(/^the subject shows\s*/i, 'the subject ')
        .replace(/shows\s+/gi, '')
        .trim()
      
      // Ensure it starts with "the subject"
      if (!sceneDesc.toLowerCase().startsWith('the subject')) {
        sceneDesc = 'the subject ' + sceneDesc
      }
    }
    
    // Ensure it starts with lowercase (will be part of "Scene X: ..." sentence)
    if (sceneDesc.length > 0) {
      sceneDesc = sceneDesc.charAt(0).toLowerCase() + sceneDesc.slice(1)
    }
    
    // Truncate to ~18-25 words for brevity
    const words = sceneDesc.split(/\s+/)
    if (words.length > 25) {
      sceneDesc = words.slice(0, 25).join(' ') + '...'
    }
    
    parts.push(`Scene ${sceneNum}: ${sceneDesc}`)
  }
  
  // ========================================================================
  // 3. LIGHTING + MOOD (ONCE, APPLIES TO ALL SCENES)
  // ========================================================================
  
  if (mood === 'luxury') {
    parts.push('All scenes feature dramatic moody lighting with rich shadows')
  } else if (mood === 'minimal') {
    parts.push('All scenes feature bright airy lighting with clean high-key feel')
  } else if (mood === 'beige') {
    parts.push('All scenes feature soft golden hour lighting with warm natural glow')
  } else {
    parts.push('All scenes feature natural lighting with soft realistic shadows')
  }
  
  // Add category aesthetic if specified
  if (category && category !== 'professional') {
    const categoryAesthetics: Record<string, string> = {
      'minimal': 'minimalist aesthetic',
      'luxury': 'luxurious high-end aesthetic',
      'beige': 'warm beige tones',
      'warm': 'warm inviting atmosphere',
      'edgy': 'edgy modern style'
    }
    
    const aestheticText = categoryAesthetics[category as string]
    if (aestheticText) {
      parts.push(`Overall ${aestheticText}`)
    }
  }
  
  // ========================================================================
  // 4. CAMERA SPECS (ONCE, AT END)
  // ========================================================================
  
  parts.push('All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic')
  
  // ========================================================================
  // FINAL ASSEMBLY
  // ========================================================================
  
  const prompt = parts
    .filter(p => p && p.trim())
    .join('. ')
    .replace(/\.\s*\./g, '.') // Clean up double periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  // Ensure proper capitalization
  return prompt.charAt(0).toUpperCase() + prompt.slice(1)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect frame type from description
 */
function detectFrameType(description: string): FrameType {
  const descLower = description.toLowerCase()
  
  // Flatlay detection (overhead, birds-eye, arranged, desk, workspace)
  if (descLower.includes('overhead') || 
      descLower.includes('flatlay') ||
      descLower.includes('arranged on') ||
      descLower.includes('birds eye') ||
      descLower.includes('desk') ||
      descLower.includes('workspace') ||
      descLower.includes('laptop') ||
      descLower.includes('coffee') ||
      descLower.includes('notebook')) {
    return 'flatlay'
  }
  
  // Close-up detection
  if (descLower.includes('close-up') || 
      descLower.includes('closeup') ||
      descLower.includes('close up') ||
      descLower.includes('detail') ||
      descLower.includes('texture') ||
      descLower.includes('extreme close')) {
    return 'closeup'
  }
  
  // Text/sign detection
  if (descLower.includes('sign') || 
      descLower.includes('text') ||
      descLower.includes('reading') ||
      descLower.includes('street sign')) {
    return 'text'
  }
  
  // Full body detection
  if (descLower.includes('full-body') || 
      descLower.includes('full body') ||
      descLower.includes('walking') ||
      descLower.includes('standing') ||
      descLower.includes('sitting') ||
      descLower.includes('leaning')) {
    return 'full_body'
  }
  
  // Midshot default
  return 'midshot'
}

/**
 * Process Frame Description with Contextual Flatlay Substitution
 * 
 * NEW BEHAVIOR (2026-01-18):
 * - Detects if frame is a flatlay
 * - If flatlay contains office objects for non-office context → SUBSTITUTE entire flatlay
 * - Otherwise → remove office objects only
 * 
 * This ensures:
 * - Scene count stays intact (no blocking)
 * - Athletic contexts get wellness flatlays (not office)
 * - Office contexts keep office flatlays
 */
function processFrameDescription(
  description: string,
  officeObjects: string[],
  resolvedFashionStyle: string,
  category?: string | null,
  mood?: string | null
): string {
  const descLower = description.toLowerCase()
  
  // Detect if this is a flatlay scene
  const isFlatlay = descLower.includes('flatlay') || 
                    descLower.includes('overhead') || 
                    descLower.includes('arranged on') ||
                    descLower.includes('birds eye') ||
                    (descLower.includes('desk') && descLower.includes('laptop'))
  
  // Check if flatlay contains any office objects
  let containsOfficeObjects = false
  let detectedOfficeObject = ''
  
  if (isFlatlay) {
    for (const officeObject of officeObjects) {
      const regex = new RegExp(`\\b${officeObject}\\b`, 'gi')
      if (regex.test(description)) {
        containsOfficeObjects = true
        detectedOfficeObject = officeObject
        break
      }
    }
  }
  
  // SUBSTITUTION LOGIC: If flatlay contains office objects, replace entire flatlay
  if (isFlatlay && containsOfficeObjects) {
    const newFlatlay = resolveFlatlayContent({
      resolvedFashionStyle,
      category,
      mood
    })
    
    console.log(`[FLATLAY-RESOLVER] Context=${resolvedFashionStyle} → Substituted office flatlay`)
    console.log(`[FLATLAY-RESOLVER] Detected: "${detectedOfficeObject}" → Replaced with lifestyle detail`)
    console.log(`[FLATLAY-RESOLVER] New flatlay: ${newFlatlay.substring(0, 80)}...`)
    
    return newFlatlay
  }
  
  // SANITIZATION LOGIC: For non-flatlays, just remove office objects
  let sanitized = description
  
  for (const officeObject of officeObjects) {
    const regex = new RegExp(`\\b${officeObject}\\b`, 'gi')
    if (regex.test(sanitized)) {
      console.log(`[NANO-BANANA-ADAPTER] 🧹 Removed "${officeObject}" from non-flatlay scene for ${resolvedFashionStyle}`)
      sanitized = sanitized.replace(regex, '')
    }
  }
  
  // Clean up resulting description
  sanitized = sanitized
    .replace(/\s+with\s+,/g, ',') // Remove orphaned "with ,"
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  return sanitized
}

/**
 * Build single-scene prompt with proper Nano Banana structure
 * 
 * SCENE-TYPE AWARE STRUCTURE:
 * 
 * Portrait/Movement scenes:
 * 1. Identity anchor (ONCE)
 * 2. Subject + outfit
 * 3. Setting (ONE location)
 * 4. Lighting + mood
 * 5. Technical specs
 * 
 * Detail/Flatlay scenes:
 * 1. NO identity anchor
 * 2. NO "subject wearing" phrasing
 * 3. "An overhead lifestyle detail photo featuring..."
 * 4. Context props + surface + lighting
 * 5. Camera line (ok)
 * 
 * Target: 80-130 words
 */
function buildSingleScenePrompt(params: {
  frameDescription: string
  resolvedFashionStyle: string
  category?: string | null
  mood?: string | null
  setting?: string
  brandKit: any
  position: number
  frameType?: FrameType
}): string {
  // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 6 - Legacy function GUARDED
  // This function is deprecated and must not be called
  // Use prompt-shaper.ts:buildPromptFromScene('single_scene') instead
  throw new Error(
    'ERROR: nano-banana-adapter prompt builders are deprecated. ' +
    'Use prompt-shaper.ts:buildPromptFromScene() instead. ' +
    'This function violates Prompt Authority Lock-In and must not be called.'
  )
  const { frameDescription, resolvedFashionStyle, category, mood, setting, brandKit, frameType } = params
  
  const parts: string[] = []
  
  // ========================================================================
  // DETECT SCENE TYPE
  // ========================================================================
  
  const detectedFrameType = frameType || detectFrameType(frameDescription)
  const isDetailScene = detectedFrameType === 'flatlay' || detectedFrameType === 'closeup'
  const isPortraitScene = detectedFrameType === 'full_body' || detectedFrameType === 'midshot' || detectedFrameType === 'closeup'
  
  // ========================================================================
  // STRUCTURE 1: IDENTITY ANCHOR (PORTRAIT/MOVEMENT ONLY)
  // ========================================================================
  
  if (!isDetailScene) {
    // Portrait/Movement scenes get identity anchor
    parts.push('A realistic photo of the person shown in the reference images')
  }
  // Detail scenes skip identity anchor
  
  // ========================================================================
  // STRUCTURE 2: SUBJECT + OUTFIT (PORTRAIT/MOVEMENT) OR DETAIL CONTENT
  // ========================================================================
  
  if (isDetailScene) {
    // Detail/Flatlay scenes: Use detail-only phrasing (NO "subject wearing")
    let detailDescription = frameDescription
      .replace(/^shows the subject\s*/i, '')
      .replace(/^the subject shows\s*/i, '')
      .replace(/^the subject\s+/i, '')
      .replace(/\s+shows the subject\s+/gi, ' ')
      .replace(/shows\s+/gi, '')
      .trim()
    
    // Ensure it starts with detail phrasing
    if (!detailDescription.toLowerCase().startsWith('overhead') && 
        !detailDescription.toLowerCase().startsWith('an overhead') &&
        !detailDescription.toLowerCase().startsWith('lifestyle detail')) {
      detailDescription = 'An overhead lifestyle detail photo featuring ' + detailDescription
    }
    
    parts.push(detailDescription)
  } else {
    // Portrait/Movement scenes: Use subject phrasing
    let cleanDescription = frameDescription
      .replace(/^shows the subject\s*/i, 'The subject ')
      .replace(/^the subject shows\s*/i, 'The subject ')
      .replace(/\s+shows the subject\s+/gi, ' the subject ')
      .replace(/shows\s+/gi, '')
    
    // Ensure it starts properly
    if (!cleanDescription.toLowerCase().startsWith('the subject')) {
      cleanDescription = 'The subject ' + cleanDescription
    }
    
    parts.push(cleanDescription)
  }
  
  // ========================================================================
  // STRUCTURE 3: SETTING (ONLY ONE, CLEAR)
  // ========================================================================
  
  // Only add setting if it's not already in the description and frameType is not flatlay
  if (setting && setting.trim() && frameType !== 'flatlay') {
    // Type assertion: setting is confirmed to be string by the check above
    const settingStr = setting as string
    const descLower = frameDescription.toLowerCase()
    const settingLower = settingStr.toLowerCase()
    const firstWord = settingLower.split(' ')[0]
    if (firstWord && !descLower.includes(firstWord)) {
      parts.push(`The photo is taken in ${settingStr}`)
    }
  }
  
  // ========================================================================
  // STRUCTURE 4: LIGHTING + MOOD (ATMOSPHERE)
  // ========================================================================
  
  // Add mood-based lighting (priority)
  if (mood && mood.trim()) {
    // Type assertion: mood is confirmed to be string by the check above
    const moodStr = mood as string
    const moodLighting: Record<string, string> = {
      'luxury': 'Dramatic moody lighting with rich shadows',
      'minimal': 'Bright airy lighting with clean high-key feel',
      'beige': 'Soft golden hour lighting with warm natural glow'
    }
    
    const lightingText = moodLighting[moodStr]
    if (lightingText) {
      parts.push(lightingText)
    }
  } else {
    // Fallback: natural lighting
    parts.push('Natural lighting with soft realistic shadows')
  }
  
  // Add category aesthetic (minimal, not verbose)
  if (category && category !== 'professional') {
    const categoryAesthetics: Record<string, string> = {
      'minimal': 'minimalist aesthetic',
      'luxury': 'luxurious high-end aesthetic',
      'beige': 'warm beige tones',
      'warm': 'warm inviting atmosphere',
      'edgy': 'edgy modern style'
    }
    
    const aestheticText = categoryAesthetics[category as string]
    if (aestheticText) {
      parts.push(aestheticText)
    }
  }
  
  // ========================================================================
  // STRUCTURE 5: TECHNICAL SPECS (CAMERA)
  // ========================================================================
  
  parts.push('Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic')
  
  // ========================================================================
  // FINAL ASSEMBLY
  // ========================================================================
  
  const prompt = parts
    .filter(p => p && p.trim())
    .join('. ') // Use periods for clear structure, not commas
    .replace(/\.\s*\./g, '.') // Clean up double periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
  
  // Ensure proper capitalization
  return prompt.charAt(0).toUpperCase() + prompt.slice(1)
}

/**
 * Build fallback prompt when frame is blocked
 */
function buildFallbackPrompt(params: {
  resolvedFashionStyle: string
  category?: string | null
  mood?: string | null
  position: number
}): string {
  const { resolvedFashionStyle, category, mood } = params
  
  // Simple fallback for incompatible frames
  const parts: string[] = []
  
  parts.push('A realistic photo of the person shown in the reference images')
  parts.push(`The subject is in a ${resolvedFashionStyle} outfit`)
  
  if (category) {
    parts.push(`with ${category} aesthetic`)
  }
  
  if (mood === 'luxury') {
    parts.push('Dramatic moody lighting')
  } else if (mood === 'minimal') {
    parts.push('Bright airy lighting')
  } else {
    parts.push('Natural lighting')
  }
  
  parts.push('Shot on iPhone 15 Pro, authentic photography')
  
  return parts.join('. ')
}
