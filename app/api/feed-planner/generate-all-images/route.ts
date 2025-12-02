import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedLayoutId } = await request.json()

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get all posts for this feed
    const posts = await sql`
      SELECT id, position, concept_prompt
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayoutId}
      ORDER BY position
    `

    console.log(`[v0] Generating images for ${posts.length} posts`)

    // Trigger image generation for each post
    const imagePromises = posts.map(async (post: any) => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/feed/${feedLayoutId}/generate-single`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: post.id,
            conceptPrompt: post.concept_prompt,
          }),
        })

        if (!response.ok) {
          console.error(`[v0] Failed to generate image for post ${post.position}`)
          return null
        }

        const data = await response.json()
        return data
      } catch (error) {
        console.error(`[v0] Error generating image for post ${post.position}:`, error)
        return null
      }
    })

    await Promise.all(imagePromises)

    return NextResponse.json({
      success: true,
      message: `Image generation started for ${posts.length} posts`,
    })
  } catch (error) {
    console.error("[v0] Generate all images error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate images",
      },
      { status: 500 },
    )
  }
}
