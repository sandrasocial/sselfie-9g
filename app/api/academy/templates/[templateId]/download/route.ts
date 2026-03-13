import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

export async function POST(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { neonUser } = await requireAcademyMembershipCollectionAccess("templates")
    const { templateId } = await params
    const parsedTemplateId = Number.parseInt(templateId, 10)

    if (!Number.isFinite(parsedTemplateId) || parsedTemplateId <= 0) {
      return NextResponse.json({ error: "Invalid templateId" }, { status: 400 })
    }

    await sql`
      UPDATE academy_templates
      SET download_count = download_count + 1
      WHERE id = ${parsedTemplateId}
    `

    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      SELECT ${neonUser.id}, 'template', ${parsedTemplateId}
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_resource_downloads
        WHERE user_id = ${neonUser.id}
          AND resource_type = 'template'
          AND resource_id = ${parsedTemplateId}
      )
    `

    return NextResponse.json({ success: true, hasAccess: true })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error tracking template download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
