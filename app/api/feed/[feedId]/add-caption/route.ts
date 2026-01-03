import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Add a generated caption to a specific feed post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const body = await request.json()
    const { postId, caption } = body

    if (!postId || !caption) {
      return NextResponse.json(
        { error: "postId and caption are required" },
        { status: 400 }
      )
    }

    console.log("[ADD-CAPTION] Adding caption to post:", postId, "in feed:", feedIdInt)

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed and post belong to user
    const [post] = await sql`
      SELECT fp.id, fp.feed_layout_id
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      WHERE fp.id = ${postId}
      AND fp.feed_layout_id = ${feedIdInt}
      AND fp.user_id = ${neonUser.id}
      AND fl.user_id = ${neonUser.id}
    `

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or access denied" },
        { status: 404 }
      )
    }

    // Update caption
    await sql`
      UPDATE feed_posts
      SET caption = ${caption},
          updated_at = NOW()
      WHERE id = ${postId}
      AND user_id = ${neonUser.id}
    `

    console.log("[ADD-CAPTION] ✅ Caption added to post:", postId)

    return NextResponse.json({
      success: true,
      message: "Caption added successfully",
    })
  } catch (error) {
    console.error("[ADD-CAPTION] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add caption",
      },
      { status: 500 }
    )
  }
}

