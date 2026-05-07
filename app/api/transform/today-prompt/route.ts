import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const revalidate = 3600

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    const rows = await sql`
      SELECT id, prompt_date, title, prompt_text, style_notes
      FROM transform_daily_prompts
      WHERE prompt_date = ${today}
      LIMIT 1
    `

    if (rows.length === 0) {
      // Fall back to the most recent available prompt
      const fallback = await sql`
        SELECT id, prompt_date, title, prompt_text, style_notes
        FROM transform_daily_prompts
        ORDER BY prompt_date DESC
        LIMIT 1
      `

      if (fallback.length === 0) {
        return NextResponse.json({ error: "No prompts available" }, { status: 404 })
      }

      return NextResponse.json(fallback[0])
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("[transform/today-prompt] Error:", error)
    return NextResponse.json({ error: "Failed to load today's prompt" }, { status: 500 })
  }
}
