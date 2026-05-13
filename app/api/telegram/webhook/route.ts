import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Telegram webhook is retired" }, { status: 410 })
}
