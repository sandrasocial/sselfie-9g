import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hasStudioMembership, getUserProductAccess } from "@/lib/subscription"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
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
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasAccess = await hasStudioMembership(neonUser.id)
    const productType = await getUserProductAccess(neonUser.id)

    if (!hasAccess) {
      return NextResponse.json(
        {
          hasAccess: false,
          templates: [],
          productType,
          message: "Templates access requires Studio Membership",
        },
        { status: 403 },
      )
    }

    const templates = await sql`
      SELECT 
        id,
        title,
        description,
        thumbnail_url,
        resource_type,
        resource_url,
        category,
        order_index,
        download_count
      FROM academy_templates
      WHERE status = 'published'
      ORDER BY order_index ASC, created_at DESC
    `

    return NextResponse.json({
      hasAccess: true,
      templates,
      productType,
    })
  } catch (error) {
    console.error("[v0] Error fetching templates:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}
