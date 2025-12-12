import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
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

    // Parse request body
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 })
    }

    // Verify feed ownership and update profile image
    const [updatedFeed] = await sql`
      UPDATE feed_layouts
      SET 
        profile_image_url = ${imageUrl},
        updated_at = NOW()
      WHERE id = ${Number.parseInt(feedId, 10)}
        AND user_id = ${neonUser.id}
      RETURNING *
    `

    if (!updatedFeed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    console.log("[v0] Profile image updated successfully:", {
      feedId,
      imageUrl,
    })

    return NextResponse.json({
      success: true,
      imageUrl,
    })
  } catch (error) {
    console.error("[v0] Error updating profile image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
