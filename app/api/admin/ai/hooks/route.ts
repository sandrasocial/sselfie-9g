import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/ai/hooks
 * Get all hooks from library
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) return admin

    // Check if hooks table exists, if not return empty array
    let hooks = []
    try {
      hooks = await sql`
        SELECT * FROM hooks_library
        ORDER BY created_at DESC
        LIMIT 100
      `
    } catch (error: any) {
      // Table doesn't exist yet - return empty array
      if (error.message?.includes("does not exist")) {
        return NextResponse.json({ hooks: [] })
      }
      throw error
    }

    return NextResponse.json({ hooks })
  } catch (error) {
    console.error("[HooksLibrary] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

