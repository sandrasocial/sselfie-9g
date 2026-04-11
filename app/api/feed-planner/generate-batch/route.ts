import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"


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

    const [ownedFeed] = await sql`
      SELECT id
      FROM feed_layouts
      WHERE id = ${feedLayoutId}
      AND user_id = ${user.id}
      LIMIT 1
    `

    if (!ownedFeed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    console.log("[v0] Batch Generation: Starting for", postIds?.length || "all", "posts")

    // Get posts to generate
    const posts = postIds
      ? await sql`
          SELECT * FROM feed_posts
          WHERE feed_layout_id = ${feedLayoutId}
          AND id = ANY(${postIds})
          AND user_id = ${user.id}
          AND generation_status = 'pending'
        `
      : await sql`
          SELECT * FROM feed_posts
          WHERE feed_layout_id = ${feedLayoutId}
          AND user_id = ${user.id}
          AND generation_status = 'pending'
          ORDER BY position ASC
        `

    if (posts.length === 0) {
      return NextResponse.json({ error: "No posts to generate" }, { status: 400 })
    }

    // Trigger generation for each post
    const predictions = []
    const failures: Array<{ postId: number; position: number; error: string }> = []
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const cookieHeader = request.headers.get("cookie") || ""
    for (const post of posts) {
      try {
        const response = await fetch(`${origin}/api/feed/${feedLayoutId}/generate-single`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({ postId: post.id }),
        })

        if (response.ok) {
          const data = await response.json()
          predictions.push({
            postId: post.id,
            predictionId: data.predictionId,
            position: post.position,
          })
        } else {
          failures.push({
            postId: post.id,
            position: post.position,
            error: `Generation failed with status ${response.status}`,
          })
        }
      } catch (error) {
        console.error("[v0] Batch Generation: Error generating post", post.id, error)
        failures.push({
          postId: post.id,
          position: post.position,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Add small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      success: predictions.length > 0,
      predictions,
      failures,
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
