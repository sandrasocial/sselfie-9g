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
 * DIFFERENCES FROM CLASSIC MODE:
 * - Accepts imageLibrary for future Pro Mode enhancements
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { parseFeedStrategy } from "@/lib/maya/feed-strategy"

const LOG = "[generate-feed-pro]"

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log(`${LOG} ❌ Unauthorized - no user`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log(`${LOG} ❌ User not found in Neon`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, imageLibrary } = body

    console.log(`${LOG} Request received:`, {
      userId: neonUser.id,
      chatId,
      hasStrategyJson: !!strategyJson,
      strategyJsonLength: strategyJson?.length || 0,
      hasImageLibrary: !!imageLibrary,
      imageLibrarySize: imageLibrary
        ? {
            selfies: imageLibrary.selfies?.length || 0,
            products: imageLibrary.products?.length || 0,
            baseImages: imageLibrary.baseImages?.length || 0,
          }
        : null,
    })

    if (!strategyJson || typeof strategyJson !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyJson" },
        { status: 400 },
      )
    }

    const result = parseFeedStrategy(strategyJson, LOG)
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    const { strategy } = result

    if (imageLibrary) {
      console.log(`${LOG} 📸 ImageLibrary available for Pro Mode enhancements`)
    }

    console.log(`${LOG} ✅ Strategy validated successfully:`, {
      title: strategy.feedTitle || strategy.title,
      postsCount: strategy.posts.length,
      hasOverallVibe: !!strategy.overallVibe,
      hasColorPalette: !!strategy.colorPalette,
      proMode: true,
    })

    return NextResponse.json({ success: true, strategy, proMode: true })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error(`${LOG} ❌ Error:`, { message: errorMessage, stack: error?.stack })
    return NextResponse.json(
      {
        error: "Failed to process feed strategy",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
