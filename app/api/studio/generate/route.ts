import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserTrainedModel } from "@/lib/data/studio"
import { createServerClient } from "@/lib/supabase/server"
import { getReplicateClient } from "@/lib/replicate-client"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
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

    // Start generation using the trained model
    const prediction = await replicate.predictions.create({
      version: model.replicate_version_id,
      input: {
        prompt: fullPrompt,
        num_outputs: 4,
        aspect_ratio: "1:1",
        output_format: "png", // Updated from webp to png
        output_quality: 100, // Updated from 90 to 100
        num_inference_steps: 28,
        guidance_scale: 5,
        lora: model.lora_weights_url,
        lora_scale: model.lora_scale || 0.9,
        extra_lora_scale: 1, // Added new flux parameters
        megapixels: "1",
        prompt_strength: 0.8,
        model: "dev",
      },
    })

    console.log("[v0] Prediction created:", prediction.id)
    console.log("[v0] ✅ LoRA weights sent to Replicate:", model.lora_weights_url)
    console.log("[v0] ✅ LoRA scale:", model.lora_scale || 0.9)

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
