import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Instagram strategist endpoint is retired" }, { status: 410 })
}
