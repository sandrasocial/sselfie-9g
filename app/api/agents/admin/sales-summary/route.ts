import { type NextRequest, NextResponse } from "next/server"
import * as salesDashboardWorkflow from "@/agents/workflows/salesDashboardWorkflow"
import { requireAdmin } from "@/lib/security/require-admin"

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req)
    if (guard instanceof NextResponse) return guard

    const body = await req.json()
    const { adminEmail, sendEmail } = body

    const result = await salesDashboardWorkflow.runWorkflow({
      adminEmail,
      sendEmail,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Sales dashboard workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard instanceof NextResponse) return guard

    const { salesDashboardAgent } = await import("@/agents/admin/salesDashboardAgent")
    const insights = await salesDashboardAgent.getLatestInsights()

    return NextResponse.json({ insights })
  } catch (error) {
    console.error("[API] Get sales insights error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
