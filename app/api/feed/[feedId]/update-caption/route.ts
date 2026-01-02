import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params (Next.js 16 pattern)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    if (!feedId || feedId === "null" || feedId === "undefined") {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const { postId, caption } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Validate caption exists and is a string type
    if (caption === undefined || caption === null) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 })
    }

    if (typeof caption !== 'string') {
      return NextResponse.json({ 
        error: "Invalid caption type", 
        details: `Caption must be a string, received ${typeof caption}` 
      }, { status: 400 })
    }

    // Validate caption length (Instagram max is 2,200 characters)
    if (caption.length > 2200) {
      return NextResponse.json({ 
        error: "Caption too long", 
        details: "Instagram captions can be at most 2,200 characters" 
      }, { status: 400 })
    }

    const feedIdInt = Number.parseInt(feedId, 10)

    // Verify the post belongs to the user and feed
    const [post] = await sql`
      SELECT 
        fp.id,
        fl.user_id
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      WHERE fp.id = ${postId}
      AND fp.feed_layout_id = ${feedIdInt}
      AND fl.user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 })
    }

    // Update the caption in the database
    // Include user_id check for defense-in-depth security (even though SELECT already verified)
    await sql`
      UPDATE feed_posts fp
      SET caption = ${caption.trim()}, updated_at = NOW()
      FROM feed_layouts fl
      WHERE fp.id = ${postId}
      AND fp.feed_layout_id = ${feedIdInt}
      AND fp.feed_layout_id = fl.id
      AND fl.user_id = ${neonUser.id}
    `

    console.log(`[v0] ✅ Updated caption for post ${postId} (${caption.trim().length} chars)`)

    return NextResponse.json({ 
      success: true,
      message: "Caption updated successfully"
    })
  } catch (error) {
    console.error("[v0] Update caption error:", error)
    return NextResponse.json({ 
      error: "Failed to update caption",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
