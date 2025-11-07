import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { hasStudioMembership } from "@/lib/subscription"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { flatlayId: string } }) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check Studio Membership access
    const hasAccess = await hasStudioMembership(neonUser.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { flatlayId } = await params

    await sql`
      UPDATE academy_flatlay_images
      SET download_count = download_count + 1
      WHERE id = ${flatlayId}
    `

    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      VALUES (${neonUser.id}, 'flatlay-image', ${Number.parseInt(flatlayId)})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking flatlay download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
