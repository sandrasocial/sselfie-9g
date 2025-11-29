import { NextResponse } from "next/server"
import { runEngagementScoring } from "@/agents/admin/adminSupervisorAgent"

export async function POST() {
  try {
    const result = await runEngagementScoring()

    return NextResponse.json({
      success: result.success,
      scored: result.scored,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Error running engagement scoring:", error)
    return NextResponse.json({ error: "Failed to run engagement scoring" }, { status: 500 })
  }
}
