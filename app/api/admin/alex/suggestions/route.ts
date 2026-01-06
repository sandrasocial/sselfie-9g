import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getProactiveSuggestions } from "@/lib/alex/proactive-suggestions"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

const REQUIRED_TABLES = ["alex_suggestion_history", "admin_email_campaigns"]

/**
 * Check if required tables exist
 */
async function checkTablesExist(): Promise<{ allExist: boolean; missing: string[] }> {
  try {
    const existing = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${REQUIRED_TABLES})
    `
    const existingNames = existing.map((row: any) => row.table_name)
    const missing = REQUIRED_TABLES.filter((name) => !existingNames.includes(name))
    return { allExist: missing.length === 0, missing }
  } catch (error) {
    console.error("[ADMIN-SCHEMA] Error checking tables:", error)
    return { allExist: false, missing: REQUIRED_TABLES }
  }
}

/**
 * GET /api/admin/alex/suggestions
 * Fetch active proactive suggestions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Check if required tables exist
    const tableCheck = await checkTablesExist()
    if (!tableCheck.allExist) {
      console.warn("[ADMIN-SCHEMA] Missing required tables:", {
        route: "/api/admin/alex/suggestions",
        missingTables: tableCheck.missing,
      })
      return NextResponse.json(
        {
          error: "Missing required table(s)",
          missingTables: tableCheck.missing,
          route: "/api/admin/alex/suggestions",
        },
        { status: 424 }, // 424 Failed Dependency
      )
    }

    // Get active suggestions (not dismissed)
    const suggestions = await getProactiveSuggestions(user.id.toString(), user.email || undefined)

    return NextResponse.json({
      success: true,
      suggestions: suggestions || []
    })

  } catch (error: any) {
    console.error('[Alex] Error fetching suggestions:', error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
}

