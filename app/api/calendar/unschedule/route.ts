import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { postId } = body

    if (!postId) {
      return Response.json({ error: "postId is required" }, { status: 400 })
    }

    const sql = getDb()

    const posts = await sql`
      SELECT fp.id 
      FROM feed_posts fp
      LEFT JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      WHERE fp.id = ${postId} AND fl.user_id = ${user.id}
      LIMIT 1
    `

    if (posts.length === 0) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    const updatedPosts = await sql`
      UPDATE feed_posts
      SET 
        scheduled_at = NULL,
        post_status = 'draft',
        updated_at = NOW()
      WHERE id = ${postId}
      RETURNING *
    `

    return Response.json({ success: true, post: updatedPosts[0] })
  } catch (error: any) {
    console.error("[v0] Error unscheduling post:", error)
    return Response.json({ error: "Failed to unschedule post", details: error.message }, { status: 500 })
  }
}
