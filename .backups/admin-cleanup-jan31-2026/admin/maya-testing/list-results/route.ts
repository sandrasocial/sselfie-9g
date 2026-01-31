import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const results = await sql`
      SELECT 
        mtr.id,
        mtr.test_name,
        mtr.test_type,
        mtr.test_user_id,
        mtr.configuration,
        mtr.results,
        mtr.created_at,
        mtr.status,
        mtr.notes,
        u.email as test_user_email,
        u.display_name as test_user_name
      FROM maya_test_results mtr
      LEFT JOIN users u ON mtr.test_user_id = u.id
      WHERE mtr.is_active = true
      ORDER BY mtr.created_at DESC
      LIMIT 50
    `

    return NextResponse.json({
      success: true,
      results: results.map((r: any) => ({
        ...r,
        configuration: typeof r.configuration === 'string' ? JSON.parse(r.configuration) : r.configuration,
        results: typeof r.results === 'string' ? JSON.parse(r.results) : r.results,
      })),
    })
  } catch (error: any) {
    console.error("[v0] Error listing test results:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list test results" },
      { status: 500 }
    )
  }
}
