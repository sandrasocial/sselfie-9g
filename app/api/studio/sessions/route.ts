import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getUserByAuthId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get all photo sessions for the user
    const sessions = await sql`
      SELECT 
        ps.id,
        ps.session_name,
        ps.status,
        ps.created_at,
        ps.completed_at,
        COUNT(DISTINCT ss.id) as image_count,
        MAX(ss.created_at) as last_activity
      FROM photo_sessions ps
      LEFT JOIN session_shots ss ON ss.session_id = ps.id
      WHERE ps.user_id = ${dbUser.id}
      GROUP BY ps.id, ps.session_name, ps.status, ps.created_at, ps.completed_at
      ORDER BY ps.created_at DESC
      LIMIT 20
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("[v0] Error fetching sessions:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
