import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Add a generated strategy to a feed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const { feedId } = await Promise.resolve(params)
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const body = await request.json()
    const { strategy } = body

    if (!strategy) {
      return NextResponse.json(
        { error: "strategy is required" },
        { status: 400 }
      )
    }

    console.log("[ADD-STRATEGY] Adding strategy to feed:", feedIdInt)

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify feed belongs to user
    const [feed] = await sql`
      SELECT id
      FROM feed_layouts
      WHERE id = ${feedIdInt}
      AND user_id = ${neonUser.id}
    `

    if (!feed) {
      return NextResponse.json(
        { error: "Feed not found or access denied" },
        { status: 404 }
      )
    }

    // CRITICAL: Store strategy document in feed_strategy table, NOT in feed_layouts.description
    // Strategy documents should only appear in Feed Planner, not in chat feed cards
    // Check if strategy already exists for this feed
    const [existingStrategy] = await sql`
      SELECT id FROM feed_strategy
      WHERE feed_layout_id = ${feedIdInt}
      AND user_id = ${neonUser.id}
      LIMIT 1
    `
    
    if (existingStrategy) {
      // Update existing strategy
      await sql`
        UPDATE feed_strategy
        SET strategy_document = ${strategy},
            updated_at = NOW(),
            is_active = true
        WHERE feed_layout_id = ${feedIdInt}
        AND user_id = ${neonUser.id}
      `
    } else {
      // Insert new strategy
      await sql`
        INSERT INTO feed_strategy (user_id, feed_layout_id, strategy_document, is_active)
        VALUES (${neonUser.id}, ${feedIdInt}, ${strategy}, true)
      `
    }

    // CRITICAL: Clear description field if it contains a strategy document
    // This prevents strategy documents from showing in chat feed cards
    // Check if description is a strategy document (has markdown headers and is long)
    const [currentFeed] = await sql`
      SELECT description
      FROM feed_layouts
      WHERE id = ${feedIdInt}
      AND user_id = ${neonUser.id}
    `
    
    if (currentFeed?.description) {
      const isStrategyDoc = /^#{1,3}\s/m.test(currentFeed.description) && currentFeed.description.length > 500
      if (isStrategyDoc) {
        // Clear description field since strategy is now in feed_strategy table
        await sql`
          UPDATE feed_layouts
          SET description = NULL,
              updated_at = NOW()
          WHERE id = ${feedIdInt}
          AND user_id = ${neonUser.id}
        `
        console.log("[ADD-STRATEGY] ✅ Cleared strategy document from description field")
      }
    }

    console.log("[ADD-STRATEGY] ✅ Strategy added to feed_strategy table for feed:", feedIdInt)

    return NextResponse.json({
      success: true,
      message: "Strategy added successfully",
    })
  } catch (error) {
    console.error("[ADD-STRATEGY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add strategy",
      },
      { status: 500 }
    )
  }
}

