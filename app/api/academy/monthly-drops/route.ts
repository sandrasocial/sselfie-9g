import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hasStudioMembership, getUserProductAccess } from "@/lib/subscription"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasAccess = await hasStudioMembership(neonUser.id)
    const productType = await getUserProductAccess(neonUser.id)

    if (!hasAccess) {
      return NextResponse.json(
        {
          hasAccess: false,
          monthlyDrops: [],
          productType,
          message: "Monthly Drops access requires Studio Membership",
        },
        { status: 403 },
      )
    }

    const monthlyDrops = await sql`
      SELECT 
        id,
        title,
        description,
        thumbnail_url,
        resource_type,
        resource_url,
        month,
        category,
        order_index,
        download_count
      FROM academy_monthly_drops
      WHERE status = 'published'
      ORDER BY created_at DESC, order_index ASC
    `

    return NextResponse.json({
      hasAccess: true,
      monthlyDrops,
      productType,
    })
  } catch (error) {
    console.error("[v0] Error fetching monthly drops:", error)
    return NextResponse.json({ error: "Failed to fetch monthly drops" }, { status: 500 })
  }
}
