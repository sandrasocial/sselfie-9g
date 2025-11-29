import { NextResponse } from "next/server"
import { getTopEngagedUsers, getDropoffSignals } from "@/agents/admin/adminSupervisorAgent"

export async function GET() {
  try {
    const [topUsers, dropoff] = await Promise.all([getTopEngagedUsers(), getDropoffSignals()])

    return NextResponse.json({
      topUsers,
      dropoff,
    })
  } catch (error) {
    console.error("[Behavior API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch behavior data" }, { status: 500 })
  }
}
