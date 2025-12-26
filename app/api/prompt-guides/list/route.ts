import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const guides = await sql`
      SELECT 
        pp.id as page_id,
        pp.slug,
        pp.title as page_title,
        pp.view_count,
        pp.email_capture_count,
        pg.id as guide_id,
        pg.title as guide_title,
        pg.description,
        pg.category,
        pg.published_at,
        (
          SELECT image_url 
          FROM prompt_guide_items pgi
          WHERE pgi.guide_id = pg.id 
          AND pgi.status = 'approved'
          AND pgi.image_url IS NOT NULL
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
          LIMIT 1
        ) as preview_image
      FROM prompt_pages pp
      JOIN prompt_guides pg ON pp.guide_id = pg.id
      WHERE pp.status = 'published'
      ORDER BY pg.published_at DESC NULLS LAST, pp.created_at DESC
    `

    return NextResponse.json({ guides })
  } catch (error: any) {
    console.error("[PromptGuide] Error listing guides:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list guides" },
      { status: 500 }
    )
  }
}




