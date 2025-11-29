import { NextResponse } from "next/server"
import { AdminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"

const adminAgent = new AdminSupervisorAgent()

export async function POST() {
  try {
    await adminAgent.calculateEngagementScores()

    return NextResponse.json({
      success: true,
      message: "Engagement re-scoring initiated",
    })
  } catch (error) {
    console.error("Error running engagement scoring:", error)
    return NextResponse.json({ error: "Failed to run engagement scoring" }, { status: 500 })
  }
}
