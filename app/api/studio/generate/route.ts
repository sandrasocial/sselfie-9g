import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserTrainedModel } from "@/lib/data/studio"
import { createServerClient } from "@/lib/supabase/server"
import Replicate from "replicate"

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

    // Initialize Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!,
    })

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
        output_format: "webp",
        output_quality: 90,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
    })

    console.log("[v0] Prediction created:", prediction.id)

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
