/**
 * Maya Feed - Generate Images Route
 * 
 * Generates all 9 feed images in batch.
 * Delegates to existing feed generation routes for actual implementation.
 * 
 * This route provides a clean Maya namespace while maintaining backward compatibility.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300

/**
 * Generate all images for a feed
 * 
 * This endpoint generates images for all 9 posts in a feed.
 * It can generate images for all posts or a subset based on postIds.
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[MAYA-FEED] Generating images for feed...")

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId, postIds } = await request.json()

    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      )
    }

    // Get posts to generate
    const posts = postIds
      ? await sql`
          SELECT id, position, post_type, generation_status, prompt
          FROM feed_posts
          WHERE feed_layout_id = ${feedId}
          AND user_id = ${neonUser.id}
          AND id = ANY(${postIds})
          AND (generation_status = 'pending' OR generation_status IS NULL)
          ORDER BY position ASC
        `
      : await sql`
          SELECT id, position, post_type, generation_status, prompt
          FROM feed_posts
          WHERE feed_layout_id = ${feedId}
          AND user_id = ${neonUser.id}
          AND (generation_status = 'pending' OR generation_status IS NULL)
          ORDER BY position ASC
        `

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "No posts to generate" },
        { status: 400 }
      )
    }

    console.log(`[MAYA-FEED] Generating images for ${posts.length} posts`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    // Trigger image generation for each post
    const generationPromises = posts.map(async (post: any) => {
      try {
        const response = await fetch(`${baseUrl}/api/feed/${feedId}/generate-single`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: post.id,
            conceptPrompt: post.prompt,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(
            `[MAYA-FEED] ❌ Failed to generate image for post ${post.position}:`,
            errorData.error
          )
          return {
            success: false,
            postId: post.id,
            position: post.position,
            error: errorData.error || "Generation failed",
          }
        }

        const data = await response.json()
        console.log(`[MAYA-FEED] ✅ Started generation for post ${post.position}`)
        return {
          success: true,
          postId: post.id,
          position: post.position,
          predictionId: data.predictionId,
        }
      } catch (error) {
        console.error(
          `[MAYA-FEED] ❌ Error generating image for post ${post.position}:`,
          error
        )
        return {
          success: false,
          postId: post.id,
          position: post.position,
          error: error instanceof Error ? error.message : "Generation failed",
        }
      }
    })

    const results = await Promise.all(generationPromises)

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[MAYA-FEED] ✅ Image generation started: ${successful} successful, ${failed} failed`
    )

    return NextResponse.json({
      success: true,
      message: `Image generation started for ${successful} of ${posts.length} posts`,
      results,
      successful,
      failed,
    })
  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error generating images:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate images",
      },
      { status: 500 }
    )
  }
}


