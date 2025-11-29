import { NextResponse } from "next/server"

/**
 * GET /api/cron/behavior-loop
 * Nightly behavior loop sweep
 * Evaluates all subscribers and triggers marketing automation
 */
export async function GET(request: Request) {
  try {
    console.log("[Cron] Starting nightly behavior loop sweep")

    const { runNightlyBehaviorLoopSweep } = await import("@/agents/admin/adminSupervisorAgent")
    const result = await runNightlyBehaviorLoopSweep()

    console.log("[Cron] Behavior loop sweep complete:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Cron] Error running behavior loop sweep:", error)
    return NextResponse.json({ error: "Failed to run behavior loop sweep" }, { status: 500 })
  }
}
