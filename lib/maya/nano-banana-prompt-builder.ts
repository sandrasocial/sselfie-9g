/**
 * Nano Banana Pro Prompt Builder (Studio Pro ONLY)
 *
 * ⚠️ CRITICAL:
 * - This file is ONLY used for Studio Pro mode (google/nano-banana-pro).
 * - Standard mode uses flux-prompt-builder.ts and MUST preserve trigger words.
 *
 * Studio Pro philosophy:
 * - Workflow-driven (no free-prompt UX)
 * - Stateful (avatar + brand assets + preferences)
 * - Edit/reuse first (avoid unnecessary regen)
 *
 * Usage:
 * - Studio Pro: /api/maya/generate-studio-pro → buildNanoBananaPrompt (this file)
 * - Standard:  /api/maya/generate-image → FluxPromptBuilder.generateFluxPrompt (flux-prompt-builder.ts)
 */

import { getUserContextForMaya } from './get-user-context'
import type { PromptContext } from './prompt-templates/types'
import { detectCategoryAndBrand, getBrandTemplate } from './prompt-templates/high-end-brands'

/**
 * Studio Pro Mode Types
 * Add modes here as Pro workflows expand.
 */
export type StudioProMode =
  | 'brand-scene'
  | 'ugc-product'
  | 'text-overlay'
  | 'quote-graphic'
  | 'carousel-slides'
  | 'reel-cover'
  | 'product-mockup'
  | 'transformation'
  | 'edit-image'
  | 'change-outfit'
  | 'remove-object'
  | 'reuse-adapt'
  | 'educational'
  | 'workbench'

/**
 * Input images for Nano Banana Pro
 * NOTE: Nano Banana accepts up to 14 images; Pro guardrails should cap what we send per request.
 */
export interface NanoBananaInputImages {
  baseImages: Array<{
    url: string
    type: 'user-photo' | 'reference-photo'
    description?: string
  }>
  productImages?: Array<{
    url: string
    label: string
    brandName?: string
  }>
  brandAssets?: Array<{
    url: string
    label?: string
    type?: 'logo' | 'packaging' | 'product' | 'lifestyle' | 'other'
  }>
  textElements?: Array<{
    text: string
    style: 'headline' | 'body' | 'quote' | 'caption'
    language?: string
  }>
}

/**
 * Lightweight brand kit / preference model
 * These can be enriched later. Keep prompt builder resilient if fields are missing.
 */
export interface BrandKit {
  name?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  font_style?: string // e.g. "modern sans-serif", "elegant serif"
  brand_tone?: string // e.g. "bold", "soft", "minimalist", "luxury"
}

export interface ProPreferences {
  preferred_tone?: string
  preferred_style?: string
  preferred_layouts?: string[]
}

/**
 * Clean Studio Pro prompt for Replicate
 * Removes formatting, headlines, unwanted terms, and converts to natural language
 */
export function cleanStudioProPrompt(prompt: string, userRequest?: string): string {
  if (!prompt || prompt.trim().length === 0) {
    return prompt
  }

  let cleaned = prompt

  // 1. Remove markdown headlines (e.g., **MOVEMENT & ACTION:**, **OUTFIT & STYLING:**)
  // Match patterns like **HEADLINE:** or **HEADLINE WITH SPACES:**
  cleaned = cleaned.replace(/\*\*[^*]+\*\*:\s*/g, '')
  
  // Also remove standalone headlines without colons (e.g., **MOVEMENT & ACTION**)
  cleaned = cleaned.replace(/\*\*[^*]+\*\*\s*\n/g, '')
  
  // Remove any remaining markdown bold formatting
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1')

  // 2. Remove "Note:" instructions (these are for system, not for Replicate)
  // Match "Note:" followed by text until end of line or next section
  cleaned = cleaned.replace(/Note:\s*[^\n]+/gi, '')
  cleaned = cleaned.replace(/Note\s*:\s*[^\n]+/gi, '')
  // Also handle "Note: Use the first base image..." patterns
  cleaned = cleaned.replace(/Note:\s*Use\s+the\s+first\s+base\s+image[^\n]*/gi, '')
  cleaned = cleaned.replace(/Note:\s*Use\s+other\s+base\s+images[^\n]*/gi, '')

  // 3. Check if user explicitly requested black and white
  const userRequestLower = (userRequest || '').toLowerCase()
  const explicitlyRequestedBw = 
    userRequestLower.includes('black and white') ||
    userRequestLower.includes('black & white') ||
    userRequestLower.includes('b&w') ||
    userRequestLower.includes('monochrome') ||
    userRequestLower.includes('grayscale')

  // 4. Remove "black and white" unless explicitly requested
  if (!explicitlyRequestedBw) {
    // Remove various forms of black and white mentions
    cleaned = cleaned.replace(/\bblack\s+and\s+white\b/gi, '')
    cleaned = cleaned.replace(/\bblack\s+&\s+white\b/gi, '')
    cleaned = cleaned.replace(/\bb&w\b/gi, '')
    cleaned = cleaned.replace(/\bmonochrome\b/gi, '')
    cleaned = cleaned.replace(/\bgrayscale\b/gi, '')
  }

  // 5. Fix "visible pores" issues - remove incomplete phrases
  // Remove patterns like "visible pores (not )" or "visible pores (not"
  cleaned = cleaned.replace(/\bvisible\s+pores\s*\(not\s*\)/gi, 'natural skin texture')
  cleaned = cleaned.replace(/\bvisible\s+pores\s*\(not\b/gi, 'natural skin texture')
  cleaned = cleaned.replace(/\bvisible\s+pores\s*\(not\s+[^)]*\)/gi, 'natural skin texture')
  
  // Remove standalone "black and white" at the end (if not explicitly requested)
  if (!explicitlyRequestedBw) {
    // Remove at end of line or end of prompt
    cleaned = cleaned.replace(/,\s*black\s+and\s+white\s*$/i, '')
    cleaned = cleaned.replace(/,\s*black\s+&\s+white\s*$/i, '')
    cleaned = cleaned.replace(/\s+black\s+and\s+white\s*$/i, '')
    cleaned = cleaned.replace(/\s+black\s+&\s+white\s*$/i, '')
    // Also remove if it's on its own line at the end
    cleaned = cleaned.replace(/\n\s*black\s+and\s+white\s*$/i, '')
    cleaned = cleaned.replace(/\n\s*black\s+&\s+white\s*$/i, '')
  }

  // 6. Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
  cleaned = cleaned.replace(/[ \t]+/g, ' ') // Multiple spaces to single space
  cleaned = cleaned.replace(/^\s+|\s+$/gm, '') // Trim each line
  cleaned = cleaned.replace(/\n\s*\n/g, '\n') // Remove empty lines between content

  // 7. Remove any remaining formatting artifacts
  cleaned = cleaned.replace(/^[-*]\s+/gm, '') // Remove bullet points
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '') // Remove numbered lists

  // 8. Ensure proper sentence structure - fix common issues
  cleaned = cleaned.replace(/,\s*,/g, ',') // Remove double commas
  cleaned = cleaned.replace(/\s+\./g, '.') // Fix space before period
  cleaned = cleaned.replace(/\.\s*\./g, '.') // Remove double periods

  // 9. Final trim
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Nano Banana Pro Prompting Principles (kept short; longer guidance should live in docs)
 */
export function getNanoBananaPromptingPrinciples(): string {
  return `
## NANO BANANA PRO PRINCIPLES (STUDIO PRO)

- Use natural language. No Flux trigger words. No LoRA references.
- Prefer editing/adapting an existing image over regenerating from scratch.
- If text is needed, specify EXACT text in quotes and describe font/placement.
- Be explicit about composition (where elements go) and the goal (carousel, reel cover, etc.).
- Keep prompts like a photography/graphic design brief: clear, grounded, not "AI keyword soup".
`.trim()
}

/**
 * Scene Composition Intelligence
 * Keep this focused on guidance, not massive boilerplate.
 */
export function getSceneCompositionIntelligence(mode: StudioProMode): string {
  const base = `
## MAYA PRO COMPOSITION RULES

You are Maya Pro (creative director + production assistant).
You guide structured workflows. You do not brainstorm endlessly.

Rules:
1) Editing/adapting beats regenerating.
2) Maintain the user's likeness from avatar reference images.
3) Use brand kit (colors, tone, font vibe) consistently.
4) Keep layouts clean and legible for social media.
`.trim()

  const perMode: Record<StudioProMode, string> = {
    'brand-scene': `
Mode: BRAND SCENE
- Natural product integration (not an obvious ad)
- Product is visible and believable in the environment
- Authentic lighting + iPhone-like framing
`.trim(),

    'ugc-product': `
Mode: UGC PRODUCT
- Looks like a creator shot it (authentic, not overly polished)
- Clear product visibility + natural interaction
- Optional on-image callouts are allowed if requested
`.trim(),

    'text-overlay': `
Mode: TEXT OVERLAY
- Text must be perfectly legible
- Strong hierarchy: headline first, then supporting lines
- Contrast and safe placement for IG formats
`.trim(),

    'quote-graphic': `
Mode: QUOTE GRAPHIC
- Minimal, premium layout
- Clean typography, generous spacing
- Optional subtle background texture (paper, soft gradient)
`.trim(),

    'carousel-slides': `
Mode: CAROUSEL SLIDES
- Slide 1 = hook
- Middle slides = value
- Final slide = CTA
- Consistent template system across slides
`.trim(),

    'reel-cover': `
Mode: REEL COVER
- Big readable title (3–7 words)
- Safe zones for IG thumbnails
- Feed-consistent aesthetic
`.trim(),

    'product-mockup': `
Mode: PRODUCT MOCKUP
- Product/packaging must look realistic
- Natural shadows and scale
- Clean studio or lifestyle context depending on request
`.trim(),

    'transformation': `
Mode: TRANSFORMATION
- Keep identity consistent
- Change lighting/mood/camera angle with clear intent
`.trim(),

    'edit-image': `
Mode: EDIT IMAGE
- Preserve everything except requested edits
- Make precise localized changes
`.trim(),

    'change-outfit': `
Mode: CHANGE OUTFIT
- Preserve face, hair, pose, background unless requested otherwise
- Outfit change must look physically plausible
`.trim(),

    'remove-object': `
Mode: REMOVE/REPLACE OBJECT
- Remove cleanly with believable fill and lighting continuity
`.trim(),

    'reuse-adapt': `
Mode: REUSE & ADAPT
- Keep core image identity
- Adapt layout, crop, text, or style for new use case
`.trim(),

    'educational': `
Mode: EDUCATIONAL
- Clear hierarchy
- Simple visuals
- Legible labels
`.trim(),

    'workbench': `
Mode: WORKBENCH
- Use user's prompt directly
- Follow user's instructions precisely
- Maintain image consistency when multiple images provided
`.trim(),
  }

  return `${base}\n\n${perMode[mode] || ''}`.trim()
}

/**
 * Build optimized Nano Banana Pro prompt
 */
export async function buildNanoBananaPrompt(params: {
  userId: string // Neon user ID
  mode:
    | StudioProMode
    | 'brand_scenes'
    | 'text_overlays'
    | 'transformations'
    | 'educational'
    | 'carousel_slides'
    | 'reel_covers'
  userRequest: string
  inputImages: {
    baseImages?: Array<{ url: string; id?: string; type?: string }>
    productImages?: Array<{ url: string; label: string; brandName?: string }>
    brandAssets?: Array<{ url: string; label?: string; type?: string }>
    textElements?: Array<{ text: string; style?: string; language?: string }>
  }
  workflowMeta?: {
    // Optional structured workflow inputs (preferred over parsing userRequest)
    slideNumber?: number
    totalSlides?: number
    reelTitle?: string
    editInstruction?: string
    reuseGoal?: string // e.g. "turn into reel cover", "translate to norwegian"
    platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
  }
  brandKit?: BrandKit
  preferences?: ProPreferences
  conversationContext?: string
}): Promise<{
  optimizedPrompt: string
  sceneDescription: string
}> {
  const {
    userId,
    mode,
    userRequest,
    inputImages,
    workflowMeta,
    brandKit: brandKitInput,
    preferences: preferencesInput,
  } = params

  // Map legacy mode names
  const modeMap: Record<string, StudioProMode> = {
    brand_scenes: 'brand-scene',
    text_overlays: 'text-overlay',
    transformations: 'transformation',
    educational: 'educational',
    carousel_slides: 'carousel-slides',
    reel_covers: 'reel-cover',
  }

  const normalizedMode: StudioProMode = (modeMap[mode] || mode) as StudioProMode

  // ============================================
  // WORKBENCH MODE: User-written prompts (no AI transformation)
  // ============================================
  // Workbench gives users full control - their prompt is used exactly as written
  // This is different from concept cards which use Maya's generated prompts
  if (normalizedMode === 'workbench') {
    // For workbench, we use the user's prompt directly without any modification
    // The user has full control over the prompt in workbench mode
    // NO AI transformation, NO brand context injection, NO prompt building
    return {
      optimizedPrompt: userRequest.trim(),
      sceneDescription: 'Workbench generation',
    }
  }

  // Lookup supabase_user_id for context
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL!)
  const [userAuth] = await sql`
    SELECT supabase_user_id FROM users WHERE id = ${userId} LIMIT 1
  `

  const userContext = userAuth?.supabase_user_id
    ? await getUserContextForMaya(userAuth.supabase_user_id)
    : ''

  // Parse brand kit + preferences from context if not provided
  const parsedBrandKit = extractBrandKitFromContext(userContext)
  const parsedPrefs = extractPreferencesFromContext(userContext)

  const brandKit: BrandKit = {
    ...(parsedBrandKit || {}),
    ...(brandKitInput || {}),
  }

  const preferences: ProPreferences = {
    ...(parsedPrefs || {}),
    ...(preferencesInput || {}),
  }

  // Preferred high-end brand templates for each known brand id
  const BRAND_DEFAULT_TEMPLATE_IDS: Record<string, string> = {
    ALO: 'alo_yoga_lifestyle',
    LULULEMON: 'lululemon_lifestyle',
    GLOSSIER: 'glossier_clean_girl',
    CHANEL: 'chanel_editorial',
    DIOR: 'dior_romantic',
    FREE_PEOPLE: 'free_people_bohemian',
  }

  // Convert inputImages into NanoBananaInputImages format
  const nanoInputs: NanoBananaInputImages = {
    baseImages: (inputImages.baseImages || []).map((img) => ({
      url: img.url,
      type: (img.type === 'user-photo' ? 'user-photo' : 'reference-photo') as
        | 'user-photo'
        | 'reference-photo',
    })),
    productImages: inputImages.productImages || [],
    brandAssets: (inputImages.brandAssets || []).map((a) => ({
      url: a.url,
      label: a.label,
      type: (a.type as any) || 'other',
    })),
    textElements: (inputImages.textElements || []).map((el) => ({
      text: el.text,
      style: (el.style || 'headline') as 'headline' | 'body' | 'quote' | 'caption',
      language: el.language,
    })),
  }

  // If mode is not explicitly edit/reuse, detect edit intent lightly
  // BUT: Never override workflow-specific modes (carousel, reel-cover, etc.)
  const workflowModes: StudioProMode[] = ['carousel-slides', 'reel-cover', 'ugc-product', 'quote-graphic', 'product-mockup', 'text-overlay', 'educational', 'brand-scene', 'transformation', 'workbench']
  const finalMode = workflowModes.includes(normalizedMode)
    ? normalizedMode // Never override workflow modes
    : deriveEditOrReuseMode(
        normalizedMode,
        userRequest,
        workflowMeta?.editInstruction,
        workflowMeta?.reuseGoal
      )

  // Debug logging
  console.log('[PROMPT-BUILDER] Mode flow:', {
    inputMode: mode,
    normalizedMode,
    finalMode,
    workflowMeta: workflowMeta ? { slideNumber: workflowMeta.slideNumber, totalSlides: workflowMeta.totalSlides } : null,
  })

  let optimizedPrompt = ''
  let sceneDescription = ''

  switch (finalMode) {
    case 'edit-image':
    case 'change-outfit':
    case 'remove-object':
      optimizedPrompt = buildEditPrompt({
        mode: finalMode,
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        editInstruction: workflowMeta?.editInstruction,
        platformFormat: workflowMeta?.platformFormat,
      })
      sceneDescription = `Studio Pro edit (${finalMode})`
      break

    case 'reuse-adapt':
      optimizedPrompt = buildReuseAdaptPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        reuseGoal: workflowMeta?.reuseGoal,
        platformFormat: workflowMeta?.platformFormat,
      })
      sceneDescription = `Reuse & adapt`
      break

    case 'carousel-slides':
      console.log('[PROMPT-BUILDER] Building carousel slide prompt', {
        slideNumber: workflowMeta?.slideNumber,
        totalSlides: workflowMeta?.totalSlides,
        hasTextElements: nanoInputs.textElements && nanoInputs.textElements.length > 0,
      })
      optimizedPrompt = buildCarouselSlidePrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        slideNumber: workflowMeta?.slideNumber ?? extractSlideNumber(userRequest) ?? 1,
        totalSlides: workflowMeta?.totalSlides ?? extractTotalSlides(userRequest) ?? 5,
        platformFormat: workflowMeta?.platformFormat ?? '1:1',
      })
      sceneDescription = `Instagram carousel slide`
      break

    case 'reel-cover':
      optimizedPrompt = buildReelCoverPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        reelTitle: workflowMeta?.reelTitle ?? extractReelTitle(userRequest),
        platformFormat: workflowMeta?.platformFormat ?? '9:16',
      })
      sceneDescription = `Instagram reel cover`
      break

    case 'text-overlay':
      optimizedPrompt = buildTextOverlayPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '9:16',
      })
      sceneDescription = `Text overlay`
      break

    case 'quote-graphic':
      optimizedPrompt = buildQuoteGraphicPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '1:1',
      })
      sceneDescription = `Quote graphic`
      break

    case 'ugc-product':
      optimizedPrompt = buildUgcProductPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '4:5',
      })
      sceneDescription = `UGC product photo`
      break

    case 'product-mockup':
      optimizedPrompt = buildProductMockupPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '1:1',
      })
      sceneDescription = `Product mockup`
      break
    
    case 'transformation':
      optimizedPrompt = buildTransformationPrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat,
      })
      sceneDescription = `Transformation`
      break
    
    case 'educational':
      optimizedPrompt = buildEducationalPrompt({
        userRequest,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '1:1',
      })
      sceneDescription = `Educational infographic`
      break
    
    case 'workbench':
      // Workbench mode uses user's prompt directly (handled above, but included here for completeness)
      // This case should never be reached due to early return, but keeping for safety
      optimizedPrompt = userRequest
      sceneDescription = 'Workbench generation'
      break
    
    case 'brand-scene': {
      // Try to detect a specific high-end brand and use its template
      const brandIntent = detectCategoryAndBrand(userRequest)
      let usedBrandTemplate = false

      if (brandIntent.confidence >= 0.7 && brandIntent.suggestedBrands.length > 0) {
        const detectedBrand = brandIntent.suggestedBrands[0] as { id: string; name: string }
        const templateId = BRAND_DEFAULT_TEMPLATE_IDS[detectedBrand.id]
        const template = templateId ? getBrandTemplate(templateId) : null

        if (template) {
          const context: PromptContext = {
            userIntent: userRequest,
            contentType: 'lifestyle',
            userImages: nanoInputs.baseImages.map((img, index) => ({
              url: img.url,
              type: img.type === 'user-photo' ? 'user_lora' : 'inspiration',
              description:
                img.type === 'user-photo'
                  ? `User reference image ${index + 1}`
                  : `Inspiration image ${index + 1}`,
            })),
          }

          optimizedPrompt = template.promptStructure(context)
          sceneDescription = `${detectedBrand.name} brand scene`
          usedBrandTemplate = true

          console.log('[PROMPT-BUILDER] Using high-end brand template for', {
            brandId: detectedBrand.id,
            templateId,
          })
        }
      }

      if (!usedBrandTemplate) {
        // ============================================
        // BRAND-SCENE MODE: Maya-generated prompts (concept cards)
        // ============================================
        // Concept cards use Maya's generated prompts (from concept.prompt)
        // These prompts go through full AI transformation with brand context
        // This is different from workbench which uses user-written prompts directly
        optimizedPrompt = buildBrandScenePrompt({
          userRequest, // This is Maya's generated prompt from concept generation
          inputImages: nanoInputs,
          brandKit,
          preferences,
          platformFormat: workflowMeta?.platformFormat ?? '4:5',
        })
        sceneDescription = `Brand scene`
      }
      break
    }

    default:
      // Fallback: treat unknown modes as generic brand scene
      optimizedPrompt = buildBrandScenePrompt({
        userRequest,
        inputImages: nanoInputs,
        brandKit,
        preferences,
        platformFormat: workflowMeta?.platformFormat ?? '4:5',
      })
      sceneDescription = `Brand scene`
      break
  }

  // Shared “Maya Pro” directive block: consistent, debuggable, not massive.
  const mayaProBlock = [
    getNanoBananaPromptingPrinciples(),
    getSceneCompositionIntelligence(finalMode),
    formatBrandDirective(brandKit, preferences),
  ]
    .filter(Boolean)
    .join('\n\n')

  // The finalPrompt includes system instructions for Maya's understanding
  // But for Replicate, we ONLY want the creation brief (optimizedPrompt)
  // The system instructions are for Maya to build prompts, not for the image model
  
  // 🔴 CRITICAL: Clean the prompt before returning
  // Remove headlines, formatting, unwanted terms, and convert to natural language
  const cleanedPrompt = cleanStudioProPrompt(optimizedPrompt, userRequest)
  
  console.log('[PROMPT-BUILDER] Prompt cleaned:', {
    originalLength: optimizedPrompt.length,
    cleanedLength: cleanedPrompt.length,
    hasHeadlines: optimizedPrompt.includes('**') && !cleanedPrompt.includes('**'),
  })

  return {
    optimizedPrompt: cleanedPrompt, // Clean, natural language prompt for Replicate
    sceneDescription,
  }
}

/* =========================
   Prompt Builders (Modes)
   ========================= */

function buildBrandScenePrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, inputImages, platformFormat } = params
  
  // CRITICAL: Check if userRequest is already a detailed prompt from Maya (concept cards)
  // Maya's prompts contain specific markers like:
  // - Character consistency instructions ("maintaining exactly the characteristics")
  // - Detailed outfit descriptions with materials/fabrics
  // - Camera specs (lens, aperture, professional photography)
  // - Specific lighting descriptions
  // - Brand mentions ("from Alo", "Alo brand outfit")
  // - Text overlay instructions
  // - Long, detailed descriptions (typically 150+ words)
  // - NOT the generic "Create a natural lifestyle brand scene" pattern
  const isGenericPrompt = userRequest.trim().startsWith('Create a natural lifestyle brand scene')
  const isMayaDetailedPrompt = !isGenericPrompt && (
    // Character consistency markers (Maya always includes this for Studio Pro)
    userRequest.includes('maintaining exactly the characteristics') ||
    userRequest.includes('maintaining exactly the characteristics of the') ||
    userRequest.includes('without copying the photo') ||
    // Camera specs (Maya includes specific technical details)
    (userRequest.includes('85mm lens') || userRequest.includes('50mm lens') || userRequest.includes('35mm lens')) ||
    (userRequest.includes('professional photography') && userRequest.includes('lens')) ||
    (userRequest.includes('f/') && (userRequest.includes('lens') || userRequest.includes('aperture'))) ||
    // Brand mentions (Maya includes brand context)
    (userRequest.includes('from ') && (userRequest.includes('brand') || userRequest.includes('Alo') || userRequest.includes('Chanel'))) ||
    // Text overlay markers
    userRequest.includes('**TEXT OVERLAY:**') ||
    userRequest.includes('**Composition:**') ||
    userRequest.includes('Font size:') ||
    userRequest.includes('Text placement:') ||
    // Detailed outfit descriptions (Maya includes materials/fabrics)
    (userRequest.includes('wearing') && (userRequest.includes('leather') || userRequest.includes('cashmere') || userRequest.includes('silk') || userRequest.includes('wool'))) ||
    // Long, detailed prompts (Maya's prompts are typically 150+ words)
    (userRequest.length > 200 && userRequest.includes('Vertical') && userRequest.includes('format')) ||
    // Studio Pro attachment reference format
    (userRequest.includes('Woman, maintaining') && userRequest.length > 150) ||
    // If prompt is long (>150 chars) and doesn't match generic pattern, assume it's Maya's
    (userRequest.length > 150 && !isGenericPrompt)
  )
  
  // Log detection for debugging
  console.log('[PROMPT-BUILDER] Checking if prompt is Maya\'s:', {
    isGenericPrompt,
    isMayaDetailedPrompt,
    promptLength: userRequest.length,
    promptStart: userRequest.substring(0, 100),
    hasMaintaining: userRequest.includes('maintaining exactly the characteristics'),
    hasLens: userRequest.includes('lens'),
    hasBrand: userRequest.includes('from ') && userRequest.includes('brand'),
  })
  
  if (isMayaDetailedPrompt) {
    // Maya has already created a detailed, specific prompt - clean it before using
    // This preserves all the text overlay instructions, character details, composition specs, etc.
    // but removes formatting and unwanted terms
    console.log('[PROMPT-BUILDER] ✅ Detected Maya detailed prompt - using Maya\'s prompt (cleaned)')
    
    // Clean the prompt to remove headlines and formatting
    let cleanedPrompt = cleanStudioProPrompt(userRequest, userRequest)
    
    // Add multi-image instruction in natural language (not as a "Note:")
    if (inputImages.baseImages.length > 1) {
      cleanedPrompt = `${cleanedPrompt}\n\nUse the first base image to preserve the person's face and identity. Use other base images as style/reference only.`
    }
    
    return cleanedPrompt
  }
  
  console.log('[PROMPT-BUILDER] ⚠️ Not detected as Maya prompt - building generic prompt')
  
  // Fallback: Build generic prompt for workbench-style requests
  const products = inputImages.productImages || []
  const productLine = products.length
    ? `Include the product(s): ${products
        .map((p) => `${p.brandName ? `${p.brandName} ` : ''}${p.label}`)
        .join(', ')}.`
    : `No product is required unless the reference images include one.`

  // 🔴 CRITICAL: Build attachment reference matching Maya's style
  let attachmentReference = ''
  if (inputImages.baseImages.length > 0) {
    const selfieCount = inputImages.baseImages.length
    if (selfieCount === 1) {
      attachmentReference = `Woman, maintaining exactly the characteristics of the woman in image 1 (face, body, skin tone, hair and visual identity), without copying the photo.`
    } else {
      const selfieNumbers = Array.from({ length: selfieCount }, (_, i) => i + 1).join(', ')
      attachmentReference = `Woman, maintaining exactly the characteristics of the woman in image ${selfieNumbers} (face, body, skin tone, hair and visual identity), without copying the photo.`
    }
  } else {
    attachmentReference = `Woman, maintaining exactly the characteristics of the woman in the image (face, body, skin tone, hair and visual identity), without copying the photo.`
  }

  const scene = pickSetting(userRequest)
  const mood = pickMood(userRequest)
  const lighting = pickLighting(scene, userRequest)
  
  // Extract outfit from userRequest if present
  const outfitMatch = userRequest.match(/\b(wearing|dressed in|outfit|in)\s+([^,\.]+(?:with|and|\+|,)\s*[^,\.]*){0,3}/i)
  const outfitDescription = outfitMatch 
    ? outfitMatch[0].replace(/\b(wearing|dressed in|outfit|in)\s+/i, '').trim()
    : scene === 'modern interior' ? 'elegant outfit' : scene === 'outdoor' ? 'casual outfit' : 'stylish outfit'
  
  // Extract pose from userRequest if present
  const poseMatch = userRequest.match(/\b(standing|sitting|walking|holding|leaning|posing|lounging)\s+[^,\.]*(?:with|and|\+)?[^,\.]*/i)
  const poseDescription = poseMatch ? poseMatch[0].trim() : 'standing confidently'
  
  // Build location phrase
  const locationPhrase = scene === 'modern interior' 
    ? 'in a modern interior setting'
    : scene === 'living room'
      ? 'in a living room'
      : `in ${scene}`
  
  // Build natural language matching Maya's style
  const naturalDesc = `Wearing ${outfitDescription}, ${poseDescription}, ${locationPhrase}, ${lighting}.`
  const productText = products.length > 0 ? ' Product naturally integrated into scene.' : ''

  const multiImageNote =
    inputImages.baseImages.length > 1
      ? `Use the first base image to preserve the person's face and identity. Use the other base images only as style/reference inputs. Keep the person consistent.`
      : `Use the base image to preserve the person's face and identity.`

  return `
Create a natural lifestyle brand scene for social media (${platformFormat || '4:5'}).
Scene: ${scene}. Mood: ${mood}. Lighting: ${lighting}.

${productLine}
${multiImageNote}

Composition requirements:
- The person is the primary subject.
- Product placement feels organic (not staged).
- Keep it believable: realistic shadows, scale, and contact points.
- iPhone-like authenticity: candid framing, slight imperfection, not over-polished.

Avoid:
- “AI keywords” like masterpiece/8K.
- Overly commercial “ad” look.
`.trim()
}

function buildUgcProductPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, inputImages, platformFormat } = params
  const products = inputImages.productImages || []
  const productLine = products.length
    ? `Feature product(s): ${products
        .map((p) => `${p.brandName ? `${p.brandName} ` : ''}${p.label}`)
        .join(', ')}.`
    : `If no product image is provided, create UGC-style content focusing on the creator and the “use moment”.`

  const scene = pickSetting(userRequest)
  const mood = pickMood(userRequest)
  const lighting = pickLighting(scene, userRequest)

  return `
Create a UGC-style photo (${platformFormat || '4:5'}) that looks like a real creator shot it.
Scene: ${scene}. Mood: ${mood}. Lighting: ${lighting}.

${productLine}

Requirements:
- Authentic creator energy (not studio-perfect).
- Product is clearly visible but still natural.
- Keep skin and textures real; avoid plastic-smooth rendering.
- Frame for social: strong subject, clean background, readable product.

Optional (only if requested in userRequest or text elements exist):
- Add 1 short callout line in-image with perfect legibility.
`.trim()
}

function buildTextOverlayPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { inputImages, platformFormat } = params
  const textElements = inputImages.textElements || []
  const primaryText = textElements[0]?.text || 'Untitled'
  const secondaryText = textElements[1]?.text

  return `
Create a text-forward social graphic (${platformFormat || '9:16'}).
Base image (if provided) should remain subtle and support readability.

Text must be perfectly legible:
- Primary text: "${primaryText}"
${secondaryText ? `- Secondary text: "${secondaryText}"` : ''}

Layout:
- Clean hierarchy (headline first).
- Strong contrast, generous spacing.
- Keep text inside safe zones (not cut off on IG UI).
`.trim()
}

function buildQuoteGraphicPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { inputImages, platformFormat } = params
  const textElements = inputImages.textElements || []
  const quote =
    textElements.find((t) => t.style === 'quote')?.text ||
    textElements[0]?.text ||
    'Untitled quote'
  const caption = textElements.find((t) => t.style === 'caption')?.text

  return `
Create a minimal quote graphic (${platformFormat || '1:1'}).

Text must be perfectly legible:
- Quote: "${quote}"
${caption ? `- Small caption line: "${caption}"` : ''}

Design direction:
- Premium minimal layout
- Balanced margins and spacing
- Subtle background texture is allowed (paper grain / soft gradient), but keep it clean
`.trim()
}

function buildCarouselSlidePrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  slideNumber: number
  totalSlides: number
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { inputImages, slideNumber, totalSlides, platformFormat, brandKit } = params
  const textElements = inputImages.textElements || []
  const slideText = textElements[0]?.text || `Slide ${slideNumber}`

  const slideRole =
    slideNumber === 1
      ? 'HOOK (scroll-stopping headline)'
      : slideNumber === totalSlides
        ? 'CTA (clear next step)'
        : 'VALUE (simple, clear teaching point)'

  // Brand kit styling guidance
  const brandGuidance = brandKit?.font_style 
    ? `Use ${brandKit.font_style} typography style.`
    : 'Use clean, modern typography.'
  
  const colorGuidance = brandKit?.primary_color
    ? `Primary brand color: ${brandKit.primary_color}. Use for text accents or backgrounds as appropriate.`
    : 'Use neutral, high-contrast colors for text readability.'

  // This is the CREATION BRIEF that goes to Replicate
  // Keep it focused, clear, and actionable - no system instructions
  return `
Create Instagram carousel slide ${slideNumber} of ${totalSlides} (${platformFormat || '1:1'}).
This is a TEXT-OVERLAY carousel slide with the person from the reference images.

Slide role: ${slideRole}

Text overlay: "${slideText}"
Text must be perfectly legible and readable at small sizes.
${brandGuidance}
${colorGuidance}
Text placement: Center or top area with strong contrast background/overlay.
Font size: Large enough to read on mobile (minimum 24pt equivalent).

Layout:
- Use the person from the reference images as the base/subject
- Person should be visible but text is the primary focus
- Consistent template system across all ${totalSlides} slides (same margins, type rhythm, layout structure)
- Strong visual hierarchy: text first, then person/image
- Minimal clutter - clean, professional design
- If person is used as background, add soft overlay/darkening to ensure text readability
- Safe zones: Keep text away from edges (IG UI may crop)

Design style:
- Social media optimized (not a photo, but a designed graphic with text overlay)
- Professional, on-brand aesthetic
- Clean, modern, legible
`.trim()
}

function buildReelCoverPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  reelTitle: string
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { reelTitle, platformFormat } = params
  const safeTitle = reelTitle?.trim() ? reelTitle.trim() : 'Untitled'

  return `
Create an Instagram reel cover (${platformFormat || '9:16'}).

Text must be perfectly legible:
- Title text: "${safeTitle}" (3–7 words max if possible)

Rules:
- Big readable type (works as a tiny thumbnail on the grid)
- Safe zones respected (not cut off)
- Clean, feed-consistent look (not noisy)
`.trim()
}

function buildProductMockupPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { inputImages, platformFormat, userRequest } = params
  const products = inputImages.productImages || []
  const productLine = products.length
    ? `Use these products: ${products
        .map((p) => `${p.brandName ? `${p.brandName} ` : ''}${p.label}`)
        .join(', ')}.`
    : `If no product images exist, create a generic mockup scene based on the request.`

  const scene = pickSetting(userRequest)
  const lighting = pickLighting(scene, userRequest)

  return `
Create a realistic product mockup (${platformFormat || '1:1'}).
${productLine}

Scene: ${scene}. Lighting: ${lighting}.

Rules:
- Realistic shadows and reflections
- Correct scale and perspective
- Clean, premium composition
- No fake-looking warped labels
`.trim()
}

function buildTransformationPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, inputImages, platformFormat } = params
  const lighting = pickLighting(pickSetting(userRequest), userRequest)
  const mood = pickMood(userRequest)

  const multiImageNote =
    inputImages.baseImages.length > 1
      ? `Preserve identity from the first base image. Use other images as reference only.`
      : `Preserve identity from the base image.`

  return `
Transform the provided image while preserving the person’s identity and realism (${platformFormat || '4:5'}).

Target mood: ${mood}
Target lighting: ${lighting}

${multiImageNote}

Keep:
- Face and likeness consistent
- Natural textures and believable lighting continuity

Change:
- Only what is requested (mood, lighting, framing, background, etc.)
`.trim()
}

function buildEditPrompt(params: {
  mode: 'edit-image' | 'change-outfit' | 'remove-object'
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  editInstruction?: string
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { mode, userRequest, inputImages, platformFormat } = params

  const instruction =
    (params.editInstruction && params.editInstruction.trim()) ||
    extractEditInstructionFromRequest(userRequest) ||
    (mode === 'change-outfit'
      ? 'Change the outfit while keeping everything else the same.'
      : mode === 'remove-object'
        ? 'Remove the unwanted object cleanly and keep lighting consistent.'
        : 'Edit the image as requested while keeping everything else unchanged.')

  const baseNote =
    inputImages.baseImages.length > 0
      ? `Use the provided image as the base. Preserve composition and identity unless instructed otherwise.`
      : `No base image provided. If none exists, do not hallucinate edits; request a base image upstream.`

  const modeNote =
    mode === 'change-outfit'
      ? `Specific rule: Keep face, hair, pose, and background the same. Only change outfit.`
      : mode === 'remove-object'
        ? `Specific rule: Remove object cleanly with believable fill, matching lighting and texture.`
        : `Specific rule: Only change what the instruction asks for; preserve everything else.`

  return `
Edit the existing image (${platformFormat || '4:5'}).
${baseNote}

Edit instruction:
- "${instruction}"

${modeNote}

Quality rules:
- No identity drift
- No plastic skin
- Lighting continuity is mandatory
`.trim()
}

function buildReuseAdaptPrompt(params: {
  userRequest: string
  inputImages: NanoBananaInputImages
  brandKit?: BrandKit
  preferences?: ProPreferences
  reuseGoal?: string
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, inputImages, reuseGoal, platformFormat } = params

  const goal =
    (reuseGoal && reuseGoal.trim()) ||
    extractReuseGoalFromRequest(userRequest) ||
    'Adapt this content for a new social format while keeping it consistent.'

  const baseNote =
    inputImages.baseImages.length > 0
      ? `Use the provided image as the base. Do not regenerate a new person. Keep identity consistent.`
      : `If no base image exists, request one upstream.`

  return `
Reuse and adapt an existing asset (${platformFormat || '4:5'}).
Goal:
- "${goal}"

${baseNote}

Adaptation rules:
- Preserve the core image identity
- Prefer crop, layout, text, color, and minor style adjustments over full regeneration
- Text must be perfectly legible if included
`.trim()
}

function buildEducationalPrompt(params: {
  userRequest: string
  brandKit?: BrandKit
  preferences?: ProPreferences
  platformFormat?: '1:1' | '4:5' | '9:16' | '16:9'
}): string {
  const { userRequest, platformFormat } = params
  const topic = extractTopicFromRequest(userRequest)

  return `
Create an educational infographic (${platformFormat || '1:1'}) about: "${topic}"

Rules:
- Clear hierarchy (headline → 3–6 points → small footer)
- Minimal clutter
- Legible typography
- Simple icons/shapes are fine; avoid dense diagrams unless requested

If numbers or claims are included, keep them short and readable.
`.trim()
}

/* =========================
   Helpers
   ========================= */

function deriveEditOrReuseMode(
  requestedMode: StudioProMode,
  userRequest: string,
  explicitEditInstruction?: string,
  explicitReuseGoal?: string
): StudioProMode {
  const req = (userRequest || '').toLowerCase()

  if (explicitEditInstruction && explicitEditInstruction.trim()) {
    if (req.includes('outfit') || req.includes('clothes') || req.includes('wear')) return 'change-outfit'
    if (req.includes('remove') || req.includes('delete') || req.includes('erase')) return 'remove-object'
    return 'edit-image'
  }

  if (explicitReuseGoal && explicitReuseGoal.trim()) return 'reuse-adapt'

  const looksLikeEdit =
    req.includes('edit ') ||
    req.includes('remove ') ||
    req.includes('replace ') ||
    req.includes('change ') ||
    req.includes('fix ') ||
    req.includes('clean up') ||
    req.includes('outfit') ||
    req.includes('background')

  const looksLikeReuse =
    req.includes('reuse') ||
    req.includes('adapt') ||
    req.includes('turn this into') ||
    req.includes('make this a') ||
    req.includes('convert') ||
    req.includes('resize') ||
    req.includes('crop')

  if (looksLikeReuse) return 'reuse-adapt'
  if (looksLikeEdit) {
    if (req.includes('outfit') || req.includes('clothes') || req.includes('wear')) return 'change-outfit'
    if (req.includes('remove') || req.includes('delete') || req.includes('erase')) return 'remove-object'
    return 'edit-image'
  }

  return requestedMode
}

function formatBrandDirective(brandKit?: BrandKit, preferences?: ProPreferences): string {
  const lines: string[] = ['## BRAND + PREFERENCE DIRECTIVE']

  const tone = preferences?.preferred_tone || brandKit?.brand_tone
  const style = preferences?.preferred_style
  const font = brandKit?.font_style

  if (tone) lines.push(`- Tone: ${tone}`)
  if (style) lines.push(`- Style: ${style}`)
  if (font) lines.push(`- Typography vibe: ${font}`)

  const colors = [brandKit?.primary_color, brandKit?.secondary_color, brandKit?.accent_color].filter(Boolean)
  if (colors.length) lines.push(`- Colors: ${colors.join(', ')}`)

  if (lines.length === 1) lines.push('- No brand kit provided. Keep it clean and neutral.')
  return lines.join('\n')
}

function extractBrandKitFromContext(userContext: string): BrandKit | null {
  if (!userContext) return null

  const primary = matchLine(userContext, /Primary\s*Color:\s*([#A-F0-9]{4,9})/i)
  const secondary = matchLine(userContext, /Secondary\s*Color:\s*([#A-F0-9]{4,9})/i)
  const accent = matchLine(userContext, /Accent\s*Color:\s*([#A-F0-9]{4,9})/i)
  const fontStyle = matchLine(userContext, /Font\s*Style:\s*([^\n]+)/i)
  const tone = matchLine(userContext, /Brand\s*Tone:\s*([^\n]+)/i)
  const name = matchLine(userContext, /Brand\s*Kit:\s*([^\n]+)/i)

  const kit: BrandKit = {
    name: name || undefined,
    primary_color: primary || undefined,
    secondary_color: secondary || undefined,
    accent_color: accent || undefined,
    font_style: fontStyle || undefined,
    brand_tone: tone || undefined,
  }

  return Object.values(kit).some(Boolean) ? kit : null
}

function extractPreferencesFromContext(userContext: string): ProPreferences | null {
  if (!userContext) return null
  const preferredTone = matchLine(userContext, /Preferred\s*Tone:\s*([^\n]+)/i)
  const preferredStyle = matchLine(userContext, /Preferred\s*Style:\s*([^\n]+)/i)

  const prefs: ProPreferences = {
    preferred_tone: preferredTone || undefined,
    preferred_style: preferredStyle || undefined,
  }

  return Object.values(prefs).some(Boolean) ? prefs : null
}

function matchLine(text: string, regex: RegExp): string | null {
  const m = text.match(regex)
  return m?.[1]?.trim() || null
}

function pickSetting(req: string): string {
  const r = (req || '').toLowerCase()
  const settings = [
    'kitchen',
    'bedroom',
    'office',
    'gym',
    'cafe',
    'outdoor',
    'studio',
    'living room',
    'bathroom',
    'street',
  ]
  const found = settings.find((s) => r.includes(s))
  return found || 'modern interior'
}

function pickMood(req: string): string {
  const r = (req || '').toLowerCase()
  if (r.includes('dark') || r.includes('moody')) return 'dark & moody'
  if (r.includes('cozy')) return 'cozy'
  if (r.includes('luxury') || r.includes('editorial')) return 'editorial luxury'
  if (r.includes('minimal')) return 'minimal'
  if (r.includes('bright')) return 'bright & clean'
  return 'clean and modern'
}

function pickLighting(setting: string, req: string): string {
  const r = (req || '').toLowerCase()
  if (r.includes('golden hour')) return 'golden hour light'
  if (r.includes('night')) return 'night lighting with practicals'
  if (r.includes('studio light')) return 'soft studio lighting'
  if (r.includes('window light')) return 'soft window light'

  const map: Record<string, string> = {
    kitchen: 'natural morning window light',
    bedroom: 'soft warm ambient lighting',
    office: 'clean professional lighting',
    gym: 'bright energetic lighting',
    cafe: 'cozy natural cafe lighting',
    outdoor: 'natural daylight',
    studio: 'controlled soft studio lighting',
    'living room': 'warm inviting home lighting',
    bathroom: 'soft natural bathroom lighting',
    street: 'natural daylight with gentle contrast',
  }

  return map[setting] || 'natural flattering light'
}

function extractTopicFromRequest(request: string): string {
  const topicMatch = request.match(/about (.+?)(?:\.|$)/i)
  return topicMatch ? topicMatch[1].trim() : 'your topic'
}

function extractSlideNumber(request: string): number {
  const match = request.match(/slide\s+(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

function extractTotalSlides(request: string): number {
  const match = request.match(/of\s+(\d+)/i)
  return match ? parseInt(match[1], 10) : 5
}

function extractReelTitle(request: string): string {
  const titleMatch = request.match(/["'“”](.+?)["'“”]/)
  return titleMatch ? titleMatch[1].trim() : 'Untitled'
}

function extractEditInstructionFromRequest(request: string): string | null {
  const r = request.trim()
  const m =
    r.match(/edit:\s*(.+)$/i) ||
    r.match(/change:\s*(.+)$/i) ||
    r.match(/remove:\s*(.+)$/i) ||
    r.match(/replace:\s*(.+)$/i)
  return m?.[1]?.trim() || null
}

function extractReuseGoalFromRequest(request: string): string | null {
  const r = request.trim()
  const m =
    r.match(/turn this into\s+(.+)$/i) ||
    r.match(/convert this to\s+(.+)$/i) ||
    r.match(/adapt this to\s+(.+)$/i)
  return m?.[1]?.trim() || null
}
