import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

export async function POST(request: NextRequest, { params }: { params: { flatlayId: string } }) {
  try {
    const { neonUser } = await requireAcademyMembershipCollectionAccess("flatlay-images")
    const { flatlayId } = await params
    const parsedFlatlayId = Number.parseInt(flatlayId, 10)

    if (!Number.isFinite(parsedFlatlayId) || parsedFlatlayId <= 0) {
      return NextResponse.json({ error: "Invalid flatlayId" }, { status: 400 })
    }

    await sql`
      UPDATE academy_flatlay_images
      SET download_count = download_count + 1
      WHERE id = ${parsedFlatlayId}
    `

    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      SELECT ${neonUser.id}, 'flatlay-image', ${parsedFlatlayId}
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_resource_downloads
        WHERE user_id = ${neonUser.id}
          AND resource_type = 'flatlay-image'
          AND resource_id = ${parsedFlatlayId}
      )
    `

    return NextResponse.json({ success: true, hasAccess: true })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error tracking flatlay download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
