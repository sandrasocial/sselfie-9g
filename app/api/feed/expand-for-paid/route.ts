import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

/**
 * POST /api/feed/expand-for-paid
 * 
 * Phase 4: Client-side fallback to expand feed from 1 post to 9 posts (3x3 grid)
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

    // Get feed_style from feed_layouts to pre-generate prompts
    const [feedLayout] = await sql`
      SELECT feed_style
      FROM feed_layouts
      WHERE id = ${feedId}
      LIMIT 1
    ` as any[]

    // Phase 4: Create posts for missing positions 2-9 (3x3 grid)
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

      // Pre-generate prompts for all 9 positions if feed_style is set
      // This eliminates the 5-10 second delay when generating position 1
      if (feedLayout?.feed_style) {
        try {
          const { preGenerateAllPrompts } = await import("@/lib/feed-planner/pre-generate-prompts")
          const result = await preGenerateAllPrompts({
            feedId,
            userId: user.id.toString(),
            feedStyle: feedLayout.feed_style,
            sql,
          })

          if (!result.success) {
            console.warn(`[FEED EXPANSION] ⚠️ Failed to pre-generate prompts: ${result.error} - prompts will be generated on first generation`)
          } else {
            console.log(`[FEED EXPANSION] ✅ Pre-generated prompts for all 9 positions`)
          }
        } catch (error) {
          console.error("[FEED EXPANSION] Error pre-generating prompts:", error)
          // Continue - prompts will be generated on first generation
        }
      }

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
