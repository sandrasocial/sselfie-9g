import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleGenerateAllImages({
  request,
  user: _user,
}: {
  request: Request | NextRequest
  user: { id: string | number }
}) {
  try {
    const { feedLayoutId } = await request.json()

    if (!feedLayoutId) {
      return NextResponse.json({ error: "Feed layout ID is required" }, { status: 400 })
    }

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

        return await response.json()
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

export const POST = withAuth(handleGenerateAllImages)
