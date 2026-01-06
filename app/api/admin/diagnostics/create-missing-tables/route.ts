import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

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

// Map tables to their migration scripts
const TABLE_MIGRATIONS: Record<string, string> = {
  admin_knowledge_base: "scripts/36-create-admin-knowledge-base.sql",
  admin_memory: "scripts/34-create-admin-memory-system.sql",
  admin_business_insights: "scripts/34-create-admin-memory-system.sql",
  admin_content_performance: "scripts/34-create-admin-memory-system.sql",
  admin_email_campaigns: "scripts/42-ensure-email-campaign-tables.sql",
  admin_agent_messages: "scripts/38-add-email-preview-data-column.sql",
  admin_personal_story: "scripts/30-create-personal-knowledge-system.sql",
  admin_writing_samples: "scripts/30-create-personal-knowledge-system.sql",
  alex_suggestion_history: "scripts/migrations/019_create_alex_suggestion_history.sql",
}

/**
 * POST /api/admin/diagnostics/create-missing-tables
 * Creates missing admin tables using existing migrations
 */
export async function POST() {
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

    if (missingTables.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All admin tables exist",
        created: [],
      })
    }

    console.log("[ADMIN-SCHEMA] Creating missing tables:", missingTables)

    const created: string[] = []
    const failed: Array<{ table: string; error: string }> = []

    for (const tableName of missingTables) {
      try {
        const migrationPath = TABLE_MIGRATIONS[tableName]
        
        if (!migrationPath) {
          failed.push({ table: tableName, error: "No migration script found" })
          continue
        }

        const fullPath = join(process.cwd(), migrationPath)
        
        if (!existsSync(fullPath)) {
          failed.push({ table: tableName, error: `Migration file not found: ${migrationPath}` })
          continue
        }

        const migrationSQL = readFileSync(fullPath, "utf-8")
        
        // Execute migration
        await sql.unsafe(migrationSQL)
        
        created.push(tableName)
        console.log(`[ADMIN-SCHEMA] ✅ Created table: ${tableName}`)
      } catch (error: any) {
        console.error(`[ADMIN-SCHEMA] ❌ Failed to create ${tableName}:`, error)
        failed.push({ table: tableName, error: error.message || "Unknown error" })
      }
    }

    // Verify final state
    const finalCheck = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${TARGET_TABLES})
    `
    const finalExisting = finalCheck.map((row: any) => row.table_name)
    const stillMissing = TARGET_TABLES.filter((name) => !finalExisting.includes(name))

    return NextResponse.json({
      success: stillMissing.length === 0,
      created,
      failed,
      stillMissing,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-SCHEMA] Error creating tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create tables",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

