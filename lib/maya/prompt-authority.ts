/**
 * PROMPT AUTHORITY LAYER
 * 
 * Phase 2C-1: Foundation Implementation
 * 
 * PURPOSE: Central routing layer for all prompt generation and validation.
 * Routes requests to appropriate builders without changing behavior.
 * 
 * RULES (Phase 2C-1):
 * - Do NOT remove or refactor existing logic
 * - Do NOT change prompt outputs
 * - Do NOT change behavior
 * - Do NOT modify existing builders
 * - Do NOT touch template systems
 * - Do NOT add feature flags yet
 * 
 * This layer is a pure routing wrapper that:
 * 1. Routes to existing builders based on mode/feature
 * 2. Applies existing validators/helpers
 * 3. Logs all operations for audit trail
 * 4. Returns identical prompts to current behavior
 * 
 * Last Updated: 2026-01-17 (Phase 2C-1 Foundation)
 */

import { buildPrompt, type PromptConstructorParams } from './prompt-constructor'
import { buildNanoBananaPrompt, type StudioProMode } from './nano-banana-prompt-builder'
import { ensureTriggerWordPrefix, ensureGenderInPrompt } from '@/lib/replicate-helpers'
import { createHash } from 'crypto'
import { PromptGenerator, type WorkbenchContext, type PromptSuggestion } from './prompt-generator'

// ============================================================================
// TYPES
// ============================================================================

export type PromptMode = 'classic' | 'pro' | 'blueprint-preview' | 'video' | 'profile-image'
export type PromptFeature = 
  | 'concept-card'
  | 'feed-prompt'
  | 'image-generation'
  | 'video-generation'
  | 'profile-image'
  | 'blueprint-preview'
  | 'feed-planner-batch'
  | 'prompt-suggestions'

export interface PromptGenerationContext {
  // User identity
  userId?: string
  triggerWord?: string
  userGender?: string
  ethnicity?: string | null
  physicalPreferences?: string | null
  
  // Request context
  userRequest?: string
  category?: string | null
  vibe?: string | null
  location?: string | null
  
  // Classic Mode specific
  conceptPrompt?: string // For image generation from stored concept
  
  // Pro Mode specific
  proMode?: StudioProMode | string
  inputImages?: {
    baseImages?: Array<{ url: string; id?: string; type?: string }>
    productImages?: Array<{ url: string; label: string; brandName?: string }>
    brandAssets?: Array<{ url: string; label?: string; type?: string }>
    textElements?: Array<{ text: string; style?: string; language?: string }>
  }
  workflowMeta?: {
    slideNumber?: number
    totalSlides?: number
    reelTitle?: string
    editInstruction?: string
    reuseGoal?: string
    platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
  }
  
  // Blueprint specific
  feedStyle?: string
  businessType?: string
  formData?: Record<string, any>
  
  // Template injection (future use)
  lockedAesthetic?: any
  
  // Additional params
  [key: string]: any
}

export interface PromptResult {
  prompt: string
  metadata: {
    builder: string // Which builder was used
    mode: PromptMode
    feature: PromptFeature
    executionTimeMs: number
    validated: boolean
    inputHash?: string // SHA-256 hash of input parameters
    outputHash?: string // SHA-256 hash of output prompt
    pathUsed?: 'authority' | 'legacy' // Which path was used
  }
}

export interface ValidationResult {
  valid: boolean
  prompt: string // Validated/fixed prompt
  fixes: string[] // What was fixed
}

export interface BatchPromptResult {
  prompts: Array<{
    prompt: string
    postIndex: number
    concept?: {
      title?: string
      description?: string
      category?: string
      [key: string]: any
    }
    metadata: {
      builder: string
      mode: PromptMode
      feature: PromptFeature
      executionTimeMs: number
      inputHash: string
      outputHash: string
      pathUsed: 'authority' | 'legacy'
    }
  }>
  metadata: {
    totalTimeMs: number
    successCount: number
    failureCount: number
  }
}

export interface FeedPlannerPostContext extends PromptGenerationContext {
  conceptPrompt: string // Maya's system prompt for this post
  postIndex: number // Position in feed (1-9)
  postPosition: number // Same as postIndex
  visualDirection: string
  purpose: string
  shotType: string
  brandVibe: string
  colorPalette?: any
}

// ============================================================================
// HASH UTILITIES (Phase 2C-4-1)
// ============================================================================

/**
 * Generate SHA-256 hash of input parameters for audit trail
 */
function hashInput(context: PromptGenerationContext): string {
  const inputString = JSON.stringify({
    userId: context.userId,
    triggerWord: context.triggerWord,
    userGender: context.userGender,
    ethnicity: context.ethnicity,
    category: context.category,
    vibe: context.vibe,
    location: context.location,
    userRequest: context.userRequest,
    // Include other relevant fields
    ...Object.fromEntries(
      Object.entries(context).filter(([key]) => 
        !['userId', 'triggerWord', 'userGender', 'ethnicity', 'category', 'vibe', 'location', 'userRequest'].includes(key)
      )
    ),
  })
  return createHash('sha256').update(inputString).digest('hex').substring(0, 16)
}

/**
 * Generate SHA-256 hash of output prompt for audit trail
 */
function hashOutput(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').substring(0, 16)
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditLog {
  timestamp: string
  mode: PromptMode
  feature: PromptFeature
  userId?: string
  builder: string
  executionTimeMs: number
  success: boolean
  error?: string
  promptLength?: number
  inputHash?: string
  outputHash?: string
  pathUsed?: 'authority' | 'legacy'
  routeId?: string // Phase 5A: Route identifier (e.g., 'EP-03')
  routePath?: string // Phase 5A: API route path (e.g., '/api/maya/generate-feed-prompt')
  promptType?: string // Phase 5A: Prompt type/category
}

function logAudit(log: AuditLog): void {
  const logEntry = {
    '[PROMPT-AUTHORITY]': {
      timestamp: log.timestamp,
      mode: log.mode,
      feature: log.feature,
      userId: log.userId || 'unknown',
      builder: log.builder,
      executionTimeMs: `${log.executionTimeMs.toFixed(2)}ms`,
      success: log.success,
      ...(log.error && { error: log.error }),
      ...(log.promptLength !== undefined && { promptLength: log.promptLength }),
      ...(log.inputHash && { inputHash: log.inputHash }),
      ...(log.outputHash && { outputHash: log.outputHash }),
      ...(log.pathUsed && { pathUsed: log.pathUsed }),
      ...(log.routeId && { routeId: log.routeId }),
    },
  }
  
  if (log.success) {
    console.log(JSON.stringify(logEntry, null, 2))
  } else {
    console.error(JSON.stringify(logEntry, null, 2))
  }
  
  // Phase 5A: Persist to database (non-blocking)
  if (log.routeId && log.outputHash) {
    // Import dynamically to avoid circular dependencies
    import('@/lib/maya/prompt-audit-storage').then(({ persistPromptAuditEvent }) => {
      persistPromptAuditEvent({
        routeId: log.routeId,
        routePath: log.routePath,
        promptType: log.promptType,
        fingerprint: log.outputHash,
        status: log.success ? 'ok' : 'error',
        errorCode: log.error,
        userId: log.userId,
        mode: log.mode,
        feature: log.feature,
        builder: log.builder,
        executionTimeMs: Math.round(log.executionTimeMs),
        promptLength: log.promptLength,
        inputHash: log.inputHash,
        outputHash: log.outputHash,
        pathUsed: log.pathUsed,
      }).catch((err) => {
        // Already handled in persistPromptAuditEvent (fails silently)
        console.warn('[PROMPT-AUTHORITY] Failed to persist audit event:', err)
      })
    }).catch(() => {
      // Ignore import errors (non-critical)
    })
  }
}

// ============================================================================
// AUTHORITY AUDIT HELPER (Phase 4A - Standardized Audit Logging)
// ============================================================================

/**
 * Standardized Authority audit logging helper.
 * 
 * Phase 4A: Provides consistent audit logging format for all Authority wrappers.
 * Ensures all prompt entry points log in the same format for observability.
 * 
 * @param routeId - Entry point identifier (e.g., 'EP-01', 'EP-04')
 * @param fingerprint - SHA-256 hash fingerprint of prompt (first 16 chars)
 * @param metadata - Additional audit metadata
 */
export function createAuthorityAudit(
  routeId: string,
  fingerprint: string,
  metadata: {
    mode: PromptMode | string
    feature: PromptFeature | string
    userId?: string | number
    builder: string
    executionTimeMs: number
    success: boolean
    promptLength: number
    inputHash?: string
    error?: string
  }
): void {
  logAudit({
    timestamp: new Date().toISOString(),
    mode: metadata.mode,
    feature: metadata.feature,
    userId: metadata.userId?.toString(),
    builder: metadata.builder,
    executionTimeMs: metadata.executionTimeMs,
    success: metadata.success,
    error: metadata.error,
    promptLength: metadata.promptLength,
    inputHash: metadata.inputHash,
    outputHash: fingerprint,
    pathUsed: 'authority',
  })
  
  console.log(`[PROMPT-AUTHORITY] ${routeId} prompt routed, fingerprint: ${fingerprint}`)
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Generate a prompt using the appropriate builder based on mode and feature.
 * 
 * This function routes to existing builders without changing their behavior.
 * All prompts are logged for audit trail.
 * 
 * @param mode - Generation mode (classic, pro, blueprint-preview, etc.)
 * @param feature - Feature type (concept-card, feed-prompt, etc.)
 * @param context - Generation context with user data and request parameters
 * @returns Prompt result with metadata
 */
export async function generatePrompt(
  mode: PromptMode,
  feature: PromptFeature,
  context: PromptGenerationContext
): Promise<PromptResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  let prompt = ''
  let builder = 'unknown'
  let success = false
  let error: string | undefined
  
  try {
    // Route to appropriate builder based on mode and feature
    if (mode === 'classic') {
      if (feature === 'concept-card') {
        // Classic Mode concept cards use prompt-constructor
        // Note: This is a two-stage process (Maya → prompt-constructor)
        // For now, we only handle the prompt-constructor stage
        // Maya chat stage remains in API route (Phase 2C-3)
        
        if (!context.category || !context.vibe || !context.location) {
          throw new Error('Classic Mode concept-card requires category, vibe, and location')
        }
        
        const params: PromptConstructorParams & { userRequest?: string } = {
          category: context.category,
          vibe: context.vibe,
          location: context.location,
          userAge: context.userAge,
          userFeatures: context.userFeatures,
          userGender: context.userGender,
          hairStyle: context.hairStyle,
          action: context.action,
          expression: context.expression,
          format: context.format,
          userRequest: context.userRequest,
        }
        
        prompt = buildPrompt(params)
        builder = 'prompt-constructor'
        success = true
        
      } else if (feature === 'image-generation') {
        // Classic Mode image generation uses stored concept prompt + validation
        // This is handled by validatePrompt() - see below
        throw new Error('Classic Mode image-generation should use validatePrompt() instead')
        
      } else if (feature === 'feed-prompt') {
        // Classic Mode feed prompts use Maya chat (not handled here yet)
        // This will be handled in Phase 2C-3
        throw new Error('Classic Mode feed-prompt generation not yet implemented in Authority Layer')
        
      } else {
        throw new Error(`Unsupported feature '${feature}' for Classic Mode`)
      }
      
    } else if (mode === 'pro') {
      if (feature === 'image-generation' || feature === 'feed-prompt') {
        // Pro Mode uses NanoBanana Pro prompt builder
        if (!context.userId) {
          throw new Error('Pro Mode requires userId')
        }
        if (!context.userRequest) {
          throw new Error('Pro Mode requires userRequest')
        }
        if (!context.proMode) {
          throw new Error('Pro Mode requires proMode')
        }
        
        const result = await buildNanoBananaPrompt({
          userId: context.userId,
          mode: context.proMode as StudioProMode | 'brand_scenes' | 'text_overlays' | 'transformations' | 'educational' | 'carousel_slides' | 'reel_covers',
          userRequest: context.userRequest,
          inputImages: context.inputImages || {
            baseImages: [],
            productImages: [],
            brandAssets: [],
            textElements: [],
          },
          workflowMeta: context.workflowMeta,
          brandKit: context.brandKit,
          preferences: context.preferences,
          conversationContext: context.conversationContext,
        })
        
        prompt = result.optimizedPrompt
        builder = 'nano-banana-prompt-builder'
        success = true
        
      } else {
        throw new Error(`Unsupported feature '${feature}' for Pro Mode`)
      }
      
    } else if (mode === 'blueprint-preview') {
      // Blueprint preview uses Maya chat - delegate to existing route logic
      // Phase 2C-3: Route through Authority Layer for audit logging
      // The actual generation happens in the route, we just audit log it
      throw new Error('Blueprint preview generation should be handled by route with Authority Layer audit logging')
      
    } else if (mode === 'video') {
      // Video generation uses enhanceMotionPrompt() - now handled here
      if (!context.motionPrompt && !context.imageDescription) {
        throw new Error('Video generation requires motionPrompt or imageDescription')
      }
      
      // Phase 2C-3: Extract enhanceMotionPrompt() logic here
      // If Maya provided a prompt, trust it completely
      if (context.motionPrompt && context.motionPrompt.trim().length > 0) {
        prompt = context.motionPrompt.trim()
        builder = 'maya-motion-prompt'
        success = true
      } else {
        // Fallback: minimal motion prompt
        prompt = "Standing naturally, subtle breathing motion visible"
        builder = 'fallback-motion-prompt'
        success = true
      }
      
    } else if (mode === 'profile-image') {
      // Profile image uses hardcoded prompt
      if (!context.triggerWord) {
        throw new Error('Profile image requires triggerWord')
      }
      
      prompt = `${context.triggerWord}, professional headshot, neutral expression, well-lit, natural skin texture with pores visible, shot on iPhone 15 Pro portrait mode, shallow depth of field`
      builder = 'hardcoded-profile-template'
      success = true
      
    } else {
      throw new Error(`Unsupported mode '${mode}'`)
    }
    
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    success = false
    prompt = ''
  }
  
  const executionTimeMs = Date.now() - startTime
  
  // Generate hashes for audit trail
  const inputHash = hashInput(context)
  const outputHash = prompt ? hashOutput(prompt) : undefined
  
  // Audit logging
  logAudit({
    timestamp,
    mode,
    feature,
    userId: context.userId,
    builder,
    executionTimeMs,
    success,
    error,
    promptLength: prompt.length,
    inputHash,
    outputHash,
    pathUsed: 'authority',
  })
  
  if (!success) {
    throw new Error(`Prompt generation failed: ${error}`)
  }
  
  return {
    prompt,
    metadata: {
      builder,
      mode,
      feature,
      executionTimeMs,
      validated: false, // Will be true if validatePrompt() was called
      inputHash,
      outputHash,
      pathUsed: 'authority',
    },
  }
}

// ============================================================================
// PROMPT SUGGESTIONS WRAPPER (Phase 3A - EP-02 Migration)
// ============================================================================

/**
 * Generate prompt suggestions for workbench UI.
 * 
 * This function wraps PromptGenerator.generatePromptSuggestions() to route
 * through Prompt Authority Layer for audit logging while preserving behavior.
 * 
 * Phase 3A: Migrating EP-02 (/api/maya/generate-prompt-suggestions) to use Authority.
 * 
 * @param context - Workbench context (images, user intent, etc.)
 * @returns Array of prompt suggestions
 */
export async function generatePromptSuggestions(
  context: WorkbenchContext
): Promise<PromptSuggestion[]> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  let suggestions: PromptSuggestion[] = []
  let success = false
  let error: string | undefined
  
  try {
    // Route to PromptGenerator (preserves existing behavior)
    const generator = new PromptGenerator()
    suggestions = await generator.generatePromptSuggestions(context)
    success = true
    
    // Compute fingerprint hash of suggestions for observability
    const suggestionsFingerprint = createHash('sha256')
      .update(JSON.stringify(suggestions.map(s => ({ id: s.id, prompt: s.prompt }))))
      .digest('hex')
      .substring(0, 16)
    
    // Audit logging (Phase 3A - observability)
    const executionTimeMs = Date.now() - startTime
    logAudit({
      timestamp,
      mode: 'pro', // Suggestions are for Pro Mode workbench
      feature: 'prompt-suggestions',
      userId: undefined, // Workbench context doesn't include userId
      builder: 'prompt-generator',
      executionTimeMs,
      success,
      error,
      promptLength: suggestions.reduce((sum, s) => sum + s.prompt.length, 0),
      inputHash: createHash('sha256').update(JSON.stringify({
        images: context.images?.length || 0,
        userIntent: context.userIntent,
        contentType: context.contentType,
      })).digest('hex').substring(0, 16),
      outputHash: suggestionsFingerprint,
      pathUsed: 'authority',
    })
    
    console.log(`[PROMPT-AUTHORITY] Prompt suggestions generated: ${suggestions.length} suggestions, fingerprint: ${suggestionsFingerprint}`)
    
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    success = false
    suggestions = []
    
    // Audit logging for errors
    const executionTimeMs = Date.now() - startTime
    logAudit({
      timestamp,
      mode: 'pro',
      feature: 'prompt-suggestions',
      userId: undefined,
      builder: 'prompt-generator',
      executionTimeMs,
      success: false,
      error,
      pathUsed: 'authority',
    })
    
    throw err
  }
  
  return suggestions
}

// ============================================================================
// BLUEPRINT CONCEPTS WRAPPER (Phase 3A P0-3 - EP-06 Migration)
// ============================================================================

/**
 * Generate blueprint concept prompt via Authority Layer.
 * 
 * This function wraps blueprint concept prompt generation to route
 * through Prompt Authority Layer for audit logging while preserving behavior.
 * 
 * Phase 3A P0-3: Migrating EP-06 (/api/blueprint/generate-concepts) to use Authority.
 * 
 * @param context - Blueprint generation context
 * @returns Prompt string with metadata
 */
export function generateBlueprintConceptsPrompt(context: {
  formData: {
    business: string
    dreamClient: string
    vibe: string
  }
  selectedFeedStyle: string
  aestheticStyle: string
  businessProps: string
}): {
  prompt: string
  metadata: {
    routeId: 'EP-06'
    promptType: 'blueprint-concepts'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Build prompt (preserves exact existing logic)
  const prompt = `You are Maya, SSELFIE's personal brand strategist. You help creators build authentic, visible brands through personalized Pro Photoshoot grids that create consistent Instagram feeds.

You are generating ONE Pro Photoshoot grid concept. This is a 3x3 grid (9 frames) that shows the same person in different angles, settings, and poses while maintaining perfect facial and body consistency.

**TITLE REQUIREMENTS:**
- 3-5 words that describe the aesthetic and setting
- Examples: "Luxury SoHo Evening", "Minimal Copenhagen Light", "Beige Parisian Café", "Edgy Brooklyn Street", "Professional London Office"
- Should reflect: [Aesthetic] + [Location/Setting] or [Aesthetic] + [Style]
- Use the selected feed style (${context.selectedFeedStyle}) and vibe (${context.formData.vibe})

**DESCRIPTION REQUIREMENTS:**
- 2-3 sentences describing what the photoshoot grid will show
- Should mention: the setting/location, the aesthetic style, the type of shots (close-up, full body, detail, etc.)
- Should feel inspiring and help the user visualize their brand photos
- Write in a friendly, teaching tone (as if you're explaining to them what they'll get)

**MANDATORY REQUIREMENTS (EVERY FLATLAY PROMPT MUST HAVE):**
1. **Camera Specs:** "shot on iPhone 15 Pro" OR "shot on iPhone 15 Pro, 50mm"
2. **Film Grain + Muted Colors:** "film grain, muted colors" OR "visible film grain, muted color palette"
3. **Uneven Lighting:** "uneven lighting with mixed color temperatures" OR "uneven natural lighting, mixed color temperatures"
4. **Authenticity Keywords:** "candid photo" or "candid moment", "amateur cellphone photo" or "cellphone photo"
5. **End with:** "authentic iPhone photo aesthetic"

**NEVER USE:**
❌ "8K", "4K", "high resolution", "high quality"
❌ "perfect", "flawless", "stunning", "beautiful", "gorgeous"
❌ "professional photography", "editorial", "magazine quality"
❌ "perfect lighting", "studio lighting", "professional lighting", "clean lighting", "even lighting"
❌ "white background" (causes blur in FLUX)
❌ "ultra realistic", "photorealistic"
❌ "vibrant colors" (use "muted desaturated palette" instead)

USER'S BRAND CONTEXT:
• Business: "${context.formData.business}"
• Dream Client: "${context.formData.dreamClient}"  
• Brand Vibe: "${context.formData.vibe}"
• Feed Aesthetic: "${context.selectedFeedStyle}" (${context.aestheticStyle})

**AESTHETIC STYLE CONTEXT:**
${
  context.aestheticStyle === "scandinavian-light"
    ? `Light & Minimalistic: Bright, clean, Scandinavian-inspired. Think Copenhagen, white spaces, natural daylight, minimal styling.`
    : context.aestheticStyle === "dark-moody"
      ? `Dark & Moody: Sophisticated, cinematic, luxury aesthetic. Think SoHo NYC, evening light, deep blacks, rich charcoals.`
      : context.aestheticStyle === "beige-aesthetic"
        ? `Beige Aesthetic: Soft greige, warm taupes, refined minimalism. Think Parisian cafés, neutral tones, sophisticated neutrals.`
        : `Bold & Colorful: Vibrant, energetic, contemporary. Think color-blocked styling, saturated tones.`
}

**TITLE EXAMPLES:**
- "Luxury SoHo Evening" (for luxury + dark moody)
- "Minimal Copenhagen Light" (for minimal + light minimalistic)
- "Beige Parisian Café" (for beige + beige aesthetic)
- "Edgy Brooklyn Street" (for edgy + dark moody)
- "Professional London Office" (for professional + beige aesthetic)

**DESCRIPTION EXAMPLES:**
- "A 3x3 grid showcasing 9 distinct angles in a luxury SoHo setting at dusk. Close-up portraits, full-body shots, and detail shots of designer accessories, all maintaining perfect consistency while capturing the dark and moody luxury aesthetic."
- "A minimal photoshoot grid set in bright Copenhagen spaces. Nine frames showing different perspectives - from close-up portraits to environmental shots - all in clean whites and natural Scandinavian light, maintaining your consistent brand presence."
- "A beige aesthetic grid featuring 9 cohesive shots in a Parisian café setting. Mix of portraits, detail shots of accessories, and full-body moments, all in warm camel and beige tones with natural Parisian daylight."

**YOUR TASK:**
Generate ONE concept with:
1. **Title:** 3-5 words that capture the aesthetic and setting (use ${context.selectedFeedStyle} aesthetic + ${context.formData.vibe} vibe)
2. **Description:** 2-3 sentences explaining what the photoshoot grid will show - the setting, the types of shots (close-up, full body, detail, environmental), and the aesthetic style. Write in a friendly, teaching tone.

**CONTEXT:**
- Business: ${context.formData.business}
- Dream Client: ${context.formData.dreamClient}
- Vibe: ${context.formData.vibe}
- Feed Style: ${context.selectedFeedStyle} (which maps to ${context.aestheticStyle})

Return ONLY valid JSON (no markdown):
{
  "concepts": [
    {
      "title": "3-5 word evocative title (aesthetic + setting/style)",
      "prompt": "2-3 sentence description of what the photoshoot grid will show - setting, shot types, aesthetic. Friendly teaching tone.",
      "category": "photoshoot"
    }
  ]
}`
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(prompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3A - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'blueprint-preview',
    feature: 'blueprint-concepts',
    userId: undefined, // Blueprint may not have userId (guest flow)
    builder: 'blueprint-prompt-builder',
    executionTimeMs,
    success: true,
    promptLength: prompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      business: context.formData.business,
      feedStyle: context.selectedFeedStyle,
      aestheticStyle: context.aestheticStyle,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-06', // Phase 5A: Route identifier
    routePath: '/api/blueprint/generate-concepts', // Phase 5A: Route path
    promptType: 'blueprint-concepts', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Blueprint concepts prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    prompt,
    metadata: {
      routeId: 'EP-06',
      promptType: 'blueprint-concepts',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// MAYA FEED PROMPT WRAPPER (Phase 3B P1-1 - EP-03 Migration)
// ============================================================================

/**
 * Generate Maya feed prompt system prompt via Authority Layer.
 * 
 * This function wraps the complex system prompt building logic for EP-03
 * to route through Prompt Authority Layer for audit logging while preserving behavior.
 * 
 * Phase 3B P1-1: Migrating EP-03 (/api/maya/generate-feed-prompt) to use Authority.
 * 
 * @param context - Feed prompt generation context
 * @returns System prompt string with metadata
 */
export function generateMayaFeedPromptSystemPrompt(context: {
  isProMode: boolean
  mayaPersonality: string
  userContext: string
  promptingPrinciples: string
  postType: string | null | undefined
  caption: string | null | undefined
  feedPosition: number | null | undefined
  colorTheme: string | null | undefined
  brandVibe: string | null | undefined
  triggerWord: string
  gender: string | null
  userGender: string
  ethnicity: string | null
  brandColors: string
  cleanedReferencePrompt: string | null
  physicalPreferences: string | null
  isRegeneration: boolean | null | undefined
  category: string | null | undefined
}): {
  systemPrompt: string
  metadata: {
    routeId: 'EP-03'
    promptType: 'maya-feed-prompt'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Build system prompt (preserves exact existing logic from route)
  const {
    isProMode,
    mayaPersonality,
    userContext,
    promptingPrinciples,
    postType,
    caption,
    feedPosition,
    colorTheme,
    brandVibe,
    triggerWord,
    gender,
    userGender,
    ethnicity,
    brandColors,
    cleanedReferencePrompt,
    physicalPreferences,
    isRegeneration,
    category,
  } = context
  
  const systemPrompt = `${mayaPersonality}

${userContext}

${promptingPrinciples}

=== YOUR TASK: GENERATE INSTAGRAM FEED POST PROMPT ===

You are Maya, an elite AI Fashion Stylist generating ${isProMode ? "a Nano Banana Pro" : "a FLUX"} prompt for an Instagram feed post. This is NOT a concept card - this is for the user's actual Instagram feed that will be published.

Apply YOUR fashion expertise:
- Create SPECIFIC outfit descriptions (material + color + garment type), NOT generic terms like "trendy outfit"
- Use YOUR fashion intelligence to suggest sophisticated, brand-aligned styling
- Include detailed location descriptions that match the brand aesthetic
- Apply natural, authentic posing and expressions
- Create cinematic lighting that feels authentic, not staged

POST DETAILS:
- Post Type: ${postType}
- Caption: ${caption || "No caption provided"}
- Feed Position: ${feedPosition ? `Post #${feedPosition} in the feed` : "Not specified"}
- Color Theme: ${colorTheme || "Not specified"}
- Brand Vibe: ${brandVibe || "Not specified"}
- User's Trigger Word: ${triggerWord}
- User's Gender: ${gender || "Not specified"}
${brandColors ? `- User's Brand Colors: ${brandColors}` : ""}
${cleanedReferencePrompt ? `- Reference Prompt (from strategy - IGNORE THIS FORMAT, it's generic and missing requirements. Use ONLY for content ideas, generate completely new prompt): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}` : ""}

=== 🔴 CRITICAL RULES FOR THIS GENERATION (NON-NEGOTIABLE) ===

${isProMode ? `
**PRO MODE (Nano Banana Pro):**
- Use natural language prompts (100-150 words)
- NO trigger words - Nano Banana uses reference images instead
- Professional photography aesthetic
- Rich visual storytelling with brand context
` : `
**CLASSIC MODE (FLUX LoRA):**
TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"
${ethnicity ? `ETHNICITY: "${ethnicity}" (MUST include in prompt for accurate representation)` : ""}
`}
${
  physicalPreferences
    ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- **IMPORTANT:** Convert instruction language to descriptive language${isProMode ? " for Nano Banana" : " for FLUX"}, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent
- Include them ${isProMode ? "naturally in the description" : "RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions"}
`
    : ""
}

**🔴 MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):**

${isProMode ? `
**PRO MODE (Nano Banana Pro):**
1. **Identity Anchor** - Start with "Use the uploaded photos as strict identity reference" (MANDATORY)
2. **Natural Language Description** - Rich scene description with person, outfit, location (100-150 words total)
3. **NO trigger words** - Use reference images for identity preservation
4. **Professional photography** - Professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
5. **Rich styling details** - Specific outfit, location, lighting descriptions
6. **Brand context** - Embed brand names naturally in outfit descriptions (e.g., "wearing an Alo Yoga set"), NOT as separate metadata
` : `
1. **Start with EXACT FORMAT** ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '(ONLY FOR USER POSTS - SKIP FOR OBJECT/FLATLAY/SCENERY POSTS):' : '(FOR USER POSTS):'} "${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '[object/scenery/flatlay description]' : `${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}`}"

   **CRITICAL - TRIGGER WORD PLACEMENT** ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? '(SKIP FOR OBJECT/FLATLAY/SCENERY POSTS):' : '(FOR USER POSTS):'}
   ${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
   - This is an OBJECT/FLATLAY/SCENERY post - DO NOT include trigger word or user
   - Focus on the objects, products, flatlay items, or scenery
   - Format: "[object/scenery description], shot on iPhone 15 Pro, [lighting], [styling]"
   ` : `
   - Trigger word MUST be the FIRST word in every prompt
   - This is non-negotiable for character likeness preservation
   - Format: "${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}, [rest of prompt]"
   - DO NOT use username, email, or any other identifier - ONLY use the trigger word "${triggerWord}"
   `}

2. **Authentic iPhone Style (MANDATORY):**
   - ✅ **ALWAYS include:** "candid photo" or "candid moment" (prevents plastic/posed look)
   - ✅ **ALWAYS include:** "amateur cellphone photo" or "cellphone photo" (prevents professional look)
   - ✅ **THEN add:** "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
   - ❌ NO natural imperfections lists (removed - too complex)
   - ❌ NO film grain requirements (removed - too complex)
   - ❌ NO muted color requirements (removed - too complex)
   - ❌ NO skin texture descriptions beyond "natural" (removed - too complex)
`}

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**

${isProMode ? `
**PRO MODE (Nano Banana Pro) - Natural Language (100-150 words):**
1. **IDENTITY** - Start with "Use the uploaded photos as strict identity reference" (MANDATORY FIRST)
2. **OUTFIT & BRAND DETAILS** - Specific outfit details (material, color, garment type). Embed brand names naturally here (e.g., "wearing an Alo Yoga set", "in The Row cashmere sweater"), NOT separately
3. **SETTING & MOOD** - Detailed location description that matches brand aesthetic, atmosphere, mood
4. **TECHNICAL/STYLE** - Professional lighting description (e.g., "soft diffused natural window light"), camera specs (e.g., "85mm lens, f/2.0 depth of field"), photographic style
5. **POSE & EXPRESSION** - Natural posing and expression

**NO trigger words** - Use reference images for identity preservation
**Natural language** - Write like describing to a photographer, not keyword stuffing. Use full sentences, not comma-separated keyword lists.
**Brand Names:** Must be naturally embedded in outfit descriptions. Do not list them as separate metadata or tags.
` : `
${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
**FOR OBJECT/FLATLAY/SCENERY POSTS (NO USER):**
1. **OBJECT/SCENERY DESCRIPTION** (detailed description of items/scenery - 8-15 words)
2. **COMPOSITION** (arrangement, layout, framing - 4-6 words)
3. **STYLING** (colors, textures, props - 4-8 words)
4. **LIGHTING** (with imperfections - 5-8 words)
5. **TECHNICAL SPECS** (iPhone + imperfections + grain + muted colors - 8-12 words)
` : `
**FOR USER POSTS:**
1. **TRIGGER WORD + GENDER + ETHNICITY** (MANDATORY - first 2-4 words): "${triggerWord}, ${ethnicity ? ethnicity + " " : ""}${userGender}"
2. **OUTFIT** (material + color + garment type - 8-12 words, stay detailed here)
3. **LOCATION** (simple, one-line - 3-5 words, keep brief)
4. **LIGHTING** (simple, natural only - 3-5 words, NO dramatic/cinematic terms)
5. **POSE + EXPRESSION** (simple, natural action - 3-5 words, NO "striking poses")
6. **TECHNICAL SPECS** (basic iPhone only - 5-8 words, keep minimal)
`}
`}

**Post Type Considerations:**

${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
⚠️ **CRITICAL: THIS IS A NON-USER POST TYPE (${postType})**
- This post should NOT include the user/person at all
- Generate a prompt for ${postType} WITHOUT the trigger word or user description
- Focus on objects, products, flatlays, scenery, or lifestyle elements
- Format should be: "[description of objects/scenery/flatlay], shot on iPhone 15 Pro, [lighting], [styling], [technical specs]"
- DO NOT include "${triggerWord}" or "${userGender}" in this prompt
` : `
- "Close-Up": Face and shoulders only, intimate facial focus, natural expression
- "Half Body": Waist-up framing, shows upper styling and hands, relaxed natural pose
- "selfie": Close-up face portrait, natural expression, authentic moment
- **NEVER create full-body shots** - they look unrealistic and AI-generated. Only use close-up, half-body, or selfie.
`}

${brandColors ? `**CRITICAL**: Incorporate the user's brand colors (${brandColors}) into the styling, clothing, background, or props. These are their chosen brand colors and MUST be reflected in the image.` : ""}

**NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed", "dramatic lighting", "professional yet approachable" - these cause plastic/generic faces and override the user LoRA.

**🔴 CRITICAL: PROMPT QUALITY CHECKLIST - EVERY PROMPT MUST HAVE:**
${isProMode ? `
1. ✅ Identity anchor at start ("Use the uploaded photos as strict identity reference")
2. ✅ Natural language description (NO trigger words)
3. ✅ Specific outfit description (material + color + garment type, brand names embedded naturally)
4. ✅ Detailed location/environment description
5. ✅ Professional lighting description
6. ✅ Professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
7. ✅ Natural pose/expression
8. ✅ Brand names embedded in outfit descriptions (NOT as separate metadata)
9. ✅ Total length: 100-150 words (natural language, not keyword stuffing)

**Total target: 100-150 words for rich visual storytelling and professional quality**
` : `
1. ✅ Trigger word + ethnicity + gender (no duplicates, format: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}")
2. ✅ Specific outfit description (material + color + garment type - NOT "trendy outfit", stay detailed here)
3. ✅ Simple setting (one-line location, keep brief)
4. ✅ Simple natural lighting (NO dramatic/cinematic terms)
5. ✅ Natural pose/action (NO "striking poses")
6. ✅ Authentic iPhone specs: Includes "candid photo" or "candid moment"? Includes "amateur cellphone photo" or "cellphone photo"? "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"?
7. ✅ Total length: 30-60 words (optimal for LoRA activation)

**Total target: 30-60 words for optimal LoRA activation and accurate character representation**
`}

Now generate the ${isProMode ? "Nano Banana Pro" : "FLUX"} prompt for this ${postType} feed post.

${postType?.toLowerCase().includes('object') || postType?.toLowerCase().includes('flatlay') || postType?.toLowerCase().includes('scenery') || postType?.toLowerCase().includes('place') ? `
⚠️ **CRITICAL REMINDER:** This is a ${postType} post - DO NOT include the user, trigger word, or any person in the prompt. Focus only on objects, products, flatlays, or scenery.
` : isProMode ? `
**CRITICAL: Use YOUR fashion expertise to create detailed, specific styling for Pro Mode (Nano Banana).**
- Generate a 100-150 word natural language prompt (NO trigger words)
- ALWAYS start with identity anchor: "Use the uploaded photos as strict identity reference"
- Follow with natural scene description (e.g., "Woman in...", "Person wearing...")
- Include SPECIFIC outfit details (material + color + garment type, brand names embedded naturally)
- Include DETAILED location/environment description
- Include professional lighting description (e.g., "soft diffused natural window light")
- Include professional camera specs (e.g., "85mm lens, f/2.0 depth of field")
- Use natural language - write like describing to a photographer
- Make it feel like professional photography, not iPhone snaps
- Embed brand names in outfit descriptions (e.g., "wearing an Alo Yoga set"), NOT as separate tags

**🔴 EXAMPLE OF WHAT YOU MUST CREATE (PRO MODE - ~100 words):**
"Use the uploaded photos as strict identity reference. Woman in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally with soft smile, positioned in upscale restaurant with marble surfaces and modern minimalist design, warm natural window light creating gentle shadows across her face and highlighting the texture of the silk fabric, professional photography with 85mm lens and f/2.0 depth of field, natural skin texture with visible pores, authentic moment captured with genuine presence, sophisticated atmosphere with warm beige and cream color palette"

**🔴 EXAMPLE OF WHAT YOU MUST NEVER CREATE:**
"Woman, confident expression, wearing stylish business casual outfit, urban background with clean lines, edgy-minimalist aesthetic with perfect lighting"

**Why the bad example is wrong:**
- ❌ "stylish business casual outfit" = generic (must be specific material + color + garment)
- ❌ "urban background" = generic (must be detailed location description)
- ❌ "perfect lighting" = vague (must be specific professional lighting description)
- ❌ Missing professional camera specs
- ❌ Too short and generic
` : `
**CRITICAL: Use YOUR fashion expertise to create detailed, specific styling.**
- Generate a 30-60 word prompt that includes ALL requirements above
- Start with: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}" (do NOT duplicate like "White, woman, White woman")
- Include SPECIFIC outfit details (material + color + garment), NOT generic "trendy outfit" or "stylish business casual outfit"
- Include SPECIFIC but simple location details, NOT generic "urban background" or "urban setting"
- Include simple natural lighting (NO dramatic/cinematic terms)
- Include "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
- Keep it simple - trust the user LoRA for appearance
- Make it feel like a real iPhone photo, not a professional shoot

**🔴 EXAMPLE OF WHAT YOU MUST CREATE:**
"${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}, in sage green silk blouse with relaxed fit tucked into high-waisted cream linen trousers, standing with hand on marble bar counter, looking over shoulder naturally, upscale restaurant with marble surfaces, uneven natural lighting, shot on iPhone 15 Pro portrait mode, shallow depth of field"

**🔴 EXAMPLE OF WHAT YOU MUST NEVER CREATE:**
"${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}, confident expression, wearing stylish business casual outfit, urban background with clean lines, edgy-minimalist aesthetic with perfect lighting"

**Why the bad example is wrong:**
- ❌ "stylish business casual outfit" = generic (must be specific material + color + garment)
- ❌ "urban background" = generic (must be specific location with details)
- ❌ "perfect lighting" = banned (must be uneven lighting with imperfections)
- ❌ Missing all technical specs
`}

${isRegeneration && cleanedReferencePrompt ? `\n🔴 REGENERATION MODE: Create a NEW variation of this concept in the SAME category (${category || postType}).
- Keep the same general concept/category but create a DIFFERENT variation:
  - Different outfit (same style/category but different colors, materials, or pieces)
  - Different location/scenery (same type but different specific place)
  - Different pose/expression (same mood but different specific pose)
  - Different lighting angle/mood (same style but different specific lighting)
- The goal is to create a fresh take on the same concept - variety within consistency
- Reference prompt (use for concept ideas only, generate completely new detailed prompt): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}
` : cleanedReferencePrompt ? `\n🔴 CRITICAL: The reference prompt below is GENERIC and MISSING all mandatory requirements (iPhone, imperfections, skin texture, film grain, muted colors, specific outfit details). 

**DO NOT COPY OR PARAPHRASE IT.**

**IGNORE its format completely** - it uses generic terms like "trendy outfit", "empowering pose", "dynamic lighting" which are BANNED WORDS.

**Generate a COMPLETELY NEW prompt** using:
- The correct format: "${triggerWord}, ${ethnicity ? ethnicity + ", " : ""}${userGender}"
- ALL mandatory requirements from above
- Specific outfit details (material + color + garment type)
- Specific location details
- All technical specs (iPhone, imperfections, skin texture, film grain, muted colors)

You may use the reference ONLY for general content ideas (e.g., "outdoor setting" → becomes "urban street with specific details"), but generate a completely new, detailed prompt.

Reference (IGNORE FORMAT - GENERIC AND INCOMPLETE): ${cleanedReferencePrompt.substring(0, 200)}${cleanedReferencePrompt.length > 200 ? "..." : ""}` : ""}`
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(systemPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: isProMode ? 'pro' : 'classic',
    feature: 'feed-prompt',
    userId: undefined, // User ID not available in context (would need to pass it)
    builder: 'maya-feed-prompt-builder',
    executionTimeMs,
    success: true,
    promptLength: systemPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      postType,
      isProMode,
      hasReferencePrompt: !!cleanedReferencePrompt,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-03', // Phase 5A: Route identifier
    routePath: '/api/maya/generate-feed-prompt', // Phase 5A: Route path
    promptType: 'feed-prompt', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Maya feed prompt system prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    systemPrompt,
    metadata: {
      routeId: 'EP-03',
      promptType: 'maya-feed-prompt',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// FEED SINGLE POST PROMPT WRAPPER (Phase 3B P1-2 - EP-05 Migration)
// ============================================================================

/**
 * Generate feed single post prompt via Authority Layer.
 * 
 * This function wraps buildSingleImagePrompt() to route through Prompt Authority Layer
 * for audit logging while preserving behavior.
 * 
 * Phase 3B P1-2: Migrating EP-05 (/api/feed/[feedId]/generate-single) to use Authority.
 * 
 * @param templatePrompt - Full template prompt (already injected with dynamic content)
 * @param position - Frame position (1-9)
 * @param context - Additional context for audit logging
 * @returns Prompt string with metadata
 */
export async function generateFeedSinglePromptViaAuthority(
  templatePrompt: string,
  position: number,
  context?: {
    userId?: string
    feedId?: string | number
    postId?: string | number
    generationMode?: 'pro' | 'classic'
  }
): {
  prompt: string
  metadata: {
    routeId: 'EP-05'
    promptType: 'feed-single-post'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Import and call the existing builder (preserves exact behavior)
  // Use dynamic import to match codebase pattern
  const { buildSingleImagePrompt } = await import('@/lib/feed-planner/build-single-image-prompt')
  const prompt = buildSingleImagePrompt(templatePrompt, position)
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(prompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: context?.generationMode || 'pro', // Default to pro since buildSingleImagePrompt is for Pro Mode
    feature: 'feed-single-post',
    userId: context?.userId,
    builder: 'build-single-image-prompt',
    executionTimeMs,
    success: true,
    promptLength: prompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      templateLength: templatePrompt.length,
      position,
      feedId: context?.feedId,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-05', // Phase 5A: Route identifier
    routePath: '/api/feed/[feedId]/generate-single', // Phase 5A: Route path
    promptType: 'feed-single-post', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Feed single post prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    prompt,
    metadata: {
      routeId: 'EP-05',
      promptType: 'feed-single-post',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// STUDIO PRO PROMPTS WRAPPER (Phase 3B P1-3 - EP-07 Migration)
// ============================================================================

/**
 * Generate Studio Pro prompts via Authority Layer.
 * 
 * This function wraps Studio Pro prompt generation to route through Prompt Authority Layer
 * for audit logging while preserving behavior.
 * 
 * Phase 3B P1-3: Migrating EP-07 (/api/maya/generate-studio-pro-prompts) to use Authority.
 * 
 * @param context - Studio Pro prompt generation context
 * @returns System prompt string with metadata
 */
export async function generateStudioProPromptsViaAuthority(context: {
  userRequest: string
  count: number
  conversationContext?: string | null
  contentType?: string | null
  userContext?: string | null
  userGender?: string
}): Promise<{
  systemPrompt: string
  metadata: {
    routeId: 'EP-07'
    promptType: 'studio-pro-prompts'
    fingerprint: string
    timestamp: string
  }
}> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const {
    userRequest,
    count = 3,
    conversationContext,
    contentType,
    userContext,
    userGender = "person",
  } = context
  
  // Import Nano Banana principles (preserves exact existing logic)
  const { getNanoBananaPromptingPrinciples } = await import('@/lib/maya/nano-banana-prompt-builder')
  const nanoBananaPrinciples = getNanoBananaPromptingPrinciples()
  
  // Build prompt generation prompt (preserves exact existing template)
  const systemPrompt = `You are Maya, an expert at creating Studio Pro prompts for Nano Banana Pro image generation.

**CRITICAL: ALL prompts MUST be in Nano Banana Pro format. NEVER use Flux format, trigger words, or LoRA references.**

${nanoBananaPrinciples}

**USER REQUEST:**
${userRequest}

${conversationContext ? `**CONVERSATION CONTEXT:**\n${conversationContext}\n` : ''}

${userContext ? `**USER CONTEXT:**\n${userContext}\n` : ''}

**USER GENDER:** ${userGender}

**TASK:**
Generate ${count} complete Studio Pro prompts for Nano Banana Pro. Each prompt should be a natural language description ready for image generation.

**CONTENT TYPE:** ${contentType || 'general'}

**IMPORTANT - NANO BANANA PRO FORMAT (MANDATORY FOR ALL CONTENT TYPES):**
- Use natural language, NOT legacy Flux-style trigger words
- NO LoRA references (no training trigger tokens or internal model tags)
- NO Flux-specific camera formatting (no explicit phone model names, no "candid photo" or "amateur cellphone photo" boilerplate)
- Describe what you want to see, not technical AI terms
- Be explicit about composition, style, lighting, colors
- If text is needed, specify EXACT text in quotes
- Keep it like a photography brief: clear and grounded

**CRITICAL - QUOTE GRAPHICS (if contentType is "quote-graphic"):**
- Describe the final graphic design, NOT user instructions
- Include the exact quote text in quotes
- Describe layout, typography, colors, background style
- Describe any visual elements (patterns, shapes, images if included)
- Format: "Quote graphic with text '[exact quote]' in [font style] typography. [Layout description]. [Color scheme]. [Background style]. [Any visual elements]. [Aspect ratio if specified]."
- Example: "Quote graphic with text 'Success is not final, failure is not fatal' in bold sans-serif typography, centered layout. Text in deep navy blue on soft cream background with subtle geometric pattern overlay. Minimalist design with ample white space. Square format 1:1 for Instagram post."

**CRITICAL - PROMPT FORMAT:**
These prompts are for NANO BANANA PRO IMAGE GENERATION, NOT user instructions.

❌ WRONG (User Instructions - DO NOT DO THIS):
"Use 1-2 photos of yourself in casual morning wear from your gallery - pajamas, oversized t-shirt, or comfy loungewear. Select clear product photos showing the packaging. Create an authentic UGC photo showing you..."

✅ CORRECT (Image Generation Prompt):
"Woman in casual morning wear - pajamas or oversized t-shirt - standing in front of a bathroom mirror applying skincare product. She's looking at herself in the mirror with a natural, relaxed expression. The bathroom has soft morning lighting coming through a window. The counter has everyday items scattered around - toothbrush, other skincare products, maybe a coffee mug. Shot from a slight angle showing both her and her reflection. Soft natural lighting with warm tones. Muted morning color palette - whites, creams, soft grays. Casual iPhone photo aesthetic with authentic UGC feel. Instagram reel cover format 9:16 vertical."

✅ CORRECT (Quote Graphic Prompt):
"Quote graphic with text 'Success is not final, failure is not fatal' in bold sans-serif typography, centered layout. Text in deep navy blue on soft cream background with subtle geometric pattern overlay. Minimalist design with ample white space. Square format 1:1 for Instagram post."

**PROMPT STRUCTURE (Image Generation Only):**
Each prompt should describe what the FINAL IMAGE will look like:
- Subject (who/what - describe the person/object as they appear in the final image)
- Action/Pose (what they're doing in the image)
- Environment (where the scene takes place)
- Composition (framing, shot type, camera angle)
- Style (aesthetic, mood, visual feel)
- Lighting (natural description of how light appears)
- Color Palette (specific colors visible in the image)
- Technical Details (format, aspect ratio if needed)
- Final Use (what this image is for - e.g., "Instagram reel cover", "UGC product photo")

**DO NOT INCLUDE:**
- Instructions like "Use photos from your gallery"
- Directions like "Select images" or "Upload photos"
- User guidance like "Choose photos that show..."
- Any text that tells the user what to do

**ONLY DESCRIBE THE FINAL IMAGE** - what Nano Banana Pro should generate.

**FORBIDDEN FORMATS (DO NOT USE):**
- ❌ Flux-style trigger words or training tokens (any short all-caps tags or pseudo-identifiers)
- ❌ Flux camera specs: phone model names like "shot on iPhone 15 Pro", or stock phrases like "candid photo" / "amateur cellphone photo"
- ❌ Flux lighting boilerplate like "uneven natural lighting with mixed color temperatures"
- ❌ Flux technical boilerplate like "portrait mode, shallow depth of field" or "film grain, muted colors"
- ❌ LoRA references: Any mention of trigger words, LoRA, or model training
- ❌ User instructions: "Use photos from your gallery", "Select images"

**REQUIRED FORMAT:**
- ✅ Natural language description of the final image
- ✅ Clear composition, style, lighting, colors
- ✅ For quote graphics: Exact quote text in quotes, layout description, typography, colors
- ✅ Photography brief style: "A [subject] [action] in [location]. [Composition]. [Style]. [Lighting]. [Colors]. [Format]."

**OUTPUT FORMAT:**
Return a JSON array with this structure:
[
  {
    "title": "Short descriptive title (2-4 words)",
    "description": "Brief description of what this prompt creates",
    "prompt": "Full detailed prompt in natural language, ready for Nano Banana Pro"
  },
  ...
]

Return ONLY the JSON array, no markdown, no explanations, no code blocks.`
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(systemPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B P1-3 - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'studio-pro',
    feature: 'studio-pro-prompts',
    userId: undefined, // userId is passed separately in the route
    builder: 'studio-pro-prompt-builder',
    executionTimeMs,
    success: true,
    promptLength: systemPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      userRequestLength: userRequest.length,
      count,
      contentType,
      hasConversationContext: !!conversationContext,
      hasUserContext: !!userContext,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-07', // Phase 5A: Route identifier
    routePath: '/api/maya/generate-studio-pro-prompts', // Phase 5A: Route path
    promptType: 'studio-pro-prompts', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Studio Pro prompts system prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    systemPrompt,
    metadata: {
      routeId: 'EP-07',
      promptType: 'studio-pro-prompts',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// FEED PLANNER STRATEGY PROMPTS WRAPPER (Phase 3B P1-4 - EP-08 Migration)
// ============================================================================

/**
 * Generate Feed Planner strategy prompt via Authority Layer.
 * 
 * This function wraps Feed Planner strategy prompt generation to route through Prompt Authority Layer
 * for audit logging while preserving behavior.
 * 
 * Phase 3B P1-4: Migrating EP-08 (/api/feed-planner/create-strategy) to use Authority.
 * Prompt Site PS-01: Strategy generation system + user prompt
 * 
 * @param context - Strategy generation context
 * @returns System prompt and user prompt strings with metadata
 */
export function generateFeedPlannerStrategyPromptViaAuthority(context: {
  userRequest: string
  brandProfile: {
    business_name?: string | null
    business_type?: string | null
    brand_vibe?: string | null
    brand_voice?: string | null
    target_audience?: string | null
    core_values?: any
  }
  userContext?: string | null
  knowledgeBaseInsights?: string | null
}): {
  systemPrompt: string
  userPrompt: string
  metadata: {
    routeId: 'EP-08'
    promptKind: 'strategy-generation'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const { userRequest, brandProfile, userContext, knowledgeBaseInsights } = context
  
  // Build system prompt (preserves exact existing template)
  const systemPrompt = `You are an elite Instagram Growth Strategist with deep expertise in:
- 2025 Instagram algorithm (saves, shares, DMs, comments are priority signals)
- Hook-Story-Value-CTA caption framework (proven engagement structure)
- Narrative storytelling across 9-post feeds (cohesive story arc)
- Content pillar strategy (3-5 foundational themes)
- Engagement psychology and proven CTAs
- Personal brand storytelling and authenticity

${userContext ? `\n=== USER CONTEXT ===\n${userContext}\n` : ""}

${knowledgeBaseInsights ? `\n=== KNOWLEDGE BASE INSIGHTS ===\n${knowledgeBaseInsights}\n` : ""}

CRITICAL JSON FORMATTING RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no backticks
2. ALL string values MUST be properly escaped:
   - Use \\n for newlines (not actual newlines in strings)
   - Use \\" for quotes inside strings
   - Escape all special characters: \\t, \\r, etc.
   - Hashtags in strings should be written as "#hashtag" (the # is fine, but ensure the string is properly quoted)
3. Do NOT include markdown formatting (like # for headers) inside JSON string values
4. All JSON must be valid and parseable - test it mentally before returning
5. If you need to include hashtags, write them as plain text inside the string: "#visibility" not as markdown`
  
  // Build user prompt (preserves exact existing template)
  const userPrompt = `Create a comprehensive 9-post Instagram feed strategy that tells a cohesive story and drives engagement.

BRAND PROFILE:
- Brand: ${brandProfile.business_name || "Personal brand"}
- Type: ${brandProfile.business_type}
- Vibe: ${brandProfile.brand_vibe}
- Voice: ${brandProfile.brand_voice}
- Audience: ${brandProfile.target_audience}
- Values: ${JSON.stringify(brandProfile.core_values)}
- User Request: ${userRequest}

NARRATIVE ARC STRUCTURE (Critical - 9 posts must tell a story):
- Posts 1-3: Origin/Why (introduce brand, purpose, background, "who I am")
- Posts 4-6: Conflict/Process (challenges, journey, behind-the-scenes, "my journey")
- Posts 7-9: Outcome/Invitation (solutions, success, transformation, "what's next")

CONTENT PILLAR DISTRIBUTION (3-5 pillars, balanced):
- Educational: 2-3 posts (teach, inform, provide value)
- Inspirational: 2-3 posts (motivate, share stories, transformations)
- Personal/BTS: 2-3 posts (authentic moments, behind-the-scenes, real life)
- [Add 1-2 more based on brand type: Promotional, UGC, Community, etc.]

ENGAGEMENT OPTIMIZATION (2025 Algorithm):
- Include "Save this post" CTAs for valuable/educational content
- Include "Share with someone" CTAs for relatable/inspirational content
- Include "DM me" CTAs for lead generation (1-2 posts max)
- Include "Comment below" CTAs for discussion and engagement
- Optimize for saves, shares, and DMs (algorithm priority signals)

CAPTION STRUCTURE (Hook-Story-Value-CTA):
For each post, provide:
- **Hook concept**: Bold statement, question, or curiosity gap (1 line idea)
- **Story concept**: Personal moment/experience that builds connection (2-4 sentence idea)
- **Value concept**: Insight, lesson, or takeaway (1-3 sentence idea)
- **CTA concept**: Engaging question or action (1 line idea)
- **Hashtag strategy**: 5-10 strategic hashtags (mix: 2-3 large, 3-4 medium, 2-3 niche)

CAPTION VARIETY (Critical - each must be different):
- Rotate hook styles: bold statement, question, confession, observation
- Vary lengths: 80-150 words (mix short and longer)
- Mix energy: calm, excited, vulnerable, bold
- Different story types: personal moment, lesson learned, BTS, transformation

Return ONLY this JSON structure (no markdown, no backticks):

CRITICAL JSON RULES:
- ALL string values must be valid JSON strings
- Use \\n for newlines (NOT actual line breaks)
- Escape quotes with \\"
- Hashtags in strings must be inside quotes: "#hashtag" not #hashtag
- NO markdown formatting (# headers) inside JSON strings - use plain text
- If you mention hashtags in text, write them as: "hashtag" or "the hashtag #visibility" (with quotes)

{
  "strategyDocument": "Create a COMPREHENSIVE, DETAILED Instagram strategy guide (1000+ words) in markdown format. This should be a mini personalized Instagram strategy guide that tells the user exactly what to post, how to use their photos, and all current Instagram best practices.\\n\\nStructure it as follows (use markdown headers #, ##, ###, **bold**, lists, etc.):\\n\\n# [Brand Name] Instagram Strategy Guide\\n\\n## Your Brand Positioning\\n[Explain their brand positioning, unique value, and how to communicate it]\\n\\n## Content Pillars & What You Post\\n[Explain their 3-5 content pillars and how to balance them]\\n\\n## Visual Aesthetic\\n[Describe their visual style, color palette, and how to maintain consistency]\\n\\n## The 9-Post Narrative Arc\\n[Explain the complete story being told across all 9 posts - how they connect, what transformation happens, and the journey]\\n\\n## Post Type Recommendations\\nFor EACH of the 9 posts, specify:\\n- **Single Image**: Which posts work best as single images and why\\n- **Carousel**: Which posts should become carousels, with detailed slide-by-slide breakdown (use the feed image as slide 1 to maintain visual consistency)\\n- **Reel**: Which posts should become reels, including:\\n  - Reel concept and hook for first 3 seconds\\n  - Cover photo tips (using the feed image to maintain aesthetic)\\n  - Trending audio recommendations (specific songs/sounds for their niche)\\n  - Text overlay strategies\\n\\n## How to Use Your Feed Photos\\n- Which feed images should be used as reel covers (maintain aesthetic)\\n- Which feed images work best as carousel slide 1 (visual consistency)\\n- Which feed images are perfect as single posts\\n- How to maintain visual consistency across all formats\\n\\n## Storytelling Strategy\\n- How to tell your story across the 9 posts\\n- When to be vulnerable vs educational vs inspirational\\n- Story sequences for each post (Stories content ideas)\\n- How to build connection and engagement through storytelling\\n\\n## Instagram Best Practices (2025)\\n- **Posting Schedule**: Optimal posting times and frequency for maximum engagement\\n- **Hashtag Strategy**: Main hashtags (use on every post) + rotating hashtags (vary by post) + placement tips\\n- **Engagement Tactics**: How to drive saves, shares, DMs (algorithm priority signals)\\n- **Growth Tactics**: Follower growth strategies, engagement boosts, conversion tactics\\n- **Trend Utilization**: When to jump on trending audio vs use original, current trending formats in their niche, how to adapt trends while staying on-brand\\n- **Audio Tips**: Trending sounds for their niche, when to use original audio, how to choose audio that matches their brand\\n\\n## Content Mix Strategy\\n- **When to SELL**: Which posts should have soft/hard CTAs and how to do it authentically\\n- **When to EDUCATE**: Which posts provide value without asking, how to teach effectively\\n- **When to STORY-TELL**: Vulnerability moments, personal stories that build connection\\n- **When to INSPIRE**: Aspirational content, transformation stories, motivational moments\\n\\n## Engagement CTAs\\n- Specific CTA recommendations for each post type\\n- How to optimize for saves, shares, and DMs\\n- Examples of engaging questions and calls-to-action\\n\\nMake this guide actionable, specific to their brand/niche, and comprehensive. Use markdown formatting for readability.",
  "gridPattern": "Description of the 3x3 visual pattern",
  "visualRhythm": "How the posts flow together visually",
  "posts": [
    {
      "position": 1,
      "postType": "portrait" | "object" | "flatlay" | "scenery",
      "contentPillar": "educational",
      "narrativeRole": "origin",
      "hookConcept": "Unique hook idea (1 line) - MUST be different style from previous posts. Rotate: bold statement, question, confession, observation, numbered list",
      "storyConcept": "Story idea (2-4 sentences)",
      "valueConcept": "Value idea (1-3 sentences)",
      "ctaConcept": "CTA idea (1 line)",
      "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "prompt": "Brief visual description for image generation (1-2 sentences). For portrait: describe the scene/mood. For object/flatlay/scenery: describe items/scenery. NOTE: Actual FLUX prompts are generated separately by Maya with full technical specs - this is just a visual direction description."
    },
    ... (9 posts total - postType should match the visual direction and user's goal)
  ]
}

Make the strategy document comprehensive (1000+ words minimum) with actionable, specific insights. This is a complete Instagram strategy guide - be thorough and detailed. Include specific recommendations for each of the 9 posts regarding post types (single image, carousel, reel), audio recommendations, cover photo tips, and storytelling guidance.
Ensure narrative arc flows logically across all 9 posts.
Distribute content pillars strategically (not all same type).
Each post must have unique hook, story, value, and CTA concepts.
Include 5-10 strategic hashtags per post (mix of sizes).

Note: Choose postType based on what makes sense for each post. Portrait posts feature the user, object/flatlay/scenery posts don't. Create the mix that best serves the user's goal and narrative.`
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const combinedPrompt = systemPrompt + '\n\n' + userPrompt
  const fingerprint = createHash('sha256')
    .update(combinedPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B P1-4 - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'feed-planner',
    feature: 'strategy-generation',
    userId: undefined, // userId is passed separately in the route
    builder: 'feed-planner-strategy-builder',
    executionTimeMs,
    success: true,
    promptLength: combinedPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      userRequestLength: userRequest.length,
      hasUserContext: !!userContext,
      hasKnowledgeBaseInsights: !!knowledgeBaseInsights,
      brandName: brandProfile.business_name,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-08', // Phase 5A: Route identifier
    routePath: '/api/feed-planner/create-strategy', // Phase 5A: Route path
    promptType: 'feed-planner-strategy', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Feed Planner strategy prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    systemPrompt,
    userPrompt,
    metadata: {
      routeId: 'EP-08',
      promptKind: 'strategy-generation',
      fingerprint,
      timestamp,
    },
  }
}

/**
 * Generate Feed Planner Pro Mode prompt via Authority Layer.
 * 
 * Phase 3B P1-4: Migrating EP-08 (/api/feed-planner/create-strategy) to use Authority.
 * Prompt Site PS-02: Pro Mode prompt generation (buildNanoBananaPrompt wrapper)
 * 
 * @param context - Pro Mode prompt generation context
 * @returns Prompt string with metadata
 */
export async function generateFeedPlannerProModePromptViaAuthority(context: {
  userId: string | number
  mode: string
  userRequest: string
  baseImages: Array<{ url: string; type: string; description?: string }>
  productImages?: Array<{ url: string; label: string; brandName?: string }>
  textElements?: Array<{ text: string; style: string }>
  platformFormat?: string
  brandKit?: {
    primaryColor?: string | null
    secondaryColor?: string | null
    accentColor?: string | null
    fontStyle?: string | null
    brandTone?: string | null
  }
}): Promise<{
  prompt: string
  metadata: {
    routeId: 'EP-08'
    promptKind: 'pro-mode-prompt'
    fingerprint: string
    timestamp: string
  }
}> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Import and call the existing builder (preserves exact behavior)
  const { buildNanoBananaPrompt } = await import('@/lib/maya/nano-banana-prompt-builder')
  const { optimizedPrompt } = await buildNanoBananaPrompt({
    userId: context.userId,
    mode: context.mode as any,
    userRequest: context.userRequest,
    inputImages: {
      baseImages: context.baseImages,
      productImages: context.productImages,
      textElements: context.textElements,
    },
    workflowMeta: {
      platformFormat: context.platformFormat || '4:5',
    },
    brandKit: context.brandKit,
  })
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(optimizedPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B P1-4 - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'pro',
    feature: 'pro-mode-prompt',
    userId: context.userId.toString(),
    builder: 'build-nano-banana-prompt',
    executionTimeMs,
    success: true,
    promptLength: optimizedPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      userId: context.userId,
      mode: context.mode,
      userRequestLength: context.userRequest.length,
      baseImageCount: context.baseImages.length,
      hasProductImages: !!context.productImages,
      hasTextElements: !!context.textElements,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-08', // Phase 5A: Route identifier
    routePath: '/api/feed-planner/create-strategy', // Phase 5A: Route path
    promptType: 'feed-planner-pro-mode-prompt', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Feed Planner Pro Mode prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    prompt: optimizedPrompt,
    metadata: {
      routeId: 'EP-08',
      promptKind: 'pro-mode-prompt',
      fingerprint,
      timestamp,
    },
  }
}

/**
 * Generate Feed Planner Classic Mode prompt via Authority Layer.
 * 
 * Phase 3B P1-4: Migrating EP-08 (/api/feed-planner/create-strategy) to use Authority.
 * Prompt Site PS-03: Classic Mode concept prompt generation
 * 
 * @param context - Classic Mode prompt generation context
 * @returns Concept prompt string with metadata
 */
export function generateFeedPlannerClassicModePromptViaAuthority(context: {
  userRequest: string
  post: {
    position: number
    postType?: string | null
    contentPillar?: string | null
    prompt?: string | null
    visualDirection?: string | null
  }
  brandProfile: {
    brand_vibe?: string | null
  }
  triggerWord: string
  userGender: string
  userEthnicity?: string | null
  physicalPreferences?: string | null
  fashionIntelligence: string
  colorPaletteSection: string
  physicalPreferencesSection: string
  previousPosts: Array<{ lighting?: string }>
  varietyContext: string
  fluxPrinciples: string
}): {
  conceptPrompt: string
  metadata: {
    routeId: 'EP-08'
    promptKind: 'classic-mode-prompt'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const {
    userRequest,
    post,
    brandProfile,
    triggerWord,
    userGender,
    userEthnicity,
    physicalPreferences,
    fashionIntelligence,
    colorPaletteSection,
    physicalPreferencesSection,
    previousPosts,
    varietyContext,
    fluxPrinciples,
  } = context
  
  // Build concept prompt (preserves exact existing template)
  const conceptPrompt = `You are Maya, an elite fashion photographer with 15 years of experience shooting for Vogue, Elle, and creating viral Instagram content. You have an OBSESSIVE eye for authenticity - you know that the best images feel stolen from real life, not produced.

${fashionIntelligence}

${colorPaletteSection}

${physicalPreferencesSection}

=== LIGHTING CONSISTENCY (FOR FEED COHESION) ===
**CRITICAL:** All 9 posts in this feed must have CONSISTENT lighting style for visual cohesion.

${previousPosts.length > 0 && previousPosts[0].lighting
  ? `**ESTABLISHED LIGHTING STYLE:** ${previousPosts[0].lighting}
  
**YOU MUST USE THE SAME LIGHTING STYLE** as previous posts. Check the previous posts context above to see what lighting was used.
Maintain the same lighting mood/style across all 9 posts for feed cohesion.`
  : `**LIGHTING OPTIONS (choose ONE style and use it consistently for ALL 9 posts):**
- Soft natural lighting (warm, diffused, even)
- Golden hour lighting (warm, directional, sunset/rise)
- Moody lighting (dramatic shadows, high contrast)
- Bright natural lighting (daylight, airy, fresh)
- Soft indoor lighting (cozy, warm, intimate)

**IMPORTANT:** 
- Choose a lighting style that fits the brand vibe: ${brandProfile.brand_vibe || "authentic"}
- This lighting style will be used for ALL 9 posts in the feed
- Lighting consistency creates visual flow across the feed grid
- You can vary lighting INTENSITY and DIRECTION, but maintain the same STYLE/MOOD`}

=== NATURAL POSING REFERENCE ===
Use this for inspiration on authentic, Instagram-style poses. These are REAL influencer poses that look natural and candid:

Remember: Describe poses SIMPLY and NATURALLY, like you're telling a friend what someone is doing. Avoid technical photography language.
===

${varietyContext}

FEED POST CONTEXT:
- Position: ${post.position} of 9
- Purpose: ${post.contentPillar || "Showcase personal brand"}
- Visual Direction: ${post.prompt || post.visualDirection || "Professional and authentic"}
- Brand Vibe: ${brandProfile.brand_vibe || "authentic"}
- Shot Type: ${post.postType || "portrait"}

USER REQUEST: "${userRequest}"

MODE: FEED POST - Create 1 concept that fits this specific position in the Instagram feed grid. This is part of a cohesive 9-post story with VARIETY in outfits, locations, and concepts.

${fluxPrinciples}

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY): ${triggerWord}
2. **GENDER/ETHNICITY** (2-3 words)${userEthnicity ? `: ${userEthnicity}` : ''} ${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}
3. **OUTFIT** (material + color + garment type - 6-10 words) - MUST be DIFFERENT from previous posts
4. **POSE + EXPRESSION** (simple, natural - 4-6 words) - Vary from previous posts
5. **LOCATION** (brief, atmospheric - 3-6 words) - MUST be DIFFERENT location from previous posts
6. **LIGHTING** (with imperfections - 5-8 words)
7. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. **CASUAL MOMENT** (optional - 2-4 words)

**Total target: 50-80 words for optimal quality and detail**

**CRITICAL FOR VARIETY:**
- Choose a DIFFERENT outfit color/material/style than previous posts
- Choose a DIFFERENT location/scenery than previous posts  
- Vary the pose, angle, and composition
- Create a unique concept that stands out in the feed

Return ONLY valid JSON, no markdown:
{
  "title": "Simple, catchy title (2-4 words)",
  "description": "Quick, exciting one-liner",
  "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Full Body" | "Object" | "Flatlay" | "Scenery",
  "outfit": "Brief description of outfit for variety tracking",
  "location": "Brief description of location for variety tracking",
  "prompt": "YOUR CRAFTED FLUX PROMPT - MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only]` : ""}"
}`
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(conceptPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3B P1-4 - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'classic',
    feature: 'classic-mode-prompt',
    userId: undefined, // userId is passed separately in the route
    builder: 'feed-planner-classic-concept-builder',
    executionTimeMs,
    success: true,
    promptLength: conceptPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      userRequestLength: userRequest.length,
      postPosition: post.position,
      postType: post.postType,
      triggerWord,
      userGender,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-08', // Phase 5A: Route identifier
    routePath: '/api/feed-planner/create-strategy', // Phase 5A: Route path
    promptType: 'feed-planner-classic-mode-prompt', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Feed Planner Classic Mode prompt generated, fingerprint: ${fingerprint}`)
  
  return {
    conceptPrompt,
    metadata: {
      routeId: 'EP-08',
      promptKind: 'classic-mode-prompt',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// PRO MODE IMAGE GENERATION WRAPPER (Phase 3C P0-1 - EP-04 Migration)
// ============================================================================

/**
 * Route Pro Mode image generation prompt through Authority Layer.
 * 
 * This function wraps Pro Mode prompt usage (prompt is built elsewhere, received here)
 * to route through Prompt Authority Layer for audit logging while preserving behavior.
 * 
 * Phase 3C P0-1: Migrating EP-04 (/api/maya/pro/generate-image) to use Authority.
 * 
 * Note: The prompt is built in /api/maya/pro/generate-concepts/route.ts and passed here.
 * This wrapper ensures proper audit logging and fingerprint tracking.
 * 
 * @param context - Pro Mode image generation context
 * @returns Prompt string with metadata (prompt is unchanged, just routed through Authority)
 */
export function routeProModeImagePromptViaAuthority(context: {
  fullPrompt: string
  userId: string | number
  category?: string | null
  conceptTitle?: string | null
  conceptDescription?: string | null
  resolution?: string
  aspectRatio?: string
}): {
  prompt: string
  metadata: {
    routeId: 'EP-04'
    promptKind: 'pro-mode-image-generation'
    fingerprint: string
    timestamp: string
  }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const { fullPrompt, userId, category, conceptTitle, conceptDescription, resolution, aspectRatio } = context
  
  // Prompt is already built - we just route it through Authority for audit logging
  // No changes to prompt content
  
  // Compute fingerprint hash (privacy-safe, no full prompt logged)
  const fingerprint = createHash('sha256')
    .update(fullPrompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging (Phase 3C P0-1 - observability)
  const executionTimeMs = Date.now() - startTime
  logAudit({
    timestamp,
    mode: 'pro',
    feature: 'pro-mode-image-generation',
    userId: userId.toString(),
    builder: 'nano-banana-prompt-builder (via concept route)',
    executionTimeMs,
    success: true,
    promptLength: fullPrompt.length,
    inputHash: createHash('sha256').update(JSON.stringify({
      userId,
      category,
      conceptTitle,
      resolution,
      aspectRatio,
      promptLength: fullPrompt.length,
    })).digest('hex').substring(0, 16),
    outputHash: fingerprint,
    pathUsed: 'authority',
    routeId: 'EP-04', // Phase 5A: Route identifier
    routePath: '/api/maya/pro/generate-image', // Phase 5A: Route path
    promptType: 'pro-mode-image-generation', // Phase 5A: Prompt type
  })
  
  console.log(`[PROMPT-AUTHORITY] Pro Mode image generation prompt routed, fingerprint: ${fingerprint}`)
  
  return {
    prompt: fullPrompt, // Return unchanged prompt
    metadata: {
      routeId: 'EP-04',
      promptKind: 'pro-mode-image-generation',
      fingerprint,
      timestamp,
    },
  }
}

// ============================================================================
// PROMPT VALIDATION
// ============================================================================

/**
 * Validate and fix a prompt using existing validators.
 * 
 * Applies programmatic fixes (trigger word, gender) without changing prompt content.
 * Used for Classic Mode image generation from stored concepts.
 * 
 * @param prompt - Prompt to validate
 * @param mode - Generation mode
 * @param context - Validation context (trigger word, gender, etc.)
 * @returns Validation result with fixed prompt
 */
export function validatePrompt(
  prompt: string,
  mode: PromptMode,
  context: PromptGenerationContext
): ValidationResult {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  let validatedPrompt = prompt
  const fixes: string[] = []
  
  try {
    if (mode === 'classic') {
      // Apply Classic Mode validations
      if (context.triggerWord) {
        const before = validatedPrompt
        validatedPrompt = ensureTriggerWordPrefix(validatedPrompt, context.triggerWord)
        if (before !== validatedPrompt) {
          fixes.push('added-trigger-word-prefix')
        }
      }
      
      if (context.triggerWord && context.userGender) {
        const before = validatedPrompt
        validatedPrompt = ensureGenderInPrompt(
          validatedPrompt,
          context.triggerWord,
          context.userGender,
          context.ethnicity
        )
        if (before !== validatedPrompt) {
          fixes.push('ensured-gender-in-prompt')
        }
      }
    }
    
    // Audit logging
    logAudit({
      timestamp,
      mode,
      feature: 'image-generation',
      userId: context.userId,
      builder: 'replicate-helpers',
      executionTimeMs: Date.now() - startTime,
      success: true,
      promptLength: validatedPrompt.length,
    })
    
    return {
      valid: true,
      prompt: validatedPrompt,
      fixes,
    }
    
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    
    // Audit logging
    logAudit({
      timestamp,
      mode,
      feature: 'image-generation',
      userId: context.userId,
      builder: 'replicate-helpers',
      executionTimeMs: Date.now() - startTime,
      success: false,
      error,
    })
    
    return {
      valid: false,
      prompt,
      fixes: [`validation-error: ${error}`],
    }
  }
}

// ============================================================================
// BATCH GENERATION (Future Use)
// ============================================================================

/**
 * Generate multiple prompts in batch.
 * 
 * Intended for Feed Planner orchestrator (Phase 2C-4-2).
 * Routes each prompt through existing builders with audit logging.
 * 
 * @param mode - Generation mode
 * @param feature - Feature type (should be 'feed-planner-batch')
 * @param contexts - Array of generation contexts (one per prompt)
 * @param mayaChatFunction - Function that performs Maya chat generation (delegation)
 * @returns Batch result with all prompts
 */
export async function generateBatch(
  mode: PromptMode,
  feature: PromptFeature,
  contexts: FeedPlannerPostContext[],
  mayaChatFunction: (prompt: string, index: number) => Promise<{ text: string }>
): Promise<BatchPromptResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const prompts: PromptResult[] = []
  let successCount = 0
  let failureCount = 0
  
  // Generate prompts for each post in parallel
  await Promise.all(
    contexts.map(async (context, index) => {
      const postStartTime = Date.now()
      const inputHash = hashInput(context)
      
      try {
        // Delegate to existing Maya chat logic
        const result = await mayaChatFunction(context.conceptPrompt, context.postIndex)
        
        // Parse JSON response (same logic as orchestrator)
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON object found in Maya chat response')
        }
        
        const concept = JSON.parse(jsonMatch[0])
        const prompt = concept?.prompt || ''
        
        if (!prompt) {
          throw new Error('Concept generated but no prompt found in response')
        }
        
        const outputHash = hashOutput(prompt)
        const executionTimeMs = Date.now() - postStartTime
        
        // Audit log each post
        logAudit({
          timestamp,
          mode,
          feature,
          userId: context.userId,
          builder: 'maya-chat',
          executionTimeMs,
          success: true,
          promptLength: prompt.length,
          inputHash: `${inputHash}-${context.postIndex}`,
          outputHash,
          pathUsed: 'authority',
        })
        
        prompts.push({
          prompt,
          postIndex: context.postIndex,
          concept: {
            title: concept.title,
            description: concept.description,
            category: concept.category,
          },
          metadata: {
            builder: 'maya-chat',
            mode,
            feature,
            executionTimeMs,
            inputHash: `${inputHash}-${context.postIndex}`,
            outputHash,
            pathUsed: 'authority',
          },
        })
        
        successCount++
      } catch (error) {
        const executionTimeMs = Date.now() - postStartTime
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        // Audit log failure
        logAudit({
          timestamp,
          mode,
          feature,
          userId: context.userId,
          builder: 'maya-chat',
          executionTimeMs,
          success: false,
          error: errorMsg,
          inputHash: `${inputHash}-${context.postIndex}`,
          pathUsed: 'authority',
        })
        
        failureCount++
      }
    })
  )
  
  return {
    prompts,
    metadata: {
      totalTimeMs: Date.now() - startTime,
      successCount,
      failureCount,
    },
  }
}

// ============================================================================
// MAYA CHAT AUDIT LOGGING (Phase 2C-3)
// ============================================================================

/**
 * Audit log a Maya chat prompt generation.
 * 
 * Used by routes that generate prompts via Maya chat (streaming or non-streaming).
 * This provides audit logging without changing the generation logic.
 * 
 * @param mode - Generation mode
 * @param feature - Feature type
 * @param context - Generation context
 * @param generatedPrompt - The prompt that was generated by Maya chat
 * @param executionTimeMs - How long the generation took
 */
export function auditLogMayaChatGeneration(
  mode: PromptMode,
  feature: PromptFeature,
  context: PromptGenerationContext,
  generatedPrompt: string,
  executionTimeMs: number,
  pathUsed: 'authority' | 'legacy' = 'legacy'
): void {
  const inputHash = hashInput(context)
  const outputHash = hashOutput(generatedPrompt)
  
  logAudit({
    timestamp: new Date().toISOString(),
    mode,
    feature,
    userId: context.userId,
    builder: 'maya-chat',
    executionTimeMs,
    success: true,
    promptLength: generatedPrompt.length,
    inputHash,
    outputHash,
    pathUsed,
  })
}

// ============================================================================
// CONCEPT CARD GENERATION (Phase 2C-4-1)
// ============================================================================

/**
 * Generate concept cards via Authority Layer.
 * 
 * This function delegates to the existing Maya chat logic but adds audit logging.
 * The actual generation happens in the route - this is just routing + audit.
 * 
 * @param context - Full generation context (includes Maya system prompt, user request, etc.)
 * @param mayaChatFunction - Function that performs the actual Maya chat generation
 * @returns Concepts array with audit metadata
 */
export async function generateConceptCardsViaAuthority<T extends { prompt?: string }>(
  context: PromptGenerationContext & {
    conceptPrompt: string // Maya's system prompt
    [key: string]: any // Allow additional context
  },
  mayaChatFunction: (prompt: string) => Promise<{ text: string }>
): Promise<{
  concepts: T[]
  metadata: {
    executionTimeMs: number
    inputHash: string
    pathUsed: 'authority'
    builder: string
  }
}> {
  const startTime = Date.now()
  const inputHash = hashInput(context)
  
  try {
    // Delegate to existing Maya chat logic
    const result = await mayaChatFunction(context.conceptPrompt)
    
    // Parse concepts (same logic as route)
    const jsonMatch = result.text.match(/\[[\s\S]*\]/)
    let concepts: T[] = []
    
    if (jsonMatch) {
      concepts = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Failed to parse JSON from Maya chat response')
    }
    
    const executionTimeMs = Date.now() - startTime
    
    // Audit log each concept
    concepts.forEach((concept, index) => {
      if (concept.prompt) {
        const outputHash = hashOutput(concept.prompt)
        logAudit({
          timestamp: new Date().toISOString(),
          mode: 'classic',
          feature: 'concept-card',
          userId: context.userId,
          builder: 'maya-chat',
          executionTimeMs,
          success: true,
          promptLength: concept.prompt.length,
          inputHash: `${inputHash}-${index}`,
          outputHash,
          pathUsed: 'authority',
        })
      }
    })
    
    return {
      concepts,
      metadata: {
        executionTimeMs,
        inputHash,
        pathUsed: 'authority',
        builder: 'maya-chat',
      },
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    logAudit({
      timestamp: new Date().toISOString(),
      mode: 'classic',
      feature: 'concept-card',
      userId: context.userId,
      builder: 'maya-chat',
      executionTimeMs,
      success: false,
      error: errorMsg,
      inputHash,
      pathUsed: 'authority',
    })
    
    throw error
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generatePrompt,
  validatePrompt,
  generateBatch,
  auditLogMayaChatGeneration,
}
