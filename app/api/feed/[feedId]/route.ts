import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params

    if (feedId === "latest") {
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
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
    return Response.json({ error: "Failed to load feed. Please try again." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params
    const body = await req.json()
    const { bio } = body

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
      // Update existing bio
      await sql`
        UPDATE instagram_bios
        SET bio_text = ${bio}, updated_at = NOW()
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
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { feedId } = params

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete feed posts first (foreign key constraint)
    await sql`
      DELETE FROM feed_posts
      WHERE feed_layout_id = ${feedId}
    `

    // Delete highlights
    await sql`
      DELETE FROM instagram_highlights
      WHERE feed_layout_id = ${feedId}
    `

    // Delete bio
    await sql`
      DELETE FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
    `

    // Delete feed layout
    await sql`
      DELETE FROM feed_layouts
      WHERE id = ${feedId} AND user_id = ${user.id}
    `

    console.log("[v0] Successfully deleted feed:", feedId)
    return Response.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting feed:", error?.message || error)
    return Response.json({ error: "Failed to delete feed. Please try again." }, { status: 500 })
  }
}
