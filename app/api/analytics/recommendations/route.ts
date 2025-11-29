import { NextResponse } from "next/server"
import { generateSystemRecommendations } from "@/agents/admin/adminSupervisorAgent"

export async function GET() {
  try {
    const result = await generateSystemRecommendations()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ recommendations: result.recommendations || [] })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}
