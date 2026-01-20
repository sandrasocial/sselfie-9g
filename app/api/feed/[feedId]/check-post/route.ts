import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"
import { hookFeedPostGeneration } from "@/lib/quality/hooks"

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
      SELECT id, user_id, feed_layout_id, image_url, generation_status, prediction_id
      FROM feed_posts
      WHERE id = ${Number.parseInt(postId)}
    `

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (existingPost.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If post is already completed with an image, return it
    if (existingPost?.generation_status === "completed" && existingPost?.image_url) {
      console.log("[v0] Post already completed, returning cached result")
      return NextResponse.json({
        status: "succeeded",
        imageUrl: existingPost.image_url,
      })
    }

    // If the prediction_id in the database doesn't match the one we're checking, 
    // this might be an old regeneration attempt - still check it but log a warning
    if (existingPost?.prediction_id && existingPost.prediction_id !== predictionId) {
      console.warn("[v0] ⚠️ Prediction ID mismatch! Database has:", existingPost.prediction_id, "but checking:", predictionId)
      console.warn("[v0] This might be an old regeneration. The post may need to be regenerated again.")
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
      
      // Use replicate error handler for user-friendly messages
      const { formatReplicateErrorResponse } = await import("@/lib/replicate-error-handler")
      const errorResponse = formatReplicateErrorResponse(error, "Failed to check image status")
      
      return NextResponse.json(
        {
          error: errorResponse.error,
          details: errorResponse.details,
          shouldRetry: errorResponse.shouldRetry,
          retryAfter: errorResponse.retryAfter
        },
        { status: 500 },
      )
    }

    console.log("[v0] Replicate prediction status:", prediction.status)
    console.log("[v0] Prediction output type:", Array.isArray(prediction.output) ? "array" : typeof prediction.output)
    console.log("[v0] Prediction output exists:", !!prediction.output)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      console.log("[v0] Image URL from Replicate:", imageUrl)

      console.log("[v0] Prediction succeeded, uploading to Blob storage...")

      let blobUrl: string
      let usedReplicateUrlFallback = false
      try {
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
        }
        const imageBlob = await imageResponse.blob()
        console.log("[v0] Image blob size:", imageBlob.size, "bytes")
        console.log("[v0] Image blob type:", imageBlob.type)

        // Validate blob before uploading (prevent black/corrupted images)
        if (imageBlob.size === 0) {
          throw new Error("Image blob is empty (0 bytes) - Replicate image may not be ready yet")
        }

        // Valid PNG/JPEG images should be at least a few KB
        const MIN_IMAGE_SIZE = 1024 // 1KB minimum
        if (imageBlob.size < MIN_IMAGE_SIZE) {
          console.warn("[v0] ⚠️ Image blob is very small:", imageBlob.size, "bytes - may be corrupted")
        }

        if (!imageBlob.type.startsWith("image/")) {
          console.warn("[v0] ⚠️ Blob type is not an image:", imageBlob.type, "- proceeding anyway")
        }

        const blob = await put(`feed-posts/${postId}.png`, imageBlob, {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: true,
        })

        if (!blob || !blob.url) {
          throw new Error("Blob upload failed - no URL returned")
        }

        blobUrl = blob.url
        console.log("[v0] ✅ Image uploaded to Blob:", blobUrl)
      } catch (blobError: any) {
        console.error("[v0] ❌ Error uploading to Blob:", blobError)
        // Fallback: use Replicate URL to avoid blocking completion
        usedReplicateUrlFallback = true
        blobUrl = imageUrl
        console.warn("[v0] ⚠️ Using Replicate URL fallback (temporary):", blobUrl)
      }

      // Check if this is a preview feed (layout_type = 'preview')
      const [postDetails] = await sql`
        SELECT feed_layout_id, position FROM feed_posts WHERE id = ${Number.parseInt(postId)}
      `
      
      if (postDetails) {
        const [feedLayout] = await sql`
          SELECT layout_type FROM feed_layouts WHERE id = ${postDetails.feed_layout_id}
        `
        
        // PHASE 5 FIX: Preview feed images should be saved to all 9 posts
        if (feedLayout?.layout_type === 'preview') {
          console.log("[v0] Preview feed detected - saving image to all 9 posts")
          
          // Save preview_image_url to all 9 posts in this feed layout
          await sql`
            UPDATE feed_posts
            SET 
              preview_image_url = ${blobUrl},
              generation_status = 'completed',
              updated_at = NOW()
            WHERE feed_layout_id = ${postDetails.feed_layout_id}
              AND position BETWEEN 1 AND 9
          `
          
          console.log("[v0] Preview feed image saved to all 9 posts:", blobUrl)
        } else {
          // Regular feed: Save image_url to this post only
          await sql`
            UPDATE feed_posts
            SET 
              image_url = ${blobUrl},
              generation_status = 'completed',
              updated_at = NOW()
            WHERE id = ${Number.parseInt(postId)}
          `
          
          console.log("[v0] Feed post updated with image URL:", blobUrl)
        }
      } else {
        // Fallback: Save to this post only (if post details not found)
        await sql`
          UPDATE feed_posts
          SET 
            image_url = ${blobUrl},
            generation_status = 'completed',
            updated_at = NOW()
          WHERE id = ${Number.parseInt(postId)}
        `
        
        console.log("[v0] Feed post updated with image URL (fallback):", blobUrl)
      }
      
      // Get post details for quality monitoring
      const [postQualityData] = await sql`
        SELECT prompt, caption, user_id FROM feed_posts WHERE id = ${Number.parseInt(postId)}
      `
      
      if (postQualityData) {
        // Quality monitoring hook (fire-and-forget)
        hookFeedPostGeneration({
          imageUrl: blobUrl,
          prompt: postQualityData.prompt || postQualityData.caption || "",
          userId: postQualityData.user_id,
          postId: postId,
          predictionId: predictionId,
          category: 'feed-post',
        }).catch(() => {})
      }

      try {
        const [post] = await sql`
          SELECT prompt, caption, post_type, user_id, position, feed_layout_id FROM feed_posts WHERE id = ${Number.parseInt(postId)}
        `

        if (post) {
          // Check if this image already exists in the gallery by prediction_id OR image_url
          const [existing] = await sql`
            SELECT id FROM ai_images 
            WHERE prediction_id = ${predictionId} 
            OR image_url = ${blobUrl}
            LIMIT 1
          `

          if (!existing) {
            // Use caption as the prompt (description) and the actual flux prompt as generated_prompt
            // This matches how concept cards and photoshoots save to the gallery
            const displayCaption = post.caption || `Feed post ${post.position}`
            const fluxPrompt = post.prompt || ""
            
            await sql`
              INSERT INTO ai_images (
                user_id,
                image_url,
                prompt,
                generated_prompt,
                prediction_id,
                generation_status,
                source,
                category,
                created_at
              ) VALUES (
                ${post.user_id},
                ${blobUrl},
                ${displayCaption},
                ${fluxPrompt},
                ${predictionId},
                'completed',
                'feed_planner',
                ${post.post_type || "feed_post"},
                NOW()
              )
            `
            console.log("[v0] ✅ Image saved to ai_images gallery (feed_planner)")
            console.log("[v0]   → user_id:", post.user_id)
            console.log("[v0]   → image_url:", blobUrl.substring(0, 60) + "...")
            console.log("[v0]   → category:", post.post_type || "feed_post")
            console.log("[v0]   → source: feed_planner")
          } else {
            console.log(`[v0] Image already exists in gallery (ID: ${existing.id}), skipping duplicate save`)
          }
        }
      } catch (galleryError: any) {
        const errorMessage = galleryError?.message || String(galleryError)
        console.error("[v0] ❌ Failed to save to ai_images gallery:", errorMessage)
        console.error("[v0] Error details:", {
          code: galleryError?.code,
          constraint: galleryError?.constraint,
          detail: galleryError?.detail,
        })
        // Don't fail the request if gallery save fails - the main post is still successful
      }

      return NextResponse.json({
        status: "succeeded",
        imageUrl: blobUrl,
        usedReplicateUrlFallback,
      })
    } else if (prediction.status === "failed") {
      // 🔴 FIX: Handle content moderation errors gracefully (E005)
      const originalError = prediction.error || "Generation failed"
      const isContentFlagged = 
        originalError.includes("E005") || 
        originalError.includes("flagged as sensitive") ||
        originalError.includes("content moderation") ||
        originalError.toLowerCase().includes("inappropriate")
      
      // Use a user-friendly error message for content moderation failures
      const userFriendlyError = isContentFlagged
        ? "Content flagged by safety systems. Please try different wording or style."
        : originalError
      
      if (isContentFlagged) {
        console.warn(`[v0] ⚠️ Content moderation triggered for post ${postId}:`, originalError)
      } else {
        console.error(`[v0] ❌ Generation failed for post ${postId}:`, originalError)
      }

      await sql`
        UPDATE feed_posts
        SET generation_status = 'failed'
        WHERE id = ${Number.parseInt(postId)}
      `

      return NextResponse.json({
        status: "failed",
        error: userFriendlyError,
      })
    } else if (prediction.status === "canceled") {
      // Handle canceled predictions
      await sql`
        UPDATE feed_posts
        SET generation_status = 'failed'
        WHERE id = ${Number.parseInt(postId)}
      `

      return NextResponse.json({
        status: "failed",
        error: "Generation was canceled",
      })
    }

    // Return the current status (processing, starting, etc.)
    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack
    
    console.error("[v0] ❌ Error checking post generation:", {
      error: errorMessage,
      stack: errorStack,
      predictionId,
      postId,
      errorType: error?.constructor?.name,
    })
    
    // Check for specific error types
    if (errorMessage.includes("Failed to get prediction")) {
      return NextResponse.json(
        {
          error: "Failed to check generation status",
          details: "Unable to reach Replicate API. Please try again.",
          retryable: true,
        },
        { status: 503 }, // Service Unavailable - retryable
      )
    }
    
    if (errorMessage.includes("Blob") || errorMessage.includes("upload")) {
      return NextResponse.json(
        {
          error: "Failed to save image",
          details: "Image generated but failed to save. Please try regenerating.",
          retryable: true,
        },
        { status: 500 },
      )
    }
    
    if (errorMessage.includes("Database") || errorMessage.includes("SQL")) {
      return NextResponse.json(
        {
          error: "Database error",
          details: "Failed to update post status. Please refresh the page.",
          retryable: false,
        },
        { status: 500 },
      )
    }
    
    // Generic error
    return NextResponse.json(
      {
        error: "Failed to check generation status",
        details: errorMessage,
        retryable: true,
      },
      { status: 500 },
    )
  }
}
