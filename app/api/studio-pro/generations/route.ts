import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/studio-pro/generations
 * Get user's Pro generations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "30")
    const workflowType = searchParams.get("workflowType")

    let query = sql`
      SELECT 
        g.id,
        g.workflow_id,
        g.parent_generation_id,
        g.generation_type,
        g.image_urls,
        g.edit_instruction,
        g.prompt_used,
        g.settings,
        g.created_at,
        w.workflow_type,
        w.status as workflow_status
      FROM pro_generations g
      LEFT JOIN pro_workflows w ON g.workflow_id = w.id
      WHERE g.user_id = ${neonUser.id}
    `

    if (workflowType) {
      query = sql`
        ${query}
        AND g.generation_type = ${workflowType}
      `
    }

    query = sql`
      ${query}
      ORDER BY g.created_at DESC
      LIMIT ${limit}
    `

    const generations = await query

    // Transform to include first image URL for easy access
    const transformed = generations.map((gen: any) => ({
      id: gen.id,
      workflow_id: gen.workflow_id,
      parent_generation_id: gen.parent_generation_id,
      generation_type: gen.generation_type,
      workflow_type: gen.workflow_type,
      workflow_status: gen.workflow_status,
      image_url: Array.isArray(gen.image_urls) ? gen.image_urls[0] : gen.image_urls,
      image_urls: gen.image_urls,
      edit_instruction: gen.edit_instruction,
      prompt_used: gen.prompt_used,
      settings: gen.settings,
      created_at: gen.created_at,
    }))

    return NextResponse.json({ generations: transformed })
  } catch (error) {
    console.error("[STUDIO-PRO] Error fetching generations:", error)
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    )
  }
}




