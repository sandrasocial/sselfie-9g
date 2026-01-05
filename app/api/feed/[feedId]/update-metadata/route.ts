import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"

/**
 * Update Feed Metadata
 * 
 * Updates feed title/name and display color for organization
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const user = await getEffectiveNeonUser(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId
    const feedIdInt = Number.parseInt(feedId, 10)

    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const { title, display_color } = await req.json()

    if (title === undefined && display_color === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const sql = getDb()

    // Get current feed to preserve values if not updating
    const [currentFeed] = await sql`
      SELECT title, display_color FROM feed_layouts
      WHERE id = ${feedIdInt} AND user_id = ${user.id}
    ` as any[]

    if (!currentFeed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    // Use provided values or keep existing
    const finalTitle = title !== undefined ? title : currentFeed.title
    const finalColor = display_color !== undefined ? display_color : currentFeed.display_color

    // Update feed metadata
    const [updatedFeed] = await sql`
      UPDATE feed_layouts
      SET 
        title = ${finalTitle},
        display_color = ${finalColor},
        updated_at = NOW()
      WHERE id = ${feedIdInt} AND user_id = ${user.id}
      RETURNING id, title, display_color, brand_name
    ` as any[]

    if (!updatedFeed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      feed: {
        id: updatedFeed.id,
        title: updatedFeed.title || updatedFeed.brand_name || `Feed ${updatedFeed.id}`,
        display_color: updatedFeed.display_color,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error updating feed metadata:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    )
  }
}

