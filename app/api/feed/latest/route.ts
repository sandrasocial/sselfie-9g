import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentNeonUser } from "@/lib/user-sync"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  console.log("[v0] Feed latest API called")

  try {
    const user = await getCurrentNeonUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Neon user ID:", user.id)

    // Get user's most recent feed layout
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Feed layouts found:", feedLayouts.length)

    if (feedLayouts.length === 0) {
      console.log("[v0] No feed found for user")
      return Response.json({ exists: false })
    }

    const feedLayout = feedLayouts[0]
    console.log("[v0] Feed layout ID:", feedLayout.id)

    // Get feed posts
    const feedPosts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY position ASC
    `

    // Get bio
    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedLayout.id}
      LIMIT 1
    `

    const highlights = await sql`
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at ASC
    `

    console.log("[v0] Returning feed with", feedPosts.length, "posts")

    return Response.json({
      exists: true,
      feed: feedLayout,
      posts: feedPosts,
      bio: bios[0] || null,
      highlights: highlights || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching latest feed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
