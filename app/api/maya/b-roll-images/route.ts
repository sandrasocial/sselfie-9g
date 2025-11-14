import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
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
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] === FETCHING B-ROLL IMAGES ===")
    console.log("[v0] User ID:", neonUser.id)

    // Maya images don't have a specific "maya" category - they use various categories
    const images = await sql`
      SELECT 
        id,
        prompt,
        description,
        category,
        subcategory,
        COALESCE(selected_url, (string_to_array(image_urls::text, ','))[1]) as image_url,
        image_urls,
        created_at
      FROM generated_images
      WHERE user_id = ${neonUser.id}
        AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    console.log("[v0] Found images:", images.length)

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM generated_images
      WHERE user_id = ${neonUser.id}
        AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
    `

    const total = Number(countResult[0]?.total || 0)
    const hasMore = offset + limit < total

    console.log("[v0] Total images:", total)
    console.log("[v0] Has more:", hasMore)

    return NextResponse.json({
      images,
      total,
      hasMore,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[v0] Error fetching B-roll images:", error)
    return NextResponse.json({ error: "Failed to fetch B-roll images" }, { status: 500 })
  }
}
