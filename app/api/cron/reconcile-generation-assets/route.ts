import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { reconcileProPhotoshootGrids } from "@/lib/generation/reconcile-pro-photoshoot-grids"
import { reconcileFeedPosts } from "@/lib/generation/reconcile-feed-posts"
import { reconcileAiImages } from "@/lib/generation/reconcile-ai-images"
import { reconcileAppV3GenerationCredits } from "@/lib/generation/reconcile-app-v3-credits"

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * GET /api/cron/reconcile-generation-assets
 *
 * Consolidated reconciliation runner for generation assets.
 * - Runs pro photoshoot reconciliation every invocation (every 5 minutes in vercel.json)
 * - Runs feed + ai image reconciliation every 15 minutes by default
 * - Supports manual full sweep via ?full=1
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reconcile-generation-assets")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const url = new URL(request.url)
    const forceFull = url.searchParams.get("full") === "1"
    const minute = new Date().getUTCMinutes()
    const shouldRunFeedAndAi = forceFull || minute % 15 === 0

    const proSummary = await reconcileProPhotoshootGrids({
      limit: parsePositiveInt(process.env.RECONCILE_PRO_PHOTOSHOOT_LIMIT, 6),
      minAgeMinutes: parsePositiveInt(process.env.RECONCILE_PRO_PHOTOSHOOT_MIN_AGE_MIN, 1),
    })

    // CREDIT-INTEGRITY-01: every invocation, return credits for app-v3 generation charges
    // whose images never reached the gallery (function killed at maxDuration, crash after
    // deduction, failed refund write). Cheap: one ledger scan bounded by limit + age window.
    const creditSummary = await reconcileAppV3GenerationCredits({
      limit: parsePositiveInt(process.env.RECONCILE_APP_V3_CREDITS_LIMIT, 50),
      minAgeMinutes: parsePositiveInt(process.env.RECONCILE_APP_V3_CREDITS_MIN_AGE_MIN, 15),
    })

    let feedSummary: Awaited<ReturnType<typeof reconcileFeedPosts>> | null = null
    let aiSummary: Awaited<ReturnType<typeof reconcileAiImages>> | null = null

    if (shouldRunFeedAndAi) {
      ;[feedSummary, aiSummary] = await Promise.all([
        reconcileFeedPosts({
          limit: parsePositiveInt(process.env.RECONCILE_FEED_POSTS_LIMIT, 25),
          minAgeMinutes: parsePositiveInt(process.env.RECONCILE_FEED_POSTS_MIN_AGE_MIN, 5),
        }),
        reconcileAiImages({
          limit: parsePositiveInt(process.env.RECONCILE_AI_IMAGES_LIMIT, 25),
          minAgeMinutes: parsePositiveInt(process.env.RECONCILE_AI_IMAGES_MIN_AGE_MIN, 5),
        }),
      ])
    }

    const summary = {
      mode: shouldRunFeedAndAi ? "full" : "pro-only",
      minuteUtc: minute,
      proSummary,
      creditSummary,
      feedSummary,
      aiSummary,
    }

    await cronLogger.success(summary as any)
    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reconcile generation assets" },
      { status: 500 },
    )
  }
}
