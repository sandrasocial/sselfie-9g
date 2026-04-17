import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Cohort retention: Studio members grouped by month of first subscription
    const cohorts = await sql`
      SELECT
        DATE_TRUNC('month', created_at)::date AS cohort_month,
        COUNT(*) AS signups,
        COUNT(*) FILTER (WHERE status = 'active') AS currently_active,
        COUNT(*) FILTER (WHERE status = 'canceled') AS cancelled,
        COUNT(*) FILTER (WHERE status = 'past_due') AS past_due
      FROM subscriptions
      WHERE product_type = 'sselfie_studio_membership'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
    `

    // Overall totals
    const totals = await sql`
      SELECT
        COUNT(*) AS total_signups,
        COUNT(*) FILTER (WHERE status = 'active') AS total_active,
        COUNT(*) FILTER (WHERE status = 'canceled') AS total_cancelled,
        COUNT(*) FILTER (WHERE status = 'past_due') AS total_past_due
      FROM subscriptions
      WHERE product_type = 'sselfie_studio_membership'
    `

    return NextResponse.json({
      cohorts,
      totals: totals[0] ?? { total_signups: 0, total_active: 0, total_cancelled: 0, total_past_due: 0 },
    })
  } catch (error) {
    console.error("[Admin Retention] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
