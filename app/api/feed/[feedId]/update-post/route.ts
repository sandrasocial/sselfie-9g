import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getDb } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { feedId } = await Promise.resolve(params)
    const normalizedFeedId = Number(feedId)
    const body = await request.json().catch(() => null)
    const normalizedPostId = Number(body?.postId)
    const caption = body?.caption
    const scheduledAt = body?.scheduledAt

    if (!Number.isInteger(normalizedFeedId) || !Number.isInteger(normalizedPostId)) {
      return NextResponse.json({ error: "Invalid feed or post" }, { status: 400 })
    }
    if (typeof caption !== "string") {
      return NextResponse.json({ error: "Caption must be text" }, { status: 400 })
    }
    if (caption.length > 2200) {
      return NextResponse.json(
        { error: "Caption can be at most 2,200 characters" },
        { status: 400 }
      )
    }
    if (scheduledAt !== null && (typeof scheduledAt !== "string" || !ISO_DATE.test(scheduledAt))) {
      return NextResponse.json({ error: "Choose a valid planned date" }, { status: 400 })
    }

    const sql = getDb()
    const updated = (await sql`
      UPDATE feed_posts AS post
      SET
        caption = ${caption.trim()},
        scheduled_at = ${scheduledAt || null},
        updated_at = NOW()
      FROM feed_layouts AS feed
      WHERE post.id = ${normalizedPostId}
        AND post.feed_layout_id = ${normalizedFeedId}
        AND feed.id = post.feed_layout_id
        AND feed.user_id = ${user.id}
      RETURNING post.*
    `) as Array<Record<string, unknown>>

    if (updated.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, post: updated[0] })
  } catch (error) {
    console.error("[calendar] Failed to update post details:", error)
    return NextResponse.json({ error: "This post could not be saved" }, { status: 500 })
  }
}
