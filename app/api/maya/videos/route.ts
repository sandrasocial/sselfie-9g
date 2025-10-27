import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] === FETCHING USER VIDEOS ===")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Fetching videos for user:", neonUser.id)

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

    console.log("[v0] Found videos:", videos.length)

    return NextResponse.json({
      videos,
      count: videos.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
