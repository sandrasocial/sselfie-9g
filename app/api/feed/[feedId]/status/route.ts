import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const [feed] = await sql`
      SELECT status, updated_at
      FROM feed_layouts
      WHERE id = ${params.feedId}
    `

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: feed.status || "draft",
      updatedAt: feed.updated_at,
    })
  } catch (error) {
    console.error("[v0] Error fetching feed status:", error)
    return NextResponse.json({ error: "Failed to fetch feed status" }, { status: 500 })
  }
}
