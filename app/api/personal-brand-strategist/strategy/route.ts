import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Personal brand strategist is retired" }, { status: 410 })
}
