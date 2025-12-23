import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: Request) {
  try {
    // Admin authentication check
    const { user, error } = await getAuthenticatedUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      guideId,
      promptText,
      conceptTitle,
      conceptDescription,
      category,
      imageUrl,
      replicatePredictionId,
      generationSettings,
    } = body

    if (!promptText) {
      return NextResponse.json(
        { error: "Missing required field: promptText" },
        { status: 400 }
      )
    }

    // If guideId is provided, add to that guide; otherwise create a new guide item
    // For now, we'll require guideId (can be enhanced later to create guide if needed)
    if (!guideId) {
      return NextResponse.json(
        { error: "guideId is required. Please select or create a guide first." },
        { status: 400 }
      )
    }

    // Verify guide exists and belongs to admin
    const [guide] = await sql`
      SELECT id, total_prompts, total_approved
      FROM prompt_guides
      WHERE id = ${guideId}
      AND created_by = ${neonUser.id}
    `

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 })
    }

    // Insert into prompt_guide_items
    const [item] = await sql`
      INSERT INTO prompt_guide_items (
        guide_id,
        prompt_text,
        concept_title,
        concept_description,
        category,
        image_url,
        replicate_prediction_id,
        status,
        generation_settings,
        approved_at,
        approved_by
      ) VALUES (
        ${guideId},
        ${promptText},
        ${conceptTitle || null},
        ${conceptDescription || null},
        ${category || null},
        ${imageUrl || null},
        ${replicatePredictionId || null},
        'approved',
        ${JSON.stringify(generationSettings || {})},
        NOW(),
        ${neonUser.id}
      )
      RETURNING id
    `

    // Update guide counts
    await sql`
      UPDATE prompt_guides
      SET 
        total_approved = total_approved + 1,
        updated_at = NOW()
      WHERE id = ${guideId}
    `

    // Get updated guide stats
    const [updatedGuide] = await sql`
      SELECT total_approved, total_prompts
      FROM prompt_guides
      WHERE id = ${guideId}
    `

    return NextResponse.json({
      success: true,
      itemId: item.id,
      totalApproved: updatedGuide?.total_approved || 0,
      totalPrompts: updatedGuide?.total_prompts || 0,
      message: "Item approved and added to guide",
    })
  } catch (error) {
    console.error("[PromptGuide] Error approving item:", error)
    return NextResponse.json(
      {
        error: "Failed to approve item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
