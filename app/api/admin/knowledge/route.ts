import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const category = searchParams.get("category")

    // Build query conditions
    const conditions = ["is_active = true"]
    const params: any[] = []

    if (type && type !== "all") {
      params.push(type)
      conditions.push(`knowledge_type = $${params.length}`)
    }

    if (category && category !== "all") {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const knowledge = await sql`
      SELECT * FROM admin_knowledge_base
      ${sql.unsafe(whereClause)}
      ORDER BY confidence_level DESC, updated_at DESC
      LIMIT 50
    `

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
