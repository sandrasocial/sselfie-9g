import { NextResponse } from "next/server"
import { runMigration } from "@/scripts/run-prompt-guide-migration"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Admin API endpoint to trigger prompt guide tables migration
 * POST /api/admin/run-prompt-guide-migration
 *
 * Creates all tables required for the Admin Prompt Guide Builder feature
 */
export async function POST(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("[MIGRATION] Admin triggered prompt guide migration")

    await runMigration()

    return NextResponse.json({
      success: true,
      message: "Prompt Guide Builder tables migration completed successfully",
    })
  } catch (error: any) {
    console.error("[MIGRATION] Migration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    message: "Use POST to trigger migration",
    endpoint: "/api/admin/run-prompt-guide-migration",
  })
}
