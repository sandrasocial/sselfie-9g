import { NextResponse } from "next/server"
import { refreshAllSegments } from "@/lib/email/segmentation"
import { createCronLogger } from "@/lib/cron-logger"

/**
 * Cron Job: Refresh Email Segments
 * 
 * Automatically refreshes all auto-refresh segments daily
 * Runs at 3 AM UTC
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("refresh-segments")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [Refresh Segments] Unauthorized")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[v0] [Refresh Segments] Starting segment refresh...")

    const results = await refreshAllSegments()

    const totalMembers = results.reduce((sum, r) => sum + (r.memberCount || 0), 0)

    console.log(`[v0] [Refresh Segments] Refreshed ${results.length} segments, ${totalMembers} total members`)

    await cronLogger.success({
      segmentsRefreshed: results.length,
      totalMembers,
    })

    return NextResponse.json({
      success: true,
      segmentsRefreshed: results.length,
      totalMembers,
      results,
    })
  } catch (error: any) {
    console.error("[v0] [Refresh Segments] Error:", error)
    await cronLogger.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
