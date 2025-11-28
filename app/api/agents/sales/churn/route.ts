import { type NextRequest, NextResponse } from "next/server"
import * as churnPreventionWorkflow from "@/agents/workflows/churnPreventionWorkflow"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, eventType, metadata } = body

    if (!userId || !eventType) {
      return NextResponse.json({ error: "Missing required fields: userId, eventType" }, { status: 400 })
    }

    if (!["payment_failed", "renewal_upcoming", "cancellation", "downgrade"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 })
    }

    const result = await churnPreventionWorkflow.runWorkflow({
      userId,
      eventType,
      metadata,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Churn prevention workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
