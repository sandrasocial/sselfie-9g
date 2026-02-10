import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { reconcileFeedPosts } from "@/lib/generation/reconcile-feed-posts"

/**
 * Reconcile Feed Post Generations
 *
 * Sweeps feed_posts with prediction_id where generation_status is pending/generating,
 * and finalizes them (Blob upload + DB update) once Replicate succeeds.
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reconcile-feed-posts")
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

    const summary = await reconcileFeedPosts({
      limit: Number.parseInt(process.env.RECONCILE_FEED_POSTS_LIMIT || "25", 10),
      minAgeMinutes: Number.parseInt(process.env.RECONCILE_FEED_POSTS_MIN_AGE_MIN || "5", 10),
    })

    await cronLogger.success(summary as any)
    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reconcile feed posts" },
      { status: 500 },
    )
  }
}

