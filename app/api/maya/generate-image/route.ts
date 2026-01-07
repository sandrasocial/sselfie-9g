// CLASSIC MODE - DO NOT MODIFY FOR PRO REFACTOR
// This route is for Classic mode (Flux) generation only
// Studio Pro uses /api/maya/generate-studio-pro

import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { guardClassicModeRoute } from "@/lib/maya/type-guards"
import { extractReplicateVersionId, ensureTriggerWordPrefix, ensureGenderInPrompt, buildClassicModeReplicateInput } from "@/lib/replicate-helpers"

const sql = getDbClient()

// =============================================================================
// HELPER FUNCTIONS: Extract prompt elements from Maya's creative prompts
// =============================================================================


export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60000,
  })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many image generation requests. Please wait a moment before trying again.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      conceptTitle,
      conceptDescription,
      conceptPrompt,
      category,
      chatId,
      referenceImageUrl,
      addTextOverlay,
      textOverlayConfig,
      isHighlight,
      customSettings,
      enhancedAuthenticity, // CRITICAL: Receive enhanced authenticity toggle from frontend
    } = body

    console.log("[v0] Generating image for concept:", {
      conceptTitle,
      category,
      hasReferenceImage: !!referenceImageUrl,
      addTextOverlay: !!addTextOverlay,
    })

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)

    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)

      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: CREDIT_COSTS.IMAGE,
          current: currentBalance,
          message: `Image generation requires ${CREDIT_COSTS.IMAGE} credit. You currently have ${currentBalance} credits. Please purchase more credits or upgrade your plan.`,
        },
        { status: 402 },
      )
    }

    const userDataResult = await sql`
      SELECT 
        u.gender,
        u.ethnicity,
        um.trigger_word,
        um.replicate_version_id,
        um.replicate_model_id,
        um.training_status,
        um.lora_scale,
        um.lora_weights_url
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id
      WHERE u.id = ${neonUser.id}
      AND um.training_status = 'completed'
      AND (um.is_test = false OR um.is_test IS NULL)
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    if (userDataResult.length === 0) {
      return NextResponse.json({ error: "No trained model found. Please complete training first." }, { status: 400 })
    }

    const userData = userDataResult[0]
    const triggerWord = userData.trigger_word || "person"
    const gender = userData.gender
    const ethnicity = userData.ethnicity
    
    // Extract version ID using shared helper
    const replicateVersionId = extractReplicateVersionId(userData.replicate_version_id)
    
    // Validate version exists
    if (!replicateVersionId) {
      console.error("[v0] ❌ CRITICAL: replicate_version_id is missing!")
      return NextResponse.json(
        { error: "Model version not found. Please retrain your model." },
        { status: 400 }
      )
    }
    
    const replicateModelId = userData.replicate_model_id
    const userLoraScale = userData.lora_scale
    const loraWeightsUrl = userData.lora_weights_url

    // Build user gender term (same format as concept cards)
    let userGender = "person"
    if (gender) {
      const dbGender = gender.toLowerCase().trim()
      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      }
    }

    // =============================================================================
    // USE MAYA'S PROMPT DIRECTLY WITH GENDER VALIDATION
    // =============================================================================
    // Trust Maya's generated prompt, but ensure trigger word and gender are present
    
    let finalPrompt = conceptPrompt.trim()
    
    // Ensure trigger word is first using shared helper
    finalPrompt = ensureTriggerWordPrefix(finalPrompt, triggerWord)
    
    // CRITICAL: Ensure gender is present after trigger word (fixes missing gender issue)
    finalPrompt = ensureGenderInPrompt(finalPrompt, triggerWord, userGender, ethnicity)
    
    console.log("[v0] Using Maya's prompt directly:", {
      promptLength: finalPrompt.length,
      startsWithTrigger: finalPrompt.toLowerCase().startsWith(triggerWord.toLowerCase()),
      enhancedAuthenticity: enhancedAuthenticity,
    })
    
    // Apply highlight modifications if needed
    if (isHighlight) {
      finalPrompt = `${finalPrompt}, professional Instagram story highlight aesthetic, elegant and minimalistic design, soft lighting, high-end editorial quality, perfect for text overlay, circular crop friendly, trending Instagram aesthetic 2025`
    }

    // Apply Enhanced Authenticity modifications if toggle is ON
    // This adds: muted colors, iPhone quality, film grain for authentic look
    if (enhancedAuthenticity === true) {
      finalPrompt = `${finalPrompt}, muted colors, iPhone quality, film grain, authentic cellphone photo aesthetic, natural skin texture with visible pores, amateur cellphone quality, visible sensor noise, heavy HDR glow, blown-out highlights, crushed shadows, authentic moment, unfiltered, real life texture`
      console.log("[v0] ✅ Enhanced Authenticity: Added authentic iPhone aesthetic keywords to prompt")
    }

    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
    const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

    // CRITICAL: Check multiple sources for authentic aesthetic
    // 1. Enhanced Authenticity toggle (explicit user preference)
    // 2. Prompt keywords (implicit from prompt content)
    // Note: Use finalPrompt (after trigger word check) for keyword detection
    const finalPromptLower = finalPrompt.toLowerCase()
    const hasAuthenticAesthetic = /authentic\s+iphone|amateur\s+cellphone|raw\s+iphone|candid\s+photo|film\s+grain|muted\s+colors/i.test(finalPromptLower)
    
    // CRITICAL FIX: Map realismStrength to extraLoraScale if provided
    // Frontend sends realismStrength, but API expects extraLoraScale
    // Use !== undefined to preserve 0 values (0 is a valid setting)
    const manualExtraLoraScale = customSettings?.extraLoraScale !== undefined
      ? customSettings.extraLoraScale
      : customSettings?.realismStrength
    
    // CRITICAL FIX: Enhanced Authenticity toggle is HIGHEST PRIORITY - it FORCES extra LoRA to 0
    // The toggle explicitly overrides any user realismStrength setting
    // Priority: 1. Enhanced Authenticity toggle (if ON → force 0), 2. User's realismStrength, 3. Preset default
    const hasUserSetRealism = manualExtraLoraScale !== undefined
    const shouldDisableExtraLora = enhancedAuthenticity === true || hasAuthenticAesthetic
    
    const qualitySettings = {
      ...presetSettings,
      aspect_ratio: customSettings?.aspectRatio || presetSettings.aspect_ratio,
      // CRITICAL FIX: User's manual styleStrength setting should override database value
      // Priority: 1. User's manual styleStrength (if set), 2. Database lora_scale, 3. Preset default
      // This allows users to adjust style strength even if database has a value
      lora_scale: customSettings?.styleStrength !== undefined
        ? customSettings.styleStrength  // User's manual adjustment takes priority ✅
        : (userLoraScale ?? presetSettings.lora_scale), // Fall back to DB or preset
      guidance_scale: customSettings?.promptAccuracy ?? presetSettings.guidance_scale,
      extra_lora: customSettings?.extraLora || presetSettings.extra_lora,
      // CRITICAL FIX: Handle extra_lora_scale with proper priority:
      // 1. Enhanced Authenticity toggle is HIGHEST PRIORITY → if ON, force to 0 (overrides everything)
      // 2. If prompt has authentic aesthetic keywords → force to 0
      // 3. If user explicitly set realismStrength/extraLoraScale → use that value
      // 4. Otherwise → use preset default
      extra_lora_scale: shouldDisableExtraLora
        ? 0  // Enhanced Authenticity toggle or authentic keywords → force disable ✅
        : (hasUserSetRealism
          ? manualExtraLoraScale  // User's explicit setting (if toggle is OFF)
          : presetSettings.extra_lora_scale), // Preset default
      num_inference_steps: presetSettings.num_inference_steps,
    }
    
    console.log("[v0] Generation Settings Applied:", {
      customSettingsProvided: !!customSettings,
      customSettingsKeys: customSettings ? Object.keys(customSettings) : [],
      aspectRatio: {
        fromSettings: customSettings?.aspectRatio,
        fromPreset: presetSettings.aspect_ratio,
        final: qualitySettings.aspect_ratio,
      },
      guidanceScale: {
        fromSettings: customSettings?.promptAccuracy,
        fromPreset: presetSettings.guidance_scale,
        final: qualitySettings.guidance_scale,
      },
      loraScale: {
        fromDB: userLoraScale,
        fromSettings: customSettings?.styleStrength,
        fromPreset: presetSettings.lora_scale,
        final: qualitySettings.lora_scale,
        priority: customSettings?.styleStrength !== undefined 
          ? "User's manual styleStrength (highest priority)" 
          : (userLoraScale ? "Database lora_scale (fallback)" : "Preset default"),
      },
    })
    
    console.log("[v0] LoRA Scale Priority:", {
      userLoraScaleFromDB: userLoraScale,
      styleStrengthFromSettings: customSettings?.styleStrength,
      presetLoraScale: presetSettings.lora_scale,
      finalLoraScale: qualitySettings.lora_scale
    })
    
    console.log("[v0] Super-Realism LoRA:", {
      enhancedAuthenticityToggle: enhancedAuthenticity,
      hasAuthenticAestheticKeywords: hasAuthenticAesthetic,
      hasUserSetRealism,
      manualExtraLoraScale,
      shouldDisableExtraLora,
      finalExtraLoraScale: qualitySettings.extra_lora_scale,
      reason: shouldDisableExtraLora
        ? (enhancedAuthenticity 
          ? "Disabled - Enhanced Authenticity toggle is ON (highest priority override)" 
          : "Disabled - conflicts with authentic iPhone aesthetic keywords in prompt")
        : (hasUserSetRealism
          ? `Using user's explicit setting: ${manualExtraLoraScale}`
          : "Using preset/default scale")
    })

    let replicate
    try {
      replicate = getReplicateClient()
    } catch (error) {
      console.error("[v0] Failed to initialize Replicate client:", error)
      return NextResponse.json(
        {
          error: "Replicate API configuration error",
          details:
            error instanceof Error
              ? error.message
              : "Please check your REPLICATE_API_TOKEN in the Vars section. Get a valid token from https://replicate.com/account/api-tokens",
        },
        { status: 500 },
      )
    }

    // Calculate seed: customSettings seed, preset seed, or random
    const seed = customSettings?.seed || qualitySettings.seed || Math.floor(Math.random() * 1000000)

    // Build Replicate input using shared helper
    // The helper handles conditional extra_lora inclusion (only if scale > 0)
    const predictionInput = buildClassicModeReplicateInput({
      prompt: finalPrompt,
      qualitySettings,
      loraWeightsUrl,
      seed,
      referenceImageUrl,
      extraLoraDisabled: shouldDisableExtraLora, // Pass the computed flag
    })

    if (qualitySettings.extra_lora && qualitySettings.extra_lora_scale && qualitySettings.extra_lora_scale > 0 && !shouldDisableExtraLora) {
      console.log("[v0] ✅ Super-Realism LoRA included:", qualitySettings.extra_lora_scale)
    } else {
      console.log("[v0] ✅ Super-Realism LoRA disabled (scale = 0) for authentic aesthetic")
    }

    if (referenceImageUrl) {
      console.log("[v0] ✅ Reference image included in input")
    }

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: predictionInput,
    })

    const deductionResult = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `Generated: ${conceptTitle}`,
      prediction.id,
    )

    if (!deductionResult.success) {
      console.error("[v0] [CREDITS] Failed to deduct credits:", deductionResult.error)
    }

    const insertResult = await sql`
      INSERT INTO generated_images (
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        created_at
      ) VALUES (
        ${neonUser.id},
        ${finalPrompt},
        ${conceptDescription},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({
          prediction_id: prediction.id,
          status: "processing",
          text_overlay: addTextOverlay ? textOverlayConfig : null,
        })},
        NOW()
      )
      RETURNING id
    `

    const generationId = insertResult[0].id

    return NextResponse.json({
      success: true,
      generationId,
      predictionId: prediction.id,
      status: "processing",
      fluxPrompt: finalPrompt,
      textOverlay: addTextOverlay ? textOverlayConfig : null,
      creditsDeducted: CREDIT_COSTS.IMAGE,
      newBalance: deductionResult.success ? deductionResult.newBalance : undefined,
    })
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const is401Error = errorMessage.includes("401") || errorMessage.includes("Unauthenticated")

    return NextResponse.json(
      {
        error: is401Error ? "Replicate authentication failed" : "Failed to generate image",
        details: is401Error
          ? "Your REPLICATE_API_TOKEN is invalid or expired. Please update it in the Vars section. Get a new token from https://replicate.com/account/api-tokens"
          : errorMessage,
      },
      { status: 500 },
    )
  }
}
