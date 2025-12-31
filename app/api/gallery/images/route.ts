import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    // AUTHENTICATION (use helper for consistent cookie handling)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("[GALLERY] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      console.error("[GALLERY] User not found for auth ID:", user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // GET pagination parameters
    const { searchParams } = new URL(req.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // FETCH user's gallery images (ai_images table) with pagination
    const images = await sql`
      SELECT 
        id,
        image_url,
        prompt,
        category,
        created_at
      FROM ai_images
      WHERE user_id = ${neonUserId}
      AND generation_status = 'completed'
      AND image_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count for pagination
    const totalCountResult = await sql`
      SELECT COUNT(*) as total
      FROM ai_images
      WHERE user_id = ${neonUserId}
      AND generation_status = 'completed'
      AND image_url IS NOT NULL
    `
    const totalCount = Number.parseInt(totalCountResult[0]?.total || "0")
    const hasMore = offset + limit < totalCount

    return NextResponse.json({ 
      images,
      hasMore,
      total: totalCount,
      offset,
      limit
    })

  } catch (error) {
    console.error("[GALLERY] Fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 }
    )
  }
}
