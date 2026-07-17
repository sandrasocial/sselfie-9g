import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { ensureReadyPostCaption } from "@/lib/feed-planner/ready-post-caption"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const { postId, imageUrl, aiImageId } = await request.json()
    const ownedAiImageId =
      typeof aiImageId === "number" && Number.isInteger(aiImageId) && aiImageId > 0
        ? aiImageId
        : null

    if (!postId || !imageUrl) {
      return NextResponse.json({ error: "Missing postId or imageUrl" }, { status: 400 })
    }

    // Resolve params (handle both Promise and direct object)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    console.log(
      "[v0] Replace post image - feedId:",
      feedId,
      "postId:",
      postId,
      "imageUrl:",
      imageUrl?.substring(0, 50)
    )

    // Verify feed ownership
    const [feed] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedId}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    if (feed.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const [post] = await sql`
      SELECT id, feed_layout_id, position, post_type, content_pillar, caption
      FROM feed_posts
      WHERE id = ${postId}
        AND feed_layout_id = ${feedId}
        AND user_id = ${neonUser.id}
      LIMIT 1
    `
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Persist the member's photo before asking the caption provider for enrichment.
    const [updatedPost] = await sql`
      UPDATE feed_posts
      SET 
        image_url = ${imageUrl},
        ai_image_id = (
          SELECT id FROM ai_images
          WHERE id = ${ownedAiImageId} AND user_id = ${neonUser.id}
        ),
        generation_status = 'completed',
        updated_at = NOW()
      WHERE id = ${postId}
        AND feed_layout_id = ${feedId}
      RETURNING *
    `

    if (!updatedPost) {
      console.error("[v0] Post not found - postId:", postId, "feedId:", feedId)
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const captionOutcome = await ensureReadyPostCaption({
      userId: neonUser.id,
      post: {
        id: Number(post.id),
        feed_layout_id: Number(post.feed_layout_id),
        position: post.position,
        post_type: post.post_type,
        content_pillar: post.content_pillar,
        caption: post.caption,
      },
    })

    console.log("[v0] Post image replaced successfully:", {
      postId,
      feedId,
      imageUrl: imageUrl?.substring(0, 50),
    })

    return NextResponse.json({
      success: true,
      post: {
        ...updatedPost,
        caption: captionOutcome.caption ?? updatedPost.caption,
      },
      captionStatus: captionOutcome.status,
    })
  } catch (error) {
    console.error("[v0] Error replacing post image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
