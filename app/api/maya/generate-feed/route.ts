/**
 * CLASSIC MODE FEED GENERATION API
 *
 * PURPOSE: Validates and processes feed strategy JSON from Maya's response in Classic Mode.
 *
 * FLOW:
 * 1. User requests feed creation in Classic Mode
 * 2. Maya outputs [CREATE_FEED_STRATEGY: {...}] with JSON
 * 3. Component extracts JSON and sends to this endpoint
 * 4. API validates JSON structure and returns validated strategy
 *
 * VALIDATION RULES:
 * - Same as Pro Mode (9 or 12 posts, required fields)
 *
 * NOTE: Classic Mode does not use imageLibrary; that is Pro Mode only.
 *
 * Created: 2026-03-14 — fixes critical route mismatch where maya-chat-screen.tsx
 * called /api/maya/generate-feed for non-pro users but only the pro route existed.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import type { FeedStrategy } from "@/lib/maya/feed-generation-handler"
import {
  isSupportedFeedPlanPostCount,
  SUPPORTED_FEED_PLAN_POST_COUNTS,
} from "@/lib/maya/feed-strategy"

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[generate-feed-classic] ❌ Unauthorized - no user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[generate-feed-classic] ❌ User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, conversationContext } = body

    console.log("[generate-feed-classic] Request received:", {
      userId: neonUser.id,
      chatId,
      hasStrategyJson: !!strategyJson,
      strategyJsonLength: strategyJson?.length || 0,
    })

    if (!strategyJson || typeof strategyJson !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyJson" },
        { status: 400 },
      )
    }

    // Parse JSON
    let parsed: any
    try {
      parsed = JSON.parse(strategyJson)
    } catch (parseError) {
      console.error("[generate-feed-classic] ❌ JSON parse error:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 },
      )
    }

    // Unwrap if nested in feedStrategy object
    let strategy: FeedStrategy
    if (parsed.feedStrategy && typeof parsed.feedStrategy === "object") {
      strategy = parsed.feedStrategy as FeedStrategy
      console.log("[generate-feed-classic] 🔄 Unwrapped feedStrategy from nested structure")
    } else {
      strategy = parsed as FeedStrategy
    }

    // Validate required fields
    if (!strategy.posts || !Array.isArray(strategy.posts)) {
      console.error("[generate-feed-classic] ❌ Missing or invalid posts array")
      return NextResponse.json(
        { error: "Strategy must contain a posts array" },
        { status: 400 },
      )
    }

    // Support 9 posts (Maya Feed Chat) and 12 posts (Blueprint)
    if (!isSupportedFeedPlanPostCount(strategy.posts.length)) {
      console.error(
        `[generate-feed-classic] ❌ Strategy must have 9 or 12 posts, found ${strategy.posts.length}`,
      )
      return NextResponse.json(
        {
          error: `Strategy must contain exactly 9 posts (Maya Feed Chat) or 12 posts (Blueprint), found ${strategy.posts.length}`,
          code: "UNSUPPORTED_FEED_POST_COUNT",
          supportedPostCounts: SUPPORTED_FEED_PLAN_POST_COUNTS,
        },
        { status: 400 },
      )
    }

    // Validate each post has required fields
    const invalidPosts: number[] = []
    strategy.posts.forEach((post, index) => {
      if (!post.position || post.position < 1 || post.position > 12) {
        invalidPosts.push(index + 1)
      }
      if (!post.visualDirection || post.visualDirection.trim() === "") {
        invalidPosts.push(index + 1)
      }
    })

    if (invalidPosts.length > 0) {
      console.error(
        `[generate-feed-classic] ❌ Invalid posts at positions: ${invalidPosts.join(", ")}`,
      )
      return NextResponse.json(
        { error: `Invalid posts at positions: ${invalidPosts.join(", ")}` },
        { status: 400 },
      )
    }

    // Normalize title (handle both feedTitle and title)
    if (!strategy.feedTitle && strategy.title) {
      strategy.feedTitle = strategy.title
    }

    console.log("[generate-feed-classic] ✅ Strategy validated successfully:", {
      title: strategy.feedTitle || strategy.title,
      postsCount: strategy.posts.length,
      hasOverallVibe: !!strategy.overallVibe,
      hasColorPalette: !!strategy.colorPalette,
      proMode: false,
    })

    return NextResponse.json({
      success: true,
      strategy,
      proMode: false,
    })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("[generate-feed-classic] ❌ Error:", {
      message: errorMessage,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        error: "Failed to process feed strategy",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
