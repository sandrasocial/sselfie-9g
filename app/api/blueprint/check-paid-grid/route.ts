import { NextResponse } from "next/server"

export async function GET() {
  // DISABLED_RETIRED_AI_SURFACE: historical paid Blueprint generation polling is retired.
  return NextResponse.json({ error: "Paid Blueprint polling is retired; use Feed Planner" }, { status: 410 })
}
