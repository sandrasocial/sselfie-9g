import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(request: NextRequest) {
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
    const userLoraScale = userData.lora_scale
    const loraWeightsUrl = userData.lora_weights_url

    console.log("[v0] User training data:", { triggerWord, gender, replicateVersionId, userLoraScale, loraWeightsUrl })

    if (!loraWeightsUrl || loraWeightsUrl.trim() === "") {
      console.log("[v0] ❌ LoRA weights URL is missing for user")
      return NextResponse.json(
        { error: "LoRA weights URL not found. Please contact support to fix your model." },
        { status: 400 },
      )
    }

    let finalPrompt = conceptPrompt

    if (isHighlight) {
      // For highlights, we want elegant background images that will have text overlaid
      // Focus on creating beautiful, minimalistic backgrounds
      finalPrompt = `${conceptPrompt}, professional Instagram story highlight aesthetic, elegant and minimalistic design, soft lighting, high-end editorial quality, perfect for text overlay, circular crop friendly, trending Instagram aesthetic 2025`
    }

    if (!finalPrompt.toLowerCase().startsWith(triggerWord.toLowerCase())) {
      finalPrompt = `${triggerWord}, ${finalPrompt}`
    }

    console.log("[v0] Final FLUX prompt (Maya's gender-aware prompt):", finalPrompt)

    const qualitySettings =
      MAYA_QUALITY_PRESETS[category as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    if (customSettings) {
      if (customSettings.styleStrength !== undefined) {
        qualitySettings.lora_scale = Number(customSettings.styleStrength)
        console.log("[v0] Using custom style strength (LoRA scale):", qualitySettings.lora_scale)
      }
      if (customSettings.promptAccuracy !== undefined) {
        qualitySettings.guidance_scale = Number(customSettings.promptAccuracy)
        console.log("[v0] Using custom prompt accuracy (guidance scale):", qualitySettings.guidance_scale)
      }
    } else if (userLoraScale !== null && userLoraScale !== undefined) {
      qualitySettings.lora_scale = Number(userLoraScale)
      console.log("[v0] Using user-specific LoRA scale:", qualitySettings.lora_scale)
    } else {
      qualitySettings.lora_scale = 1.05
      console.log("[v0] Using default LoRA scale:", qualitySettings.lora_scale)
    }

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
      ...qualitySettings,
      ...(qualitySettings.lora_scale !== undefined && { lora_scale: Number(qualitySettings.lora_scale) }),
      lora: loraWeightsUrl,
    }

    if (referenceImageUrl) {
      console.log("[v0] ========== REFERENCE IMAGE DETECTED ==========")
      console.log("[v0] Reference Image URL:", referenceImageUrl)
      console.log("[v0] Adding to prediction input as 'image' parameter")

      // For FLUX LoRA models, use 'image' parameter for img2img
      predictionInput.image = referenceImageUrl
      // prompt_strength controls how much the output matches the input (0-1)
      // Lower = more like input image, Higher = more creative freedom
      predictionInput.prompt_strength = 0.5

      console.log("[v0] Image parameter set:", predictionInput.image)
      console.log("[v0] Prompt strength set:", predictionInput.prompt_strength)
      console.log("[v0] This will blend the reference image with your trained model")
      console.log("[v0] ================================================")
    }

    console.log("[v0] ========== FULL PREDICTION INPUT ==========")
    console.log("[v0] ✅ LoRA weights URL:", loraWeightsUrl)
    console.log("[v0] ✅ LoRA scale:", predictionInput.lora_scale)
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
      "image", // Fixed: was "image_generation", should be "image"
      `Generated: ${conceptTitle}`,
      prediction.id,
    )

    if (!deductionResult.success) {
      console.error("[v0] [CREDITS] Failed to deduct credits:", deductionResult.error)
      // but log the error for investigation
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
