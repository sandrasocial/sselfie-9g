import type { NextRequest } from "next/server"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } },
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feedId } = await Promise.resolve(params)
    const { postId, isPosted } = await req.json()
    const normalizedFeedId = Number(feedId)
    const normalizedPostId = Number(postId)

    if (!Number.isInteger(normalizedFeedId) || !Number.isInteger(normalizedPostId) || typeof isPosted !== "boolean") {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const postedAt = isPosted ? new Date() : null

    const updated = await sql`
      UPDATE feed_posts AS fp
      SET is_posted = ${isPosted}, posted_at = ${postedAt}, updated_at = NOW()
      FROM feed_layouts AS fl
      WHERE fp.id = ${normalizedPostId}
        AND fp.feed_layout_id = ${normalizedFeedId}
        AND fl.id = fp.feed_layout_id
        AND fl.user_id = ${neonUser.id}
      RETURNING fp.id, fp.is_posted, fp.posted_at
    `

    if (updated.length === 0) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    return Response.json({ success: true, post: updated[0] })
  } catch (error) {
    console.error("[v0] Error marking post as posted:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
