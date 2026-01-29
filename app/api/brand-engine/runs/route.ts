import { NextResponse } from "next/server"
import type { EngineRun } from "@/lib/brand-engine/types"

/**
 * GET /api/brand-engine/runs
 *
 * Returns recent engine runs.
 */
export async function GET() {
  try {
    // TODO: Replace with database fetch
    const runs: Partial<EngineRun>[] = [
      {
        id: "run-demo-1",
        type: "weekly",
        status: "completed",
        scheduledFor: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        approval: {
          status: "approved",
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
      },
    ]

    return NextResponse.json({
      success: true,
      data: runs,
    })
  } catch (error) {
    console.error("Error fetching runs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch engine runs" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brand-engine/runs
 *
 * Save a new engine run (from Make.com)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // TODO: Save to database
    console.log("New engine run received:", {
      type: body.type,
      hasWeeklyBrief: !!body.weekly_brief,
      hasWeeklyCalendar: !!body.weekly_calendar,
      hasCompetitorReport: !!body.competitor_report,
    })

    return NextResponse.json({
      success: true,
      message: "Engine run saved",
      runId: `run-${Date.now()}`,
    })
  } catch (error) {
    console.error("Error saving run:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save engine run" },
      { status: 500 }
    )
  }
}
