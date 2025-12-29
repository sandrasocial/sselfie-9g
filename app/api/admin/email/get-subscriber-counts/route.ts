import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Get subscriber counts for each sequence type
 */
export async function GET() {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get paid users (for welcome sequence)
    const paidUsers = await sql`
      SELECT COUNT(DISTINCT u.email) as count
      FROM users u
      WHERE u.is_paid = true
      AND u.email IS NOT NULL
    `

    // Get all free subscribers (for nurture sequence)
    const freebieSubscribers = await sql`
      SELECT COUNT(*) as count
      FROM freebie_subscribers
      WHERE converted_to_user = false
      AND email IS NOT NULL
    `

    const blueprintSubscribers = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers
      WHERE converted_to_user = false
      AND email IS NOT NULL
    `

    // Get inactive users (30+ days no login)
    const inactiveUsers = await sql`
      SELECT COUNT(DISTINCT u.email) as count
      FROM users u
      WHERE u.last_login_at IS NULL 
      OR u.last_login_at < NOW() - INTERVAL '30 days'
      AND u.email IS NOT NULL
    `

    return NextResponse.json({
      success: true,
      counts: {
        welcome: parseInt(paidUsers[0]?.count || "0", 10),
        nurture: parseInt(freebieSubscribers[0]?.count || "0", 10) + parseInt(blueprintSubscribers[0]?.count || "0", 10),
        reengagement: parseInt(inactiveUsers[0]?.count || "0", 10),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error getting subscriber counts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get subscriber counts", details: error.message },
      { status: 500 }
    )
  }
}

