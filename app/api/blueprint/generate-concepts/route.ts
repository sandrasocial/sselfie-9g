import { NextResponse } from "next/server"

export async function POST() {
  // DISABLED_RETIRED_AI_SURFACE: old public Blueprint concept generation is no longer sold or reachable.
  return NextResponse.json({ error: "Blueprint concept generation is retired" }, { status: 410 })
}
