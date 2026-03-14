// ─── Shared generate-feed route handler ──────────────────────────────────────
// Both /api/maya/generate-feed (classic) and /api/maya/pro/generate-feed (pro)
// delegate to this function. The only runtime differences are the log prefix and
// whether imageLibrary is accepted. Keeping the logic here avoids duplicating
// ~80 lines of auth + validation + error handling across two near-identical files.
//
// NOTE: This file imports server-only modules (next/server, auth-helper, user-mapping).
// Keep it separate from lib/maya/feed-strategy.ts which is a pure utility module.

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { parseFeedStrategy } from "@/lib/maya/feed-strategy"

export async function handleFeedStrategyRoute(
  req: NextRequest,
  proMode: boolean,
): Promise<NextResponse> {
  const logPrefix = proMode ? "[generate-feed-pro]" : "[generate-feed-classic]"

  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      console.log(`${logPrefix} ❌ Unauthorized - no user`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log(`${logPrefix} ❌ User not found in Neon`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, imageLibrary } = body

    console.log(`${logPrefix} Request received:`, {
      userId: neonUser.id,
      chatId,
      hasStrategyJson: !!strategyJson,
      strategyJsonLength: strategyJson?.length || 0,
      ...(proMode && {
        hasImageLibrary: !!imageLibrary,
        imageLibrarySize: imageLibrary
          ? {
              selfies: imageLibrary.selfies?.length || 0,
              products: imageLibrary.products?.length || 0,
              baseImages: imageLibrary.baseImages?.length || 0,
            }
          : null,
      }),
    })

    if (!strategyJson || typeof strategyJson !== "string") {
      return NextResponse.json({ error: "Missing or invalid strategyJson" }, { status: 400 })
    }

    const result = parseFeedStrategy(strategyJson, logPrefix)
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    const { strategy } = result

    if (proMode && imageLibrary) {
      console.log(`${logPrefix} 📸 ImageLibrary available for Pro Mode enhancements`)
    }

    console.log(`${logPrefix} ✅ Strategy validated successfully:`, {
      title: strategy.feedTitle || strategy.title,
      postsCount: strategy.posts.length,
      hasOverallVibe: !!strategy.overallVibe,
      hasColorPalette: !!strategy.colorPalette,
      proMode,
    })

    return NextResponse.json({ success: true, strategy, proMode })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error(`${logPrefix} ❌ Error:`, { message: errorMessage, stack: error?.stack })
    return NextResponse.json(
      {
        error: "Failed to process feed strategy",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
