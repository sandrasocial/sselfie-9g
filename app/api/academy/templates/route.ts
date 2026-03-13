import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

export async function GET() {
  try {
    await requireAcademyMembershipCollectionAccess("templates")

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
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching templates:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}
