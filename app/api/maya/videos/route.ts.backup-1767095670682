import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== FETCHING USER VIDEOS ==========")

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.log("[v0] ❌ No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon database")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] ✅ Fetching videos for user ID:", neonUser.id)

    // Fetch all videos for the user
    const videos = await sql`
      SELECT 
        id,
        user_id,
        image_id,
        image_source,
        video_url,
        motion_prompt,
        status,
        progress,
        created_at,
        completed_at
      FROM generated_videos
      WHERE user_id = ${neonUser.id}
      AND status = 'completed'
      ORDER BY created_at DESC
    `

    console.log("[v0] ✅ Found", videos.length, "completed videos")
    videos.forEach((video, index) => {
      console.log(`[v0] Video ${index + 1}:`, {
        id: video.id,
        image_id: video.image_id,
        status: video.status,
        video_url: video.video_url ? `${video.video_url.substring(0, 50)}...` : 'NULL',
        hasVideoUrl: !!video.video_url,
      })
    })
    console.log("[v0] ================================================")

    return NextResponse.json({
      videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("[v0] ========== ERROR FETCHING VIDEOS ==========")
    console.error("[v0] ❌ Error:", error)
    console.error("[v0] ================================================")
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
