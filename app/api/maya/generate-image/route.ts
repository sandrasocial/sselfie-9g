import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"

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
    } = body

    console.log("[v0] Generating image for concept:", {
      conceptTitle,
      category,
      hasReferenceImage: !!referenceImageUrl,
      addTextOverlay: !!addTextOverlay,
    })

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] Neon user ID:", neonUser.id)

    console.log("[v0] [CREDITS] Checking if user has enough credits...")
    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)
    console.log("[v0] [CREDITS] Has enough credits:", hasEnoughCredits)

    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)
      console.log("[v0] [CREDITS] User has insufficient credits:", {
        userId: neonUser.id,
        currentBalance,
        required: CREDIT_COSTS.IMAGE,
      })

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
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    if (userDataResult.length === 0) {
      return NextResponse.json({ error: "No trained model found. Please complete training first." }, { status: 400 })
    }

    const userData = userDataResult[0]
    const triggerWord = userData.trigger_word || "person"
    const gender = userData.gender
    const replicateVersionId = userData.replicate_version_id
    const replicateModelId = userData.replicate_model_id
    const userLoraScale = userData.lora_scale
    const loraWeightsUrl = userData.lora_weights_url

    console.log("[v0] User training data:", {
      triggerWord,
      gender,
      replicateVersionId,
      replicateModelId,
      userLoraScale,
      loraWeightsUrl,
    })

    const genderTerm =
      gender === "woman" || gender === "female" ? "woman" : gender === "man" || gender === "male" ? "man" : "person"
    console.log("[v0] Gender term for FLUX:", genderTerm)

    let versionHash = replicateVersionId
    if (replicateVersionId && replicateVersionId.includes(":")) {
      versionHash = replicateVersionId.split(":").pop()
    }

    const userLoraPath = replicateModelId && versionHash ? `${replicateModelId}:${versionHash}` : loraWeightsUrl

    if (!userLoraPath || userLoraPath.trim() === "") {
      console.log("[v0] ❌ LoRA path/URL is missing for user")
      return NextResponse.json(
        { error: "LoRA model not found. Please contact support to fix your model." },
        { status: 400 },
      )
    }

    console.log("[v0] User LoRA path format:", userLoraPath)

    let finalPrompt = conceptPrompt

    const promptStart = finalPrompt.toLowerCase().trim().substring(0, 50)
    const hasGenderDescriptor = promptStart.includes(`a ${genderTerm}`) || promptStart.includes(`the ${genderTerm}`)

    if (!hasGenderDescriptor) {
      console.log("[v0] ⚠️ Gender descriptor missing from prompt, adding it now")
      finalPrompt = `a ${genderTerm}, ${finalPrompt}`
    } else {
      console.log("[v0] ✅ Gender descriptor present in prompt:", genderTerm)
    }

    if (isHighlight) {
      finalPrompt = `${finalPrompt}, professional Instagram story highlight aesthetic, elegant and minimalistic design, soft lighting, high-end editorial quality, perfect for text overlay, circular crop friendly, trending Instagram aesthetic 2025`
    }

    console.log("[v0] Final FLUX prompt (Maya's gender-aware prompt):", finalPrompt)

    const promptLower = finalPrompt.toLowerCase().trim()
    const triggerLower = triggerWord.toLowerCase()

    if (!promptLower.startsWith(triggerLower)) {
      finalPrompt = `${triggerWord}, ${finalPrompt}`
      console.log("[v0] Added trigger word to start of prompt")
    } else {
      console.log("[v0] Trigger word already present, not adding duplicate")
    }

    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
    const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

    console.log("[v0] Using quality preset for category:", category)

    const qualitySettings = {
      ...presetSettings,
      aspect_ratio: customSettings?.aspectRatio || presetSettings.aspect_ratio,
      lora_scale: customSettings?.styleStrength ?? presetSettings.lora_scale,
      guidance_scale: customSettings?.promptAccuracy ?? presetSettings.guidance_scale,
      extra_lora: customSettings?.extraLora,
      extra_lora_scale: customSettings?.extraLoraScale,
    }

    console.log("[v0] Final quality settings:", {
      category,
      presetDefaults: presetSettings,
      userOverrides: customSettings,
      final: qualitySettings,
    })

    console.log("[v0] Initializing Replicate client...")
    let replicate
    try {
      replicate = getReplicateClient()
      console.log("[v0] Replicate client initialized successfully")
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

    console.log("[v0] Creating prediction with version:", replicateVersionId)
    console.log("[v0] Quality settings:", qualitySettings)

    const predictionInput: any = {
      prompt: finalPrompt,
      guidance_scale: qualitySettings.guidance_scale,
      num_inference_steps: qualitySettings.num_inference_steps,
      aspect_ratio: qualitySettings.aspect_ratio,
      megapixels: qualitySettings.megapixels,
      output_format: qualitySettings.output_format,
      output_quality: qualitySettings.output_quality,
      prompt_strength: qualitySettings.prompt_strength,
      lora_scale: Number(qualitySettings.lora_scale),
      hf_lora: userLoraPath,
      seed: qualitySettings.seed || Math.floor(Math.random() * 1000000),
      disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
      go_fast: qualitySettings.go_fast ?? false,
      num_outputs: qualitySettings.num_outputs ?? 1,
      model: qualitySettings.model ?? "dev",
    }

    if (qualitySettings.extra_lora) {
      predictionInput.extra_lora = qualitySettings.extra_lora
      predictionInput.extra_lora_scale = qualitySettings.extra_lora_scale || 0.6
      console.log("[v0] ✅ Extra LoRA (Realism):", predictionInput.extra_lora)
      console.log("[v0] ✅ Extra LoRA scale:", predictionInput.extra_lora_scale)
    }

    console.log("[v0] ========== FULL PREDICTION INPUT ==========")
    console.log("[v0] ✅ User LoRA path (hf_lora):", userLoraPath)
    console.log("[v0] ✅ LoRA scale:", predictionInput.lora_scale)
    console.log("[v0] ✅ Model:", predictionInput.model)
    console.log("[v0] ✅ Seed:", predictionInput.seed)
    console.log("[v0] ✅ Num outputs:", predictionInput.num_outputs)
    console.log("[v0] ✅ Go fast:", predictionInput.go_fast)
    console.log("[v0] Prediction input:", JSON.stringify(predictionInput, null, 2))
    console.log("[v0] ================================================")

    console.log("[v0] [CREDITS] Creating Replicate prediction...")
    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: predictionInput,
    })

    console.log("[v0] ========== REPLICATE RESPONSE ==========")
    console.log("[v0] Prediction ID:", prediction.id)
    console.log("[v0] Prediction status:", prediction.status)
    console.log("[v0] Full prediction object:", JSON.stringify(prediction, null, 2))
    console.log("[v0] ================================================")

    console.log("[v0] [CREDITS] Deducting credits after successful prediction creation...")
    const deductionResult = await deductCredits(
      neonUser.id,
      CREDIT_COSTS.IMAGE,
      "image",
      `Generated: ${conceptTitle}`,
      prediction.id,
    )

    if (!deductionResult.success) {
      console.error("[v0] [CREDITS] Failed to deduct credits:", deductionResult.error)
    } else {
      console.log("[v0] [CREDITS] Deducted", CREDIT_COSTS.IMAGE, "credit. New balance:", deductionResult.newBalance)
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
