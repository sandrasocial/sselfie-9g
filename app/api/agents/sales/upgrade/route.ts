import { type NextRequest, NextResponse } from "next/server"
import * as upgradeWorkflow from "@/agents/workflows/upgradeWorkflow"
import { requireAdmin } from "@/lib/security/require-admin"

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req)
    if (guard instanceof NextResponse) return guard

    const body = await req.json()
    const { userId, batchSize } = body

    const result = await upgradeWorkflow.runWorkflow({
      userId,
      batchSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Upgrade workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
