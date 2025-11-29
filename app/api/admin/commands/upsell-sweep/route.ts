import { NextResponse } from "next/server"
import { AdminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"

const adminAgent = new AdminSupervisorAgent()

export async function POST() {
  try {
    await adminAgent.runUpsellSweep()

    return NextResponse.json({
      success: true,
      message: "Upsell discovery sweep initiated",
    })
  } catch (error) {
    console.error("Error running upsell sweep:", error)
    return NextResponse.json({ error: "Failed to run upsell sweep" }, { status: 500 })
  }
}
