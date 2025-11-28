import { type NextRequest, NextResponse } from "next/server"
import * as feedPerformanceWorkflow from "../../../../../agents/workflows/feedPerformanceWorkflow"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, feedId } = body

    if (!userId || !feedId) {
      return NextResponse.json({ error: "userId and feedId are required" }, { status: 400 })
    }

    const result = await feedPerformanceWorkflow.runWorkflow({ userId, feedId })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Feed performance analysis error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze feed performance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
