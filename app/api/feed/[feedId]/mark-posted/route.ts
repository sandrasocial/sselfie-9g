import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feedId } = params
    const { postId, isPosted } = await req.json()

    await sql`
      UPDATE feed_posts
      SET is_posted = ${isPosted}, posted_at = ${isPosted ? "NOW()" : null}
      WHERE id = ${postId} AND feed_layout_id = ${feedId}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error("[v0] Error marking post as posted:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
