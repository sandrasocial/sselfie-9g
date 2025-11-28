import { type NextRequest, NextResponse } from "next/server"
import * as winbackWorkflow from "@/agents/workflows/winbackWorkflow"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, daysSinceActivity, batchSize } = body

    const result = await winbackWorkflow.runWorkflow({
      userId,
      daysSinceActivity,
      batchSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Winback workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
