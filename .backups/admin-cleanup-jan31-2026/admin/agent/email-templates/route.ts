import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// GET - List templates (both user templates and library templates)
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
    const userId = searchParams.get("userId")
    const source = searchParams.get("source") // 'user' or 'library'
    const category = searchParams.get("category")

    if (source === "library") {
      // Get pre-built templates from library
      const libraryTemplates = category
        ? await sql`
            SELECT * FROM email_template_library
            WHERE is_active = true AND category = ${category}
            ORDER BY name ASC
          `
        : await sql`
            SELECT * FROM email_template_library
            WHERE is_active = true
            ORDER BY category, name ASC
          `

      return NextResponse.json({ templates: libraryTemplates })
    }

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Get user's saved templates
    const userTemplates = category
      ? await sql`
          SELECT * FROM email_templates
          WHERE user_id = ${userId} AND category = ${category}
          ORDER BY updated_at DESC
        `
      : await sql`
          SELECT * FROM email_templates
          WHERE user_id = ${userId}
          ORDER BY updated_at DESC
        `

    return NextResponse.json({ templates: userTemplates })
  } catch (error) {
    console.error("[v0] Error fetching email templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Save new template or copy from library
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

    const { userId, name, category, subjectLine, previewText, bodyHtml, bodyText, variables, tags, isFavorite } =
      await request.json()

    if (!userId || !name || !category || !subjectLine || !bodyHtml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const [template] = await sql`
      INSERT INTO email_templates (
        user_id, name, category, subject_line, preview_text,
        body_html, body_text, variables, tags, is_favorite
      )
      VALUES (
        ${userId}, ${name}, ${category}, ${subjectLine}, ${previewText},
        ${bodyHtml}, ${bodyText},
        ${variables ? JSON.stringify(variables) : null},
        ${tags ? JSON.stringify(tags) : null},
        ${isFavorite || false}
      )
      RETURNING *
    `

    return NextResponse.json({ template })
  } catch (error) {
    console.error("[v0] Error creating email template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update template
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

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Template id required" }, { status: 400 })
    }

    const [template] = await sql`
      UPDATE email_templates
      SET
        name = COALESCE(${updates.name}, name),
        category = COALESCE(${updates.category}, category),
        subject_line = COALESCE(${updates.subjectLine}, subject_line),
        preview_text = COALESCE(${updates.previewText}, preview_text),
        body_html = COALESCE(${updates.bodyHtml}, body_html),
        body_text = COALESCE(${updates.bodyText}, body_text),
        variables = COALESCE(${updates.variables ? JSON.stringify(updates.variables) : null}, variables),
        tags = COALESCE(${updates.tags ? JSON.stringify(updates.tags) : null}, tags),
        is_favorite = COALESCE(${updates.isFavorite}, is_favorite),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ template })
  } catch (error) {
    console.error("[v0] Error updating email template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove template
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
      return NextResponse.json({ error: "Template id required" }, { status: 400 })
    }

    await sql`DELETE FROM email_templates WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting email template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
