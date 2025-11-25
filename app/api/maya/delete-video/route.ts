import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { del } from "@vercel/blob"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId || typeof videoId !== "number" || videoId <= 0) {
      return NextResponse.json({ error: "Invalid videoId" }, { status: 400 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const videoRecord = await sql`
      SELECT video_url FROM generated_videos
      WHERE id = ${videoId}
      AND user_id = ${neonUser.id}
    `

    if (videoRecord.length === 0) {
      return NextResponse.json({ error: "Video not found or access denied" }, { status: 404 })
    }

    if (videoRecord[0]?.video_url) {
      try {
        await del(videoRecord[0].video_url)
        console.log("[v0] Deleted video from blob storage:", videoRecord[0].video_url)
      } catch (blobError) {
        console.error("[v0] Error deleting blob (continuing with DB delete):", blobError)
        // Continue with DB deletion even if blob delete fails
      }
    }

    await sql`
      DELETE FROM generated_videos
      WHERE id = ${videoId}
      AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting video:", error)
    return NextResponse.json(
      {
        error: "Failed to delete video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
