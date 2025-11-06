import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserProductAccess } from "@/lib/subscription"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { dropId: string } }) {
  try {
    const { hasStudioMembership, userId } = await getUserProductAccess()

    if (!hasStudioMembership || !userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const dropId = params.dropId

    // Increment download count
    await sql`
      UPDATE academy_monthly_drops
      SET download_count = download_count + 1
      WHERE id = ${dropId}
    `

    // Track user download
    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      VALUES (${userId}, 'monthly_drop', ${dropId})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking monthly drop download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
