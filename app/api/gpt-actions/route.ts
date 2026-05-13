import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "GPT actions are retired" }, { status: 410 })
}
