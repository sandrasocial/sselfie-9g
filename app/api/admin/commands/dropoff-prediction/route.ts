import { NextResponse } from "next/server"
import { AdminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"

const adminAgent = new AdminSupervisorAgent()

export async function POST() {
  try {
    const signals = await adminAgent.getDropoffSignals()

    return NextResponse.json({
      success: true,
      signals,
    })
  } catch (error) {
    console.error("Error running dropoff prediction:", error)
    return NextResponse.json({ error: "Failed to run dropoff prediction" }, { status: 500 })
  }
}
