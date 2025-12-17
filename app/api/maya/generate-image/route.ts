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

const sql = getDbClient()

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
    
    // CRITICAL FIX: Ensure version is just the hash, not full model path
    // replicate_version_id should be just the hash (e.g., "4e0de78d")
    // If it's in format "model:hash", extract just the hash
    let replicateVersionId = userData.replicate_version_id
    if (replicateVersionId && replicateVersionId.includes(':')) {
      const parts = replicateVersionId.split(':')
      replicateVersionId = parts[parts.length - 1] // Get last part (the hash)
      console.log("[v0] ⚠️ Version was in full format, extracted hash:", replicateVersionId)
    }
    
    const replicateModelId = userData.replicate_model_id
    const userLoraScale = userData.lora_scale
    const loraWeightsUrl = userData.lora_weights_url
    
    // Validate version exists
    if (!replicateVersionId) {
      console.error("[v0] ❌ CRITICAL: replicate_version_id is missing!")
      return NextResponse.json(
        { error: "Model version not found. Please retrain your model." },
        { status: 400 }
      )
    }

    let genderEthnicityTerm = "person"

    // Build base gender term
    const genderTerm =
      gender === "woman" || gender === "female" ? "woman" : gender === "man" || gender === "male" ? "man" : "person"

    // Add ethnicity if provided for accurate representation
    if (ethnicity && ethnicity !== "Other") {
      genderEthnicityTerm = `${ethnicity} ${genderTerm}`
    } else {
      genderEthnicityTerm = genderTerm
    }

    let finalPrompt = conceptPrompt

    if (isHighlight) {
      finalPrompt = `${finalPrompt}, professional Instagram story highlight aesthetic, elegant and minimalistic design, soft lighting, high-end editorial quality, perfect for text overlay, circular crop friendly, trending Instagram aesthetic 2025`
    }

    const promptLower = finalPrompt.toLowerCase().trim()
    const triggerLower = triggerWord.toLowerCase()

    if (!promptLower.startsWith(triggerLower)) {
      finalPrompt = `${triggerWord}, ${finalPrompt}`
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
    
    // CRITICAL FIX: If Enhanced Authenticity toggle is ON, force extra_lora_scale to 0
    // Also check for manual slider adjustment (realismStrength or extraLoraScale)
    const shouldDisableExtraLora = enhancedAuthenticity === true || hasAuthenticAesthetic
    
    // CRITICAL FIX: Map realismStrength to extraLoraScale if provided
    // Frontend sends realismStrength, but API expects extraLoraScale
    const manualExtraLoraScale = customSettings?.extraLoraScale ?? customSettings?.realismStrength
    
    const qualitySettings = {
      ...presetSettings,
      aspect_ratio: customSettings?.aspectRatio || presetSettings.aspect_ratio,
      // CRITICAL: Use user's LoRA scale from database first, then fall back to settings/preset
      // This ensures the trained model's optimal scale is used
      lora_scale: userLoraScale ?? customSettings?.styleStrength ?? presetSettings.lora_scale,
      guidance_scale: customSettings?.promptAccuracy ?? presetSettings.guidance_scale,
      extra_lora: customSettings?.extraLora || presetSettings.extra_lora,
      // CRITICAL FIX: Handle extra_lora_scale with proper priority:
      // 1. If Enhanced Authenticity toggle is ON → force to 0
      // 2. If prompt has authentic aesthetic keywords → force to 0
      // 3. If user manually adjusted slider (realismStrength/extraLoraScale) → use that value
      // 4. Otherwise → use preset default
      extra_lora_scale: shouldDisableExtraLora
        ? 0  // Disable Super-Realism LoRA for authentic photos
        : (manualExtraLoraScale !== undefined ? manualExtraLoraScale : presetSettings.extra_lora_scale),
      num_inference_steps: presetSettings.num_inference_steps,
    }
    
    console.log("[v0] LoRA Scale Priority:", {
      userLoraScaleFromDB: userLoraScale,
      styleStrengthFromSettings: customSettings?.styleStrength,
      presetLoraScale: presetSettings.lora_scale,
      finalLoraScale: qualitySettings.lora_scale
    })
    
    console.log("[v0] Super-Realism LoRA:", {
      enhancedAuthenticityToggle: enhancedAuthenticity,
      hasAuthenticAestheticKeywords: hasAuthenticAesthetic,
      shouldDisableExtraLora,
      manualExtraLoraScale,
      finalExtraLoraScale: qualitySettings.extra_lora_scale,
      reason: shouldDisableExtraLora
        ? enhancedAuthenticity 
          ? "Disabled - Enhanced Authenticity toggle is ON" 
          : "Disabled - conflicts with authentic iPhone aesthetic keywords in prompt"
        : manualExtraLoraScale !== undefined
          ? `Using manual slider value: ${manualExtraLoraScale}`
          : "Using preset/default scale"
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

    const predictionInput: any = {
      prompt: finalPrompt,
      guidance_scale: qualitySettings.guidance_scale,
      num_inference_steps: qualitySettings.num_inference_steps,
      aspect_ratio: qualitySettings.aspect_ratio,
      megapixels: qualitySettings.megapixels,
      output_format: qualitySettings.output_format,
      output_quality: qualitySettings.output_quality,
      lora_scale: Number(qualitySettings.lora_scale),
      hf_lora: loraWeightsUrl,
      seed: customSettings?.seed || qualitySettings.seed || Math.floor(Math.random() * 1000000),
      disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
      go_fast: qualitySettings.go_fast ?? false,
      num_outputs: qualitySettings.num_outputs ?? 1,
      model: qualitySettings.model ?? "dev",
    }

    // Only include Super-Realism LoRA if scale is > 0 (disabled for authentic photos)
    if (qualitySettings.extra_lora && qualitySettings.extra_lora_scale > 0) {
      predictionInput.extra_lora = qualitySettings.extra_lora
      predictionInput.extra_lora_scale = qualitySettings.extra_lora_scale
      console.log("[v0] ✅ Super-Realism LoRA included:", qualitySettings.extra_lora_scale)
    } else {
      console.log("[v0] ✅ Super-Realism LoRA disabled (scale = 0) for authentic aesthetic")
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
