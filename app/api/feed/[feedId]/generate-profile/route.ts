import type { NextRequest } from "next/server"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"

export async function POST(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const user = await getCurrentNeonUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feedId } = params
    const sql = neon(process.env.DATABASE_URL!)

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe, profile_image_url, profile_image_prompt FROM feed_layouts WHERE id = ${feedId}
    `

    if (!feedLayout) {
      return Response.json({ error: "Feed not found" }, { status: 404 })
    }

    const [model] = await sql`
      SELECT trigger_word, replicate_version_id, lora_scale, lora_weights_url
      FROM user_models
      WHERE user_id = ${user.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!model) {
      return Response.json({ error: "No trained model found" }, { status: 400 })
    }

    if (!model.lora_weights_url) {
      return Response.json({ error: "LoRA weights URL not found" }, { status: 400 })
    }

    const basePrompt = feedLayout.profile_image_prompt

    if (!basePrompt) {
      return Response.json(
        { error: "No profile image prompt found. Please regenerate your feed strategy." },
        { status: 400 },
      )
    }

    const finalPrompt = `${model.trigger_word}, ${basePrompt}`

    const qualitySettings = MAYA_QUALITY_PRESETS.default

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    console.log("[v0] Generating profile image:", {
      feedId,
      prompt: finalPrompt,
    })

    const replicate = getReplicateClient()

    const prediction = await replicate.predictions.create({
      version: model.replicate_version_id,
      input: {
        prompt: finalPrompt,
        ...qualitySettings,
        lora: model.lora_weights_url,
      },
    })

    console.log("[v0] Profile image prediction created:", prediction.id)

    return Response.json({ predictionId: prediction.id })
  } catch (error: any) {
    console.error("[v0] Error generating profile image:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
