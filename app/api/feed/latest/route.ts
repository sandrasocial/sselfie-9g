import type { NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"

/**
 * Get latest feed endpoint
 * 
 * This endpoint is a convenience wrapper that forwards to /api/feed/[feedId] with feedId="latest"
 * It maintains backward compatibility while using the consolidated [feedId] route logic.
 * 
 * @deprecated In the future, frontend should use /api/feed/latest directly as a parameter to [feedId]
 * For now, this route delegates to the [feedId] route for consistency.
 */
export async function GET(req: NextRequest) {
  // Forward to the [feedId] route with feedId="latest"
  // We'll call the logic directly to avoid an extra HTTP request
  try {
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()

    // Get user's most recent feed layout
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]

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

    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedLayout.id}
      LIMIT 1
    ` as any[]

    const highlights = await sql`
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedLayout.id}
      ORDER BY created_at ASC
    ` as any[]

    // Include username and brandName for consistency
    const username = feedLayout.username || ""
    const brandName = feedLayout.brand_name || ""
    // Include user's display name
    const userDisplayName = user.display_name || user.name || user.email?.split("@")[0] || "User"

    return Response.json({
      exists: true,
      feed: feedLayout,
      posts: feedPosts,
      bio: bios[0] || null,
      highlights: highlights || [],
      username,
      brandName,
      userDisplayName,
    })
  } catch (error: any) {
    console.error("[v0] ❌ Error fetching latest feed:", {
      message: error?.message || String(error),
      stack: error?.stack,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
