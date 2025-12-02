import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { feedLayoutId, postIds } = body

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }

    console.log("[v0] Batch Generation: Starting for", postIds?.length || "all", "posts")

    // Get posts to generate
    const posts = postIds
      ? await sql`
          SELECT * FROM feed_posts
          WHERE feed_layout_id = ${feedLayoutId}
          AND id = ANY(${postIds})
          AND generation_status = 'pending'
        `
      : await sql`
          SELECT * FROM feed_posts
          WHERE feed_layout_id = ${feedLayoutId}
          AND generation_status = 'pending'
          ORDER BY position ASC
        `

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts to generate" }, { status: 400 })
    }

    // Trigger generation for each post
    const predictions = []
    for (const post of posts) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/feed/${feedLayoutId}/generate-single`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId: post.id }),
          },
        )

        if (response.ok) {
          const data = await response.json()
          predictions.push({
            postId: post.id,
            predictionId: data.predictionId,
            position: post.position,
          })
        }
      } catch (error) {
        console.error("[v0] Batch Generation: Error generating post", post.id, error)
      }

      // Add small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      success: true,
      predictions,
      total: posts.length,
    })
  } catch (error) {
    console.error("[v0] Batch Generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start batch generation",
      },
      { status: 500 },
    )
  }
}
