import { type NextRequest, NextResponse } from "next/server"
import { runNightlyAPA } from "@/agents/admin/adminSupervisorAgent"

/**
 * Part 10 - Nightly Cron Job
 * Executes nightly APA sweep
 * Triggers every 24 hours
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Cron] Starting nightly APA sweep")

    const result = await runNightlyAPA()

    console.log("[Cron] Nightly APA sweep complete:", result)

    return NextResponse.json({
      success: true,
      stats: result,
    })
  } catch (error) {
    console.error("[Cron] Error in nightly APA sweep:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
