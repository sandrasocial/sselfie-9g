import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.error("[v0] [ADMIN] Auth error in user search:", authError?.message)
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
    console.error("[v0] [ADMIN] Error searching users:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: errorMessage.includes("Too Many")
          ? "Rate limit reached. Please wait a moment."
          : "Failed to search users",
      },
      { status: 500 },
    )
  }
}
