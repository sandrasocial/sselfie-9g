import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Search query too short" }, { status: 400 })
    }

    const searchPattern = `%${query}%`
    const users = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        COALESCE(uc.balance, 0) as credits
      FROM users u
      LEFT JOIN user_credits uc ON u.id = uc.user_id
      WHERE 
        u.email ILIKE ${searchPattern}
        OR u.display_name ILIKE ${searchPattern}
      ORDER BY u.email
      LIMIT 20
    `

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[v0] Error searching users:", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}
