/**
 * PRO MODE FEED GENERATION API
 * 
 * PURPOSE: Validates and processes feed strategy JSON from Maya's response in Pro Mode.
 * 
 * FLOW:
 * 1. User requests feed creation in Pro Mode
 * 2. Maya outputs [CREATE_FEED_STRATEGY: {...}] with JSON
 * 3. Component extracts JSON and sends to this endpoint with imageLibrary
 * 4. API validates JSON structure and returns validated strategy
 * 
 * KEY FEATURES:
 * - Validates JSON structure (same as Classic Mode)
 * - Unwraps nested feedStrategy objects
 * - Validates required fields (posts, title, etc.)
 * - Can leverage imageLibrary for Pro Mode enhancements
 * - Returns clean, validated strategy object
 * 
 * VALIDATION RULES:
 * - Same as Classic Mode (9 posts, required fields, etc.)
 * - Future: Can add Pro Mode specific validation
 * 
 * PRO MODE ENHANCEMENTS:
 * - imageLibrary: Can be used to enhance strategy
 * - Future: Pro Mode specific validation
 * - Future: Strategy enhancement with image library context
 * 
 * DIFFERENCES FROM CLASSIC MODE:
 * - Pro Mode: Can use imageLibrary for reference
 * - Pro Mode: Can add Pro Mode specific validation
 * - Pro Mode: Can enhance strategy with Pro Mode features
 * 
 * REFACTORING NOTES (Phase 3):
 * - Created as part of Pro Mode support
 * - Matches concept card Pro Mode API pattern
 * - Ready for future Pro Mode enhancements
 * 
 * Last Updated: January 2025 (Refactoring Phase 3)
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import type { FeedStrategy } from "@/lib/maya/feed-generation-handler"

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[generate-feed-pro] ❌ Unauthorized - no user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[generate-feed-pro] ❌ User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, imageLibrary, conversationContext } = body

    console.log("[generate-feed-pro] Request received:", {
      userId: neonUser.id,
      chatId,
      hasStrategyJson: !!strategyJson,
      strategyJsonLength: strategyJson?.length || 0,
      hasImageLibrary: !!imageLibrary,
      imageLibrarySize: imageLibrary ? {
        selfies: imageLibrary.selfies?.length || 0,
        products: imageLibrary.products?.length || 0,
        baseImages: imageLibrary.baseImages?.length || 0,
      } : null,
    })

    if (!strategyJson || typeof strategyJson !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid strategyJson" },
        { status: 400 }
      )
    }

    // Parse JSON
    let parsed: any
    try {
      parsed = JSON.parse(strategyJson)
    } catch (parseError) {
      console.error("[generate-feed-pro] ❌ JSON parse error:", parseError)
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      )
    }

    // Unwrap if nested in feedStrategy object
    let strategy: FeedStrategy
    if (parsed.feedStrategy && typeof parsed.feedStrategy === 'object') {
      // Nested structure: unwrap it
      strategy = parsed.feedStrategy as FeedStrategy
      console.log("[generate-feed-pro] 🔄 Unwrapped feedStrategy from nested structure")
    } else {
      // Direct structure: use as-is
      strategy = parsed as FeedStrategy
    }

    // Validate required fields
    if (!strategy.posts || !Array.isArray(strategy.posts)) {
      console.error("[generate-feed-pro] ❌ Missing or invalid posts array")
      return NextResponse.json(
        { error: "Strategy must contain a posts array" },
        { status: 400 }
      )
    }

    if (strategy.posts.length !== 9) {
      console.error(`[generate-feed-pro] ❌ Strategy must have exactly 9 posts, found ${strategy.posts.length}`)
      return NextResponse.json(
        { error: `Strategy must contain exactly 9 posts, found ${strategy.posts.length}` },
        { status: 400 }
      )
    }

    // Validate each post has required fields
    const invalidPosts: number[] = []
    strategy.posts.forEach((post, index) => {
      if (!post.position || post.position < 1 || post.position > 9) {
        invalidPosts.push(index + 1)
      }
      if (!post.visualDirection || post.visualDirection.trim() === '') {
        invalidPosts.push(index + 1)
      }
    })

    if (invalidPosts.length > 0) {
      console.error(`[generate-feed-pro] ❌ Invalid posts at positions: ${invalidPosts.join(', ')}`)
      return NextResponse.json(
        { error: `Invalid posts at positions: ${invalidPosts.join(', ')}` },
        { status: 400 }
      )
    }

    // Normalize title (handle both feedTitle and title)
    if (!strategy.feedTitle && strategy.title) {
      strategy.feedTitle = strategy.title
    }

    // Pro Mode enhancements can be added here:
    // - Use imageLibrary to enhance strategy
    // - Add Pro Mode specific validation
    // - Enhance strategy with Pro Mode features
    if (imageLibrary) {
      console.log("[generate-feed-pro] 📸 ImageLibrary available for Pro Mode enhancements")
      // Future: Can use imageLibrary to enhance strategy
    }

    // Log successful validation
    console.log("[generate-feed-pro] ✅ Strategy validated successfully:", {
      title: strategy.feedTitle || strategy.title,
      postsCount: strategy.posts.length,
      hasOverallVibe: !!strategy.overallVibe,
      hasColorPalette: !!strategy.colorPalette,
      proMode: true,
    })

    // Return validated strategy
    return NextResponse.json({
      success: true,
      strategy,
      proMode: true,
    })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("[generate-feed-pro] ❌ Error:", {
      message: errorMessage,
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        error: "Failed to process feed strategy",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

