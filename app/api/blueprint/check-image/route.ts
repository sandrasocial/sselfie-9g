import { NextResponse } from "next/server"

export async function POST() {
  // DISABLED_RETIRED_AI_SURFACE: old public Blueprint image polling is retired.
  return NextResponse.json({ error: "Blueprint image polling is retired" }, { status: 410 })
}
