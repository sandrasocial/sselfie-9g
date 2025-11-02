import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
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
      WHERE id = ${params.feedId}
        AND user_id = ${neonUser.id}
      RETURNING *
    `

    if (!updatedFeed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    console.log("[v0] Profile image updated successfully:", {
      feedId: params.feedId,
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
