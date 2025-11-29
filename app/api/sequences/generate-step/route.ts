import { NextResponse } from "next/server"
import { marketingAutomationAgent } from "@/agents/marketing/marketingAutomationAgent"

export async function POST(request: Request) {
  try {
    const { sequenceName, sequenceDescription, stepNumber, goal, tone, subscriberPersona } = await request.json()

    if (!sequenceName || !stepNumber) {
      return NextResponse.json({ success: false, error: "sequenceName and stepNumber are required" }, { status: 400 })
    }

    const result = await marketingAutomationAgent.generateSequenceStep({
      sequenceName,
      sequenceDescription,
      stepNumber,
      goal,
      tone,
      subscriberPersona,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, step: result.step })
  } catch (error) {
    console.error("[API] Error generating step:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
