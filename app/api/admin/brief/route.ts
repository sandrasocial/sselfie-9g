import { NextResponse } from "next/server"
import { AdminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"

const adminAgent = new AdminSupervisorAgent()

export async function POST() {
  try {
    const brief = await adminAgent.generateExecutiveBrief()

    return NextResponse.json({
      success: true,
      brief,
    })
  } catch (error) {
    console.error("Error generating brief:", error)
    return NextResponse.json({ error: "Failed to generate executive brief" }, { status: 500 })
  }
}
