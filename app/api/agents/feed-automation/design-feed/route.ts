import { type NextRequest, NextResponse } from "next/server"
import * as feedDesignerWorkflow from "../../../../../agents/workflows/feedDesignerWorkflow"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, feedId } = body

    if (!userId || !feedId) {
      return NextResponse.json({ error: "userId and feedId are required" }, { status: 400 })
    }

    const result = await feedDesignerWorkflow.runWorkflow({ userId, feedId })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Feed designer error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze feed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
