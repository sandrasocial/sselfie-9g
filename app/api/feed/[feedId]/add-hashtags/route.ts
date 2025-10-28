import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params
    const { hashtags } = await request.json()

    console.log("[v0] Adding hashtags to feed:", feedId, "hashtags:", hashtags.length)

    // Update all posts in this feed with hashtags
    await sql`
      UPDATE feed_posts
      SET hashtags = ${hashtags}
      WHERE feed_id = ${feedId}
    `

    console.log("[v0] Hashtags added successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error adding hashtags:", error)
    return NextResponse.json({ error: "Failed to add hashtags" }, { status: 500 })
  }
}
