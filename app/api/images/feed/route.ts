import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import type { GalleryImage } from "@/lib/data/images"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch feed posts with images
    const feedPosts = await sql`
      SELECT 
        fp.id,
        fp.image_url,
        fp.caption as prompt,
        fp.description,
        fp.post_type as category,
        fp.created_at,
        fp.feed_layout_id,
        fl.title as feed_title
      FROM feed_posts fp
      INNER JOIN feed_layouts fl ON fp.feed_layout_id = fl.id
      WHERE fp.user_id = ${neonUser.id}
        AND fp.image_url IS NOT NULL
        AND fp.generation_status = 'completed'
      ORDER BY fp.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM feed_posts fp
      WHERE fp.user_id = ${neonUser.id}
        AND fp.image_url IS NOT NULL
        AND fp.generation_status = 'completed'
    `
    const total = Number(countResult[0]?.total || 0)
    const hasMore = offset + limit < total

    // Transform feed posts to GalleryImage format
    const images: GalleryImage[] = feedPosts.map((post: any) => ({
      id: `feed-${post.id}`,
      image_url: post.image_url,
      prompt: post.prompt || post.description || `Feed post from ${post.feed_title || 'Feed'}`,
      description: post.description,
      category: post.category || 'feed',
      source: 'feed',
      is_favorite: false, // Feed images don't have favorites yet
      created_at: post.created_at,
      feed_layout_id: post.feed_layout_id,
      feed_title: post.feed_title,
    }))

    return NextResponse.json({
      images,
      hasMore,
      total,
    })
  } catch (error) {
    console.error("[v0] Feed Images API: Error", error)
    return NextResponse.json({ error: "Failed to fetch feed images" }, { status: 500 })
  }
}




