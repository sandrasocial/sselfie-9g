/**
 * CLASSIC MODE CONCEPT GENERATION API
 * 
 * PURPOSE: Generates concepts for Classic Mode (Flux LoRA) image generation.
 * 
 * FLOW:
 * 1. User requests concepts in Classic Mode
 * 2. API calls buildPrompt() or buildPromptWithFeatures() from prompt-constructor.ts
 * 3. Builder uses brand-library-2025.ts for brand intelligence
 * 4. Output: 250-500 word prompts with trigger word
 * 
 * KEY FEATURES:
 * - Trigger word included (required for Flux LoRA)
 * - Brand names from brand-library-2025.ts
 * - Technical camera/lighting specs
 * - Concise, structured format
 * 
 * PROMPT BUILDER:
 * - Uses: prompt-constructor.ts (buildPrompt, buildPromptWithFeatures)
 * - Intelligence: brand-library-2025.ts (generateCompleteOutfit)
 * 
 * DIFFERENCES FROM PRO MODE:
 * - Uses trigger words (Flux LoRA requirement)
 * - Shorter, more technical prompts
 * - Structured format with camera specs
 * - No identity preservation phrase
 * 
 * Last Updated: January 4, 2026 (Post-cleanup: Verified working correctly)
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateText } from "ai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import { getLifestyleContextIntelligence } from "@/lib/maya/lifestyle-contexts"
import { INSTAGRAM_LOCATION_INTELLIGENCE } from "@/lib/maya/instagram-location-intelligence"
import { getNanoBananaPromptingPrinciples } from "@/lib/maya/nano-banana-prompt-builder"
import { getNanoBananaPerfectExamples } from "@/lib/maya/nano-banana-examples"
import { getFluxPerfectExamples } from "@/lib/maya/flux-examples"
import { validateNanoBananaPrompt } from "@/lib/maya/nano-banana-validator"
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
import { getConceptPrompt } from "@/lib/maya/concept-templates"
import {
  shouldIncludeSkinTexture,
  mergeGuidePromptWithImages,
  extractPromptElements,
  createVariationFromGuidePrompt,
  type ReferenceImages
} from "@/lib/maya/prompt-builders/guide-prompt-handler"
import { generateCompleteOutfit } from "@/lib/maya/brand-library-2025"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { 
  buildPrompt, 
  buildPromptWithFeatures, 
  validatePromptLength,
  type PromptConstructorParams 
} from "@/lib/maya/prompt-constructor"
import { generateConceptCardsViaAuthority, auditLogMayaChatGeneration } from "@/lib/generation/prompt"
// prompt-constructor-enhanced removed - using unified system instead
// import { buildEnhancedPrompt, type EnhancedPromptParams } from "@/lib/maya/prompt-constructor-enhanced"
import {
  applyProgrammaticFixes,
  validatePromptLight,
  type DirectPromptContext
} from '@/lib/maya/direct-prompt-generation'
import { generateWithNanoBanana, checkNanoBananaPrediction } from '@/lib/nano-banana-client'
import { put } from '@vercel/blob'
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"

/**
 * Direct Prompt Generation
 * 
 * Maya generates final prompts directly for all concepts.
 */

type MayaConcept = {
  title: string
  description: string
  category: string
  fashionIntelligence: string
  lighting: string
  location: string
  prompt: string
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
    seed?: number
  }
  referenceImageUrl?: string
  imageUrl?: string // Optional: URL of generated image (for consistency mode with reference images)
  predictionId?: string // Optional: Prediction ID for tracking generation status
  referenceImages?: string[] // Optional: Array of reference image URLs used for generation
}


// Guide prompt handler functions are now imported from lib/maya/prompt-builders/guide-prompt-handler.ts

/**
 * Detect category from user request with improved mapping to Universal Prompt categories
 * Directly maps to Universal Prompt categories for better accuracy
 */
function detectCategoryFromRequest(
  userRequest?: string,
  aesthetic?: string,
  context?: string,
  conversationContext?: string
): string | null {
  // Include conversationContext for better context detection (like Classic Mode)
  const combined = `${userRequest || ''} ${aesthetic || ''} ${context || ''} ${conversationContext || ''}`.toLowerCase()
  
  // Travel & Airport (most specific patterns first)
  if (combined.match(/airport|travel|flight|plane|luggage|suitcase|departure|arrival|gate|boarding|baggage|terminal/i)) {
    return 'travel-airport'
  }
  
  // Ski / Après-ski / Mountain (before Christmas to avoid false matches)
  if (combined.match(/afterski|après.?ski|après ski|after.?ski|ski resort|skiing|mountain lodge|norway|switzerland|alps|snowboarding/i)) {
    return 'luxury-fashion' // Map to luxury for ski/après-ski lifestyle
  }
  
  // Athletic / Workout / Alo
  if (combined.match(/workout|gym|athletic|yoga|fitness|pilates|tennis|sport|alo|lululemon|training|exercise/i)) {
    return 'alo-workout'
  }
  
  // Christmas / Holiday / Seasonal (more specific to avoid false matches)
  if (combined.match(/christmas|holiday|festive|seasonal|winter party|nye|new year|tree|gifts|presents|christmas tree|christmas morning|christmas market/i)) {
    return 'seasonal-christmas'
  }
  
  // Luxury / Fashion / Editorial
  if (combined.match(/luxury|elegant|sophisticated|designer|chanel|bottega|hotel|marble|editorial|high.?end|premium|couture/i)) {
    return 'luxury-fashion'
  }
  
  // Casual Lifestyle (more specific - don't match on generic words alone)
  if (combined.match(/casual|lifestyle|coffee|everyday|relatable|street/i)) {
    return 'casual-lifestyle'
  }
  
  // Cozy/Home (require explicit "cozy" keyword, not just "comfortable")
  if (combined.match(/\bcozy\b|home|lounge/i) && !combined.match(/luxury|elegant|sophisticated/i)) {
    return 'casual-lifestyle' // Map cozy to casual-lifestyle
  }
  
  // 🔴 FIX: Only default to 'casual-lifestyle' if we have meaningful text to analyze
  // If combined is empty or just whitespace, return special marker to allow fallback to upload module category
  const hasUserRequest = userRequest && userRequest.trim().length > 0
  const hasAesthetic = aesthetic && aesthetic.trim().length > 0
  const hasContext = context && context.trim().length > 0
  const hasConversationContext = conversationContext && conversationContext.trim().length > 0
  const hasMeaningfulText = combined.trim().length > 0 && (hasUserRequest || hasAesthetic || hasContext || hasConversationContext)
  
  if (!hasMeaningfulText) {
    // No meaningful text - return special marker to allow fallback to upload module category
    return '' // Return empty string instead of null (callers can check for empty)
  }
  
    // We have text but no patterns matched - return null to allow dynamic generation
    // This is likely an aesthetic description (e.g., "pinterest influencer aesthetic") not a category
    return null // Return null instead of defaulting - allows Maya to use full fashion knowledge
}

/**
 * Map category from detectCategoryFromRequest format to generateCompleteOutfit format
 * detectCategoryFromRequest now returns: 'travel-airport', 'alo-workout', 'seasonal-christmas', 'casual-lifestyle', 'luxury-fashion'
 * generateCompleteOutfit expects: 'workout', 'travel', 'casual', 'cozy', etc.
 * Returns null if category doesn't map to a supported generateCompleteOutfit category
 */
function mapCategoryForBrandLibrary(mappedCategory: string | null, userRequest?: string): string | null {
  // Guard against null category
  if (!mappedCategory || typeof mappedCategory !== 'string') {
    return null
  }
  
  const categoryLower = mappedCategory.toLowerCase()
  const requestLower = (userRequest || '').toLowerCase()
  
  // Only map categories that generateCompleteOutfit actually supports
  // Supported categories: 'workout', 'athletic', 'gym', 'casual', 'coffee-run', 
  // 'street-style', 'travel', 'airport', 'cozy', 'home'
  
  // Map Universal Prompt categories to brand library categories
  if (categoryLower === 'alo-workout' || categoryLower.includes('workout') || categoryLower === 'athletic' || categoryLower === 'gym') {
    return 'workout'
  }
  if (categoryLower === 'travel-airport' || categoryLower.includes('travel') || categoryLower === 'airport') {
    return 'travel'
  }
  if (categoryLower === 'casual-lifestyle') {
    // For casual-lifestyle, infer from user request context
    if (/coffee|cafe|coffeeshop/i.test(requestLower)) {
      return 'coffee-run'
    }
    if (/street|urban|city|soho/i.test(requestLower)) {
      return 'street-style'
    }
    // Default to 'casual' for casual-lifestyle
    return 'casual'
  }
  if (categoryLower === 'luxury-fashion' || categoryLower === 'luxury') {
    return 'luxury'
  }
  if (categoryLower === 'seasonal-christmas' || (categoryLower === 'cozy' && /christmas|holiday|winter/i.test(requestLower))) {
    // Christmas maps to cozy for brand library
    return 'cozy'
  }
  
  // Legacy category mappings (for backward compatibility)
  if (categoryLower === 'travel-lifestyle') {
    return 'travel'
  }
  if (categoryLower === 'lifestyle-wellness') {
    // For lifestyle-wellness, infer from user request context
    if (/cozy|home|comfort|lounge|relax/i.test(requestLower)) {
      return 'cozy'
    }
    if (/street|urban|city/i.test(requestLower)) {
      return 'street-style'
    }
    // Default to 'casual' for lifestyle-wellness when no specific context is detected
    return 'casual'
  }
  
  // No fallbacks - return null for unmapped categories
  // This prevents unwanted brand injection for categories like:
  // 'beauty', 'tech', 'selfies'
  return null
}

/**
 * Enhanced category detection for prompt constructor
 * Maps user input to prompt constructor categories
 */
function detectCategoryForPromptConstructor(
  userRequest?: string,
  aesthetic?: string,
  context?: string,
  conversationContext?: string
): { category: string | null; vibe: string | null; location: string | null; wasDetected: boolean; isAestheticDescription?: boolean } {
  // Include conversationContext for better context detection (like Classic Mode)
  const combinedText = `${userRequest || ''} ${aesthetic || ''} ${context || ''} ${conversationContext || ''}`.toLowerCase()
  
  // 🔴 FIX: Track if category was actually detected (not defaulted)
  let category: string | null = null
  let vibe: string | null = null
  let location: string | null = null
  let wasDetected = false
  
  // Workout/Athletic
  if (/workout|gym|fitness|athletic|exercise|training/.test(combinedText)) {
    category = 'workout'
    vibe = 'athletic'
    location = 'gym'
    wasDetected = true
  }
  // Casual/Coffee
  else if (/coffee|casual|errands|running errands|coffee run/.test(combinedText)) {
    category = 'casual'
    vibe = 'casual'
    location = 'coffee-shop'
    wasDetected = true
  }
  // Street Style
  else if (/street style|street-style|fashion|urban|soho|city/.test(combinedText)) {
    category = 'street-style'
    vibe = 'street-style'
    location = 'street'
    wasDetected = true
  }
  // Ski / Après-ski / Mountain (before travel to catch specific requests)
  else if (/afterski|après.?ski|après ski|after.?ski|ski resort|skiing|mountain lodge|norway|switzerland|alps|snowboarding/.test(combinedText)) {
    category = 'luxury'
    vibe = 'luxury'
    location = 'mountain lodge' // Will be overridden by specific location if mentioned
    wasDetected = true
  }
  // Travel/Airport
  else if (/airport|travel|traveling|flying|terminal/.test(combinedText)) {
    category = 'travel'
    vibe = 'travel'
    location = 'airport'
    wasDetected = true
  }
  // Luxury (check BEFORE cozy to catch "comfortable luxury" etc.)
  else if (/luxury|chic|elegant|sophisticated|refined/.test(combinedText)) {
    category = 'luxury'
    vibe = 'luxury'
    location = 'luxury location'
    wasDetected = true
  }
  // Cozy/Home (require explicit "cozy" keyword, not just "comfortable")
  else if (/\bcozy\b|home|lounge/i.test(combinedText) && !/luxury|elegant|sophisticated/i.test(combinedText)) {
    category = 'cozy'
    vibe = 'cozy'
    location = 'home'
    wasDetected = true
  }
  // Christmas/Holiday (check BEFORE cozy to catch Christmas requests)
  else if (/christmas|holiday|festive|winter party|nye|new year|tree|gifts|presents|christmas tree|christmas morning|christmas market/i.test(combinedText)) {
    category = 'cozy' // Map to cozy for brand library (Christmas uses cozy category)
    vibe = 'cozy' // But keep vibe as cozy for Christmas aesthetic
    location = 'home' // Christmas is typically home-based
    wasDetected = true
  }
  
  // Extract location hints from text - only override if location wasn't already set by category
  // This preserves category-location relationships (e.g., workout -> gym)
  // But allows explicit location mentions to override (e.g., "workout at home" -> home)
  if (location === 'street' || location === 'luxury location' || location === 'mountain lodge') {
    // Only override default locations, not category-specific ones
    if (/afterski|après.?ski|après ski|after.?ski|ski resort|mountain lodge|norway|switzerland|alps/.test(combinedText)) {
      location = 'mountain lodge'
    } else if (/gym|fitness center|studio/.test(combinedText)) location = 'gym'
    else if (/coffee|cafe|coffeeshop/.test(combinedText)) location = 'coffee-shop'
    else if (/airport|terminal|gate/.test(combinedText)) location = 'airport'
    else if (/home|house|apartment|living room/.test(combinedText)) location = 'home'
    else if (/street|soho|city|urban/.test(combinedText)) location = 'street'
  } else {
    // For category-specific locations, only override if there's an explicit location mention
    // that conflicts with the category default (e.g., "workout at home" -> home)
    if (/afterski|après.?ski|après ski|after.?ski|ski resort|mountain lodge|norway|switzerland|alps/.test(combinedText)) {
      location = 'mountain lodge'
    } else if (/home|house|apartment|living room/.test(combinedText) && location !== 'home') {
      location = 'home'
    } else if (/gym|fitness center|studio/.test(combinedText) && location !== 'gym') {
      location = 'gym'
    } else if (/coffee|cafe|coffeeshop/.test(combinedText) && location !== 'coffee-shop') {
      location = 'coffee-shop'
    } else if (/airport|terminal|gate/.test(combinedText) && location !== 'airport') {
      location = 'airport'
    } else if (/street|soho|city|urban/.test(combinedText) && location !== 'street') {
      location = 'street'
    }
  }
  
  // 🔴 FIX: Return null when no patterns match - allow dynamic generation instead of forcing defaults
  // If combinedText is empty or just whitespace, mark as not detected to allow fallback to upload module category
  if (category === null && vibe === null && location === null) {
    // No patterns matched - check if we have meaningful text to analyze
    const hasUserRequest = userRequest && typeof userRequest === 'string' && userRequest.trim().length > 0
    const hasAesthetic = aesthetic && typeof aesthetic === 'string' && aesthetic.trim().length > 0
    const hasContext = context && typeof context === 'string' && context.trim().length > 0
    const hasConversationContext = conversationContext && typeof conversationContext === 'string' && conversationContext.trim().length > 0
    const hasMeaningfulText = combinedText.trim().length > 0 && (hasUserRequest || hasAesthetic || hasContext || hasConversationContext)
    
    if (!hasMeaningfulText) {
      // No meaningful text - mark as not detected to allow fallback to upload module category
      console.log('[v0] [CATEGORY-DETECTION] No meaningful text found, marking as not detected for fallback')
      wasDetected = false
      // Return null to allow dynamic generation
      return { category: null, vibe: null, location: null, wasDetected: false, isAestheticDescription: false }
    }
    
    // We have text but no patterns matched - this is likely an aesthetic description, not a category
    // Return null to allow Maya to use her full fashion knowledge dynamically
    console.log('[v0] [CATEGORY-DETECTION] No category pattern matched - allowing dynamic generation. Combined text:', combinedText.substring(0, 100))
    // Check if it looks like an aesthetic description (contains words like "aesthetic", "style", "vibe", "curated", "dreamy", etc.)
    const aestheticKeywords = /aesthetic|style|vibe|curated|dreamy|feminine|minimal|luxury|editorial|pinterest|instagram|influencer/i
    const isAestheticDescription = aestheticKeywords.test(combinedText)
    
    return { 
      category: null, 
      vibe: null, 
      location: null, 
      wasDetected: false, 
      isAestheticDescription: isAestheticDescription 
    }
  }
  
  return { 
    category: category || null, 
    vibe: vibe || null, 
    location: location || null, 
    wasDetected: wasDetected 
  }
}


/**
 * Helper: Detect brand from text
 */
function detectBrand(text?: string): string | undefined {
  if (!text) return undefined

  const lower = text.toLowerCase()

  if (lower.includes('alo')) return 'ALO'
  if (lower.includes('chanel')) return 'CHANEL'
  if (lower.includes('lululemon') || lower.includes('lulu')) return 'LULULEMON'
  if (lower.includes('glossier')) return 'GLOSSIER'

  return undefined
}


/**
 * Detect and refine the guide prompt from request params and conversation context.
 * Extracted from POST to reduce cyclomatic complexity.
 */
function detectAndRefineGuidePrompt(
  userRequest: string | undefined,
  guidePrompt: string | undefined,
  conversationContext: string | undefined
): { detectedGuidePrompt: string | null; hasNewUserRequest: boolean } {
  let detectedGuidePrompt: string | null = null
  let hasNewUserRequest = false

  // First, check if userRequest should be the guide prompt (highest priority)
  if (userRequest) {
    const userRequestLength = userRequest.trim().length
    const hasDetailedElements = /(?:wearing|outfit|dressed|seated|standing|sitting|holding|hair|bun|expression|lighting|light|50mm|85mm|lens|f\/|depth of field|skin texture|pores|setting|scene|location|background|tree|fireplace|sofa|room)/i.test(userRequest)
    const hasMultipleSentences = (userRequest.match(/[.!?]\s+/g) || []).length >= 2
    const hasSpecificDetails = userRequestLength > 100 && (hasDetailedElements || hasMultipleSentences)

    if (hasSpecificDetails) {
      detectedGuidePrompt = userRequest.trim()
      hasNewUserRequest = true
    } else if (userRequestLength > 20) {
      hasNewUserRequest = true
    }
  }

  // Second, use explicitly provided guidePrompt if no userRequest guide prompt was detected
  if (!detectedGuidePrompt && guidePrompt) {
    detectedGuidePrompt = guidePrompt
  }

  // Only extract guide prompt from conversationContext if no new userRequest was provided,
  // OR the userRequest is a continuation/refinement of the old guide prompt
  if (!detectedGuidePrompt && conversationContext && !hasNewUserRequest) {
    const guidePromptMatch = /\[GUIDE_PROMPT_TEXT:\s*([^\]]+)\]/i.exec(conversationContext)
    if (guidePromptMatch?.[1]) {
      detectedGuidePrompt = guidePromptMatch[1].trim()
    }
  } else if (conversationContext && hasNewUserRequest && !detectedGuidePrompt) {
    const guidePromptMatch = /\[GUIDE_PROMPT_TEXT:\s*([^\]]+)\]/i.exec(conversationContext)
    if (guidePromptMatch?.[1]) {
      const oldGuidePrompt = guidePromptMatch[1].trim()
      const oldHasOutfit = /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(oldGuidePrompt)
      const oldHasLocation = /(?:tree|sofa|fireplace|room|setting|scene|location|background)/i.test(oldGuidePrompt)
      const newMentionsOutfit = oldHasOutfit && /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(userRequest || "")
      const newMentionsLocation = oldHasLocation && /(?:tree|sofa|fireplace|room|setting|scene|location|background)/i.test(userRequest || "")
      if (newMentionsOutfit || newMentionsLocation) {
        detectedGuidePrompt = oldGuidePrompt
      }
    }
  }

  return { detectedGuidePrompt, hasNewUserRequest }
}

/**
 * Parse legacy AI-generated concept cards from a raw text response.
 * Extracted from POST to reduce cyclomatic complexity.
 */
function parseLegacyConceptsFromText(text: string): MayaConcept[] {
  const jsonMatch = /\[[\s\S]*\]/.exec(text)
  if (!jsonMatch) {
    console.error('[v0] [AI-GENERATION] ❌ Failed to parse JSON from AI response')
    return []
  }
  try {
    const parsed = JSON.parse(jsonMatch[0])
    const valid: MayaConcept[] = Array.isArray(parsed)
      ? parsed.filter((c: any) => {
          const isValid = c && typeof c === "object" && typeof c.title === "string" && typeof c.prompt === "string"
          if (!isValid) console.warn("[v0] [AI-GENERATION] Dropping malformed concept card:", c)
          return isValid
        })
      : []
    if (valid.length === 0) console.error("[v0] [AI-GENERATION] ❌ No valid concept cards after schema filter")
    return valid
  } catch (parseErr) {
    console.error("[v0] [AI-GENERATION] ❌ JSON.parse failed for concept cards:", parseErr)
    return []
  }
}

/**
 * Apply minimal syntax cleanup to a concept prompt.
 * Extracted from POST nested function to top-level.
 */
const FLUX_SECTION_LABEL =
  /\[(?:TRIGGER WORD|SCENE|SUBJECT|POSE|LIGHTING|CAMERA|STYLING|COLOR GRADING|MOOD|STYLE)\]\s*/gi

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Remove accidental [SCENE]-style labels; collapse whitespace; ensure trigger prefix; dedupe trigger token. */
function minimalSyntaxCleanup(prompt: string, triggerWord: string): string {
  let clean = prompt.replace(FLUX_SECTION_LABEL, "").replace(/,\s*,/g, ",").trim()
  clean = clean.replace(/\s+/g, " ")

  if (triggerWord) {
    if (!clean.toLowerCase().startsWith(triggerWord.toLowerCase())) {
      clean = `${triggerWord}, ${clean}`
    }
    const twRe = new RegExp(`\\b${escapeRegExp(triggerWord)}\\b`, "gi")
    let n = 0
    clean = clean.replace(twRe, (m) => {
      n += 1
      return n === 1 ? m : ""
    })
    clean = clean.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim()
    clean = clean.replace(new RegExp(`^(${escapeRegExp(triggerWord)}),\\s*,`, "i"), "$1,")
  }

  return clean
}

export async function POST(req: NextRequest) {
  try {
    

    // Authenticate user
    const supabase = await createServerClient()
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get effective user (impersonated if admin is impersonating)
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const effectiveUser = await getEffectiveNeonUser(authUser.id)
    if (!effectiveUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const {
      userRequest,
      aesthetic,
      context,
      userModifications,
      count = 6, // Changed default from 3 to 6, Maya can override
      referenceImageUrl,
      referenceImages, // NEW: Structured images from upload module { selfies, products, styleRefs, userDescription } - type: ReferenceImages
      customSettings,
      mode = "concept",
      conversationContext,
      studioProMode = false, // Studio Pro mode flag - uses Nano Banana prompting instead of Flux
      enhancedAuthenticity = false, // Enhanced authenticity toggle - only for Classic mode
      guidePrompt, // NEW: Guide prompt from user (for concept #1, then variations for 2-6)
      templateExamples: providedTemplateExamples, // NEW: Pre-loaded template examples from admin prompt builder
      aspectRatio = "1:1", // Aspect ratio for image generation (default to 1:1)
    } = body

    // Detect guide prompt from userRequest, explicit guidePrompt param, or conversationContext.
    const { detectedGuidePrompt, hasNewUserRequest } = detectAndRefineGuidePrompt(
      userRequest,
      guidePrompt,
      conversationContext
    )

    // Warn if userRequest is empty - this causes defaults
    if (!userRequest || userRequest.trim().length === 0) {
      console.warn('[v0] ⚠️ WARNING: userRequest is empty! This will cause category detection to default. Check if Maya tool is extracting userRequest properly.')
    }

    // Detect environment
    const host = req.headers.get("host") || ""
    const isProduction = host === "sselfie.ai" || host === "www.sselfie.ai"
    const isPreview = host.includes("vercel.app") || host.includes("v0.dev") || host.includes("vusercontent.net")

    // Get user data
    let userGender = "person"
    let userEthnicity = null
    let physicalPreferences = null

    const userDataResult = await sql`
      SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id 
        AND um.training_status = 'completed'
        AND (um.is_test = false OR um.is_test IS NULL)
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
      WHERE u.id = ${effectiveUser.id} 
      LIMIT 1
    `

    if (userDataResult.length > 0 && userDataResult[0].gender) {
      const dbGender = userDataResult[0].gender.toLowerCase().trim()

      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      } else if (dbGender === "non-binary" || dbGender === "nonbinary" || dbGender === "non binary") {
        userGender = "person"
      } else {
        userGender = dbGender
      }
    }

    userEthnicity = userDataResult[0]?.ethnicity || null
    physicalPreferences = userDataResult[0]?.physical_preferences || null

    const triggerWord = userDataResult[0]?.trigger_word || `user${effectiveUser.id}`

    // 🔴 CRITICAL: Fashion intelligence is ONLY for classic mode (Flux/iPhone/trigger words)
    // In Studio Pro mode, we use Nano Banana with professional photography - fashion intelligence would interfere
    // Fashion intelligence contains FLUX-specific rules, trigger word instructions, and iPhone specs
    // These are NOT appropriate for Studio Pro mode which uses professional photography and brand scenes
    const fashionIntelligence = studioProMode 
      ? "" // Skip fashion intelligence in pro mode - it's designed for classic mode only
      : getFashionIntelligencePrinciples(userGender, userEthnicity)

    // Analyze images if provided (NEW: supports multiple images from upload module)
    let imageAnalysis = ""
    let allImages: string[] = []
    
    // Collect all images from upload module structure
    if (referenceImages) {
      allImages = [
        ...(referenceImages.selfies || []),
        ...(referenceImages.products || []),
        ...(referenceImages.styleRefs || []),
      ]
      console.log("[v0] Analyzing images from upload module:", {
        selfies: referenceImages.selfies?.length || 0,
        products: referenceImages.products?.length || 0,
        styleRefs: referenceImages.styleRefs?.length || 0,
        total: allImages.length,
        hasDescription: !!referenceImages.userDescription,
      })
    } else if (referenceImageUrl) {
      allImages = [referenceImageUrl]
      console.log("[v0] Analyzing single reference image:", referenceImageUrl)
    }

    // Analyze all images if provided
    if (allImages.length > 0) {
      const visionAnalysisPrompt = referenceImages
        ? `Analyze these images carefully. The user has provided:
${referenceImages.selfies?.length ? `- ${referenceImages.selfies.length} photo(s) of themselves` : ''}
${referenceImages.products?.length ? `- ${referenceImages.products.length} product image(s)` : ''}
${referenceImages.styleRefs?.length ? `- ${referenceImages.styleRefs.length} style reference image(s)` : ''}
${referenceImages.userDescription ? `\nUser's description: "${referenceImages.userDescription}"` : ''}

Tell me everything I need to know to create perfect concepts that incorporate these images naturally.

CRITICAL - DETECT THESE FIRST:
1. **Is this BLACK & WHITE or MONOCHROME?** - If yes, this MUST be in the prompt as "black and white" or "monochrome"
2. **Is this a STUDIO shot?** - Look for: studio lighting, professional setup, clean backgrounds, controlled environment
3. **Is this EDITORIAL/HIGH-FASHION?** - Look for: magazine-style, high-end fashion, dramatic, professional photography
4. **Camera type** - Is this clearly shot on a professional camera (not phone)? Look for: sharp focus, professional quality, studio equipment

Then focus on:
5. **The person's characteristics** - Physical features, style, presence (from selfie photos)
6. **Products** - What products are shown? How should they be featured? (from product images)
7. **Style references** - What aesthetic, mood, lighting, setting should be recreated? (from style reference images)
8. **How images work together** - How should these elements combine in the final concepts?
9. **The outfit/styling** - What are they wearing? Be super specific (fabrics, fit, colors, style)
10. **The pose** - How should they pose? What are their hands doing?
11. **The setting** - Where should this be? What's the vibe of the location?
12. **The lighting** - What kind of light? (studio lighting, natural window light, dramatic side lighting, soft diffused, etc.)
13. **The mood** - What feeling should this give off? (confident, relaxed, mysterious, playful, etc.)
14. **Color palette** - What colors dominate? (If B&W, explicitly say "black and white" or "monochrome")

${referenceImages.userDescription ? `\n**USER'S SPECIFIC INSTRUCTIONS:** "${referenceImages.userDescription}"\nIncorporate this guidance naturally into the analysis.` : ''}

IMPORTANT: If you detect B&W, studio, or editorial - these are MANDATORY requirements that MUST be in every prompt. Don't suggest "natural iPhone photos" if this is clearly a professional studio shot.

Keep it conversational and specific. I need to recreate this EXACT vibe incorporating all these elements.`
        : `Look at this image carefully and tell me everything I need to know to recreate this EXACT vibe.

CRITICAL - DETECT THESE FIRST:
1. **Is this BLACK & WHITE or MONOCHROME?** - If yes, this MUST be in the prompt as "black and white" or "monochrome"
2. **Is this a STUDIO shot?** - Look for: studio lighting, professional setup, clean backgrounds, controlled environment
3. **Is this EDITORIAL/HIGH-FASHION?** - Look for: magazine-style, high-end fashion, dramatic, professional photography
4. **Camera type** - Is this clearly shot on a professional camera (not phone)? Look for: sharp focus, professional quality, studio equipment

Then focus on:
5. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
6. **The pose** - How are they standing/sitting? What are their hands doing?
7. **The setting** - Where is this? What's the vibe of the location?
8. **The lighting** - What kind of light is this? (studio lighting, natural window light, dramatic side lighting, soft diffused, etc.)
9. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
10. **Color palette** - What colors dominate? (If B&W, explicitly say "black and white" or "monochrome")

IMPORTANT: If you detect B&W, studio, or editorial - these are MANDATORY requirements that MUST be in every prompt. Don't suggest "natural iPhone photos" if this is clearly a professional studio shot.

Keep it conversational and specific. I need to recreate this EXACT vibe.`

      // Build content array with text and all images
      const content: any[] = [
        {
          type: "text",
          text: visionAnalysisPrompt,
        },
      ]

      // Add all images (Claude can handle multiple images)
      allImages.forEach((imageUrl) => {
        content.push({
          type: "image",
          image: imageUrl,
        })
      })

      const { text: visionText } = await generateText({
        model: createMayaOpenRouterModel("chat_pro"),
        messages: [
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.7,
      })

      imageAnalysis = visionText
      console.log("[v0] Vision analysis complete for", allImages.length, "image(s)")
      console.log("[v0] Image analysis preview:", imageAnalysis.substring(0, 300))
      
      // 🔴 CRITICAL: Log if hair information is detected in image analysis
      if (imageAnalysis && /hair|hairstyle|hair color|hair length/i.test(imageAnalysis)) {
        const hairInfo = imageAnalysis.match(/(?:hair|hairstyle)[^.]*?([^.]{20,150})/i)
        if (hairInfo) {
          console.log("[v0] ✅ Hair information detected in image analysis:", hairInfo[1].substring(0, 100))
        }
      }
    }

    // Generate photoshoot seed if needed
    let photoshootBaseSeed: number | null = null
    if (mode === "photoshoot") {
      photoshootBaseSeed = Math.floor(Math.random() * 1000000)
      console.log("[v0] Photoshoot mode: consistent seed:", photoshootBaseSeed)
    }

    const lifestyleContext = getLifestyleContextIntelligence(userRequest || aesthetic || "")

    // 🔴 CRITICAL: Extract concept prompt if user selected a specific concept
    // BUT: User's explicit requests in chat override the pre-selected concept
    let conceptPromptText = ""
    let selectedConceptCategory = ""
    let selectedConceptValue = ""
    let shouldPrioritizeUserRequest = false
    
    // 🔴 CRITICAL: Only extract concept from referenceImages if user hasn't provided a NEW request
    // If user provides a new request (hasNewUserRequest), prioritize their request over pre-selected concept
    if (referenceImages && (referenceImages as any).category && (referenceImages as any).concept && !hasNewUserRequest) {
      selectedConceptCategory = (referenceImages as any).category
      selectedConceptValue = (referenceImages as any).concept
      const conceptPrompt = getConceptPrompt(selectedConceptCategory, selectedConceptValue)
      if (conceptPrompt) {
        conceptPromptText = conceptPrompt
        console.log("[v0] Extracted concept prompt:", conceptPromptText.substring(0, 100) + "...")
      }
    } else if (hasNewUserRequest && referenceImages && (referenceImages as any).category && (referenceImages as any).concept) {
      // User provided new request - check if it's related to the selected concept or something different
      selectedConceptCategory = (referenceImages as any).category
      selectedConceptValue = (referenceImages as any).concept
      const conceptPrompt = getConceptPrompt(selectedConceptCategory, selectedConceptValue)
      if (conceptPrompt) {
        conceptPromptText = conceptPrompt
        console.log("[v0] User provided new request - concept prompt extracted but will be prioritized based on user request match")
      }
    }
    
    // 🔴 CRITICAL: Check if user is explicitly requesting something different from the selected concept
    // Also check if user wants something different from old guide prompt
    const userRequestLower = (userRequest || "").toLowerCase().trim()
    const conversationContextLower = (conversationContext || "").toLowerCase().trim()
    const combinedUserRequest = `${userRequestLower} ${conversationContextLower}`.toLowerCase()
    
    // Determine if user wants something different:
    // 1. User explicitly says "different", "change", "instead", "not", etc.
    // CRITICAL: Only check userRequestLower, not combinedUserRequest, to detect NEW requests
    const explicitDifferentKeywords = /different|change|instead|not|no.*want|prefer|rather|switch|new.*concept|another|other|actually|make it|i want|create.*for/i.test(userRequestLower)
    
    // 2. User provides a substantial request that doesn't align with the selected concept
    const hasSubstantialRequest = userRequest && userRequest.trim().length > 10
    
    // 3. User's request doesn't mention the selected concept or category keywords
    const conceptValueLower = selectedConceptValue?.toLowerCase() || ""
    const conceptCategoryLower = selectedConceptCategory?.toLowerCase() || ""
    const mentionsSelectedConcept = conceptValueLower && combinedUserRequest.includes(conceptValueLower)
    const mentionsSelectedCategory = conceptCategoryLower && combinedUserRequest.includes(conceptCategoryLower)
    
    // Prioritize user request if:
    // - They explicitly say they want something different, OR
    // - They provide a substantial request that doesn't mention the selected concept/category
    shouldPrioritizeUserRequest = explicitDifferentKeywords || 
      (hasSubstantialRequest && !mentionsSelectedConcept && !mentionsSelectedCategory)
    
    if (shouldPrioritizeUserRequest) {
      console.log("[v0] User is requesting something different from selected concept. Prioritizing user request.")
    }
    
    // ✅ Use provided templates if available (from admin prompt builder) - these are optional examples for inspiration
    const templateExamples: string[] = Array.isArray(providedTemplateExamples) ? providedTemplateExamples : []
    
    if (templateExamples.length > 0) {
      console.log("[v0] Using", templateExamples.length, "pre-loaded template examples from admin prompt builder (optional inspiration only)")
    }

    // PRIORITY 1 FIX #3: Make Scandinavian filter conditional - default but allow override
    // Check if user specified a different aesthetic (before trend research)
    const userAestheticLower = (aesthetic || "").toLowerCase()
    // userRequestLower already declared above, reuse it
    const combinedStyle = userAestheticLower + " " + userRequestLower
    const wantsScandinavian = /scandi|scandinavian|minimal|minimalist|nordic|hygge/i.test(combinedStyle)
    const wantsNonScandi = /vintage|y2k|dark.?academia|maximalist|mob.?wife|bold|colorful|vibrant|editorial|high.?fashion/i.test(combinedStyle) && !wantsScandinavian

    // 🔴 CRITICAL: Skip trend research in Studio Pro mode when guide prompt is active
    // Guide prompts are explicit user instructions that should not be overridden by trend research
    // Also, trend research defaults to Scandinavian minimalism which could conflict with guide prompts
    let trendResearch = ""
    if (!detectedGuidePrompt && (!aesthetic || aesthetic.toLowerCase().includes("instagram") || aesthetic.toLowerCase().includes("trend"))) {
      console.log("[v0] Researching current Instagram trends for concept generation")

      // Build trend research prompt with conditional Scandinavian filter
      let trendResearchPrompt = `Research current Instagram fashion trends for personal brand content creators. Focus on:

1. What aesthetics are performing well RIGHT NOW on Instagram (Jan 2025)
2. Color palettes that are trending for fashion content
3. Outfit styling that's getting high engagement
4. Settings and locations that feel current

Keep it brief (2-3 paragraphs) and actionable for a fashion photographer creating content.`

      // Add conditional filter instruction
      // BUT: Skip Scandinavian default if guide prompt is active (guide prompt takes priority)
      if (detectedGuidePrompt) {
        // Guide prompt is active - don't apply Scandinavian filter, let guide prompt dictate the aesthetic
        trendResearchPrompt += `\n\nCRITICAL: The user has provided an exact guide prompt. Use these trends as general inspiration only - DO NOT override the guide prompt's aesthetic, colors, or styling choices.`
      } else if (wantsNonScandi) {
        const aestheticName = userAestheticLower || "the requested"
        trendResearchPrompt += `\n\nCRITICAL: Filter trends through ${aestheticName} aesthetic lens.`
      } else {
        // Default: Scandinavian minimalism (beautiful default aesthetic)
        // BUT: Only if no guide prompt is active
        trendResearchPrompt += `\n\nCRITICAL: Filter trends through a SCANDINAVIAN MINIMALISM lens - we want Nordic-appropriate trends only (natural tones, clean lines, quality fabrics).`
      }

      const { text: researchText } = await generateText({
        model: createMayaOpenRouterModel("chat_pro"),
        messages: [
          {
            role: "user",
            content: trendResearchPrompt,
          },
        ],
        temperature: 0.7,
      })

      trendResearch = researchText
      console.log("[v0] Trend research complete")
    }

    let trendFilterInstruction = ""
    if (trendResearch) {
      // 🔴 CRITICAL: If guide prompt is active, don't apply Scandinavian defaults
      // Guide prompts are explicit user instructions that take absolute priority
      if (detectedGuidePrompt) {
        // Guide prompt is active - use trends as inspiration only, don't override guide prompt
        trendFilterInstruction = `Use these trends as general inspiration only. The guide prompt's aesthetic, colors, and styling take absolute priority - do not filter or modify them.`
      } else if (wantsNonScandi) {
        // User explicitly wants non-Scandinavian aesthetic - respect their choice
        const aestheticName = userAestheticLower || "the requested"
        trendFilterInstruction = `Use these insights to inform your concept creation, filtered through ${aestheticName} aesthetic.`
      } else if (wantsScandinavian) {
        // User explicitly wants Scandinavian - apply filter
        trendFilterInstruction = `Use these insights to inform your concept creation, filtered through Scandinavian minimalism (natural tones, clean lines, quality).`
      } else {
        // Default: Scandinavian minimalism (beautiful default aesthetic)
        // BUT: Only if no guide prompt is active
        trendFilterInstruction = `Use these insights to inform your concept creation, but ALWAYS filter through Scandinavian minimalism (natural tones, clean lines, quality) as the default aesthetic.`
      }
    }

    const conversationContextSection = conversationContext
      ? `
=== CONVERSATION CONTEXT ===
Here's what we've been discussing. Use this to understand what the user wants MORE of or to continue the creative direction:

${conversationContext}

IMPORTANT: 
- If the user says "more of this", "similar to before", "like the last ones" - create variations on the themes/styles discussed above
- If previous concepts were about a specific aesthetic (G-Wagon, moody, editorial, etc.) - continue with that vibe
- Reference what Maya described in her previous responses for styling continuity
===
`
      : ""

    // CRITICAL: Detect workflow type in Studio Pro mode
    let workflowType: string | null = null
    let isCarouselRequest = false
    let slideCount: number | null = null
    
    if (studioProMode) {
      try {
        const { detectStudioProIntent } = await import("@/lib/maya/studio-pro-system-prompt")
        // userRequestLower already declared above, reuse it
        const conversationContextLower = (conversationContext || "").toLowerCase()
        const combinedRequest = `${userRequest || ""} ${conversationContext || ""}`.toLowerCase()
        
        // Detect workflow type using the same logic as Maya chat
        const workflowIntent = detectStudioProIntent(combinedRequest)
        workflowType = workflowIntent.mode || null
        
        // Legacy carousel detection (for backward compatibility)
        isCarouselRequest = workflowType === "carousel-slides" ||
          /carousel|multi.*slide|multiple.*slide|slide.*post|carousel.*post|multi.*image|several.*slide/i.test(userRequestLower) ||
          /carousel|multi.*slide|multiple.*slide/i.test(conversationContextLower)
        
        slideCount = isCarouselRequest 
          ? (() => {
              // Extract slide count from various patterns, handling 0 as a valid value
              const slideMatch = userRequestLower.match(/(\d+)\s*(?:slide|page)/i)?.[1]
              const partMatch = userRequestLower.match(/(\d+)\s*(?:part|step)/i)?.[1]
              const imageMatch = userRequestLower.match(/(\d+)\s*(?:image|photo)/i)?.[1]
              
              // Try each pattern, using nullish coalescing to handle 0 correctly
              const slideNum = slideMatch != null ? parseInt(slideMatch, 10) : null
              const partNum = partMatch != null ? parseInt(partMatch, 10) : null
              const imageNum = imageMatch != null ? parseInt(imageMatch, 10) : null
              
              // Return first valid number (not null and not NaN), or default to 5
              return (slideNum != null && !isNaN(slideNum)) ? slideNum :
                     (partNum != null && !isNaN(partNum)) ? partNum :
                     (imageNum != null && !isNaN(imageNum)) ? imageNum :
                     5
            })()
          : null
      } catch (importError) {
        console.error("[v0] Error importing detectStudioProIntent:", importError)
        // Fallback to basic carousel detection
        isCarouselRequest = /carousel|multi.*slide|multiple.*slide|slide.*post|carousel.*post|multi.*image|several.*slide/i.test(userRequestLower) ||
          /carousel|multi.*slide|multiple.*slide/i.test((conversationContext || "").toLowerCase())
        
        // Fallback: use default of 5 slides if carousel detected but no count specified
        slideCount = isCarouselRequest ? 5 : null
      }
    }
    
    console.log("[v0] Workflow detection:", {
      workflowType,
      isCarouselRequest,
      slideCount,
      userRequest: userRequest?.substring(0, 100),
      conversationContext: conversationContext?.substring(0, 100),
      studioProMode
    })

    // Get unified Maya system prompt with mode-specific adapters
    const config = studioProMode ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
    const baseSystemPrompt = getMayaSystemPrompt(config)


    // Get user context before building prompt (async call must be outside template string)
    const userContext = await getUserContextForMaya(authUser.id)

    // Build the unified system prompt with examples and task
    const isProMode = studioProMode
    const conceptPrompt = `${baseSystemPrompt}

---

## PERFECT EXAMPLES

These examples teach you the STRUCTURE and STYLE, not formulas to copy.
Use them as inspiration to create fresh, unique prompts for this specific user.

${isProMode ? getNanoBananaPerfectExamples() : getFluxPerfectExamples()}

---

## YOUR TASK

The user requests: "${userRequest}"

${userContext}

**Generate 3-6 diverse concept cards** (you decide the right number).

${!isProMode ? `
**CRITICAL - CLASSIC MODE (CUSTOM FLUX LoRA):**

Every concept \`prompt\` is **one FLUX-ready string**: **trigger token once** at the start (\`${triggerWord},\`), then **1–2 short paragraphs of storytelling prose** that weave scene, outfit, pose, light, camera, palette, and mood - see FLUX PROMPTING MASTERY below.

❌ **Do NOT** output \`[TRIGGER WORD]\`, \`[SCENE]\`, \`[CAMERA]\`, or any \`[ALL CAPS]\` labels - those are **planning aids only**, never user-facing prompt text.
❌ **Do NOT** repeat the trigger token, gender/ethnicity, or the same camera line twice.
❌ **Do NOT** use legacy one-liners that are only \`IMG_XXXX.HEIC\` tags.
✅ **Do** write **~90–150 words** of vivid, non-repetitive narrative after the trigger comma.

**Pose / expression:** Simple natural actions (no big smile / laughing; avoid cramped limb poses). LoRA carries likeness; your story carries place, styling, and light.
` : ''}

**Variety Checklist:**
✓ Different style categories (luxury, athletic, cozy, etc.)
✓ Different locations (home, café, street, studio)
✓ Different outfits and color palettes
✓ ${isProMode ? 'Different photography types (iPhone selfie/candid/editorial)' : 'Different lighting conditions'}

Remember: Create what feels RIGHT for this user, not formulaic prompts.

---

${
  studioProMode
    ? `=== STUDIO PRO MODE - REFERENCE ATTACHMENT ONLY ===

**🔴 CRITICAL - Hair Description Rules:**
- Maya CAN describe hair - she is NOT limited from describing hair
- Maya should ONLY describe hair if she KNOWS it from:
  * User's physical preferences (model settings) - if user specified hair color/style, ALWAYS include it
  * Previous conversations - if user mentioned their hair in the conversation, you can reference it
- Maya should NEVER assume hair color or length if she doesn't know it
- If user preferences mention hair → ALWAYS include it
- If user mentioned hair in conversation → you can include it
- If you DON'T know the hair color/length → DO NOT assume or guess - just omit hair description or use generic terms like "styled hair" or "hair styled naturally"
- NEVER assume or specify physical characteristics like ethnicity or body type (unless from user preferences or conversation)

**ALWAYS reference the attachment/reference image instead:**

✅ CORRECT FORMAT (MUST INCLUDE BRAND NAME WHEN DETECTED):
- "Vertical 2:3 photo in UGC influencer style from Alo captured in movement. Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo."
- "Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo. [Brand name] brand outfit clearly visible with subtle logo integration."
- "Woman with athletic, slim and defined body, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo. Wearing [Brand name] outfit..."

**Brand Name Inclusion:**
When user requests a specific brand (Alo, Lululemon, Chanel, Dior, Glossier, etc.):
- Always mention the brand name in the prompt
- Include brand in opening line or early in the prompt (e.g., "from Alo", "Alo brand outfit", "official campaign of the ALO brand")
- Use brand-specific language (e.g., "Alo Yoga aesthetic", "Chanel editorial style", "Glossier clean girl vibe")

❌ WRONG FORMAT (NEVER DO THIS):
- "A White woman, long dark brown hair" (assuming characteristics)
- "A woman with brown hair" (assuming hair color)
- "Athletic woman" (assuming body type without reference)
- "Woman in cream sports bra..." (missing brand name when user asked for Alo)

**CONCRETE EXAMPLES:**

❌ WRONG (what you're currently generating):
"A White woman, long dark brown hair, in a cream ribbed sports bra and matching high-waisted leggings, standing in a bright minimal yoga studio..."

✅ CORRECT (what you should generate when user asks for Alo):
"Vertical 2:3 photo in UGC influencer style from Alo captured in movement. Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. In a cream ribbed Alo sports bra and matching high-waisted leggings, standing in a bright minimal yoga studio. Alo brand outfit clearly visible with subtle logo integration."

❌ WRONG (missing brand):
"Woman with athletic build, wearing outfit..."

✅ CORRECT (with brand):
"Woman with athletic, slim and defined body, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo. Wearing Alo Yoga monochromatic athletic wear with subtle Alo logo visible."

**The user's reference image contains ALL physical characteristics. Your job is to reference it, not assume them.**

**ONLY describe changeable elements:** styling, pose, lighting, environment, makeup, expressions, outfits.

**🔴 CRITICAL - SSELFIE DESIGN SYSTEM AESTHETIC:**
Every prompt must embody SSELFIE's visual identity:
- **Clean:** Minimal clutter, clear composition, organized elements
- **Feminine:** Soft luxury, elegant lines, graceful poses, refined styling
- **Modern:** Current fashion trends, contemporary settings, fresh aesthetic
- **Minimal:** Focused details, intentional elements, no excess
- **Social-Media Friendly:** Pinterest-worthy, Instagram-optimized, scroll-stopping quality

**Avoid boring, basic, or generic concepts.** Every prompt should be dynamic, detailed, and production-quality with:
- Specific brand names (Alo, Lululemon, Chanel, etc.)
- Detailed pose descriptions with body language
- Specific lighting (golden hour, soft diffused, natural daylight, etc.)
- Detailed environments (specific locations, architectural details, atmospheric elements)
- Makeup and hair styling details
- Specific camera specs (35mm, 50mm, 85mm, f/2.8, etc.)
- Current fashion trends and Pinterest/Instagram influencer aesthetics

===
`
    : ""
}

${
  trendResearch
    ? `
=== CURRENT INSTAGRAM TRENDS (Jan 2025) ===

${trendResearch}

${trendFilterInstruction}
===
`
    : ""
}

${detectedGuidePrompt ? `\n**Guide Prompt Priority:**
When a user provides an exact guide prompt, it takes absolute priority:
- Use the guide prompt exactly for concept #1
- Create variations (concepts 2-6) that maintain the same outfit, location, and lighting
- Only vary poses, angles, moments, and expressions
- Ignore all other instructions when a guide prompt is active


**Concept #1:** Use this exact prompt:
"${detectedGuidePrompt}"

**Concepts #2-6:** Create variations that maintain EXACTLY:
- The EXACT same outfit from the guide prompt (same pajamas, same dress, same everything - DO NOT change)
- The EXACT same hair styling from the guide prompt (same bun, same bow, same hairstyle - DO NOT change)
- The EXACT same location/scene from the guide prompt (same room, same tree, same setting - DO NOT change)
- The EXACT same lighting style from the guide prompt (same light source, same mood - DO NOT change)
- The EXACT same camera specs from the guide prompt (same lens, same settings - DO NOT change)

Vary ONLY: poses, angles, moments, expressions, and actions (what they're doing).

**Important:** Ignore any instructions below about varying outfits, Scandinavian defaults, or template examples. The guide prompt is what the user wants - respect it completely.

===\n\n` : ""}
${conversationContextSection}
${fashionIntelligence}

${
  lifestyleContext
    ? `
=== LIFESTYLE CONTEXT: WHAT THIS REALLY MEANS ===

The user said "${userRequest}" - here's what they ACTUALLY want:

${lifestyleContext}

This is the vibe check. Don't just read these - embody them in your outfit choices, location selection, and mood. This is what makes concepts feel authentic and Instagram-worthy.
===
`
    : ""
}

=== INSTAGRAM LOCATION INTELLIGENCE (REFERENCE) ===
Use this as inspiration for diverse, Instagram-worthy locations. These are examples to spark creativity:

${INSTAGRAM_LOCATION_INTELLIGENCE}

**IMPORTANT:** This is REFERENCE MATERIAL for inspiration. Maya generates diverse locations naturally based on context - she does NOT randomly select from this list.
===

${
  studioProMode && !detectedGuidePrompt
    ? `=== 🔴 CRITICAL: SCENE DIVERSITY & CREATIVITY (STUDIO PRO MODE) ===

**YOU MUST CREATE DIVERSE, INTERESTING SCENES - NO BORING GENERIC REPETITION**

❌ **NEVER USE THESE BORING, GENERIC SCENES:**
- Kitchen (boring, overused)
- Bedroom (boring, overused)
- Reading corner (boring, overused)
- Generic living room
- Plain bathroom
- Basic office
- Simple cafe (unless specifically requested)

✅ **INSTEAD, USE YOUR INTELLIGENCE & TEMPLATES TO CREATE DIVERSE, CREATIVE SCENES:**

**For each of your ${count} concepts, you MUST use a DIFFERENT, INTERESTING scene from your location intelligence:**

**Urban European Chic:**
- Parisian cafe with vintage bistro chairs and marble tables
- Cobblestone street in Montmartre with ivy-covered walls
- Ornate Parisian balcony with wrought iron railings
- European flower market with colorful blooms and crates
- Vintage Parisian bookshop with stacked leather-bound books
- Parisian bakery window with golden pastries displayed
- European arcade with arched ceiling and boutique windows
- Parisian metro platform with vintage tile work
- French patisserie counter with macarons and cakes
- European plaza with fountain and historic architecture

**New York City Energy:**
- Manhattan rooftop terrace with skyline views
- SoHo cast-iron building facade with fire escapes
- West Village brownstone stoop with leafy trees
- Brooklyn Bridge walking path with cables overhead
- Central Park Bow Bridge with autumn foliage
- NYC yellow taxi cab as backdrop
- Times Square light reflections on wet pavement
- High Line elevated park with urban greenery
- Manhattan street corner bodega exterior
- Williamsburg brick wall with street art

**Los Angeles Sunshine:**
- Malibu beach club with white cabanas
- Venice Beach boardwalk with palm trees
- Beverly Hills hotel palm tree driveway
- Silver Lake hillside overlook at sunset
- Santa Monica Pier with ferris wheel
- LA Arts District colorful mural wall
- Rodeo Drive luxury storefront window
- Hollywood Hills infinity pool with view
- LA rooftop bar with string lights
- Venice canals wooden bridge

**Luxury & High-End Settings:**
- Five-star hotel grand staircase with chandelier
- Luxury boutique dressing room with velvet curtains
- Private yacht deck with ocean views
- High-end spa relaxation lounge
- Designer flagship store interior with minimal displays
- Upscale wine bar with dim ambient lighting
- Penthouse balcony with panoramic views
- Country club tennis court with white fencing
- Luxury car interior (leather and wood details)
- Private jet cabin interior

**Artsy & Cultural Spots:**
- Contemporary art museum with white walls
- Vintage movie theater lobby with red carpet
- Art gallery opening with artwork visible
- Street art alley with colorful murals
- Independent bookstore with wooden shelves
- Jazz club with intimate stage lighting
- Photography studio with white seamless backdrop
- Craft market booth with handmade goods
- Modern sculpture garden
- Historic library reading room

**Unique & Memorable Settings:**
- Vintage phone booth (London red or classic)
- Neon sign at night (custom text or retro)
- Classic car exterior (vintage convertible)
- Train station platform with departure board
- Airport lounge with modern seating
- Hotel elevator mirror selfie
- Parking garage with concrete and lighting
- Greenhouse with tropical plants
- Flower wall installation (events/pop-ups)
- Mirror maze or infinity room

**Rules:**
1. Each concept must use a different scene - no repetition across your ${count} concepts
2. Be specific - don't say "cafe", say "Parisian cafe with vintage bistro chairs and marble tables"
3. Use your templates - reference the location examples above, don't default to boring generic scenes
4. Match the theme - if user asks for "brunch", use diverse brunch locations (rooftop, garden, Parisian cafe, etc.) - not the same kitchen/bedroom
5. Be creative - think like a fashion photographer shooting for Vogue - every scene should be Instagram-worthy and visually interesting
6. Avoid repetition - if you used "kitchen" in concept 1, you cannot use kitchen, bedroom, or reading corner in concepts 2-${count}

**EXAMPLES OF CORRECT DIVERSITY:**

User asks for "morning routine":
✅ Concept 1: "Parisian balcony with wrought iron railings, morning light streaming through"
✅ Concept 2: "Modern minimalist bathroom with brass fixtures and marble, natural window light"
✅ Concept 3: "Rooftop terrace with city views, golden hour morning glow"
✅ Concept 4: "Vintage bookshop with floor-to-ceiling shelves, soft morning light"
✅ Concept 5: "European flower market with colorful blooms, fresh morning energy"
✅ Concept 6: "High-end spa relaxation lounge, serene morning atmosphere"

❌ WRONG (boring repetition):
❌ Concept 1: "Kitchen"
❌ Concept 2: "Bedroom"
❌ Concept 3: "Reading corner"
❌ Concept 4: "Kitchen again"
❌ Concept 5: "Bedroom again"

**Remember: You're creating Instagram-worthy content, not boring lifestyle photos. Every scene should feel like it could be in a fashion magazine.**
===
`
    : ""
}

USER REQUEST: "${userRequest}"
${aesthetic ? `AESTHETIC VIBE: ${aesthetic}` : ""}
${context ? `ADDITIONAL CONTEXT: ${context}` : ""}
${referenceImages?.userDescription ? `USER'S IMAGE INSTRUCTIONS: "${referenceImages.userDescription}" - Incorporate this guidance naturally into the concepts.` : ""}
${conceptPromptText ? `\n${shouldPrioritizeUserRequest ? `🔴 SELECTED CONCEPT (USE AS INSPIRATION/GUIDANCE - USER HAS REQUESTED SOMETHING DIFFERENT):\n"${conceptPromptText}"\n\n**CRITICAL:** The user has explicitly requested something different in their message ("${userRequest}"). **PRIORITIZE their explicit request** over this pre-selected concept. Use this concept as inspiration/guidance only if it aligns with what the user is asking for. The user's words in their request take precedence.\n` : `🔴🔴🔴 CRITICAL: SELECTED CONCEPT REQUIREMENT (MANDATORY - MUST BE INCLUDED IN EVERY PROMPT):\n"${conceptPromptText}"\n\n**YOU MUST incorporate ALL elements from this concept into your prompts. This is the user's explicit choice and must be reflected in every concept card you create.**\n`}` : ""}

${
  detectedGuidePrompt
    ? `🔴🔴🔴 CRITICAL: GUIDE PROMPT VARIATIONS MODE - ANIMATION/VIDEO EDITING USE CASE

**USER INTENT:** Users create these 6 concept cards to animate them together into a complete video. They need CONSISTENT styling across all cards so the images can be seamlessly edited together.

**MANDATORY - PRESERVE EXACTLY (DO NOT CHANGE):**
- ✅ The EXACT same outfit/clothing from the guide prompt (same pajamas, same dress, same everything)
- ✅ The EXACT same hair styling from the guide prompt (same bun, same bow, same hairstyle)
- ✅ The EXACT same location/scene from the guide prompt (same room, same tree, same setting)
- ✅ The EXACT same lighting from the guide prompt (same light source, same mood)
- ✅ The EXACT same camera specs from the guide prompt (same lens, same settings)

**ONLY VARY (DIFFERENT ACTIONS/POSES):**
- ✅ Different poses (standing, sitting, leaning, walking, etc.)
- ✅ Different actions (holding different items, different hand positions)
- ✅ Different expressions (smile, thoughtful, confident, etc.)
- ✅ Different angles (front view, side view, three-quarter view)
- ✅ Different moments (checking phone, reading, looking away, etc.)

**NANO BANANA BEST PRACTICE:**
- Use EXACT same descriptive phrases for preserved elements (outfit, hair, scene, lighting)
- Be EXPLICIT: The variation prompts explicitly preserve outfit, hair, scene, and lighting from the guide prompt
- Only the pose/action/angle/expression changes - everything else stays exactly the same

**CRITICAL RULES:**
- ❌ DO NOT change the outfit (if guide prompt says "candy cane striped pajamas", ALL 6 cards must have "candy cane striped pajamas")
- ❌ DO NOT change the hair (if guide prompt says "chic bun with red velvet bow", ALL 6 cards must have "chic bun with red velvet bow")
- ❌ DO NOT change the location (if guide prompt says "sofa with Christmas tree", ALL 6 cards must have "sofa with Christmas tree")
- ❌ DO NOT change the lighting (if guide prompt says "warm golden lighting", ALL 6 cards must have "warm golden lighting")
- ✅ DO change what they're DOING (different poses, different actions, different expressions)

**EXAMPLE:**
Guide prompt: "Candy cane striped pajamas, chic bun with red velvet bow, sitting on sofa with Christmas tree, warm golden lighting, holding hot chocolate"

✅ CORRECT variations:
- Card 2: Same pajamas, same bun, same sofa/tree, same lighting, but STANDING and holding phone
- Card 3: Same pajamas, same bun, same sofa/tree, same lighting, but LEANING and looking at tree
- Card 4: Same pajamas, same bun, same sofa/tree, same lighting, but WALKING toward tree

❌ WRONG variations:
- Card 2: Different pajamas (cream cashmere) - NO! Must be same candy cane pajamas
- Card 3: Different hair (loose waves) - NO! Must be same bun with bow
- Card 4: Different location (fireplace) - NO! Must be same sofa with tree

Create ${count} variations that maintain EXACT styling consistency for video editing.`
    : mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - Create ${count} variations of ONE cohesive look (same outfit and location, different poses/angles/moments)`
    : `MODE: CONCEPTS - Create ${count} THEMATICALLY CONSISTENT concepts that ALL relate to the user's request

**VARIETY GUIDANCE:**
The user wants VARIETY across concepts:
- Create DIFFERENT outfits for each concept (different styles, brands, colors)
- Create DIFFERENT locations and settings
- Vary poses, angles, lighting, and moods
- Think: "diverse portfolio of looks"
Example: Concept 1 might be athletic wear at yoga studio, concept 2 might be luxury pieces at rooftop, etc.

**CRITICAL: OUTFIT VARIATION RULE - DEFAULT BEHAVIOR (ONLY WHEN NOT USING GUIDE PROMPT):**
- **This rule ONLY applies when there is NO guide prompt**
- **If guide prompt is active:** Use the EXACT same outfit, hair, location, lighting from guide prompt (see guide prompt section above)
- **DEFAULT BEHAVIOR (NO guide prompt):** Each concept MUST have a DIFFERENT, UNIQUE outfit that fits the theme
- **ONLY use the SAME outfit across all concepts if:** User EXPLICITLY asks for "same outfit", "same look", "cohesive story", "consistent outfit", "one outfit", "carousel", or "photoshoot"
- **If user did NOT explicitly request same outfit:** You MUST create DIFFERENT outfits for each concept
- **Example (NO guide prompt, NO explicit same outfit request):** If creating 6 airport travel concepts, use DIFFERENT outfits:
  • Concept 1: "cream cashmere turtleneck and tailored trousers"
  • Concept 2: "oversized blazer with fitted tank and leather trousers"  
  • Concept 3: "chunky sweater with wide-leg pants"
  • Concept 4: "silk blouse with high-waisted jeans"
  • Concept 5: "knit cardigan with matching set"
  • Concept 6: "trench coat with tailored dress"
- **Vary:** Outfits, scenes, poses, lighting, and locations - create diverse, interesting concepts
- **This creates variety** - like a real influencer showing different looks in different settings
- **REMEMBER:** Same outfit = ONLY if user explicitly asks. Otherwise = DIFFERENT outfits for each concept.`
}

=== THEMATIC CONSISTENCY ===

Your ${count} concepts MUST ALL stay within the theme/vibe of "${userRequest}".

Examples of CORRECT thematic consistency:
- User asks for "Brunch date look" → ALL ${count} concepts are brunch-related:
  • Outdoor café brunch with pastries
  • Rooftop brunch with champagne
  • Cozy indoor brunch spot
  • Garden brunch setting
  • etc.

- User asks for "Luxury lifestyle" → ALL ${count} concepts are luxury-focused:
  • Designer hotel lobby
  • Private rooftop terrace
  • Luxury car setting
  • High-end restaurant
  • etc.

- User asks for "Coffee run" → ALL ${count} concepts include coffee/café elements:
  • Walking with coffee cup downtown
  • Inside modern café
  • Coffee shop window seat
  • Outdoor café table
  • etc.

- User asks for "Street style" → ALL ${count} concepts are urban/street:
  • City sidewalk moment
  • Urban alleyway
  • Street crossing
  • City park bench
  • etc.

❌ WRONG: Creating random variety (1 brunch, 1 gym, 1 street, 1 luxury) when user asked for ONE theme
✅ RIGHT: Creating ${count} variations WITHIN the requested theme

The user wants to tell a COHESIVE STORY across all ${count} images, not a random collection.

${
  imageAnalysis
    ? `🔴 REFERENCE IMAGE ANALYSIS (MANDATORY - RECREATE THIS EXACT VIBE):
${imageAnalysis}

CRITICAL INSTRUCTIONS FOR REFERENCE IMAGES:
- If the user explicitly requests BLACK & WHITE or MONOCHROME → EVERY prompt MUST include "black and white" or "monochrome" - this is MANDATORY
- If the reference image is a STUDIO shot → Use "studio lighting" or "professional studio lighting" - NOT "uneven natural lighting" or "iPhone"
- If the reference image is EDITORIAL/HIGH-FASHION → Use professional camera specs, dramatic lighting, NOT "shot on iPhone" or "amateur cellphone photo"
- If the reference image shows professional photography → Use "shot on professional camera" or "DSLR" - NOT "shot on iPhone 15 Pro"
- The user's explicit request (B&W, studio, editorial) OVERRIDES default requirements
- Match the EXACT lighting style, color treatment, and camera quality shown in the reference image
- If user explicitly requests B&W → DO NOT add "muted colors" - use "black and white" or "monochrome" instead
- If reference is studio → DO NOT add "uneven natural lighting" - use the studio lighting style shown
- If reference is editorial → DO NOT add "candid photo" or "amateur cellphone photo" - use professional photography terms

Capture this EXACT vibe - the styling, mood, lighting, color treatment, and composition must match the reference image.`
    : ""
}

${
  templateExamples.length > 0 && studioProMode && !detectedGuidePrompt
    ? `
=== OPTIONAL TEMPLATE EXAMPLES (FOR INSPIRATION ONLY) ===

**These example prompts are provided as optional inspiration. Use them to understand style and format, but feel free to be creative and adapt based on the user's request.**

**Template Examples (${templateExamples.length} examples):**
${templateExamples.map((ex, i) => `**Example ${i + 1}:**
${ex}
---`).join('\n\n')}

**Note:** These examples are for inspiration only. Your primary guide is the user's request above. Feel free to adapt, modify, or create something different if it better serves the user's needs.
`
    : ""
}

${
  studioProMode
    ? `=== YOUR NANO BANANA PRO PROMPTING MASTERY ===

${getNanoBananaPromptingPrinciples()}

**YOUR CRAFTED NANO BANANA PRO PROMPT:**

You MUST generate prompts following the EXACT structure shown in these perfect examples.

${getNanoBananaPerfectExamples()}

**CRITICAL PROMPT STRUCTURE - FOLLOW THIS EXACT FORMAT:**

**OPENING LINE (Always start with this format):**
[IMAGE TYPE] + [STYLE REFERENCE] of a woman, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

**IMAGE TYPE OPTIONS:**
- High fashion portrait
- Editorial fashion portrait
- Lifestyle fashion portrait
- Street style editorial
- Timeless fashion portrait

**STYLE REFERENCE OPTIONS:**
- Influencer/Pinterest style
- Editorial fashion magazine style
- Street style blogger aesthetic
- Luxury brand campaign style
- Modern minimalist fashion style
- Parisian chic style
- It-girl aesthetic
- Athletic influencer aesthetic
- Urban fashion blogger aesthetic

**THEN CONTINUE WITH:**

1. **[MAIN GARMENT/OUTFIT DETAILS]**
   - Describe outfit with EXTREME detail: specific brands (use your fashion knowledge), materials, textures, how garments fall/fit
   - Use your intelligence to select appropriate brands based on context - do NOT use generic templates

2. **[HAIR STYLING]**
   - Describe hair with PRECISION: part type, texture, shine level, exact styling method

3. **[ACCESSORIES & JEWELRY]**
   - List ALL accessories: eyewear, jewelry (metals, styles), bags with specific details

4. **[EXPRESSION & POSE]**
   - Specify expression AND pose: facial expression, head position, lip/mouth details, attitude

5. **Lighting: [TECHNICAL LIGHTING SPECS]**
   - Include technical lighting: light source, angle, shadows, how it affects skin/materials
   - Always start with "Lighting: " then describe

6. **Aesthetic: [OVERALL VIBE + BRAND IDENTITY + ENERGY]**
   - End with aesthetic description: luxury level + brand identity + attitude/energy + style category
   - Always start with "Aesthetic: " then describe

**FORMAT RULES:**
- Length: 150-200 words
- Natural flowing description - NO bullet points, NO ** sections, NO "Note:" additions
- DO NOT add: "Professional editorial photography", "Pinterest-style editorial portrait", or "Character consistency with provided reference images" - these are NOT in the examples

**🔴🔴🔴 CRITICAL VARIETY REQUIREMENT - THIS IS MANDATORY:**
- Each of the ${count} concepts MUST be COMPLETELY DIFFERENT - think of ${count} distinct fashion scenarios
- Concept 1: Different brand + different outfit + different scene + different aesthetic
- Concept 2: DIFFERENT brand + DIFFERENT outfit + DIFFERENT scene + DIFFERENT aesthetic  
- Concept 3: DIFFERENT brand + DIFFERENT outfit + DIFFERENT scene + DIFFERENT aesthetic
- And so on for ALL ${count} concepts

**YOU MUST VARY EVERYTHING:**
- Outfits: Different brands (mix them up - don't repeat the same brand), different colors, different styles, different materials
- Hair styling: Different part, different texture, different styling method
- Locations/scenes: Different settings (don't repeat minimalist apartment - vary between street, studio, outdoor, etc.)
- Lighting styles: Different light sources, different times of day, different moods
- Poses/expressions: Different poses, different expressions, different energy
- Aesthetic vibes: Different luxury levels, different brand identities, different attitudes

**DO NOT REPEAT:**
- Same brand across concepts (if Concept 1 uses a specific brand, Concept 2 MUST use a different brand)
- Same location/scene across concepts (if Concept 1 is minimalist apartment, Concept 2 MUST be different)
- Same outfit style across concepts (if Concept 1 is quiet luxury, Concept 2 MUST be different aesthetic)
- Same hair styling across concepts
- Same lighting style across concepts

**THINK LIKE A FASHION EDITOR:**
- Each concept is a DIFFERENT editorial spread
- Each concept showcases a DIFFERENT brand/style/aesthetic
- Each concept is a COMPLETELY SEPARATE fashion moment
- Variety makes the concepts valuable - sameness makes them useless

**GENERATE ${count} COMPLETELY UNIQUE PROMPTS NOW - each one MUST be DISTINCT from all others.**
`
    : `=== YOUR FLUX PROMPTING MASTERY FOR CLASSIC MODE ===

Classic (custom LoRA) prompts read like **short scene writing**, not labeled spec sheets. The rulebook below is authoritative.

${getFluxPromptingPrinciples()}

---

## CLASSIC CONCEPT CARDS - OUTPUT CONTRACT

Each concept \`prompt\` = **\`${triggerWord},\` + storytelling body** (one flowing paragraph or two tight paragraphs). **No** \`[BRACKET]\` section headers in the string.

**Gender / ethnicity / physical preferences:** Fold into the narrative **once** each where needed; convert instruction phrasing per PHYSICAL PREFERENCES rules - never strip user intent.

**Length:** **90–150 words** after the trigger comma. Thin, repetitive drafts are invalid - add **new** sensory detail instead of restating the same clause.

**Hard reject:** Any literal \`[SCENE]\`, \`[CAMERA]\`, etc.; trigger token appearing twice; duplicate gender line; same camera specs repeated; keyword list then paraphrased list.

Before returning JSON, re-read the FLUX quality checklist (story flow + no duplicates + no labels).`
}

=== RULES FOR THIS GENERATION ===

${
  !studioProMode ? `
🔴 CLASSIC MODE SPECIFIC RULES:

**TRIGGER TOKEN:** "${triggerWord}," **once** at the very start of every \`prompt\`.
**GENDER:** "${userGender}"
${userEthnicity ? `**ETHNICITY:** "${userEthnicity}" - mention **at most once** in the narrative if needed.` : ''}
${physicalPreferences ? `**PHYSICAL PREFERENCES:** "${physicalPreferences}" - weave into the story as description; never drop user intent.` : ''}

**FORMAT:** Storytelling prose only - **zero** \`[LABEL]\` lines.

**LENGTH CHECK:** ~90–150 words after the trigger comma; if short, deepen scene/outfit/light - do **not** repeat prior sentences.

**QUALITY CHECK:**
✅ No bracket tags in the output?
✅ Trigger exactly once?
✅ No duplicated gender/ethnicity/camera blocks?
✅ iPhone + candid rules satisfied once in the story (unless reference/user overrides)?
✅ No banned quality / studio / plastic-skin wording?

` : ''
}

**System Rules:**
- Include hair color/style as safety net guidance even if LoRA should know it - mention key features (hair color/style, distinctive traits) concisely as a safety net
- User's physical preferences from settings are mandatory - never remove them. If user specified "keep my natural hair color", convert to "natural hair color" (preserve intent)
${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt || undefined, templateExamples) ? `- Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed. Include natural skin texture with pores visible.` : `- Skin texture: Only include if specified in user prompt, guide prompt, or templates - do not add automatically.`}

TRIGGER WORD: "${triggerWord}"
GENDER: "${userGender}"
${userEthnicity ? `ETHNICITY: "${userEthnicity}" (MUST include in prompt for accurate representation)` : ""}
${
  physicalPreferences
    ? `
=== PHYSICAL PREFERENCES ===
"${physicalPreferences}"

**Instructions:**
- These are user-requested appearance modifications that should be in every prompt
- User's physical preferences from settings are mandatory - never remove them
- Convert instruction language to descriptive language for FLUX, but preserve user intent
- Remove instruction phrases: "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- Convert to descriptive: Convert to descriptive appearance features while preserving intent:
  - "natural features" → describe what they are
  - "natural hair color" → keep as "natural hair color" to preserve intent (don't just remove)
  - "keep my natural hair color" → Convert to "natural hair color" (preserve the intent, don't just omit)
  - "dont change the face" → keep as guidance, don't remove (face is preserved by trigger word, but user intent matters)
- Weave them into the **narrative body** after the trigger (Classic storytelling prompts), not as instruction prefixes
- Format: one natural sentence or clause that carries converted descriptors (e.g. natural hair color, body cues) alongside "${userGender}"${userEthnicity ? ` / ${userEthnicity} when relevant` : ""} - **once**, not repeated
- Examples of correct conversion:
  - "Always keep my natural features, dont change the face" → Keep as guidance, preserve any specific feature descriptions
  - "keep my natural hair color" → "natural hair color" (preserve intent, don't just omit)
  - "curvier body type" → "curvier body type" (descriptive, keep as-is)
  - "long blonde hair" → "long blonde hair" (descriptive, keep as-is)
  - "dont change my body" → preserve any body descriptions mentioned
- Preserve user intent: Don't just remove everything - convert instructions to descriptive language that preserves what the user wants. User's physical preferences are mandatory.
`
    : ""
}

**Requirements (every prompt must have):**

${
  studioProMode
    ? `1. **No trigger words** - Nano Banana Pro doesn't use LoRA trigger words
   - Never assume hair color, ethnicity, or body type
   - Always reference the attachment/reference image instead
   - Format: "Woman with athletic, slim and defined body, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo."
   - OR: "Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo."
   - Never write: "A White woman, long dark brown hair" or similar assumptions
   - Always write: "Woman, maintaining exactly the characteristics from Image 1" or "Maintain exactly the characteristics of the person in the attachment"`
    : `1. **Trigger line:** Start every Classic prompt with "${triggerWord}," then continue in **storytelling prose** - no \`[SECTION]\` labels, no second copy of the trigger.

   **Person / prefs:** Fold "${userGender}"${userEthnicity ? `, ${userEthnicity}` : ""}${physicalPreferences ? `, and converted physical preferences` : ""} into the narrative **once** using descriptive prose only.`
}

   **Character feature guidance:**
   ${
     studioProMode
       ? `- Studio Pro Mode - Reference attachment only:
   - Never assume or specify hair color, ethnicity, or body type
   - Always reference the attachment/reference image:
     - "Woman, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo."
     - "Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo."
   - Only describe changeable elements: styling, pose, lighting, environment, makeup, expressions
   - Never write: "long dark brown hair", "White woman", "athletic build" (these come from the reference image)
   - Always write: "maintaining exactly the characteristics from Image 1" or "maintaining exactly the characteristics of the woman in the attachment"`
       : `- 🔴 CRITICAL - Hair Description Rules:
   - Maya CAN describe hair - she is NOT limited from describing hair
   - Maya should ONLY describe hair if she KNOWS it from:
     * User's physical preferences (model settings) - if user specified hair color/style, ALWAYS include it
     * Previous conversations - if user mentioned their hair in the conversation, you can reference it
   - Maya should NEVER assume hair color or length if she doesn't know it
   - If user preferences mention hair → ALWAYS include it (e.g., "keep my natural hair color" → "natural hair color", "long blonde hair" → "long blonde hair")
   - If user mentioned hair in conversation → you can include it (e.g., user said "I have blonde hair" → you can say "blonde hair")
   - If you DON'T know the hair color/length → DO NOT assume or guess - just omit hair description or use generic terms like "styled hair" or "hair styled naturally"
   - User preferences are mandatory: If user specified hair/body/age in their physical preferences, these must be included in every prompt - they are intentional user modifications. Never remove them.
   - Focus on changeable elements: Prioritize describing styling, pose, lighting, environment, makeup, expressions:
     - "natural makeup" (makeup is changeable)
     - "relaxed expression" (expression is changeable)
     - "confident look" (mood is changeable)
   - Balance: Trust the LoRA but reinforce critical features (especially from user preferences) to ensure consistency.`
   }

   **Physical preferences conversion:** If physical preferences contain instruction language ("Always keep my", "dont change", "keep my"):
   - Remove the instruction phrases but preserve the intent
   - Convert to descriptive appearance features
   - If it says "keep my natural features" or "dont change the face" → Keep as guidance, don't remove (face is preserved by trigger word, but user intent matters)
   - If it says "keep my natural hair color" → Convert to "natural hair color" (preserve the intent, don't just remove)
   - Preserve user intent: Always include actual descriptive modifications like "curvier body type", "long blonde hair", "athletic build", "darker hair", etc.
   - Do not remove: User's physical preferences should be in the prompt as descriptive features, not instructions. User's physical preferences from settings are mandatory - never remove them.

2. **Camera Specs (CONDITIONAL - Based on Reference Image/User Request):**
   ${
     studioProMode
       ? `- **Nano Banana Pro:** Use professional photography descriptions
   - "Professional photography", "high-quality image", "editorial style"
   - NO iPhone/cellphone references (Nano Banana is professional quality)
   - Focus on composition and visual quality`
       : `- **IF reference image shows professional/studio/editorial OR user requests studio/magazine/editorial:** Use "shot on professional camera" or "DSLR" or "professional photography" - NOT iPhone
   - **IF no professional request AND no reference image:** Use "shot on iPhone 15 Pro portrait mode, shallow depth of field" OR "shot on iPhone, natural bokeh"
   - Keep it simple - NO complex technical details (no f-stops, ISO, focal lengths)`
   }

3. **Lighting (CONDITIONAL - Based on Reference Image/User Request):**
   - **IF reference image shows studio lighting OR user requests studio/editorial:** Use "studio lighting" or "professional studio lighting" or "dramatic studio lighting" - NOT "uneven natural lighting"
   - **IF reference image shows specific lighting style:** Match that EXACT lighting style from the reference
   - **IF no specific request AND no reference image:** Use authentic, realistic lighting descriptions that look like real phone photos:
     - ✅ "Uneven natural lighting"
     - ✅ "Mixed color temperatures"
     - ✅ "Natural window light with shadows"
     - ✅ "Overcast daylight, soft shadows"
     - ✅ "Ambient lighting, mixed sources"
   - ❌ NEVER use (unless reference image shows it): "soft afternoon sunlight", "warm golden hour lighting" (too idealized), "dramatic rim lighting", "cinematic quality", "perfect lighting", "soft diffused natural lighting"

4. **Natural Skin Texture (only if in user prompt, guide prompt, or templates, AND NOT in Studio Pro mode):** 
   ${
     shouldIncludeSkinTexture(userRequest, detectedGuidePrompt || undefined, templateExamples) && !studioProMode
       ? `- Include "natural skin texture with pores visible, not smooth or airbrushed, not plastic-looking, realistic texture"
   - Include natural imperfection phrases: "visible pores", "natural skin texture", "subtle imperfections", "not airbrushed", "not plastic-looking", "realistic texture", "organic skin texture"
   - Include anti-plastic phrases: "not smooth", "not airbrushed", "not plastic-looking", "realistic texture", "natural imperfections"
   - This prevents AI-looking, plastic images. Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed.`
       : `- Skip: Skin texture not found in user prompt, guide prompt, or templates - do not add skin texture requirements`
   }

5. **Film Grain and Color Treatment (CONDITIONAL - Based on User Request Only):**
   - **IF user explicitly requests B&W/monochrome:** MUST include "black and white" or "monochrome" - DO NOT add "muted colors"
   - **IF user requests vibrant/editorial colors:** Use appropriate color description (vibrant, editorial, etc.) - NOT "muted colors"
   - **IF no specific request:** Include "film grain" and "muted colors" for authentic iPhone aesthetic
   - **DO NOT add B&W based on reference image analysis - only if user explicitly requests it**
   ${enhancedAuthenticity && !studioProMode ? `
   - **ENHANCED AUTHENTICITY MODE (ON):** When this mode is enabled, you MUST include:
     * **More muted colors:** Use "heavily muted colors", "desaturated color palette", "muted tones" (stronger than normal)
     * **More iPhone quality:** Emphasize "amateur cellphone photo", "raw iPhone photo", "authentic iPhone camera quality"
     * **More film grain:** Use "visible film grain", "prominent film grain", "grainy texture" (stronger than normal)
     * These keywords help prevent plastic/fake-looking images by emphasizing authentic, phone-camera aesthetic
   ` : ''}
   - Classic prompts stay detailed in flowing prose (see 90–150 word substance after trigger)

6. **NO Natural Imperfections Lists:** Do NOT include lists of imperfections like "visible sensor noise", "slight motion blur", etc. Keep camera specs basic, but ALWAYS include natural skin texture requirements above.

11. **Prompt Length:** ${
  studioProMode
    ? `50-80 words (optimal for Nano Banana Pro - rich scene descriptions with detail)`
    : `90-150 words of storytelling prose after the trigger comma (no [LABEL] headers) for strong custom LoRA activation`
}

12. **NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed" - these cause plastic/generic faces and override the user LoRA.

${studioProMode ? `
9. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - use your knowledge to select appropriate brands based on context and aesthetic
` : `
10. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE
`}
11. Apply the EXPRESSION PRINCIPLE for authentic facial details (expressions, not fixed features)
12. Apply the POSE PRINCIPLE for natural body positioning
13. Apply the LOCATION PRINCIPLE for evocative settings
14. Apply the LIGHTING PRINCIPLE for realistic, authentic lighting (NO idealized terms)

**Text Overlay Rules:**
- Only include text overlays if: workflowType is "carousel-slides", "reel-cover", or "text-overlay"
- Do not include text overlays for: Regular concept cards, brand scenes, lifestyle photos, or any other content type
- If user did not specifically request carousel, reel cover, or text overlay: Do not add any text overlay section to your prompts
- Default behavior: Regular concept cards should not have text overlays - they are pure lifestyle/brand photos

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**

${
  templateExamples.length > 0 && studioProMode
    ? `**Template Examples Priority:**
- If you have template examples above, follow the template examples exactly
- The template examples override generic structure instructions
- Copy the structure, sections, and format from template examples
- Only use the generic structure below if no template examples were provided

`
    : ""
}

**Text Overlay Rules:**
- Only include text overlay section if: workflowType is "carousel-slides", "reel-cover", or "text-overlay"
- Do not include text overlay for: Regular concept cards, brand scenes (workflowType === "brand-scene"), lifestyle photos, or any default content
- If workflowType is null, undefined, or "brand-scene": Do not add any text overlay instructions - create pure lifestyle/brand photos
- Default concept cards should be pure lifestyle/brand photos without text overlays

${
  (workflowType === "carousel-slides" || isCarouselRequest) && studioProMode
    ? `**FOR CAROUSEL SLIDES - USE THIS STRUCTURE:**

1. **CHARACTER DESCRIPTION** (consistent across all slides):
   - **CRITICAL: NEVER assume hair color, ethnicity, or body type**
   - Start with: "Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo."
   - OR: "Maintain exactly the characteristics of the person in the attachment (face, body, skin tone, hair and visual identity). Do not copy the original photo."
   - Then describe: [outfit: material + color + garment type]
   - NO trigger words (Nano Banana Pro doesn't use LoRA)
   - **NEVER write:** "A White woman, long dark brown hair" - always reference the attachment instead

2. **SCENE DESCRIPTION**:
   - Pose/action (3-5 words)
   - Location/environment (3-5 words)
   - Lighting (professional, realistic - 3-6 words)

3. **TECHNICAL SPECS**:
   - "professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores"

4. **TEXT OVERLAY SECTION (MANDATORY - DETAILED):**
   - Text content (e.g., "10 things", "Slide 2: Key point")
   - Text placement (lower third, center-left, top, center)
   - Font size (120-180pt for titles, 40-60pt for subtitles, 35-45pt for body)
   - Font weight (bold for titles, regular for body)
   - Text color (specify or use brand primary color)
   - Background/overlay (semi-transparent dark overlay if busy, or clean white box)
   - Contrast requirements (minimum 4.5:1 ratio)
   - Readability requirement (readable at 400px width/thumbnail size)

5. **COMPOSITION & FORMAT:**
   - "Vertical 4:5 Instagram carousel format (1080x1350px)"
   - "Maintain visual consistency with other carousel slides"
   - "Subject positioned using rule of thirds"
   - "Minimum 15% white space reserved for text area"

**Total target: 80-120 words for carousel slides (includes detailed text overlay instructions)**
`
    : studioProMode
      ? `**STUDIO PRO (non-carousel, default concept cards):** Follow the Nano Banana Pro instructions in "YOUR NANO BANANA PRO PROMPTING MASTERY" above. No LoRA trigger token. No FLUX bracket layout. Keep prompts as natural-language photography briefs unless a workflow type adds overlays.`
      : `**CLASSIC / FLUX CUSTOM LoRA:** \`${triggerWord},\` then **storytelling prose** per FLUX PROMPTING MASTERY - **no** \`[SCENE]\`/\`[CAMERA]\` tags.

1. Trigger **once**, comma, then narrative
2. Gender, ethnicity, prefs woven **once** where needed
3. Rich place, outfit, light, and candid iPhone camera feel in flowing sentences (not duplicated)
4. Simple natural pose; no cramped / hidden-leg setups
5. Film grain / muted palette / mood woven in **once**
6. **No text overlay** for default concept cards

**Total target:** 90-150 words after the trigger comma.`
}

**If any requirement is missing, the prompt may produce AI-looking results.**

=== YOUR CREATIVE MISSION ===

You are NOT filling templates. You are SYNTHESIZING unique photographic moments by applying your fashion intelligence and prompting principles to this specific user request.

**🔴 CRITICAL: OUTFIT DIVERSITY (UNLESS USER EXPLICITLY ASKS FOR SAME OUTFIT):**
- **DEFAULT:** Each concept should have a DIFFERENT, UNIQUE outfit that fits the theme
- **ONLY use same outfit if:** User explicitly requested "same outfit", "same look", "cohesive", "carousel", or "photoshoot"
- **Think like a fashion stylist:** Each concept is a different look, different moment, different outfit
- **Variety is key:** Show different styling options within the theme - this is what makes concept cards valuable

For each concept:
- What would this SPECIFIC person wear in this SPECIFIC moment? (Use your fashion intelligence, not defaults)
- **Is this a DIFFERENT outfit from the other concepts?** (Unless user explicitly wants same outfit)
- What micro-expression captures the EMOTION of this scene?
- What lighting tells the STORY?
- What makes this feel like a REAL stolen moment, not a posed photo?

=== WORKFLOW-SPECIFIC INSTRUCTIONS ===

${
  workflowType === "carousel-slides" || isCarouselRequest
    ? `**CRITICAL: This is a CAROUSEL REQUEST - Each concept card represents ONE SLIDE of a multi-slide carousel.**

**CAROUSEL SLIDE REQUIREMENTS:**
- Each slide MUST include TEXT OVERLAY instructions
- Slide 1 (Cover): Large headline/title text in lower third or center-left
- Slides 2-${slideCount}: Content slides with numbered points or teaching text
- All slides must maintain character consistency across the carousel
- Text must be legible and readable at thumbnail size
- Include text placement, font size, and contrast instructions in each prompt

**CAROUSEL PROMPT STRUCTURE (MANDATORY - FOLLOW THIS EXACT FORMAT):**

Each carousel slide prompt MUST follow this complete structure:

**1. CHARACTER DESCRIPTION (consistent across all slides):**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit: material + color + garment type], [pose/action], [location/environment], [lighting description], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores."

**2. TEXT OVERLAY SECTION (REQUIRED - must be detailed):**
"**TEXT OVERLAY:** [Specify text content like '10 things' or 'Slide 2: Key point']. Text placement: [lower third OR center-left OR top OR center]. Font size: [120-180pt for titles, 40-60pt for subtitles]. Font weight: bold for titles, regular for body. Text color: [specify color or use brand primary color]. Background: [If background is busy, specify 'semi-transparent dark overlay rgba(0,0,0,0.6) behind text area with 12px rounded corners' OR 'clean white box with subtle drop shadow']. Text must have minimum 4.5:1 contrast ratio and be readable at 400px width (thumbnail size)."

**3. COMPOSITION & FORMAT:**
"Vertical 4:5 Instagram carousel format (1080x1350px). Maintain visual consistency with other carousel slides. Subject positioned using rule of thirds. Minimum 15% white space for text area."

**COMPLETE EXAMPLE FOR SLIDE 1 (Cover):**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. Wearing a sharp black blazer over a ribbed cream tank top with high-waisted black leather pants, standing confidently in a modern minimalist office space with venetian blind shadows creating lighting patterns across her face, slight confident smile while adjusting blazer lapel, professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores. 

**TEXT OVERLAY:** Large bold text '10 things' positioned in lower third (20% from bottom, left-aligned with 60px padding). Font size: 120-180pt equivalent, bold weight, color: #1A1A1A. Subtitle text 'I wish I knew before using AI' directly below main title, 40-60pt, same alignment. Semi-transparent dark overlay (rgba(0,0,0,0.6)) behind text area with 12px rounded corners and 30px padding. Text must have minimum 4.5:1 contrast ratio and be readable at 400px width (thumbnail size).

**Composition:** Vertical 4:5 Instagram carousel format (1080x1350px). Maintain visual consistency with other carousel slides. Subject positioned using rule of thirds. Minimum 15% white space reserved for text area."

**COMPLETE EXAMPLE FOR SLIDE 2 (Content):**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. Wearing [different outfit variation], [different pose/action], [complementary location], [consistent lighting style], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores.

**TEXT OVERLAY:** Numbered point '1. [Key teaching point]' positioned in top third (center or left-aligned). Font size: 80-100pt for number, 60-80pt for main point text. Font weight: bold for number, regular for text. Text color: #1A1A1A. Supporting text below (35-45pt, 2-3 lines max). Semi-transparent dark overlay (rgba(0,0,0,0.65)) behind text area with 16px rounded corners and 40px padding. Text must have minimum 4.5:1 contrast ratio and be readable at 400px width.

**Composition:** Vertical 4:5 Instagram carousel format (1080x1350px). Maintain visual consistency with cover slide. Same color palette and lighting quality. Subject positioned using rule of thirds. Minimum 15% white space reserved for text area.`
    : workflowType === "reel-cover"
    ? `**CRITICAL: This is a REEL COVER REQUEST - Each concept card represents a reel cover/thumbnail.**

**REEL COVER REQUIREMENTS:**
- Must be optimized for Instagram Reels (9:16 vertical format, 1080x1920px)
- Text must be LARGE and readable at thumbnail size (works as tiny thumbnail on grid)
- Title text should be 3-7 words max if possible
- Big readable type that works as a tiny thumbnail
- Safe zones respected (text not cut off by Instagram UI)
- Clean, feed-consistent look (not noisy)
- Subject should be clearly visible but text is primary focus

**REEL COVER PROMPT STRUCTURE (MANDATORY):**
1. **CHARACTER DESCRIPTION:**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit: material + color + garment type], [pose/action], [location/environment], [lighting description], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores."

2. **TEXT OVERLAY SECTION (REQUIRED):**
"**TEXT OVERLAY:** Title text '[Reel title - 3-7 words max]' positioned in [center OR top third OR lower third]. Font size: Very large (140-200pt equivalent), bold weight, high contrast color (white on dark background OR dark on light background). Text must be perfectly legible and readable at thumbnail size (should work as tiny thumbnail on grid). Safe zones: Keep text away from edges (60px minimum padding) to avoid Instagram UI cropping. Background: [If needed, specify semi-transparent overlay or solid color background for text readability]."

3. **COMPOSITION & FORMAT:**
"Vertical 9:16 Instagram reel format (1080x1920px). Optimized for thumbnail visibility. Subject positioned to allow text prominence. Clean, minimal design that works at small sizes."

**COMPLETE EXAMPLE:**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. Wearing a sharp black blazer over a ribbed cream tank top, standing confidently in a modern minimalist office space with venetian blind shadows, slight confident smile, professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores.

**TEXT OVERLAY:** Title text '10 Things I Wish I Knew' positioned in center of image. Font size: Very large (160pt equivalent), bold weight, white color on semi-transparent dark background (rgba(0,0,0,0.7)). Text must be perfectly legible and readable at thumbnail size (should work as tiny thumbnail on grid). Safe zones: 60px minimum padding from all edges to avoid Instagram UI cropping.

**Composition:** Vertical 9:16 Instagram reel format (1080x1920px). Optimized for thumbnail visibility. Subject positioned to allow text prominence. Clean, minimal design that works at small sizes.`
    : workflowType === "text-overlay"
    ? `**CRITICAL: This is a TEXT OVERLAY REQUEST - Each concept card should include prominent text overlay.**

**TEXT OVERLAY REQUIREMENTS:**
- Text must be clearly visible and readable
- Specify exact text content, placement, font size, and style
- Ensure high contrast for readability
- Text can be headline, quote, caption, or instructional text

**TEXT OVERLAY PROMPT STRUCTURE (MANDATORY):**
1. **CHARACTER DESCRIPTION:**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit: material + color + garment type], [pose/action], [location/environment], [lighting description], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores."

2. **TEXT OVERLAY SECTION (REQUIRED):**
"**TEXT OVERLAY:** [Specify text content]. Text placement: [center OR top OR bottom OR left OR right]. Font size: [Specify size - large for headlines, medium for quotes, smaller for captions]. Font weight: [bold OR regular OR italic]. Font style: [modern sans-serif OR elegant serif OR handwritten]. Text color: [specify color with high contrast]. Background: [If needed, specify overlay or background for text readability]. Text must be clearly legible and readable."

3. **COMPOSITION & FORMAT:**
"Vertical 4:5 Instagram format (1080x1350px). Text is prominent and clearly visible. Subject positioned to complement text layout.`
    : workflowType === "quote-graphic"
    ? `**CRITICAL: This is a QUOTE GRAPHIC REQUEST - Each concept card should be a quote graphic with text as primary element.**

**QUOTE GRAPHIC REQUIREMENTS:**
- Quote text is the PRIMARY focus (larger than person)
- Person can be background element or smaller
- Clean, minimal design with emphasis on typography
- High contrast for text readability

**QUOTE GRAPHIC PROMPT STRUCTURE (MANDATORY):**
1. **CHARACTER DESCRIPTION (optional/background):**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit: material + color + garment type], [pose/action], [location/environment], [lighting description], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores."

2. **QUOTE TEXT SECTION (PRIMARY FOCUS - REQUIRED):**
"**QUOTE TEXT:** [Specify quote text - 1-3 sentences]. Text placement: Center of image (primary focus). Font size: Very large (100-150pt equivalent), bold or elegant weight. Font style: [elegant serif OR modern sans-serif OR handwritten]. Text color: [High contrast color - white on dark OR dark on light]. Background: [Solid color background OR subtle gradient OR person as blurred background]. Quote attribution: [If needed, specify author name in smaller text below quote]. Text must be perfectly legible and the dominant visual element."

3. **COMPOSITION & FORMAT:**
"Vertical 4:5 Instagram format (1080x1350px). Quote text is the primary visual element. Person (if included) is secondary/background element. Clean, minimal, typography-focused design.`
    : workflowType === "educational"
    ? `**CRITICAL: This is an EDUCATIONAL/INFOGRAPHIC REQUEST - Each concept card should be an educational infographic.**

**EDUCATIONAL INFOGRAPHIC REQUIREMENTS:**
- Can be purely graphic (no person required) OR include person
- Text must be perfectly legible and accurately spelled
- Data visualization, step-by-step guides, statistics, or teaching content
- Professional, clean design with clear visual hierarchy

**EDUCATIONAL INFOGRAPHIC PROMPT STRUCTURE (MANDATORY):**
1. **VISUAL TYPE:**
"Vertical infographic in 4:5 format (1080x1350px), optimized for Instagram."

2. **CONTENT STRUCTURE:**
"**INFOGRAPHIC CONTENT:** [Specify content type - statistics, step-by-step guide, data visualization, teaching points, etc.]. Layout: [Specify layout - numbered steps, comparison chart, single statistic, multi-step process, etc.]. Text rendering: All text must be legible, accurately spelled, and professionally typeset (Nano Banana Pro strength)."

3. **DESIGN ELEMENTS:**
"**DESIGN STYLE:** Modern minimalist, luxury brand aesthetic, clean lines. Color palette: [Specify colors - soft beige background, dark navy text, gold accent, etc.]. Typography: Bold sans-serif for headers, regular weight for body text, high contrast for readability. Icons/Graphics: [Specify if needed - simple icons, arrows, numbers, etc.]. Spacing: Professional margins (60px all sides), generous white space, clear visual hierarchy."

4. **PERSON (IF INCLUDED):**
"If person is included: Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit description], [pose/action], [location], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores. Person should complement the infographic design, not dominate it."

**COMPLETE EXAMPLE:**
"Vertical infographic in 4:5 format (1080x1350px), optimized for Instagram.

**INFOGRAPHIC CONTENT:** Step-by-step guide with 5 numbered steps. Layout: 5 steps vertically stacked with icons. Text rendering: All text must be legible, accurately spelled, and professionally typeset.

**DESIGN STYLE:** Modern minimalist, luxury brand aesthetic, clean lines. Color palette: Soft beige background (#F5F1E8), dark navy text (#1A2332), gold accent (#C9A96E). Typography: Bold sans-serif for headers (80pt), regular weight for body text (40pt), high contrast for readability. Icons/Graphics: Simple numbered circles (1-5) with connecting lines. Spacing: Professional margins (60px all sides), generous white space, clear visual hierarchy.`
    : workflowType === "brand-scene"
    ? `**CRITICAL: This is a BRAND SCENE REQUEST - Each concept card should integrate products/brand elements naturally.**

**BRAND SCENE REQUIREMENTS:**
- Person should naturally interact with or be near products/brand items
- Products should be clearly visible but not forced
- Natural, authentic integration (not obvious product placement)
- Professional, lifestyle aesthetic
- **🔴 CRITICAL: NO TEXT OVERLAYS - Do NOT include any text overlay instructions in the prompt**

**BRAND SCENE PROMPT STRUCTURE (MANDATORY):**
1. **CHARACTER DESCRIPTION:**
"Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. [outfit: material + color + garment type - VARY outfits across concepts unless creating a cohesive brand campaign], [pose/action that naturally includes product - e.g., 'holding coffee mug', 'sitting at desk with laptop', 'carrying designer bag'], [location/environment], [lighting description - e.g., 'soft natural window light', 'warm ambient hotel lighting', 'mixed color temperatures from street lights'], professional photography, 85mm lens, f/2.0 depth of field, natural skin texture with visible pores."

2. **PRODUCT/BRAND INTEGRATION:**
"**PRODUCT INTEGRATION:** [Specify product/brand item - e.g., 'holding ceramic coffee mug', 'sitting at modern desk with MacBook Pro visible', 'carrying minimalist leather tote bag']. Product placement: [Natural, visible but not forced - e.g., 'product naturally integrated into scene', 'product clearly visible in foreground/background']. Product styling: [Professional, lifestyle aesthetic - e.g., 'product styled authentically', 'product matches scene aesthetic']."

3. **COMPOSITION & FORMAT:**
"Vertical 4:5 Instagram format (1080x1350px). Person and product naturally integrated. Professional, lifestyle aesthetic. Product clearly visible but scene feels authentic, not staged.

**🔴 CRITICAL REQUIREMENTS:**
- DO NOT include any TEXT OVERLAY section or text overlay instructions. This is a brand scene, not a carousel or reel cover.
- DO NOT add "black and white" or "monochrome" unless user explicitly requested it
- MUST include lighting description (e.g., "soft natural window light", "warm ambient lighting", "mixed color temperatures")
- MUST include camera specs (e.g., "professional photography, 85mm lens, f/2.0 depth of field")
- MUST include "natural skin texture with visible pores" (not "with visible pores" at the end)
- VARY outfits across all ${count} concept cards - each concept should have a DIFFERENT outfit (unless user explicitly asks for "same outfit" or "cohesive story" or creating a "carousel")`
    : ""
}

=== JSON OUTPUT FORMAT ===

**🔴 CRITICAL - RESPONSE FORMAT:**
- DO NOT include the prompts in your text response
- DO NOT describe the prompts or show them to the user
- ONLY output: A brief acknowledgment (1-2 sentences max) + the JSON array
- The prompts are embedded in the JSON concept cards - they are NOT for the user to read
- Example response format:
  "Perfect! I've created ${count} concept cards for you. Here they are:"
  [JSON array here]

${
  templateExamples.length > 0 && studioProMode
    ? `**Final Reminder: Template Examples:**
- You have ${templateExamples.length} template examples above - follow them
- Copy the structure, style, format, camera specs, outfit descriptions, lighting descriptions from the examples
- Do not add "black and white" unless the template examples show it
- Do not change camera specs format - use the same format as examples (e.g., "50mm lens" not "85mm lens, f/2.0")
- Follow the template examples - they guide your prompt structure

`
    : ""
}

**Text Overlay Rules Reminder:**
- workflowType is null/undefined/default - this means this is a regular concept card
- Do not include any "TEXT OVERLAY:" section, text overlay instructions, or any text-related instructions
- Do not include: "TEXT OVERLAY:", "text placement:", "font size:", "text color:", "text overlay reading", "text positioned", or any text-related mentions
- This should be a pure lifestyle/brand photo with no text
- Only include text overlays if: workflowType is explicitly "carousel-slides", "reel-cover", or "text-overlay" (which it is not in this case)
- If workflowType is null, undefined, or "brand-scene": Create pure lifestyle/brand photos without any text overlay instructions or mentions
- Default concept cards = no text overlays
- The prompt should end after camera specs and natural skin texture - no text overlay section

**Black & White Rules Reminder:**
- Do not add "black and white" or "monochrome" unless user explicitly requested it
- Do not add "black and white" unless the template examples (if provided) explicitly show it
- Only add B&W if: User specifically asks for it or reference images clearly show B&W
- If template examples are provided: Match their color treatment exactly (don't add B&W if examples don't have it)

${
  workflowType === "carousel-slides" || isCarouselRequest
    ? `**CRITICAL: This is a CAROUSEL REQUEST - Each concept card represents ONE SLIDE of a multi-slide carousel.**

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Slide ${slideCount ? '1' : 'X'} - [Carousel slide title]",
    "description": "Carousel cover slide with text overlay",
    "category": "Carousel Slide",
    "fashionIntelligence": "Your outfit reasoning - WHY this outfit for this moment",
    "lighting": "Your lighting reasoning",
    "location": "Your location reasoning",
    "prompt": "${
      studioProMode
        ? workflowType === "carousel-slides" || isCarouselRequest
          ? `YOUR CRAFTED NANO BANANA PRO CAROUSEL PROMPT - MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit") when brand is detected. Then describe scene, outfit, pose, lighting. MUST include TEXT OVERLAY instructions with placement, font size, contrast, and text content. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, rich visual storytelling with brand context, professional quality. Format: Brand mention + Attachment reference + Scene description + TEXT OVERLAY section with detailed text placement instructions.`
          : workflowType === "reel-cover"
          ? `YOUR CRAFTED NANO BANANA PRO REEL COVER PROMPT - MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit") when brand is detected. Then describe scene, outfit, pose, lighting. MUST include large, readable title text optimized for thumbnail visibility. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, professional quality. Format: Brand mention + Attachment reference + Scene description + TEXT OVERLAY section with title text, font size, and safe zone instructions.`
          : workflowType === "text-overlay"
          ? `YOUR CRAFTED NANO BANANA PRO TEXT OVERLAY PROMPT - MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit") when brand is detected. Then describe scene, outfit, pose, lighting. MUST include prominent text overlay with exact text content, placement, font size, and style. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, professional quality. Format: Brand mention + Attachment reference + Scene description + TEXT OVERLAY section with detailed text specifications.`
          : workflowType === "quote-graphic"
          ? `YOUR CRAFTED NANO BANANA PRO QUOTE GRAPHIC PROMPT - Quote text is PRIMARY focus, person is secondary/background. If person included, MUST start with "Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo." MUST include quote text, font style, and typography details. Natural language description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, professional quality. Format: Quote text section (primary) + optional person description (secondary) with attachment reference.`
          : workflowType === "educational"
          ? `YOUR CRAFTED NANO BANANA PRO EDUCATIONAL INFOGRAPHIC PROMPT - MUST include infographic content structure, text rendering requirements, and design elements. Can be purely graphic OR include person. If person included, MUST start with "Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo." Natural language description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, professional quality. Format: Infographic content + design style + optional person integration with attachment reference.`
          : workflowType === "brand-scene"
          ? `YOUR CRAFTED NANO BANANA PRO BRAND SCENE PROMPT - MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit", "official campaign of the ALO brand") when brand is detected. Then describe scene, outfit (USE THE SAME OUTFIT ACROSS ALL CONCEPTS), pose, lighting (MUST include lighting description). MUST include natural product/brand integration. Person should naturally interact with products. MUST include camera specs (e.g., "professional photography, 85mm lens, f/2.0 depth of field") and natural skin texture. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, professional quality. Format: Brand mention + Attachment reference + Scene description + Lighting + Camera specs + PRODUCT INTEGRATION section. 🔴 CRITICAL: DO NOT include any TEXT OVERLAY section. DO NOT add "black and white" unless user explicitly requested it. DO NOT add "with visible pores" at the end - use "natural skin texture with visible pores" in proper location.`
          : `YOUR CRAFTED NANO BANANA PRO PROMPT - ${
            templateExamples.length > 0
              ? `**🔴 CRITICAL: You have ${templateExamples.length} template examples above. FOLLOW THEM EXACTLY.**
- Copy the EXACT structure, style, format, and level of detail from the template examples
- Use the SAME camera specs format as the examples (e.g., "50mm lens" or "35-50mm lens" - NOT "85mm lens, f/2.0")
- Use the SAME outfit description style and detail level as the examples (but VARY the actual outfits across concepts)
- Use the SAME lighting description style as the examples
- VARY outfits across concepts - each concept should have a DIFFERENT outfit
- DO NOT add "black and white" unless the template examples show it
- DO NOT deviate from the template examples - they are your ONLY reference
`
              : `MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit", "official campaign of the ALO brand") when brand is detected. Then describe scene, outfit (VARY outfits across concepts - each concept should have a DIFFERENT outfit), pose, lighting (MUST include lighting description). MUST include camera specs (e.g., "professional photography, 85mm lens, f/2.0 depth of field") and natural skin texture. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, rich visual storytelling with brand context, professional quality.`
          }

**Text Overlay Rules:**
- This is a regular concept card, not a carousel, reel cover, or text overlay request
- workflowType is null/undefined/default - this means no text overlays
- Do not include any "TEXT OVERLAY:" section in your prompt
- Do not include any text overlay instructions, specifications, or mentions
- Do not include text placement, font size, text color, or any text-related instructions
- This should be a pure lifestyle/brand photo with no text
- Examples of what not to include: "TEXT OVERLAY:", "text placement:", "font size:", "text color:", "text overlay reading", "text positioned"
- The prompt should end after camera specs and natural skin texture - no text overlay section

**Black & White Rules:**
- Do not add "black and white" or "monochrome" unless user explicitly requested it
- Do not add "black and white" unless the template examples (if provided) explicitly show it
- Only add B&W if user specifically asks for it or reference images clearly show B&W
- If template examples are provided, match their color treatment (don't add B&W if examples don't have it)

DO NOT add "with visible pores" at the end - use "natural skin texture with visible pores" in proper location.`
        : `YOUR CRAFTED FLUX PROMPT - ${triggerWord}, then storytelling prose per FLUX PROMPTING MASTERY; NO [SCENE]/[CAMERA] labels; fold ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? " + converted prefs" : ""} into narrative once; 90-150 words; no repeated trigger or duplicate camera lines; no text overlay`
    }"
  }
]
`
    : `**🔴 CRITICAL - YOUR RESPONSE FORMAT:**
- DO NOT show the prompts to the user in your text response
- DO NOT describe or list the prompts
- ONLY output: A brief acknowledgment (1-2 sentences) + the JSON array
- Example: "Perfect! I've created ${count} concept cards for you. Here they are:" followed by the JSON array
- The prompts are embedded in the JSON - they are for the system, not for the user to read

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "Simple, catchy title (2-4 words, everyday language)",
    "description": "Quick, exciting one-liner that makes them want to see it",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Close-Up Action",
    "fashionIntelligence": "Your outfit reasoning - WHY this outfit for this moment",
    "lighting": "Your lighting reasoning",
    "location": "Your location reasoning",
    "prompt": "${
      studioProMode
        ? templateExamples.length > 0
          ? `YOUR CRAFTED NANO BANANA PRO PROMPT - **🔴 CRITICAL: You have ${templateExamples.length} template examples above. FOLLOW THEM EXACTLY.**
- Copy the EXACT structure, style, format, and level of detail from the template examples
- Use the SAME camera specs format as the examples (e.g., "50mm lens" or "35-50mm lens" - NOT "85mm lens, f/2.0" unless the example shows it)
- Use the SAME outfit description style and detail level as the examples (but VARY the actual outfits across concepts)
- Use the SAME lighting description style as the examples
- Use the SAME mood and aesthetic descriptions as the examples
- VARY outfits across concepts - each concept should have a DIFFERENT outfit that fits the theme
- DO NOT add "black and white" unless the template examples show it
- DO NOT deviate from the template examples - they are your ONLY reference for structure and style
- DO NOT include any TEXT OVERLAY section unless the user specifically requested carousel slides, reel covers, or text overlays
- DO NOT add "with visible pores" at the end - use "natural skin texture with visible pores" in proper location`
          : `YOUR CRAFTED NANO BANANA PRO PROMPT - MUST start with attachment reference format. MUST mention brand name (e.g., "from Alo", "Alo brand outfit", "official campaign of the ALO brand") when brand is detected. Then describe scene, outfit (VARY outfits across concepts - each concept should have a DIFFERENT outfit), pose, lighting (MUST include lighting description). MUST include camera specs (e.g., "professional photography, 85mm lens, f/2.0 depth of field") and natural skin texture. Natural language scene description (50-80 words), NO trigger words, NO assumptions about hair color/ethnicity/body type, rich visual storytelling with brand context, professional quality. 🔴 CRITICAL: DO NOT include any TEXT OVERLAY section unless the user specifically requested carousel slides, reel covers, or text overlays. DO NOT add "black and white" unless user explicitly requested it. DO NOT add "with visible pores" at the end - use "natural skin texture with visible pores" in proper location.`
        : `COMPLETE FINAL PROMPT for image generation (Classic Mode - LoRA/Flux)

**PROMPT REQUIREMENTS (Classic Mode):**
- **Format:** **${triggerWord},** + **1–2 paragraphs of storytelling prose** - **zero** \`[LABEL]\` section headers in the string (see FLUX PROMPTING MASTERY + PERFECT EXAMPLES).
- **Trigger:** **Exactly once** at the start; never repeated mid-prompt.
- **Person / prefs:** ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? ` - merge converted preferences into the story once (strip instruction phrases)` : ""} - no duplicate demographic lines.
- **Length:** **90-150 words** after the trigger comma. Thin or copy-paste repeated clauses are invalid.
- **Camera / look:** Candid + iPhone rules from principles, **said once** in the narrative, unless reference/user overrides.
- **NO** bare \`IMG_XXXX.HEIC\`-only prompts, **NO** text overlays for default cards.

**DIVERSITY & VARIETY:** Vary scenes, outfits, activities across concepts while keeping **story** format (not repeated templates).

**SELFIE HANDLING:** Weave front-camera / mirror beats into the story (e.g. arm extended with phone, mirror edge visible) - **do not** use "ultra-realistic".

**CRITICAL:** Prompt must be FINAL for Replicate/Flux - no downstream rewriting.`
    }"
  }
]`
}

TITLE EXAMPLES (everyday language, not fashion jargon):
✅ "Coffee Run Glow"
✅ "Rooftop Sunset"
✅ "Cozy Morning"
✅ "City Adventure"
❌ "Architectural Minimalist Elegance" (too fancy)
❌ "Urban Editorial Moment" (too fashion-y)

DESCRIPTION EXAMPLES (warm, brief, exciting):
✅ "That perfect golden hour moment with your coffee"
✅ "Relaxed and chic at your favorite rooftop spot"
✅ "Cozy mornings that feel like a vibe"
❌ "Capturing the interplay of architectural elements and sartorial sophistication" (way too much!)

${
  workflowType === "carousel-slides" || isCarouselRequest
    ? `**CRITICAL CAROUSEL INSTRUCTIONS:**
- Create ${slideCount || count} carousel slide concepts (one per slide)
- Each slide MUST include detailed TEXT OVERLAY instructions
- Slide 1: Cover slide with large headline/title text
- Slides 2-${slideCount || count}: Content slides with numbered points or teaching text
- Maintain character consistency across ALL slides
- Each prompt must specify text placement, font size, and contrast requirements
- Use the carousel template structure with text overlay sections

**TEXT OVERLAY REQUIREMENTS FOR EACH SLIDE:**
- Specify text content (e.g., "10 things", "Slide 2: Key point", etc.)
- Specify text placement (lower third, center, top, etc.)
- Specify font size (large enough for mobile readability - minimum 24pt equivalent)
- Specify contrast/background (text box overlay if background is busy)
- Ensure text is readable at thumbnail size (400px width)

Now create ${slideCount || count} carousel slide concepts with complete text overlay instructions.`
    : workflowType === "reel-cover"
    ? `**CRITICAL REEL COVER INSTRUCTIONS:**
- Create ${count} reel cover concepts optimized for Instagram Reels
- Each cover MUST include large, readable title text
- Text must work as tiny thumbnail on grid (very large font size)
- Safe zones respected (text not cut off by Instagram UI)
- Clean, minimal design that works at small sizes
- Title should be 3-7 words max if possible

Now create ${count} reel cover concepts with prominent, readable title text.`
    : workflowType === "text-overlay"
    ? `**CRITICAL TEXT OVERLAY INSTRUCTIONS:**
- Create ${count} concepts with prominent text overlay
- Each concept MUST include detailed text specifications
- Text should be clearly visible and readable
- Specify exact text content, placement, font size, and style
- Ensure high contrast for readability

Now create ${count} text overlay concepts with detailed text specifications.`
    : workflowType === "quote-graphic"
    ? `**CRITICAL QUOTE GRAPHIC INSTRUCTIONS:**
- Create ${count} quote graphic concepts
- Quote text is the PRIMARY visual element (larger than person)
- Person can be background element or smaller
- Clean, minimal, typography-focused design
- High contrast for text readability

Now create ${count} quote graphic concepts with quote text as primary focus.`
    : workflowType === "educational"
    ? `=== EDUCATIONAL INFOGRAPHIC INSTRUCTIONS ===
- Create ${count} educational infographic concepts
- Can be purely graphic OR include person
- Text must be perfectly legible and accurately spelled
- Professional, clean design with clear visual hierarchy
- Data visualization, step-by-step guides, or teaching content

Now create ${count} educational infographic concepts with clear, legible text and professional design.`
    : workflowType === "brand-scene"
    ? `**CRITICAL BRAND SCENE INSTRUCTIONS:**
- Create ${count} brand scene concepts with natural product integration
- **🔴 CRITICAL: Use the SAME outfit across ALL ${count} concepts** - this creates a cohesive story
- Person should naturally interact with or be near products
- Products clearly visible but not forced
- Natural, authentic integration (not obvious product placement)
- Professional, lifestyle aesthetic
- **MUST include:** Lighting description (e.g., "soft natural window light", "warm ambient lighting")
- **MUST include:** Camera specs (e.g., "professional photography, 85mm lens, f/2.0 depth of field")
${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt || undefined, templateExamples) && !studioProMode ? `- **MUST include:** Natural skin texture (e.g., "natural skin texture with visible pores" - in proper location, not at end)` : studioProMode ? `- **Skin texture:** Studio Pro mode - do NOT explicitly mention skin texture (professional photography handles this naturally)` : `- **Skin texture:** Only include if specified in user prompt, guide prompt, or templates - do NOT add automatically`}
- **🔴 CRITICAL: DO NOT include any TEXT OVERLAY instructions - this is a brand scene, not a carousel or reel cover**
- **🔴 CRITICAL: DO NOT add "black and white" unless user explicitly requested it**
- **🔴 CRITICAL: DO NOT add "with visible pores" at the end - format as "natural skin texture with visible pores"**

Now create ${count} brand scene concepts with natural product/brand integration. Use the SAME outfit across all concepts. NO TEXT OVERLAYS.`
    : `Now apply your fashion intelligence and prompting mastery. Create ${count} concepts where every outfit choice is intentional and story-driven.

**🔴 CRITICAL - YOUR RESPONSE:**
- DO NOT show or describe the prompts in your text response
- ONLY output: A brief acknowledgment (1-2 sentences max) + the JSON array
- Example: "Perfect! I've created ${count} concept cards for you. Here they are:"
- The prompts are embedded in the JSON concept cards - they are for the system, NOT for the user to read
- Keep your acknowledgment short and friendly - no technical details about prompts

**Requirements:**

${detectedGuidePrompt ? `**Outfit Consistency (Guide Prompt Mode):** Use the same outfit from the guide prompt across all ${count} concepts - maintain outfit consistency, only vary poses/angles/moments/expressions.` : `**Outfit Variation:** Vary outfits across all ${count} concepts - each concept should have a different outfit that fits the theme (unless user explicitly asks for "same outfit" or "cohesive story" or creating a "carousel")`}

**Lighting:** Include lighting description in every prompt (e.g., "soft natural window light", "warm ambient lighting", "mixed color temperatures")

**Camera Specs:** Include camera specs in every prompt (e.g., "professional photography, 85mm lens, f/2.0 depth of field")

${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt || undefined, templateExamples) && !studioProMode ? `**Skin Texture:** Include "natural skin texture with visible pores" (in proper location, not "with visible pores" at the end)` : studioProMode ? `**Skin Texture:** Studio Pro mode - do NOT explicitly mention skin texture (professional photography handles this naturally)` : `**Skin Texture:** Only include if specified in user prompt, guide prompt, or templates - do not add automatically`}

**Text Overlay Rules:**
- This is a regular concept card (not a carousel or reel cover)
- Do not include any text overlay instructions, sections, or mentions
- Do not include: "TEXT OVERLAY:", "text placement:", "font size:", "text color:", or any text-related instructions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤳 SELFIE CONCEPTS (When Appropriate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SSELFIE Studio celebrates authentic selfie content. Consider including selfie concepts when they naturally fit the user's request or when creating diverse, relatable content.

**WHEN TO INCLUDE SELFIES:**
- User explicitly requests selfies ("selfie", "front camera", "mirror selfie")
- Creating wellness/fitness content (post-workout selfies, gym mirror selfies)
- Fashion/outfit showcase (mirror selfies, fitting room selfies)
- Beauty/self-care content (skincare routine, makeup application)
- Lifestyle content that benefits from intimate, first-person perspective
- When variety would benefit from mixing professional shots with authentic selfie moments

**WHEN TO SKIP SELFIES:**
- User requests professional/editorial style only
- Brand scenes or product-focused concepts
- Carousel/cohesive story concepts where selfies don't fit
- User explicitly prefers professional photography aesthetic

**SELFIE FORMAT (when creating selfie concepts):**

Same quality/luxury/styling as professional concepts, but with:
- iPhone front camera (not DSLR)
- Selfie framing (arm extended, mirror reflection, or tripod setup)
- Authentic influencer aesthetic
- Natural bokeh and iPhone camera characteristics

**SELFIE TYPES:**

1. HANDHELD SELFIE: "ultra-realistic iPhone 15 Pro front camera selfie, arm extended holding phone, close-up to medium shot, natural bokeh, influencer selfie style"

2. MIRROR SELFIE: "ultra-realistic iPhone 15 Pro mirror selfie reflection, standing before mirror holding phone at chest level, full body reflection, mirror visible in frame, authentic selfie aesthetic"

3. TRIPOD SELFIE: "ultra-realistic iPhone 15 Pro tripod selfie setup, phone on tripod with ring light, face to upper body, professional influencer content quality"

**SELFIE RULES:**
✅ Maintain same outfit quality and setting quality
✅ Use "iPhone 15 Pro front camera selfie" or "iPhone 15 Pro mirror selfie"
✅ Add selfie-specific details (arm extended, holding phone, mirror visible)
❌ Don't use DSLR or professional camera specs for selfies
❌ Don't lower quality/luxury for selfie concepts

**Trust your judgment** - include selfies when they enhance the concept mix, but focus on what best serves the user's request.
- This should be a pure lifestyle/brand photo with no text
- Only include text overlays if workflowType is explicitly "carousel-slides", "reel-cover", or "text-overlay" (which it is not in this case)
- The prompt should end after camera specs and natural skin texture - no text overlay section

**B&W Rules:**
- Do not add "black and white" unless user explicitly requested it
- Only add B&W if user specifically asks for it or reference images clearly show B&W`
}`

    // 🔴 CRITICAL: Include conversationContext for better context detection (like Classic Mode)
    // Classic Mode uses conversationContext throughout - Studio Pro Mode should too!
    const enrichedUserRequestForDetection = conversationContext 
      ? `${userRequest || ''} ${conversationContext}`.trim()
      : userRequest || ''
    
    // 🔴 CRITICAL: User request ALWAYS takes priority over upload module category
    // If user provides a new request, prioritize their request over upload module category
    // This allows users to pivot directions, concepts, scenes, categories, styles using the same images
    const hasUserRequestForAI = userRequest && userRequest.trim().length > 0
    const uploadModuleCategoryForAI = (referenceImages as any)?.category
    const shouldUseUploadModuleCategoryForAI = uploadModuleCategoryForAI && !hasUserRequestForAI
    
    // 🔴 CRITICAL: Prioritize upload module category FIRST before pattern matching
    // Upload module sends explicit category (e.g., "beauty-self-care", "travel-lifestyle")
    // 🔴 FIX: Don't default to 'casual-lifestyle' - start with empty string and handle explicitly
    let detectedCategory: string | null = null
    
    if (shouldUseUploadModuleCategoryForAI && uploadModuleCategoryForAI) {
      console.log("[v0] [AI-GENERATION] 🔴 Using upload module category (no user request):", uploadModuleCategoryForAI)
      // Map upload module categories directly to detected categories
      const uploadCategoryLower = uploadModuleCategoryForAI.toLowerCase()
      
      if (uploadCategoryLower.includes('workout') || uploadCategoryLower.includes('athletic') || uploadCategoryLower.includes('fitness') || uploadCategoryLower === 'gym' || uploadCategoryLower === 'brand-content' || uploadCategoryLower === 'wellness-content') {
        detectedCategory = 'alo-workout'
      } else if (uploadCategoryLower.includes('travel') || uploadCategoryLower === 'airport' || uploadCategoryLower === 'travel-lifestyle' || uploadCategoryLower === 'luxury-travel') {
        detectedCategory = 'travel-airport'
      } else if (uploadCategoryLower.includes('luxury') || uploadCategoryLower.includes('fashion') || uploadCategoryLower === 'fashion-editorial') {
        detectedCategory = 'luxury-fashion'
      } else if (uploadCategoryLower.includes('cozy') || uploadCategoryLower === 'home' || uploadCategoryLower.includes('christmas') || uploadCategoryLower.includes('holiday') || uploadCategoryLower === 'seasonal-holiday') {
        detectedCategory = uploadCategoryLower.includes('christmas') || uploadCategoryLower.includes('holiday') || uploadCategoryLower === 'seasonal-holiday' ? 'seasonal-christmas' : 'casual-lifestyle'
      } else if (uploadCategoryLower === 'casual' || uploadCategoryLower === 'lifestyle' || uploadCategoryLower === 'coffee') {
        detectedCategory = 'casual-lifestyle'
      } else if (uploadCategoryLower === 'street' || uploadCategoryLower === 'street-style') {
        detectedCategory = 'luxury-fashion'
      } else if (uploadCategoryLower.includes('beauty') || uploadCategoryLower === 'beauty-self-care' || uploadCategoryLower === 'selfie-styles') {
        // Beauty categories - use AI generation system (not prompt constructor)
        detectedCategory = 'casual-lifestyle' // Fallback, but will use AI generation
      } else if (uploadCategoryLower === 'tech-work' || uploadCategoryLower === 'tech') {
        // Tech categories - use AI generation system
        detectedCategory = 'casual-lifestyle' // Fallback, but will use AI generation
      } else {
        // If upload module category doesn't match known categories, use pattern matching
        detectedCategory = detectCategoryFromRequest(enrichedUserRequestForDetection, aesthetic, context, conversationContext)
      }
    } else {
      // User provided a request OR no upload module category - prioritize user request
      detectedCategory = detectCategoryFromRequest(enrichedUserRequestForDetection, aesthetic, context, conversationContext)
      
      // 🔴 FIX: If no category detected and upload module category exists, use it as fallback
      if (!detectedCategory && uploadModuleCategoryForAI) {
        const uploadCategoryLower = uploadModuleCategoryForAI.toLowerCase()
        if (uploadCategoryLower.includes('workout') || uploadCategoryLower.includes('athletic') || uploadCategoryLower.includes('fitness') || uploadCategoryLower === 'gym' || uploadCategoryLower === 'brand-content' || uploadCategoryLower === 'wellness-content') {
          detectedCategory = 'alo-workout'
        } else if (uploadCategoryLower.includes('travel') || uploadCategoryLower === 'airport' || uploadCategoryLower === 'travel-lifestyle' || uploadCategoryLower === 'luxury-travel') {
          detectedCategory = 'travel-airport'
        } else if (uploadCategoryLower.includes('luxury') || uploadCategoryLower.includes('fashion') || uploadCategoryLower === 'fashion-editorial') {
          detectedCategory = 'luxury-fashion'
        } else if (uploadCategoryLower.includes('cozy') || uploadCategoryLower === 'home' || uploadCategoryLower.includes('christmas') || uploadCategoryLower.includes('holiday') || uploadCategoryLower === 'seasonal-holiday') {
          detectedCategory = uploadCategoryLower.includes('christmas') || uploadCategoryLower.includes('holiday') || uploadCategoryLower === 'seasonal-holiday' ? 'seasonal-christmas' : 'casual-lifestyle'
        } else if (uploadCategoryLower === 'casual' || uploadCategoryLower === 'lifestyle' || uploadCategoryLower === 'coffee') {
          detectedCategory = 'casual-lifestyle'
        } else if (uploadCategoryLower === 'street' || uploadCategoryLower === 'street-style') {
          detectedCategory = 'luxury-fashion'
        }
      }
      
      // 🔴 FIX: If no category detected, allow dynamic generation instead of defaulting
      // Maya should use her full fashion knowledge when category is unknown
      if (!detectedCategory || detectedCategory.trim().length === 0) {
        const hasAnyText = enrichedUserRequestForDetection.trim().length > 0
        if (hasAnyText) {
          // User provided text but no category matched - this is likely an aesthetic description
          // Allow Maya to use her full fashion knowledge dynamically
          detectedCategory = null // Set to null to trigger dynamic generation path
        } else if (uploadModuleCategoryForAI) {
          // No text but upload module category exists - use it
          // This should have been handled above, but if not, we'll use AI generation with upload category context
          detectedCategory = null
        } else {
          // No text and no upload category - use AI generation with full Maya knowledge
          detectedCategory = null
        }
      }
    }
    
    const detectedBrandValue = detectBrand(enrichedUserRequestForDetection || aesthetic || context)

    // Phase 3A P0-2: Route through Prompt Authority Layer (default, no feature flag)
    let concepts: MayaConcept[] = []
    let generationStartTime = Date.now()
    let pathUsed: 'authority' | 'legacy' = 'authority'
    
    // Route through Prompt Authority Layer (Phase 3A migration)
    console.log('[v0] [CONCEPT-CARDS] ✅ Routing through Prompt Authority Layer (Phase 3A)')
    generationStartTime = Date.now()
    
    try {
      const authorityResult = await generateConceptCardsViaAuthority<MayaConcept>(
        {
          userId: effectiveUser.id.toString(),
          triggerWord,
          userGender,
          ethnicity: userEthnicity,
          physicalPreferences,
          category: detectedCategory,
          userRequest: enrichedUserRequestForDetection,
          aesthetic,
          context,
          conversationContext,
          conceptPrompt, // Pass the full Maya system prompt
        },
        async (prompt: string) => {
          // Delegate to existing Maya chat logic
          return await generateText({
            model: createMayaOpenRouterModel("chat_pro"),
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.85,
          })
        }
      )
      
      concepts = authorityResult.concepts
      console.log('[v0] [CONCEPT-CARDS] ✅ Authority Layer generated', concepts.length, 'concepts in', authorityResult.metadata.executionTimeMs, 'ms')
      console.log('[v0] [CONCEPT-CARDS] Input hash:', authorityResult.metadata.inputHash)
      
    } catch (authorityError) {
      console.error('[v0] [CONCEPT-CARDS] ❌ Authority Layer failed, falling back to legacy:', authorityError)
      // Fallback to legacy path
      pathUsed = 'legacy'
      generationStartTime = Date.now()
      
      // Continue with legacy logic below
    }
    
    // Legacy path (fallback only if Authority Layer fails)
    if (pathUsed === 'legacy' || concepts.length === 0) {
      console.log('[v0] [CONCEPT-CARDS] Using legacy generation path')
      generationStartTime = Date.now()
      
      // Generate concepts using Maya's AI generation
      // Generate all concepts using Maya's AI
      const { text } = await generateText({
        model: createMayaOpenRouterModel("chat_pro"),
        messages: [
          {
            role: 'user',
            content: conceptPrompt,
          },
        ],
        temperature: 0.85,
      })

      // Parse JSON response via extracted helper
      concepts = parseLegacyConceptsFromText(text)
      
      // Audit log legacy path
      const legacyGenerationTime = Date.now() - generationStartTime
      concepts.forEach((concept, index) => {
        if (concept.prompt) {
          try {
            auditLogMayaChatGeneration(
              'classic',
              'concept-card',
              {
                userId: effectiveUser.id.toString(),
                triggerWord,
                userGender,
                ethnicity: userEthnicity,
                physicalPreferences,
                category: detectedCategory,
                userRequest: enrichedUserRequestForDetection,
              },
              concept.prompt,
              legacyGenerationTime / concepts.length, // Average time per concept
              'legacy' // Explicitly mark as legacy path
            )
          } catch (auditError) {
            // Don't fail if audit logging fails
            console.warn('[v0] [CONCEPT-CARDS] Legacy audit logging failed (non-critical):', auditError)
          }
        }
      })
    }

    // 🔴 CRITICAL: Check for upload module category - some categories (beauty, tech, selfies) don't use prompt constructor
    const uploadModuleCategory = (referenceImages as any)?.category
    const uploadModuleConcept = (referenceImages as any)?.concept
    const unsupportedCategories = ['beauty', 'tech', 'selfies', 'beauty-self-care', 'selfie-styles', 'tech-work']
    const isUnsupportedCategory = uploadModuleCategory && 
      unsupportedCategories.some(unsupported => uploadModuleCategory.toLowerCase().includes(unsupported.toLowerCase()))

    // Verify Maya generated prompts
    if (concepts.length > 0) {
      concepts.forEach((concept, i) => {
        if (!concept.prompt || concept.prompt.trim().length === 0) {
          console.warn(`[v0] Concept ${i + 1} missing prompt, using description fallback`)
          // Simple fallback only if Maya didn't generate a prompt
          concept.prompt = `${triggerWord || ''}, ${concept.description || ''}`.trim()
        }
        
        // Validate Nano Banana prompts (Pro Mode only)
        if (studioProMode && concept.prompt) {
          const validation = validateNanoBananaPrompt(concept.prompt)
          
          if (!validation.isValid) {
            console.warn(`[v0] [VALIDATION] Invalid prompt for concept "${concept.title}":`, validation.errors)
          }
          
          if (validation.warnings.length > 0) {
          }
        }
      })
    }
    
    // 🔴 REMOVED: Post-generation brand injection that overrides Maya's prompts
    // Maya's generated prompts should stand as-is without any post-processing injection or replacement
    // Brand library instructions in the AI prompt (for Pro Mode) are sufficient guidance

    // 🔴 CRITICAL: If guide prompt is provided (explicit or auto-detected), use it for concept #1 and create variations for 2-6
    if (detectedGuidePrompt && detectedGuidePrompt.trim().length > 0 && concepts.length > 0) {
      console.log("[v0] 📋 Using guide prompt for concept #1 (AI fallback), creating variations for concepts 2-6")
      
      // Direct generation: let Maya generate unique variations with guide prompt context
      console.log("[v0] ✅ Direct generation - letting Maya create unique variations with guide prompt context")
      
      // Concept #1: Use guide prompt EXACTLY (but merge with user's image references)
      const guidePromptWithImages = mergeGuidePromptWithImages(detectedGuidePrompt, referenceImages, studioProMode)
      concepts[0].prompt = guidePromptWithImages
      console.log("[v0] ✅ Concept #1 uses guide prompt (length:", guidePromptWithImages.length, "chars)")
      
      // For concepts 2-6, let Maya generate unique variations using her intelligence
      // The prompts will already be unique since they come from Maya's initial generation
      // We just need to ensure they reference the guide prompt context
      console.log("[v0] ✅ Concepts 2-6 will use Maya's unique titles/descriptions (already generated)")
      
      // Extract key elements from guide prompt for variations (if needed for fallback)
      const baseElements = extractPromptElements(detectedGuidePrompt)
      
      // Concepts 2-6: Create variations maintaining consistency (fallback only if direct generation failed)
      for (let i = 1; i < Math.min(concepts.length, 6); i++) {
        const variationNumber = i + 1
        // Only create variation if prompt wasn't set by direct generation above
        if (!concepts[i].prompt || concepts[i].prompt.length < 50) {
          const variationPrompt = createVariationFromGuidePrompt(
            detectedGuidePrompt,
            baseElements,
            variationNumber,
            referenceImages,
            studioProMode
          )
          concepts[i].prompt = variationPrompt
          console.log("[v0] ✅ Concept #" + variationNumber + " created as variation (fallback)")
        } else {
          console.log("[v0] ✅ Concept #" + variationNumber + " already has prompt from direct generation")
        }
      }
    }

    // Post-process prompts to remove old requirements and ensure new simplified format
    // First, remove any old requirements that shouldn't be there
    // Track which concepts are from guide prompts (concept #1 and variations 2-6)
    // 🔴 FIX: Use Local suffix to avoid conflicts with later definitions in different scopes
    const hasGuidePromptLocal1 = detectedGuidePrompt && detectedGuidePrompt.trim().length > 0
    const guidePromptHasBAndW = hasGuidePromptLocal1 && detectedGuidePrompt && /black.?and.?white|black\s*&\s*white|monochrome|b&w|grayscale/i.test(detectedGuidePrompt)
    
    // Helper function to check if a concept is a guide prompt (defined at line 2754)
    const isGuidePromptConceptFnLocal1 = (concept: MayaConcept) => 
      concept.title === 'Your Custom Prompt' && 
      concept.description === 'Using your guide prompt exactly as specified'
    
    // Safety check: ensure concepts is an array
    if (!Array.isArray(concepts)) {
      console.error("[v0] ERROR: concepts is not an array:", typeof concepts, concepts)
      concepts = []
    }
    
    concepts.forEach((concept, index) => {
      // Safety check: ensure concept exists and has required properties
      if (!concept) {
        console.warn(`[v0] Warning: concept at index ${index} is undefined, skipping`)
        return
      }
      if (!concept.prompt) {
        console.warn(`[v0] Warning: concept at index ${index} has no prompt, skipping`)
        return
      }
      
      let prompt = concept.prompt
      
      // Check if this is a guide prompt concept (concept #1 uses guide prompt, concepts 2-6 are variations)
      // 🔴 FIX: Use the function to check each concept individually, not a boolean on all concepts
      const isFromGuidePrompt = isGuidePromptConceptFnLocal1(concept) || (hasGuidePromptLocal1 && index > 0 && index < 6)
      
      // 🔴🔴🔴 CRITICAL: Remove "black and white" unless explicitly requested
      // BUT: Preserve B&W if it's in the original guide prompt
      if (studioProMode) {
        // Check if user explicitly requested B&W in their request
        const userExplicitlyWantsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white|black\s*&\s*white)\b/i.test(userRequest || "")
        const hasBAndWInPrompt = /black.?and.?white|black\s*&\s*white|monochrome|b&w|grayscale/i.test(prompt)
        
        // Remove B&W if not explicitly requested by user
        // BUT: If this is a guide prompt concept and the guide prompt has B&W, preserve it
        if (!userExplicitlyWantsBAndW && hasBAndWInPrompt && !(isFromGuidePrompt && guidePromptHasBAndW)) {
          // More aggressive removal - catch all variations
          prompt = prompt.replace(/,\s*black\s+and\s+white\s*$/gi, "") // At end
          prompt = prompt.replace(/,\s*black\s+and\s+white\s*[.,]/gi, "") // Before period/comma
          prompt = prompt.replace(/black\s+and\s+white,?\s*/gi, "") // Anywhere
          prompt = prompt.replace(/black\s*&\s*white,?\s*/gi, "") // B&W variation
          prompt = prompt.replace(/,\s*monochrome\s*$/gi, "") // At end
          prompt = prompt.replace(/,\s*monochrome\s*[.,]/gi, "") // Before period/comma
          prompt = prompt.replace(/monochrome,?\s*/gi, "") // Anywhere
          prompt = prompt.replace(/,\s*b&w\s*$/gi, "") // At end
          prompt = prompt.replace(/,\s*b&w\s*[.,]/gi, "") // Before period/comma
          prompt = prompt.replace(/b&w,?\s*/gi, "") // Anywhere
          prompt = prompt.replace(/,\s*grayscale\s*$/gi, "") // At end
          prompt = prompt.replace(/,\s*grayscale\s*[.,]/gi, "") // Before period/comma
          prompt = prompt.replace(/grayscale,?\s*/gi, "") // Anywhere
          // Clean up any double spaces or commas left behind
          prompt = prompt.replace(/\s+/g, " ").trim()
          prompt = prompt.replace(/,\s*,/g, ",")
          prompt = prompt.replace(/,\s*\./g, ".")
          console.log("[v0] ✅ Removed 'black and white' from prompt (not explicitly requested by user)")
        }
      }
      
      // 🔴🔴🔴 CRITICAL: Remove text overlays if workflowType is NOT carousel-slides, reel-cover, or text-overlay
      // BUT: Skip text overlay removal for guide prompt concepts (they should preserve the original guide prompt structure)
      if (studioProMode && workflowType !== "carousel-slides" && workflowType !== "reel-cover" && workflowType !== "text-overlay" && !isFromGuidePrompt) {
        // Remove entire TEXT OVERLAY sections (multiline, including everything until next section or end)
        prompt = prompt.replace(/\*\*TEXT\s+OVERLAY:\*\*[\s\S]*?(?=\*\*[A-Z]|$)/gi, "")
        prompt = prompt.replace(/TEXT\s+OVERLAY:\s*[\s\S]*?(?=\.\s*[A-Z]|$)/gi, "")
        prompt = prompt.replace(/TEXT\s+OVERLAY:\s*[\s\S]*?(?=\n\n|$)/gi, "")
        // Remove text overlay instructions (more aggressive patterns)
        prompt = prompt.replace(/,\s*text\s+placement:[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*font\s+size:[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*font\s+weight:[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*font\s+style:[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*text\s+color:[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*text\s+overlay\s+reading[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*text\s+positioned[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*text\s+must\s+be[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*text\s+is\s+prominent[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*background:\s*semi-transparent[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*semi-transparent\s+dark\s+overlay[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*safe\s+zones[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*readable\s+at\s+thumbnail[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*minimum\s+\d+:\d+\s+contrast\s+ratio[^,.]*[.,]/gi, "")
        // Remove standalone text overlay phrases
        prompt = prompt.replace(/,\s*text\s+overlay[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/text\s+overlay[^,.]*[.,]/gi, "")
        // Remove "Text is prominent" or similar phrases
        prompt = prompt.replace(/,\s*text\s+is\s+prominent[^,.]*[.,]/gi, "")
        prompt = prompt.replace(/,\s*subject\s+positioned\s+to\s+complement\s+text[^,.]*[.,]/gi, "")
        // Clean up any double periods or commas
        prompt = prompt.replace(/\.\s*\./g, ".")
        prompt = prompt.replace(/,\s*,/g, ",")
        console.log("[v0] ✅ Removed text overlay from prompt (workflowType is not carousel/reel/text-overlay)")
      }
      
      // Remove old requirements that are no longer needed
      // BUT: Be gentler with guide prompt concepts - only remove if they're clearly problematic
      if (!isFromGuidePrompt) {
        prompt = prompt.replace(/,\s*(film\s+grain|muted\s+tones|muted\s+color\s+palette|candid\s+moment|natural\s+skin\s+texture\s+with\s+pores\s+visible|not\s+airbrushed|not\s+plastic-looking|motion\s+blur|visible\s+sensor\s+noise|slight\s+motion\s+blur)/gi, "")
      }
      
      // Fix problematic poses that cause extra limbs
      // Replace "legs tucked under" with safer alternatives
      // BUT: Only fix if it's clearly problematic, preserve guide prompt poses
      if (/\blegs\s+tucked\s+under\b/i.test(prompt)) {
        prompt = prompt.replace(/\blegs\s+tucked\s+under\b/gi, "sitting with legs crossed")
      }
      if (/\bcurled\s+up\b/i.test(prompt)) {
        prompt = prompt.replace(/\bcurled\s+up\b/gi, "lounging comfortably")
      }
      if (/\bknees\s+to\s+chest\b/i.test(prompt)) {
        prompt = prompt.replace(/\bknees\s+to\s+chest\b/gi, "sitting with one knee up")
      }
      if (/\blegs\s+folded\s+under\b/i.test(prompt)) {
        prompt = prompt.replace(/\blegs\s+folded\s+under\b/gi, "sitting with legs crossed")
      }
      
      // For Studio Pro mode: Remove ALL iPhone/cellphone references
      // BUT: Skip for guide prompt concepts (they might have specific camera specs)
      if (studioProMode && !isFromGuidePrompt) {
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        prompt = prompt.replace(/,\s*(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography|candid\s+photo|candid\s+moment)/gi, "")
        prompt = prompt.replace(/authentic\s+iPhone\s+photo\s+aesthetic/gi, "")
      } else if (!studioProMode) {
        // Remove duplicate "shot on iPhone" mentions (keep only one at the end)
        const iphoneMatches = prompt.match(/(shot\s+on\s+iPhone[^,]*)/gi)
        if (iphoneMatches && iphoneMatches.length > 1) {
          // Remove all iPhone mentions
          prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
          // Add one at the end in the new format
          prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
        }
      }
      
      // Clean up double commas and extra spaces
      prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
      
      concept.prompt = prompt
    })
    
    // Redefine helper functions for this scope (originally defined at lines 2872 and 2868)
    // These are needed here because the previous definitions may be in a different scope
    const isGuidePromptConceptFnLocal = (concept: MayaConcept) => 
      concept.title === 'Your Custom Prompt' && 
      concept.description === 'Using your guide prompt exactly as specified'
    const hasGuidePromptLocal = detectedGuidePrompt && detectedGuidePrompt.trim().length > 0
    
    // Safety check: ensure concepts is an array
    if (!Array.isArray(concepts)) {
      console.error("[v0] ERROR: concepts is not an array in second forEach:", typeof concepts, concepts)
      concepts = []
    }
    
    // Apply minimal cleanup to all concepts (minimalSyntaxCleanup is a top-level helper)
    concepts.forEach((concept, index) => {
      if (concept.prompt) {
        const originalPrompt = concept.prompt
        concept.prompt = minimalSyntaxCleanup(concept.prompt, triggerWord || '')
        
        if (originalPrompt !== concept.prompt) {
          console.log(`[v0] Concept ${index + 1}: Applied minimal syntax cleanup`)
        }
      }
    })

    console.log('[v0] Minimal syntax cleanup complete for all concepts')

    // Add reference image URL if provided
    if (referenceImageUrl) {
      concepts.forEach((concept) => {
        if (!concept.referenceImageUrl) {
          concept.referenceImageUrl = referenceImageUrl
        }
      })
      console.log("[v0] Reference image URL attached to all concepts")
    }

    // Add seeds
    if (mode === "photoshoot") {
      if (photoshootBaseSeed !== null) {
        const baseSeed = photoshootBaseSeed // Type narrowing for closure
        concepts.forEach((concept, index) => {
          if (!concept.customSettings) {
            concept.customSettings = {}
          }
          concept.customSettings.seed = baseSeed + index
        })
      }
    } else {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = Math.floor(Math.random() * 1000000)
      })
    }

    // Apply custom settings
    if (customSettings) {
      concepts.forEach((concept) => {
        concept.customSettings = {
          ...concept.customSettings,
          ...customSettings,
        }
      })
    }

    console.log("[v0] Successfully generated", concepts.length, "sophisticated concepts")


    return NextResponse.json({
      state: "ready",
      concepts: concepts.slice(0, count),
    })
  } catch (error) {
    console.error("[v0] Error generating concepts:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      {
        state: "error",
        message: "I need a bit more direction! What vibe are you going for?",
        error: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 },
    )
  }
}
