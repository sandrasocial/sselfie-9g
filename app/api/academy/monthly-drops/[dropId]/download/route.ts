import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { hasStudioMembership } from "@/lib/subscription"


function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"
}

export async function POST(request: NextRequest, { params }: { params: { dropId: string } }) {
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

    const { dropId } = await params
    const parsedDropId = Number.parseInt(dropId, 10)
    if (!Number.isFinite(parsedDropId) || parsedDropId <= 0) {
      return NextResponse.json({ error: "Invalid dropId" }, { status: 400 })
    }

    // Increment download count
    await sql`
      UPDATE academy_monthly_drops
      SET download_count = download_count + 1
      WHERE id = ${parsedDropId}
    `

    // Track user download
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking monthly drop download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
