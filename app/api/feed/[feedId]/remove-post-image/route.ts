// Remove a photo from a grid slot (Sandra, 2026-07-07). Clears the SLOT back to its planned
// state (theme + caption kept, day stays planned, ready to regenerate or refill) - it never
// deletes the photo itself: gallery images stay in ai_images, and the Blob file remains.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { postId } = await request.json().catch(() => ({}) as { postId?: number })
    if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 })

    const resolvedParams = await Promise.resolve(params)
    const feedId = Number(resolvedParams.feedId)

    const updated = await sql`
      UPDATE feed_posts
      SET image_url = NULL,
          media_urls = '[]'::jsonb,
          preview_image_url = NULL,
          ai_image_id = NULL,
          prediction_id = NULL,
          generation_status = 'pending',
          updated_at = NOW()
      WHERE id = ${postId}
        AND feed_layout_id = ${feedId}
        AND user_id = ${neonUser.id}
      RETURNING id
    `
    if (updated.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[remove-post-image] failed:", error)
    return NextResponse.json({ error: "Failed to remove image" }, { status: 500 })
  }
}
