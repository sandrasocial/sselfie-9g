import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params

    // Get feed layout
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      LIMIT 1
    `

    if (feedLayouts.length === 0) {
      return Response.json({ error: "Feed not found" }, { status: 404 })
    }

    const feedLayout = feedLayouts[0]

    // Get feed posts
    const feedPosts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    `

    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
      LIMIT 1
    `

    const highlights = await sql`
      SELECT * FROM highlight_covers
      WHERE feed_layout_id = ${feedId}
      ORDER BY created_at ASC
    `

    return Response.json({
      feed: feedLayout,
      posts: feedPosts,
      bio: bios[0] || null,
      highlights: highlights || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching feed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
