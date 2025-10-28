import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Neon ID
    const neonUsers = await sql`
      SELECT id FROM users
      WHERE supabase_user_id = ${user.id}
      LIMIT 1
    `

    if (neonUsers.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = neonUsers[0].id

    // Get user's most recent feed layout
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${neonUserId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (feedLayouts.length === 0) {
      return Response.json({ exists: false })
    }

    const feedLayout = feedLayouts[0]

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

    // Get highlights
    const highlights = await sql`
      SELECT * FROM highlight_covers
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at ASC
    `

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
