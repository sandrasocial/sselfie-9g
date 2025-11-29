import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/automation/drafts/save
 * Insert or update a content draft in Neon database
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { id, title, type, content } = body

    if (!title || !type || !content) {
      return NextResponse.json({ error: "title, type, and content are required" }, { status: 400 })
    }

    let draft: any

    if (id) {
      // Update existing draft
      const result = await sql`
        UPDATE content_drafts
        SET title = ${title},
            type = ${type},
            content_json = ${JSON.stringify(content)}
        WHERE id = ${id}
        RETURNING id, title, type, content_json, created_at
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 })
      }

      draft = result[0]
    } else {
      // Insert new draft
      const result = await sql`
        INSERT INTO content_drafts (title, type, content_json)
        VALUES (${title}, ${type}, ${JSON.stringify(content)})
        RETURNING id, title, type, content_json, created_at
      `

      draft = result[0]
    }

    return NextResponse.json({
      success: true,
      draft,
      message: id ? "Draft updated successfully" : "Draft created successfully",
    })
  } catch (error) {
    console.error("[Automation] Error saving draft:", error)
    return NextResponse.json(
      { error: "Failed to save draft", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
