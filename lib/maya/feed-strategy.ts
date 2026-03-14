export const SUPPORTED_FEED_PLAN_POST_COUNTS = [6, 9, 12] as const
export const DEFAULT_INLINE_MAYA_FEED_POST_COUNT = 9

function returnIfValidFeedStrategyJson(candidate: string | null | undefined): string | null {
  if (!candidate) return null

  const trimmedCandidate = candidate.trim()
  if (!trimmedCandidate) return null

  try {
    JSON.parse(trimmedCandidate)
    return trimmedCandidate
  } catch {
    return null
  }
}

function removeInlineFeedStrategyBlocks(text: string): string {
  let cleanedText = text
  let feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)

  while (feedStrategyIndex >= 0) {
    let bracketCount = 0
    let endIndex = -1

    for (let i = feedStrategyIndex; i < cleanedText.length; i += 1) {
      if (cleanedText[i] === "[") bracketCount += 1
      if (cleanedText[i] === "]") {
        bracketCount -= 1
        if (bracketCount === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex >= 0) {
      cleanedText = cleanedText.substring(0, feedStrategyIndex) + cleanedText.substring(endIndex + 1)
    } else {
      cleanedText = cleanedText.substring(0, feedStrategyIndex)
      break
    }

    feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)
  }

  return cleanedText
}

export function isSupportedFeedPlanPostCount(count: number): boolean {
  return SUPPORTED_FEED_PLAN_POST_COUNTS.includes(count as (typeof SUPPORTED_FEED_PLAN_POST_COUNTS)[number])
}

export function hasFeedStrategyArtifacts(text: string): boolean {
  if (!text) return false

  return (
    text.includes("[CREATE_FEED_STRATEGY") ||
    /```json/i.test(text) ||
    /"feedStrategy"/i.test(text) ||
    /"feedTitle"/i.test(text) ||
    /"posts"\s*:/i.test(text) ||
    /"position"\s*:/i.test(text)
  )
}

export function extractFeedStrategyJson(text: string): string | null {
  if (!text || !text.includes("[CREATE_FEED_STRATEGY")) return null

  const inlineMatch = text.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)
  if (inlineMatch?.[1]) return returnIfValidFeedStrategyJson(inlineMatch[1])

  const fencedJsonMatch = text.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?```json\s*([\s\S]*?)\s*```/i)
  if (fencedJsonMatch?.[1]) return returnIfValidFeedStrategyJson(fencedJsonMatch[1])

  const fencedMatch = text.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?```\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) return returnIfValidFeedStrategyJson(fencedMatch[1])

  const markerIndex = text.indexOf("[CREATE_FEED_STRATEGY]")
  if (markerIndex >= 0) {
    const afterMarker = text.slice(markerIndex)
    const jsonStart = afterMarker.indexOf("{")
    const jsonEnd = afterMarker.lastIndexOf("}") + 1
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return returnIfValidFeedStrategyJson(afterMarker.slice(jsonStart, jsonEnd))
    }
  }

  return null
}

export function stripFeedStrategyArtifacts(text: string): string {
  if (!text) return ""

  let cleanedText = removeInlineFeedStrategyBlocks(text)
  const hadFeedArtifacts = hasFeedStrategyArtifacts(cleanedText)

  cleanedText = cleanedText.replace(/\[CREATE_FEED_STRATEGY\]/gi, "").trim()

  if (hadFeedArtifacts) {
    cleanedText = cleanedText.replace(/```json[\s\S]*?```/gi, "").trim()
    cleanedText = cleanedText.replace(/```[\s\S]*?```/g, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"feedStrategy"[\s\S]*?\}/gi, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"feedStrategy"[\s\S]*$/gi, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"position"[\s\S]*$/gi, "").trim()

    // Handle split streaming text parts that can leak feed JSON fragments before the card is ready.
    cleanedText = cleanedText
      .replace(/^\s*\{\s*$/gm, "")
      .replace(/^\s*`{3}json\s*$/gmi, "")
      .replace(/^\s*`{3}\s*$/gm, "")
      .replace(/^\s*"feedTitle"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"title"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"aesthetic"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"overallVibe"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"colorPalette"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"strategicRationale"\s*:\s*.*$/gmi, "")
      .replace(/^\s*"totalCredits"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*\{?\s*"[^"]+"\s*:\s*.*$/gmi, "")
      .replace(/^\s*"posts"\s*:\s*\[.*$/gmi, "")
      .replace(/^\s*\{\s*"position"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*"position"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*"visualDirection"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"caption"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"prompt"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*[\]}],?\s*$/gm, "")
      .trim()
  }

  return cleanedText
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

export function shouldRetryInlineFeedGeneration(status: number): boolean {
  return status === 429 || status >= 500
}

// ─── Shared generate-feed route handler ──────────────────────────────────────
// Both /api/maya/generate-feed (classic) and /api/maya/pro/generate-feed (pro)
// delegate to this function. The only runtime differences are the log prefix and
// whether imageLibrary is accepted. Keeping the logic here avoids duplicating
// ~80 lines of auth + validation + error handling across two near-identical files.

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

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

// ─────────────────────────────────────────────────────────────────────────────

type ParseFeedStrategyOk = { ok: true; strategy: any }
type ParseFeedStrategyErr = { ok: false; status: 400; body: Record<string, unknown> }

/**
 * Parse and validate a feed strategy JSON string from Maya's output.
 * Shared by both the classic and pro generate-feed routes to avoid duplication.
 */
export function parseFeedStrategy(
  strategyJson: string,
  logPrefix: string,
): ParseFeedStrategyOk | ParseFeedStrategyErr {
  let parsed: any
  try {
    parsed = JSON.parse(strategyJson)
  } catch {
    console.error(`${logPrefix} ❌ JSON parse error`)
    return { ok: false, status: 400, body: { error: "Invalid JSON format" } }
  }

  // Unwrap if nested in feedStrategy object
  let strategy: any
  if (parsed.feedStrategy && typeof parsed.feedStrategy === "object") {
    strategy = parsed.feedStrategy
    console.log(`${logPrefix} 🔄 Unwrapped feedStrategy from nested structure`)
  } else {
    strategy = parsed
  }

  if (!strategy.posts || !Array.isArray(strategy.posts)) {
    console.error(`${logPrefix} ❌ Missing or invalid posts array`)
    return { ok: false, status: 400, body: { error: "Strategy must contain a posts array" } }
  }

  if (!isSupportedFeedPlanPostCount(strategy.posts.length)) {
    console.error(`${logPrefix} ❌ Unsupported post count: ${strategy.posts.length}`)
    return {
      ok: false,
      status: 400,
      body: {
        error: `Strategy must contain exactly 9 posts (Maya Feed Chat) or 12 posts (Blueprint), found ${strategy.posts.length}`,
        code: "UNSUPPORTED_FEED_POST_COUNT",
        supportedPostCounts: SUPPORTED_FEED_PLAN_POST_COUNTS,
      },
    }
  }

  const invalidPosts: number[] = []
  strategy.posts.forEach((post: any, index: number) => {
    if (!post.position || post.position < 1 || post.position > 12) invalidPosts.push(index + 1)
    if (!post.visualDirection || post.visualDirection.trim() === "") invalidPosts.push(index + 1)
  })

  if (invalidPosts.length > 0) {
    console.error(`${logPrefix} ❌ Invalid posts at positions: ${invalidPosts.join(", ")}`)
    return {
      ok: false,
      status: 400,
      body: { error: `Invalid posts at positions: ${invalidPosts.join(", ")}` },
    }
  }

  if (!strategy.feedTitle && strategy.title) strategy.feedTitle = strategy.title

  return { ok: true, strategy }
}
