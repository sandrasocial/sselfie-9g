import { type NextRequest, NextResponse } from "next/server"
import * as leadMagnetWorkflow from "@/agents/workflows/leadMagnetWorkflow"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, userEmail, userName, magnetType, source } = body

    if (!userId || !userEmail || !magnetType) {
      return NextResponse.json({ error: "Missing required fields: userId, userEmail, magnetType" }, { status: 400 })
    }

    const result = await leadMagnetWorkflow.runWorkflow({
      userId,
      userEmail,
      userName,
      magnetType,
      source,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Lead magnet workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
