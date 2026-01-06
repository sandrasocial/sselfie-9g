import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

const TARGET_TABLES = [
  "admin_knowledge_base",
  "admin_memory",
  "admin_business_insights",
  "admin_content_performance",
  "admin_email_campaigns",
  "admin_agent_messages",
  "admin_personal_story",
  "admin_writing_samples",
  "alex_suggestion_history",
]

/**
 * GET /api/admin/diagnostics/schema-health
 * Returns status of all admin tables (present/missing)
 */
export async function GET() {
  try {
    // Admin auth check
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

    // Check which tables exist
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${TARGET_TABLES})
      ORDER BY table_name
    `

    const existingTableNames = existingTables.map((row: any) => row.table_name)
    const missingTables = TARGET_TABLES.filter((name) => !existingTableNames.includes(name))

    const tableStatus = TARGET_TABLES.map((tableName) => ({
      name: tableName,
      present: existingTableNames.includes(tableName),
    }))

    console.log("[ADMIN-SCHEMA] Health check:", {
      present: existingTableNames.length,
      missing: missingTables.length,
      missingTables,
    })

    return NextResponse.json({
      status: missingTables.length === 0 ? "healthy" : "degraded",
      totalTables: TARGET_TABLES.length,
      presentCount: existingTableNames.length,
      missingCount: missingTables.length,
      tables: tableStatus,
      missingTables: missingTables,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-SCHEMA] Error checking schema health:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Failed to check schema health",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

