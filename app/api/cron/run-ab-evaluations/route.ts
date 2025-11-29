import { NextResponse } from "next/server"
import { runABEvaluation } from "@/agents/admin/adminSupervisorAgent"

export async function GET() {
  try {
    console.log("[Cron] Running A/B evaluation sweep...")

    const result = await runABEvaluation()

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Cron] Error in A/B evaluation sweep:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
