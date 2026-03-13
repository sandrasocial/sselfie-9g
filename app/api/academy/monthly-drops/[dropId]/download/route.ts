import { type NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import {
  academyRouteErrorToResponse,
  requireAcademyMembershipCollectionAccess,
} from "@/lib/academy-server-access"

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  )
}

export async function POST(request: NextRequest, { params }: { params: { dropId: string } }) {
  try {
    const { neonUser } = await requireAcademyMembershipCollectionAccess("monthly-drops")
    const { dropId } = await params
    const parsedDropId = Number.parseInt(dropId, 10)
    if (!Number.isFinite(parsedDropId) || parsedDropId <= 0) {
      return NextResponse.json({ error: "Invalid dropId" }, { status: 400 })
    }

    await sql`
      UPDATE academy_monthly_drops
      SET download_count = download_count + 1
      WHERE id = ${parsedDropId}
    `

    try {
      await sql`
        INSERT INTO user_resource_downloads (user_id, resource_type, resource_id)
        SELECT ${neonUser.id}, 'monthly-drop', ${parsedDropId}
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_resource_downloads
          WHERE user_id = ${neonUser.id}
            AND resource_type = 'monthly-drop'
            AND resource_id = ${parsedDropId}
        )
      `
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error
      }
    }

    return NextResponse.json({ success: true, hasAccess: true })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error tracking monthly drop download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
