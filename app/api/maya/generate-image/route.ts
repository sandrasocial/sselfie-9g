import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conceptTitle, conceptDescription, conceptPrompt, category, chatId, referenceImageUrl } = body

    console.log("[v0] Generating image for concept:", {
      conceptTitle,
      category,
      hasReferenceImage: !!referenceImageUrl,
    })

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] Neon user ID:", neonUser.id)

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

    // Add trigger word if not present
    if (!finalPrompt.toLowerCase().includes(triggerWord.toLowerCase())) {
      finalPrompt = `${triggerWord}, ${finalPrompt}`
    }

    // Add gender token if not present
    const genderToken = gender === "woman" ? "woman" : gender === "man" ? "man" : "person"
    if (!finalPrompt.toLowerCase().includes(genderToken)) {
      finalPrompt = finalPrompt.replace(triggerWord, `${triggerWord}, ${genderToken}`)
    }

    if (category === "Full Body") {
      // Emphasize facial clarity in full-body compositions
      const facialEmphasis = "detailed face, clear facial features, sharp eyes"
      if (!finalPrompt.toLowerCase().includes("face") && !finalPrompt.toLowerCase().includes("facial")) {
        finalPrompt = `${finalPrompt}, ${facialEmphasis}`
      }
    }

    console.log("[v0] Final FLUX prompt (trigger word + gender only):", finalPrompt)

    const qualitySettings =
      MAYA_QUALITY_PRESETS[category as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    if (userLoraScale !== null && userLoraScale !== undefined) {
      qualitySettings.lora_scale = Number(userLoraScale)
      console.log("[v0] Using user-specific LoRA scale:", qualitySettings.lora_scale)
    } else {
      qualitySettings.lora_scale = 0.9
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

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: predictionInput,
    })

    console.log("[v0] ========== REPLICATE RESPONSE ==========")
    console.log("[v0] Prediction ID:", prediction.id)
    console.log("[v0] Prediction status:", prediction.status)
    console.log("[v0] Full prediction object:", JSON.stringify(prediction, null, 2))
    console.log("[v0] ================================================")

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
        ${JSON.stringify({ prediction_id: prediction.id, status: "processing" })},
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
