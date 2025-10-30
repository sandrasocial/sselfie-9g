import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  console.log("[v0] Feed latest API called")

  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No authenticated user")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      console.log("[v0] User not found in Neon")
      return Response.json({ error: "User not found" }, { status: 404 })
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
    console.log("[v0] [SERVER] Feed layout ID:", feedLayout.id)

    const username = feedLayout.username || ""
    const brandName = feedLayout.brand_name || ""
    // </CHANGE>

    console.log("[v0] [SERVER] Username from feed:", username, "Brand Name from feed:", brandName)

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
      username, // Include username in response
      brandName, // Include brandName in response
    })
  } catch (error) {
    console.error("[v0] Error fetching latest feed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
