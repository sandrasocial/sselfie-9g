import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateText } from "ai"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import { getLifestyleContextIntelligence } from "@/lib/maya/lifestyle-contexts"
import INFLUENCER_POSING_KNOWLEDGE from "@/lib/maya/influencer-posing-knowledge"
import { getNanoBananaPromptingPrinciples } from "@/lib/maya/nano-banana-prompt-builder"
import { detectCategoryAndBrand, getAllTemplatesForCategory, getBrandTemplate, ALL_BRAND_TEMPLATES, SELFIES } from "@/lib/maya/prompt-templates/high-end-brands"
import { BRAND_CATEGORIES } from "@/lib/maya/prompt-templates/high-end-brands/brand-registry"
import type { PromptTemplate, PromptContext } from "@/lib/maya/prompt-templates/types"
import { getConceptPrompt } from "@/lib/maya/concept-templates"
import { 
  AIRPORT_IT_GIRL, 
  AIRPORT_EDITORIAL_WALK, 
  AIRPORT_GOLDEN_HOUR, 
  AIRPORT_FLOOR_SELFIE, 
  AIRPORT_VOGUE_EDITORIAL,
  LUXURY_DESTINATION_WATER,
  LUXURY_DESTINATION_YACHT,
  LUXURY_DESTINATION_BEACH,
  LUXURY_DESTINATION_ROOFTOP,
  LUXURY_DESTINATION_MARINA,
  VENICE_HOTEL_ROOM,
  VENICE_CANAL_GONDOLA,
  VENICE_CAFE,
  THAILAND_TEMPLE,
  THAILAND_ELEPHANT,
  THAILAND_BOAT,
  THAILAND_INFINITY_POOL,
  THAILAND_ISLANDS
} from "@/lib/maya/prompt-templates/high-end-brands/travel-lifestyle"
import {
  CHRISTMAS_COZY_LUXURY,
  CHRISTMAS_PINTEREST_EDITORIAL,
  CHRISTMAS_ELEGANT_EVENING,
  CHRISTMAS_WHITE_MINIMAL,
  CHRISTMAS_MORNING_COZY,
  CHRISTMAS_HOLIDAY_SHOPPING,
  CHRISTMAS_ELEGANT_DINNER,
  CHRISTMAS_WINTER_WHITE,
  CHRISTMAS_FIRESIDE_READING,
  CHRISTMAS_HOLIDAY_BAKING,
  CHRISTMAS_NYE_ELEGANCE,
  CHRISTMAS_WINTER_OUTDOOR,
  CHRISTMAS_GIFT_WRAPPING,
  CHRISTMAS_TRAVEL_READY,
  CHRISTMAS_VELVET_ELEGANCE,
  CHRISTMAS_SNOW_DAY
} from "@/lib/maya/prompt-templates/high-end-brands/seasonal-christmas"
import {
  shouldIncludeSkinTexture,
  mergeGuidePromptWithImages,
  extractPromptElements,
  createVariationFromGuidePrompt,
  type ReferenceImages
} from "@/lib/maya/prompt-builders/guide-prompt-handler"
import { minimalCleanup } from "@/lib/maya/post-processing/minimal-cleanup"
import { SHARED_MAYA_PERSONALITY } from "@/lib/maya/personality/shared-personality"

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
}

// Guide prompt handler functions are now imported from lib/maya/prompt-builders/guide-prompt-handler.ts

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Generate concepts API called")

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
    } = body

    // 🔴 CRITICAL: Auto-detect detailed prompts as guide prompts if not explicitly provided
    // If user provides a detailed prompt (100+ chars with specific details), treat it as a guide prompt
    // PRIORITY: userRequest > guidePrompt (explicit) > conversationContext (old)
    let detectedGuidePrompt = null
    let hasNewUserRequest = false
    
    // First, check if userRequest should be the guide prompt (highest priority)
    if (userRequest) {
      const userRequestLength = userRequest.trim().length
      // Check if it's a detailed prompt (has specific details like outfit, location, pose, lighting, camera specs)
      const hasDetailedElements = /(?:wearing|outfit|dressed|seated|standing|sitting|holding|hair|bun|expression|lighting|light|50mm|85mm|lens|f\/|depth of field|skin texture|pores|setting|scene|location|background|tree|fireplace|sofa|room)/i.test(userRequest)
      const hasMultipleSentences = (userRequest.match(/[.!?]\s+/g) || []).length >= 2
      const hasSpecificDetails = userRequestLength > 100 && (hasDetailedElements || hasMultipleSentences)
      
      if (hasSpecificDetails) {
        detectedGuidePrompt = userRequest.trim()
        hasNewUserRequest = true
        console.log("[v0] ✅ Auto-detected detailed prompt as guide prompt (length:", detectedGuidePrompt.length, "chars)")
      } else if (userRequestLength > 20) {
        // User provided a substantial request (even if not detailed enough for guide prompt)
        // This indicates they want something NEW, not to continue with old guide prompt
        hasNewUserRequest = true
        console.log("[v0] ✅ User provided new request (length:", userRequestLength, "chars) - will NOT use old guide prompt from conversation")
      }
    }
    
    // Second, use explicitly provided guidePrompt if no userRequest guide prompt was detected
    if (!detectedGuidePrompt && guidePrompt) {
      detectedGuidePrompt = guidePrompt
      console.log("[v0] ✅ Using explicitly provided guide prompt (length:", guidePrompt.length, "chars)")
    }
    
    // 🔴 CRITICAL: Only extract guide prompt from conversationContext if:
    // 1. No new userRequest was provided, OR
    // 2. The userRequest is a continuation/refinement of the old guide prompt (mentions similar elements)
    // This prevents old guide prompts from persisting when user asks for something different
    if (!detectedGuidePrompt && conversationContext && !hasNewUserRequest) {
      const guidePromptMatch = conversationContext.match(/\[GUIDE_PROMPT_TEXT:\s*([^\]]+)\]/i)
      if (guidePromptMatch && guidePromptMatch[1]) {
        detectedGuidePrompt = guidePromptMatch[1].trim()
        console.log("[v0] ✅ Extracted guide prompt from conversation context (length:", detectedGuidePrompt.length, "chars)")
      }
    } else if (conversationContext && hasNewUserRequest && !detectedGuidePrompt) {
      // User provided new request - check if they're asking to continue/refine the old guide prompt
      const guidePromptMatch = conversationContext.match(/\[GUIDE_PROMPT_TEXT:\s*([^\]]+)\]/i)
      if (guidePromptMatch && guidePromptMatch[1]) {
        const oldGuidePrompt = guidePromptMatch[1].trim()
        // Check if new request is a continuation/refinement (mentions similar elements)
        const userRequestLower = (userRequest || "").toLowerCase()
        const oldGuideLower = oldGuidePrompt.toLowerCase()
        
        // Extract key elements from old guide prompt
        const oldHasOutfit = /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(oldGuidePrompt)
        const oldHasLocation = /(?:tree|sofa|fireplace|room|setting|scene|location|background)/i.test(oldGuidePrompt)
        const newMentionsOutfit = oldHasOutfit && /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(userRequest || "")
        const newMentionsLocation = oldHasLocation && /(?:tree|sofa|fireplace|room|setting|scene|location|background)/i.test(userRequest || "")
        
        // If new request mentions similar elements, it might be a refinement - use old guide prompt
        // Otherwise, treat it as a NEW request and don't use old guide prompt
        if (newMentionsOutfit || newMentionsLocation) {
          detectedGuidePrompt = oldGuidePrompt
          console.log("[v0] ✅ User request appears to be refinement of old guide prompt - using old guide prompt")
        } else {
          console.log("[v0] ✅ User provided NEW request that doesn't match old guide prompt - ignoring old guide prompt")
        }
      }
    }

    console.log("[v0] Generating concepts:", {
      userRequest,
      aesthetic,
      mode,
      count,
      studioProMode,
      enhancedAuthenticity,
      hasConversationContext: !!conversationContext,
      hasReferenceImage: !!referenceImageUrl,
      hasGuidePrompt: !!detectedGuidePrompt,
      guidePromptLength: detectedGuidePrompt?.length || 0,
      referenceImageUrl: referenceImageUrl ? referenceImageUrl.substring(0, 100) + "..." : undefined,
    })

    // Detect environment
    const host = req.headers.get("host") || ""
    const isProduction = host === "sselfie.ai" || host === "www.sselfie.ai"
    const isPreview = host.includes("vercel.app") || host.includes("v0.dev") || host.includes("vusercontent.net")

    console.log("[v0] Environment:", isPreview ? "Preview" : isProduction ? "Production" : "Development")

    // Get user data
    let userGender = "person"
    let userEthnicity = null
    let physicalPreferences = null
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)

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
        model: "anthropic/claude-sonnet-4-20250514",
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
    }

    // Generate photoshoot seed if needed
    let photoshootBaseSeed = null
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
    
    // Detect brand/category intent from user request + aesthetic + context.
    // This is a best-effort enhancement; failures should never break concept generation.
    let brandGuidance = ""
    let templateExamples: string[] = []
    
    try {
      const brandDetectionText = `${userRequest || ""} ${aesthetic || ""} ${context || ""} ${conversationContext || ""}`.trim()
      const brandIntent = detectCategoryAndBrand(brandDetectionText)

      // If high confidence brand match, enhance system prompt with brand-specific guidance
      if (brandIntent.confidence >= 0.7 && brandIntent.suggestedBrands.length > 0) {
        const brand = brandIntent.suggestedBrands[0] as any
        const commonElements: string[] = brand?.visuals?.commonElements || []
        const avoidElements: string[] = brand?.visuals?.avoid || []

        brandGuidance = `

=== 🔴 DETECTED BRAND STYLE: ${brand.name} ===

**MANDATORY: You MUST include the brand name "${brand.name}" in EVERY prompt you generate.**

**Brand Name Inclusion Examples:**
- "Vertical 2:3 photo in UGC influencer style from ${brand.name} captured in movement..."
- "${brand.name} brand outfit clearly visible with subtle logo integration."
- "Official campaign of the ${brand.name} brand"
- "Wearing ${brand.name} [outfit description]..."
- "${brand.name} aesthetic" or "${brand.name} style"

**Visual Aesthetic:**
${JSON.stringify(brand.aesthetic, null, 2)}

**Style Guide:**
${JSON.stringify(brand.visuals, null, 2)}

**Common Elements to Include:**
${commonElements.join(", ")}

**Elements to Avoid:**
${avoidElements.join(", ")}

**CRITICAL REQUIREMENTS:**
1. **ALWAYS mention "${brand.name}" by name** in the opening line or early in the prompt
2. Match this brand's photography style, composition, and mood exactly
3. Each concept prompt should feel like official ${brand.name} content
4. Include brand-specific elements (logos, styling, aesthetic markers)
5. Use brand-appropriate language and terminology

**Example Prompt Structure:**
"Vertical 2:3 photo in UGC influencer style from ${brand.name} captured in movement. Woman, maintaining exactly the characteristics of the woman in the attachment (face, body, skin tone, hair and visual identity), without copying the photo. ${brand.name} brand outfit clearly visible with subtle logo integration..."
`
      }
      
      // Load templates and generate example prompts (Studio Pro mode only)
      // 🔴 CRITICAL: Skip template loading when guide prompt is active - guide prompt takes absolute priority
      if (studioProMode && !detectedGuidePrompt) {
        const relevantTemplates: PromptTemplate[] = []
        
        // 🔴 CRITICAL: Check if we have an explicit category from upload module
        // referenceImages can be { selfies, products, styleRefs, userDescription, category, concept }
        const uploadModuleCategory = (referenceImages as any)?.category
        console.log("[v0] Upload module category:", uploadModuleCategory, "referenceImages keys:", referenceImages ? Object.keys(referenceImages) : "none")
        
        // Map upload module categories to template categories and load templates directly
        if (uploadModuleCategory) {
          // Map upload module categories to template loading logic
          const categoryMap: Record<string, () => PromptTemplate[]> = {
            "brand-content": () => {
              // Load wellness/athletic brand templates
              const templates: PromptTemplate[] = []
              // Try to get Alo, Lululemon templates
              const aloTemplate = getBrandTemplate("ALO")
              const luluTemplate = getBrandTemplate("LULULEMON")
              if (aloTemplate) templates.push(aloTemplate)
              if (luluTemplate) templates.push(luluTemplate)
              // Also get all wellness category templates
              try {
                const wellnessTemplates = getAllTemplatesForCategory(BRAND_CATEGORIES.wellness)
                templates.push(...wellnessTemplates)
              } catch (e) {
                console.log("[v0] Could not load wellness templates:", e)
              }
              return templates
            },
            "beauty-self-care": () => {
              const templates: PromptTemplate[] = []
              // Get Glossier and beauty brand templates
              const glossierTemplate = getBrandTemplate("GLOSSIER")
              if (glossierTemplate) templates.push(glossierTemplate)
              // Get all beauty category templates
              try {
                const beautyTemplates = getAllTemplatesForCategory(BRAND_CATEGORIES.beauty)
                templates.push(...beautyTemplates)
              } catch (e) {
                console.log("[v0] Could not load beauty templates:", e)
              }
              return templates
            },
            "travel-lifestyle": () => {
              // Load all travel-lifestyle templates
              return [
                AIRPORT_IT_GIRL,
                AIRPORT_EDITORIAL_WALK,
                AIRPORT_GOLDEN_HOUR,
                AIRPORT_FLOOR_SELFIE,
                AIRPORT_VOGUE_EDITORIAL,
                LUXURY_DESTINATION_WATER,
                LUXURY_DESTINATION_YACHT,
                LUXURY_DESTINATION_BEACH,
                LUXURY_DESTINATION_ROOFTOP,
                LUXURY_DESTINATION_MARINA,
                VENICE_HOTEL_ROOM,
                VENICE_CANAL_GONDOLA,
                VENICE_CAFE,
                THAILAND_TEMPLE,
                THAILAND_ELEPHANT,
                THAILAND_BOAT,
                THAILAND_INFINITY_POOL,
                THAILAND_ISLANDS
              ]
            },
            "luxury-travel": () => {
              // Load luxury travel destination templates
              return [
                LUXURY_DESTINATION_WATER,
                LUXURY_DESTINATION_YACHT,
                LUXURY_DESTINATION_BEACH,
                LUXURY_DESTINATION_ROOFTOP,
                LUXURY_DESTINATION_MARINA,
                VENICE_HOTEL_ROOM,
                VENICE_CANAL_GONDOLA,
                VENICE_CAFE,
                THAILAND_TEMPLE,
                THAILAND_ELEPHANT,
                THAILAND_BOAT,
                THAILAND_INFINITY_POOL,
                THAILAND_ISLANDS
              ]
            },
            "seasonal-holiday": () => {
              // Load all Christmas templates
              return [
                CHRISTMAS_COZY_LUXURY,
                CHRISTMAS_PINTEREST_EDITORIAL,
                CHRISTMAS_ELEGANT_EVENING,
                CHRISTMAS_WHITE_MINIMAL,
                CHRISTMAS_MORNING_COZY,
                CHRISTMAS_HOLIDAY_SHOPPING,
                CHRISTMAS_ELEGANT_DINNER,
                CHRISTMAS_WINTER_WHITE,
                CHRISTMAS_FIRESIDE_READING,
                CHRISTMAS_HOLIDAY_BAKING,
                CHRISTMAS_NYE_ELEGANCE,
                CHRISTMAS_WINTER_OUTDOOR,
                CHRISTMAS_GIFT_WRAPPING,
                CHRISTMAS_TRAVEL_READY,
                CHRISTMAS_VELVET_ELEGANCE,
                CHRISTMAS_SNOW_DAY
              ]
            },
            "fashion-editorial": () => {
              const templates: PromptTemplate[] = []
              // Get Chanel and fashion brand templates
              const chanelTemplate = getBrandTemplate("CHANEL")
              if (chanelTemplate) templates.push(chanelTemplate)
              // Get all fashion category templates
              try {
                const fashionTemplates = getAllTemplatesForCategory(BRAND_CATEGORIES.fashion)
                templates.push(...fashionTemplates)
              } catch (e) {
                console.log("[v0] Could not load fashion templates:", e)
              }
              return templates
            },
            "tech-work": () => {
              // Get tech category templates
              try {
                return getAllTemplatesForCategory(BRAND_CATEGORIES.tech)
              } catch (e) {
                console.log("[v0] Could not load tech templates:", e)
                return []
              }
            },
            "wellness-content": () => {
              const templates: PromptTemplate[] = []
              // Get Alo, Lululemon templates
              const aloTemplate = getBrandTemplate("ALO")
              const luluTemplate = getBrandTemplate("LULULEMON")
              if (aloTemplate) templates.push(aloTemplate)
              if (luluTemplate) templates.push(luluTemplate)
              // Get all wellness category templates
              try {
                const wellnessTemplates = getAllTemplatesForCategory(BRAND_CATEGORIES.wellness)
                templates.push(...wellnessTemplates)
              } catch (e) {
                console.log("[v0] Could not load wellness templates:", e)
              }
              return templates
            },
            "selfie-styles": () => {
              // Get selfie templates - SELFIES is an object, convert to array
              try {
                const selfieTemplates = Object.values(SELFIES).filter((t): t is PromptTemplate => 
                  t !== null && typeof t === 'object' && 'id' in t
                )
                return selfieTemplates
              } catch (e) {
                console.log("[v0] Could not load selfie templates:", e)
                return []
              }
            },
          }
          
          const loadTemplates = categoryMap[uploadModuleCategory]
          if (loadTemplates) {
            const templates = loadTemplates()
            relevantTemplates.push(...templates)
            console.log("[v0] Loaded", templates.length, "templates for upload module category:", uploadModuleCategory)
          }
        }
        
        // Fallback: Use brand detection if no explicit category from upload module
        if (relevantTemplates.length === 0) {
          // 1. Load brand-specific template if detected
          if (brandIntent.confidence >= 0.7 && brandIntent.suggestedBrands.length > 0) {
            const brand = brandIntent.suggestedBrands[0] as any
            const brandTemplate = getBrandTemplate(brand.id)
            if (brandTemplate) {
              relevantTemplates.push(brandTemplate)
            }
          }
          
          // 2. Load category templates
          try {
            const categoryTemplates = getAllTemplatesForCategory(brandIntent.category)
            relevantTemplates.push(...categoryTemplates)
          } catch (categoryError) {
            console.log("[v0] Could not load category templates:", categoryError)
          }
          
          // 3. Load travel-lifestyle templates if travel-related
          const isTravelRelated = /airport|travel|terminal|boarding|lounge|flight|suitcase|luggage|destination|venice|thailand|tropical|beach|yacht|marina|rooftop/i.test(brandDetectionText)
          if (isTravelRelated || brandIntent.category.key === "travel_lifestyle") {
            const travelTemplates: PromptTemplate[] = [
              AIRPORT_IT_GIRL,
              AIRPORT_EDITORIAL_WALK,
              AIRPORT_GOLDEN_HOUR,
              AIRPORT_FLOOR_SELFIE,
              AIRPORT_VOGUE_EDITORIAL,
              LUXURY_DESTINATION_WATER,
              LUXURY_DESTINATION_YACHT,
              LUXURY_DESTINATION_BEACH,
              LUXURY_DESTINATION_ROOFTOP,
              LUXURY_DESTINATION_MARINA,
              VENICE_HOTEL_ROOM,
              VENICE_CANAL_GONDOLA,
              VENICE_CAFE,
              THAILAND_TEMPLE,
              THAILAND_ELEPHANT,
              THAILAND_BOAT,
              THAILAND_INFINITY_POOL,
              THAILAND_ISLANDS
            ]
            relevantTemplates.push(...travelTemplates)
          }
          
          // 4. Load seasonal Christmas templates if Christmas/holiday-related
          const isChristmasRelated = /christmas|holiday|santa|december|november|winter.*holiday|christmas.*tree|fireplace.*christmas|holiday.*cozy|christmas.*decor|gift.*wrapping|christmas.*baking|new.*year.*eve|nye|christmas.*eve/i.test(brandDetectionText)
          if (isChristmasRelated) {
            const christmasTemplates: PromptTemplate[] = [
              CHRISTMAS_COZY_LUXURY,
              CHRISTMAS_PINTEREST_EDITORIAL,
              CHRISTMAS_ELEGANT_EVENING,
              CHRISTMAS_WHITE_MINIMAL,
              CHRISTMAS_MORNING_COZY,
              CHRISTMAS_HOLIDAY_SHOPPING,
              CHRISTMAS_ELEGANT_DINNER,
              CHRISTMAS_WINTER_WHITE,
              CHRISTMAS_FIRESIDE_READING,
              CHRISTMAS_HOLIDAY_BAKING,
              CHRISTMAS_NYE_ELEGANCE,
              CHRISTMAS_WINTER_OUTDOOR,
              CHRISTMAS_GIFT_WRAPPING,
              CHRISTMAS_TRAVEL_READY,
              CHRISTMAS_VELVET_ELEGANCE,
              CHRISTMAS_SNOW_DAY
            ]
            relevantTemplates.push(...christmasTemplates)
            console.log("[v0] Loaded", christmasTemplates.length, "Christmas templates")
          }
        }
        
        // 5. Generate example prompts from templates (limit to 8-10 examples)
        const maxExamples = 10
        const selectedTemplates = relevantTemplates.slice(0, maxExamples)
        
        for (const template of selectedTemplates) {
          try {
            const exampleContext: PromptContext = {
              userImages: referenceImages ? [
                ...(referenceImages.selfies || []).map(url => ({ url, type: 'user_lora' as const })),
                ...(referenceImages.products || []).map(url => ({ url, type: 'product' as const })),
                ...(referenceImages.styleRefs || []).map(url => ({ url, type: 'inspiration' as const }))
              ] : [],
              contentType: "concept",
              userIntent: userRequest || ""
            }
            
            const examplePrompt = template.promptStructure(exampleContext)
            templateExamples.push(examplePrompt)
          } catch (templateError) {
            console.log("[v0] Error generating example from template:", template.id, templateError)
          }
        }
        
        console.log("[v0] Template loading summary:", {
          uploadModuleCategory,
          templatesLoaded: relevantTemplates.length,
          examplesGenerated: templateExamples.length,
          templateIds: relevantTemplates.map(t => t.id).slice(0, 5)
        })
      }
      
    } catch (brandError) {
      console.error("[v0] Error during brand detection and template loading:", brandError)
      // Intentionally swallow errors here to avoid breaking concept generation.
    }
    
    // Fallback: If no templates loaded but in Studio Pro mode, try to load generic templates
    if (studioProMode && templateExamples.length === 0) {
      try {
        const brandDetectionText = `${userRequest || ""} ${aesthetic || ""} ${context || ""} ${conversationContext || ""}`.trim()
        const brandIntent = detectCategoryAndBrand(brandDetectionText)
        
        // Try to load any available templates from the category
        try {
          const categoryTemplates = getAllTemplatesForCategory(brandIntent.category)
          const fallbackTemplates = categoryTemplates.slice(0, 5) // Limit to 5 for fallback
          
          for (const template of fallbackTemplates) {
            try {
              const exampleContext: PromptContext = {
                userImages: referenceImages ? [
                  ...(referenceImages.selfies || []).map(url => ({ url, type: 'user_lora' as const })),
                  ...(referenceImages.products || []).map(url => ({ url, type: 'product' as const })),
                  ...(referenceImages.styleRefs || []).map(url => ({ url, type: 'inspiration' as const }))
                ] : [],
                contentType: "concept",
                userIntent: userRequest || ""
              }
              
              const examplePrompt = template.promptStructure(exampleContext)
              templateExamples.push(examplePrompt)
            } catch (templateError) {
              console.log("[v0] Error generating fallback example from template:", template.id, templateError)
            }
          }
          
          if (templateExamples.length > 0) {
            console.log("[v0] Loaded", templateExamples.length, "fallback template examples")
          }
        } catch (fallbackError) {
          console.log("[v0] Could not load fallback templates:", fallbackError)
        }
      } catch (fallbackError) {
        console.log("[v0] Fallback template loading failed:", fallbackError)
      }
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
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: trendResearchPrompt,
          },
        ],
        maxTokens: 500,
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

    // Use shared personality from module
    const conceptPrompt = `${SHARED_MAYA_PERSONALITY.core}

${SHARED_MAYA_PERSONALITY.languageRules}

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

${detectedGuidePrompt ? `\n${SHARED_MAYA_PERSONALITY.guidePromptPriority}

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
${brandGuidance}

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

=== NATURAL POSING REFERENCE ===
Use this for inspiration on authentic, Instagram-style poses. These are REAL influencer poses that look natural and candid:

${INFLUENCER_POSING_KNOWLEDGE}

Remember: Describe poses SIMPLY and NATURALLY, like you're telling a friend what someone is doing. Avoid technical photography language.
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

**🔴 CRITICAL: OUTFIT VARIATION RULE (ONLY WHEN NOT USING GUIDE PROMPT):**
- **This rule ONLY applies when there is NO guide prompt**
- **If guide prompt is active:** Use the EXACT same outfit, hair, location, lighting from guide prompt (see guide prompt section above)
- **If NO guide prompt:** VARY outfits across concepts - each concept should have a DIFFERENT outfit that fits the theme
- **ONLY use the SAME outfit if:** User explicitly asks for "same outfit" or "cohesive story" or creating a "carousel" or "photoshoot"
- **Example (NO guide prompt):** If creating 6 airport travel concepts, use DIFFERENT outfits (e.g., concept 1: "cream cashmere turtleneck and tailored trousers", concept 2: "oversized blazer with fitted tank and leather trousers", concept 3: "chunky sweater with wide-leg pants", etc.)
- **Vary:** Outfits, scenes, poses, lighting, and locations - create diverse, interesting concepts
- **This creates variety** - like a real influencer showing different looks in different settings`
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
- If the reference image is BLACK & WHITE or MONOCHROME → EVERY prompt MUST include "black and white" or "monochrome" - this is MANDATORY
- If the reference image is a STUDIO shot → Use "studio lighting" or "professional studio lighting" - NOT "uneven natural lighting" or "iPhone"
- If the reference image is EDITORIAL/HIGH-FASHION → Use professional camera specs, dramatic lighting, NOT "shot on iPhone" or "amateur cellphone photo"
- If the reference image shows professional photography → Use "shot on professional camera" or "DSLR" - NOT "shot on iPhone 15 Pro"
- The reference image's aesthetic (B&W, studio, editorial) OVERRIDES default requirements
- Match the EXACT lighting style, color treatment, and camera quality shown in the reference image
- If reference is B&W → DO NOT add "muted colors" - use "black and white" or "monochrome" instead
- If reference is studio → DO NOT add "uneven natural lighting" - use the studio lighting style shown
- If reference is editorial → DO NOT add "candid photo" or "amateur cellphone photo" - use professional photography terms

Capture this EXACT vibe - the styling, mood, lighting, color treatment, and composition must match the reference image.`
    : ""
}

${
  templateExamples.length > 0 && studioProMode && !detectedGuidePrompt
    ? `
=== PROMPT TEMPLATE EXAMPLES ===

**These example prompts are your reference. Follow their structure, style, and format.**

**Rules:**
1. Copy the structure - use the same sections, same organization, same headers as these examples
2. Copy the style - match the tone, language, and level of detail
3. Copy the format - same layout, same sections, same organization
4. Do not add "black and white" unless the example explicitly includes it
5. Do not change camera specs - use the same camera specs format as the examples (e.g., "50mm lens" not "85mm lens, f/2.0")
6. Do not change outfit descriptions - match the style and detail level of outfit descriptions in examples
7. Do not change lighting descriptions - match the lighting style and detail level
8. These examples guide your prompts - follow their approach

**EXAMPLE PROMPTS (${templateExamples.length} examples) - STUDY THESE CAREFULLY:**

${templateExamples.map((ex, i) => `**Example ${i + 1} (FOLLOW THIS EXACT STRUCTURE):**
${ex}

---`).join('\n\n')}

**🔴🔴🔴 ABSOLUTE REQUIREMENTS (NO EXCEPTIONS):**
1. **Your prompts MUST have the SAME structure** as these examples (same sections, same headers, same organization)
2. **Your prompts MUST use the SAME style** - copy the tone, language, and phrasing style
3. **Your prompts MUST use the SAME level of detail** - don't make them shorter or longer
4. **Your prompts MUST match the SAME format** - same layout, same section headers
5. **DO NOT add "black and white"** unless the example shows it
6. **DO NOT change camera specs** - use the same format as examples (e.g., "50mm lens" or "35-50mm lens")
7. **DO NOT change outfit descriptions** - match the style and detail level
8. **DO NOT change lighting descriptions** - match the style exactly
9. **DO NOT deviate from these examples** - they override ALL other instructions in this prompt

**If your generated prompts don't match these examples in structure, style, format, and content, they will be REJECTED.**

**Remember: These examples are your TEMPLATE. Copy their structure and style exactly.**
`
    : ""
}

${
  studioProMode
    ? `=== YOUR NANO BANANA PRO PROMPTING MASTERY ===

${getNanoBananaPromptingPrinciples()}

**For Nano Banana Pro:**
- No trigger words (Nano Banana doesn't use LoRA trigger words)
- Natural language descriptions (50-80 words optimal)
- Focus on scene composition, mood, and visual storytelling
- Include brand context and user preferences naturally
- Professional quality descriptions (not iPhone/cellphone photo style)
- Rich, detailed scene descriptions with lighting, environment, and mood

${
  templateExamples.length > 0
    ? `
**Template Examples:**
- You have ${templateExamples.length} template examples above - use these as your reference
- Follow the structure, style, format, camera specs, outfits, lighting from the template examples
- Do not use "85mm lens, f/2.0" unless the template examples show it - use the camera specs format from examples
- Do not add "black and white" unless the template examples show it
- Follow the template examples - they guide your prompt structure
`
    : ""
}`
    : `=== YOUR FLUX PROMPTING MASTERY ===

${getFluxPromptingPrinciples()}`
}

=== RULES FOR THIS GENERATION ===

**System Rules:**
- Include hair color/style as safety net guidance even if LoRA should know it - mention key features (hair color/style, distinctive traits) concisely as a safety net
- User's physical preferences from settings are mandatory - never remove them. If user specified "keep my natural hair color", convert to "natural hair color" (preserve intent)
${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples) ? `- Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed. Include natural skin texture with pores visible.` : `- Skin texture: Only include if specified in user prompt, guide prompt, or templates - do not add automatically.`}

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
- Include them right after the gender/ethnicity descriptor as descriptive features, not instructions
- Format: "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}, [descriptive appearance features from user preferences], [rest of prompt]"
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
    : `1. **Start with:** "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}"

   **Trigger word placement:**
   - Trigger word must be the first word in every prompt
   - This is required for character likeness preservation
   - Format: "${triggerWord}, [rest of prompt]"`
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

4. **Natural Skin Texture (only if in user prompt, guide prompt, or templates):** 
   ${
     shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples)
       ? studioProMode
         ? `- Nano Banana Pro: Include natural, realistic skin texture
   - "Natural skin texture", "realistic appearance", "authentic look"
   - Professional quality but not overly processed
   - Avoid "airbrushed", "plastic", "smooth" descriptors`
         : `- Include "natural skin texture with pores visible, not smooth or airbrushed, not plastic-looking, realistic texture"
   - Include natural imperfection phrases: "visible pores", "natural skin texture", "subtle imperfections", "not airbrushed", "not plastic-looking", "realistic texture", "organic skin texture"
   - Include anti-plastic phrases: "not smooth", "not airbrushed", "not plastic-looking", "realistic texture", "natural imperfections"
   - This prevents AI-looking, plastic images. Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed.`
       : `- Skip: Skin texture not found in user prompt, guide prompt, or templates - do not add skin texture requirements`
   }

5. **Film Grain and Color Treatment (CONDITIONAL - Based on Reference Image/User Request):**
   - **IF reference image is BLACK & WHITE or MONOCHROME OR user requests B&W:** MUST include "black and white" or "monochrome" - DO NOT add "muted colors"
   - **IF reference image shows vibrant/editorial colors OR user requests vibrant/editorial:** Use appropriate color description (vibrant, editorial, etc.) - NOT "muted colors"
   - **IF no specific request AND no reference image:** Include "film grain" and "muted colors" for authentic iPhone aesthetic
   ${enhancedAuthenticity && !studioProMode ? `
   - **ENHANCED AUTHENTICITY MODE (ON):** When this mode is enabled, you MUST include:
     * **More muted colors:** Use "heavily muted colors", "desaturated color palette", "muted tones" (stronger than normal)
     * **More iPhone quality:** Emphasize "amateur cellphone photo", "raw iPhone photo", "authentic iPhone camera quality"
     * **More film grain:** Use "visible film grain", "prominent film grain", "grainy texture" (stronger than normal)
     * These keywords help prevent plastic/fake-looking images by emphasizing authentic, phone-camera aesthetic
   ` : ''}
   - Keep prompts detailed (30-60 words, target 40-55) for better LoRA activation

6. **NO Natural Imperfections Lists:** Do NOT include lists of imperfections like "visible sensor noise", "slight motion blur", etc. Keep camera specs basic, but ALWAYS include natural skin texture requirements above.

11. **Prompt Length:** ${
  studioProMode
    ? `50-80 words (optimal for Nano Banana Pro - rich scene descriptions with detail)`
    : `30-60 words (optimal range 40-55 for LoRA activation and accurate character representation, with room for safety net descriptions)`
}

12. **NO BANNED WORDS:** Never use "ultra realistic", "photorealistic", "8K", "4K", "high quality", "perfect", "flawless", "stunning", "beautiful", "gorgeous", "professional photography", "editorial", "magazine quality", "dramatic" (for lighting), "cinematic", "hyper detailed", "sharp focus", "ultra sharp", "crystal clear", "studio lighting", "perfect lighting", "smooth skin", "flawless skin", "airbrushed" - these cause plastic/generic faces and override the user LoRA.

9. Apply the OUTFIT PRINCIPLE with your FASHION INTELLIGENCE - no boring defaults
10. Apply the EXPRESSION PRINCIPLE for authentic facial details (expressions, not fixed features)
11. Apply the POSE PRINCIPLE for natural body positioning
12. Apply the LOCATION PRINCIPLE for evocative settings
13. Apply the LIGHTING PRINCIPLE for realistic, authentic lighting (NO idealized terms)

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
    : `1. **TRIGGER WORD** (first position - MANDATORY)
2. **GENDER/ETHNICITY** (2-3 words)
3. **OUTFIT** (material + color + garment type - 8-12 words, stay detailed here)
4. **LOCATION** (simple, one-line - 3-5 words, keep brief)
5. **LIGHTING** (realistic, authentic - 3-6 words, NO idealized terms like "soft afternoon sunlight" or "warm golden hour")
6. **POSE + EXPRESSION** (simple, natural action - 3-5 words, NO "striking poses")
7. **TECHNICAL SPECS** (basic iPhone only - 5-8 words, keep minimal)
8. **No text overlay**
   - Do not include any text overlay instructions, sections, or mentions
   - Do not include: "TEXT OVERLAY:", "text placement:", "font size:", "text color:", "text overlay reading", "text positioned", or any text-related instructions
   - This is a regular concept card - it should be a pure lifestyle/brand photo with no text
   - Only include text overlays if: workflowType is explicitly "carousel-slides", "reel-cover", or "text-overlay" (which it is not for default concept cards)
   - If workflowType is null/undefined/default (which it is for regular concept cards): No text overlays
   - The prompt should end after camera specs and natural skin texture - no text overlay section

**Total target: 30-60 words (optimal 40-55) for optimal LoRA activation and accurate character representation, with room for safety net descriptions**
`
}

**If any requirement is missing, the prompt may produce AI-looking results.**

=== YOUR CREATIVE MISSION ===

You are NOT filling templates. You are SYNTHESIZING unique photographic moments by applying your fashion intelligence and prompting principles to this specific user request.

For each concept:
- What would this SPECIFIC person wear in this SPECIFIC moment? (Use your fashion intelligence, not defaults)
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
        : `YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, NO instruction phrases like 'dont change' or 'keep my']` : ""}`
    }"
  }
]
`
    : `Return ONLY valid JSON array, no markdown:
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
        : `YOUR CRAFTED FLUX PROMPT - synthesized from principles, MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, NO instruction phrases like 'dont change' or 'keep my']` : ""}`
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
${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples) ? `- **MUST include:** Natural skin texture (e.g., "natural skin texture with visible pores" - in proper location, not at end)` : `- **Skin texture:** Only include if specified in user prompt, guide prompt, or templates - do NOT add automatically`}
- **🔴 CRITICAL: DO NOT include any TEXT OVERLAY instructions - this is a brand scene, not a carousel or reel cover**
- **🔴 CRITICAL: DO NOT add "black and white" unless user explicitly requested it**
- **🔴 CRITICAL: DO NOT add "with visible pores" at the end - format as "natural skin texture with visible pores"**

Now create ${count} brand scene concepts with natural product/brand integration. Use the SAME outfit across all concepts. NO TEXT OVERLAYS.`
    : `Now apply your fashion intelligence and prompting mastery. Create ${count} concepts where every outfit choice is intentional and story-driven.

**Requirements:**

${detectedGuidePrompt ? `**Outfit Consistency (Guide Prompt Mode):** Use the same outfit from the guide prompt across all ${count} concepts - maintain outfit consistency, only vary poses/angles/moments/expressions.` : `**Outfit Variation:** Vary outfits across all ${count} concepts - each concept should have a different outfit that fits the theme (unless user explicitly asks for "same outfit" or "cohesive story" or creating a "carousel")`}

**Lighting:** Include lighting description in every prompt (e.g., "soft natural window light", "warm ambient lighting", "mixed color temperatures")

**Camera Specs:** Include camera specs in every prompt (e.g., "professional photography, 85mm lens, f/2.0 depth of field")

${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples) ? `**Skin Texture:** Include "natural skin texture with visible pores" (in proper location, not "with visible pores" at the end)` : `**Skin Texture:** Only include if specified in user prompt, guide prompt, or templates - do not add automatically`}

**Text Overlay Rules:**
- This is a regular concept card (not a carousel or reel cover)
- Do not include any text overlay instructions, sections, or mentions
- Do not include: "TEXT OVERLAY:", "text placement:", "font size:", "text color:", or any text-related instructions
- This should be a pure lifestyle/brand photo with no text
- Only include text overlays if workflowType is explicitly "carousel-slides", "reel-cover", or "text-overlay" (which it is not in this case)
- The prompt should end after camera specs and natural skin texture - no text overlay section

**B&W Rules:**
- Do not add "black and white" unless user explicitly requested it
- Only add B&W if user specifically asks for it or reference images clearly show B&W`
}`

    console.log("[v0] Calling generateText for concept generation")

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content: conceptPrompt,
        },
      ],
      maxTokens: 4096,
      temperature: 0.85, // Restored from 0.75 for more creative, varied concept generation
    })

    console.log("[v0] Generated concept text (first 300 chars):", text.substring(0, 300))

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("No JSON array found in response")
    }

    let concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

    // 🔴 CRITICAL: If guide prompt is provided (explicit or auto-detected), use it for concept #1 and create variations for 2-6
    if (detectedGuidePrompt && detectedGuidePrompt.trim().length > 0 && concepts.length > 0) {
      console.log("[v0] 📋 Using guide prompt for concept #1, creating variations for concepts 2-6")
      
      // Concept #1: Use guide prompt EXACTLY (but merge with user's image references)
      const guidePromptWithImages = mergeGuidePromptWithImages(detectedGuidePrompt, referenceImages, studioProMode)
      concepts[0].prompt = guidePromptWithImages
      console.log("[v0] ✅ Concept #1 uses guide prompt (length:", guidePromptWithImages.length, "chars)")
      
      // Extract key elements from guide prompt for variations
      const baseElements = extractPromptElements(detectedGuidePrompt)
      
      // Concepts 2-6: Create variations maintaining consistency
      // 🔴 CRITICAL: Always override Maya's generated concepts with guide prompt variations
      for (let i = 1; i < Math.min(concepts.length, 6); i++) {
        const variationNumber = i + 1
        const variationPrompt = createVariationFromGuidePrompt(
          detectedGuidePrompt,
          baseElements,
          variationNumber,
          referenceImages,
          studioProMode
        )
        console.log("[v0] ✅ Concept #" + variationNumber + " created as variation")
        console.log("[v0] 📝 Variation prompt (first 200 chars):", variationPrompt.substring(0, 200) + "...")
        console.log("[v0] 📝 Variation prompt (full length):", variationPrompt.length, "chars")
        
        // 🔴 CRITICAL: Always override Maya's generated prompt with the variation
        // This ensures consistency with the guide prompt
        concepts[i].prompt = variationPrompt
        
        // Enhanced validation: Check for outfit, hair, and location preservation
        const guidePromptOutfitKeywords = /(?:couture|mini|red|dress|structured|bow|black|satin|opera|gloves|heels|elegant|pajamas|striped|cashmere|silk|camisole|turtleneck|sweater|trousers)/i.test(detectedGuidePrompt)
        const variationHasOutfit = /(?:wearing|dress|gloves|heels|outfit|clothing|pajamas|striped|cashmere|silk|camisole|turtleneck|sweater|trousers)/i.test(variationPrompt)
        const guidePromptHairKeywords = /(?:hair|bun|bow|velvet|chic|framing|strands|chignon|ponytail)/i.test(detectedGuidePrompt)
        const variationHasHair = /(?:hair|bun|bow|velvet|chic|framing|strands|chignon|ponytail)/i.test(variationPrompt)
        const guidePromptLocationKeywords = /(?:sofa|tree|fireplace|room|setting|scene|location|background|Christmas|living|room)/i.test(detectedGuidePrompt)
        const variationHasLocation = /(?:sofa|tree|fireplace|room|setting|scene|location|background|Christmas|living|room)/i.test(variationPrompt)
        
        if (guidePromptOutfitKeywords && !variationHasOutfit) {
          console.log("[v0] ⚠️ WARNING: Variation prompt might not contain outfit from guide prompt!")
        }
        if (guidePromptHairKeywords && !variationHasHair) {
          console.log("[v0] ⚠️ WARNING: Variation prompt might not contain hair styling from guide prompt!")
        }
        if (guidePromptLocationKeywords && !variationHasLocation) {
          console.log("[v0] ⚠️ WARNING: Variation prompt might not contain location from guide prompt!")
        }
        
        // Log the variation for debugging
        console.log("[v0] 📋 Variation #" + variationNumber + " validation:", {
          hasOutfit: variationHasOutfit,
          hasHair: variationHasHair,
          hasLocation: variationHasLocation,
          promptLength: variationPrompt.length
        })
      }
    }

    // Post-process prompts to remove old requirements and ensure new simplified format
    // First, remove any old requirements that shouldn't be there
    // Track which concepts are from guide prompts (concept #1 and variations 2-6)
    const isGuidePromptConcept = detectedGuidePrompt && detectedGuidePrompt.trim().length > 0
    const guidePromptHasBAndW = isGuidePromptConcept && /black.?and.?white|black\s*&\s*white|monochrome|b&w|grayscale/i.test(detectedGuidePrompt)
    
    concepts.forEach((concept, index) => {
      let prompt = concept.prompt
      
      // Check if this is a guide prompt concept (concept #1 uses guide prompt, concepts 2-6 are variations)
      const isFromGuidePrompt = isGuidePromptConcept && (index === 0 || index < 6)
      
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
    
    const bannedWords = [
      "ultra realistic",
      "photorealistic",
      "8K",
      "4K",
      "high quality",
      "high resolution",
      "perfect",
      "flawless",
      "stunning",
      "beautiful",
      "gorgeous",
      "professional photography",
      "editorial",
      "magazine quality",
      "dramatic",
      "cinematic",
      "cinematic quality",
      "hyper detailed",
      "sharp focus",
      "ultra sharp",
      "crystal clear",
      "DSLR",
      "studio lighting",
      "professional lighting",
      "perfect lighting",
      "even lighting",
      "ideal lighting",
      "beautiful lighting",
      "smooth skin",
      "flawless skin",
      "airbrushed",
      "perfect skin",
      "silk-like skin",
    ]

    // CRITICAL FIX: Function to ensure all mandatory anti-plastic requirements are present
    // Now with conditional logic to respect user style requests AND reference image analysis
    // 🔴 PRO MODE: Only add skin texture if it's in user prompt, guide prompt, or templates
    function ensureRequiredElements(
      prompt: string,
      currentWordCount: number,
      MAX_WORDS: number,
      userRequest?: string,
      aesthetic?: string,
      imageAnalysisText?: string,
      isStudioPro?: boolean,
      isEnhancedAuthenticity?: boolean,
      guidePrompt?: string,
      templateExamples?: string[],
    ): string {
      let enhanced = prompt
      let addedCount = 0

      // Combine user request, aesthetic, and image analysis for style detection
      const styleContext = `${userRequest || ""} ${aesthetic || ""} ${imageAnalysisText || ""}`.toLowerCase()

      // Detect if user wants professional/studio/magazine aesthetic (skip amateur requirements)
      const wantsProfessional = /magazine|cover|high.?end|high.?fashion|editorial|professional|luxury|fashion.?editorial|vogue|elle|runway/i.test(styleContext)
      const userExplicitStudio = /\b(studio\s+lighting|studio\s+shot|studio\s+photo|studio\s+images?|in\s+studio|photo\s+studio|studio\s+backdrop|studio\s+set|studio\s+session)\b/i.test(
        styleContext,
      )
      
      // Detect if reference image or user request is B&W/monochrome
      const wantsBAndW = /black.?and.?white|monochrome|b&w|grayscale|black and white/i.test(styleContext)
      
      // Detect if reference image shows studio lighting (explicit phrases only)
      const imageShowsStudio = /\b(studio\s+lighting|studio\s+shot|studio\s+photo|photo\s+studio|controlled\s+studio\s+lighting|professional\s+studio\s+lighting)\b/i.test(
        imageAnalysisText || "",
      )

      console.log("[v0] Validating prompt for required anti-plastic elements...")
      console.log("[v0] Style context:", styleContext.substring(0, 100))
      console.log("[v0] Professional/Studio request detected:", wantsProfessional)
      console.log("[v0] B&W/Monochrome detected:", wantsBAndW)
      console.log("[v0] Image shows studio:", imageShowsStudio)

      // 🔴 CRITICAL: Check if skin texture should be included (from user prompt, guide prompt, or templates)
      const shouldAddSkinTexture = shouldIncludeSkinTexture(userRequest, guidePrompt, templateExamples)
      
      // Check for natural skin texture - ONLY add if it should be included
      // Format: "natural skin texture with visible pores" (not "with visible pores" at the end)
      if (!/natural\s+skin\s+texture/i.test(enhanced)) {
        if (shouldAddSkinTexture) {
          console.log("[v0] Missing: natural skin texture - adding in proper location (found in user/guide/templates)")
          // Insert before camera specs or at end if no camera specs
          if (/professional\s+photography|85mm|f\/|shot\s+on/i.test(enhanced)) {
            // Insert before camera specs
            enhanced = enhanced.replace(/(professional\s+photography|85mm|f\/|shot\s+on[^,]*)/i, "natural skin texture with visible pores, $1")
          } else {
            // Add before final period or at end
            enhanced = enhanced.replace(/(\.\s*$)/, ", natural skin texture with visible pores$1")
            if (!enhanced.includes("natural skin texture")) {
              enhanced += ", natural skin texture with visible pores"
            }
          }
          addedCount += 6
        } else {
          console.log("[v0] Skipping: natural skin texture - not found in user prompt, guide prompt, or templates")
        }
      }
      
      // Remove any incorrectly placed "with visible pores" at the end
      enhanced = enhanced.replace(/,\s*with\s+visible\s+pores\.?\s*$/i, "")
      enhanced = enhanced.replace(/with\s+visible\s+pores\.?\s*,\s*black\s+and\s+white/i, "black and white")
      enhanced = enhanced.replace(/\.\s*with\s+visible\s+pores\.?\s*$/i, ".")
      enhanced = enhanced.replace(/,\s*with\s+visible\s+pores\.?\s*,\s*black\s+and\s+white/i, ", black and white")
      
      // 🔴 CRITICAL: For Studio Pro mode, ensure camera specs and lighting are included
      if (studioProMode) {
        // Ensure camera specs are present
        if (!/professional\s+photography|85mm|f\/\d|f\s*\d/i.test(enhanced)) {
          console.log("[v0] Missing camera specs for Studio Pro - adding")
          if (/natural\s+skin\s+texture/i.test(enhanced)) {
            enhanced = enhanced.replace(/(natural\s+skin\s+texture)/i, "professional photography, 85mm lens, f/2.0 depth of field, $1")
          } else {
            enhanced += ", professional photography, 85mm lens, f/2.0 depth of field"
          }
          addedCount += 6
        }
        
        // Ensure lighting description is present (check for lighting-related terms)
        // Pattern requires two words where second word must be lighting-related
        // This safely matches "natural light" but NOT "natural skin texture" (since "skin" isn't a lighting word)
        const hasLighting = /(?:soft|window|warm|ambient|mixed|color\s+temperatures|lighting|light|natural)\s+(?:light|lighting|window\s+light|ambient|illumination|shadows)/i.test(enhanced)
        if (!hasLighting) {
          console.log("[v0] Missing lighting description - adding")
          // Add before camera specs if they exist, otherwise at end
          if (/professional\s+photography|85mm/i.test(enhanced)) {
            enhanced = enhanced.replace(/(professional\s+photography|85mm)/i, "soft natural lighting, $1")
          } else {
            enhanced += ", soft natural lighting"
          }
          addedCount += 3
        }
      }
      
      // Final cleanup
      enhanced = enhanced.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()

      // Check for anti-plastic phrases (need at least 2 positive descriptors) - ONLY if skin texture should be included
      if (shouldAddSkinTexture) {
        const antiPlasticMatches =
          enhanced.match(/organic\s+imperfections|unretouched\s+skin|matte\s+skin\s+texture|realistic\s+texture|visible\s+pores|natural\s+imperfections/gi) || []
        const antiPlasticCount = antiPlasticMatches.length

        if (antiPlasticCount < 2) {
          console.log(`[v0] Anti-plastic phrases: ${antiPlasticCount}/2 - adding more`)
          const antiPlasticPhrases = [
            "organic imperfections",
            "unretouched skin texture",
            "matte skin texture",
            "realistic texture",
            "visible pores",
          ]
          const needed = Math.max(0, 2 - antiPlasticCount)
          if (needed > 0) {
            enhanced += ", " + antiPlasticPhrases.slice(0, needed).join(", ")
            addedCount += 2 * needed
          }
        }
      } else {
        console.log("[v0] Skipping anti-plastic phrases - skin texture not in user/guide/templates")
      }

      // Check for film grain (ALWAYS required - no exceptions)
      // Enhanced Authenticity mode: Use stronger film grain descriptions
      const hasFilmGrain = /film\s+grain|visible\s+film\s+grain|subtle\s+film\s+grain|prominent\s+film\s+grain/i.test(enhanced)
      if (!hasFilmGrain) {
        console.log("[v0] Missing: film grain - adding")
        if (enhancedAuthenticity && !isStudioPro) {
          enhanced += ", visible film grain, grainy texture"
          addedCount += 5
        } else {
          enhanced += ", subtle film grain"
          addedCount += 3
        }
      } else if (enhancedAuthenticity && !isStudioPro && !/visible\s+film\s+grain|prominent\s+film\s+grain|grainy\s+texture/i.test(enhanced)) {
        // Upgrade to stronger film grain if enhanced authenticity is enabled
        enhanced = enhanced.replace(/subtle\s+film\s+grain/i, "visible film grain, grainy texture")
        console.log("[v0] Upgraded film grain for enhanced authenticity")
      }

      // PRIORITY 1 FIX #1: Make muted colors conditional on user request AND reference image
      // Check if user wants vibrant, pastel, high-contrast, B&W, or other non-muted styles
      const userWantsVibrant = /vibrant|bright|saturated|high.?contrast|bold.?colors|colorful|neon/i.test(styleContext)
      const userWantsPastel = /pastel|soft.?tones|gentle.?colors|light.?colors/i.test(styleContext)
      const userWantsMonochrome = /monochrome|black.?and.?white|b&w|grayscale/i.test(styleContext)
      const userWantsEditorial = /editorial|high.?fashion|fashion.?editorial|magazine/i.test(styleContext)

      // Check if prompt already has B&W/monochrome
      const hasBAndW = /black.?and.?white|monochrome|b&w|grayscale/i.test(enhanced)

      // 🔴 CRITICAL: Only add B&W if explicitly requested by user OR clearly shown in reference images
      // Do NOT add B&W based on vague detection - be strict
      const userExplicitlyWantsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white)\b/i.test(userRequest || "")
      const imageAnalysisShowsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white|no\s+color|colorless)\b/i.test(imageAnalysisText || "")

      if (!/muted\s+(?:colors?|color\s+palette|tones?)/i.test(enhanced)) {
        // Only add B&W if user explicitly requested it OR reference image clearly shows B&W
        if ((userExplicitlyWantsBAndW || imageAnalysisShowsBAndW) && !hasBAndW) {
          // User or reference image explicitly wants B&W - add it
          console.log("[v0] B&W/Monochrome explicitly requested - adding to prompt")
          enhanced += ", black and white"
          addedCount += 3
        } else if (hasBAndW) {
          // B&W already in prompt - skip muted colors
          console.log("[v0] B&W/Monochrome already in prompt - skipping muted colors")
        } else if (wantsProfessional) {
          // User wants vibrant - use "muted vibrant palette" as compromise (still authentic but respects request)
          console.log("[v0] User wants vibrant colors - using muted vibrant palette")
          enhanced += ", muted vibrant color palette"
          addedCount += 4
        } else if (userWantsPastel) {
          // User wants pastel - use "muted pastel tones" as compromise
          console.log("[v0] User wants pastel colors - using muted pastel tones")
          enhanced += ", muted pastel tones"
          addedCount += 3
        } else if (userWantsMonochrome) {
          // User wants monochrome - skip muted colors (monochrome is already muted)
          console.log("[v0] User wants monochrome - skipping muted colors")
        } else if (userWantsEditorial) {
          // User wants editorial - use "muted editorial palette" as compromise
          console.log("[v0] User wants editorial - using muted editorial color palette")
          enhanced += ", muted editorial color palette"
          addedCount += 4
        } else {
          // Default: add muted colors (Scandinavian minimalism default)
          // Enhanced Authenticity mode: Use stronger muted color descriptions
          console.log("[v0] Missing: muted colors - adding (default)")
          if (enhancedAuthenticity && !isStudioPro) {
            enhanced += ", heavily muted colors, desaturated color palette"
            addedCount += 4
          } else {
            enhanced += ", muted colors"
            addedCount += 2
          }
        }
      }

      // PRIORITY 1 FIX #2: Make uneven lighting conditional on user request AND reference image
      // Check if user wants dramatic, soft, golden hour, studio, or other specific lighting styles
      const userWantsDramatic = /dramatic|cinematic|editorial|high.?fashion|fashion.?editorial|striking/i.test(styleContext)
      const userWantsSoft = /soft|dreamy|gentle|diffused|soft.?glow|dreamy.?light/i.test(styleContext)
      const userWantsGoldenHour = /golden.?hour|warm.?glow|sunset|sunrise|warm.?light/i.test(styleContext)
      const userWantsMoody = /moody|dark|shadowy|deep.?shadows|low.?light/i.test(styleContext)
      // Check if prompt already has studio lighting
      const hasStudioLighting = /studio\s+lighting|professional\s+studio\s+lighting|dramatic\s+studio/i.test(enhanced)

      if (!/uneven\s+(?:natural\s+)?lighting|uneven\s+illumination/i.test(enhanced)) {
        // Check if user requested specific lighting style OR reference image shows studio
        if (userExplicitStudio || imageShowsStudio) {
          // User explicitly asked for studio OR reference shows studio - allow studio lighting
          console.log("[v0] Studio lighting explicitly requested or shown - skipping uneven requirement")
          if (!hasStudioLighting && !/studio/i.test(enhanced)) {
            enhanced += ", studio lighting"
            addedCount += 2
            console.log("[v0] Added 'studio lighting' to prompt")
          }
        } else if (wantsProfessional) {
          // Professional vibe without explicit studio request - do not force studio lighting
          console.log("[v0] Professional vibe without studio request - keeping existing lighting")
        } else if (userWantsDramatic) {
          // User wants dramatic lighting - check if it's already in prompt or needs to be preserved
          if (/\b(?:dramatic|cinematic|editorial)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it as-is, just ensure it's not "perfect"
            console.log("[v0] User wants dramatic lighting - keeping as-is (not perfect)")
            enhanced = enhanced.replace(/\bperfect\s+lighting\b/gi, "dramatic lighting")
          } else {
            // User wants dramatic but not in prompt yet - don't add "uneven", let Maya add dramatic
            console.log("[v0] User wants dramatic lighting - skipping uneven requirement")
          }
        } else if (userWantsSoft) {
          // User wants soft lighting - check if it's already in prompt
          if (/\b(?:soft|dreamy|gentle|diffused)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it, but add natural shadows for authenticity
            console.log("[v0] User wants soft lighting - keeping with natural shadows")
            if (!/shadows|uneven/i.test(enhanced)) {
              enhanced = enhanced.replace(/\b(soft|dreamy|gentle|diffused)\s+lighting\b/gi, "$1 lighting with natural shadows")
              addedCount += 3
            }
          } else {
            // User wants soft but not in prompt yet - don't add "uneven", let Maya add soft
            console.log("[v0] User wants soft lighting - skipping uneven requirement")
          }
        } else if (userWantsGoldenHour) {
          // User wants golden hour - check if it's already in prompt
          if (/\b(?:golden.?hour|warm.?glow|sunset|sunrise)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it, but add natural variation
            console.log("[v0] User wants golden hour lighting - keeping with natural variation")
            if (!/uneven|variation|mixed/i.test(enhanced)) {
              enhanced = enhanced.replace(/\b(golden.?hour|warm.?glow|sunset|sunrise)\s+lighting\b/gi, "$1 lighting with natural variation")
              addedCount += 3
            }
          } else {
            // User wants golden hour but not in prompt yet - don't add "uneven", let Maya add golden hour
            console.log("[v0] User wants golden hour lighting - skipping uneven requirement")
          }
        } else if (userWantsMoody) {
          // User wants moody lighting - check if it's already in prompt
          if (/\b(?:moody|dark|shadowy)\s+lighting/i.test(enhanced)) {
            // Already in prompt - keep it as-is (moody already implies uneven)
            console.log("[v0] User wants moody lighting - keeping as-is")
          } else {
            // User wants moody but not in prompt yet - don't add "uneven", let Maya add moody
            console.log("[v0] User wants moody lighting - skipping uneven requirement")
          }
        } else {
          // Default: add uneven for natural lighting (Scandinavian minimalism default)
          console.log("[v0] Checking for lighting to make uneven...")
          // Only modify if lighting description exists but doesn't have "uneven"
          if (/\b(?:natural\s+)?lighting\b/i.test(enhanced) && !/uneven/i.test(enhanced)) {
            enhanced = enhanced.replace(/\b(natural\s+)?lighting\b/gi, "uneven $1lighting")
            console.log("[v0] Modified lighting to be 'uneven' (default)")
          }
        }
      }

      // Add authentic iPhone aesthetic at the end if not present (skip for professional/studio requests AND Studio Pro mode)
      // Enhanced Authenticity mode: Use stronger iPhone quality descriptions
      if (!isStudioPro && !wantsProfessional && !/authentic\s+iPhone\s+photo|iPhone\s+photo\s+aesthetic|amateur\s+iPhone/i.test(enhanced)) {
        console.log("[v0] Missing: authentic iPhone aesthetic - adding")
        if (enhancedAuthenticity) {
          enhanced += ", raw iPhone photo, authentic iPhone camera quality, amateur cellphone aesthetic"
          addedCount += 7
        } else {
          enhanced += ", authentic iPhone photo aesthetic"
          addedCount += 4
        }
      } else if (isStudioPro) {
        console.log("[v0] Studio Pro mode - skipping authentic iPhone aesthetic")
      } else if (wantsProfessional) {
        console.log("[v0] Professional/studio request - skipping authentic iPhone aesthetic")
      } else if (enhancedAuthenticity && !isStudioPro && !wantsProfessional) {
        // Upgrade existing iPhone aesthetic to stronger version if enhanced authenticity is enabled
        if (/authentic\s+iPhone\s+photo\s+aesthetic/i.test(enhanced)) {
          enhanced = enhanced.replace(/authentic\s+iPhone\s+photo\s+aesthetic/i, "raw iPhone photo, authentic iPhone camera quality, amateur cellphone aesthetic")
          console.log("[v0] Upgraded iPhone aesthetic for enhanced authenticity")
        }
      }

      // Clean up any double commas or trailing commas
      enhanced = enhanced
        .replace(/,\s*,/g, ",")
        .replace(/^,\s*/, "")
        .replace(/\s*,\s*$/, "")
        .trim()

      console.log(`[v0] Post-processing validation complete - added ${addedCount} words`)

      return enhanced
    }

    concepts.forEach((concept, index) => {
      let prompt = concept.prompt
      
      // Check if this is a guide prompt concept (concept #1 uses guide prompt, concepts 2-6 are variations)
      const isFromGuidePrompt = isGuidePromptConcept && (index === 0 || index < 6)

      // Helper function to count words
      const wordCount = (text: string) => text.trim().split(/\s+/).length

      // Remove instruction phrases that shouldn't be in FLUX prompts
      // These are instructions FOR Maya, not part of the image generation prompt
      const instructionPhrases = [
        /\bAlways keep my\b/gi,
        /\bAlways\s+keep\s+my\s+natural\s+features\b/gi,
        /\bdont change\b/gi,
        /\bdon't change\b/gi,
        /\bdont\s+change\s+the\s+face\b/gi,
        /\bdon't\s+change\s+the\s+face\b/gi,
        /\bkeep my\b/gi,
        /\bkeep\s+my\s+natural\s+features\b/gi,
        /\bkeep\s+my\s+natural\s+hair\s+color\b/gi,
        /\bkeep\s+my\s+natural\s+eye\s+color\b/gi,
        /\bkeep\s+my\s+natural\s+hair\b/gi,
        /\bkeep\s+my\s+natural\s+eyes\b/gi,
        /\bpreserve my\b/gi,
        /\bmaintain my\b/gi,
        /\bdo not change\b/gi,
        /\bdo\s+not\s+change\s+the\s+face\b/gi,
      ]
      
      instructionPhrases.forEach((regex) => {
        prompt = prompt.replace(regex, "")
      })
      
      // Remove standalone instruction phrases that might be left as fragments
      prompt = prompt.replace(/,\s*,/g, ",") // Remove double commas
      prompt = prompt.replace(/,\s*,/g, ",") // Remove double commas again (in case of triple)
      prompt = prompt.replace(/^,\s*/, "") // Remove leading comma
      prompt = prompt.replace(/\s*,\s*$/, "") // Remove trailing comma
      prompt = prompt.replace(/\s+/g, " ") // Normalize multiple spaces
      prompt = prompt.trim() // Final trim

      // Check for imperfection language BEFORE removing lighting phrases
      const hasImperfectionLanguage = /uneven\s*lighting|mixed\s*color\s*temperatures|slight\s*uneven\s*illumination|visible\s*sensor\s*noise/i.test(prompt)

      // Remove banned words (case-insensitive)
      bannedWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi")
        prompt = prompt.replace(regex, "")
      })

      // Conditionally remove "soft diffused natural lighting" only if no imperfection language exists
      if (!hasImperfectionLanguage) {
        const softDiffusedRegex = /\bsoft\s+diffused\s+natural\s+lighting\b/gi
        prompt = prompt.replace(softDiffusedRegex, "")
      }

      // Hair descriptions are now allowed - Maya can describe hair when she knows it
      // No removal of hair descriptions - Maya should only include hair if she knows it from:
      // 1. User's physical preferences (model settings)
      // 2. Previous conversations where user mentioned it
      // 3. Reference images (for Studio Pro mode)
      // Maya should NOT assume hair color/length if she doesn't know it

      // Get current word count - we want to stay under 80 words (optimal for LoRA activation)
      let currentWordCount = wordCount(prompt)
      const MAX_WORDS = 60 // Hard limit - optimal length (30-60 words, target 40-55) for better LoRA activation and accurate character representation with safety net descriptions

      // CRITICAL FIX: If prompt is over 80 words, trim intelligently
      if (currentWordCount > MAX_WORDS) {
        // Remove less critical elements first (in order of priority to keep)
        // 1. Keep: trigger word, gender, outfit, pose, iPhone, skin texture, imperfections
        // 2. Remove: overly detailed location descriptions
        // 3. Remove: redundant technical terms
        // 4. Remove: casual moment language (lowest priority)
        
        // DO NOT remove authenticity keywords - they prevent plastic look
        // These are now REQUIRED: "candid moment", "candid photo", "amateur cellphone photo", "cellphone photo"
        // Only remove truly unnecessary phrases if over word limit
        if (currentWordCount > MAX_WORDS) {
          // Remove overly verbose phrases but keep authenticity keywords
          prompt = prompt.replace(/,\s*(looks like a real phone camera photo|looks like real phone camera photo|Instagram-native)/gi, "")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove overly detailed location descriptions
        if (currentWordCount > MAX_WORDS) {
          // Simplify location descriptions (keep first part, remove details)
          prompt = prompt.replace(/,\s*(modern architectural space with clean lines|architectural space with|with clean lines)/gi, ", modern space")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove old requirements that are no longer needed
        // BUT: Keep "candid moment" and "candid photo" - these are REQUIRED for authenticity
        if (currentWordCount > MAX_WORDS) {
          // Remove old requirements but NOT candid/amateur keywords
          prompt = prompt.replace(/,\s*(film\s+grain|muted\s+tones|natural\s+skin\s+texture|not\s+airbrushed|motion\s+blur)/gi, "")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over 80 words, trim less critical elements
        if (currentWordCount > MAX_WORDS) {
          // Simplify overly detailed descriptions
          prompt = prompt.replace(/,\s*with\s+soft\s+drape/gi, "")
          prompt = prompt.replace(/,\s*weight\s+shifted\s+to\s+one\s+leg/gi, ", weight on one leg")
          currentWordCount = wordCount(prompt)
        }
        
        // If still over, remove overly detailed outfit descriptions
        if (currentWordCount > MAX_WORDS) {
          // Simplify "with soft drape" type phrases
          prompt = prompt.replace(/,\s*with\s+soft\s+drape/gi, "")
          prompt = prompt.replace(/,\s*weight\s+shifted\s+to\s+one\s+leg/gi, ", weight on one leg")
          currentWordCount = wordCount(prompt)
        }
        
        // Final cleanup
        prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
        currentWordCount = wordCount(prompt)
      }

      // Check if user wants professional/magazine aesthetic (skip iPhone requirements)
      // Keep studio detection explicit so we don't accidentally force studio lighting
      const wantsProfessional = /magazine|cover|high.?end|high.?fashion|editorial|professional|luxury|fashion.?editorial|vogue|elle|runway/i.test(
        `${userRequest || ""} ${aesthetic || ""} ${imageAnalysis || ""}`.toLowerCase(),
      )
      const userExplicitStudio = /\b(studio\s+lighting|studio\s+shot|studio\s+photo|studio\s+images?|in\s+studio|photo\s+studio|studio\s+backdrop|studio\s+set|studio\s+session)\b/i.test(
        `${userRequest || ""} ${aesthetic || ""} ${context || ""}`.toLowerCase(),
      )
      const imageShowsStudio =
        imageAnalysis &&
        /\b(studio\s+lighting|studio\s+shot|studio\s+photo|photo\s+studio|controlled\s+studio\s+lighting|professional\s+studio\s+lighting)\b/i.test(
          imageAnalysis.toLowerCase(),
        )
      
      // 🔴 CRITICAL: Only add B&W if explicitly requested by user OR clearly shown in reference images
      // Do NOT add B&W based on vague detection - be strict
      // BUT: Do NOT add B&W to guide prompt concepts (they should preserve the original guide prompt)
      const userExplicitlyWantsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white)\b/i.test(userRequest || "")
      const imageAnalysisShowsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white|no\s+color|colorless)\b/i.test(imageAnalysis || "")
      const hasBAndWInPrompt = /black.?and.?white|monochrome|b&w|grayscale/i.test(prompt)

      // CRITICAL FIX: Remove "muted colors" if B&W is explicitly requested or already in prompt
      // BUT: Skip B&W modifications for guide prompt concepts (preserve original guide prompt)
      if (!isFromGuidePrompt && (userExplicitlyWantsBAndW || imageAnalysisShowsBAndW || hasBAndWInPrompt)) {
        prompt = prompt.replace(/,\s*muted\s+colors?/gi, "")
        prompt = prompt.replace(/muted\s+colors?,?\s*/gi, "")
        console.log("[v0] Removed 'muted colors' because B&W/monochrome detected")
        
        // Only add B&W if explicitly requested and not already in prompt
        // BUT: Never add B&W to guide prompt concepts
        if ((userExplicitlyWantsBAndW || imageAnalysisShowsBAndW) && !hasBAndWInPrompt) {
          prompt += ", black and white"
          currentWordCount = wordCount(prompt)
          console.log("[v0] Added 'black and white' to prompt (explicitly requested)")
        }
      } else if (isFromGuidePrompt) {
        // For guide prompt concepts, preserve B&W if it's in the original guide prompt
        // But still remove muted colors if B&W is present
        if (hasBAndWInPrompt || guidePromptHasBAndW) {
          prompt = prompt.replace(/,\s*muted\s+colors?/gi, "")
          prompt = prompt.replace(/muted\s+colors?,?\s*/gi, "")
          console.log("[v0] Removed 'muted colors' from guide prompt concept (B&W detected)")
        }
      }
      
      // CRITICAL FIX: Remove iPhone/cellphone references for Studio Pro mode
      // BUT: Skip for guide prompt concepts (they should preserve the original guide prompt)
      if (studioProMode && !isFromGuidePrompt) {
        // Remove ALL iPhone/cellphone/amateur photo references for Studio Pro
        prompt = prompt.replace(/,\s*shot\s+on\s+iPhone[^,]*/gi, "")
        prompt = prompt.replace(/,\s*(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography|candid\s+photo|candid\s+moment)/gi, "")
        prompt = prompt.replace(/authentic\s+iPhone\s+photo\s+aesthetic/gi, "")
        console.log("[v0] Removed all iPhone/cellphone references for Studio Pro mode")
        
        // 🔴 CRITICAL: Ensure camera specs are included for Studio Pro mode
        // BUT: Skip for guide prompt concepts (they already have camera specs from guide prompt)
        if (!/professional\s+photography|85mm|f\/\d|f\s*\d/i.test(prompt)) {
          console.log("[v0] Missing camera specs for Studio Pro - adding")
          // Add before natural skin texture or at end
          if (/natural\s+skin\s+texture/i.test(prompt)) {
            prompt = prompt.replace(/(natural\s+skin\s+texture)/i, "professional photography, 85mm lens, f/2.0 depth of field, $1")
          } else {
            prompt += ", professional photography, 85mm lens, f/2.0 depth of field"
          }
        }
        
        // 🔴 CRITICAL: Ensure lighting description is included
        // BUT: Skip for guide prompt concepts (they already have lighting from guide prompt)
        // Note: Require "natural" to be part of lighting phrase (e.g., "natural light") to avoid matching "natural skin texture"
        const hasLighting = /(?:soft|window|warm|ambient|mixed|color\s+temperatures|lighting|light|natural\s+(?:light|lighting|window\s+light))/i.test(prompt)
        if (!hasLighting) {
          console.log("[v0] Missing lighting description - adding")
          // Add after location/environment or before camera specs
          if (/professional\s+photography|85mm/i.test(prompt)) {
            prompt = prompt.replace(/(professional\s+photography|85mm)/i, "soft natural lighting, $1")
          } else {
            prompt += ", soft natural lighting"
          }
        }
      } else if (isFromGuidePrompt) {
        console.log("[v0] Skipping iPhone/camera/lighting modifications for guide prompt concept #" + (index + 1) + " - preserving original guide prompt")
      }
      
      // 🔴 CRITICAL: Clean up incorrectly placed "with visible pores" at the end
      // Replace "with visible pores" at the end with "natural skin texture with visible pores" in proper location
      // BUT: Only fix placement if skin texture should be included (from user prompt, guide prompt, or templates)
      const hasVisiblePoresAtEnd = /,\s*with\s+visible\s+pores\.?\s*$/i.test(prompt)
      const hasNaturalSkinTexture = /natural\s+skin\s+texture/i.test(prompt)
      const shouldIncludeSkin = shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples)
      
      if (hasVisiblePoresAtEnd) {
        // Remove "with visible pores" from the end
        prompt = prompt.replace(/,\s*with\s+visible\s+pores\.?\s*$/i, "")
        // Only add "natural skin texture with visible pores" if:
        // 1. It's not already present, AND
        // 2. It should be included (from user prompt, guide prompt, or templates)
        if (!hasNaturalSkinTexture && shouldIncludeSkin) {
          // Add "natural skin texture with visible pores" before camera specs if they exist
          if (/professional\s+photography|85mm|f\/\d|f\s*\d/i.test(prompt)) {
            prompt = prompt.replace(/(professional\s+photography|85mm|f\/[\d.]+|depth of field)/i, "natural skin texture with visible pores, $1")
          } else {
            // Add at end if no camera specs
            prompt += ", natural skin texture with visible pores"
          }
          console.log("[v0] ✅ Fixed 'with visible pores' placement - moved to proper location")
        } else if (!shouldIncludeSkin) {
          console.log("[v0] ✅ Removed 'with visible pores' - not in user prompt, guide prompt, or templates")
        } else {
          console.log("[v0] ✅ Fixed 'with visible pores' placement - already has natural skin texture")
        }
      }
      prompt = prompt.replace(/with\s+visible\s+pores\.?\s*,\s*black\s+and\s+white/i, "black and white")
      prompt = prompt.replace(/\.\s*with\s+visible\s+pores\.?\s*$/i, ".")
      prompt = prompt.replace(/,\s*with\s+visible\s+pores\.?\s*,\s*black\s+and\s+white/i, ", black and white")
      // Clean up any double commas or spacing issues
      prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
      
      // Final validation: Ensure Studio Pro prompts have required elements
      if (studioProMode) {
        // Check if lighting is present (should have lighting description)
        // Note: Require "natural" to be part of lighting phrase (e.g., "natural light") to avoid matching "natural skin texture"
        const hasLightingDescription = /(?:soft|window|warm|ambient|mixed|color\s+temperatures|lighting|light|natural\s+(?:light|lighting|window\s+light|ambient|illumination))/i.test(prompt)
        if (!hasLightingDescription) {
          console.log("[v0] ⚠️ WARNING: Prompt missing lighting description")
        }
        
        // Check if camera specs are present
        const hasCameraSpecs = /professional\s+photography|85mm|f\/\d|f\s*\d/i.test(prompt)
        if (!hasCameraSpecs) {
          console.log("[v0] ⚠️ WARNING: Prompt missing camera specs")
        }
      }
      
      // CRITICAL FIX: Lighting handling - only use studio lighting when explicitly requested
      if (userExplicitStudio || imageShowsStudio) {
        // Upgrade to studio lighting only when the user asks for studio or the reference is studio
        prompt = prompt.replace(/uneven\s+(?:natural\s+)?lighting/gi, "studio lighting")
        prompt = prompt.replace(/uneven\s+illumination/gi, "studio lighting")
        console.log("[v0] Replaced 'uneven lighting' with 'studio lighting' due to explicit studio request/reference")
      } else if (wantsProfessional) {
        // Keep professional vibe but avoid forcing studio lighting
        prompt = prompt.replace(/uneven\s+(?:natural\s+)?lighting/gi, "natural lighting with realistic shadows")
        prompt = prompt.replace(/uneven\s+illumination/gi, "natural lighting with realistic shadows")
        console.log("[v0] Kept professional vibe without studio lighting")
      }

      // Guardrail: strip any studio-lighting phrases when the user didn't ask for studio and reference isn't studio
      if (!userExplicitStudio && !imageShowsStudio) {
        const before = prompt
        prompt = prompt.replace(/\b(?:professional\s+)?studio\s+lighting\b/gi, "natural lighting with realistic shadows")
        prompt = prompt.replace(/\bstudio\s+light\b/gi, "natural light with gentle variation")
        if (before !== prompt) {
          console.log("[v0] Removed unintended studio lighting phrasing to protect authenticity")
        }
      }

      // Guardrail: remove negative prompting phrases to avoid inverse effects
      const negativeToPositiveMap: Array<{ regex: RegExp; replacement: string }> = [
        { regex: /\bnot\s+airbrushed\b/gi, replacement: "unretouched skin texture" },
        { regex: /\bnot\s+plastic-?looking\b/gi, replacement: "organic imperfections" },
        { regex: /\bnot\s+smooth\b/gi, replacement: "matte skin texture" },
        { regex: /\bnot\s+flawless\b/gi, replacement: "realistic skin detail" },
      ]
      negativeToPositiveMap.forEach(({ regex, replacement }) => {
        prompt = prompt.replace(regex, replacement)
      })

      // CRITICAL FIX #1: Ensure basic iPhone specs at the end (new simplified format)
      // Skip for professional/studio requests AND Studio Pro mode - allow professional camera specs instead
      if (!studioProMode && !wantsProfessional) {
        // Remove any duplicate iPhone mentions first
        const iphoneMatches = prompt.match(/(shot on iPhone[^,]*)/gi)
        if (iphoneMatches && iphoneMatches.length > 1) {
          // Keep only the last one, remove others
          prompt = prompt.replace(/(shot on iPhone[^,]*),/gi, "")
          // Re-add at the end if we removed all
          if (!/shot on iPhone/i.test(prompt)) {
            prompt = `${prompt}, shot on iPhone 15 Pro portrait mode, shallow depth of field`
          }
        }
        
        const hasIPhone = /shot\s+on\s+iPhone/i.test(prompt)
        const hasFocalLength = /\d+mm\s*(lens|focal)/i.test(prompt)

        if (!hasIPhone && !hasFocalLength && currentWordCount < MAX_WORDS) {
          // Add basic iPhone specs at the end (new format)
          // Enhanced Authenticity mode: Use stronger iPhone quality descriptors
          const iphoneSpecs = enhancedAuthenticity 
            ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
            : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
          prompt = `${prompt}, ${iphoneSpecs}`
          currentWordCount = wordCount(prompt)
        } else if (hasFocalLength && !hasIPhone && currentWordCount < MAX_WORDS) {
          // If focal length but no iPhone, replace with basic iPhone specs
          // Enhanced Authenticity mode: Use stronger iPhone quality descriptors
          const iphoneSpecs = enhancedAuthenticity 
            ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
            : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
          prompt = prompt.replace(/\d+mm\s*(lens|focal)[^,]*/i, iphoneSpecs)
          currentWordCount = wordCount(prompt)
        } else if (hasIPhone) {
          // Ensure it's in the new simplified format (at the end, basic specs only)
          // Enhanced Authenticity mode: Upgrade to stronger iPhone quality if enabled
          prompt = prompt.replace(/shot\s+on\s+iPhone\s*15\s*Pro[^,]*(?:,\s*[^,]+)*/gi, (match) => {
            // If it has complex specs, simplify to basic format
            if (/\d+mm|f\/\d+|ISO\s*\d+/i.test(match)) {
              return enhancedAuthenticity 
                ? "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality"
                : "shot on iPhone 15 Pro portrait mode, shallow depth of field"
            }
            // Enhanced Authenticity: Upgrade existing simple format
            if (enhancedAuthenticity && !/raw\s+iPhone\s+camera\s+quality/i.test(match)) {
              return match.replace(/shot\s+on\s+iPhone\s*15\s*Pro[^,]*/i, "shot on iPhone 15 Pro portrait mode, shallow depth of field, raw iPhone camera quality")
            }
            // If it's already simple, keep it but ensure it's at the end
            return match
          })
          currentWordCount = wordCount(prompt)
        }
      } else {
        console.log("[v0] Professional/studio request - skipping iPhone requirement, allowing professional camera specs")
      }

      // CRITICAL FIX #2: Ensure authenticity keywords are present (research-backed)
      // These keywords prevent plastic look: "candid photo", "candid moment", "amateur cellphone photo", "cellphone photo"
      // BUT: Skip for professional/studio/magazine requests AND Studio Pro mode
      if (!studioProMode && !wantsProfessional) {
        const hasCandid = /candid\s+(photo|moment)/i.test(prompt)
        const hasAmateur = /(amateur\s+cellphone\s+photo|cellphone\s+photo|amateur\s+photography)/i.test(prompt)
        
        if (!hasCandid && currentWordCount < MAX_WORDS) {
          // Add "candid photo" or "candid moment" before iPhone specs
          // Enhanced Authenticity mode: Use stronger candid descriptions
          const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
          const candidText = enhancedAuthenticity ? "candid moment, raw photo" : "candid photo"
          if (iphoneIndex > 0) {
            prompt = prompt.slice(0, iphoneIndex).trim() + `, ${candidText}, ` + prompt.slice(iphoneIndex)
          } else {
            prompt = prompt + `, ${candidText}`
          }
          currentWordCount = wordCount(prompt)
        }
        
        if (!hasAmateur && currentWordCount < MAX_WORDS) {
          // Add "amateur cellphone photo" or "cellphone photo" before iPhone specs
          // Enhanced Authenticity mode: Use stronger amateur descriptions
          const iphoneIndex = prompt.search(/shot\s+on\s+iPhone/i)
          const amateurText = enhancedAuthenticity ? "amateur cellphone photo, raw iPhone quality" : "amateur cellphone photo"
          if (iphoneIndex > 0) {
            prompt = prompt.slice(0, iphoneIndex).trim() + `, ${amateurText}, ` + prompt.slice(iphoneIndex)
          } else {
            prompt = prompt + `, ${amateurText}`
          }
          currentWordCount = wordCount(prompt)
        }
      } else if (studioProMode) {
        console.log("[v0] Studio Pro mode - skipping candid/amateur keywords")
      } else {
        console.log("[v0] Professional/studio request - skipping candid/amateur keywords")
      }

      // Apply complete anti-plastic validation (with user request context AND image analysis for conditional requirements)
      // Skip for Studio Pro mode - use professional quality instead
      // ALSO skip for guide prompt concepts - they should preserve the original guide prompt structure
      if (!studioProMode && !isFromGuidePrompt) {
        prompt = ensureRequiredElements(prompt, currentWordCount, MAX_WORDS, userRequest, aesthetic, imageAnalysis, studioProMode, enhancedAuthenticity, detectedGuidePrompt, templateExamples)
      } else if (isFromGuidePrompt) {
        console.log("[v0] Skipping ensureRequiredElements for guide prompt concept #" + (index + 1) + " - preserving original guide prompt")
      }
      currentWordCount = wordCount(prompt)

      console.log("[v0] Final prompt after all validation:", prompt)
      console.log("[v0] Final word count:", currentWordCount)

      // Final cleanup - use minimal cleanup for guide prompts, full cleanup for others
      if (isFromGuidePrompt) {
        // For guide prompts, only fix syntax errors - preserve user intent
        prompt = minimalCleanup(prompt, true)
      } else {
        // For regular prompts, minimal cleanup (syntax + formatting only)
        prompt = minimalCleanup(prompt, false)
        // Additional cleanup for non-guide prompts
        prompt = prompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
      }

      concept.prompt = prompt
      
      // 🔴 CRITICAL: Log final prompt for debugging (what gets saved to DB and sent to Replicate)
      console.log(`[v0] 📝 FINAL PROMPT #${index + 1} (what will be saved/sent to Replicate):`, prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""))
      console.log(`[v0] 📝 PROMPT #${index + 1} FULL LENGTH:`, prompt.length, "chars")
      console.log(`[v0] 📝 PROMPT #${index + 1} contains 'visible pores':`, /visible\s+pores/i.test(prompt))
      console.log(`[v0] 📝 PROMPT #${index + 1} contains location/scene:`, /(?:tree|sofa|fireplace|room|setting|scene|location|background|interior|illuminated|presents|Christmas)/i.test(prompt))
    })

    console.log("[v0] Post-processed prompts to ensure authenticity requirements")

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
    if (mode === "photoshoot" && photoshootBaseSeed) {
      concepts.forEach((concept, index) => {
        if (!concept.customSettings) {
          concept.customSettings = {}
        }
        concept.customSettings.seed = photoshootBaseSeed + index
      })
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
    
    // 🔴 CRITICAL: Log all final prompts before returning (what gets sent to frontend)
    console.log("[v0] ========== FINAL CONCEPT PROMPTS (RETURNED TO FRONTEND) ==========")
    concepts.slice(0, count).forEach((concept, idx) => {
      console.log(`[v0] Concept #${idx + 1} PROMPT:`, concept.prompt)
      console.log(`[v0] Concept #${idx + 1} has visible pores:`, /visible\s+pores/i.test(concept.prompt))
      console.log(`[v0] Concept #${idx + 1} has scene/location:`, /(?:tree|sofa|fireplace|room|setting|scene|location|background|interior|illuminated|presents|Christmas)/i.test(concept.prompt))
    })
    console.log("[v0] ========== END FINAL CONCEPT PROMPTS ==========")

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
        error: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 },
    )
  }
}
