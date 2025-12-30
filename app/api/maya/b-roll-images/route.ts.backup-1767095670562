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

    const images = await sql`
      WITH combined AS (
        SELECT 
          id,
          prompt,
          category,
          'ai_images' as source,
          image_url,
          created_at
        FROM ai_images
        WHERE user_id = ${neonUser.id}
          AND image_url IS NOT NULL
          AND generation_status = 'completed'
        
        UNION ALL
        
        SELECT 
          id,
          prompt,
          category,
          'generated_images' as source,
          COALESCE(selected_url, (string_to_array(image_urls::text, ','))[1]) as image_url,
          created_at
        FROM generated_images
        WHERE user_id = ${neonUser.id}
          AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
      ),
      deduplicated AS (
        SELECT 
          id,
          prompt,
          category,
          source,
          image_url,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY image_url ORDER BY created_at DESC) as rn
        FROM combined
      )
      SELECT 
        id,
        prompt,
        category,
        source,
        image_url,
        created_at
      FROM deduplicated
      WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    console.log("[v0] Found images:", images.length)
    console.log(
      "[v0] Sample image URLs:",
      images.slice(0, 3).map((img) => ({ id: img.id, url: img.image_url?.substring(0, 50) })),
    )

    const countResult = await sql`
      WITH combined AS (
        SELECT image_url
        FROM ai_images 
        WHERE user_id = ${neonUser.id} 
          AND image_url IS NOT NULL 
          AND generation_status = 'completed'
        
        UNION ALL
        
        SELECT COALESCE(selected_url, (string_to_array(image_urls::text, ','))[1]) as image_url
        FROM generated_images 
        WHERE user_id = ${neonUser.id} 
          AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
      )
      SELECT COUNT(DISTINCT image_url) as total
      FROM combined
    `

    const total = Number(countResult[0]?.total || 0)
    const hasMore = offset + limit < total

    console.log("[v0] Total unique images:", total)
    console.log("[v0] Has more:", hasMore)
    console.log("[v0] Photoshoot images:", images.filter((img) => img.category === "photoshoot").length)

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
