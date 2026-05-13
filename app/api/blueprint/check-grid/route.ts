import { NextResponse } from "next/server"

export async function GET() {
  // DISABLED_RETIRED_AI_SURFACE: old public Blueprint grid polling is retired.
  return NextResponse.json({ error: "Blueprint grid polling is retired" }, { status: 410 })
}
