import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

async function getReplicatePredictionWithRetry(predictionId: string, maxRetries = 3, baseDelay = 1000): Promise<any> {
  const replicate = getReplicateClient()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prediction = await replicate.predictions.get(predictionId)
      return prediction
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      const isRateLimit =
        error?.response?.status === 429 ||
        errorMessage.includes("429") ||
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("rate limit")

      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`[v0] Replicate rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // If not a rate limit error or we've exhausted retries, throw
      throw error
    }
  }

  throw new Error("Failed to get prediction after retries")
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const postId = searchParams.get("postId")

    console.log("[v0] Check-post API called with:", { predictionId, postId })

    if (!predictionId || !postId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const [existingPost] = await sql`
      SELECT image_url, generation_status FROM feed_posts WHERE id = ${Number.parseInt(postId)}
    `

    if (existingPost?.generation_status === "completed" && existingPost?.image_url) {
      console.log("[v0] Post already completed, returning cached result")
      return NextResponse.json({
        status: "succeeded",
        imageUrl: existingPost.image_url,
      })
    }

    let prediction
    try {
      prediction = await getReplicatePredictionWithRetry(predictionId)
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      const isRateLimit =
        error?.response?.status === 429 ||
        errorMessage.includes("429") ||
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("rate limit")

      if (isRateLimit) {
        console.log("[v0] Replicate rate limit exceeded, returning processing status")
        // Return processing status instead of error to allow polling to continue
        return NextResponse.json({
          status: "processing",
          message: "Rate limit reached, please wait...",
        })
      }

      console.error("[v0] Error getting Replicate prediction:", errorMessage)
      return NextResponse.json(
        {
          error: "Failed to check generation status",
          details: errorMessage,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Replicate prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      console.log("[v0] Prediction succeeded, uploading to Blob storage...")

      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      const blob = await put(`feed-posts/${postId}.png`, imageBlob, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true,
      })

      console.log("[v0] Image uploaded to Blob:", blob.url)

      await sql`
        UPDATE feed_posts
        SET 
          image_url = ${blob.url},
          generation_status = 'completed',
          updated_at = NOW()
        WHERE id = ${Number.parseInt(postId)}
      `

      console.log("[v0] Feed post updated with image URL")

      try {
        const [post] = await sql`
          SELECT prompt, post_type, user_id FROM feed_posts WHERE id = ${Number.parseInt(postId)}
        `

        if (post) {
          // Check if this image already exists in the gallery by prediction_id
          const [existing] = await sql`
            SELECT id FROM ai_images WHERE prediction_id = ${predictionId}
          `

          if (!existing) {
            // Only insert if it doesn't already exist
            await sql`
              INSERT INTO ai_images (
                user_id,
                image_url,
                prompt,
                prediction_id,
                generation_status,
                source,
                category,
                created_at
              ) VALUES (
                ${post.user_id},
                ${blob.url},
                ${post.prompt || ""},
                ${predictionId},
                'completed',
                'feed_designer',
                ${post.post_type || "feed_post"},
                NOW()
              )
            `
            console.log("[v0] Image saved to ai_images gallery (new entry)")
          } else {
            console.log("[v0] Image already exists in gallery, skipping duplicate save")
          }
        }
      } catch (galleryError: any) {
        const errorMessage = galleryError?.message || String(galleryError)
        console.error("[v0] Failed to save to ai_images gallery:", errorMessage)
        // Don't fail the request if gallery save fails - the main post is still successful
      }

      return NextResponse.json({
        status: "succeeded",
        imageUrl: blob.url,
      })
    } else if (prediction.status === "failed") {
      await sql`
        UPDATE feed_posts
        SET generation_status = 'failed'
        WHERE id = ${Number.parseInt(postId)}
      `

      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error: any) {
    console.error("[v0] Error checking post generation:", error)
    return NextResponse.json(
      {
        error: "Failed to check generation status",
        details: error?.message || String(error),
      },
      { status: 500 },
    )
  }
}
