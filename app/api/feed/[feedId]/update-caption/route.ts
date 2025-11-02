import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { postId, caption } = await request.json()

    if (!postId || !caption) {
      return NextResponse.json({ error: "Missing postId or caption" }, { status: 400 })
    }

    // Update caption in database
    await sql`
      UPDATE feed_posts
      SET caption = ${caption}
      WHERE id = ${postId}
      AND feed_layout_id = ${params.feedId}
      AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating caption:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
