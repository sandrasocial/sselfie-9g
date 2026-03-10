import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { reconcileProPhotoshootGrids } from "@/lib/generation/reconcile-pro-photoshoot-grids"

/**
 * Reconcile Pro Photoshoot Grids
 *
 * Finalizes pro_photoshoot_grids that are "generating" with prediction_id but missing grid_url.
 * This prevents sessions from depending on a user poll to complete.
 *
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reconcile-pro-photoshoot-grids")
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

    const summary = await reconcileProPhotoshootGrids({
      limit: Number.parseInt(process.env.RECONCILE_PRO_PHOTOSHOOT_LIMIT || "6", 10),
      minAgeMinutes: Number.parseInt(process.env.RECONCILE_PRO_PHOTOSHOOT_MIN_AGE_MIN || "1", 10),
    })

    await cronLogger.success(summary as any)
    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    await cronLogger.error(error, {})
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reconcile pro photoshoot grids" },
      { status: 500 },
    )
  }
}
