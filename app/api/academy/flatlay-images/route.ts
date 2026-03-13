import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

export async function GET() {
  try {
    const { neonUser } = await requireAcademyMembershipCollectionAccess("flatlay-images")

    const flatlayImages = await sql`
      SELECT 
        fi.*,
        CASE WHEN urd.id IS NOT NULL THEN true ELSE false END AS downloaded
      FROM academy_flatlay_images fi
      LEFT JOIN user_resource_downloads urd 
        ON fi.id::text = urd.resource_id::text 
        AND urd.resource_type = 'flatlay-image'
        AND urd.user_id = ${neonUser.id}
      WHERE fi.status = 'published'
      ORDER BY fi.order_index ASC, fi.created_at DESC
    `

    return NextResponse.json({
      hasAccess: true,
      flatlayImages,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching flatlay images:", error)
    return NextResponse.json({ error: "Failed to fetch flatlay images" }, { status: 500 })
  }
}
