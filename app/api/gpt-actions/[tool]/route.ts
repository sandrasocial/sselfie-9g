import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "GPT actions are retired" }, { status: 410 })
}
