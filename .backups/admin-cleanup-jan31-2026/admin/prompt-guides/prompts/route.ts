import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { guideId, prompt, imageUrl, title, description, category } = body

    if (!guideId) {
      return NextResponse.json({ error: "guideId is required" }, { status: 400 })
    }

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const sql = getDb()

    // Verify the guide exists
    const [guide] = await sql`
      SELECT id, title
      FROM prompt_guides
      WHERE id = ${guideId}
    `

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 })
    }

    // Get the current max sort_order for this guide
    const [maxOrder] = await sql`
      SELECT COALESCE(MAX(sort_order), 0) as max_order
      FROM prompt_guide_items
      WHERE guide_id = ${guideId}
    `

    const nextSortOrder = (maxOrder?.max_order || 0) + 1

    // Insert new prompt guide item
    const [newItem] = await sql`
      INSERT INTO prompt_guide_items (
        guide_id,
        prompt_text,
        concept_title,
        concept_description,
        category,
        image_url,
        status,
        sort_order
      ) VALUES (
        ${guideId},
        ${prompt},
        ${title || null},
        ${description || null},
        ${category || null},
        ${imageUrl || null},
        'pending',
        ${nextSortOrder}
      )
      RETURNING *
    `

    // Update total_prompts count in prompt_guides
    await sql`
      UPDATE prompt_guides
      SET 
        total_prompts = total_prompts + 1,
        updated_at = NOW()
      WHERE id = ${guideId}
    `

    return NextResponse.json({ 
      success: true, 
      message: "Saved to guide successfully",
      item: newItem
    })
  } catch (error) {
    console.error("[v0] Error saving prompt to guide:", error)
    return NextResponse.json(
      { error: "Failed to save to guide", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

