import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserProductAccess } from "@/lib/subscription"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { flatlayId: string } }) {
  try {
    const { hasStudioMembership, userId } = await getUserProductAccess()

    if (!hasStudioMembership || !userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const flatlayId = params.flatlayId

    await sql`
      UPDATE academy_flatlay_images
      SET download_count = download_count + 1
      WHERE id = ${flatlayId}
    `

    await sql`
      INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
      VALUES (${userId}, 'flatlay-image', ${flatlayId})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking flatlay download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
