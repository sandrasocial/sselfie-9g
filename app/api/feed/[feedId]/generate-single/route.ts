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

    const { postId } = await req.json()
    const { feedId } = params

    const sql = neon(process.env.DATABASE_URL!)

    const [post] = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedId} AND id = ${postId}
    `

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe FROM feed_layouts WHERE id = ${feedId}
    `

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

    console.log("[v0] Calling Maya to generate feed post prompt...")
    const mayaResponse = await fetch(`${req.nextUrl.origin}/api/maya/generate-feed-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType: post.post_type,
        caption: post.text_overlay,
        feedPosition: post.position,
        colorTheme: feedLayout?.color_palette,
        brandVibe: feedLayout?.brand_vibe,
      }),
    })

    let finalPrompt
    if (!mayaResponse.ok) {
      console.error("[v0] Maya prompt generation failed with status:", mayaResponse.status)

      // Try to get error details if available
      try {
        const errorText = await mayaResponse.text()
        console.error("[v0] Error response:", errorText)

        // Check if it's a rate limit error
        if (mayaResponse.status === 429 || errorText.includes("Too Many Requests")) {
          return Response.json({ error: "Rate limit exceeded. Please wait a moment and try again." }, { status: 429 })
        }
      } catch (e) {
        console.error("[v0] Could not parse error response")
      }

      // Fallback to simple prompt for other errors
      finalPrompt = post.prompt || `${model.trigger_word}, ${post.visual_description}`
    } else {
      try {
        const mayaData = await mayaResponse.json()
        finalPrompt = mayaData.prompt
        console.log("[v0] Maya generated prompt:", finalPrompt)
      } catch (jsonError) {
        console.error("[v0] Failed to parse Maya response as JSON:", jsonError)
        // Fallback to simple prompt if JSON parsing fails
        finalPrompt = post.prompt || `${model.trigger_word}, ${post.visual_description}`
      }
    }

    const qualitySettings =
      MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    console.log("[v0] Generating feed post:", {
      postId,
      postType: post.post_type,
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

    console.log("[v0] Prediction created:", prediction.id)

    await sql`
      UPDATE feed_posts
      SET generation_status = 'generating', prediction_id = ${prediction.id}
      WHERE id = ${postId}
    `

    return Response.json({ predictionId: prediction.id })
  } catch (error: any) {
    console.error("[v0] Error generating single post:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
