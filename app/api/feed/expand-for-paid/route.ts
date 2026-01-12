import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

/**
 * POST /api/feed/expand-for-paid
 * 
 * FIX 2: Client-side fallback to expand feed from 1 post to 9 posts
 * Used when webhook expansion fails or user upgrades before webhook completes
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { feedId } = body

    if (!feedId) {
      return NextResponse.json({ error: "Missing feedId" }, { status: 400 })
    }

    console.log(`[FEED EXPANSION] Client-side expansion for feed ${feedId}, user ${user.id}`)

    // Check current post count
    const existingPosts = await sql`
      SELECT position
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    ` as any[]

    const existingPositions = existingPosts.map((p: any) => p.position)
    console.log(`[FEED EXPANSION] Feed ${feedId} has posts at positions:`, existingPositions)

    // Create posts for missing positions 2-9
    const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
      (pos) => !existingPositions.includes(pos)
    )

    if (positionsToCreate.length > 0) {
      console.log(`[FEED EXPANSION] Creating posts for positions:`, positionsToCreate)

      for (const position of positionsToCreate) {
        await sql`
          INSERT INTO feed_posts (
            feed_layout_id,
            user_id,
            position,
            post_type,
            generation_status,
            generation_mode,
            created_at,
            updated_at
          ) VALUES (
            ${feedId},
            ${user.id},
            ${position},
            'photo',
            'pending',
            'pro',
            NOW(),
            NOW()
          )
        `
      }

      console.log(`[FEED EXPANSION] ✅ Created ${positionsToCreate.length} new posts`)

      return NextResponse.json({
        success: true,
        positionsCreated: positionsToCreate,
      })
    }

    return NextResponse.json({
      success: true,
      positionsCreated: [],
      message: "Feed already has all 9 positions",
    })
  } catch (error) {
    console.error("[FEED EXPANSION] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to expand feed" },
      { status: 500 }
    )
  }
}
