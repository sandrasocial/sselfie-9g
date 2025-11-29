import { NextResponse } from "next/server"
import { AdminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"

const adminAgent = new AdminSupervisorAgent()

export async function POST() {
  try {
    await adminAgent.runBlueprintClassificationSweep()

    return NextResponse.json({
      success: true,
      message: "Blueprint classification sweep initiated",
    })
  } catch (error) {
    console.error("Error running classification sweep:", error)
    return NextResponse.json({ error: "Failed to run classification sweep" }, { status: 500 })
  }
}
