import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { rateLimit } from "@/lib/rate-limit-api"
import { getUserTrainedModel } from "@/lib/data/studio"
import { createServerClient } from "@/lib/supabase/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { checkCredits, deductCredits } from "@/lib/credits"

const sql = getDbClient()

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
  })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many generation requests. Please wait a moment before trying again.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [neonUser] = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { prompt, category, subcategory } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const creditsNeeded = 4 // 4 images = 4 credits
    const hasCredits = await checkCredits(neonUser.id, creditsNeeded)
    if (!hasCredits) {
      console.log("[v0] User has insufficient credits for image generation")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Get user's trained model
    const model = await getUserTrainedModel(neonUser.id)

    if (!model) {
      return NextResponse.json({ error: "No trained model found. Please train a model first." }, { status: 400 })
    }

    console.log("[v0] Starting generation with model:", model.model_name)
    console.log("[v0] Trigger word:", model.trigger_word)
    console.log("[v0] User prompt:", prompt)
    console.log("[v0] LoRA weights URL:", model.lora_weights_url)
    console.log("[v0] LoRA scale:", model.lora_scale)

    if (!model.lora_weights_url || model.lora_weights_url.trim() === "") {
      console.log("[v0] ❌ LoRA weights URL is missing for user")
      return NextResponse.json(
        { error: "LoRA weights URL not found. Please contact support to fix your model." },
        { status: 400 },
      )
    }

    const replicate = getReplicateClient()

    // Construct the full prompt with trigger word
    const fullPrompt = `${model.trigger_word} ${prompt}`

    console.log("[v0] Full prompt:", fullPrompt)

    // Use Maya's quality presets (same as other routes)
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const categoryKey = (category || "portrait") as keyof typeof MAYA_QUALITY_PRESETS
    const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

    // Studio generates 4 variations, so override num_outputs
    const qualitySettings = {
      ...presetSettings,
      num_outputs: 4, // Studio generates 4 variations
      aspect_ratio: "1:1", // Studio uses square format
      lora_scale: Number(model.lora_scale || presetSettings.lora_scale),
    }

    // Start generation using the trained model with quality presets
    const prediction = await replicate.predictions.create({
      version: model.replicate_version_id,
      input: {
        prompt: fullPrompt,
        guidance_scale: qualitySettings.guidance_scale,
        num_inference_steps: qualitySettings.num_inference_steps,
        aspect_ratio: qualitySettings.aspect_ratio,
        megapixels: qualitySettings.megapixels,
        output_format: qualitySettings.output_format,
        output_quality: qualitySettings.output_quality,
        lora_scale: qualitySettings.lora_scale,
        hf_lora: model.lora_weights_url,
        extra_lora: qualitySettings.extra_lora,
        extra_lora_scale: qualitySettings.extra_lora_scale,
        disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
        go_fast: qualitySettings.go_fast ?? false,
        num_outputs: qualitySettings.num_outputs,
        model: qualitySettings.model ?? "dev",
      },
    })

    console.log("[v0] Prediction created:", prediction.id)
    console.log("[v0] ✅ LoRA weights sent to Replicate:", model.lora_weights_url)
    console.log("[v0] ✅ LoRA scale:", qualitySettings.lora_scale)
    console.log("[v0] ✅ Extra LoRA (Realism) scale:", qualitySettings.extra_lora_scale)
    console.log("[v0] ✅ Using quality preset:", categoryKey)

    // Save generation record to database
    const [generation] = await sql`
      INSERT INTO generated_images (
        user_id,
        model_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        saved
      ) VALUES (
        ${neonUser.id},
        ${model.id},
        ${prompt},
        ${prompt},
        ${category || "custom"},
        ${subcategory || null},
        ${prediction.id},
        false
      )
      RETURNING id
    `

    // Wrapped in try/catch to avoid breaking the response if deduction fails
    try {
      await deductCredits(neonUser.id, creditsNeeded, "image", prompt)
      console.log("[v0] Successfully deducted", creditsNeeded, "credits for image generation")
    } catch (deductError) {
      console.error("[v0] Failed to deduct credits for image generation (non-fatal):", deductError)
    }

    return NextResponse.json({
      generationId: generation.id,
      predictionId: prediction.id,
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error starting generation:", error)
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 })
  }
}
