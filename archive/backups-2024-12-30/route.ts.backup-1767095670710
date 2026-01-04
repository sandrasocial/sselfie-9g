import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()

    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get("userId")
    const isAdmin = user.email === process.env.ADMIN_EMAIL

    const effectiveUserId = targetUserId && isAdmin ? targetUserId : user.id

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const pillar = searchParams.get("pillar")
    const status = searchParams.get("status")

    let posts

    if (startDate && endDate) {
      posts = await sql`
        SELECT 
          fp.*,
          fl.title as feed_title,
          fl.id as feed_layout_id
        FROM feed_posts fp
        LEFT JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
        WHERE fp.user_id = ${effectiveUserId}
        AND (
          fp.scheduled_at BETWEEN ${startDate}::timestamptz AND ${endDate}::timestamptz
          OR fp.scheduled_at IS NULL
        )
        ORDER BY fp.scheduled_at ASC NULLS LAST, fp.position ASC, fp.created_at DESC
      `
    } else {
      posts = await sql`
        SELECT 
          fp.*,
          fl.title as feed_title,
          fl.id as feed_layout_id
        FROM feed_posts fp
        LEFT JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
        WHERE fp.user_id = ${effectiveUserId}
        ORDER BY fp.scheduled_at ASC NULLS LAST, fp.position ASC, fp.created_at DESC
      `
    }

    // Filter by pillar and status in memory
    let filteredPosts = posts

    if (pillar) {
      filteredPosts = filteredPosts.filter((p: any) => p.content_pillar === pillar)
    }

    if (status) {
      filteredPosts = filteredPosts.filter((p: any) => p.post_status === status)
    }

    console.log(`[v0] Calendar posts API: Returning ${filteredPosts.length} posts for user ${effectiveUserId}`)

    return Response.json({ posts: filteredPosts })
  } catch (error: any) {
    console.error("[v0] Error fetching calendar posts:", error)
    return Response.json({ error: "Failed to fetch calendar posts", details: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await req.json()
    const { postId } = body

    if (!postId) {
      return Response.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Delete the post
    await sql`
      DELETE FROM feed_posts
      WHERE id = ${postId}
      AND user_id = ${user.id}
    `

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting calendar post:", error)
    return Response.json({ error: "Failed to delete post", details: error.message }, { status: 500 })
  }
}
