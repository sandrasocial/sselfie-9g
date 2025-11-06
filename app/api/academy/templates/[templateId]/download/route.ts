import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserProductAccess } from "@/lib/subscription"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { hasStudioMembership, userId } = await getUserProductAccess()

    if (!hasStudioMembership || !userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const templateId = params.templateId

    // Increment download count
    await sql`
      UPDATE academy_templates
      SET download_count = download_count + 1
      WHERE id = ${templateId}
    `

    // Track user download
    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      VALUES (${userId}, 'template', ${templateId})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking template download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
