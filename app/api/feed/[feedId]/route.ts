import type { NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params
    const sql = getDb()

    if (feedId === "latest") {
      const supabase = await createServerClient()

      const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

      if (authError || !authUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }

      const user = await getUserByAuthId(authUser.id)

      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }

      // Get user's most recent feed layout
      const feedLayouts = await sql`
        SELECT * FROM feed_layouts
        WHERE user_id = ${user.id}
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

      return Response.json({
        exists: true,
        feed: feedLayout,
        posts: feedPosts,
        bio: bios[0] || null,
        highlights: highlights || [],
      })
    }

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
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedId}
      ORDER BY created_at ASC
    `

    return Response.json({
      feed: feedLayout,
      posts: feedPosts,
      bio: bios[0] || null,
      highlights: highlights || [],
    })
  } catch (error: any) {
    console.error("[v0] Error fetching feed:", error?.message || error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: "Failed to load feed. Please try again.", details: errorMessage }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params
    const body = await req.json()
    const { bio } = body
    const sql = getDb()

    if (!bio || typeof bio !== "string") {
      return Response.json({ error: "Bio is required" }, { status: 400 })
    }

    // Update or insert bio
    const existingBios = await sql`
      SELECT id FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
      LIMIT 1
    `

    if (existingBios.length > 0) {
      await sql`
        UPDATE instagram_bios
        SET bio_text = ${bio}
        WHERE feed_layout_id = ${feedId}
      `
    } else {
      // Insert new bio
      await sql`
        INSERT INTO instagram_bios (feed_layout_id, bio_text)
        VALUES (${feedId}, ${bio})
      `
    }

    return Response.json({ success: true, bio })
  } catch (error: any) {
    console.error("[v0] Error updating bio:", error?.message || error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    console.log("[v0] DELETE feed request for feedId:", params.feedId)
    const { feedId } = params
    const sql = getDb()

    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      console.error("[v0] DELETE feed auth error:", authError)
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      console.error("[v0] DELETE feed user not found")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Deleting feed for user:", user.id)

    await sql`
      DELETE FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted feed posts")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM instagram_highlights
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted highlights")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
    `
    console.log("[v0] Deleted bio")

    await new Promise((resolve) => setTimeout(resolve, 100))

    await sql`
      DELETE FROM feed_layouts
      WHERE id = ${feedId} AND user_id = ${user.id}
    `

    console.log("[v0] Successfully deleted feed:", feedId)
    return Response.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting feed:", error)
    let errorMessage = "Failed to delete feed. Please try again."

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    } else if (error?.message) {
      errorMessage = String(error.message)
    }

    console.error("[v0] Serialized error message:", errorMessage)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
