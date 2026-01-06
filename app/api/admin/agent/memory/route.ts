import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

const REQUIRED_TABLES = ["admin_memory", "admin_business_insights", "admin_content_performance"]

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

export async function GET(request: Request) {
  try {
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

    // Check if required tables exist
    const tableCheck = await checkTablesExist()
    if (!tableCheck.allExist) {
      console.warn("[ADMIN-SCHEMA] Missing required tables:", {
        route: "/api/admin/agent/memory",
        missingTables: tableCheck.missing,
      })
      return NextResponse.json(
        {
          error: "Missing required table(s)",
          missingTables: tableCheck.missing,
          route: "/api/admin/agent/memory",
        },
        { status: 424 }, // 424 Failed Dependency
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"

    // Get admin memory insights
    const memory = await sql`
      SELECT * FROM admin_memory
      WHERE is_active = true
        AND (${type} = 'all' OR memory_type = ${type})
      ORDER BY confidence_score DESC, updated_at DESC
      LIMIT 50
    `

    // Get business insights
    const insights = await sql`
      SELECT * FROM admin_business_insights
      WHERE status IN ('new', 'reviewing')
      ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 20
    `

    // Get recent content performance
    const performance = await sql`
      SELECT * FROM admin_content_performance
      ORDER BY success_score DESC, analyzed_at DESC
      LIMIT 30
    `

    return NextResponse.json({
      memory: memory || [],
      insights: insights || [],
      performance: performance || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching admin memory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { memory_type, category, title, insight, data, confidence_score, impact_level, tags } = body

    const result = await sql`
      INSERT INTO admin_memory (
        memory_type, category, title, insight, data, 
        confidence_score, impact_level, tags, created_at, updated_at
      ) VALUES (
        ${memory_type}, ${category}, ${title}, ${insight}, ${JSON.stringify(data || {})},
        ${confidence_score || 0.5}, ${impact_level || "medium"}, ${tags || []}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating admin memory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
