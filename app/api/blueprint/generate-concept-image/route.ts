import { NextResponse } from "next/server"

export async function POST() {
  // DISABLED_RETIRED_AI_SURFACE: old public Blueprint concept-image generation is retired.
  return NextResponse.json({ error: "Blueprint concept-image generation is retired" }, { status: 410 })
}
