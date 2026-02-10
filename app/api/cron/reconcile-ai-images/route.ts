import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { reconcileAiImages } from "@/lib/generation/reconcile-ai-images"

/**
 * Reconcile Pro Mode / AI Images
 *
 * Sweeps ai_images rows that have prediction_id, are still generating, and have empty image_url.
 * Finalizes them once Replicate succeeds by uploading to Blob and marking completed.
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reconcile-ai-images")
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

    const summary = await reconcileAiImages({
      limit: Number.parseInt(process.env.RECONCILE_AI_IMAGES_LIMIT || "25", 10),
      minAgeMinutes: Number.parseInt(process.env.RECONCILE_AI_IMAGES_MIN_AGE_MIN || "5", 10),
    })

    await cronLogger.success(summary as any)
    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reconcile ai_images" },
      { status: 500 },
    )
  }
}

