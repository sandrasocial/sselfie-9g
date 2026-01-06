import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

const REQUIRED_TABLES = ["admin_knowledge_base", "admin_context_guidelines"]

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
        route: "/api/admin/knowledge",
        missingTables: tableCheck.missing,
      })
      return NextResponse.json(
        {
          error: "Missing required table(s)",
          missingTables: tableCheck.missing,
          route: "/api/admin/knowledge",
        },
        { status: 424 }, // 424 Failed Dependency
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const category = searchParams.get("category")

    let knowledge
    
    if (type && type !== "all" && category && category !== "all") {
      knowledge = await sql`
        SELECT * FROM admin_knowledge_base
        WHERE is_active = true 
          AND knowledge_type = ${type}
          AND category = ${category}
        ORDER BY confidence_level DESC, updated_at DESC
        LIMIT 50
      `
    } else if (type && type !== "all") {
      knowledge = await sql`
        SELECT * FROM admin_knowledge_base
        WHERE is_active = true 
          AND knowledge_type = ${type}
        ORDER BY confidence_level DESC, updated_at DESC
        LIMIT 50
      `
    } else if (category && category !== "all") {
      knowledge = await sql`
        SELECT * FROM admin_knowledge_base
        WHERE is_active = true 
          AND category = ${category}
        ORDER BY confidence_level DESC, updated_at DESC
        LIMIT 50
      `
    } else {
      knowledge = await sql`
        SELECT * FROM admin_knowledge_base
        WHERE is_active = true
        ORDER BY confidence_level DESC, updated_at DESC
        LIMIT 50
      `
    }

    const guidelines = await sql`
      SELECT * FROM admin_context_guidelines
      WHERE is_active = true
      ORDER BY 
        CASE priority_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        created_at DESC
    `

    return NextResponse.json({
      knowledge: knowledge || [],
      guidelines: guidelines || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching admin knowledge:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch knowledge base",
        message: error instanceof Error ? error.message : "Unknown error",
        knowledge: [],
        guidelines: []
      }, 
      { status: 500 }
    )
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
    const { knowledge_type, category, title, content, use_cases, confidence_level, related_tags } = body

    const result = await sql`
      INSERT INTO admin_knowledge_base (
        knowledge_type, category, title, content, use_cases,
        confidence_level, related_tags, created_at, updated_at
      ) VALUES (
        ${knowledge_type}, ${category}, ${title}, ${content}, 
        ${JSON.stringify(use_cases || [])},
        ${confidence_level || 0.8}, ${related_tags || []}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating admin knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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
    const { id, knowledge_type, category, title, content, use_cases, confidence_level, related_tags, is_active } = body

    const result = await sql`
      UPDATE admin_knowledge_base
      SET
        knowledge_type = ${knowledge_type},
        category = ${category},
        title = ${title},
        content = ${content},
        use_cases = ${JSON.stringify(use_cases || [])},
        confidence_level = ${confidence_level || 0.8},
        related_tags = ${related_tags || []},
        is_active = ${is_active !== undefined ? is_active : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating admin knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    // Soft delete
    await sql`
      UPDATE admin_knowledge_base
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting admin knowledge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
