import { NextResponse } from "next/server"

export async function POST() {
  // DISABLED_RETIRED_AI_SURFACE: historical paid Blueprint buyers now access Feed Planner.
  return NextResponse.json({ error: "Paid Blueprint generation is retired; use Feed Planner" }, { status: 410 })
}
