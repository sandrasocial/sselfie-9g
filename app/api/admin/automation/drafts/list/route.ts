import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"

/**
 * GET /api/admin/automation/drafts/list
 * Return content_drafts from Neon database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()

    const drafts = await sql`
      SELECT 
        id,
        title,
        type,
        content_json,
        created_at
      FROM content_drafts
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({
      success: true,
      drafts,
      total: drafts.length,
    })
  } catch (error) {
    console.error("[Automation] Error fetching drafts:", error)
    return NextResponse.json(
      { error: "Failed to fetch drafts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
