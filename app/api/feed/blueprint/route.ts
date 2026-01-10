import type { NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getDb } from "@/lib/db"
import { mapBlueprintStrategyToFeed } from "@/lib/feed-planner/blueprint-mapper"
import { hasPaidBlueprint } from "@/lib/subscription"

/**
 * Blueprint Feed API Endpoint
 * 
 * Decision 2: Returns mapped blueprint strategy_data as feed format
 * for paid blueprint users to use FeedViewScreen UI
 * 
 * This endpoint converts blueprint_subscribers.strategy_data into
 * feed_posts format expected by FeedViewScreen/InstagramFeedView
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.error("[Blueprint Feed API] Authentication failed")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.error("[Blueprint Feed API] User not found")
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Decision 2: Check if user has paid blueprint
    const hasPaid = await hasPaidBlueprint(neonUser.id)
    if (!hasPaid) {
      return Response.json({ error: "Paid blueprint required" }, { status: 403 })
    }

    const sql = getDb()

    // Get blueprint strategy_data
    const blueprintSubscriber = await sql`
      SELECT strategy_data, strategy_generated
      FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      AND strategy_generated = TRUE
      LIMIT 1
    ` as any[]

    if (blueprintSubscriber.length === 0 || !blueprintSubscriber[0].strategy_data) {
      return Response.json({ exists: false })
    }

    const strategyData = blueprintSubscriber[0].strategy_data

    // Map blueprint strategy to feed format
    const mappedFeed = mapBlueprintStrategyToFeed(neonUser.id, strategyData)

    if (!mappedFeed) {
      return Response.json({ exists: false })
    }

    // Return in same format as /api/feed/[feedId]
    return Response.json({
      exists: true,
      feed: mappedFeed.feed,
      posts: mappedFeed.posts,
      bio: mappedFeed.bio,
      highlights: mappedFeed.highlights,
      username: "",
      brandName: mappedFeed.feed.title || "Blueprint Feed",
      userDisplayName: neonUser.display_name || neonUser.name || neonUser.email?.split("@")[0] || "User",
    })
  } catch (error: any) {
    console.error("[Blueprint Feed API] Error:", {
      message: error?.message || String(error),
      stack: error?.stack,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
