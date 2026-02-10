import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { hookFeedPostGeneration } from "@/lib/quality/hooks"
import { finalizeReplicateImageToBlob } from "@/lib/feed/finalize-replicate-image"

export async function GET(request: Request, { params }: { params: Promise<{ feedId: string }> }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = await params

    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const sql = getDb()

    const [feedLayout] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedIdInt}
      LIMIT 1
    `

    if (!feedLayout) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    if (feedLayout.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get all posts with their prediction IDs
    const posts = await sql`
      SELECT id, position, prediction_id, generation_status, image_url, text_overlay
      FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
      ORDER BY position ASC
    `

    const replicate = getReplicateClient()
    let completedCount = 0
    let failedCount = 0

    console.log(`[v0] [PROGRESS] Checking ${posts.length} posts for feed ${feedId}`)

    for (const post of posts) {
      if (post.generation_status === "completed") {
        completedCount++
        continue
      }

      // Check any post with prediction_id that doesn't have image_url yet
      // This catches posts that are generating, pending, or stuck
      if (post.prediction_id && !post.image_url) {
        console.log(`[v0] [PROGRESS] Checking post ${post.id} (position ${post.position}) with prediction_id: ${post.prediction_id.substring(0, 20)}...`)
        
        try {
          const prediction = await replicate.predictions.get(post.prediction_id)
          
          console.log(`[v0] [PROGRESS] Post ${post.id} prediction status: ${prediction.status}`)

        if (prediction.status === "succeeded" && prediction.output) {
          const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

          // Validate that imageUrl is a valid string before using it
          if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
            console.error(`[v0] [PROGRESS] Invalid image URL for post ${post.position}:`, imageUrl)
            continue
          }

          // Upload to Blob storage for permanent URL (Replicate URLs are temporary)
          let finalImageUrl = imageUrl
          try {
            const finalized = await finalizeReplicateImageToBlob({
              imageUrl,
              blobPath: `feed-posts/${post.id}.png`,
              textOverlay: post.text_overlay || null,
            })
            finalImageUrl = finalized.finalUrl
            console.log(
              `[v0] [PROGRESS] ✅ Image stored for post ${post.position} (fallback: ${finalized.usedFallback ? "yes" : "no"})`,
            )
          } catch (blobError: any) {
            console.error(`[v0] [PROGRESS] ❌ Failed to upload to Blob, using Replicate URL (temporary):`, blobError?.message)
            // Note: Using Replicate URL is temporary - it will expire after a few hours
            // This is a fallback, but images may not persist on page refresh
          }

          await sql`
            UPDATE feed_posts
            SET 
              image_url = ${finalImageUrl},
              generation_status = 'completed',
              updated_at = NOW()
            WHERE id = ${post.id}
          `
          
          // Get post details for quality monitoring
          const [postForQuality] = await sql`
            SELECT prompt, caption, user_id FROM feed_posts WHERE id = ${post.id}
          `
          
          if (postForQuality) {
            // Quality monitoring hook (fire-and-forget)
            hookFeedPostGeneration({
              imageUrl: finalImageUrl,
              prompt: postForQuality.prompt || postForQuality.caption || "",
              userId: postForQuality.user_id,
              postId: post.id.toString(),
              predictionId: post.prediction_id,
              category: 'feed-post',
            }).catch(() => {})
          }

          // Save to ai_images gallery (like concept cards)
          try {
            const [postData] = await sql`
              SELECT prompt, caption, post_type, user_id, position FROM feed_posts WHERE id = ${post.id}
            `
            
            if (postData) {
              // Check if this image already exists in the gallery
              const [existing] = await sql`
                SELECT id FROM ai_images 
                WHERE prediction_id = ${post.prediction_id} 
                OR image_url = ${finalImageUrl}
                LIMIT 1
              `
              
              if (!existing) {
                const displayCaption = postData.caption || `Feed post ${postData.position}`
                const fluxPrompt = postData.prompt || ""
                
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
                    ${postData.user_id},
                    ${finalImageUrl},
                    ${displayCaption},
                    ${fluxPrompt},
                    ${post.prediction_id},
                    'completed',
                    'feed_planner',
                    ${postData.post_type || 'feed_post'},
                    NOW()
                  )
                `
                console.log(`[v0] [PROGRESS] ✅ Image saved to ai_images gallery for post ${post.position}`)
              }
            }
          } catch (galleryError: any) {
            console.error(`[v0] [PROGRESS] ❌ Failed to save post ${post.position} to gallery:`, galleryError?.message)
            // Don't fail the whole request if gallery save fails
          }

          completedCount++
          console.log(`[v0] [PROGRESS] ✅ Post ${post.id} completed, image_url saved`)
        } else if (prediction.status === "failed") {
          await sql`
            UPDATE feed_posts
            SET 
              generation_status = 'failed',
              updated_at = NOW()
            WHERE id = ${post.id}
          `
          failedCount++
          console.log(`[v0] [PROGRESS] ❌ Post ${post.id} failed`)
        } else {
          console.log(`[v0] [PROGRESS] ⏳ Post ${post.id} still processing (status: ${prediction.status})`)
        }
        } catch (error: any) {
          console.error(`[v0] [PROGRESS] ❌ Error checking prediction for post ${post.id}:`, error?.message || error)
          // Continue checking other posts even if one fails
        }
      } else if (post.prediction_id && post.image_url) {
        // Post has prediction_id and image_url - should be completed
        if (post.generation_status !== "completed") {
          console.log(`[v0] [PROGRESS] ⚠️ Post ${post.id} has image_url but status is ${post.generation_status}, fixing...`)
          await sql`
            UPDATE feed_posts
            SET generation_status = 'completed', updated_at = NOW()
            WHERE id = ${post.id}
          `
          completedCount++
        }
      }
    }

    console.log(`[v0] [PROGRESS] Summary: ${completedCount} completed, ${failedCount} failed, ${posts.length - completedCount - failedCount} still processing`)

    return NextResponse.json({
      total: posts.length,
      completed: completedCount,
      failed: failedCount,
      progress: Math.round((completedCount / posts.length) * 100),
      posts: posts.map((p) => ({
        position: p.position,
        status: p.generation_status,
        imageUrl: p.image_url,
      })),
    })
  } catch (error) {
    console.error("[v0] Error checking feed progress:", error)
    return NextResponse.json({ error: "Failed to check progress" }, { status: 500 })
  }
}
