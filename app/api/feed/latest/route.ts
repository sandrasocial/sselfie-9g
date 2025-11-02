import type { NextRequest } from "next/server"
import { getDb } from "@/lib/db" // Use singleton database connection
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(req: NextRequest) {
  console.log("[v0] ========== FEED LATEST API CALLED ==========")

  try {
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.log("[v0] ❌ No authenticated user")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] ✅ Auth user ID:", authUser.id)

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      console.log("[v0] ❌ User not found in Neon")
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] ✅ Neon user ID:", user.id)

    const sql = getDb()

    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Feed layouts query result:", feedLayouts.length, "rows")

    if (feedLayouts.length === 0) {
      console.log("[v0] ⚠️ No feed found for user:", user.id)
      return Response.json({ exists: false })
    }

    const feedLayout = feedLayouts[0]
    console.log("[v0] ✅ Feed layout found:", {
      id: feedLayout.id,
      user_id: feedLayout.user_id,
      username: feedLayout.username,
      brand_name: feedLayout.brand_name,
      created_at: feedLayout.created_at,
    })

    const username = feedLayout.username || ""
    const brandName = feedLayout.brand_name || ""

    console.log("[v0] Feed metadata:", { username, brandName })

    const feedPosts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY position ASC
    `

    console.log("[v0] Feed posts query result:", feedPosts.length, "rows")
    if (feedPosts.length > 0) {
      console.log("[v0] First post sample:", {
        id: feedPosts[0].id,
        position: feedPosts[0].position,
        caption_preview: feedPosts[0].caption?.substring(0, 50) + "...",
        image_url: feedPosts[0].image_url,
      })
    }

    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedLayout.id}
      LIMIT 1
    `

    console.log("[v0] Bio query result:", bios.length, "rows")
    if (bios.length > 0) {
      console.log("[v0] Bio preview:", bios[0].bio_text?.substring(0, 50) + "...")
    }

    const highlights = await sql`
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at ASC
    `

    console.log("[v0] Highlights query result:", highlights.length, "rows")

    const response = {
      exists: true,
      feed: feedLayout,
      posts: feedPosts,
      bio: bios[0] || null,
      highlights: highlights || [],
      username,
      brandName,
    }

    console.log("[v0] ✅ Returning feed response:", {
      feedId: feedLayout.id,
      postsCount: feedPosts.length,
      highlightsCount: highlights.length,
      hasBio: !!bios[0],
    })

    return Response.json(response)
  } catch (error: any) {
    console.error("[v0] ❌ Error fetching latest feed:", {
      message: error?.message || String(error),
      stack: error?.stack,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
