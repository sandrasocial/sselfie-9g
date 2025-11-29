import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"

export async function GET(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const feedId = params.feedId

    // Get all posts with their prediction IDs
    const posts = await sql`
      SELECT id, position, prediction_id, generation_status, image_url, text_overlay
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    `

    const replicate = getReplicateClient()
    let completedCount = 0
    let failedCount = 0

    for (const post of posts) {
      if (post.generation_status === "completed") {
        completedCount++
        continue
      }

      if (post.prediction_id && post.generation_status === "generating") {
        const prediction = await replicate.predictions.get(post.prediction_id)

        if (prediction.status === "succeeded" && prediction.output) {
          const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

          let finalImageUrl = imageUrl
          if (post.text_overlay) {
            finalImageUrl = await applyTextOverlay(imageUrl, post.text_overlay)
          }

          await sql`
            UPDATE feed_posts
            SET 
              image_url = ${finalImageUrl},
              generation_status = 'completed',
              updated_at = NOW()
            WHERE id = ${post.id}
          `

          completedCount++
        } else if (prediction.status === "failed") {
          await sql`
            UPDATE feed_posts
            SET 
              generation_status = 'failed',
              updated_at = NOW()
            WHERE id = ${post.id}
          `
          failedCount++
        }
      }
    }

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

async function applyTextOverlay(imageUrl: string, text: string): Promise<string> {
  try {
    // Canvas dependency removed; skip server-side overlay and return original image
    // Frontend can apply overlay styling if needed
    return imageUrl
  } catch (error) {
    console.error("[v0] Error applying text overlay:", error)
    // Return original image if overlay fails
    return imageUrl
  }
}
