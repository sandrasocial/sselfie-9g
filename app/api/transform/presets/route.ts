import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

const SLUG_TO_TITLE: Record<string, string> = {
  "natural-clean": "Natural Clean Edit",
  "soft-glow": "Soft Glow Edit",
  "lightroom-warm": "Lightroom Warm Edit",
  "crisp-editorial": "Crisp Editorial Edit",
  "luxury-soft-contrast": "Luxury Soft Contrast",
  "face-brighten": "Face Brighten Edit",
  "skin-light-polish": "Skin + Light Polish",
  "content-ready": "Content Ready Edit",
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug")

    if (slug) {
      const title = SLUG_TO_TITLE[slug]
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
