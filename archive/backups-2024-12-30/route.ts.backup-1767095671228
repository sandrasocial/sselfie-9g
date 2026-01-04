import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
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
    const { postId, imageUrl } = await request.json()

    if (!postId || !imageUrl) {
      return NextResponse.json({ error: "Missing postId or imageUrl" }, { status: 400 })
    }

    // Resolve params (handle both Promise and direct object)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    console.log("[v0] Replace post image - feedId:", feedId, "postId:", postId, "imageUrl:", imageUrl?.substring(0, 50))

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

    // Update post image
    const [updatedPost] = await sql`
      UPDATE feed_posts
      SET 
        image_url = ${imageUrl},
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

    console.log("[v0] Post image replaced successfully:", {
      postId,
      feedId,
      imageUrl: imageUrl?.substring(0, 50),
    })

    return NextResponse.json({
      success: true,
      post: updatedPost,
    })
  } catch (error) {
    console.error("[v0] Error replacing post image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
