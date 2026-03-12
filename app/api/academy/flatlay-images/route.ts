import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { hasActiveStudioMembership } from "@/lib/academy-entitlements"


export async function GET() {
  try {
    console.log("[v0] GET /api/academy/flatlay-images called")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No auth user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Auth user ID:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Neon user ID:", neonUser.id)

    const hasAccess = await hasActiveStudioMembership(neonUser.id)

    if (!hasAccess) {
      console.log("[v0] User does not have Studio Membership")
      return NextResponse.json({ error: "Studio Membership required" }, { status: 403 })
    }

    console.log("[v0] User has Studio Membership, fetching flatlay images")

    const flatlayImages = await sql`
      SELECT 
        fi.*,
        CASE WHEN urd.id IS NOT NULL THEN true ELSE false END as downloaded
      FROM academy_flatlay_images fi
      LEFT JOIN user_resource_downloads urd 
        ON fi.id::text = urd.resource_id::text 
        AND urd.resource_type = 'flatlay-image'
        AND urd.user_id = ${neonUser.id}
      WHERE fi.status = 'published'
      ORDER BY fi.order_index ASC, fi.created_at DESC
    `

    console.log("[v0] Found flatlay images:", flatlayImages.length)
    if (flatlayImages.length > 0) {
      console.log("[v0] First flatlay image data:", JSON.stringify(flatlayImages[0], null, 2))
      console.log("[v0] Thumbnail URL:", flatlayImages[0].thumbnail_url)
    }

    return NextResponse.json({ flatlayImages })
  } catch (error) {
    console.error("[v0] Error fetching flatlay images:", error)
    return NextResponse.json({ error: "Failed to fetch flatlay images" }, { status: 500 })
  }
}
