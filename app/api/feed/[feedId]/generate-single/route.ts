import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { checkGenerationRateLimit } from "@/lib/rate-limit"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"

export async function POST(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return Response.json({ error: "User not found in database" }, { status: 404 })
    }

    const rateLimit = await checkGenerationRateLimit(user.id.toString())
    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset)
      return Response.json(
        {
          error: "Rate limit exceeded",
          details: `You've reached the limit of ${rateLimit.limit} images per hour. Resets at ${resetDate.toLocaleTimeString()}.`,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 },
      )
    }

    const hasCredits = await checkCredits(user.id.toString(), CREDIT_COSTS.IMAGE)
    if (!hasCredits) {
      return Response.json(
        {
          error: "Insufficient credits",
          details: `You need ${CREDIT_COSTS.IMAGE} credit to generate an image. Please purchase more credits.`,
          creditsNeeded: CREDIT_COSTS.IMAGE,
        },
        { status: 402 },
      )
    }

    const { postId } = await req.json()
    const { feedId } = params

    if (!feedId || feedId === "null" || feedId === "undefined") {
      console.error("[v0] [GENERATE-SINGLE] Invalid feedId:", feedId)
      return Response.json(
        {
          error: "Invalid feed ID",
          details: "Feed ID is required to generate a post. Please refresh the page and try again.",
          shouldRetry: false,
        },
        { status: 400 },
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      console.error("[v0] [GENERATE-SINGLE] feedId is not a valid integer:", feedId)
      return Response.json(
        {
          error: "Invalid feed ID format",
          details: "Feed ID must be a valid number. Please refresh the page and try again.",
          shouldRetry: false,
        },
        { status: 400 },
      )
    }

    const [post] = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt} AND id = ${postId}
    `

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe FROM feed_layouts WHERE id = ${feedIdInt}
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

    let finalPrompt = post.prompt

    // Only call Maya if prompt is missing (fallback)
    if (!finalPrompt || finalPrompt.trim().length === 0) {
      console.log("[v0] [GENERATE-SINGLE] No prompt found, calling Maya to generate one...")
      console.log("[v0] [GENERATE-SINGLE] Request data:", {
        postType: post.post_type,
        caption: post.caption?.substring(0, 50),
        feedPosition: post.position,
        colorTheme: feedLayout?.color_palette,
        brandVibe: feedLayout?.brand_vibe,
      })

      let mayaResponse
      try {
        mayaResponse = await fetch(`${req.nextUrl.origin}/api/maya/generate-feed-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postType: post.post_type,
            caption: post.caption,
            feedPosition: post.position,
            colorTheme: feedLayout?.color_palette,
            brandVibe: feedLayout?.brand_vibe,
          }),
        })
        console.log("[v0] [GENERATE-SINGLE] Maya response status:", mayaResponse.status)
      } catch (fetchError: any) {
        console.error("[v0] [GENERATE-SINGLE] Fetch error:", {
          message: fetchError.message,
          stack: fetchError.stack,
          cause: fetchError.cause,
        })
        return Response.json(
          {
            error: "Failed to generate intelligent prompt",
            details: "Maya's prompt generation service is unavailable. Please try again.",
            shouldRetry: true,
          },
          { status: 503 },
        )
      }

      if (!mayaResponse.ok) {
        console.error("[v0] [GENERATE-SINGLE] Maya prompt generation failed with status:", mayaResponse.status)

        let errorMessage = "Maya's prompt generation failed. Please try again."
        const shouldRetry = true

        try {
          const errorData = await mayaResponse.json()
          console.error("[v0] [GENERATE-SINGLE] Error response:", errorData)

          if (mayaResponse.status === 429) {
            errorMessage = "Rate limit exceeded. Please wait a moment and try again."
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          console.error("[v0] [GENERATE-SINGLE] Could not parse error response")
        }

        return Response.json(
          {
            error: errorMessage,
            details: "Maya's intelligent prompt generation is required for your designed feed.",
            shouldRetry,
          },
          { status: mayaResponse.status },
        )
      }

      try {
        const mayaData = await mayaResponse.json()
        finalPrompt = mayaData.prompt
        console.log("[v0] [GENERATE-SINGLE] Maya generated prompt:", finalPrompt?.substring(0, 100))

        if (!finalPrompt || finalPrompt.trim().length === 0) {
          console.error("[v0] [GENERATE-SINGLE] Maya returned empty prompt")
          return Response.json(
            {
              error: "Maya generated an empty prompt. Please try again.",
              shouldRetry: true,
            },
            { status: 500 },
          )
        }
      } catch (jsonError) {
        console.error("[v0] [GENERATE-SINGLE] Failed to parse Maya response as JSON:", jsonError)
        return Response.json(
          {
            error: "Failed to parse Maya's response. Please try again.",
            shouldRetry: true,
          },
          { status: 500 },
        )
      }
    } else {
      console.log("[v0] [GENERATE-SINGLE] Using existing prompt from database:", finalPrompt.substring(0, 100))
    }

    const qualitySettings =
      MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    console.log("[v0] [GENERATE-SINGLE] Generating feed post with Maya's intelligent prompt:", {
      postId,
      postType: post.post_type,
      promptLength: finalPrompt.length,
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

    console.log("[v0] [GENERATE-SINGLE] Prediction created:", prediction.id)

    const deduction = await deductCredits(
      user.id.toString(),
      CREDIT_COSTS.IMAGE,
      "image",
      `Feed post generation - ${post.post_type}`,
      prediction.id,
    )

    if (!deduction.success) {
      console.error("[v0] [GENERATE-SINGLE] Failed to deduct credits:", deduction.error)
      // Note: Prediction already created, so we continue but log the error
    } else {
      console.log("[v0] [GENERATE-SINGLE] Credits deducted. New balance:", deduction.newBalance)
    }

    await sql`
      UPDATE feed_posts
      SET generation_status = 'generating', prediction_id = ${prediction.id}, prompt = ${finalPrompt}
      WHERE id = ${postId}
    `

    return Response.json({ predictionId: prediction.id })
  } catch (error: any) {
    console.error("[v0] [GENERATE-SINGLE] Error generating single post:", error)
    return Response.json(
      {
        error: "Failed to generate post",
        details: error.message,
        shouldRetry: true,
      },
      { status: 500 },
    )
  }
}
