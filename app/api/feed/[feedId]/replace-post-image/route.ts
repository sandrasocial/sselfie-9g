import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Parse request body
    const { postId, imageUrl } = await request.json()

    if (!postId || !imageUrl) {
      return NextResponse.json({ error: "Missing postId or imageUrl" }, { status: 400 })
    }

    // 4. Verify feed ownership
    const [feed] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${params.feedId}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    if (feed.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // 5. Update post image
    const [updatedPost] = await sql`
      UPDATE feed_posts
      SET 
        image_url = ${imageUrl},
        generation_status = 'completed',
        updated_at = NOW()
      WHERE id = ${postId}
        AND feed_id = ${params.feedId}
      RETURNING *
    `

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    console.log("[v0] Post image replaced successfully:", {
      postId,
      feedId: params.feedId,
      imageUrl,
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
