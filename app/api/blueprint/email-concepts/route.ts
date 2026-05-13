import { NextResponse } from "next/server"

export async function POST() {
  // DISABLED_RETIRED_AI_SURFACE: old Blueprint concept delivery email is retired.
  return NextResponse.json({ error: "Blueprint concept email is retired" }, { status: 410 })
}
