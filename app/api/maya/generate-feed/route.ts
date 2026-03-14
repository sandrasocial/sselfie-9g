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
 * NOTE: Classic Mode does not use imageLibrary; that is Pro Mode only.
 *
 * Created: 2026-03-14 — fixes critical route mismatch where maya-chat-screen.tsx
 * called /api/maya/generate-feed for non-pro users but only the pro route existed.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { parseFeedStrategy } from "@/lib/maya/feed-strategy"

const LOG = "[generate-feed-classic]"

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
    const { strategyJson, chatId } = body

    console.log(`${LOG} Request received:`, {
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

    const result = parseFeedStrategy(strategyJson, LOG)
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    const { strategy } = result
    console.log(`${LOG} ✅ Strategy validated successfully:`, {
      title: strategy.feedTitle || strategy.title,
      postsCount: strategy.posts.length,
      hasOverallVibe: !!strategy.overallVibe,
      hasColorPalette: !!strategy.colorPalette,
      proMode: false,
    })

    return NextResponse.json({ success: true, strategy, proMode: false })
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
