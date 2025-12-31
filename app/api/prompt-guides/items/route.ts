import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || null

    // Fetch all approved prompt guide items
    // If category is provided, filter by it
    let items
    if (category && category !== "all") {
      items = await sql`
        SELECT 
          pgi.id,
          pgi.concept_title,
          pgi.prompt_text,
          pgi.image_url,
          pgi.sort_order,
          pg.category,
          pg.title as guide_title,
          pg.description as guide_description
        FROM prompt_guide_items pgi
        JOIN prompt_guides pg ON pgi.guide_id = pg.id
        WHERE pgi.status = 'approved'
          AND pg.status = 'published'
          AND LOWER(pg.category) = LOWER(${category})
        ORDER BY pgi.sort_order ASC, pgi.created_at ASC
      `
    } else {
      items = await sql`
        SELECT 
          pgi.id,
          pgi.concept_title,
          pgi.prompt_text,
          pgi.image_url,
          pgi.sort_order,
          pg.category,
          pg.title as guide_title,
          pg.description as guide_description
        FROM prompt_guide_items pgi
        JOIN prompt_guides pg ON pgi.guide_id = pg.id
        WHERE pgi.status = 'approved'
          AND pg.status = 'published'
        ORDER BY pgi.sort_order ASC, pgi.created_at ASC
      `
    }

    // Get unique categories for filter
    const categories = await sql`
      SELECT DISTINCT LOWER(category) as category
      FROM prompt_guides
      WHERE status = 'published'
        AND category IS NOT NULL
      ORDER BY category
    `

    return NextResponse.json({
      items: items || [],
      categories: categories.map((c: any) => c.category) || [],
    })
  } catch (error: any) {
    console.error("[PromptGuides] Error fetching items:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch prompt guide items", items: [], categories: [] },
      { status: 500 }
    )
  }
}

