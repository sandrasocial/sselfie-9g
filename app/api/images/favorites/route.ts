import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json()

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 })
    }

    for (const update of updates) {
      const { id, is_favorite } = update

      // Parse the ID to determine source table
      const [source, numericId] = id.split("_")

      // Only ai_images table has is_favorite column
      if (source === "ai") {
        await sql`
          UPDATE ai_images
          SET is_favorite = ${is_favorite}
          WHERE id = ${numericId}
        `
      }
      // generated_images table doesn't have is_favorite column, skip it
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in favorites API:", error)
    return NextResponse.json({ error: "Failed to update favorites" }, { status: 500 })
  }
}
