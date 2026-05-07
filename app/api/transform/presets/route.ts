import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const revalidate = 3600

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug")

    if (slug) {
      // Map URL slug back to title
      const titleMap: Record<string, string> = {
        "parisian-editorial": "The Parisian Editorial",
        "studio-headshot": "Studio Headshot",
        "golden-hour": "Golden Hour Lifestyle",
        "dark-editorial": "Dark Editorial",
        "coffee-shop": "Coffee Shop Story",
        "scandinavian": "Scandinavian Minimalist",
        "brand-founder": "Brand Founder Portrait",
      }
      const title = titleMap[slug]
      if (title) {
        const rows = await sql`
          SELECT id, title, prompt_text, style_notes
          FROM transform_daily_prompts
          WHERE title = ${title}
          LIMIT 1
        `
        if (rows.length > 0) return NextResponse.json(rows[0])
      }
    }

    // Return all presets ordered by prompt_date
    const rows = await sql`
      SELECT id, title, prompt_text, style_notes
      FROM transform_daily_prompts
      ORDER BY prompt_date ASC
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error("[transform/presets] Error:", error)
    return NextResponse.json({ error: "Failed to load presets" }, { status: 500 })
  }
}
